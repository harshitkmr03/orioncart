const { chromium } = require('@playwright/test');
(async () => {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  await page.goto('http://localhost:5173/products?q=milk', { waitUntil: 'domcontentloaded', timeout: 60000 });
  await page.waitForTimeout(5000);
  console.log('URL', page.url());
  const addBtns = page.locator('button[aria-label^="Add "]');
  console.log('AddButtons', await addBtns.count());
  console.log('BodyHasNoProducts', await page.locator('text=No products found').count());
  console.log('BodyHasError', await page.locator('text=Failed to load products').count());
  const h2 = await page.locator('h2').allTextContents();
  console.log('H2', h2);
  await page.screenshot({ path: 'e:/Project/products-page.png', fullPage: true });
  await browser.close();
})();
