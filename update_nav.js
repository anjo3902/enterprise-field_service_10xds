const fs = require('fs');
const path = require('path');

const files = [
  "HomeDashboard.tsx",
  "MyTickets.tsx",
  "SLATrackerScreen.tsx",
  "RevenueIntelligenceScreen.tsx",
  "ReportsScreen.tsx",
  "MachineHealthDashboard.tsx",
  "HealthScoreVisualization.tsx",
  "AssetSearch.tsx",
  "AssetListing.tsx",
  "AssetHistory.tsx",
  "AssetFilters.tsx",
  "AssetDetails.tsx",
  "AssetDashboard.tsx",
  "AnalyticsScreen.tsx"
];

const dir = path.join(__dirname, 'src', 'app', 'components');

for (const file of files) {
  const filePath = path.join(dir, file);
  if (!fs.existsSync(filePath)) continue;

  let content = fs.readFileSync(filePath, 'utf-8');

  // Add import if not present
  if (!content.includes('BottomNavigation')) {
    content = 'import { BottomNavigation } from "./ui/BottomNavigation";\n' + content;
  }

  // Find where the main export starts
  const mainExportMatch = content.match(/export (?:default )?function \w+\(/);
  if (!mainExportMatch) continue;
  
  const mainExportIndex = mainExportMatch.index;

  // We want to delete the BottomNav definition.
  // In most files, there's a comment `// ─── Bottom navigation`
  const bottomNavCommentIndex = content.lastIndexOf('// ─── Bottom nav', mainExportIndex);
  
  if (bottomNavCommentIndex !== -1) {
    // Delete from the comment up to the main export
    const toDelete = content.substring(bottomNavCommentIndex, mainExportIndex);
    content = content.replace(toDelete, '');
  } else {
    // If no comment, just delete function BottomNav() { ... }
    const bottomNavFuncIndex = content.lastIndexOf('function BottomNav', mainExportIndex);
    if (bottomNavFuncIndex !== -1) {
      const toDelete = content.substring(bottomNavFuncIndex, mainExportIndex);
      content = content.replace(toDelete, '');
    }
  }

  // Also remove MoreDrawer, MORE_ITEMS, NAV_ITEMS if they are defined before the comment
  // For HomeDashboard and MyTickets
  const moreItemsIndex = content.lastIndexOf('const MORE_ITEMS');
  if (moreItemsIndex !== -1 && moreItemsIndex < mainExportIndex) {
    // We'll just remove everything from MORE_ITEMS to the main export
    const toDelete = content.substring(moreItemsIndex, mainExportIndex);
    content = content.replace(toDelete, '');
  }

  const moreDrawerIndex = content.lastIndexOf('function MoreDrawer');
  if (moreDrawerIndex !== -1 && moreDrawerIndex < mainExportIndex) {
    const toDelete = content.substring(moreDrawerIndex, mainExportIndex);
    content = content.replace(toDelete, '');
  }

  // Replace usage
  content = content.replace(/<BottomNav \/>/g, '<BottomNavigation />');
  
  // HomeDashboard uses active prop? Wait, no, it didn't pass props.
  
  fs.writeFileSync(filePath, content, 'utf-8');
  console.log(`Updated ${file}`);
}
