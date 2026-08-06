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
    // 1. Dashboard -> Notifications (via Bell Icon)
    console.log("--- Test: Dashboard Bell Icon ---");
    await page.goto('http://localhost:5174/dashboard');
    // Finding the Bell icon... the bell icon is an SVG. Let's find the button containing the bell.
    // We'll evaluate to click the button that has a child SVG with a specific class or just finding the one in the top right.
    await page.evaluate(() => {
      // Find the button wrapping the bell icon
      const buttons = [...document.querySelectorAll('button')];
      // The bell is usually in the top header. Just search for a button with a red dot child.
      // Wait, there's a div with width 8px height 8px next to it for the notification dot.
      // We can also just search for a button in the top fixed bar.
      // In AppHeader, we have a button containing the Bell icon.
      const bellButton = buttons.find(b => b.innerHTML.includes('lucide-bell'));
      if(bellButton) bellButton.click();
    });
    await checkUrl('/notifications', 'Notifications via Bell Icon');

    // Test Back button logic from Bell
    console.log("--- Test: In-App Back Button ---");
    await page.evaluate(() => {
      const backBtn = [...document.querySelectorAll('button')].find(b => b.innerText.includes('Back'));
      if(backBtn) backBtn.click();
    });
    await checkUrl('/dashboard', 'Back from Notifications (using in-app back)');


    // 2. More Menu -> Notifications
    console.log("--- Test: More Menu -> Notifications ---");
    await page.goto('http://localhost:5174/dashboard');
    await page.evaluate(() => {
      const moreBtn = [...document.querySelectorAll('button')].find(b => b.innerText.includes('More'));
      if(moreBtn) moreBtn.click();
    });
    await page.waitForTimeout(500); // wait for drawer animation
    await page.evaluate(() => {
      const notifBtn = [...document.querySelectorAll('button')].find(b => b.innerText.includes('Notifications'));
      if(notifBtn) notifBtn.click();
    });
    await checkUrl('/notifications', 'Notifications via More Menu');

    // Test Browser Back Button
    console.log("--- Test: Browser Back Button ---");
    await page.goBack();
    await checkUrl('/dashboard', 'Back from Notifications (using Browser Back)');


    // 3. Direct Navigation Fallback
    console.log("--- Test: Fallback Navigation ---");
    const newPage = await browser.newPage();
    newPage.on('console', msg => {
      if (msg.type() === 'error') {
        hasErrors = true;
      }
    });
    await newPage.goto('http://localhost:5174/notifications');
    await newPage.evaluate(() => {
      const backBtn = [...document.querySelectorAll('button')].find(b => b.innerText.includes('Back'));
      if(backBtn) backBtn.click();
    });
    // Fallback should go to /dashboard
    await newPage.waitForTimeout(1000); 
    const url = new URL(newPage.url());
    if (url.pathname !== '/dashboard') {
      console.error(`❌ [Fallback] Expected /dashboard, got ${url.pathname}`);
      process.exit(1);
    } else {
      console.log(`✅ [Fallback] Reached /dashboard`);
    }

    if(hasErrors) {
      console.log("❌ Runtime errors were detected in the console!");
      process.exit(1);
    } else {
      console.log("\n✅ ALL NOTIFICATION FLOWS VERIFIED SUCCESSFULLY. No errors found!");
    }
  } catch (err) {
    console.error('Script error:', err);
  }
  
  await browser.close();
})();
