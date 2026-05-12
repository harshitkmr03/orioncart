const { chromium } = require('@playwright/test');

(async () => {
  const baseUrl = 'http://localhost:5173';
  const results = [];
  const record = (name, ok, detail = '') => {
    results.push({ name, ok, detail });
    console.log(`${ok ? 'PASS' : 'FAIL'}: ${name}${detail ? ` -> ${detail}` : ''}`);
  };

  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });

  try {
    await page.goto(baseUrl, { waitUntil: 'domcontentloaded', timeout: 60000 });
    await page.waitForSelector('text=orioncart', { timeout: 15000 });
    record('Home page loads', true);

    await page.locator('button:has(.lucide-shopping-cart)').first().click({ timeout: 10000 });
    await page.waitForSelector('text=Your Cart', { timeout: 10000 });
    record('Cart icon opens drawer', true);

    await page.locator('.fixed.inset-0 button:has(.lucide-x)').first().click({ timeout: 10000 });
    await page.waitForTimeout(500);
    record('Drawer close icon works', true);

    await page.locator('button:has(.lucide-user)').first().click({ timeout: 10000 });
    await page.waitForSelector('text=Welcome Back', { timeout: 10000 });
    record('User icon opens auth modal', true);

    await page.click('text=Sign up', { timeout: 10000 });
    await page.waitForSelector('text=Create Account', { timeout: 10000 });
    record('Auth mode toggle works', true);

    await page.locator('.fixed.inset-0 button:has(.lucide-x)').first().click({ timeout: 10000 });

    await page.locator('nav button:has(.lucide-map-pin)').first().click({ timeout: 10000 });
    await page.waitForSelector('text=Select Location', { timeout: 15000 });
    record('Location icon opens modal', true);
    await page.locator('button:has-text("Cancel")').click({ timeout: 10000 });

    const searchInput = page.locator('input[placeholder="Search for shops, items..."]');
    await searchInput.fill('milk');
    await searchInput.press('Enter');
    await page.waitForURL('**/products**', { timeout: 15000 });
    record('Search action navigates to products', true, page.url());

    await page.waitForTimeout(5000);
    const addBtns = page.locator('button[aria-label^="Add "]');
    const addCount = await addBtns.count();
    if (addCount > 0) {
      await addBtns.first().click({ timeout: 10000 });
      await page.waitForTimeout(1000);
      record('Product plus icon adds item to cart', true, `buttons=${addCount}`);
    } else {
      record('Product plus icon adds item to cart', false, 'No product add buttons found');
    }

    await page.goto(baseUrl, { waitUntil: 'domcontentloaded', timeout: 60000 });
    await page.locator('button:has(.lucide-shopping-cart)').first().click({ timeout: 10000 });
    await page.waitForSelector('text=Your Cart', { timeout: 10000 });
    const proceedBtn = page.locator('button:has-text("Proceed to Checkout")');
    const enabled = await proceedBtn.isEnabled();
    if (enabled) {
      await proceedBtn.click({ timeout: 10000 });
      await page.waitForURL('**/checkout', { timeout: 15000 });
      record('Cart proceed action works', true, page.url());

      await page.locator('button:has-text("Continue to Payment")').click({ timeout: 10000 });
      try {
        await page.waitForURL('**/payment', { timeout: 8000 });
        record('Checkout continue action works', true, page.url());
      } catch {
        const authModal = page.locator('text=Welcome Back').first();
        if (await authModal.isVisible({ timeout: 7000 }).catch(() => false)) {
          record('Checkout continue action works', true, 'Auth modal opened (login required)');
        } else {
          record('Checkout continue action works', false, 'Neither payment page nor auth modal appeared');
        }
      }
    } else {
      record('Cart proceed action works', false, 'Proceed button disabled');
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

