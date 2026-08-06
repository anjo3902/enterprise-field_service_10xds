const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage();
  
  let hasErrors = false;
  page.on('console', msg => {
    if (msg.type() === 'error') {
      console.log(`[CONSOLE ERROR] ${msg.text()}`);
      hasErrors = true;
    }
  });
  
  async function checkUrl(expectedPath, label) {
    await page.waitForTimeout(1000); 
    const url = new URL(page.url());
    if (url.pathname !== expectedPath) {
      console.error(`❌ [${label}] Expected ${expectedPath}, got ${url.pathname}`);
      process.exit(1);
    } else {
      console.log(`✅ [${label}] Reached ${expectedPath}`);
    }
  }

  try {
    // Dashboard -> Assets
    console.log("--- FLOW 1: Dashboard -> Assets ---");
    await page.goto('http://localhost:5174/dashboard');
    await page.evaluate(() => {
      const btn = [...document.querySelectorAll('button')].find(b => b.innerText.includes('Assets'));
      if(btn) btn.click();
    });
    await checkUrl('/assets', 'Assets Dashboard');

    // Test informational cards (Renewal)
    console.log("\n--- Testing Informational Cards (Renewal) ---");
    await page.evaluate(() => {
      // Find the Software License text
      const el = [...document.querySelectorAll('p')].find(p => p.innerText.includes('Software License'));
      if(el) {
        let p = el;
        while(p && p.tagName !== 'DIV') p = p.parentElement;
        p.click();
      }
    });
    await checkUrl('/assets', 'Should remain on Assets (No Navigation)');

    // Assets -> Search -> Asset Details
    console.log("\n--- FLOW 2: Assets -> Search -> Asset Details ---");
    await page.click('input');
    await checkUrl('/assets/search', 'Asset Search');
    
    // Fill search to find Air Conditioning
    await page.fill('input', 'Air');
    await page.locator('text=Air Conditioning Unit A').first().click();
    await checkUrl('/assets/details', 'Asset Details from Search');

    // Go back to Assets Dashboard
    await page.goto('http://localhost:5174/assets');

    // Assets -> Categories -> Asset Listing -> Asset Details
    console.log("\n--- FLOW 3: Assets -> Categories -> Asset Listing -> Asset Details ---");
    await page.evaluate(() => {
      const el = [...document.querySelectorAll('p')].find(p => p.innerText.includes('Generators'));
      if(el) {
        let p = el;
        while(p && p.tagName !== 'DIV') p = p.parentElement;
        p.click();
      }
    });
    await checkUrl('/assets/listing', 'Asset Listing from Category Card');

    // Click an asset to go to details
    await page.locator('text=Generator G-04').first().click();
    await checkUrl('/assets/details', 'Asset Details from Listing');

    // Asset Details -> Asset History
    console.log("\n--- FLOW 4: Asset Details -> Asset History ---");
    await page.evaluate(() => {
      const b = [...document.querySelectorAll('button')].find(b => b.innerText.includes('View History'));
      if(b) b.click();
    });
    await checkUrl('/assets/history', 'Asset History from Details');

    // Test Activity Item (from Assets Dashboard)
    console.log("\n--- Testing Activity Card (from Assets Dashboard) ---");
    await page.goto('http://localhost:5174/assets');
    await page.evaluate(() => {
      const el = [...document.querySelectorAll('p')].find(p => p.innerText.includes('Fault Detected'));
      if(el) {
        let p = el;
        while(p && p.tagName !== 'DIV') p = p.parentElement;
        p.click();
      }
    });
    await checkUrl('/assets/history', 'Asset History from Activity Card');
    
    if(hasErrors) {
      console.log("❌ Runtime errors were detected in the console!");
      process.exit(1);
    } else {
      console.log("\n✅ ALL ASSET FLOWS VERIFIED SUCCESSFULLY. No errors found!");
    }
  } catch (err) {
    console.error('Script error:', err);
  }
  
  await browser.close();
})();
