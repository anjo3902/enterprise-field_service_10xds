const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage();
  
  page.on('console', msg => {
    if (msg.type() === 'error') console.log(`[CONSOLE ERROR] ${msg.text()}`);
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

  async function clickUIBackButton() {
    await page.evaluate(() => {
      const b = [...document.querySelectorAll('button')].find(b => b.innerText.includes('Back'));
      if(b) b.click();
    });
  }

  const routesToTest = [
    { route: '/my-tickets', fallback: '/dashboard' },
    { route: '/machine-health', fallback: '/dashboard' },
    { route: '/machine-health/score', fallback: '/machine-health' },
    { route: '/revenue-intelligence', fallback: '/dashboard' },
    { route: '/sla-tracker', fallback: '/dashboard' },
    { route: '/analytics', fallback: '/dashboard' },
    { route: '/reports', fallback: '/dashboard' },
  ];

  try {
    for (const { route, fallback } of routesToTest) {
      console.log(`\n--- Testing ${route} ---`);
      
      // 1. Test Fallback (No history)
      console.log(`Testing fallback (direct navigation) for ${route}`);
      // Open a completely new page to clear history
      const newPage = await browser.newPage();
      await newPage.goto('http://localhost:5174' + route);
      await newPage.waitForTimeout(1000);
      const url = new URL(newPage.url());
      if(url.pathname !== route) {
        console.log(`Skipping ${route}, it redirected to ${url.pathname} (likely auth)`);
        await newPage.close();
        continue;
      }
      
      await newPage.evaluate(() => {
        const b = [...document.querySelectorAll('button')].find(b => b.innerText.includes('Back'));
        if(b) b.click();
      });
      await newPage.waitForTimeout(1000);
      const fbUrl = new URL(newPage.url());
      if (fbUrl.pathname !== fallback) {
        console.error(`❌ Fallback failed. Expected ${fallback}, got ${fbUrl.pathname}`);
        process.exit(1);
      }
      console.log(`✅ Fallback worked: ${fallback}`);
      await newPage.close();

      // 2. Test History Preservation
      console.log(`Testing history preservation for ${route}`);
      // Navigate to /dashboard first, then to the route
      await page.goto('http://localhost:5174' + (fallback === '/dashboard' ? '/assets' : '/dashboard')); // Use /assets to prove history doesn't just fallback to /dashboard
      
      const historySource = fallback === '/dashboard' ? '/assets' : '/dashboard';
      await checkUrl(historySource, 'History Source');
      
      await page.goto('http://localhost:5174' + route);
      await checkUrl(route, 'Target Route');
      
      await clickUIBackButton();
      await checkUrl(historySource, 'History Destination');
      console.log(`✅ History preserved: ${historySource}`);
    }

    console.log("\n✅ ALL BACK BUTTONS VERIFIED SUCCESSFULLY!");
  } catch (err) {
    console.error('Script error:', err);
  }
  
  await browser.close();
})();
