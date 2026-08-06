const fs = require('fs');
const path = require('path');
const dir = path.join('src', 'app', 'components', 'vendor');
const files = fs.readdirSync(dir).filter(f => f.endsWith('.tsx'));

for (const file of files) {
  if (file === 'VendorBottomNavigation.tsx') continue;
  const filePath = path.join(dir, file);
  let content = fs.readFileSync(filePath, 'utf8');
  
  if (content.includes('<MobileLayout')) {
    let changed = false;
    
    // Add import if missing
    if (!content.includes('VendorBottomNavigation')) {
      const importMatches = [...content.matchAll(/^import.*from.*;/gm)];
      if (importMatches.length > 0) {
        const lastImport = importMatches[importMatches.length - 1];
        const insertPos = lastImport.index + lastImport[0].length;
        content = content.slice(0, insertPos) + '\nimport { VendorBottomNavigation } from "./VendorBottomNavigation";' + content.slice(insertPos);
        changed = true;
      }
    }
    
    // Add bottomNav prop to MobileLayout if missing
    const regex = /<MobileLayout([^>]*)>/g;
    content = content.replace(regex, (match, p1) => {
      // Sometimes it spans multiple lines. If p1 is not containing bottomNav, add it.
      if (!p1.includes('bottomNav')) {
        changed = true;
        return `<MobileLayout${p1} bottomNav={<VendorBottomNavigation />}>`;
      }
      return match;
    });

    if (changed) {
      fs.writeFileSync(filePath, content);
      console.log('Updated ' + file);
    }
  }
}
