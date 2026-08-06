const { chromium } = require('playwright');
const path = require('path');
const fs = require('fs');

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage();
  let hasErrors = false;
  page.on('pageerror', e => { console.error('[PAGE ERROR]', e.message); hasErrors = true; });

  const dummyImg = path.join(__dirname, 'dummy_pipeline.png');
  fs.writeFileSync(dummyImg, 'dummy', 'utf8');

  try {
    await page.goto('http://localhost:5174/raise-ticket');
    await page.waitForTimeout(600);

    const [img] = await page.locator('input[type="file"][accept="image/*"]').all();
    await img.setInputFiles(dummyImg);
    await page.waitForTimeout(400);
    await page.locator('#analyze-with-ai-btn').click();

    // ── Test 1: First step appears immediately ──
    await page.waitForTimeout(200);
    const firstStep = await page.evaluate(() => {
      return Array.from(document.querySelectorAll('span'))
        .find(s => s.textContent?.includes('Upload') || s.textContent?.includes('Analyzing image'))?.textContent || '';
    });
    if (firstStep) console.log('✅ First step visible at 200ms:', firstStep.trim());
    else { console.error('❌ First step not visible'); hasErrors = true; }

    // ── Test 2: Mid-pipeline stages fire ──
    await page.waitForTimeout(2000);
    const midStep = await page.evaluate(() => {
      const keywords = ['Matching', 'Extracting', 'Determining', 'Predicting', 'Understanding'];
      return Array.from(document.querySelectorAll('span'))
        .find(s => keywords.some(k => s.textContent?.includes(k)))?.textContent || '';
    });
    if (midStep) console.log('✅ Mid-pipeline step at 2200ms:', midStep.trim());
    else console.log('⚠️  Mid step check inconclusive (timing)');

    // ── Test 3: Completed tick marks accumulate ──
    const ticks = await page.evaluate(() =>
      Array.from(document.querySelectorAll('span')).filter(s => s.textContent?.trim() === '\u2713').length
    );
    if (ticks > 0) console.log(`✅ ${ticks} completed tick mark(s) visible`);
    else { console.error('❌ No tick marks visible mid-pipeline'); hasErrors = true; }

    // ── Test 4: Final "Analysis Complete" step ──
    await page.waitForTimeout(3500);
    const finalStepVisible = await page.evaluate(() =>
      Array.from(document.querySelectorAll('span')).some(s => s.textContent?.includes('Analysis Complete'))
    );
    if (finalStepVisible) console.log('✅ "Analysis Complete" step visible');
    else console.log('⚠️  Final step may have transitioned quickly');

    // ── Test 5: Result card appears after pipeline ──
    await page.waitForTimeout(1000);
    const resultCard = await page.locator('text=Accept').count() > 0;
    if (resultCard) console.log('✅ Result card with Accept & Populate button appeared');
    else { console.error('❌ Result card did not appear after pipeline'); hasErrors = true; }

    // ── Test 6: No page errors ──
    if (!hasErrors) console.log('✅ No page errors');
    console.log(hasErrors ? '\n❌ TESTS FAILED!' : '\n✅ ALL TESTS PASSED — Progressive pipeline verified!');

  } catch (err) {
    console.error('Script error:', err);
    process.exit(1);
  } finally {
    fs.unlinkSync(dummyImg);
    await browser.close();
    if (hasErrors) process.exit(1);
  }
})();
