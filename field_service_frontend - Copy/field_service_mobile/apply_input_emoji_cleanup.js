const fs = require('fs');
const path = require('path');

const file = path.join(__dirname, 'src', 'screens', 'customer', 'NewRequestScreen.tsx');
let content = fs.readFileSync(file, 'utf8');

// Replace new request screen inline style
content = content.replace(
  /input:\s*\{\s*borderWidth:\s*1,\s*borderColor:\s*'#d1d5db',\s*borderRadius:\s*8,\s*paddingHorizontal:\s*16,\s*paddingVertical:\s*12,\s*backgroundColor:\s*colors\.card,\s*fontSize:\s*16,\s*color:\s*colors\.primary\.DEFAULT\s*\}/g,
  `input: { borderWidth: 1, borderColor: colors.border, borderRadius: 8, paddingHorizontal: 16, paddingVertical: 12, backgroundColor: colors.surface, fontSize: 16, color: colors.textPrimary }`
);

content = content.replace(/placeholderTextColor="#94a3b8"/g, 'placeholderTextColor={colors.textSecondary}');
content = content.replace(/placeholderTextColor="#9ca3af"/g, 'placeholderTextColor={colors.textSecondary}');
content = content.replace(/placeholderTextColor=\{colors\.secondary\.light\}/g, 'placeholderTextColor={colors.textSecondary}');

fs.writeFileSync(file, content, 'utf8');

// ReportWorkflowScreen text colors might be light if we missed them
const report = path.join(__dirname, 'src', 'screens', 'technician', 'ReportWorkflowScreen.tsx');
let rContent = fs.readFileSync(report, 'utf8');
rContent = rContent.replace(/color:\s*'#f8fafc'/g, 'color: colors.textPrimary');
rContent = rContent.replace(/color:\s*'#cbd5e1'/g, 'color: colors.textSecondary');
rContent = rContent.replace(/color:\s*'#94a3b8'/g, 'color: colors.textSecondary');
fs.writeFileSync(report, rContent, 'utf8');

console.log("Cleanup script done.");
