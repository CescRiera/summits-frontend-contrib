import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const projectRoot = path.join(__dirname, '..');
const srcDir = path.join(projectRoot, 'src');

// Define the 9 Target Grayscale colors
// Values are from App.css
const TARGET_PALETTE = [
  { name: 'white', hex: '#ffffff', rgb: 'var(--rgb-white)' },
  { name: 'gray-50', hex: '#f8fafc', rgb: 'var(--rgb-gray-50)' },
  { name: 'gray-100', hex: '#f1f5f9', rgb: 'var(--rgb-gray-100)' },
  { name: 'gray-200', hex: '#e2e8f0', rgb: 'var(--rgb-gray-200)' },
  { name: 'gray-400', hex: '#94a3b8', rgb: 'var(--rgb-gray-400)' },
  { name: 'gray-600', hex: '#475569', rgb: 'var(--rgb-gray-600)' },
  { name: 'gray-800', hex: '#1e293b', rgb: 'var(--rgb-gray-800)' },
  { name: 'gray-900', hex: '#0f172a', rgb: 'var(--rgb-gray-900)' },
  { name: 'black', hex: '#000000', rgb: 'var(--rgb-black)' }
];

// Helper to convert hex to RGB
function hexToRgb(hex) {
  hex = hex.replace('#', '');
  if (hex.length === 3) hex = hex.split('').map(c => c + c).join('');
  if (hex.length === 4) hex = hex.substring(0, 3).split('').map(c => c + c).join('');
  if (hex.length === 8) hex = hex.substring(0, 6);
  
  const r = parseInt(hex.substring(0, 2), 16);
  const g = parseInt(hex.substring(2, 4), 16);
  const b = parseInt(hex.substring(4, 6), 16);
  return { r, g, b };
}

const targetRgbs = TARGET_PALETTE.map(p => ({ ...p, ...hexToRgb(p.hex) }));

function getBrightness(r, g, b) {
  return (r * 299 + g * 587 + b * 114) / 1000;
}

// Find nearest target color
function findNearest(r, g, b) {
  const brightness = getBrightness(r, g, b);
  let nearest = targetRgbs[0];
  let minDiff = Infinity;
  
  for (const t of targetRgbs) {
    const diff = Math.abs(getBrightness(t.r, t.g, t.b) - brightness);
    if (diff < minDiff) {
      minDiff = diff;
      nearest = t;
    }
  }
  return nearest;
}

function isGrayscale(r, g, b) {
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  return (max - min) < 20; // Saturation threshold
}

// Scans and replaces colors in a file
function updateFile(filePath) {
  let content = fs.readFileSync(filePath, 'utf-8');
  let originalContent = content;

  // 1. Process Hex Codes
  const hexRegex = /#([a-fA-F0-9]{3}|[a-fA-F0-9]{6})\b/gi;
  content = content.replace(hexRegex, (match) => {
    try {
      const { r, g, b } = hexToRgb(match);
      if (isGrayscale(r, g, b)) {
        const target = findNearest(r, g, b);
        return `var(--c-${target.name})`;
      }
    } catch (e) {}
    return match;
  });

  // 2. Process rgba(0, 0, 0, alpha)
  const rgbaRegex = /rgba\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)\s*,\s*([\d\.]+)\s*\)/gi;
  content = content.replace(rgbaRegex, (match, r, g, b, a) => {
    const rInt = parseInt(r);
    const gInt = parseInt(g);
    const bInt = parseInt(b);
    if (isGrayscale(rInt, gInt, bInt)) {
      const target = findNearest(rInt, gInt, bInt);
      return `rgba(${target.rgb}, ${a})`;
    }
    return match;
  });

  // 3. Process rgb(0, 0, 0)
  const rgbRegex = /rgb\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)\s*\)/gi;
  content = content.replace(rgbRegex, (match, r, g, b) => {
    const rInt = parseInt(r);
    const gInt = parseInt(g);
    const bInt = parseInt(b);
    if (isGrayscale(rInt, gInt, bInt)) {
      const target = findNearest(rInt, gInt, bInt);
      return `var(--c-${target.name})`;
    }
    return match;
  });

  if (content !== originalContent) {
    fs.writeFileSync(filePath, content, 'utf-8');
    return true;
  }
  return false;
}

function getAllFiles(dirPath, arrayOfFiles = []) {
  const files = fs.readdirSync(dirPath);
  files.forEach((file) => {
    const filePath = path.join(dirPath, file);
    if (fs.statSync(filePath).isDirectory()) {
      if (!['node_modules', '.git', 'dist', 'build', '.agent', 'android', 'ios'].includes(file)) {
        arrayOfFiles = getAllFiles(filePath, arrayOfFiles);
      }
    } else {
      if (/\.(css|ts|tsx)$/.test(file) && !file.includes('App.css')) {
        arrayOfFiles.push(filePath);
      }
    }
  });
  return arrayOfFiles;
}

console.log('🚀 Starting grayscale remapping to 9-step palette...');
const files = getAllFiles(srcDir);
let updatedCount = 0;

files.forEach(file => {
  if (updateFile(file)) {
    updatedCount++;
    console.log(`✅ Updated: ${path.relative(projectRoot, file)}`);
  }
});

console.log(`\n🎉 Done! Updated ${updatedCount} files.`);
