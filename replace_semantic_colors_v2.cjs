const fs = require('fs');
const path = require('path');

// Mappings from old semantic variable to new functional variable
const mapping = {
  '--color-surface-secondary': '--c-gray-100',
  '--color-surface-tertiary': '--c-gray-200',
  '--color-surface': '--c-white',
  '--color-text-primary': '--c-gray-900',
  '--color-text-secondary': '--c-gray-600',
  '--color-text-tertiary': '--c-gray-400',
  '--color-text-inverse': '--c-white',
  '--color-border-light': '--c-gray-200',
  '--color-border-dark': '--c-gray-400',
  '--color-background': '--c-gray-50'
};

// Sort keys by length descending to match longer suffixes first
const sortedOldVars = Object.keys(mapping).sort((a, b) => b.length - a.length);

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
            
            // Greedily match any of the old variables when they appear as words (e.g. inside var())
            // This handles var(--color-surface-tertiary, var(--c-gray-100)) -> var(--c-gray-200, var(--c-gray-100))
            sortedOldVars.forEach(oldVar => {
                const newVar = mapping[oldVar];
                // We want to match the variable name itself. 
                // Using \b is good but we must ensure we don't match it if it's already part of something else.
                // However, our sorted order ensures --color-surface-secondary is checked before --color-surface.
                const regex = new RegExp(oldVar.replace(/-/g, '\\-') + '(?![a-zA-Z0-9\\-])', 'g');
                if (regex.test(content)) {
                    content = content.replace(regex, newVar);
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
console.log('Starting migration phase 2 (aggressive replacement) in:', targetDir);
replaceInDir(targetDir);
console.log('Done.');
