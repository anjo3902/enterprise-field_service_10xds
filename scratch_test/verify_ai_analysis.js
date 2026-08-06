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

  const dummyImg   = path.join(__dirname, 'dummy.png');
  const dummyAudio = path.join(__dirname, 'dummy.mp3');
  fs.writeFileSync(dummyImg,   'dummy', 'utf8');
  fs.writeFileSync(dummyAudio, 'dummy', 'utf8');

  try {
    console.log("--- Test: Raise Ticket screen renders ---");
    await page.goto('http://localhost:5174/raise-ticket');
    await page.waitForTimeout(800);
    const headerOk = await page.locator('text="Raise Ticket"').count() > 0;
    if (headerOk) console.log("✅ Raise Ticket screen rendered");
    else { console.error("❌ Screen not rendered"); hasErrors = true; }

    console.log("--- Test: Text analysis triggers AI ---");
    await page.fill('textarea', 'The HVAC air conditioning unit is not cooling properly in Block C');
    await page.waitForTimeout(4000); // wait for debounce + analysis
    const textAI = await page.locator('text="AI Analysis"').count() > 0;
    if (textAI) console.log("✅ AI Analysis card appeared after text input");
    else { console.error("❌ AI card did not appear for text"); hasErrors = true; }

    console.log("--- Test: Accept AI suggestion populates fields ---");
    await page.click('text="Accept & Populate"');
    await page.waitForTimeout(400);
    const titleFilled = await page.locator('input[placeholder="Describe the issue briefly…"]').inputValue();
    if (titleFilled.length > 0) console.log(`✅ Title auto-populated: "${titleFilled}"`);
    else { console.error("❌ Title not populated"); hasErrors = true; }

    console.log("--- Test: Image upload triggers AI ---");
    await page.goto('http://localhost:5174/raise-ticket');
    await page.waitForTimeout(600);
    const [imgInput] = await page.locator('input[type="file"]').all();
    await imgInput.setInputFiles(dummyImg);
    await page.waitForTimeout(2500); // wait for analysis
    const imgAI = await page.locator('text="AI Analysis"').count() > 0;
    if (imgAI) console.log("✅ AI Analysis card appeared after image upload");
    else { console.error("❌ AI card did not appear for image"); hasErrors = true; }
    
    const imgPageText = await page.content();
    const imgSourceLabel = imgPageText.includes('Image Analysis');
    if (imgSourceLabel) console.log("✅ Source label shows 'Image Analysis'");
    else { console.error("❌ Source label incorrect"); hasErrors = true; }

    console.log("--- Test: Audio upload triggers AI ---");
    await page.goto('http://localhost:5174/raise-ticket');
    await page.waitForTimeout(600);
    const [,audioInput] = await page.locator('input[type="file"]').all();
    await audioInput.setInputFiles(dummyAudio);
    await page.waitForTimeout(2500);
    const audioAI = await page.locator('text="AI Analysis"').count() > 0;
    if (audioAI) console.log("✅ AI Analysis card appeared after audio upload");
    else { console.error("❌ AI card did not appear for audio"); hasErrors = true; }
    
    const audioPageText = await page.content();
    const audioSourceLabel = audioPageText.includes('Audio Analysis');
    if (audioSourceLabel) console.log("✅ Source label shows 'Audio Analysis'");
    else { console.error("❌ Source label incorrect"); hasErrors = true; }

    console.log("--- Test: Dismiss AI card ---");
    await page.click('text="Dismiss"');
    await page.waitForTimeout(300);
    const aiGone = await page.locator('text="AI Analysis"').count() === 0;
    if (aiGone) console.log("✅ AI card dismissed successfully");
    else { console.error("❌ AI card still visible"); hasErrors = true; }

    console.log("--- Test: Full ticket creation with AI ---");
    await page.goto('http://localhost:5174/raise-ticket');
    await page.waitForTimeout(600);
    await page.fill('textarea', 'Generator startup failure in Block B');
    await page.waitForTimeout(4000);
    await page.click('text="Accept & Populate"');
    await page.waitForTimeout(400);
    await page.click('text="Submit Ticket"');
    await page.waitForTimeout(2000);
    const success = await page.locator('text="Ticket Raised!"').count() > 0;
    if (success) console.log("✅ Full ticket created after AI populate + submit");
    else { console.error("❌ Ticket creation failed"); hasErrors = true; }

    fs.unlinkSync(dummyImg);
    fs.unlinkSync(dummyAudio);

    if (hasErrors) { console.error("❌ Tests failed!"); process.exit(1); }
    else console.log("\n✅ AI RAISE TICKET ANALYSIS VERIFIED SUCCESSFULLY. No errors found!");
  } catch (err) {
    console.error('Script error:', err);
    process.exit(1);
  }
  await browser.close();
})();
