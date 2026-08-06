const fs = require('fs');
const path = require('path');

const screensDir = path.join(__dirname, 'src', 'screens');

function fixAuth(file) {
  const p = path.join(screensDir, 'auth', file);
  let content = fs.readFileSync(p, 'utf8');
  if (!content.includes('lucide-react-native')) {
    content = content.replace(/(import .* from 'react-native';)/, `$1\nimport { Zap } from 'lucide-react-native';`);
    fs.writeFileSync(p, content, 'utf8');
  }
}

fixAuth('LoginScreen.tsx');
fixAuth('SignupScreen.tsx');

const report = path.join(screensDir, 'technician', 'ReportWorkflowScreen.tsx');
let rContent = fs.readFileSync(report, 'utf8');
if (!rContent.includes('Sparkles')) {
  rContent = rContent.replace(/import \{.*?\} from 'lucide-react-native';/, "import { Camera, CheckCircle2, ChevronRight, FileText, Image as ImageIcon, Sparkles, Trash2, X } from 'lucide-react-native';");
  fs.writeFileSync(report, rContent, 'utf8');
}

const mapSc = path.join(screensDir, 'technician', 'RouteMapScreen.tsx');
let mContent = fs.readFileSync(mapSc, 'utf8');
mContent = mContent.replace(/hasGoogleMapsUrl/g, 'googleMapsUrl');
mContent = mContent.replace(/<Map /g, '<MapIcon ');
mContent = mContent.replace(/import \{ MapPin, AlertTriangle, Compass, Radio, ClipboardList \} from 'lucide-react-native';/, "import { MapPin, AlertTriangle, Compass, Radio, ClipboardList, Map as MapIcon, RefreshCw } from 'lucide-react-native';");
fs.writeFileSync(mapSc, mContent, 'utf8');

console.log("Fixes applied");
