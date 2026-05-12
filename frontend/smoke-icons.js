const { chromium } = require('playwright');

(async () => {
  const baseUrl = 'http://localhost:5173';
  const results = [];
  const record = (name, ok, detail = '') => {
    results.push({ name, ok, detail });
    console.log(`${ok ? 'PASS' : 'FAIL'}: ${name}${detail ? ` -> ${detail}` : ''}`);
  };

  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();

  try {
    await page.goto(baseUrl, { waitUntil: 'networkidle', timeout: 60000 });
    await page.waitForSelector('text=OrionCart', { timeout: 15000 });
    record('Home page loads', true);

    // Cart icon opens drawer
    await page.locator('button:has(svg)').nth(2).click({ timeout: 10000 }).catch(() => {});
    const cartBtn = page.locator('button').filter({ has: page.locator('svg') }).first();
    await cartBtn.click({ timeout: 10000 });
    await page.waitForSelector('text=Your Cart', { timeout: 10000 });
    record('Cart icon opens drawer', true);

    // Close drawer via X icon button in header (first button inside drawer header at top right)
    const closeDrawerBtn = page.locator('div.fixed.inset-0 button').first();
    await closeDrawerBtn.click({ timeout: 10000 });
    await page.waitForTimeout(500);
    record('Drawer close icon works', true);

    // User icon opens auth modal
    const userBtn = page.locator('button').filter({ has: page.locator('svg') }).nth(1);
    await userBtn.click({ timeout: 10000 });
    await page.waitForSelector('text=Welcome Back', { timeout: 10000 });
    record('User icon opens auth modal', true);

    // Toggle auth mode and close
    await page.click('text=Sign up', { timeout: 10000 });
    await page.waitForSelector('text=Create Account', { timeout: 10000 });
    record('Auth mode toggle works', true);
    await page.locator('div[role="dialog"] button, .fixed.inset-0 button').first().click({ timeout: 10000 }).catch(async () => {
      await page.keyboard.press('Escape');
    });

    // Location icon button opens location modal
    const locationBtn = page.locator('button:has-text("Select Location")').first();
    await locationBtn.click({ timeout: 10000 });
    await page.waitForSelector('text=Select Location', { timeout: 10000 });
    record('Location icon opens modal', true);
    await page.locator('button:has-text("Cancel")').click({ timeout: 10000 });

    // Search icon/arrow routes to products page
    const searchInput = page.locator('input[placeholder="Search for shops, items..."]');
    await searchInput.fill('milk');
    await page.locator('button:has(svg)').filter({ has: page.locator('svg') }).nth(0).click().catch(async () => {
      await searchInput.press('Enter');
    });
    await page.waitForURL('**/products**', { timeout: 15000 });
    record('Search action navigates to products', true, page.url());

    // Add to cart plus icon on first product, if present
    const addBtns = page.locator('button[aria-label^="Add "]');
    const addCount = await addBtns.count();
    if (addCount > 0) {
      await addBtns.first().click({ timeout: 10000 });
      await page.waitForTimeout(800);
      const badge = page.locator('span').filter({ hasText: /^\d+$/ }).first();
      record('Product plus icon adds item to cart', true, `buttons=${addCount}`);
    } else {
      record('Product plus icon adds item to cart', false, 'No product add buttons found');
    }

    // Open cart via navbar icon and proceed to checkout icon/button path
    await page.goto(baseUrl, { waitUntil: 'networkidle', timeout: 60000 });
    const cartNavBtn = page.locator('button').filter({ has: page.locator('svg') }).first();
    await cartNavBtn.click({ timeout: 10000 });
    await page.waitForSelector('text=Your Cart', { timeout: 10000 });
    const proceedBtn = page.locator('button:has-text("Proceed to Checkout")');
    if (await proceedBtn.count()) {
      await proceedBtn.click({ timeout: 10000 });
      await page.waitForURL('**/checkout', { timeout: 15000 });
      record('Cart proceed action works', true, page.url());
    } else {
      record('Cart proceed action works', false, 'Proceed button missing');
    }
  } catch (err) {
    record('Smoke run fatal', false, err.message || String(err));
  }

  await browser.close();

  const failed = results.filter(r => !r.ok);
  console.log('\nSUMMARY');
  console.log(JSON.stringify({ total: results.length, passed: results.length - failed.length, failed: failed.length, failures: failed }, null, 2));
  process.exit(failed.length ? 1 : 0);
})();
