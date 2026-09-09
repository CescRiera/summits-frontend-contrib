const fs = require('fs');
const path = require('path');

const replacements = [
  ['--color-surface-secondary', '--c-gray-100'],
  ['--color-surface-tertiary', '--c-gray-200'],
  ['--color-surface', '--c-white'],
  ['--color-text-primary', '--c-gray-900'],
  ['--color-text-secondary', '--c-gray-600'],
  ['--color-text-tertiary', '--c-gray-400'],
  ['--color-text-inverse', '--c-white'],
  ['--color-border-light', '--c-gray-200'],
  ['--color-border-dark', '--c-gray-400'],
  ['--color-background', '--c-gray-50']
];

function replaceInDir(dir) {
    if (!fs.existsSync(dir)) return;
    const files = fs.readdirSync(dir);
    files.forEach(file => {
        const filePath = path.join(dir, file);
        const stat = fs.statSync(filePath);
        if (stat.isDirectory()) {
            replaceInDir(filePath);
        } else if (file.endsWith('.css') || file.endsWith('.tsx') || file.endsWith('.ts')) {
            let content = fs.readFileSync(filePath, 'utf8');
            let changed = false;
            
            replacements.forEach(([oldVar, newVar]) => {
                // Look for var(--old-var) and replace with var(--new-var)
                // Also handle cases without var() if they are in App.css definition which we will remove manually later, 
                // but let's be safe and only replace var() usages first or any direct string matches in files that aren't App.css
                
                const regex = new RegExp(`var\\(${oldVar}\\)`, 'g');
                if (regex.test(content)) {
                    content = content.replace(regex, `var(${newVar})`);
                    changed = true;
                }
            });

            if (changed) {
                console.log('Updating:', filePath);
                fs.writeFileSync(filePath, content, 'utf8');
            }
        }
    });
}

const targetDir = path.resolve('src');
console.log('Starting migration of semantic colors to functional colors in:', targetDir);
replaceInDir(targetDir);
console.log('Done.');
