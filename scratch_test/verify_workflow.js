const { chromium } = require('playwright');
const path = require('path');
const fs = require('fs');

const OUT_DIR = "C:\\Users\\ANJO JAISON\\.gemini\\antigravity-ide\\brain\\f3e95313-918c-498d-b420-68d36a273312";

async function run() {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width: 390, height: 844 }
  });
  const page = await context.newPage();

  const takeScreen = async (name) => {
    await page.waitForTimeout(500); // wait for loaders
    await page.screenshot({ path: path.join(OUT_DIR, name) });
    console.log(`Saved screenshot: ${name}`);
  };

  try {
    // 1. Dashboard
    console.log("Navigating to Dashboard...");
    await page.goto('http://localhost:5174/dashboard');
    await takeScreen('01_dashboard.png');

    // 2. My Tickets
    console.log("Navigating to My Tickets...");
    // Just force navigation for reliability
    await page.goto('http://localhost:5174/my-tickets');
    await takeScreen('02_my_tickets.png');

    // 3. Ticket Details SR-10452
    console.log("Navigating to Ticket Details SR-10452...");
    await page.goto('http://localhost:5174/ticket-details/SR-10452');
    await takeScreen('03_ticket_details_10452.png');

    // 4. Ticket Timeline SR-10452
    console.log("Navigating to Timeline...");
    await page.goto('http://localhost:5174/ticket-timeline/SR-10452');
    await takeScreen('04_timeline_10452.png');

    // 5. Back to Ticket Details
    console.log("Going Back...");
    await page.goto('http://localhost:5174/ticket-details/SR-10452');
    await takeScreen('05_back_ticket_details.png');

    // 6. SLA Tracker SR-10452
    console.log("Navigating to SLA Tracker...");
    await page.goto('http://localhost:5174/sla-tracker/SR-10452');
    await takeScreen('06_sla_10452.png');

    // 7. Back to Ticket Details
    console.log("Going Back...");
    await page.goto('http://localhost:5174/ticket-details/SR-10452');
    await takeScreen('07_back_ticket_details.png');

    // 8. Asset Details
    console.log("Navigating to Asset Details...");
    await page.goto('http://localhost:5174/assets/details/AST-01');
    await takeScreen('08_asset_details.png');

    // 9. Back to Ticket Details
    console.log("Going Back...");
    await page.goto('http://localhost:5174/ticket-details/SR-10452');
    await takeScreen('09_back_ticket_details.png');

    // 10. Back to My Tickets
    console.log("Going Back to My Tickets...");
    await page.goto('http://localhost:5174/my-tickets');
    await takeScreen('10_back_my_tickets.png');

    // 11. Ticket Details SR-10447
    console.log("Navigating to Ticket Details SR-10447...");
    await page.goto('http://localhost:5174/ticket-details/SR-10447');
    await takeScreen('11_ticket_details_10447.png');
    
    console.log("Navigating to Timeline SR-10447...");
    await page.goto('http://localhost:5174/ticket-timeline/SR-10447');
    await takeScreen('12_timeline_10447.png');

    console.log("Verification complete.");
  } catch (error) {
    console.error("Error during verification:", error);
  } finally {
    await browser.close();
  }
}

run();
