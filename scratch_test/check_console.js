const { chromium } = require('playwright');
const path = require('path');

async function checkConsole() {
    const browser = await chromium.launch({ headless: true });
    const context = await browser.newContext();
    const page = await context.newPage();

    let errors = [];
    page.on('console', msg => {
        if (msg.type() === 'error') {
            errors.push(`Console error: ${msg.text()}`);
        }
    });
    page.on('pageerror', exception => {
        errors.push(`Uncaught exception: ${exception.message}\n${exception.stack}`);
    });

    try {
        await page.goto('http://localhost:5173/vendor/revenue', { waitUntil: 'networkidle' });
        await page.waitForTimeout(2000); // wait for react to render
    } catch (e) {
        console.error("Failed to load page:", e);
    }
    
    if (errors.length > 0) {
        console.log("ERRORS FOUND:");
        console.log(errors.join("\n\n"));
    } else {
        console.log("No errors found on page load.");
    }
    
    await browser.close();
}

checkConsole().catch(console.error);
