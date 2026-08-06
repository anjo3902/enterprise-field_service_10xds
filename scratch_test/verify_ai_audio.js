const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

(async () => {
  const browser = await chromium.launch();
  const context = await browser.newContext();
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

    // Create a dummy audio file
    const dummyAudioPath = path.join(__dirname, 'dummy_audio.mp3');
    fs.writeFileSync(dummyAudioPath, 'dummy content', 'utf8');

    console.log("--- Test: Attaching an Audio File ---");
    const fileInput = await page.locator('input[type="file"]');
    await fileInput.setInputFiles(dummyAudioPath);
    await page.waitForTimeout(500);

    // Check if the preview renders "dummy_audio.mp3" text
    const previewFound = await page.locator('text="dummy_audio.mp3"').count() > 0;
    if (previewFound) {
      console.log("✅ Audio file preview rendered successfully with file name.");
    } else {
      console.error("❌ Audio preview failed to render.");
      hasErrors = true;
    }

    console.log("--- Test: Removing the Audio File ---");
    await page.click('button:has(svg.lucide-x)');
    await page.waitForTimeout(500);

    const previewRemoved = await page.locator('text="dummy_audio.mp3"').count() === 0;
    if (previewRemoved) {
      console.log("✅ Audio preview removed successfully.");
    } else {
      console.error("❌ Audio preview still exists after removal.");
      hasErrors = true;
    }

    console.log("--- Test: Sending an Audio File ---");
    await fileInput.setInputFiles(dummyAudioPath);
    await page.waitForTimeout(500);
    
    await page.click('button:has(svg.lucide-send)');
    await page.waitForTimeout(500);

    // Check if the <audio> tag appears in the chat bubble
    const sentAudioFound = await page.locator('audio').count() > 0;
    if (sentAudioFound) {
      console.log("✅ Audio sent and rendered in chat bubble successfully with HTML5 controls.");
    } else {
      console.error("❌ Audio failed to appear in chat.");
      hasErrors = true;
    }

    // Clean up
    fs.unlinkSync(dummyAudioPath);

    if(hasErrors) {
      console.log("❌ Runtime errors or test failures were detected!");
      process.exit(1);
    } else {
      console.log("\n✅ AI AUDIO UPLOAD VERIFIED SUCCESSFULLY. No errors found!");
    }
  } catch (err) {
    console.error('Script error:', err);
    process.exit(1);
  }
  
  await browser.close();
})();
