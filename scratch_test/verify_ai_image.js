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

    // Create a dummy image
    const dummyImagePath = path.join(__dirname, 'dummy.png');
    fs.writeFileSync(dummyImagePath, 'dummy content base64 placeholder', 'utf8');

    console.log("--- Test: Attaching an Image ---");
    
    // We can't easily click the paperclip and expect a system dialog, 
    // instead we set the file directly on the hidden input.
    const fileInput = await page.locator('input[type="file"]');
    await fileInput.setInputFiles(dummyImagePath);
    await page.waitForTimeout(500);

    // Check if preview appears
    const previewFound = await page.locator('img[alt="Preview"]').count() > 0;
    if (previewFound) {
      console.log("✅ Image preview rendered successfully.");
    } else {
      console.error("❌ Image preview failed to render.");
      hasErrors = true;
    }

    console.log("--- Test: Removing the Image ---");
    // Click the X button (the one near the preview)
    // The X button contains a lucide-x svg
    await page.click('button:has(svg.lucide-x)');
    await page.waitForTimeout(500);

    const previewRemoved = await page.locator('img[alt="Preview"]').count() === 0;
    if (previewRemoved) {
      console.log("✅ Image preview removed successfully.");
    } else {
      console.error("❌ Image preview still exists after removal.");
      hasErrors = true;
    }

    console.log("--- Test: Sending an Image ---");
    await fileInput.setInputFiles(dummyImagePath);
    await page.waitForTimeout(500);
    
    // Check if the Send button is blue (meaning it's active)
    // We can just click the send button
    await page.click('button:has(svg.lucide-send)');
    await page.waitForTimeout(500);

    // Check if the image appears in the chat bubble
    const sentImageFound = await page.locator('img[alt="Attachment"]').count() > 0;
    if (sentImageFound) {
      console.log("✅ Image sent and rendered in chat bubble successfully.");
    } else {
      console.error("❌ Image failed to appear in chat.");
      hasErrors = true;
    }

    // Clean up
    fs.unlinkSync(dummyImagePath);

    if(hasErrors) {
      console.log("❌ Runtime errors or test failures were detected!");
      process.exit(1);
    } else {
      console.log("\n✅ AI IMAGE UPLOAD VERIFIED SUCCESSFULLY. No errors found!");
    }
  } catch (err) {
    console.error('Script error:', err);
    process.exit(1);
  }
  
  await browser.close();
})();
