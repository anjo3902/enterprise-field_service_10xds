const fs = require("fs");
const path = require("path");

const vendorDir = path.join(__dirname, "src/app/components/vendor");
const navDir = path.join(__dirname, "src/app/components/navigation");
const homeFile = path.join(__dirname, "src/app/components/HomeDashboard.tsx");

function extractFonts(file) {
  const content = fs.readFileSync(file, "utf8");
  const regex = /style={{([^}]+)}}/g;
  let match;
  const fonts = new Set();
  while ((match = regex.exec(content)) !== null) {
    const style = match[1];
    const sizeMatch = style.match(/fontSize:\s*["']([^"']+)["']/);
    if (sizeMatch) {
      const size = sizeMatch[1];
      const weightMatch = style.match(/fontWeight:\s*(\d+)/);
      const weight = weightMatch ? weightMatch[1] : "400";
      const letterSpacingMatch = style.match(/letterSpacing:\s*["']([^"']+)["']/);
      const ls = letterSpacingMatch ? letterSpacingMatch[1] : "normal";
      const lhMatch = style.match(/lineHeight:\s*([\d\.]+)/);
      const lh = lhMatch ? lhMatch[1] : "normal";
      
      fonts.add(`${size.padStart(6, ' ')} | w:${weight.padStart(3, ' ')} | ls:${ls.padStart(8, ' ')} | lh:${lh}`);
    }
  }
  return Array.from(fonts);
}

console.log("=== HomeDashboard ===");
const homeFonts = extractFonts(homeFile);
homeFonts.sort().forEach(f => console.log(f));

const vendorFiles = [...fs.readdirSync(vendorDir).map(f => path.join(vendorDir, f)), ...fs.readdirSync(navDir).map(f => path.join(navDir, f))].filter(f => f.endsWith(".tsx"));
let vendorFonts = new Set();
for (const f of vendorFiles) {
  extractFonts(f).forEach(font => vendorFonts.add(font));
}
console.log("\n=== Vendor ===");
Array.from(vendorFonts).sort().forEach(f => console.log(f));
