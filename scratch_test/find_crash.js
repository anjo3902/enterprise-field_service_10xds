const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage();
  
  page.on('pageerror', err => {
    console.log(`[PAGE ERROR] ${err.message}`);
    console.log(err.stack);
  });
  
  page.on('console', msg => {
    if (msg.type() === 'error' && !msg.text().includes('favicon')) {
      console.log(`[CONSOLE ERROR] ${msg.text()}`);
    }
  });

  try {
    console.log("Navigating to /settings...");
    await page.goto('http://localhost:5174/settings');
    await page.waitForTimeout(2000);
    console.log("Finished waiting. If there were errors, they were printed above.");
  } catch (err) {
    console.error('Script error:', err);
  }
  
  await browser.close();
})();
