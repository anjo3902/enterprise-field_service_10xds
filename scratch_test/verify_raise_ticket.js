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

  try {
    console.log("--- Test: My Tickets renders ---");
    await page.goto('http://localhost:5174/my-tickets');
    await page.waitForTimeout(800);
    const headerFound = await page.locator('text="My Tickets"').count() > 0;
    if (headerFound) console.log("✅ My Tickets page rendered");
    else { console.error("❌ My Tickets not rendered"); hasErrors = true; }

    console.log("--- Test: FAB navigates to Raise Ticket ---");
    await page.click('text="Raise Ticket"');
    await page.waitForTimeout(800);
    const raiseHeader = await page.locator('text="Raise Ticket"').count() > 0;
    if (raiseHeader) console.log("✅ Raise Ticket screen rendered");
    else { console.error("❌ Raise Ticket screen not rendered"); hasErrors = true; }

    console.log("--- Test: Form validation ---");
    await page.click('text="Submit Ticket"');
    await page.waitForTimeout(400);
    const errorShown = await page.locator('text="Title is required"').count() > 0;
    if (errorShown) console.log("✅ Validation errors displayed correctly");
    else { console.error("❌ Validation not working"); hasErrors = true; }

    console.log("--- Test: Fill form and submit ---");
    await page.fill('input[placeholder="Describe the issue briefly…"]', 'HVAC Unit Malfunction');
    await page.selectOption('select', { label: 'HVAC' });
    await page.click('text="High"');
    await page.fill('textarea', 'The HVAC unit in Block A is not cooling properly. Immediate attention required.');
    
    console.log("--- Test: Attach image ---");
    const dummyImg = path.join(__dirname, 'dummy.png');
    fs.writeFileSync(dummyImg, 'dummy', 'utf8');
    const [imgInput] = await page.locator('input[type="file"]').all();
    await imgInput.setInputFiles(dummyImg);
    await page.waitForTimeout(400);
    const imgAttached = await page.locator('text="Image Attached"').count() > 0;
    if (imgAttached) console.log("✅ Image attachment works");
    else { console.error("❌ Image attachment failed"); hasErrors = true; }

    console.log("--- Test: Submit ticket ---");
    await page.click('text="Submit Ticket"');
    await page.waitForTimeout(2000);
    const successOverlay = await page.locator('text="Ticket Raised!"').count() > 0;
    if (successOverlay) console.log("✅ Success overlay appeared");
    else { console.error("❌ Success overlay did not appear"); hasErrors = true; }

    console.log("--- Test: Return to My Tickets with new ticket at top ---");
    await page.click('text="View My Tickets"');
    await page.waitForTimeout(800);
    const backToTickets = await page.locator('text="HVAC Unit Malfunction"').count() > 0;
    if (backToTickets) console.log("✅ New ticket appears at top of My Tickets list");
    else { console.error("❌ New ticket not visible in list"); hasErrors = true; }

    console.log("--- Test: Cancel button navigation ---");
    await page.click('text="Raise Ticket"');
    await page.waitForTimeout(600);
    await page.click('text="Cancel"');
    await page.waitForTimeout(600);
    const cancelledBack = await page.url().includes('/my-tickets');
    if (cancelledBack) console.log("✅ Cancel returns to My Tickets");
    else { console.error("❌ Cancel didn't navigate back"); hasErrors = true; }

    fs.unlinkSync(dummyImg);

    if (hasErrors) { console.error("❌ Tests failed!"); process.exit(1); }
    else console.log("\n✅ RAISE TICKET WORKFLOW VERIFIED SUCCESSFULLY. No errors found!");
  } catch (err) {
    console.error('Script error:', err);
    process.exit(1);
  }
  await browser.close();
})();
