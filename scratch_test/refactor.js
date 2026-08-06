const fs = require('fs');
const path = require('path');
const filePath = path.join(__dirname, '../src/app/components/RaiseTicketScreen.tsx');
let content = fs.readFileSync(filePath, 'utf8');

content = content.replace(
  'import { BottomNavigation } from "./ui/BottomNavigation";',
  'import { BottomNavigation } from "./ui/BottomNavigation";\nimport { AIAnalysisRequest, AIAnalysisResponse, runAIAnalysis, DEFAULT_AI_RESPONSE } from "../services/aiService";'
);

const lines = content.split('\n');
const start = lines.findIndex(l => l.includes('// ─── AI Mock Engine'));
let end = -1;
if (start !== -1) {
  for (let i = start; i < lines.length; i++) {
    if (lines[i] === '}' && lines[i-1] && lines[i-2] && lines[i-2].includes('return baseSuggestion;')) {
      end = i;
      break;
    }
    if (lines[i] === '}' && lines[i-1].trim() === 'return baseSuggestion;') {
        end = i;
        break;
    }
  }
  
  if (end !== -1) {
    lines.splice(start, end - start + 1);
    content = lines.join('\n');
    console.log('Removed mock engine block.');
  }
}

content = content.replace(/AISuggestion/g, 'AIAnalysisResponse');
content = content.replace(/detectedEquipment/g, 'equipment');
content = content.replace(/AI_TEXT_MAP\.default/g, 'DEFAULT_AI_RESPONSE');
content = content.replace(/s\.asset/g, 's.suggestedAsset');
content = content.replace(/s\.title/g, 's.suggestedTitle');
content = content.replace(/s\.category/g, 's.suggestedCategory');

const handleAnalyzeOld = `    setTimeout(() => {
      setAiSuggestion(analyzeMultimodal(description, !!imageFile, !!audioFile));
      setAiAnalyzing(false);
    }, cursor + 100);`;
const handleAnalyzeNew = `    setTimeout(async () => {
      const res = await runAIAnalysis({ description, hasImage: !!imageFile, hasAudio: !!audioFile });
      setAiSuggestion(res);
      setAiAnalyzing(false);
    }, cursor + 100);`;

if (content.includes(handleAnalyzeOld)) {
    content = content.replace(handleAnalyzeOld, handleAnalyzeNew);
    console.log('Replaced handleAnalyze');
} else {
    console.error('Could not find handleAnalyze to replace');
}

fs.writeFileSync(filePath, content);
console.log('Done');
