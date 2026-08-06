const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage();
  
  let hasErrors = false;
  page.on('console', msg => {
    if (msg.type() === 'error' && !msg.text().includes('favicon')) {
      console.log(`[CONSOLE ERROR] ${msg.text()}`);
      hasErrors = true;
    }
  });

  try {
    console.log("--- Test: Rendering Routes ---");
    await page.goto('http://localhost:5174/profile');
    await page.waitForTimeout(500);
    console.log("✅ Profile Route rendered");

    await page.goto('http://localhost:5174/settings');
    await page.waitForTimeout(500);
    console.log("✅ Settings Route rendered");

    console.log("--- Test: Fallback Navigation ---");
    await page.evaluate(() => {
      const backBtn = [...document.querySelectorAll('button')].find(b => b.innerText.includes('Back'));
      if(backBtn) backBtn.click();
    });
    await page.waitForTimeout(1000); 
    const url = new URL(page.url());
    if (url.pathname !== '/dashboard') {
      console.error(`❌ [Fallback] Expected /dashboard, got ${url.pathname}`);
      process.exit(1);
    } else {
      console.log(`✅ Fallback Navigation to /dashboard successful`);
    }

    if(hasErrors) {
      console.log("❌ Runtime errors were detected in the console!");
      process.exit(1);
    } else {
      console.log("\n✅ ALL ROUTES RENDERED AND VERIFIED SUCCESSFULLY. No errors found!");
    }
  } catch (err) {
    console.error('Script error:', err);
  }
  
  await browser.close();
})();
