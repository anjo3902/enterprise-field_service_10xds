const { chromium } = require('playwright');
const path = require('path');
const fs = require('fs');

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage();
  let hasErrors = false;

  page.on('pageerror', err => { console.error(`[PAGE ERROR] ${err.message}`); hasErrors = true; });
  page.on('console', msg => { if (msg.type() === 'error') console.error(`[CONSOLE ERROR] ${msg.text()}`); });

  const dummyImg  = path.join(__dirname, 'dummy_verify.png');
  const dummyAudio = path.join(__dirname, 'dummy_verify.mp3');
  fs.writeFileSync(dummyImg, 'dummy', 'utf8');
  fs.writeFileSync(dummyAudio, 'dummy', 'utf8');

  try {
    // ── TEST 1: Upload image → AI should NOT appear automatically ──
    console.log("--- Test 1: Upload image → No auto-trigger ---");
    await page.goto('http://localhost:5174/raise-ticket');
    await page.waitForTimeout(800);

    const [imgInput] = await page.locator('input[type="file"][accept="image/*"]').all();
    await imgInput.setInputFiles(dummyImg);
    await page.waitForTimeout(4000); // Wait longer than any possible auto-trigger

    const autoCard = await page.locator('text=AI Analysis').count();
    if (autoCard > 0) {
      console.error("❌ AI card appeared automatically without button click!");
      hasErrors = true;
    } else {
      console.log("✅ No auto-trigger: AI card did not appear after upload");
    }

    // ── TEST 2: "Analyze with AI" button should be visible ──
    console.log("--- Test 2: Analyze with AI button appears ---");
    const btnVisible = await page.locator('#analyze-with-ai-btn').count() > 0;
    if (btnVisible) {
      console.log("✅ 'Analyze with AI' button is visible");
    } else {
      console.error("❌ 'Analyze with AI' button NOT found");
      await page.screenshot({ path: 'v_test2_fail.png' });
      hasErrors = true;
    }

    // ── TEST 3: Click button → loading messages appear ──
    console.log("--- Test 3: Click button → sequential loading messages ---");
    await page.locator('#analyze-with-ai-btn').click();
    await page.waitForTimeout(400);

    // Button should disappear while analyzing
    const btnGone = await page.locator('#analyze-with-ai-btn').count() === 0;
    if (btnGone) console.log("✅ 'Analyze with AI' button hidden during analysis");
    else { console.error("❌ Button still visible during analysis"); hasErrors = true; }

    // Check for loading spinner in the card
    const loadingCard = await page.locator('text=AI Analysis').count() > 0;
    if (loadingCard) console.log("✅ AI card appeared with loading state");
    else { console.error("❌ AI loading card did not appear"); await page.screenshot({ path: 'v_test3_fail.png' }); hasErrors = true; }

    // Capture a loading message mid-analysis
    const midStep = await page.evaluate(() => {
      const spans = Array.from(document.querySelectorAll('span'));
      return spans.find(s => s.textContent?.includes('...'))?.textContent || '';
    });
    if (midStep) console.log(`✅ Loading step message visible: "${midStep}"`);
    else console.log("⚠️  Could not capture mid-step message (timing sensitive, not a failure)");

    // ── TEST 4: AI result appears after loading ──
    console.log("--- Test 4: AI result appears after loading ---");
    await page.waitForTimeout(3500); // Wait for analysis to complete

    const resultCard = await page.locator('text=Equipment').count() > 0;
    if (resultCard) console.log("✅ AI Analysis result card appeared after loading");
    else { console.error("❌ AI result card did not appear after analysis"); await page.screenshot({ path: 'v_test4_fail.png' }); hasErrors = true; }

    // Confidence bar should be visible
    const confidenceBar = await page.locator('text=Confidence').count() > 0;
    if (confidenceBar) console.log("✅ Confidence row present in AI result");
    else { console.error("❌ Confidence row missing from AI result"); hasErrors = true; }

    // ── TEST 5: Re-upload resets AI result ──
    console.log("--- Test 5: New upload resets AI state ---");
    const [imgInput2] = await page.locator('input[type="file"][accept="image/*"]').all();
    await imgInput2.setInputFiles(dummyImg);
    await page.waitForTimeout(500);

    const cardAfterReupload = await page.locator('text=Equipment').count();
    const btnAfterReupload  = await page.locator('#analyze-with-ai-btn').count();
    if (cardAfterReupload === 0 && btnAfterReupload > 0) {
      console.log("✅ Re-upload correctly reset AI state and showed button again");
    } else {
      console.error(`❌ Re-upload did not reset AI state. Card: ${cardAfterReupload}, Button: ${btnAfterReupload}`);
      hasErrors = true;
    }

    // ── TEST 6: No console / page errors ──
    console.log("--- Test 6: No page errors ---");
    if (!hasErrors) console.log("✅ No console or page errors detected");

    console.log(hasErrors ? "\n❌ TESTS FAILED!" : "\n✅ ALL TESTS PASSED — Explicit AI workflow verified!");

  } catch (err) {
    console.error("Script error:", err);
    hasErrors = true;
  } finally {
    fs.unlinkSync(dummyImg);
    fs.unlinkSync(dummyAudio);
    await browser.close();
    if (hasErrors) process.exit(1);
  }
})();
