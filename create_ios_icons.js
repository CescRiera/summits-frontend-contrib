const fs = require('fs');
const { execSync } = require('child_process');

// Create icons directory
const iconsDir = './ios/App/App/Assets.xcassets/icons';
if (!fs.existsSync(iconsDir)) {
    fs.mkdirSync(iconsDir, { recursive: true });
}

// Icon definitions (simple SVG versions of Android icons)
const icons = {
    'ic_x': `<svg width="24" height="24" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
        <path d="M18 6L6 18M6 6l12 12" stroke="white" stroke-width="2" fill="none"/>
    </svg>`,

    'ic_pause': `<svg width="24" height="24" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
        <path d="M6 4h4v16H6V4zM14 4h4v16h-4V4z" fill="white"/>
    </svg>`,

    'ic_play': `<svg width="24" height="24" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
        <path d="M8 5v14l11-7z" fill="white"/>
    </svg>`,

    'ic_rotate_ccw': `<svg width="24" height="24" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
        <path d="M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 8" stroke="white" stroke-width="2" fill="none"/>
        <path d="M21 3v5h-5" stroke="white" stroke-width="2" fill="none"/>
        <path d="M21 12a9 9 0 0 1-9 9 9.75 9.75 0 0 1-6.74-2.74L3 16" stroke="white" stroke-width="2" fill="none"/>
    </svg>`,

    'ic_download': `<svg width="24" height="24" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
        <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" stroke="white" stroke-width="2" fill="none"/>
        <polyline points="7,10 12,15 17,10" stroke="white" stroke-width="2" fill="none"/>
        <line x1="12" y1="15" x2="12" y2="3" stroke="white" stroke-width="2"/>
    </svg>`
};

// Create each icon as PNG using ImageMagick if available, or create SVG files
Object.entries(icons).forEach(([name, svgContent]) => {
    const svgPath = `${iconsDir}/${name}.svg`;
    const pngPath = `${iconsDir}/${name}.png`;

    // Write SVG file
    fs.writeFileSync(svgPath, svgContent);
    console.log(`Created ${svgPath}`);

    // Try to convert SVG to PNG using ImageMagick if available
    try {
        execSync(`convert ${svgPath} -background transparent ${pngPath}`, { stdio: 'pipe' });
        console.log(`Converted ${name}.svg to PNG`);
    } catch (error) {
        console.log(`ImageMagick not available, created SVG only: ${name}`);
        // Create a simple Contents.json for the asset catalog
        const contentsJson = {
            images: [
                {
                    filename: `${name}.svg`,
                    idiom: "universal"
                }
            ],
            info: {
                author: "xcode",
                version: 1
            }
        };
        fs.writeFileSync(`${iconsDir}/${name}.imageset/Contents.json`, JSON.stringify(contentsJson, null, 2));
    }
});

console.log('iOS icon generation complete!');
