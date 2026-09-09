import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const reportPath = path.join(__dirname, '../colors-report.json');

if (!fs.existsSync(reportPath)) {
  console.error('Report not found. Run npm run find:colors first.');
  process.exit(1);
}

const data = JSON.parse(fs.readFileSync(reportPath, 'utf-8'));
const colors = data.summary.allUniqueColors;

// Helper to convert hex to RGB
function hexToRgb(hex) {
  hex = hex.replace('#', '');
  if (hex.length === 3) hex = hex.split('').map(c => c + c).join('');
  if (hex.length === 4) hex = hex.substring(0, 3).split('').map(c => c + c).join(''); // ignore alpha for distance
  if (hex.length === 8) hex = hex.substring(0, 6);
  
  const r = parseInt(hex.substring(0, 2), 16);
  const g = parseInt(hex.substring(2, 4), 16);
  const b = parseInt(hex.substring(4, 6), 16);
  return { r, g, b };
}

// Helper to check if a color is "grayscale" (R, G, B are close to each other)
function isGrayscale(hex) {
  if (hex.startsWith('var(')) return false;
  try {
    const { r, g, b } = hexToRgb(hex);
    const max = Math.max(r, g, b);
    const min = Math.min(r, g, b);
    return max - min < 20; // Saturation threshold
  } catch (e) {
    return false;
  }
}

// Define our 9 Target Grayscale Colors (Modern Slate palette)
const TARGET_PALETTE = [
  { name: 'White', hex: '#ffffff' },
  { name: 'Gray-50', hex: '#f8fafc' },
  { name: 'Gray-100', hex: '#f1f5f9' },
  { name: 'Gray-200', hex: '#e2e8f0' },
  { name: 'Gray-400', hex: '#94a3b8' },
  { name: 'Gray-600', hex: '#475569' },
  { name: 'Gray-800', hex: '#1e293b' },
  { name: 'Gray-900', hex: '#0f172a' },
  { name: 'Black', hex: '#000000' }
];

const targetRgbs = TARGET_PALETTE.map(p => ({ ...p, rgb: hexToRgb(p.hex) }));

function getBrightness(r, g, b) {
  return (r * 299 + g * 587 + b * 114) / 1000;
}

function findNearest(hex) {
  const { r, g, b } = hexToRgb(hex);
  const brightness = getBrightness(r, g, b);
  
  let nearest = targetRgbs[0];
  let minDiff = Infinity;
  
  for (const t of targetRgbs) {
    const diff = Math.abs(getBrightness(t.rgb.r, t.rgb.g, t.rgb.b) - brightness);
    if (diff < minDiff) {
      minDiff = diff;
      nearest = t;
    }
  }
  return nearest;
}

const grayscaleColors = colors.filter(c => isGrayscale(c));
const mapping = {};

grayscaleColors.forEach(c => {
  const nearest = findNearest(c);
  if (!mapping[nearest.name]) mapping[nearest.name] = [];
  mapping[nearest.name].push(c);
});

console.log('📊 Grayscale Color Reduction Plan (9 Colors)\n');

TARGET_PALETTE.forEach(p => {
  const mapped = mapping[p.name] || [];
  console.log(`✅ ${p.name.padEnd(8)} [${p.hex}] replaces:`);
  if (mapped.length === 0) {
    console.log('   (No similar colors found)');
  } else {
    // Sort by brightness or string
    mapped.sort().forEach(m => console.log(`   🔸 ${m}`));
  }
  console.log('');
});

console.log(`Total grayscale variations found: ${grayscaleColors.length}`);
console.log(`Proposed reduction: ${TARGET_PALETTE.length} colors`);
