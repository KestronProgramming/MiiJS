const fs = require('fs');
const path = require('path');

var fflPath;
const fflPaths = [path.join(__dirname, './node_modules/ffl.js/ffl.js'),path.join(__dirname, '../node_modules/ffl.js/ffl.js'),path.join(__dirname, '../../node_modules/ffl.js/ffl.js'),path.join(__dirname, './ffl.js'),path.join(__dirname, '../ffl.js')];
for(var i=0;i<fflPaths.length;i++){
    if (!fs.existsSync(fflPaths[i])) {
        continue;
    }
    fflPath=fflPaths[i];
    i=fflPaths.length;
}
if(fflPath===null||fflPath===undefined){
    console.warn("Couldn't find ffl.js. It still needs to be patched to have CJS exports.");
    process.exit(0);
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