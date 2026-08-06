const fs = require('fs');
const path = require('path');

const directoryPath = path.join(__dirname, 'src/app/pages/admin');

function refactorFile(filePath) {
  let content = fs.readFileSync(filePath, 'utf8');
  const tokensRegex = /\s*(?:\/\/ Design Tokens\s*)?const tokens = \{[\s\S]*?\};\n/g;

  if (tokensRegex.test(content)) {
    // Remove the tokens declaration
    content = content.replace(tokensRegex, '\n');

    // Add import statement
    const importStatement = `import { adminTokens as tokens } from "../../../theme/adminTokens";\n`;
    
    // Find the last import statement
    const importsRegex = /import\s+.*?\s+from\s+['"].*?['"];?\n/g;
    let match;
    let lastIndex = 0;
    while ((match = importsRegex.exec(content)) !== null) {
      lastIndex = match.index + match[0].length;
    }

    if (lastIndex > 0) {
      content = content.slice(0, lastIndex) + importStatement + content.slice(lastIndex);
    } else {
      content = importStatement + content;
    }

    fs.writeFileSync(filePath, content, 'utf8');
    console.log(`Refactored tokens in: ${path.basename(filePath)}`);
  }
}

function walkDir(dir) {
  const files = fs.readdirSync(dir);
  for (const file of files) {
    const filePath = path.join(dir, file);
    if (fs.statSync(filePath).isDirectory()) {
      walkDir(filePath);
    } else if (file.endsWith('.tsx')) {
      refactorFile(filePath);
    }
  }
}

walkDir(directoryPath);
console.log('Done refactoring tokens.');
