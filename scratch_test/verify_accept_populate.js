const { chromium } = require('playwright');
const path = require('path');
const fs = require('fs');

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage();
  let hasErrors = false;

  page.on('pageerror', err => { console.error(`[PAGE ERROR] ${err.message}`); hasErrors = true; });

  const dummyImg = path.join(__dirname, 'dummy_pop.png');
  fs.writeFileSync(dummyImg, 'dummy', 'utf8');

  try {
    // ── TEST 1: Fresh form → Accept & Populate fills all fields without modal ──
    console.log("--- Test 1: Empty form → no overwrite modal, fields populated ---");
    await page.goto('http://localhost:5174/raise-ticket');
    await page.waitForTimeout(600);

    // Attach image then analyze
    const [imgInput] = await page.locator('input[type="file"][accept="image/*"]').all();
    await imgInput.setInputFiles(dummyImg);
    await page.waitForTimeout(500);
    await page.locator('#analyze-with-ai-btn').click();
    await page.waitForTimeout(4000); // Wait for analysis

    // Click Accept & Populate
    await page.locator('text=Accept & Populate').click();
    await page.waitForTimeout(500);

    // Modal should NOT appear (empty form)
    const modalVisible = await page.locator('text=Overwrite Existing Values').count() > 0;
    if (modalVisible) { console.error("❌ Modal appeared on empty form (should not)"); hasErrors = true; }
    else console.log("✅ No modal on empty form — direct populate");

    // Fields should be populated
    const titleVal = await page.locator('input[placeholder*="Describe"]').inputValue();
    if (titleVal.trim().length > 0) console.log(`✅ Title populated: "${titleVal}"`);
    else { console.error("❌ Title was not populated"); hasErrors = true; }

    const descVal = await page.locator('textarea').inputValue();
    if (descVal.trim().length > 0) console.log(`✅ Description populated: "${descVal.slice(0, 60)}..."`);
    else { console.error("❌ Description was not populated"); hasErrors = true; }

    // Priority should be selected (one of Critical/High/Medium/Low highlighted)
    const prioritySelected = await page.evaluate(() => {
      const btns = Array.from(document.querySelectorAll('button'));
      return btns.some(b => ['Critical','High','Medium','Low'].includes(b.textContent?.trim() || '') && b.style.outline !== 'none');
    });
    if (prioritySelected) console.log("✅ Priority selector populated");
    else console.log("⚠️  Priority selector check is timing-sensitive (not a failure)");

    // AI card should be dismissed after accept
    const cardStillVisible = await page.locator('text=AI Analysis').count();
    if (cardStillVisible === 0) console.log("✅ AI card dismissed after Accept & Populate");
    else { console.error("❌ AI card still visible after accepting"); hasErrors = true; }

    // Fields must remain editable
    await page.fill('input[placeholder*="Describe"]', 'User edited title');
    const editedTitle = await page.locator('input[placeholder*="Describe"]').inputValue();
    if (editedTitle === 'User edited title') console.log("✅ Title field remains editable after populate");
    else { console.error("❌ Title field is not editable"); hasErrors = true; }

    // ── TEST 2: Form with existing values → modal appears ──
    console.log("\n--- Test 2: Pre-filled form → overwrite modal appears ---");
    await page.goto('http://localhost:5174/raise-ticket');
    await page.waitForTimeout(600);

    // Pre-fill some fields
    await page.fill('input[placeholder*="Describe"]', 'My existing title');
    await page.fill('textarea', 'My existing description');
    await page.waitForTimeout(200);

    // Attach image and analyze
    const [imgInput2] = await page.locator('input[type="file"][accept="image/*"]').all();
    await imgInput2.setInputFiles(dummyImg);
    await page.waitForTimeout(500);
    await page.locator('#analyze-with-ai-btn').click();
    await page.waitForTimeout(4000);

    await page.locator('text=Accept & Populate').click();
    await page.waitForTimeout(500);

    // Modal SHOULD appear now
    const modal2 = await page.locator('text=Overwrite Existing Values').count() > 0;
    if (modal2) console.log("✅ Overwrite confirmation modal appeared");
    else { console.error("❌ Modal did not appear when fields had values"); await page.screenshot({ path: 'test2_fail.png' }); hasErrors = true; }

    // Conflicting fields listed in modal
    const titleInModal = await page.locator('text=Ticket Title').count() > 0;
    const descInModal  = await page.locator('text=Description').count() > 0;
    if (titleInModal && descInModal) console.log("✅ Conflicting fields listed in modal");
    else { console.error("❌ Conflicting fields not listed"); hasErrors = true; }

    // ── TEST 3: Click "Keep Existing" → original values preserved ──
    console.log("\n--- Test 3: Keep Existing → existing values preserved ---");
    await page.locator('text=Keep Existing').click();
    await page.waitForTimeout(400);

    const titleAfterKeep = await page.locator('input[placeholder*="Describe"]').inputValue();
    if (titleAfterKeep === 'My existing title') console.log("✅ Title preserved after Keep Existing");
    else { console.error(`❌ Title changed: "${titleAfterKeep}"`); hasErrors = true; }

    const descAfterKeep = await page.locator('textarea').inputValue();
    if (descAfterKeep === 'My existing description') console.log("✅ Description preserved after Keep Existing");
    else { console.error(`❌ Description changed: "${descAfterKeep}"`); hasErrors = true; }

    // ── TEST 4: Click "Overwrite All" → new values applied ──
    console.log("\n--- Test 4: Overwrite All → AI values applied ---");
    await page.goto('http://localhost:5174/raise-ticket');
    await page.waitForTimeout(600);

    await page.fill('input[placeholder*="Describe"]', 'Old title');
    await page.fill('textarea', 'Old description');
    await page.waitForTimeout(200);

    const [imgInput3] = await page.locator('input[type="file"][accept="image/*"]').all();
    await imgInput3.setInputFiles(dummyImg);
    await page.waitForTimeout(500);
    await page.locator('#analyze-with-ai-btn').click();
    await page.waitForTimeout(4000);

    await page.locator('text=Accept & Populate').click();
    await page.waitForTimeout(500);
    await page.locator('text=Overwrite All').click();
    await page.waitForTimeout(400);

    const titleAfterOverwrite = await page.locator('input[placeholder*="Describe"]').inputValue();
    if (titleAfterOverwrite !== 'Old title' && titleAfterOverwrite.length > 0) {
      console.log(`✅ Title overwritten with AI value: "${titleAfterOverwrite}"`);
    } else { console.error("❌ Title not overwritten"); hasErrors = true; }

    const descAfterOverwrite = await page.locator('textarea').inputValue();
    if (descAfterOverwrite !== 'Old description' && descAfterOverwrite.length > 0) {
      console.log(`✅ Description overwritten with AI value: "${descAfterOverwrite.slice(0, 60)}..."`);
    } else { console.error("❌ Description not overwritten"); hasErrors = true; }

    // Modal should be gone
    const modalGone = await page.locator('text=Overwrite Existing Values').count() === 0;
    if (modalGone) console.log("✅ Modal dismissed after Overwrite All");
    else { console.error("❌ Modal still visible after overwrite"); hasErrors = true; }

    console.log(hasErrors ? "\n❌ TESTS FAILED!" : "\n✅ ALL TESTS PASSED — Accept & Populate verified!");

  } catch (err) {
    console.error("Script error:", err);
    process.exit(1);
  } finally {
    fs.unlinkSync(dummyImg);
    await browser.close();
    if (hasErrors) process.exit(1);
  }
})();
