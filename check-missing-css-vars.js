import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Configuration
const APP_CSS_PATH = path.join(__dirname, 'src', 'shared', 'App.css');
const OUTPUT_PATH = path.join(__dirname, 'missing-css-vars-report.txt');
const IGNORE_DIRS = ['node_modules', '.git', 'build', 'dist', 'coverage', '.next', 'android', 'ios'];
const FILE_EXTENSIONS = ['.css', '.scss', '.less', '.tsx', '.jsx', '.ts', '.js', '.module.css'];

// Extract defined variables from App.css
function getDefinedVars() {
  const content = fs.readFileSync(APP_CSS_PATH, 'utf8');
  const varRegex = /--([a-zA-Z0-9-_]+)\s*:/g;
  const definedVars = new Set();
  let match;
  while ((match = varRegex.exec(content)) !== null) {
    definedVars.add(match[1]);
  }
  return definedVars;
}

// Recursively walk directories
function walkDir(dir, callback) {
  try {
    fs.readdirSync(dir, { withFileTypes: true }).forEach(dirent => {
      const fullPath = path.join(dir, dirent.name);
      if (dirent.isDirectory()) {
        if (!IGNORE_DIRS.includes(dirent.name)) {
          walkDir(fullPath, callback);
        }
      } else {
        const ext = path.extname(dirent.name);
        if (FILE_EXTENSIONS.includes(ext)) {
          callback(fullPath);
        }
      }
    });
  } catch (err) {
    // Skip directories we can't read
  }
}

// Find missing variable usages
function findMissingVars(definedVars) {
  const missing = [];
  const usageRegex = /var\(\s*(--[a-zA-Z0-9-_]+)(\s*,\s*[^)]+)?\s*\)/g;

  walkDir(__dirname, (filePath) => {
    try {
      const content = fs.readFileSync(filePath, 'utf8');
      let match;
      usageRegex.lastIndex = 0;
      while ((match = usageRegex.exec(content)) !== null) {
        const fullVar = match[1];
        const varName = fullVar.slice(2);
        if (!definedVars.has(varName)) {
          const linesUpToMatch = content.slice(0, match.index).split('\n');
          const lineNumber = linesUpToMatch.length;
          missing.push({
            variable: fullVar,
            file: path.relative(__dirname, filePath),
            line: lineNumber
          });
        }
      }
    } catch (err) {
      // Skip files we can't read
    }
  });

  return missing;
}

// Main execution
try {
  const definedVars = getDefinedVars();
  console.log(`Defined variables in App.css: ${definedVars.size}`);
  const missingVars = findMissingVars(definedVars);

  // Group by variable name
  const grouped = missingVars.reduce((acc, curr) => {
    if (!acc[curr.variable]) acc[curr.variable] = [];
    acc[curr.variable].push(`${curr.file}:${curr.line}`);
    return acc;
  }, {});

  // Build report
  let report = `CSS Variable Usage Report
Generated: ${new Date().toISOString()}
Defined variables in App.css: ${definedVars.size}
Missing variable usages found: ${missingVars.length}
Unique missing variables: ${Object.keys(grouped).length}

===========================================
MISSING VARIABLES (not defined in App.css)
===========================================

`;

  for (const [varName, locations] of Object.entries(grouped).sort()) {
    report += `\n${varName} (used ${locations.length} time(s)):\n`;
    locations.forEach(loc => {
      report += `  - ${loc}\n`;
    });
  }

  // Write report to file
  fs.writeFileSync(OUTPUT_PATH, report);
  
  console.log(`\nFound ${missingVars.length} usage(s) of ${Object.keys(grouped).length} undefined CSS variable(s).`);
  console.log(`Full report written to: ${OUTPUT_PATH}`);
  
  // Print summary of top 20 most used missing variables
  console.log('\nTop 20 most used missing variables:');
  const sorted = Object.entries(grouped).sort((a, b) => b[1].length - a[1].length).slice(0, 20);
  sorted.forEach(([varName, locations]) => {
    console.log(`  ${varName}: ${locations.length} usage(s)`);
  });
  
} catch (err) {
  console.error('Error:', err.message);
  process.exit(1);
}
