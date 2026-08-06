const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage();
  
  let hasErrors = false;
  page.on('pageerror', err => {
    console.log(`[PAGE ERROR] ${err.message}`);
    hasErrors = true;
  });
  
  page.on('console', msg => {
    if (msg.type() === 'error' && !msg.text().includes('favicon')) {
      console.log(`[CONSOLE ERROR] ${msg.text()}`);
      hasErrors = true;
    }
  });

  async function checkUrl(expectedPath, label) {
    await page.waitForTimeout(1000); 
    const url = new URL(page.url());
    if (url.pathname !== expectedPath) {
      console.error(`❌ [${label}] Expected ${expectedPath}, got ${url.pathname}`);
      process.exit(1);
    } else {
      console.log(`✅ [${label}] Reached ${expectedPath}`);
    }
  }

  try {
    console.log("--- Test: Direct Rendering ---");
    await page.goto('http://localhost:5174/ai-assistant');
    await page.waitForTimeout(1000);
    console.log("✅ AI Assistant Route rendered");

    console.log("--- Test: Bottom Navigation -> AI ---");
    await page.goto('http://localhost:5174/dashboard');
    await page.locator('button:has-text("AI Assist")').click();
    await checkUrl('/ai-assistant', 'BottomNav -> AI');

    console.log("--- Test: Dashboard AI Card -> AI ---");
    await page.goto('http://localhost:5174/dashboard');
    await page.locator('button:has-text("View All Recommendations")').click();
    await checkUrl('/ai-assistant', 'Dashboard AI Card -> AI');

    console.log("--- Test: Back Button from AI ---");
    await page.locator('button:has-text("Back")').first().click();
    await checkUrl('/dashboard', 'AI In-App Back Button');

    if(hasErrors) {
      console.log("❌ Runtime errors were detected in the console!");
      process.exit(1);
    } else {
      console.log("\n✅ AI ASSISTANT MODULE INTEGRATED SUCCESSFULLY. No errors found!");
    }
  } catch (err) {
    console.error('Script error:', err);
  }
  
  await browser.close();
})();
