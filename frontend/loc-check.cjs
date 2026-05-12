const { chromium } = require('@playwright/test');
(async () => {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  await page.goto('http://localhost:5173', { waitUntil: 'networkidle', timeout: 60000 });
  const btn = page.locator('nav button:has(.lucide-map-pin)').first();
  console.log('MapPinButtonCount', await page.locator('nav button:has(.lucide-map-pin)').count());
  await btn.click({ timeout: 15000 });
  try {
    await page.waitForSelector('text=Select Location', { timeout: 30000 });
    console.log('LocationModalVisible=true');
  } catch (e) {
    console.log('LocationModalVisible=false');
    console.log('URL', page.url());
    console.log('BodySnippet', (await page.textContent('body')).slice(0, 500));
  }
  await browser.close();
})();
