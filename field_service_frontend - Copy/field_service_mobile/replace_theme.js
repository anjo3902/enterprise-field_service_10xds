const fs = require('fs');
const path = require('path');

const srcDir = path.join(__dirname, 'src');

const colorMap = {
  '#1f2937': 'colors.primary.DEFAULT',
  '#111827': 'colors.primary.dark',
  '#6b7280': 'colors.secondary.DEFAULT',
  '#9ca3af': 'colors.secondary.light',
  '#f97316': 'colors.accent.DEFAULT',
  '#fb923c': 'colors.accent.light',
  '#ea580c': 'colors.accent.dark',
  '#f5f5f5': 'colors.background',
  '#ffffff': 'colors.card',
  '#e5e7eb': 'colors.border',
  '#ef4444': 'colors.danger',
  '#10b981': 'colors.success',
  '#f59e0b': 'colors.warning',
  '#3b82f6': 'colors.info',
};

function processFile(filePath) {
  let content = fs.readFileSync(filePath, 'utf8');
  let originalContent = content;

  let hasColorReplaced = false;

  for (const [hex, themeRef] of Object.entries(colorMap)) {
    const regex = new RegExp(`'${hex}'|"${hex}"`, 'gi');
    if (regex.test(content)) {
      hasColorReplaced = true;
      content = content.replace(regex, themeRef);
    }
  }

  if (hasColorReplaced && !content.includes("import { colors }")) {
    // Add import statement after the last import
    const importMatch = [...content.matchAll(/^import .*;$/gm)];
    let insertIndex = 0;
    if (importMatch.length > 0) {
      const lastImport = importMatch[importMatch.length - 1];
      insertIndex = lastImport.index + lastImport[0].length;
    } else {
      // maybe imports are multi-line
      const match = content.match(/from '[a-zA-Z0-9_\-\.\/]+';/);
      if (match) {
        insertIndex = match.index + match[0].length;
      }
    }
    
    // figure out path to colors
    // if file is src/screens/customer/CustomerDashboardScreen.tsx
    // path from src is 3 levels deep
    const relativeToSrc = path.relative(srcDir, filePath);
    const depth = relativeToSrc.split(path.sep).length - 1;
    const prefix = depth === 0 ? './' : '../'.repeat(depth);
    const importStr = `\nimport { colors } from '${prefix}theme/colors';`;
    
    // Some imports have multi-line block `from 'react-native';`. We can just inject at the top after block comments
    const firstImportIndex = content.indexOf('import ');
    if (firstImportIndex !== -1) {
      content = content.slice(0, firstImportIndex) + importStr.trim() + '\n' + content.slice(firstImportIndex);
    }
  }

  if (content !== originalContent) {
    fs.writeFileSync(filePath, content, 'utf8');
    console.log(`Updated colors in ${filePath}`);
  }
}

function walk(dir) {
  const files = fs.readdirSync(dir);
  for (const file of files) {
    const fullPath = path.join(dir, file);
    if (fs.statSync(fullPath).isDirectory()) {
      walk(fullPath);
    } else if (fullPath.endsWith('.tsx') || fullPath.endsWith('.ts')) {
      processFile(fullPath);
    }
  }
}

walk(srcDir);
