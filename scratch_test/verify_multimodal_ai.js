const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage();
  let hasErrors = false;

  page.on('pageerror', err => { console.log(`[PAGE ERROR] ${err.message}`); hasErrors = true; });

  const dummyImg = path.join(__dirname, 'dummy.png');
  fs.writeFileSync(dummyImg, 'dummy', 'utf8');
  const dummyAudio = path.join(__dirname, 'dummy.mp3');
  fs.writeFileSync(dummyAudio, 'dummy', 'utf8');

  try {
    console.log("--- Test 1: Conflict Detection (HVAC Image vs Plumbing Text) ---");
    await page.goto('http://localhost:5174/raise-ticket');
    await page.waitForTimeout(600);
    
    // Upload image (Default mock image = Electrical / Generator)
    // Wait, the logic I wrote defaults image to Electrical (Generator).
    // Let's type plumbing text (Water pump).
    const [imgInput] = await page.locator('input[type="file"][accept="image/*"]').all();
    await imgInput.setInputFiles(dummyImg);
    await page.waitForTimeout(100);
    
    await page.fill('textarea', 'Water pump is leaking badly');
    await page.waitForTimeout(7000); // Wait for debounce and multimodal analysis
    
    const uiState = await page.evaluate(() => {
      const texts = Array.from(document.querySelectorAll('*')).map(el => el.textContent?.trim());
      const imageBtn = document.querySelector('button:has(svg.lucide-paperclip)')?.textContent?.trim() || 'No Image Button';
      const aiCardHeaders = Array.from(document.querySelectorAll('p')).map(p => p.textContent).filter(t => t?.includes('Analysis'));
      return { imageBtn, aiCardHeaders };
    });
    console.log("UI State at Test 1 Check:", uiState);

    const cardVisible = await page.locator('text=Multimodal Analysis').count() > 0;
    if (!cardVisible) { 
      console.error("❌ Multimodal Analysis card did not appear"); 
      await page.screenshot({ path: 'test1_fail.png' });
      hasErrors = true; 
    }

    const issueText = await page.locator('text=AI detected conflicting information').count() > 0;
    if (issueText) console.log("✅ Conflict detected successfully (Plumbing vs Electrical)");
    else { console.error("❌ Conflict not detected. Expected 'AI detected conflicting information...'"); hasErrors = true; }

    const priorityMedium = await page.locator('text=Medium').count() > 0;
    if (priorityMedium) console.log("✅ Priority safely set to Medium on conflict");
    else { console.error("❌ Priority not set to Medium on conflict"); hasErrors = true; }
    
    const confidenceLow = await page.locator('text=45%').count() > 0;
    if (confidenceLow) console.log("✅ Confidence lowered to 45% on conflict");
    else { console.error("❌ Confidence not lowered to 45% on conflict"); hasErrors = true; }

    console.log("--- Test 2: Multi-modal alignment (High Confidence) ---");
    await page.goto('http://localhost:5174/raise-ticket');
    await page.waitForTimeout(600);
    
    // Upload image (Electrical) and Audio (Mechanical) and Text (Electrical)
    // Actually, image=Electrical, audio=Mechanical, text=Electrical is a conflict.
    // Let's do Text=Electrical, Image=Electrical (Generator text + Image) -> no audio.
    const [imgInput2] = await page.locator('input[type="file"][accept="image/*"]').all();
    await imgInput2.setInputFiles(dummyImg);
    await page.fill('textarea', 'Generator failed to start');
    await page.waitForTimeout(7000);
    
    const conflict2 = await page.locator('text=AI detected conflicting information').count() > 0;
    if (!conflict2) console.log("✅ No conflict detected when text and image align (both Electrical)");
    else { console.error("❌ Conflict incorrectly detected for aligned inputs"); hasErrors = true; }
    
    const highConf = await page.evaluate(() => {
      return Array.from(document.querySelectorAll('span')).some(s => {
        const text = s.textContent || "";
        if (text.includes('%')) {
          const num = parseInt(text.replace('%', ''));
          return num > 90; // Confidence should be bumped up (>82)
        }
        return false;
      });
    });
    if (highConf) console.log("✅ Confidence boosted for aligned multimodal inputs");
    else { console.error("❌ Confidence not boosted for aligned inputs"); hasErrors = true; }

    console.log("--- Test 3: Audio only analysis ---");
    await page.goto('http://localhost:5174/raise-ticket');
    await page.waitForTimeout(600);
    const [audioInput] = await page.locator('input[type="file"][accept*="audio/"]').all();
    await audioInput.setInputFiles(dummyAudio);
    await page.waitForTimeout(5000);
    
    const audioCard = await page.locator('text=Audio Analysis').count() > 0;
    if (audioCard) console.log("✅ Audio Analysis card appeared");
    else { 
      console.error("❌ Audio Analysis card did not appear"); 
      await page.screenshot({ path: 'test3_fail.png' });
      hasErrors = true; 
    }

    if (hasErrors) { console.error("\n❌ Tests failed!"); process.exit(1); }
    else console.log("\n✅ MULTIMODAL AI WORKFLOW VERIFIED SUCCESSFULLY. No errors found!");

  } catch (err) {
    console.error('Script error:', err);
    process.exit(1);
  } finally {
    fs.unlinkSync(dummyImg);
    fs.unlinkSync(dummyAudio);
    await browser.close();
  }
})();
