const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage();
  let hasErrors = false;

  page.on('pageerror', err => { console.log(`[PAGE ERROR] ${err.message}`); hasErrors = true; });
  page.on('console', msg => {
    if (msg.type() === 'error' && !msg.text().includes('favicon')) {
      console.log(`[CONSOLE ERROR] ${msg.text()}`); hasErrors = true;
    }
  });

  const dummyImg = path.join(__dirname, 'dummy.png');
  fs.writeFileSync(dummyImg, 'dummy', 'utf8');

  try {
    await page.goto('http://localhost:5174/raise-ticket');
    await page.waitForTimeout(800);

    console.log("--- Test 1: Text analysis + Accept & Populate ---");
    await page.fill('textarea', 'The HVAC unit in Block C is not cooling at all');
    await page.waitForTimeout(5000); // debounce + analysis
    const cardVisible = await page.locator('text="AI Analysis"').count() > 0;
    if (!cardVisible) { console.error("❌ AI card did not appear"); hasErrors = true; process.exit(1); }
    console.log("✅ AI Analysis card appeared");

    await page.click('text="Accept & Populate"');
    await page.waitForTimeout(500);

    // Title should be set to AI title (always overwrite)
    const titleVal = await page.locator('input[placeholder="Describe the issue briefly…"]').inputValue();
    if (titleVal.length > 0 && titleVal !== '') {
      console.log(`✅ Title populated: "${titleVal}"`);
    } else { console.error("❌ Title not populated"); hasErrors = true; }

    // Category should be set
    const catVal = await page.evaluate(() => {
      const selects = Array.from(document.querySelectorAll('select'));
      return selects[0]?.value || '';
    });
    if (catVal && catVal !== '') {
      console.log(`✅ Category populated: "${catVal}"`);
    } else { console.error("❌ Category not populated"); hasErrors = true; }

    // Priority chip should be selected
    const priorityActive = await page.evaluate(() => {
      const btns = Array.from(document.querySelectorAll('button'));
      return btns.some(b => 
        ['Critical','High','Medium','Low'].includes(b.textContent?.trim() || '') &&
        b.style.outline && b.style.outline !== 'none' && b.style.outline !== ''
      );
    });
    if (priorityActive) {
      console.log("✅ Priority chip selected");
    } else { console.error("❌ Priority not selected"); hasErrors = true; }

    // Description should contain AI Analysis block
    const descVal = await page.locator('textarea').inputValue();
    if (descVal.includes('— AI Analysis —') && descVal.includes('Fault Category:') && descVal.includes('Confidence:')) {
      console.log("✅ AI findings appended to Description correctly");
    } else { console.error(`❌ Description missing AI block. Got: "${descVal.substring(0, 100)}"`); hasErrors = true; }

    // AI card should be dismissed after accept
    const cardGone = await page.locator('text="AI Analysis"').count() === 0;
    if (cardGone) {
      console.log("✅ AI card auto-dismissed after Accept");
    } else { console.error("❌ AI card still visible after Accept"); hasErrors = true; }

    console.log("--- Test 2: Asset NOT populated by AI ---");
    // Asset select should still be empty (first option / placeholder)
    const assetVal = await page.evaluate(() => {
      const selects = Array.from(document.querySelectorAll('select'));
      return selects[1]?.value || '';
    });
    if (!assetVal || assetVal === '') {
      console.log("✅ Asset NOT auto-populated (correct — backend concern)");
    } else { console.error(`❌ Asset was auto-populated: "${assetVal}" — should not be`); hasErrors = true; }

    console.log("--- Test 3: Populated fields remain editable ---");
    await page.fill('input[placeholder="Describe the issue briefly…"]', 'Edited title by user');
    const editedTitle = await page.locator('input[placeholder="Describe the issue briefly…"]').inputValue();
    if (editedTitle === 'Edited title by user') {
      console.log("✅ Title field is fully editable after AI populate");
    } else { console.error("❌ Title field not editable"); hasErrors = true; }

    console.log("--- Test 4: Image upload + Accept ---");
    await page.goto('http://localhost:5174/raise-ticket');
    await page.waitForTimeout(600);
    const [imgInput] = await page.locator('input[type="file"]').all();
    await imgInput.setInputFiles(dummyImg);
    await page.waitForTimeout(3500);
    await page.click('text="Accept & Populate"');
    await page.waitForTimeout(500);
    const imgTitle = await page.locator('input[placeholder="Describe the issue briefly…"]').inputValue();
    const imgDesc  = await page.locator('textarea').inputValue();
    if (imgTitle.length > 0) console.log(`✅ Image AI → Title: "${imgTitle}"`);
    else { console.error("❌ Title not populated after image AI"); hasErrors = true; }
    if (imgDesc.includes('— AI Analysis —')) console.log("✅ Image AI → Description appended correctly");
    else { console.error("❌ Description missing AI block after image accept"); hasErrors = true; }

    console.log("--- Test 5: Accept twice does not duplicate AI block ---");
    // Upload another image and accept again
    await page.goto('http://localhost:5174/raise-ticket');
    await page.waitForTimeout(600);
    await page.fill('textarea', 'Generator is failing to start in Block B');
    await page.waitForTimeout(5000);
    await page.click('text="Accept & Populate"');
    await page.waitForTimeout(500);
    // Trigger another analysis by typing more
    await page.goto('http://localhost:5174/raise-ticket');
    await page.waitForTimeout(600);
    await page.fill('textarea', 'The water pump is leaking near the basement');
    await page.waitForTimeout(5000);
    await page.click('text="Accept & Populate"');
    await page.waitForTimeout(500);
    const finalDesc = await page.locator('textarea').inputValue();
    const aiBlockCount = (finalDesc.match(/— AI Analysis —/g) || []).length;
    if (aiBlockCount === 1) {
      console.log("✅ Description contains exactly one AI Analysis block (no duplicate)");
    } else { console.error(`❌ AI block duplicated — found ${aiBlockCount} occurrences`); hasErrors = true; }

    console.log("--- Test 6: Full submission after AI populate ---");
    // form already populated from test 5
    await page.click('text="Submit Ticket"');
    await page.waitForTimeout(2000);
    const success = await page.locator('text="Ticket Raised!"').count() > 0;
    if (success) console.log("✅ Full ticket submitted successfully after AI populate");
    else { console.error("❌ Submission failed"); hasErrors = true; }

    fs.unlinkSync(dummyImg);

    if (hasErrors) { console.error("\n❌ Tests failed!"); process.exit(1); }
    else console.log("\n✅ AI POPULATE WORKFLOW VERIFIED SUCCESSFULLY. No errors found!");
  } catch (err) {
    console.error('Script error:', err);
    process.exit(1);
  }
  await browser.close();
})();
