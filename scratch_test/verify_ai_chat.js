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

  try {
    console.log("Navigating to AI Assistant...");
    await page.goto('http://localhost:5174/ai-assistant');
    await page.waitForTimeout(1000);

    console.log("--- Test: Sending a Custom Message ---");
    await page.fill('input[type="text"]', 'Check SLA risk');
    await page.click('button:has(svg.lucide-send)');
    
    await page.waitForSelector('text="Check SLA risk"');
    console.log("✅ User message appeared");

    await page.waitForTimeout(2000);
    const aiResponseFound = await page.locator('text="30 mins"').count() > 0;
    if (aiResponseFound) {
      console.log("✅ AI Response (with Context Card) appeared successfully");
    } else {
      console.error("❌ AI Response failed to appear");
      hasErrors = true;
    }

    console.log("--- Test: Sending a Suggested Prompt ---");
    const suggestionsHidden = await page.locator('text="Show unhealthy machines"').count() === 0;
    if (suggestionsHidden) {
      console.log("✅ Suggested Prompts properly hidden after first message");
    } else {
      console.error("❌ Suggested Prompts still visible");
      hasErrors = true;
    }

    // Refresh to test suggested prompts
    await page.goto('http://localhost:5174/ai-assistant');
    await page.waitForTimeout(1000);

    // Click a suggested prompt (Note the quotes in the DOM text)
    await page.locator('text="\\"Generate executive summary\\""').click();
    await page.waitForSelector('text="Generate executive summary"');
    console.log("✅ Suggested Prompt sent successfully as user message");

    await page.waitForTimeout(2000);
    const summaryFound = await page.locator('text="+12%"').count() > 0;
    if (summaryFound) {
      console.log("✅ AI Executive Summary Response appeared successfully");
    } else {
      console.error("❌ AI Executive Summary failed to appear");
      hasErrors = true;
    }

    if(hasErrors) {
      console.log("❌ Runtime errors or test failures were detected!");
      process.exit(1);
    } else {
      console.log("\n✅ AI ASSISTANT CHAT VERIFIED SUCCESSFULLY. No errors found!");
    }
  } catch (err) {
    console.error('Script error:', err);
    process.exit(1);
  }
  
  await browser.close();
})();
