import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Common CSS color patterns
const COLOR_PATTERNS = {
  hex: /#([a-fA-F0-9]{3,4}|[a-fA-F0-9]{6}|[a-fA-F0-9]{8})\b/g,
  rgba: /(rgba?|hsla?)\([^)]+\)/g,
  cssVar: /var\(--[^)]+\)/g,
};

function getAllFiles(dirPath, arrayOfFiles = []) {
  const files = fs.readdirSync(dirPath);

  files.forEach((file) => {
    const filePath = path.join(dirPath, file);
    if (fs.statSync(filePath).isDirectory()) {
      // Expanded exclusion list to avoid build artifacts, platform folders, and dependencies
      if (!['node_modules', '.git', 'dist', 'build', '.agent', 'android', 'ios', 'public', '.next', '.vercel'].includes(file)) {
        arrayOfFiles = getAllFiles(filePath, arrayOfFiles);
      }
    } else {
      if (/\.(css|ts|tsx)$/.test(file)) {
        arrayOfFiles.push(filePath);
      }
    }
  });

  return arrayOfFiles;
}

function findColorsInFile(filePath) {
  const content = fs.readFileSync(filePath, 'utf-8');
  const foundColors = new Set();

  for (const [type, pattern] of Object.entries(COLOR_PATTERNS)) {
    const matches = content.match(pattern);
    if (matches) {
      matches.forEach(color => {
        // Basic filter to avoid very short strings that might be false positives
        if (color.length > 2) foundColors.add(color);
      });
    }
  }

  return Array.from(foundColors);
}

function main() {
  const projectRoot = path.join(__dirname, '..');
  const srcDir = path.join(projectRoot, 'src');
  
  console.log('🎨 Scanning for colors strictly in src/ directory (.ts, .tsx, .css)...');
  
  if (!fs.existsSync(srcDir)) {
    console.error('Error: src/ directory not found at ' + srcDir);
    process.exit(1);
  }
  
  const files = getAllFiles(srcDir);
  const colorReport = [];
  const allColorsUnique = new Set();

  files.forEach(file => {
    const colors = findColorsInFile(file);
    if (colors.length > 0) {
      const relativePath = path.relative(projectRoot, file);
      colorReport.push({ file: relativePath, colors: colors.sort() });
      colors.forEach(c => allColorsUnique.add(c));
    }
  });

  if (colorReport.length === 0) {
    console.log('No colors found.');
    return;
  }

  // Generate the JSON data
  const outputData = {
    summary: {
      totalFilesScanned: files.length,
      filesWithColors: colorReport.length,
      uniqueColorsFound: allColorsUnique.size,
      allUniqueColors: Array.from(allColorsUnique).sort()
    },
    report: colorReport
  };

  const outputPath = path.join(projectRoot, 'colors-report.json');
  fs.writeFileSync(outputPath, JSON.stringify(outputData, null, 2), 'utf-8');

  console.log('\n' + '='.repeat(60));
  console.log(`✅ Success! Color report written to: colors-report.json`);
  console.log(`📊 SUMMARY:`);
  console.log(`   Files scanned: ${files.length}`);
  console.log(`   Files with colors: ${colorReport.length}`);
  console.log(`   Unique colors/vars found: ${allColorsUnique.size}`);
  console.log('='.repeat(60) + '\n');
}

main();
