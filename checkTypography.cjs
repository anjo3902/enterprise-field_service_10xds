
const fs = require("fs");
const path = require("path");

const vendorDir = path.join(__dirname, "src/app/components/vendor");
const navDir = path.join(__dirname, "src/app/components/navigation");

const files = [...fs.readdirSync(vendorDir).map(f => path.join(vendorDir, f)), ...fs.readdirSync(navDir).map(f => path.join(navDir, f))].filter(f => f.endsWith(".tsx"));

const results = [];

for (const file of files) {
  const content = fs.readFileSync(file, "utf8");
  const filename = path.basename(file);
  
  // Search for inline styles
  const regex = /style={{([^}]+)}}/g;
  let match;
  while ((match = regex.exec(content)) !== null) {
    const style = match[1];
    
    // Check H1 equivalents (fontSize 20px)
    if (style.includes("fontSize: \"20px\"") || style.includes("fontSize:\"20px\"")) {
      if (!style.includes("-0.03em") || !style.includes("1.15")) {
        results.push(`Mismatch in ${filename}: H1 (20px) lacks -0.03em or 1.15 line height. -> ${style}`);
      }
    }
    
    // Check Section Headers (fontSize 15.5px)
    if (style.includes("fontSize: \"15.5px\"") || style.includes("fontSize:\"15.5px\"")) {
      if (!style.includes("-0.02em") || !style.includes("800")) {
        results.push(`Mismatch in ${filename}: H2 (15.5px) lacks -0.02em or 800 weight. -> ${style}`);
      }
    }
    
    // Check KPI Values (fontSize 23px)
    if (style.includes("fontSize: \"23px\"") || style.includes("fontSize:\"23px\"")) {
      if (!style.includes("-0.04em") || !style.includes("1.05") || !style.includes("800")) {
        results.push(`Mismatch in ${filename}: KPI (23px) lacks -0.04em or 1.05 or 800 weight. -> ${style}`);
      }
    }
    
    // Check KPI Labels (fontSize 10.5px)
    if (style.includes("fontSize: \"10.5px\"") || style.includes("fontSize:\"10.5px\"")) {
      if (!style.includes("500") && !style.includes("fontWeight:500") && !style.includes("fontWeight: 500")) {
        results.push(`Mismatch in ${filename}: KPI Label (10.5px) might lack 500 weight. -> ${style}`);
      }
    }
  }
}

console.log(results.join("\n"));

