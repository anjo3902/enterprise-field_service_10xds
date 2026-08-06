const { chromium } = require('playwright');
const path = require('path');
const fs = require('fs');

async function runTest() {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext();
  const page = await context.newPage();
  
  const artifactDir = "C:/Users/ANJO JAISON/.gemini/antigravity-ide/brain/f3e95313-918c-498d-b420-68d36a273312";

  try {
    console.log("Loading MyTickets...");
    await page.goto('http://localhost:5173/my-tickets');
    await page.waitForSelector('text=My Tickets');
    await page.screenshot({ path: path.join(artifactDir, 'mytickets_initial.png') });
    console.log("✅ Page loaded");

    // Test ticket navigation
    console.log("Clicking first ticket card...");
    await page.click('text=Air Conditioning Failure');
    await page.waitForSelector('text=Ticket Details');
    await page.screenshot({ path: path.join(artifactDir, 'mytickets_details.png') });
    const url1 = page.url();
    if (!url1.includes('/ticket-details/SR-10452')) throw new Error("Navigation failed");
    console.log("✅ Navigation to Ticket Details successful");

    // Go back
    await page.goBack();
    await page.waitForSelector('text=My Tickets');
    
    // Test More Actions modal
    console.log("Testing More Actions modal...");
    // Find the MoreHorizontal button of the first ticket
    const cards = await page.$$('text=Air Conditioning Failure');
    // It's tricky to select the More button specifically. It's a button inside the card.
    // Let's just evaluate in page:
    await page.evaluate(() => {
        const cards = Array.from(document.querySelectorAll('div')).filter(el => el.textContent.includes('Air Conditioning Failure') && el.style.backgroundColor === 'rgb(255, 255, 255)');
        const card = cards[0];
        // find button inside card
        const btn = card.querySelector('button');
        if (btn) btn.click();
    });
    
    await page.waitForSelector('text=Ticket Actions', { timeout: 3000 });
    await page.screenshot({ path: path.join(artifactDir, 'mytickets_actions_modal.png') });
    const url2 = page.url();
    if (url2.includes('/ticket-details')) throw new Error("More button navigated to details incorrectly");
    console.log("✅ Ticket Actions Modal opened correctly");

    // Close actions modal
    await page.evaluate(() => {
        // find the overlay and click it
        const overlays = Array.from(document.querySelectorAll('div')).filter(el => el.style.zIndex === '100');
        if (overlays.length > 0) overlays[0].click();
    });
    await page.waitForTimeout(500);

    // Test Filter Modal
    console.log("Testing Filter Modal...");
    // Filter button is inside SortRow and SearchBar.
    await page.click('text=Filter', { force: true });
    await page.waitForSelector('text=Advanced Filters', { timeout: 3000 });
    await page.screenshot({ path: path.join(artifactDir, 'mytickets_filter_modal.png') });
    console.log("✅ Filter Modal opened correctly");
    
    // Close filter modal
    await page.evaluate(() => {
        const overlays = Array.from(document.querySelectorAll('div')).filter(el => el.style.zIndex === '100');
        if (overlays.length > 0) overlays[0].click();
    });
    await page.waitForTimeout(500);

    // Test Search (Customer)
    console.log("Testing Customer Search...");
    await page.fill('input[placeholder*="Search tickets"]', 'Alpha Corp');
    await page.waitForTimeout(500); // give it a moment to filter
    const ticketsAlpha = await page.$$eval('div', els => els.filter(el => el.style.backgroundColor === 'rgb(255, 255, 255)' && el.style.cursor === 'pointer').length);
    if (ticketsAlpha !== 1) throw new Error("Expected 1 ticket for Alpha Corp, got " + ticketsAlpha);
    console.log("✅ Search by Customer verified");
    
    console.log("ALL TESTS PASSED");
  } catch (error) {
    console.error("TEST FAILED:", error);
    await page.screenshot({ path: path.join(artifactDir, 'mytickets_fail.png') });
  } finally {
    await browser.close();
  }
}

runTest();
