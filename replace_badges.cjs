const fs = require('fs');
const path = require('path');

const directoryPath = path.join(__dirname, 'src/app/pages/admin');

function injectImports(filePath, componentName) {
  let content = fs.readFileSync(filePath, 'utf8');
  if (content.includes(`<${componentName}`) && !content.includes(`import { ${componentName} }`)) {
    const importStatement = `import { ${componentName} } from "../../components/admin/shared/${componentName}";\n`;
    
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
  }
}

function processBadge(content) {
  // Regex to match a div or span that looks like a status badge and extracts the text/variable inside it.
  // This is highly heuristic, but most badges use borderRadius: "12px" or padding: "4px 8px" or "2px 6px" and some background color.
  
  // Example: <div style={{ fontSize: "11px", fontWeight: 600, padding: "4px 8px", borderRadius: "12px", backgroundColor: getStatusColor(org.status) + "15", color: getStatusColor(org.status) }}>{org.status}</div>
  
  const badgeRegex = /<(div|span)\s+style=\{\{\s*fontSize:\s*['"]11px['"]\s*,\s*fontWeight:\s*(600|700)\s*,\s*padding:\s*['"](4px 8px|2px 6px)['"]\s*,\s*borderRadius:\s*['"](8px|12px)['"][^>]*\}\}>\s*\{?([^}<]+)\}?\s*<\/\1>/g;
  
  return content.replace(badgeRegex, (match, tag, weight, padding, radius, innerContent) => {
    // innerContent could be something like `org.status` or a literal string `"Active"`
    return `<AdminBadge status={${innerContent}} />`;
  });
}

function refactorFile(filePath) {
  let content = fs.readFileSync(filePath, 'utf8');
  
  const original = content;
  content = processBadge(content);
  
  if (content !== original) {
    fs.writeFileSync(filePath, content, 'utf8');
    injectImports(filePath, 'AdminBadge');
    console.log(`Replaced Badges in: ${path.basename(filePath)}`);
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
console.log('Done replacing Badges.');
