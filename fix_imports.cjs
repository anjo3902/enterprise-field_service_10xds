const fs = require('fs');
const path = require('path');

const directoryPath = path.join(__dirname, 'src/app/pages/admin');

function fixImports(dir) {
  const files = fs.readdirSync(dir);
  for (const file of files) {
    const filePath = path.join(dir, file);
    if (fs.statSync(filePath).isDirectory()) {
      fixImports(filePath);
    } else if (file.endsWith('.tsx')) {
      let content = fs.readFileSync(filePath, 'utf8');
      if (content.includes('../../../theme/adminTokens')) {
        content = content.replace(/\.\.\/\.\.\/\.\.\/theme\/adminTokens/g, '../../theme/adminTokens');
        fs.writeFileSync(filePath, content, 'utf8');
        console.log(`Fixed imports in: ${file}`);
      }
    }
  }
}

fixImports(directoryPath);
console.log('Done fixing imports.');
