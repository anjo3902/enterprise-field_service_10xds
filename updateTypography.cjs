const fs = require("fs");
const path = require("path");

const vendorDir = path.join(__dirname, "src/app/components/vendor");
const navDir = path.join(__dirname, "src/app/components/navigation");

const files = [...fs.readdirSync(vendorDir).map(f => path.join(vendorDir, f)), ...fs.readdirSync(navDir).map(f => path.join(navDir, f))].filter(f => f.endsWith(".tsx"));

let updatedFilesCount = 0;

for (const file of files) {
  let content = fs.readFileSync(file, "utf8");
  let originalContent = content;

  // Fix 20px H1 styles
  // We want to match: fontSize: "20px" and inject/replace letterSpacing and lineHeight
  content = content.replace(/fontSize:\s*["']20px["']/g, 'fontSize: "20px", fontWeight: 800, letterSpacing: "-0.03em", lineHeight: 1.15');
  
  // Clean up duplicate or old properties that were replaced/appended to:
  // Since we blindly inject, let's clean up existing fontWeigh/letterSpacing/lineHeight in the same object.
  // Actually, a better approach is to match the entire style object for 20px and replace its parts.
  
  content = content.replace(/style={{([^}]+)}}/g, (match, styleObj) => {
    if (styleObj.includes('fontSize: "20px"') || styleObj.includes("fontSize:\"20px\"")) {
      // Rebuild the style for 20px
      let newStyle = styleObj
        .replace(/fontWeight:\s*[\d]+,?\s*/g, '')
        .replace(/letterSpacing:\s*["'][^"']+["'],?\s*/g, '')
        .replace(/lineHeight:\s*[\d\.]+,?\s*/g, '')
        .replace(/fontFamily:\s*inter,?\s*/g, '')
        .replace(/fontSize:\s*["']20px["']\s*,?\s*/g, '');
      
      return `style={{ fontSize: "20px", fontWeight: 800, letterSpacing: "-0.03em", lineHeight: 1.15, fontFamily: inter, ${newStyle.trim().replace(/^,\s*/, '')} }}`.replace(/,\s*}/, ' }');
    }
    
    if (styleObj.includes('fontSize: "24px"') || styleObj.includes("fontSize:\"24px\"")) {
      // Rebuild the style for 24px -> 23px
      let newStyle = styleObj
        .replace(/fontWeight:\s*[\d]+,?\s*/g, '')
        .replace(/letterSpacing:\s*["'][^"']+["'],?\s*/g, '')
        .replace(/lineHeight:\s*[\d\.]+,?\s*/g, '')
        .replace(/fontFamily:\s*inter,?\s*/g, '')
        .replace(/fontSize:\s*["']24px["']\s*,?\s*/g, '');
      
      return `style={{ fontSize: "23px", fontWeight: 800, letterSpacing: "-0.04em", lineHeight: 1.05, fontFamily: inter, ${newStyle.trim().replace(/^,\s*/, '')} }}`.replace(/,\s*}/, ' }');
    }
    
    if (styleObj.includes('fontSize: "28px"') || styleObj.includes("fontSize:\"28px\"")) {
      // Rebuild the style for 28px
      let newStyle = styleObj
        .replace(/fontWeight:\s*[\d]+,?\s*/g, '')
        .replace(/letterSpacing:\s*["'][^"']+["'],?\s*/g, '')
        .replace(/lineHeight:\s*[\d\.]+,?\s*/g, '')
        .replace(/fontFamily:\s*inter,?\s*/g, '')
        .replace(/fontSize:\s*["']28px["']\s*,?\s*/g, '');
      
      return `style={{ fontSize: "28px", fontWeight: 800, letterSpacing: "-0.05em", lineHeight: 1, fontFamily: inter, ${newStyle.trim().replace(/^,\s*/, '')} }}`.replace(/,\s*}/, ' }');
    }

    return match;
  });

  if (content !== originalContent) {
    fs.writeFileSync(file, content, "utf8");
    updatedFilesCount++;
    console.log(`Updated typography in ${path.basename(file)}`);
  }
}

console.log(`Total files updated: ${updatedFilesCount}`);
