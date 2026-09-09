import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Get the project root (parent of scripts directory)
const projectRoot = path.resolve(__dirname, '..');

// Files and directories to exclude
const excludeDirs = ['node_modules', '.git', 'dist', 'build', '.next'];
const excludeFiles = ['remove-console-logs.mjs', 'check-translations.mjs'];

// Extensions to process
const extensions = ['.ts', '.tsx', '.js', '.jsx', '.mjs'];

function shouldProcessFile(filePath) {
  const relativePath = path.relative(projectRoot, filePath);
  
  // Check if file is in excluded directory
  for (const excludeDir of excludeDirs) {
    if (relativePath.includes(excludeDir)) {
      return false;
    }
  }
  
  // Check if file is excluded
  const fileName = path.basename(filePath);
  if (excludeFiles.includes(fileName)) {
    return false;
  }
  
  // Check extension
  const ext = path.extname(filePath);
  return extensions.includes(ext);
}

function removeConsoleLogs(content) {
  let modified = content;
  let hasChanges = false;
  
  // Pattern to match console.log statements
  // This handles:
  // - console.log(...);
  // - console.log(...) (without semicolon)
  // - Multi-line console.log with parentheses
  // - console.log with template literals
  
  // First, handle multi-line console.log statements
  // Match console.log( ... ) with balanced parentheses
  const multiLinePattern = /console\.log\s*\([^()]*(?:\([^()]*(?:\([^()]*(?:\([^()]*\)[^()]*)*\)[^()]*)*\)[^()]*)*\)\s*;?/gs;
  
  let match;
  while ((match = multiLinePattern.exec(modified)) !== null) {
    const fullMatch = match[0];
    const startPos = match.index;
    const endPos = startPos + fullMatch.length;
    
    // Check if it's on its own line (with optional whitespace)
    const beforeMatch = modified.substring(Math.max(0, startPos - 100), startPos);
    const afterMatch = modified.substring(endPos, Math.min(modified.length, endPos + 10));
    
    // Check if there's a newline before (or start of file) and after (or end of file)
    const hasNewlineBefore = startPos === 0 || beforeMatch.includes('\n');
    const hasNewlineAfter = endPos === modified.length || afterMatch.includes('\n') || afterMatch.trim() === '';
    
    // If it's on its own line(s), remove the entire line(s)
    if (hasNewlineBefore || hasNewlineAfter) {
      // Find the start of the line
      let lineStart = startPos;
      while (lineStart > 0 && modified[lineStart - 1] !== '\n') {
        lineStart--;
      }
      
      // Find the end of the line
      let lineEnd = endPos;
      while (lineEnd < modified.length && modified[lineEnd] !== '\n') {
        lineEnd++;
      }
      if (lineEnd < modified.length) {
        lineEnd++; // Include the newline
      }
      
      // Check if the line only contains whitespace and the console.log
      const lineContent = modified.substring(lineStart, lineEnd).trim();
      if (lineContent.startsWith('console.log') || lineContent === 'console.log') {
        modified = modified.substring(0, lineStart) + modified.substring(lineEnd);
        hasChanges = true;
        // Reset regex lastIndex since we modified the string
        multiLinePattern.lastIndex = lineStart;
      }
    } else {
      // Inline console.log, just remove it
      modified = modified.substring(0, startPos) + modified.substring(endPos);
      hasChanges = true;
      multiLinePattern.lastIndex = startPos;
    }
  }
  
  // Also handle simple single-line console.log that might have been missed
  const singleLinePattern = /^\s*console\.log\s*\([^)]*\)\s*;?\s*$/gm;
  modified = modified.replace(singleLinePattern, '');
  if (singleLinePattern.test(content)) {
    hasChanges = true;
  }
  
  return { content: modified, hasChanges };
}

function processFile(filePath) {
  try {
    const content = fs.readFileSync(filePath, 'utf8');
    const { content: newContent, hasChanges } = removeConsoleLogs(content);
    
    if (hasChanges) {
      fs.writeFileSync(filePath, newContent, 'utf8');
      return true;
    }
    return false;
  } catch (error) {
    console.error(`Error processing ${filePath}:`, error.message);
    return false;
  }
}

function walkDir(dir, fileList = []) {
  const files = fs.readdirSync(dir);
  
  for (const file of files) {
    const filePath = path.join(dir, file);
    const stat = fs.statSync(filePath);
    
    if (stat.isDirectory()) {
      if (!excludeDirs.some(exclude => filePath.includes(exclude))) {
        walkDir(filePath, fileList);
      }
    } else if (stat.isFile()) {
      if (shouldProcessFile(filePath)) {
        fileList.push(filePath);
      }
    }
  }
  
  return fileList;
}

// Main execution
console.log('🔍 Scanning for console.log statements...\n');

const files = walkDir(projectRoot);
console.log(`Found ${files.length} files to process\n`);

let processedCount = 0;
let modifiedCount = 0;

for (const file of files) {
  const wasModified = processFile(file);
  processedCount++;
  
  if (wasModified) {
    modifiedCount++;
    const relativePath = path.relative(projectRoot, file);
    console.log(`✅ Removed console.log from: ${relativePath}`);
  }
}

console.log(`\n📊 Summary:`);
console.log(`   Processed: ${processedCount} files`);
console.log(`   Modified: ${modifiedCount} files`);
console.log(`\n✨ Done!`);

