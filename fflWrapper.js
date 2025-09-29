// Compatibility layer for ffl.js
const structFu = require('struct-fu');

// Monkey-patch struct-fu BEFORE ffl.js loads
const originalStruct = structFu.struct;
structFu.struct = function(...args) {
    const result = originalStruct.apply(this, args);
    const originalUnpack = result.unpack;
    const originalPack = result.pack;
    
    result.unpack = function(data) {
        if (data && !(data instanceof Buffer) && data.buffer) {
            data = Buffer.from(data);
        }
        return originalUnpack.call(this, data);
    };
    
    result.pack = function(obj) {
        if (obj && typeof obj === 'object') {
            for (let key in obj) {
                if (key.startsWith('_padding') && Array.isArray(obj[key])) {
                    obj[key] = Buffer.from(obj[key]);
                }
            }
        }
        return originalPack.call(this, obj);
    };
    
    return result;
};

// Set up globals
global._ = structFu;
global.THREE = require('three');

// Load ffl.js - it will use the patched struct-fu
const fflPath = require.resolve('ffl.js/ffl.js');
delete require.cache[fflPath]; // Clear cache
const fflModule = require('ffl.js/ffl.js');

module.exports = fflModule;