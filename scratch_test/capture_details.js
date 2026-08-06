const { chromium } = require('playwright');
const path = require('path');

const artifactDir = process.env.ARTIFACT_DIR || 'C:\\Users\\ANJO JAISON\\.gemini\\antigravity-ide\\brain\\f3e95313-918c-498d-b420-68d36a273312';

async function runTest() {
    const browser = await chromium.launch({ headless: true });
    const context = await browser.newContext({
        viewport: { width: 390, height: 844 } // Mobile viewport matching the layout
    });
    const page = await context.newPage();

    console.log("Navigating to My Tickets...");
    await page.goto('http://localhost:5173/my-tickets');
    await page.waitForLoadState('networkidle');

    console.log("Clicking first ticket card...");
    await page.click('text=Elevator Malfunction');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(500); // let animation settle

    await page.screenshot({ path: path.join(artifactDir, 'mytickets_details.png') });
    console.log("✅ Screenshot captured");
    await browser.close();
}

runTest().catch(console.error);
