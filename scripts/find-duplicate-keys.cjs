const fs = require('fs');
const path = require('path');

const localesDir = path.join(__dirname, '../src/shared/locales');
const files = fs.readdirSync(localesDir).filter(f => f.endsWith('.json'));

function findDuplicates(filePath) {
    const content = fs.readFileSync(filePath, 'utf8');
    const allDuplicates = [];
    const stack = [new Map()]; // level -> Map(key -> lines[])
    
    const tokenRegex = /"([^"]+)"\s*:|[\{\}]/g;
    let match;
    
    while ((match = tokenRegex.exec(content)) !== null) {
        const token = match[0];
        const line = content.substring(0, match.index).split('\n').length;
        if (token === '{') {
            stack.push(new Map());
        } else if (token === '}') {
            const levelMap = stack.pop();
            for (const [key, lines] of levelMap) {
                if (lines.length > 1) {
                    allDuplicates.push({ key, lines });
                }
            }
        } else if (match[1]) {
            const key = match[1];
            const currentLevel = stack[stack.length - 1];
            if (currentLevel) {
                if (!currentLevel.has(key)) {
                    currentLevel.set(key, []);
                }
                currentLevel.get(key).push(line);
            }
        }
    }

    // Handle the root level
    const rootMap = stack[0];
    for (const [key, lines] of rootMap) {
        if (lines.length > 1) {
            allDuplicates.push({ key, lines });
        }
    }

    return allDuplicates;
}

console.log('Checking for duplicate keys...');
let totalDuplicates = 0;

for (const file of files) {
    const filePath = path.join(localesDir, file);
    try {
        const duplicates = findDuplicates(filePath);
        if (duplicates.length > 0) {
            console.log(`\n${file}: Found ${duplicates.length} duplicate group(s)`);
            duplicates.forEach(d => {
                console.log(`  - "${d.key}" found at lines: ${d.lines.join(', ')}`);
                totalDuplicates++;
            });
        }
    } catch (e) {
        console.log(`${file}: Error - ${e.message}`);
    }
}

if (totalDuplicates === 0) {
    console.log('\nSuccess: No duplicate keys found in any locale file.');
} else {
    console.log(`\nTotal duplicate groups found: ${totalDuplicates}`);
}
