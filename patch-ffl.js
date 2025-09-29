const fs = require('fs');
const path = require('path');

const fflPath = path.join(__dirname, './node_modules/ffl.js/ffl.js');

console.log('Patching ffl.js to have CJS Exports...');

if (!fs.existsSync(fflPath)) {
    console.error('ffl.js not found at', fflPath);
    process.exit(1);
}

let content = fs.readFileSync(fflPath, 'utf8');

// Check if already patched
if (content.includes('// MIIJS_PATCHED')) {
    console.log('ffl.js already patched, skipping.');
    process.exit(0);
}

content += `
// MIIJS_PATCHED - CommonJS exports for Node.js
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        initializeFFL,
        exitFFL,
        createCharModel,
        initCharModelTextures,
        setIsWebGL1State,
        parseHexOrB64ToUint8Array,
        getCameraForViewType,
        ViewType,
        CharModel,
        FFLExpression,
        FFLModelFlag,
        FFLResourceType,
        makeExpressionFlag,
        TextureShaderMaterial,
        convertStudioCharInfoToFFLiCharInfo,
        convertFFLiCharInfoToStudioCharInfo,
        uint8ArrayToBase64
    };
}
`;
content=content.replaceAll("console.debug","//console.debug");
fs.writeFileSync(fflPath, content, 'utf8');

console.log('ffl.js successfully patched.');