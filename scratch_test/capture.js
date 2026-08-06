const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage();
  
  page.on('console', msg => console.log(`[CONSOLE] ${msg.type()}: ${msg.text()}`));
  page.on('pageerror', error => console.log(`[PAGE ERROR] ${error.message}\n${error.stack}`));
  
  try {
    await page.goto('http://localhost:5174/dashboard');
    await page.waitForTimeout(3000);
    const html = await page.$eval('#root', el => el.innerHTML);
    if (!html || html.trim() === '') {
      console.log('--- ROOT HTML IS EMPTY ---');
    } else {
      console.log('--- PAGE LOADED SUCCESSFULLY ---');
    }
  } catch (err) {
    console.error('Script error:', err);
  }
  
  await browser.close();
})();
