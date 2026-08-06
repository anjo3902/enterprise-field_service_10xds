const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage();
  
  page.on('console', msg => {
    if (msg.type() === 'error') console.log(`[CONSOLE ERROR] ${msg.text()}`);
  });
  
  async function checkUrl(expectedPath) {
    await page.waitForTimeout(1000); 
    const url = new URL(page.url());
    if (url.pathname !== expectedPath) {
      console.error(`❌ Expected ${expectedPath}, got ${url.pathname}`);
      process.exit(1);
    } else {
      console.log(`✅ Reached ${expectedPath}`);
    }
  }

  async function clickUIBackButton() {
    await page.evaluate(() => {
      const b = [...document.querySelectorAll('button')].find(b => b.innerText.includes('Back'));
      if(b) b.click();
    });
  }

  async function clickBottomNav(label) {
    await page.evaluate((l) => {
      const btn = [...document.querySelectorAll('button')].find(b => b.innerText.includes(l));
      if(btn) btn.click();
    }, label);
  }

  try {
    console.log("--- FLOW 1: Dashboard -> Assets -> Search <- Assets ---");
    await page.goto('http://localhost:5174/dashboard');
    await checkUrl('/dashboard');
    
    // Dashboard -> Assets
    await clickBottomNav('Assets');
    await checkUrl('/assets');
    
    // Assets -> Search
    await page.click('input');
    await checkUrl('/assets/search');
    
    // Search <- Assets (using Back button)
    await clickUIBackButton();
    await checkUrl('/assets');

    console.log("\n--- FLOW 2: Dashboard -> Assets -> Listing <- Assets ---");
    await page.goto('http://localhost:5174/dashboard');
    await clickBottomNav('Assets');
    await checkUrl('/assets');
    
    // Assets -> Listing
    await page.evaluate(() => {
      const b = [...document.querySelectorAll('button')].find(b => b.innerText.includes('View All'));
      if(b) b.click();
    });
    await checkUrl('/assets/listing');
    
    // Listing <- Assets
    await clickUIBackButton();
    await checkUrl('/assets');

    console.log("\n--- FLOW 3: Assets -> Listing -> Details <- Listing ---");
    await page.evaluate(() => {
      const b = [...document.querySelectorAll('button')].find(b => b.innerText.includes('View All'));
      if(b) b.click();
    });
    await checkUrl('/assets/listing');
    
    // Listing -> Details
    await page.locator('text=Air Conditioning Unit A').first().click();
    await checkUrl('/assets/details');
    
    // Details <- Listing
    await clickUIBackButton();
    await checkUrl('/assets/listing');

    console.log("\n--- FLOW 4: Assets -> Search -> Details <- Search ---");
    await page.goto('http://localhost:5174/dashboard');
    await clickBottomNav('Assets');
    await checkUrl('/assets');
    
    await page.click('input');
    await checkUrl('/assets/search');
    
    // Type in search to show results if they don't show by default
    await page.fill('input', 'Air');
    
    await page.locator('text=Air Conditioning Unit A').first().click();
    await checkUrl('/assets/details');
    
    // Details <- Search
    await clickUIBackButton();
    await checkUrl('/assets/search');

    console.log("\n--- FLOW 5: Details -> History <- Details ---");
    await page.fill('input', 'Air');
    await page.locator('text=Air Conditioning Unit A').first().click();
    await checkUrl('/assets/details');
    
    await page.evaluate(() => {
      const b = [...document.querySelectorAll('button')].find(b => b.innerText.includes('View History'));
      if(b) b.click();
    });
    await checkUrl('/assets/history');
    
    // History <- Details
    await clickUIBackButton();
    await checkUrl('/assets/details');

    console.log("\n✅ ALL NAVIGATION FLOWS VERIFIED SUCCESSFULLY!");
  } catch (err) {
    console.error('Script error:', err);
  }
  
  await browser.close();
})();
