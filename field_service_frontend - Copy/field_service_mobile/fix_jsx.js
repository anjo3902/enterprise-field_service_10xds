const fs = require('fs');
const path = require('path');

const srcDir = path.join(__dirname, 'src');

function fixJsxColors(filePath) {
  let content = fs.readFileSync(filePath, 'utf8');
  const originalContent = content;

  // We are looking for things like:
  // placeholderTextColor=colors.secondary.light
  // color=colors.accent.DEFAULT
  // And we want to replace them with:
  // placeholderTextColor={colors.secondary.light}
  // color={colors.accent.DEFAULT}
  
  // This regex looks for `prop=colors.foo.bar` 
  const regex = /([a-zA-Z0-9_]+)=(colors\.[a-zA-Z0-9_\.]+)/g;
  content = content.replace(regex, '$1={$2}');

  if (content !== originalContent) {
    fs.writeFileSync(filePath, content, 'utf8');
    console.log(`Fixed JSX color syntax in ${filePath}`);
  }
}

function walk(dir) {
  const files = fs.readdirSync(dir);
  for (const file of files) {
    const fullPath = path.join(dir, file);
    if (fs.statSync(fullPath).isDirectory()) {
      walk(fullPath);
    } else if (fullPath.endsWith('.tsx') || fullPath.endsWith('.ts')) {
      fixJsxColors(fullPath);
    }
  }
}

walk(srcDir);
