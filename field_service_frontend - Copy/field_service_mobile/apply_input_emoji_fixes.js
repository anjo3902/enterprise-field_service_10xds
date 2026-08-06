const fs = require('fs');
const path = require('path');

const srcDir = path.join(__dirname, 'src');

// 1. Update colors.ts
const colorsPath = path.join(srcDir, 'theme', 'colors.ts');
let colorsContent = fs.readFileSync(colorsPath, 'utf8');
if (!colorsContent.includes('textPrimary')) {
  colorsContent = colorsContent.replace(
    /export const colors = \{/,
    `export const colors = {
  textPrimary: '#111827',
  textSecondary: '#6b7280',
  surface: '#ffffff',`
  );
  fs.writeFileSync(colorsPath, colorsContent, 'utf8');
}

// 2. Replace emojis and TextInput styles
const replacements = [
  // Emojis
  { search: /<Text style=\{styles.brand\}>⚡<\/Text>/g, replace: `<View style={{ marginBottom: 8 }}><Zap size={48} color={colors.primary.DEFAULT} /></View>` },
  { search: /\{improving \? 'Improving...' : '✨ AI Improve'\}/g, replace: `{improving ? 'Improving...' : <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}><Sparkles size={14} color="#8b5cf6" /><Text style={styles.aiBtnText}>AI Improve</Text></View>}` },
  { search: /<Text style=\{styles.navBtnIcon\}>🗺️<\/Text>/g, replace: `<Map size={18} color={hasGoogleMapsUrl ? colors.primary.DEFAULT : colors.secondary.light} />` },
  { search: /📍🔁 Route plan updates from assigned jobs and technician/g, replace: `<View style={{ flexDirection: 'row', alignItems: 'center' }}><MapPin size={14} color={colors.secondary.DEFAULT} /><RefreshCw size={14} color={colors.secondary.DEFAULT} style={{ marginLeft: 2, marginRight: 6 }} /><Text style={styles.routeInfoText}>Route plan updates from assigned jobs and technician</Text></View>` },
  { search: /<Text style=\{styles.originIcon\}>📍<\/Text>/g, replace: `<MapPin size={16} color="#15803d" />` },

  // TextInput placeholderTextColor
  { search: /placeholderTextColor="#94a3b8"/g, replace: `placeholderTextColor={colors.textSecondary}` },
  { search: /placeholderTextColor="#9ca3af"/g, replace: `placeholderTextColor={colors.textSecondary}` },
  { search: /placeholderTextColor=\{colors\.secondary\.light\}/g, replace: `placeholderTextColor={colors.textSecondary}` },

  // TextInput Styles (various regexes to catch common patterns)
  // Catch colors.background or colors.card
  { search: /backgroundColor:\s*(colors\.background|colors\.card|'#0f172a'|'#1e293b'),\s*\n\s*borderWidth:\s*1,\s*\n\s*borderColor:\s*(colors\.border|'#334155'|'#d1d5db'),/g, replace: `backgroundColor: colors.surface,\n    borderWidth: 1,\n    borderColor: colors.border,` },
  // Catch text color #f8fafc or colors.primary.DEFAULT inside inputs
  { search: /color:\s*'#f8fafc'/g, replace: `color: colors.textPrimary` },
  { search: /color:\s*colors\.primary\.DEFAULT(,\s*\n\s*fontSize:\s*16)/g, replace: `color: colors.textPrimary$1` }, // specifically for NewRequestScreen.tsx
];

function processFile(filePath) {
  let content = fs.readFileSync(filePath, 'utf8');
  const originalContent = content;

  for (const { search, replace } of replacements) {
    if (content.match(search)) {
      content = content.replace(search, replace);
    }
  }

  // Ensure missing imports for emojis
  if (originalContent !== content) {
    if (filePath.includes('LoginScreen') || filePath.includes('SignupScreen')) {
      if (!content.includes('import { Zap }')) {
        content = content.replace(/import \{.*?\} from 'react-native';/, (match) => match + "\nimport { Zap } from 'lucide-react-native';");
      }
    }
    if (filePath.includes('ReportWorkflowScreen')) {
      if (!content.includes('Sparkles')) {
        content = content.replace(/import \{.*\} from 'lucide-react-native';/, (match) => match.replace('}', ', Sparkles }'));
      }
    }
    if (filePath.includes('RouteMapScreen')) {
      if (!content.includes('RefreshCw')) {
        content = content.replace(/import \{.*\} from 'lucide-react-native';/, (match) => match.replace('}', ', RefreshCw, Map }'));
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
