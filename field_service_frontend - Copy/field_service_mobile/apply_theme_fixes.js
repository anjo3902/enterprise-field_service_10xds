const fs = require('fs');
const path = require('path');

const srcDir = path.join(__dirname, 'src');

const replacements = [
  // Backgrounds
  { search: /backgroundColor:\s*'#0f172a'/g, replace: 'backgroundColor: colors.background' },
  { search: /backgroundColor:\s*'#1e293b'/g, replace: 'backgroundColor: colors.card' },
  { search: /backgroundColor:\s*'#4f46e5'/g, replace: 'backgroundColor: colors.primary.DEFAULT' },
  { search: /backgroundColor:\s*'#6366f1'/g, replace: 'backgroundColor: colors.primary.DEFAULT' },

  // Text/Icon colors
  { search: /color:\s*'#0f172a'/g, replace: 'color: colors.primary.DEFAULT' },
  { search: /color:\s*'#4f46e5'/g, replace: 'color: colors.primary.DEFAULT' },
  { search: /color:\s*'#6366f1'/g, replace: 'color: colors.primary.DEFAULT' },
  { search: /color:\s*'#818cf8'/g, replace: 'color: colors.primary.DEFAULT' },
  { search: /color:\s*'#4338ca'/g, replace: 'color: colors.primary.DEFAULT' },

  // JSX Props
  { search: /color="#4f46e5"/g, replace: 'color={colors.primary.DEFAULT}' },
  { search: /tintColor="#4f46e5"/g, replace: 'tintColor={colors.primary.DEFAULT}' },

  // Borders & Shadows
  { search: /borderColor:\s*'#4f46e5'/g, replace: 'borderColor: colors.primary.DEFAULT' },
  { search: /borderColor:\s*'#6366f1'/g, replace: 'borderColor: colors.primary.DEFAULT' },
  { search: /borderColor:\s*'#818cf8'/g, replace: 'borderColor: colors.border' },
  { search: /shadowColor:\s*'#6366f1'/g, replace: 'shadowColor: colors.primary.DEFAULT' },
];

function processFile(filePath) {
  let content = fs.readFileSync(filePath, 'utf8');
  let originalContent = content;
  let modified = false;

  for (const { search, replace } of replacements) {
    if (search.test(content)) {
      content = content.replace(search, replace);
      modified = true;
    }
  }

  // Ensure colors import exists if we added colors references
  if (modified) {
    if (!content.includes('import { colors }')) {
      // Find the last import
      const importMatches = [...content.matchAll(/^import\s+.*?;/gm)];
      if (importMatches.length > 0) {
        const lastMatch = importMatches[importMatches.length - 1];
        const insertPos = lastMatch.index + lastMatch[0].length;
        
        // Figure out relative path to theme
        const depth = filePath.split(path.sep).length - srcDir.split(path.sep).length;
        let prefix = '';
        if (depth === 1) prefix = './';
        else if (depth === 2) prefix = '../';
        else if (depth === 3) prefix = '../../';
        else if (depth === 4) prefix = '../../../';
        
        content = content.slice(0, insertPos) + `\nimport { colors } from '${prefix}theme/colors';` + content.slice(insertPos);
      } else {
        content = `import { colors } from '../../theme/colors';\n` + content;
      }
    }
    fs.writeFileSync(filePath, content, 'utf8');
    console.log(`Updated ${filePath}`);
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
