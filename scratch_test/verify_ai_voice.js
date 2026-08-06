const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch({
    args: ['--use-fake-ui-for-media-stream', '--use-fake-device-for-media-stream']
  });
  const context = await browser.newContext({
    permissions: ['microphone']
  });
  const page = await context.newPage();
  
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

    console.log("--- Test: Clicking Mic Button ---");
    // Find the mic button (has a Mic lucide icon)
    await page.click('button:has(svg.lucide-mic)');
    await page.waitForTimeout(1000);
    
    // Check if either "Listening..." state appears, OR the fallback AI message appears.
    const listeningFound = await page.locator('text="Listening..."').count() > 0;
    const fallbackFound = await page.locator('text="Voice input is not supported"').count() > 0;

    if (listeningFound) {
      console.log("✅ Recording state activated successfully.");
      
      // Stop recording
      await page.click('button:has(svg.lucide-mic)');
      console.log("✅ Stopped recording.");
    } else if (fallbackFound) {
      console.log("✅ Browser doesn't support SpeechRecognition. Enterprise fallback message displayed successfully.");
    } else {
      console.error("❌ Neither recording state nor fallback message was found.");
      hasErrors = true;
    }

    if(hasErrors) {
      console.log("❌ Runtime errors or test failures were detected!");
      process.exit(1);
    } else {
      console.log("\n✅ AI VOICE INPUT LOGIC VERIFIED SUCCESSFULLY. No errors found!");
    }
  } catch (err) {
    console.error('Script error:', err);
    process.exit(1);
  }
  
  await browser.close();
})();
