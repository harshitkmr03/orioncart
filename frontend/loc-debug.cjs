const { chromium } = require('@playwright/test');
(async () => {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  page.on('pageerror', err => console.log('PAGEERROR', err.message));
  page.on('console', msg => console.log('CONSOLE', msg.type(), msg.text()));
  await page.goto('http://localhost:5173', { waitUntil: 'networkidle', timeout: 60000 });
  await page.locator('nav button:has(.lucide-map-pin)').first().click({ timeout: 15000 });
  await page.waitForTimeout(3000);
  const html = await page.content();
  console.log('HTMLLength', html.length);
  await page.screenshot({ path: 'e:/Project/location-click.png', fullPage: true });
  console.log('ScreenshotSaved');
  await browser.close();
})();
