//Imports
const fs = require('fs');
const nodeCanvas = require('canvas');
const { createCanvas, loadImage, ImageData } = nodeCanvas;
const jsQR = require('jsqr');
const Jimp = require('jimp');
const THREE = require('three');
const QRCodeStyling = require("qr-code-styling");
const { JSDOM } = require("jsdom");
const httpsLib = require('https');
const asmCrypto=require("./asmCrypto.js");
const path=require("path");
const createGL = require('gl');

const {
  createCharModel, initCharModelTextures,
  initializeFFL, exitFFL, parseHexOrB64ToUint8Array,
  setIsWebGL1State, getCameraForViewType, ViewType
} = require("ffl.js/ffl.js");
const ModuleFFL = require("ffl.js/examples/ffl-emscripten-single-file.js");
const FFLShaderMaterial = require("ffl.js/FFLShaderMaterial.js");

// Typedefs for intellisence
/** @typedef {import('./types').WiiMii} WiiMii */

//Tools
function Uint8Cat(){
    var destLength = 0
    for(var i = 0;i < arguments.length;i++){
        destLength += arguments[i].length;
    }
    var dest = new Uint8Array(destLength);
    var index = 0;
    for(var i=0;i<arguments.length;i++){
        dest.set(arguments[i],index);
        index += arguments[i].length;
    }
    return dest;
}
async function downloadImage(url) {
    return new Promise((resolve, reject) => {
        httpsLib.get(url, (res) => {
            if (res.statusCode === 200) {
                const data = [];
                res.on('data', chunk => data.push(chunk));
                res.on('end', () => resolve(Buffer.concat(data)));
                res.on('error', reject);
            } else {
                res.resume();
                reject(new Error(`Request Failed With a Status Code: ${res.statusCode}`));
            }
        });
    });
}
function byteToString(int){
    var str = int.toString(16);
    if(str.length < 2)str = '0' + str;
    return str;
}

//If FFLResHigh.dat is in the same directory as Node.js is calling the library from, use it by default
let _fflRes; // undefined initially
function getFFLRes() {
    // If we've already tried loading, just return the result
    if (_fflRes !== undefined) return _fflRes;
    for (const path of [ "./FFLResHigh.dat", "./ffl/FFLResHigh.dat" ]) {
        if (fs.existsSync(path))
            return _fflRes = new Uint8Array(fs.readFileSync(path));
    }
    // If no file found, mark as null
    return _fflRes = null;
}

//3DS QR Code (En|De)cryption
var NONCE_OFFSET = 0xC;
var NONCE_LENGTH = 8;
var TAG_LENGTH = 0x10;
var aes_key = new Uint8Array([0x59, 0xFC, 0x81, 0x7E, 0x64, 0x46, 0xEA, 0x61, 0x90, 0x34, 0x7B, 0x20, 0xE9, 0xBD, 0xCE, 0x52]);
var pad = new Uint8Array([0,0,0,0]);
function decodeAesCcm(data){
  var nonce = Uint8Cat(data.subarray(0,NONCE_LENGTH),pad);
  var ciphertext = data.subarray(NONCE_LENGTH,0x70);
  var plaintext = asmCrypto.AES_CCM.decrypt(ciphertext,aes_key,nonce,undefined,TAG_LENGTH);
  return Uint8Cat(plaintext.subarray(0,NONCE_OFFSET),data.subarray(0,NONCE_LENGTH),plaintext.subarray(NONCE_OFFSET,plaintext.length - 4));
}
function crcCalc(data){
    var crc = 0;
    for (var byteIndex = 0;byteIndex < data.length; byteIndex++){
        for (var bitIndex = 7; bitIndex >= 0; bitIndex--){
            crc = (((crc << 1) | ((data[byteIndex] >> bitIndex) & 0x1)) ^
            (((crc & 0x8000) != 0) ? 0x1021 : 0)); 
        }
    }
    for(var counter = 16; counter > 0; counter--){
        crc = ((crc << 1) ^ (((crc & 0x8000) != 0) ? 0x1021 : 0));
    }
    return(crc & 0xFFFF);
}
function encodeAesCcm(data){
    var nonce = Uint8Cat(data.subarray(NONCE_OFFSET,NONCE_OFFSET + NONCE_LENGTH),pad);
    var crcSrc = Uint8Cat(data,new Uint8Array([0,0]));
    var crc = crcCalc(crcSrc);
    var cfsd = Uint8Cat(crcSrc,new Uint8Array([crc >>> 8,crc & 0xff]));
    var plaintext = Uint8Cat(cfsd.subarray(0,NONCE_OFFSET),cfsd.subarray(NONCE_OFFSET + NONCE_LENGTH,cfsd.length),pad,pad);
    var ciphertext = asmCrypto.AES_CCM.encrypt(plaintext,aes_key,nonce,undefined,TAG_LENGTH);
    return Uint8Cat(cfsd.subarray(NONCE_OFFSET,NONCE_OFFSET + NONCE_LENGTH),ciphertext.subarray(0,ciphertext.length - 24),ciphertext.subarray(ciphertext.length - TAG_LENGTH,ciphertext.length))
}

//Miscellaneous Tables
const lookupTables = {
    favCols: ["Red", "Orange", "Yellow", "Lime", "Green", "Blue", "Cyan", "Pink", "Purple", "Brown", "White", "Black"],
    skinCols: ["White", "Tanned White", "Darker White", "Tanned Darker", "Mostly Black", "Black"],
    hairCols: ["Black", "Brown", "Red", "Reddish Brown", "Grey", "Light Brown", "Dark Blonde", "Blonde"],
    eyeCols: ["Black", "Grey", "Brown", "Lime", "Blue", "Green"],
    wiiFaceFeatures: ["None", "Blush", "Makeup and Blush", "Freckles", "Bags", "Wrinkles on Cheeks", "Wrinkles near Eyes", "Chin Wrinkle", "Makeup", "Stubble", "Wrinkles near Mouth", "Wrinkles"],
    wiiMouthColors: ["Peach", "Red", "Pink"],
    wiiGlassesCols: ["Grey", "Brown", "Red", "Blue", "Yellow", "White"],
    wiiNoses: {
        "1": 0,
        "10": 1,
        "2": 2,
        "3": 3,
        "6": 4,
        "0": 5,
        "5": 6,
        "4": 7,
        "8": 8,
        "9": 9,
        "7": 10,
    },

    pages:{
        mouths: {
            '0': '1',
            '1': '1',
            '2': '2',
            '3': '2',
            '4': '2',
            '5': '1',
            '6': '1',
            '7': '2',
            '8': '1',
            '9': '2',
            '10': '1',
            '11': '2',
            '12': '2',
            '13': '1',
            '14': '2',
            '15': '2',
            '16': '1',
            '17': '2',
            '18': '2',
            '19': '1',
            '20': '2',
            '21': '1',
            '22': '1',
            '23': '1'
        },
        eyebrows:{
            '0': '1',
            '1': '1',
            '2': '2',
            '3': '2',
            '4': '1',
            '5': '1',
            '6': '1',
            '7': '1',
            '8': '1',
            '9': '1',
            '10': '2',
            '11': '2',
            '12': '1',
            '13': '2',
            '14': '2',
            '15': '2',
            '16': '2',
            '17': '1',
            '18': '2',
            '19': '1',
            '20': '2',
            '21': '1',
            '22': '2',
            '23': '2'
        },
        eyes:{
            '0': '1',
            '1': '1',
            '2': '1',
            '3': '4',
            '4': '1',
            '5': '3',
            '6': '3',
            '7': '4',
            '8': '1',
            '9': '2',
            '10': '4',
            '11': '2',
            '12': '2',
            '13': '3',
            '14': '4',
            '15': '1',
            '16': '1',
            '17': '1',
            '18': '3',
            '19': '2',
            '20': '1',
            '21': '2',
            '22': '4',
            '23': '2',
            '24': '3',
            '25': '2',
            '26': '1',
            '27': '1',
            '28': '3',
            '29': '4',
            '30': '3',
            '31': '3',
            '32': '2',
            '33': '2',
            '34': '2',
            '35': '2',
            '36': '3',
            '37': '3',
            '38': '4',
            '39': '1',
            '40': '2',
            '41': '3',
            '42': '4',
            '43': '4',
            '44': '4',
            '45': '4',
            '46': '3',
            '47': '4'
        },
        hairs:{
            '0': '5',
            '1': '4',
            '2': '6',
            '3': '5',
            '4': '4',
            '5': '4',
            '6': '5',
            '7': '4',
            '8': '4',
            '9': '6',
            '10': '5',
            '11': '5',
            '12': '4',
            '13': '4',
            '14': '5',
            '15': '6',
            '16': '6',
            '17': '5',
            '18': '6',
            '19': '4',
            '20': '5',
            '21': '5',
            '22': '5',
            '23': '3',
            '24': '6',
            '25': '4',
            '26': '4',
            '27': '4',
            '28': '6',
            '29': '6',
            '30': '3',
            '31': '1',
            '32': '2',
            '33': '1',
            '34': '3',
            '35': '5',
            '36': '3',
            '37': '2',
            '38': '3',
            '39': '1',
            '40': '1',
            '41': '3',
            '42': '3',
            '43': '3',
            '44': '1',
            '45': '1',
            '46': '6',
            '47': '2',
            '48': '2',
            '49': '1',
            '50': '2',
            '51': '1',
            '52': '2',
            '53': '6',
            '54': '3',
            '55': '2',
            '56': '1',
            '57': '3',
            '58': '2',
            '59': '1',
            '60': '2',
            '61': '6',
            '62': '2',
            '63': '5',
            '64': '2',
            '65': '3',
            '66': '2',
            '67': '3',
            '68': '1',
            '69': '4',
            '70': '1',
            '71': '6'
        }
    },
    types:{
        "mouths": {
            "0": 6,
            "1": 1,
            "2": 2,
            "3": 4,
            "4": 5,
            "5": 5,
            "6": 10,
            "7": 0,
            "8": 7,
            "9": 1,
            "10": 8,
            "11": 7,
            "12": 11,
            "13": 11,
            "14": 10,
            "15": 6,
            "16": 9,
            "17": 3,
            "18": 9,
            "19": 2,
            "20": 8,
            "21": 3,
            "22": 4,
            "23": 0
        },
        "eyebrows": {
            "0": 1,
            "1": 3,
            "2": 2,
            "3": 3,
            "4": 11,
            "5": 10,
            "6": 0,
            "7": 6,
            "8": 8,
            "9": 4,
            "10": 1,
            "11": 0,
            "12": 2,
            "13": 7,
            "14": 4,
            "15": 6,
            "16": 10,
            "17": 9,
            "18": 9,
            "19": 5,
            "20": 5,
            "21": 7,
            "22": 8,
            "23": 11
        },
        "eyes": {
            "0": 2,
            "1": 6,
            "2": 0,
            "3": 6,
            "4": 1,
            "5": 0,
            "6": 5,
            "7": 0,
            "8": 3,
            "9": 4,
            "10": 9,
            "11": 1,
            "12": 5,
            "13": 2,
            "14": 10,
            "15": 9,
            "16": 8,
            "17": 5,
            "18": 9,
            "19": 2,
            "20": 11,
            "21": 8,
            "22": 8,
            "23": 6,
            "24": 6,
            "25": 9,
            "26": 7,
            "27": 10,
            "28": 10,
            "29": 5,
            "30": 7,
            "31": 8,
            "32": 3,
            "33": 0,
            "34": 7,
            "35": 11,
            "36": 3,
            "37": 4,
            "38": 2,
            "39": 4,
            "40": 10,
            "41": 1,
            "42": 3,
            "43": 7,
            "44": 1,
            "45": 4,
            "46": 11,
            "47": 11
        },
        "hairs": {
            "0": 11,
            "1": 6,
            "2": 5,
            "3": 1,
            "4": 4,
            "5": 8,
            "6": 4,
            "7": 11,
            "8": 9,
            "9": 3,
            "10": 3,
            "11": 6,
            "12": 0,
            "13": 1,
            "14": 0,
            "15": 10,
            "16": 1,
            "17": 8,
            "18": 4,
            "19": 7,
            "20": 5,
            "21": 10,
            "22": 2,
            "23": 3,
            "24": 9,
            "25": 5,
            "26": 3,
            "27": 10,
            "28": 6,
            "29": 11,
            "30": 9,
            "31": 11,
            "32": 0,
            "33": 0,
            "34": 11,
            "35": 9,
            "36": 6,
            "37": 2,
            "38": 1,
            "39": 4,
            "40": 1,
            "41": 7,
            "42": 2,
            "43": 0,
            "44": 3,
            "45": 6,
            "46": 2,
            "47": 1,
            "48": 3,
            "49": 7,
            "50": 7,
            "51": 2,
            "52": 5,
            "53": 7,
            "54": 5,
            "55": 8,
            "56": 9,
            "57": 10,
            "58": 6,
            "59": 8,
            "60": 10,
            "61": 0,
            "62": 11,
            "63": 7,
            "64": 9,
            "65": 8,
            "66": 4,
            "67": 4,
            "68": 10,
            "69": 2,
            "70": 5,
            "71": 8
        }
    },

    // 3DS fields
    faceFeatures3DS: ["None", "Near Eye Creases", "Cheek Creases", "Far Eye Creases", "Near Nose Creases", "Giant Bags", "Cleft Chin", "Chin Crease", "Sunken Eyes", "Far Cheek Creases", "Lines Near Eyes", "Wrinkles"],
    makeups3DS: ["None", "Blush", "Orange Blush", "Blue Eyes", "Blush 2", "Orange Blush 2", "Blue Eyes and Blush", "Orange Eyes and Blush", "Purple Eyes and Blush 2", "Freckles", "Beard Stubble", "Beard and Mustache Stubble"],
    mouthCols3DS: ["Orange", "Red", "Pink", "Peach", "Black"],
    glassesCols3DS: ["Black", "Brown", "Red", "Blue", "Yellow", "Grey"],

    faces: {
        indexLookup: true,
        values: [
            0x00, 0x01, 0x08,
            0x02, 0x03, 0x09,
            0x04, 0x05, 0x0a,
            0x06, 0x07, 0x0b
        ]
    },
    hairs: {
        paginated: true,
        indexLookup: true,
        values: [
            [0x21, 0x2f, 0x28, 0x25, 0x20, 0x6b, 0x30, 0x33, 0x37, 0x46, 0x2c, 0x42],
            [0x34, 0x32, 0x26, 0x31, 0x2b, 0x1f, 0x38, 0x44, 0x3e, 0x73, 0x4c, 0x77],
            [0x40, 0x51, 0x74, 0x79, 0x16, 0x3a, 0x3c, 0x57, 0x7d, 0x75, 0x49, 0x4b],
            [0x2a, 0x59, 0x39, 0x36, 0x50, 0x22, 0x17, 0x56, 0x58, 0x76, 0x27, 0x24],
            [0x2d, 0x43, 0x3b, 0x41, 0x29, 0x1e, 0x0c, 0x10, 0x0a, 0x52, 0x80, 0x81],
            [0x0e, 0x5f, 0x69, 0x64, 0x06, 0x14, 0x5d, 0x66, 0x1b, 0x04, 0x11, 0x6e],
            [0x7b, 0x08, 0x6a, 0x48, 0x03, 0x15, 0x00, 0x62, 0x3f, 0x5a, 0x0b, 0x78],
            [0x05, 0x4a, 0x6c, 0x5e, 0x7c, 0x19, 0x63, 0x45, 0x23, 0x0d, 0x7a, 0x71],
            [0x35, 0x18, 0x55, 0x53, 0x47, 0x83, 0x60, 0x65, 0x1d, 0x07, 0x0f, 0x70],
            [0x4f, 0x01, 0x6d, 0x7f, 0x5b, 0x1a, 0x3d, 0x67, 0x02, 0x4d, 0x12, 0x5c],
            [0x54, 0x09, 0x13, 0x82, 0x61, 0x68, 0x2e, 0x4e, 0x1c, 0x72, 0x7e, 0x6f]
        ]
    },
    eyebrows: {
        indexLookup: true,
        paginated: true,
        values: [
            [0x06, 0x00, 0x0c, 0x01, 0x09, 0x13, 0x07, 0x15, 0x08, 0x11, 0x05, 0x04],
            [0x0b, 0x0a, 0x02, 0x03, 0x0e, 0x14, 0x0f, 0x0d, 0x16, 0x12, 0x10, 0x17]
        ]
    },
    eyes: {
        indexLookup: true,
        paginated: true,
        values: [
            [0x02, 0x04, 0x00, 0x08, 0x27, 0x11, 0x01, 0x1a, 0x10, 0x0f, 0x1b, 0x14],
            [0x21, 0x0b, 0x13, 0x20, 0x09, 0x0c, 0x17, 0x22, 0x15, 0x19, 0x28, 0x23],
            [0x05, 0x29, 0x0d, 0x24, 0x25, 0x06, 0x18, 0x1e, 0x1f, 0x12, 0x1c, 0x2e],
            [0x07, 0x2c, 0x26, 0x2a, 0x2d, 0x1d, 0x03, 0x2b, 0x16, 0x0a, 0x0e, 0x2f],
            [0x30, 0x31, 0x32, 0x35, 0x3b, 0x38, 0x36, 0x3a, 0x39, 0x37, 0x33, 0x34]
        ]
    },
    noses: {
        indexLookup: true,
        paginated: true,
        values: [
            [0x01, 0x0a, 0x02, 0x03, 0x06, 0x00, 0x05, 0x04, 0x08, 0x09, 0x07, 0x0B],
            [0x0d, 0x0e, 0x0c, 0x11, 0x10, 0x0f]
        ]
    },
    mouths: {
        indexLookup: true,
        paginated: true,
        values: [
            [0x17, 0x01, 0x13, 0x15, 0x16, 0x05, 0x00, 0x08, 0x0a, 0x10, 0x06, 0x0d],
            [0x07, 0x09, 0x02, 0x11, 0x03, 0x04, 0x0f, 0x0b, 0x14, 0x12, 0x0e, 0x0c],
            [0x1b, 0x1e, 0x18, 0x19, 0x1d, 0x1c, 0x1a, 0x23, 0x1f, 0x22, 0x21, 0x20]
        ]
    }
};

var convTables={
    face3DSToWii:[0,1,2,2,3,1,4,5,4,6,7,6],
    features3DSToWii:["0","6",5,6,"6",4,7,7,8,10,"6",11],//If typeof===String, choose a makeup in that field's place - there is no suitable replacement. Read the discrepancies in the README for more information.
    makeup3DSToWii:[0,1,1,2,1,1,2,2,2,3,9,9],
    nose3DSToWii:[
        [0,1,2,3,4,5,6,7,8,9,10,11],
        [0,3,4,6,9,2]
    ],
    mouth3DSToWii:[
        ["111","121","131","112","122","132","113","123","133","114","124","134"],
        ["211","221","231","212","222","232","213","223","233","214","224","234"],
        ["121","214","134","123","121","112","124","133","221","224","121","232"]
    ],
    hair3DSToWii:[
        [
            "111","221","121",
            "231","211","121",
            "212","131","233",
            "132","112","222"
        ],
        [
            "232","223","321",
            "123","311","134",
            "114","124","234",
            "114","134","234"
        ],
        [
            "214","523","433",
            "214","531","512",
            "523","433","134",
            "414","523","134"
        ],
        [
            "331","333","324",
            "332","333","334",
            "312","322","322",
            "113","122","313"
        ],
        [
            "113","322","133",
            "333","323","314",
            "411","621","521",
            "424","424","424"
        ],
        [
            "511","411","411",
            "422","522","523",
            "534","523","434",
            "422","533","424"
        ],
        [
            "511","531","534",
            "623","521","524",
            "534","523","523",
            "424","513","523"
        ],
        [
            "411","523","512",
            "513","432","432",
            "621","431","514",
            "421","432","514"
        ],
        [
            "623","614","633",
            "633","633","624",
            "434","633","634",
            "624","624","634"
        ],
        [
            "634","413","412",
            "413","413","412",
            "611","622","632",
            "611","622","632"
        ],
        [
            "423","632","423",
            "612","612","613",
            "631","631","613",
            "631","631","613"
        ]
    ],
    eyebrows3DSToWii:[
        [
            "111","121","131",
            "112","122","132",
            "113","123","133",
            "114","124","134"
        ],
        [
            "211","221","231",
            "212","222","232",
            "213","223","233",
            "214","224","234"
        ]
    ],
    eyes3DSToWii:[
        [
            "111","121","131",
            "112","122","132",
            "113","123","133",
            "114","124","134"
        ],
        [
            "211","221","231",
            "212","222","232",
            "213","223","233",
            "214","224","234"
        ],
        [
            "311","321","331",
            "312","322","332",
            "313","323","333",
            "314","324","334"
        ],
        [
            "411","421","431",
            "412","422","432",
            "413","423","433",
            "414","424","434"
        ],
        [
            "322","322","312",
            "224","224","431",
            "224","224","111",
            "121","411","431"
        ]
    ],
    hairWiiTo3DS:[
        [
            [0,0],[0,2],[0,7],
            [0,10],[3,10],[0,9],
            [4,0],[1,3],[3,8],
            [1,6],[1,7],[1,5]
        ],
        [
            [0,4],[0,1],[0,3],
            [0,6],[0,11],[1,0],
            [2,5],[1,1],[0,8],
            [2,0],[2,6],[1,8]
        ],
        [
            [1,4],[1,2],[3,0],
            [4,0],[3,6],[3,3],
            [3,11],[4,4],[4,3],
            [4,5],[3,2],[3,5]
        ],
        [
            [4,6],[7,9],[7,7],
            [9,5],[5,9],[7,5],
            [9,1],[10,2],[7,0],
            [6,1],[5,8],[8,9]
        ],
        [
            [5,0],[6,4],[2,4],
            [4,8],[5,4],[5,5],
            [6,10],[6,8],[5,10],
            [7,8],[6,5],[6,6]
        ],
        [
            [9,6],[4,7],[10,6],
            [10,1],[9,10],[9,8],
            [10,8],[8,1],[2,0],
            [9,1],[8,9],[8,8]
        ]
    ],
    faceWiiTo3DS:[
        0,1,
        3,4,
        6,7,
        9,10
    ],
    featureWiiTo3DS:[
        0,"1","6",
        "9",5,2,
        3,7,8,
        "10",9,11
    ]
};

const kidNames={
    "Male":[
        "Aaron",
        "Adam",
        "Adrian",
        "Aiden",
        "Ayden",
        "Alex",
        "Alexander",
        "Alfie",
        "Andrew",
        "Anthony",
        "Archie",
        "Austin",
        "Ben",
        "Benjamin",
        "Bentley",
        "Bill",
        "Billy",
        "Blake",
        "Bradley",
        "Brandon",
        "Brayden",
        "Brody",
        "Bryson",
        "Caleb",
        "Callum",
        "Cameron",
        "Carlos",
        "Charlie",
        "Charles",
        "Carson",
        "Carter",
        "Chase",
        "Chris",
        "Christian",
        "Cody",
        "Colton",
        "Connor",
        "Cooper",
        "Damian",
        "Daniel",
        "David",
        "Dexter",
        "Dominic",
        "Dylan",
        "Easton",
        "Edward",
        "Eli",
        "Elijah",
        "Elliot",
        "Ethan",
        "Evan",
        "Finlay",
        "Frankie",
        "Freddie",
        "Gabriel",
        "Gavin",
        "George",
        "Grayson",
        "Harrison",
        "Harvey",
        "Henry",
        "Hudson",
        "Hugo",
        "Hunter",
        "Ian",
        "Isaac",
        "Isaiah",
        "Jace",
        "Jack",
        "Jackson",
        "Jaxon",
        "Jacob",
        "Jake",
        "James",
        "Jason",
        "Jayden",
        "Jenson",
        "Jeremiah",
        "John",
        "Juan",
        "Jonathan",
        "Jordan",
        "Jose",
        "Joseph",
        "Josiah",
        "Joshua",
        "Jude",
        "Julian",
        "Justin",
        "Kai",
        "Kayden",
        "Kevin",
        "Kian",
        "Landon",
        "Levi",
        "Leo",
        "Logan",
        "Lucas",
        "Luke",
        "Luis",
        "Lachlan",
        "Mason",
        "Matthew",
        "Max",
        "Michael",
        "Miguel",
        "Nathan",
        "Nathaniel",
        "Nicholas",
        "Noah",
        "Nolan",
        "Olly",
        "Oliver",
        "Owen",
        "Parker",
        "Philip",
        "Rhys",
        "Reece",
        "Rob",
        "Robert",
        "Ryan",
        "Ryder",
        "Samuel",
        "Sebastian",
        "Seth",
        "Thomas",
        "Tommy",
        "Trent",
        "Tristan",
        "Tyler",
        "William",
        "Liam",
        "Wyatt",
        "Xavier",
        "Zac",
        "Zachary",
        "Alex",
        "Alexis",
        "Angel",
        "Bailey",
        "Darcy",
        "Darcey",
        "Genesis",
        "Kennedy",
        "Mackenzie",
        "Morgan",
        "Peyton",
        "Sam",
        "Taylor"
    ],
    "Female":[
        "Aaliyah",
        "Abigail",
        "Addison",
        "Madison",
        "Maddison",
        "Alexa",
        "Alexandra",
        "Alison",
        "Allison",
        "Alyssa",
        "Amelia",
        "Amy",
        "Andrea",
        "Anna",
        "Annabelle",
        "Aria",
        "Ariana",
        "Arianna",
        "Ashley",
        "Aubree",
        "Aubrey",
        "Audrey",
        "Autumn",
        "Ava",
        "Avery",
        "Bella",
        "Bethany",
        "Brianna",
        "Brooklyn",
        "Camila",
        "Caroline",
        "Charlotte",
        "Chloe",
        "Khloe",
        "Claire",
        "Ella",
        "Ellie",
        "Elenor",
        "Elizabeth",
        "Lizabeth",
        "Liza",
        "Emily",
        "Emma",
        "Eva",
        "Evie",
        "Evelyn",
        "Faith",
        "Gabriella",
        "Gianna",
        "Grace",
        "Hailey",
        "Hannah",
        "Harper",
        "Heidi",
        "Hollie",
        "Holly",
        "Isabella",
        "Isobel",
        "Jasmine",
        "Jessica",
        "Jocelyn",
        "Julia",
        "Katherine",
        "Kayla",
        "Kaylee",
        "Kimberly",
        "Kylie",
        "Lacey",
        "Lauren",
        "Layla",
        "Leah",
        "Lexie",
        "Lilian",
        "Lily",
        "Lola",
        "London",
        "Lucy",
        "Lydia",
        "Madeline",
        "Madelyn",
        "Maisie",
        "Makayla",
        "Maya",
        "Mya",
        "Megan",
        "Melanie",
        "Mia",
        "Molly",
        "Naomi",
        "Natalie",
        "Nevaeh",
        "Olivia",
        "Paige",
        "Poppy",
        "Piper",
        "Reagan",
        "Rebecca",
        "Riley",
        "Rosie",
        "Samantha",
        "Sarah",
        "Savannah",
        "Scarlett",
        "Serenity",
        "Skye",
        "Skylar",
        "Sofia",
        "Sophia",
        "Sophie",
        "Spring",
        "Stella",
        "Summer",
        "Sydney",
        "Trinity",
        "Vanessa",
        "Victoria",
        "Violet",
        "Winter",
        "Zara",
        "Zoe",
        "Zoey",
        "Alex",
        "Alexis",
        "Angel",
        "Bailey",
        "Darcy",
        "Darcey",
        "Genesis",
        "Kennedy",
        "Mackenzie",
        "Morgan",
        "Peyton",
        "Sam",
        "Taylor"
    ]
};

//Defaults
const defaultInstrs={
    wii:{
        male:{
            "col": "On the info page (first tab), set the Favorite Color to Red (1 from the left, top row).",
            "heightWeight": "On the build page (second tab), set the height to 50%, and the weight to 50%.",
            "faceShape": "On the face page (third tab), set the shape to the one 1 from the top, in the left column.",
            "skinCol": "On the face page (third tab), set the color to the one 1 from the left, on the top row.",
            "makeup": "On the face page's makeup tab, set the makeup to \"None\" (the one 1 from the top, and 1 from the left).",
            "hairStyle": "On the hair page (fourth tab), set the hair style to the one 1 from the left, 1 from the top, on page 1.",
            "hairFlipped": "",
            "hairColor": "On the hair page (fourth tab), set the hair color to the one 2 from the left, on the top row.",
            "eyebrowStyle": "On the eyebrow page (fifth tab), set the eyebrow style to the one 1 from the left, 1 from the top, on page 1.",
            "eyebrowColor": "On the eyebrow page (fifth tab), set the eyebrow color to the one 2 from the left, on the top row.",
            "eyebrowY": "",
            "eyebrowSize": "",
            "eyebrowRot": "",
            "eyebrowDist": "",
            "eyeType": "On the eye page (sixth tab), set the eye type to the one 1 from the left, 1 from the top, on page 1.",
            "eyeColor": "On the eye page (sixth tab), set the color to the one 1 from the left, on the top row.",
            "eyeY": "",
            "eyeSize": "",
            "eyeRot": "",
            "eyeDist": "",
            "noseType": "On the nose page (seventh tab), set the nose to the one 1 from the top, and 1 from the left.",
            "noseY": "",
            "noseSize": "",
            "mouthType": "On the mouth page (eighth tab), set the mouth type to the one 1 from the left, 1 from the top, on page 1.",
            "mouthCol": "On the mouth page (eighth tab), set the color to the one 1 from the left.",
            "mouthY": "",
            "mouthSize": "",
            "glasses": "On the glasses page (within the ninth tab), set the glasses to the one 1 from the top, and 1 from the left.",
            "glassesCol": "On the glasses page (within the ninth tab), set the color to the one 1 from the left, on the top row.",
            "glassesY": "",
            "glassesSize": "",
            "stache": "On the mustache page (within the ninth tab), set the mustache to the one on the top-left.",
            "stacheY": "",
            "stacheSize": "",
            "mole": "",
            "moleX": "",
            "moleY": "",
            "moleSize": "",
            "beard": "On the beard page (within the ninth tab), set the beard to the one on the top-left.",
            "beardCol": "On the mustache OR beard pages (within the ninth tab), set the color to the one 1 from the left, on the top row."
        },
        female:{
            "col": "On the info page (first tab), set the Favorite Color to Red (1 from the left, top row).",
            "heightWeight": "On the build page (second tab), set the height to 50%, and the weight to 50%.",
            "faceShape": "On the face page (third tab), set the shape to the one 1 from the top, in the left column.",
            "skinCol": "On the face page (third tab), set the color to the one 1 from the left, on the top row.",
            "makeup": "On the face page's makeup tab, set the makeup to \"None\" (the one 1 from the top, and 1 from the left).",
            "hairStyle": "On the hair page (fourth tab), set the hair style to the one 1 from the left, 1 from the top, on page 4.",
            "hairFlipped": "",
            "hairColor": "On the hair page (fourth tab), set the hair color to the one 2 from the left, on the top row.",
            "eyebrowStyle": "On the eyebrow page (fifth tab), set the eyebrow style to the one 2 from the left, 1 from the top, on page 1.",
            "eyebrowColor": "On the eyebrow page (fifth tab), set the eyebrow color to the one 2 from the left, on the top row.",
            "eyebrowY": "",
            "eyebrowSize": "",
            "eyebrowRot": "",
            "eyebrowDist": "",
            "eyeType": "On the eye page (sixth tab), set the eye type to the one 2 from the left, 1 from the top, on page 1.",
            "eyeColor": "On the eye page (sixth tab), set the color to the one 1 from the left, on the top row.",
            "eyeY": "",
            "eyeSize": "",
            "eyeRot": "On the eye page (sixth tab), press the rotate clockwise button 1 times.",
            "eyeDist": "",
            "noseType": "On the nose page (seventh tab), set the nose to the one 0 from the top, and 1 from the left.",
            "noseY": "",
            "noseSize": "",
            "mouthType": "On the mouth page (eighth tab), set the mouth type to the one 1 from the left, 1 from the top, on page 1.",
            "mouthCol": "On the mouth page (eighth tab), set the color to the one 1 from the left.",
            "mouthY": "",
            "mouthSize": "",
            "glasses": "On the glasses page (within the ninth tab), set the glasses to the one 1 from the top, and 1 from the left.",
            "glassesCol": "On the glasses page (within the ninth tab), set the color to the one 1 from the left, on the top row.",
            "glassesY": "",
            "glassesSize": "",
            "stache": "On the mustache page (within the ninth tab), set the mustache to the one on the top-left.",
            "stacheY": "",
            "stacheSize": "",
            "mole": "",
            "moleX": "",
            "moleY": "",
            "moleSize": "",
            "beard": "On the beard page (within the ninth tab), set the beard to the one on the top-left.",
            "beardCol": "On the mustache OR beard pages (within the ninth tab), set the color to the one 1 from the left, on the top row."
        }
    },
    "3ds":{
        "male":{
            "faceShape": "On the face page (first tab), set the face shape to the one 1 from the top, and 1 from the left.",
            "skinCol": "On the face page (first tab), set the color to the one 1 from the top.",
            "makeup": "On the face page's makeup tab, set the makeup to \"None\" (the one 1 from the top, and 1 from the left).",
            "feature": "On the face page's wrinkles tab, set the facial feature to \"None\" (the one 2 from the top, and 1 from the left).",
            "hairStyle": "On the hair page (second tab), set the hair style to the one 1 from the top, and 1 from the left, on page 1.",
            "hairFlipped": "",
            "hairColor": "On the hair page (second tab), set the hair color to the one 2 from the top.",
            "eyebrowStyle": "On the eyebrow page (third tab), set the eyebrow style to the one 1 from the left, 1 from the top, on page 1.",
            "eyebrowColor": "On the eyebrow page (third tab), set the eyebrow color to the one 2 from the top.",
            "eyebrowY": "",
            "eyebrowSize": "",
            "eyebrowRot": "",
            "eyebrowDist": "",
            "eyebrowSquash": "",
            "eyeType": "On the eye page (fourth tab), set the eye type to the one 1 from the left, 1 from the top, on page 1.",
            "eyeColor": "On the eye page (fourth tab), set the color to the one 1 from the top.",
            "eyeY": "",
            "eyeSize": "",
            "eyeRot": "",
            "eyeDist": "",
            "eyeSquash": "",
            "noseType": "On the nose page (fifth tab), set the nose to the one 1 from the top, and 1 from the left, on page 0.",
            "noseY": "",
            "noseSize": "",
            "mouthType": "On the mouth page (sixth tab), set the mouth type to the one 1 from the left, 1 from the top, on page 1.",
            "mouthCol": "On the mouth page (sixth tab), set the color to the one 1 from the top.",
            "mouthY": "",
            "mouthSize": "",
            "mouthSquash": "",
            "glasses": "On the glasses page (within the seventh tab), set the glasses to the one 1 from the top, and 1 from the left.",
            "glassesCol": "On the glasses page (within the seventh tab), set the color to the one 1 from the top.",
            "glassesY": "",
            "glassesSize": "",
            "stache": "On the mustache page (within the seventh tab), set the mustache to the one on the top-left.",
            "stacheY": "",
            "stacheSize": "",
            "mole": "",
            "moleX": "",
            "moleY": "",
            "moleSize": "",
            "beard": "On the beard page (within the seventh tab), set the beard to the one on the top-left.",
            "beardCol": "On the mustache OR beard pages (within the seventh tab), set the color to the one 1 from the top.",
            "heightWeight": "On the build page (eighth tab), set the height to 50%, and the weight to 50%.",
            "col": "On the info page (after pressing \"Next\"), set the Favorite Color to Red (1 from the left, top row)."
        },
        "female":{
            "faceShape": "On the face page (first tab), set the face shape to the one 1 from the top, and 1 from the left.",
            "skinCol": "On the face page (first tab), set the color to the one 1 from the top.",
            "makeup": "On the face page's makeup tab, set the makeup to \"None\" (the one 1 from the top, and 1 from the left).",
            "feature": "On the face page's wrinkles tab, set the facial feature to \"None\" (the one 2 from the top, and 1 from the left).",
            "hairStyle": "On the hair page (second tab), set the hair style to the one 3 from the top, and 1 from the left, on page 5.",
            "hairFlipped": "",
            "hairColor": "On the hair page (second tab), set the hair color to the one 2 from the top.",
            "eyebrowStyle": "On the eyebrow page (third tab), set the eyebrow style to the one 2 from the left, 1 from the top, on page 1.",
            "eyebrowColor": "On the eyebrow page (third tab), set the eyebrow color to the one 2 from the top.",
            "eyebrowY": "",
            "eyebrowSize": "",
            "eyebrowRot": "",
            "eyebrowDist": "",
            "eyebrowSquash": "",
            "eyeType": "On the eye page (fourth tab), set the eye type to the one 2 from the left, 1 from the top, on page 1.",
            "eyeColor": "On the eye page (fourth tab), set the color to the one 1 from the top.",
            "eyeY": "",
            "eyeSize": "",
            "eyeRot": "",
            "eyeDist": "",
            "eyeSquash": "",
            "noseType": "On the nose page (fifth tab), set the nose to the one 1 from the top, and 1 from the left, on page 0.",
            "noseY": "",
            "noseSize": "",
            "mouthType": "On the mouth page (sixth tab), set the mouth type to the one 1 from the left, 1 from the top, on page 1.",
            "mouthCol": "On the mouth page (sixth tab), set the color to the one 1 from the top.",
            "mouthY": "",
            "mouthSize": "",
            "mouthSquash": "",
            "glasses": "On the glasses page (within the seventh tab), set the glasses to the one 1 from the top, and 1 from the left.",
            "glassesCol": "On the glasses page (within the seventh tab), set the color to the one 1 from the top.",
            "glassesY": "",
            "glassesSize": "",
            "stache": "On the mustache page (within the seventh tab), set the mustache to the one on the top-left.",
            "stacheY": "",
            "stacheSize": "",
            "mole": "",
            "moleX": "",
            "moleY": "",
            "moleSize": "",
            "beard": "On the beard page (within the seventh tab), set the beard to the one on the top-left.",
            "beardCol": "On the mustache OR beard pages (within the seventh tab), set the color to the one 1 from the top.",
            "heightWeight": "On the build page (eighth tab), set the height to 50%, and the weight to 50%.",
            "col": "On the info page (after pressing \"Next\"), set the Favorite Color to Red (1 from the left, top row)."
        }
    }
};

const defaultMii={
    "male":{
        "general": {
            "type":3,
            "birthday": 17,
            "birthMonth": 4,
            "height": 0,
            "weight": 0,
            "gender": 1,
            "favoriteColor": 7
        },
        "meta":{
            "name": "Madison",
            "creatorName": "",
            "console":"3ds",
            "miiId":"148",
            "systemId":"148"
        },
        "perms": {
            "sharing": false,
            "copying": true,
            "fromCheckMiiOut": false,
            "mingle": true
        },
        "hair": {
            "page":0,
            "type":7,
            "color": 7,
            "flipped": false
        },
        "face": {
            "type": 5,
            "color": 0,
            "feature": 0,
            "makeup": 0
        },
        "eyes": {
            "page":0,
            "type": 9,
            "col": 4,
            "size": 1,
            "squash": 3,
            "rotation": 4,
            "distanceApart": 3,
            "yPosition": 11
        },
        "eyebrows": {
            "page":0,
            "type":5,
            "color":7,
            "size": 2,
            "squash": 4,
            "rotation": 4,
            "distanceApart": 4,
            "yPosition": 6
        },
        "nose": {
            "page":1,
            "type":0,
            "size": 0,
            "yPosition": 5
        },
        "mouth": {
            "page":1,
            "type":6,
            "color": 0,
            "size": 2,
            "squash": 3,
            "yPosition": 10
        },
        "beard": {
            "mustache":{
                "type": 0,
                "size": 4,
                "yPosition": 10
            },
            "col": 0,
            "type": 0
        },
        "glasses": {
            "type": 0,
            "color":0,
            "size": 4,
            "yPosition": 10
        },
        "mole": {
            "on": false,
            "size": 4,
            "xPosition": 2,
            "yPosition": 20
        },
        "name": "Madison",
        "creatorName": ""
    },
    "female":{
        "general": {
            "type":3,
            "birthday": 17,
            "birthMonth": 4,
            "height": 0,
            "weight": 0,
            "gender": 1,
            "favoriteColor": 7
        },
        "meta":{
            "name": "Madison",
            "creatorName": "",
            "console":"3ds",
            "miiId":"148",
            "systemId":"148"
        },
        "perms": {
            "sharing": false,
            "copying": true,
            "fromCheckMiiOut": false,
            "mingle": true
        },
        "hair": {
            "page":0,
            "type":7,
            "color": 7,
            "flipped": false
        },
        "face": {
            "type": 5,
            "color": 0,
            "feature": 0,
            "makeup": 0
        },
        "eyes": {
            "page":0,
            "type": 9,
            "col": 4,
            "size": 1,
            "squash": 3,
            "rotation": 4,
            "distanceApart": 3,
            "yPosition": 11
        },
        "eyebrows": {
            "page":0,
            "type":5,
            "color":7,
            "size": 2,
            "squash": 4,
            "rotation": 4,
            "distanceApart": 4,
            "yPosition": 6
        },
        "nose": {
            "page":1,
            "type":0,
            "size": 0,
            "yPosition": 5
        },
        "mouth": {
            "page":1,
            "type":6,
            "color": 0,
            "size": 2,
            "squash": 3,
            "yPosition": 10
        },
        "beard": {
            "mustache":{
                "type": 0,
                "size": 4,
                "yPosition": 10
            },
            "col": 0,
            "type": 0
        },
        "glasses": {
            "type": 0,
            "color":0,
            "size": 4,
            "yPosition": 10
        },
        "mole": {
            "on": false,
            "size": 4,
            "xPosition": 2,
            "yPosition": 20
        },
        "name": "Madison",
        "creatorName": ""
    }
};

// Mii binary helpers
const decoders = {
    number: (value, field) => value + (field.offset || 0),
    boolean: (value, field) => field.invert ? value === 0 : value === 1,
    enum: (value, field) => field.values[value],
    lookup: (value, field, tables) => {
        const table = getNestedProperty(tables, field.lookupTable)
        if (!table) return "ERROR: could not find requested lookup table";

        if (table.indexLookup) {
            if (table.paginated) {
                // Handle paginated (2D array) lookup
                for (let page = 0; page < table.values.length; page++) {
                    for (let index = 0; index < table.values[page].length; index++) {
                        if (table.values[page][index] === value) {
                            return [page, index];
                        }
                    }
                }
                return undefined;
            } else {
                // Handle non-paginated index lookup
                return table.values.indexOf(value);
            }
        } else if (Array.isArray(table)) {
            return table[value];
        } else {
            return table[value.toString()];
        }
    },
    lookupPage: (value, field, tables, type) => {
        const table = getNestedProperty(tables, field.lookupTable)
        if (!table) return "ERROR: could not find requested lookup table";

        if (table.indexLookup) {
            if (table.paginated) {
                // Handle paginated (2D array) lookup
                for (let page = 0; page < table.values.length; page++) {
                    for (let index = 0; index < table.values[page].length; index++) {
                        if (table.values[page][index] === value) {
                            return [page, index][0];
                        }
                    }
                }
                return undefined;
            } else {
                // Handle non-paginated index lookup
                return table.values.indexOf(value);
            }
        } else if (Array.isArray(table)) {
            return table[value];
        } else {
            return table[value.toString()];
        }
    },
    lookupType: (value, field, tables, type) => {
        const table = getNestedProperty(tables, field.lookupTable)
        if (!table) return "ERROR: could not find requested lookup table";

        if (table.indexLookup) {
            if (table.paginated) {
                // Handle paginated (2D array) lookup
                for (let page = 0; page < table.values.length; page++) {
                    for (let index = 0; index < table.values[page].length; index++) {
                        if (table.values[page][index] === value) {
                            return [page, index][1];
                        }
                    }
                }
                return undefined;
            } else {
                // Handle non-paginated index lookup
                return table.values.indexOf(value);
            }
        } else if (Array.isArray(table)) {
            return table[value];
        } else {
            return table[value.toString()];
        }
    },
    color: (value, field, tables) => tables[field.colorArray]?.[value] || value
};

const encoders = {
    number: (value, field) => value - (field.offset || 0),
    boolean: (value, field) => field.invert ? (value ? 0 : 1) : (value ? 1 : 0),
    enum: (value, field) => field.values.indexOf(value),
    lookup: (decodedValue, field, tables) => {
        const table = getNestedProperty(tables, field.lookupTable)
        if (!table) return "ERROR: could not find requested lookup table";

        if (table.indexLookup){
            if (table.paginated) {
                if (!Array.isArray(decodedValue) || decodedValue.length !== 2) {
                    return undefined;
                }
                const [page, index] = decodedValue;
                if (page >= 0 && page < table.values.length && index >= 0 && index < table.values[page].length) {
                    return table.values[page][index];
                }
                return undefined;
            } else {
                return table.values[decodedValue];
            }
        } else if (Array.isArray(table)) {
            const index = table.indexOf(decodedValue);
            return index !== -1 ? index : undefined;
        } else {
            // Handle object lookup
            for (const [key, val] of Object.entries(table)) {
                if (val === decodedValue) return parseInt(key);
            }
            return undefined;
        }
    }, 
    color: (value, field, T) => {
        const arr = T[field.colorArray];
        return arr?.indexOf(value) ?? value;
    },
};

// Decoding system
function decodeString(data, field) {
    let result = "";
    const maxLength = field.maxLength || 10;
    
    for (let i = 0; i < maxLength; i++) {
        const charOffset = field.byteOffset + (i * 2);
        if (charOffset + 1 < data.length) {
            const char1 = data[charOffset];
            const char2 = data[charOffset + 1];
            if (char1 === 0 && char2 === 0) break;
            result += String.fromCharCode(field.endianness == "little" ? char1 : char2);
        }
    }
    return result.replace(/\x00/g, "");
}

function encodeString(str, field) {
    const result = [];
    const maxLength = field.maxLength || 10;

    for (let i = 0; i < maxLength; i++) {
        const code = i < str.length ? str.charCodeAt(i) : 0;

        if (field.endianness == "little") {
            result.push(code); // Low byte
            result.push(0); // High byte
        } else {
            result.push(0); // High byte
            result.push(code); // Low byte
        }
    }
    return result;
}

function extractMultiBits(data, bitSpecs, isBigEndian = true) {
    let result = 0;
    let totalBitsProcessed = 0;

    // Process bit specs in order (they should be ordered from most significant to least significant)
    for (const spec of bitSpecs) {
        const bits = extractBits(data, spec.byteOffset, spec.bitOffset, spec.bitLength, isBigEndian);
        result = (result << spec.bitLength) | bits;
        totalBitsProcessed += spec.bitLength;
    }

    return result;
}

function setMultiBits(buffer, bitSpecs, value) {
    let remainingValue = value;
    
    // Process specs in reverse order (from least significant to most significant)
    for (let i = bitSpecs.length - 1; i >= 0; i--) {
        const spec = bitSpecs[i];
        const mask = (1 << spec.bitLength) - 1;
        const bitsToSet = remainingValue & mask;
        
        setBits(buffer, spec.byteOffset, spec.bitOffset, spec.bitLength, bitsToSet);
        remainingValue >>>= spec.bitLength;
    }
}

function extractBits(data, byteOffset, bitOffset, bitLength, isBigEndian = true) {
    const totalBitOffset = byteOffset * 8 + bitOffset;
    const startByte = Math.floor(totalBitOffset / 8);
    const endByte = Math.floor((totalBitOffset + bitLength - 1) / 8);

    let value = 0;
    
    if (isBigEndian) {
        // Big endian: process bytes left to right (original behavior)
        for (let i = startByte; i <= endByte; i++) {
            if (i < data.length) {
                value = (value << 8) | data[i];
            }
        }
    } else {
        // Little endian: process bytes right to left
        for (let i = endByte; i >= startByte; i--) {
            if (i < data.length) {
                value = (value << 8) | data[i];
            }
        }
    }
    
    const rightShift = (endByte - startByte + 1) * 8 - (totalBitOffset % 8) - bitLength;
    value >>>= rightShift;
    
    const mask = (1 << bitLength) - 1;
    return value & mask;
}

function setBits(buffer, byteOffset, bitOffset, bitLength, value) {
    // Calculate the absolute bit position from the start
    const absoluteBitPos = byteOffset * 8 + bitOffset;

    // Process each bit of the value
    for (let i = 0; i < bitLength; i++) {
        const currentBitPos = absoluteBitPos + i;
        const currentByteIndex = Math.floor(currentBitPos / 8);
        const currentBitInByte = currentBitPos % 8;

        // Extract the bit from the value (MSB first)
        const bitValue = (value >> (bitLength - 1 - i)) & 1;

        // Create mask for this specific bit position
        const mask = 1 << (7 - currentBitInByte);

        if (bitValue) {
            // Set the bit
            buffer[currentByteIndex] |= mask;
        } else {
            // Clear the bit
            buffer[currentByteIndex] &= ~mask;
        }
    }
}

function setNestedProperty(obj, path, value) {
    // Allows to reference nested properties in extraction schemas with "name.subcategory.suboption" 
    const keys = path.split('.');
    let current = obj;
    
    for (let i = 0; i < keys.length - 1; i++) {
        if (!(keys[i] in current)) {
            current[keys[i]] = {};
        }
        current = current[keys[i]];
    }
    
    current[keys[keys.length - 1]] = value;
}

function getNestedProperty(obj, path) {
    // See `setNestedProperty` comment
    return path.split('.').reduce((current, key) => current?.[key], obj);
}

function miiBufferToJson(data, schema, lookupTables = {}, isBigEndian = true) {
    const result = {};

    for (const [fieldPath, fieldDef] of Object.entries(schema)) {
        let value;

        if (fieldDef.type === 'string') {
            value = decodeString(data, fieldDef);
        } else if (fieldDef.bitSpecs) {
            // Handle multi-byte fields with non-contiguous bits
            value = extractMultiBits(data, fieldDef.bitSpecs, isBigEndian);
        } else {
            // Handle standard contiguous bit fields
            value = extractBits(data, fieldDef.byteOffset, fieldDef.bitOffset, fieldDef.bitLength, isBigEndian);
        }

        // Apply decoder
        if (fieldDef.decoder && typeof decoders !== 'undefined' && decoders[fieldDef.decoder]) {
            value = decoders[fieldDef.decoder](value, fieldDef, lookupTables);
        }

        setNestedProperty(result, fieldPath, value);
    }

    return result;
}

function jsonToMiiBuffer(miiData, schema, lookupTables = {}, totalBytes = 74) {
    const buffer = new Array(totalBytes).fill(0);

    for (const [fieldPath, fieldDef] of Object.entries(schema)) {
        let raw = getNestedProperty(miiData, fieldPath);

        // Run encoders
        if (fieldDef.decoder && typeof encoders !== 'undefined' && encoders[fieldDef.decoder]) {
            raw = encoders[fieldDef.decoder](raw, fieldDef, lookupTables);
        }

        if (fieldDef.type === 'string') {
            const bytes = encodeString(raw, fieldDef);
            for (let i = 0; i < bytes.length; i++) {
                buffer[fieldDef.byteOffset + i] = bytes[i];
            }
        } else if (fieldDef.bitSpecs) {
            // Handle multi-byte fields with non-contiguous bits
            setMultiBits(buffer, fieldDef.bitSpecs, raw);
        } else {
            // Handle standard contiguous bit fields
            setBits(buffer, fieldDef.byteOffset, fieldDef.bitOffset, fieldDef.bitLength, raw);
        }
    }

    return Buffer.from(buffer);
}

const WII_MII_SCHEMA = {
    'general.gender': { byteOffset: 0x00, bitOffset: 1, bitLength: 1, decoder: 'number' },
    'general.birthMonth': { byteOffset: 0x00, bitOffset: 2, bitLength: 4, decoder: 'number' },
    'general.birthday': { byteOffset: 0x00, bitOffset: 6, bitLength: 5, decoder: 'number' },
    'general.favoriteColor': { byteOffset: 0x01, bitOffset: 3, bitLength: 4, decoder: 'number' },
    'meta.name': { type: 'string', byteOffset: 0x03, maxLength: 10, endianness: "little" },
    'meta.creatorName': { type: 'string', byteOffset: 0x37, maxLength: 10, endianness: "little" },
    'general.height': { byteOffset: 0x16, bitOffset: 0, bitLength: 8, decoder: 'number' },
    'general.weight': { byteOffset: 0x17, bitOffset: 0, bitLength: 8, decoder: 'number' },
    'perms.mingle': { byteOffset: 0x21, bitOffset: 5, bitLength: 1, decoder: 'boolean', invert: true },
    'perms.fromCheckMiiOut': { byteOffset: 0x21, bitOffset: 7, bitLength: 1, decoder: 'boolean' },
    'face.type': { byteOffset: 0x20, bitOffset: 0, bitLength: 3, decoder: 'number' },
    'face.color': { byteOffset: 0x20, bitOffset: 3, bitLength: 3, decoder: 'number' },
    'face.feature': { byteOffset: 0x20, bitOffset: 6, bitLength: 4, decoder: 'number' },
    'hair.page': { byteOffset: 0x22, bitOffset: 0, bitLength: 7, decoder: 'lookup', lookupTable: 'hairs' },
    'hair.type': { byteOffset: 0x22, bitOffset: 0, bitLength: 7, decoder: 'lookup', lookupTable: 'types.hairs' },
    'hair.color': { byteOffset: 0x22, bitOffset: 7, bitLength: 3, decoder: 'number' },
    'hair.flipped': { byteOffset: 0x23, bitOffset: 2, bitLength: 1, decoder: 'boolean' },
    'eyebrows.page': { byteOffset: 0x24, bitOffset: 0, bitLength: 5, decoder: 'lookup', lookupTable: 'pages.eyebrows' },
    'eyebrows.type': { byteOffset: 0x24, bitOffset: 0, bitLength: 5, decoder: 'lookup', lookupTable: 'types.eyebrows' },
    'eyebrows.rotation': { byteOffset: 0x24, bitOffset: 6, bitLength: 4, decoder: 'number' },
    'eyebrows.color': { byteOffset: 0x26, bitOffset: 0, bitLength: 3, decoder: 'number' },
    'eyebrows.size': { byteOffset: 0x26, bitOffset: 3, bitLength: 4, decoder: 'number' },
    'eyebrows.yPosition': { byteOffset: 0x26, bitOffset: 7, bitLength: 5, decoder: 'number', offset: -3 },
    'eyebrows.distanceApart': { byteOffset: 0x27, bitOffset: 4, bitLength: 4, decoder: 'number' },
    'eyes.page': { byteOffset: 0x28, bitOffset: 0, bitLength: 6, decoder: 'lookup', lookupTable: 'pages.eyes' },
    'eyes.type': { byteOffset: 0x28, bitOffset: 0, bitLength: 6, decoder: 'lookup', lookupTable: 'types.eyes' },
    'eyes.rotation': { byteOffset: 0x29, bitOffset: 0, bitLength: 3, decoder: 'number' },
    'eyes.yPosition': { byteOffset: 0x29, bitOffset: 3, bitLength: 5, decoder: 'number' },
    'eyes.color': { byteOffset: 0x2A, bitOffset: 0, bitLength: 3, decoder: 'number' },
    'eyes.size': { byteOffset: 0x2A, bitOffset: 4, bitLength: 3 },
    'eyes.distanceApart': { byteOffset: 0x2A, bitOffset: 7, bitLength: 4, decoder: 'number' },
    'nose.type': { byteOffset: 0x2C, bitOffset: 0, bitLength: 4, decoder: 'lookup', lookupTable: 'wiiNoses' },
    'nose.size': { byteOffset: 0x2C, bitOffset: 4, bitLength: 4, decoder: 'number' },
    'nose.yPosition': { byteOffset: 0x2D, bitOffset: 0, bitLength: 5, decoder: 'number' },
    'mouth.page': { byteOffset: 0x2E, bitOffset: 0, bitLength: 5, decoder: 'lookup', lookupTable: 'pages.mouths' },
    'mouth.type': { byteOffset: 0x2E, bitOffset: 0, bitLength: 5, decoder: 'lookup', lookupTable: 'types.mouths' },
    'mouth.color': { byteOffset: 0x2E, bitOffset: 5, bitLength: 2, decoder: 'number' },
    'mouth.size': { byteOffset: 0x2E, bitOffset: 7, bitLength: 4, decoder: 'number' },
    'mouth.yPosition': { byteOffset: 0x2F, bitOffset: 3, bitLength: 5, decoder: 'number' },
    'glasses.type': { byteOffset: 0x30, bitOffset: 0, bitLength: 4, decoder: 'number' },
    'glasses.color': { byteOffset: 0x30, bitOffset: 4, bitLength: 3, decoder: 'number' },
    'glasses.size': { byteOffset: 0x31, bitOffset: 0, bitLength: 3, decoder: 'number' },
    'glasses.yPosition': { byteOffset: 0x31, bitOffset: 3, bitLength: 5, decoder: 'number' },
    'beard.mustache.type': { byteOffset: 0x32, bitOffset: 0, bitLength: 2, decoder: 'number' },
    'beard.type': { byteOffset: 0x32, bitOffset: 2, bitLength: 2, decoder: 'number' },
    'beard.color': { byteOffset: 0x32, bitOffset: 4, bitLength: 3, decoder: 'number' },
    'beard.mustache.size': { byteOffset: 0x32, bitOffset: 7, bitLength: 4, decoder: 'number' },
    'beard.mustache.yPosition': { byteOffset: 0x33, bitOffset: 3, bitLength: 5, decoder: 'number' },
    'mole.on': { byteOffset: 0x34, bitOffset: 0, bitLength: 1, decoder: 'boolean' },
    'mole.size': { byteOffset: 0x34, bitOffset: 1, bitLength: 4, decoder: 'number' },
    'mole.yPosition': { byteOffset: 0x34, bitOffset: 5, bitLength: 5, decoder: 'number' },
    'mole.xPosition': { byteOffset: 0x35, bitOffset: 2, bitLength: 5, decoder: 'number' }
};

const THREEDS_MII_SCHEMA = {
    'general.birthday': {
        bitSpecs: [
            { byteOffset: 0x19, bitOffset: 6, bitLength: 2 },
            { byteOffset: 0x18, bitOffset: 0, bitLength: 3 }
        ],
        decoder: 'number'
    },
    'general.birthMonth': { byteOffset: 0x18, bitOffset: 3, bitLength: 4, decoder: 'number' },
    'general.gender': { byteOffset: 0x18, bitOffset: 7, bitLength: 1, decoder: 'number' },
    'general.favoriteColor': { byteOffset: 0x19, bitOffset: 2, bitLength: 4, decoder: 'number' },
    'meta.name': { type: 'string', byteOffset: 0x1A, maxLength: 10, endianness: "little" },
    'meta.creatorName': { type: 'string', byteOffset: 0x48, maxLength: 10, endianness: "little" },
    'general.height': { byteOffset: 0x2E, bitOffset: 0, bitLength: 8, decoder: 'number' },
    'general.weight': { byteOffset: 0x2F, bitOffset: 0, bitLength: 8, decoder: 'number' },
    'perms.sharing': { byteOffset: 0x30, bitOffset: 7, bitLength: 1, decoder: 'boolean', invert: true },
    'perms.copying': { byteOffset: 0x01, bitOffset: 7, bitLength: 1, decoder: 'boolean' },
    'face.type': { byteOffset: 0x30, bitOffset: 3, bitLength: 4, decoder: 'lookup', lookupTable: 'faces' },
    'face.color': { byteOffset: 0x30, bitOffset: 0, bitLength: 3, decoder: 'number' },
    'face.feature': { byteOffset: 0x31, bitOffset: 4, bitLength: 4, decoder: 'number' },
    'face.makeup': { byteOffset: 0x31, bitOffset: 0, bitLength: 4, decoder: 'number' },
    'hair.page': { byteOffset: 0x32, bitOffset: 0, bitLength: 8, decoder: 'lookupPage', lookupTable: 'hairs' },//qk
    'hair.type': { byteOffset: 0x32, bitOffset: 0, bitLength: 8, decoder: 'lookupType', lookupTable: 'hairs' },//qk
    'hair.color': { byteOffset: 0x33, bitOffset: 5, bitLength: 3, decoder: 'number' },
    'hair.flipped': { byteOffset: 0x33, bitOffset: 4, bitLength: 1, decoder: 'boolean' },
    'eyes.page': { byteOffset: 0x34, bitOffset: 2, bitLength: 6, decoder: 'lookupPage', lookupTable: 'eyes' },//qk
    'eyes.type': { byteOffset: 0x34, bitOffset: 2, bitLength: 6, decoder: 'lookupType', lookupTable: 'eyes' },//qk
    'eyes.color': { 
        bitSpecs: [
            { byteOffset: 0x35, bitOffset: 7, bitLength: 1 },
            { byteOffset: 0x34, bitOffset: 0, bitLength: 2 }
        ],
        decoder: 'number'
    },
    'eyes.size': { byteOffset: 0x35, bitOffset: 3, bitLength: 4, decoder: 'number' },
    'eyes.squash': { byteOffset: 0x35, bitOffset: 0, bitLength: 3, decoder: 'number' },
    'eyes.rotation': { byteOffset: 0x36, bitOffset: 3, bitLength: 5, decoder: 'number' },
    'eyes.distanceApart': { 
        bitSpecs: [
            { byteOffset: 0x37, bitOffset: 7, bitLength: 1 },
            { byteOffset: 0x36, bitOffset: 0, bitLength: 3 }
        ],
        decoder: 'number' 
    },
    'eyes.yPosition': { byteOffset: 0x37, bitOffset: 2, bitLength: 5, decoder: 'number' },
    'eyebrows.page': { byteOffset: 0x38, bitOffset: 3, bitLength: 5, decoder: 'lookupPage', lookupTable: 'eyebrows' },//qk
    'eyebrows.type': { byteOffset: 0x38, bitOffset: 3, bitLength: 5, decoder: 'lookupType', lookupTable: 'eyebrows' },//qk
    'eyebrows.color': { byteOffset: 0x38, bitOffset: 0, bitLength: 3, decoder: 'number' },
    'eyebrows.size': { byteOffset: 0x39, bitOffset: 4, bitLength: 4, decoder: 'number' },
    'eyebrows.squash': { byteOffset: 0x39, bitOffset: 1, bitLength: 3, decoder: 'number' },
    'eyebrows.rotation': { byteOffset: 0x3A, bitOffset: 4, bitLength: 4, decoder: 'number' },
    'eyebrows.distanceApart': {
        bitSpecs: [
            { byteOffset: 0x3B, bitOffset: 7, bitLength: 1 },
            { byteOffset: 0x3A, bitOffset: 0, bitLength: 3 }
        ],
        decoder: 'number'
    },
    'eyebrows.yPosition': { byteOffset: 0x3B, bitOffset: 2, bitLength: 5, decoder: 'number', offset: -3 },
    'nose.page': { byteOffset: 0x3C, bitOffset: 3, bitLength: 5, decoder: 'lookupPage', lookupTable: 'noses' },//qk
    'nose.type': { byteOffset: 0x3C, bitOffset: 3, bitLength: 5, decoder: 'lookupType', lookupTable: 'noses' },//qk
    'nose.size': {
        bitSpecs: [
            { byteOffset: 0x3D, bitOffset: 7, bitLength: 1 },
            { byteOffset: 0x3C, bitOffset: 0, bitLength: 3 }
        ],
        decoder: 'number'
    },
    'nose.yPosition': { byteOffset: 0x3D, bitOffset: 2, bitLength: 5, decoder: 'number' },
    'mouth.page': { byteOffset: 0x3E, bitOffset: 2, bitLength: 6, decoder: 'lookupPage', lookupTable: 'mouths' },//qk
    'mouth.type': { byteOffset: 0x3E, bitOffset: 2, bitLength: 6, decoder: 'lookupType', lookupTable: 'mouths' },//qk
    'mouth.color': {
        bitSpecs: [
            { byteOffset: 0x3F, bitOffset: 7, bitLength: 1 },
            { byteOffset: 0x3E, bitOffset: 0, bitLength: 2 }
        ],
        decoder: 'number'
    },
    'mouth.size': { byteOffset: 0x3F, bitOffset: 3, bitLength: 4, decoder: 'number' },
    'mouth.squash': { byteOffset: 0x3F, bitOffset: 0, bitLength: 3, decoder: 'number' },
    'mouth.yPosition': { byteOffset: 0x40, bitOffset: 3, bitLength: 5, decoder: 'number' },
    'beard.mustache.type': { byteOffset: 0x40, bitOffset: 0, bitLength: 3, decoder: 'number' },
    'beard.type': { byteOffset: 0x42, bitOffset: 5, bitLength: 3, decoder: 'number' },
    'beard.color': { byteOffset: 0x42, bitOffset: 2, bitLength: 3, decoder: 'number' },
    'beard.mustache.size': {
        bitSpecs: [
            { byteOffset: 0x43, bitOffset: 6, bitLength: 2 },
            { byteOffset: 0x42, bitOffset: 0, bitLength: 2 }
        ],
        decoder: 'number'
    },
    'beard.mustache.yPosition': { byteOffset: 0x43, bitOffset: 1, bitLength: 5, decoder: 'number' },
    'glasses.type': { byteOffset: 0x44, bitOffset: 4, bitLength: 4, decoder: 'number' },
    'glasses.color': { byteOffset: 0x44, bitOffset: 1, bitLength: 3, decoder: 'number' },
    'glasses.size': {
        bitSpecs: [
            { byteOffset: 0x45, bitOffset: 5, bitLength: 3 },
            { byteOffset: 0x44, bitOffset: 0, bitLength: 1 }
        ],
        decoder: 'number'
    },
    'glasses.yPosition': { byteOffset: 0x45, bitOffset: 0, bitLength: 5, decoder: 'number' },
    'mole.on': { byteOffset: 0x46, bitOffset: 7, bitLength: 1, decoder: 'boolean' },
    'mole.size': { byteOffset: 0x46, bitOffset: 3, bitLength: 4, decoder: 'number' },
    'mole.xPosition': {
        bitSpecs: [
            { byteOffset: 0x47, bitOffset: 6, bitLength: 2 },
            { byteOffset: 0x46, bitOffset: 0, bitLength: 3 }
        ],
        decoder: 'number'
    },
    'mole.yPosition': { byteOffset: 0x47, bitOffset: 1, bitLength: 5, decoder: 'number' },
};

//Functions for working with the Miis
function encodeStudio(mii) {
    var n = 0;
    var eo;
    var dest = byteToString(n);
    for (var i = 0; i < mii.length; i++) {
        eo = (7 + (mii[i] ^ n)) & 0xFF;
        n = eo;
        dest += byteToString(eo);
    }
    return dest;
}
function convertMii(jsonIn,typeTo){
    typeFrom=jsonIn.console?.toLowerCase();
    if(typeFrom==null||typeTo===typeFrom){
        return jsonIn;
    }
    let mii=jsonIn;
    var miiTo={};
    if(["wii u","3ds"].includes(typeFrom)){
        miiTo={
            info:{},
            face:{},
            nose:{},
            mouth:{},
            mole:{},
            hair:{},
            eyebrows:{},
            eyes:{},
            glasses:{},
            facialHair:{}
        };
        miiTo.creatorName=mii.creatorName;
        miiTo.info.creatorName=miiTo.creatorName;
        miiTo.name=mii.name;
        miiTo.info.name=miiTo.name;
        miiTo.info.gender=mii.info.gender;
        miiTo.info.systemId="ffffffff";
        let miiId;
        switch(mii.info.type){
            case "Special":
                miiId="01000110";
            break;
            case "Foreign":
                miiId="11000110";
            break;
            default:
                miiId="10001001";
            break;
        }
        for(var i=0;i<3;i++){
            miiId+=Math.floor(Math.random()*255).toString(2).padStart(8,"0");
        }
        miiTo.info.miiId+=miiId;
        miiTo.info.mingle=mii.perms.copying;
        miiTo.info.birthMonth=mii.info.birthMonth;
        miiTo.info.birthday=mii.info.birthday;
        miiTo.info.favColor=mii.info.favColor;
        miiTo.info.favorited=false;
        miiTo.info.height=mii.info.height;
        miiTo.info.weight=mii.info.weight;
        miiTo.info.downloadedFromCheckMiiOut=false;
        miiTo.face.shape=convTables.face3DSToWii[mii.face.shape];
        miiTo.face.col=mii.face.col;
        //We prioritize Facial Features here because the Wii supports more of those than they do Makeup types, and is more likely to apply. The 3DS has two separate fields, so you can have makeup and wrinkles applied at the same time. The Wii only has one that covers both.
        if(typeof(convTables.features3DSToWii[faceFeatures3DS.indexOf(mii.face.feature)])==='string'){
            miiTo.face.feature=wiiFaceFeatures[convTables.makeup3DSToWii[makeups3DS.indexOf(mii.face.makeup)]];
        }
        else{
            miiTo.face.feature=wiiFaceFeatures[convTables.features3DSToWii[features3DS.indexOf(mii.face.feature)]];
        }
        miiTo.nose.type=convTables.nose3DSToWii[mii.nose.type[0]][mii.nose.type[1]];
        miiTo.nose.size=mii.nose.size;
        miiTo.nose.yPos=mii.nose.yPos;
        miiTo.mouth.type=convTables.mouth3DSToWii[mii.mouth.type[0]][mii.mouth.type[1]];
        miiTo.mouth.col=wiiMouthColors[mouthCols3DS.indexOf(mii.mouth.col)>2?0:mouthCols3DS.indexOf(mii.mouth.col)];
        miiTo.mouth.size=mii.mouth.size;
        miiTo.mouth.yPos=mii.mouth.yPos;
        miiTo.mole=mii.mole;
        miiTo.hair.col=mii.hair.col;
        miiTo.hair.flipped=mii.hair.flipped;
        miiTo.hair.type=convTables.hair3DSToWii[mii.hair.style[0]][mii.hair.style[1]];
        miiTo.eyebrows.type=convTables.eyebrows3DSToWii[mii.eyebrows.style[0]][mii.eyebrows.style[1]];
        miiTo.eyebrows.col=mii.eyebrows.col;
        miiTo.eyebrows.rotation=mii.eyebrows.rot;
        miiTo.eyebrows.size=mii.eyebrows.size;
        miiTo.eyebrows.yPos=mii.eyebrows.yPos;
        miiTo.eyebrows.distApart=mii.eyebrows.distApart;
        miiTo.eyes.type=convTables.eyes3DSToWii[mii.eyes.type[0]][mii.eyes.type[1]];
        miiTo.eyes.rotation=mii.eyes.rot;
        miiTo.eyes.yPos=mii.eyes.yPos;
        miiTo.eyes.col=mii.eyes.col;
        miiTo.eyes.size=mii.eyes.size;
        miiTo.eyes.distApart=mii.eyes.distApart;
        miiTo.glasses=mii.glasses;
        miiTo.glasses.col=wiiGlassesCols[glassesCols3DS.indexOf(mii.glasses.col)];
        miiTo.facialHair=mii.facialHair;
        if(miiTo.facialHair.mustacheType===4){
            miiTo.facialHair.mustacheType=2;
        }
        else if(miiTo.facialHair.mustacheType===5){
            miiTo.facialHair.mustacheType=0;
            miiTo.facialHair.beardType=1;
        }
        if(mii.facialHair.beardType>3){
            mii.facialHair.beardType=3;
        }
        miiTo.console="wii";
    }
    else if(typeFrom==="wii"){
        miiTo={
            info:{},
            perms:{},
            hair:{},
            face:{},
            eyes:{},
            eyebrows:{},
            nose:{},
            mouth:{},
            facialHair:{},
            glasses:{},
            mole:{}
        };
        miiTo.info.birthday=mii.info.birthday;
        miiTo.info.birthMonth=mii.info.birthMonth;
        miiTo.name=mii.name;
        miiTo.info.name=miiTo.name;
        miiTo.creatorName=mii.creatorName;
        miiTo.info.creatorName=mii.creatorName;
        miiTo.info.height=mii.info.height;
        miiTo.info.weight=mii.info.weight;
        miiTo.info.favColor=mii.info.favColor;
        miiTo.info.gender=mii.info.gender;
        miiTo.perms.sharing=mii.info.mingle;
        miiTo.perms.copying=mii.info.mingle;
        miiTo.hair.col=hairCols[hairCols.indexOf(mii.hair.col)];
        miiTo.hair.flipped=mii.hair.flipped;
        miiTo.hair.style=convTables.hairWiiTo3DS[+mii.hair.type[0]-1][0+(3*(+mii.hair.type[2]-1))+(+mii.hair.type[1]-1)];
        miiTo.face.shape=convTables.faceWiiTo3DS[mii.face.shape];
        miiTo.face.col=skinCols[skinCols.indexOf(mii.face.col)];
        miiTo.face.makeup="None";
        miiTo.face.feature="None";
        if(typeof(convTables.featureWiiTo3DS[wiiFaceFeatures.indexOf(mii.face.feature)])==='string'){
            miiTo.face.makeup=makeups3DS[+convTables.featureWiiTo3DS[wiiFaceFeatures.indexOf(mii.face.feature)]];
        }
        else{
            miiTo.face.feature=faceFeatures3DS[convTables.featureWiiTo3DS[wiiFaceFeatures.indexOf(mii.face.feature)]];
        }
        miiTo.eyes.col=eyeCols[eyeCols.indexOf(mii.eyes.col)];
        miiTo.eyes.type=[+mii.eyes.type[0]-1,(+mii.eyes.type[1]-1)+(3*(+mii.eyes.type[2]-1))];
        miiTo.eyes.size=mii.eyes.size;
        miiTo.eyes.squash=3;
        miiTo.eyes.rot=mii.eyes.rotation;
        miiTo.eyes.distApart=mii.eyes.distApart;
        miiTo.eyes.yPos=mii.eyes.yPos;
        miiTo.eyebrows.style=[+mii.eyebrows.type[0]-1,(+mii.eyebrows.type[1]-1)+(3*(+mii.eyebrows.type[2]-1))];
        miiTo.eyebrows.col=hairCols[hairCols.indexOf(mii.eyebrows.col)];
        miiTo.eyebrows.size=mii.eyebrows.size;
        miiTo.eyebrows.squash=3;
        miiTo.eyebrows.rot=mii.eyebrows.rotation;
        miiTo.eyebrows.distApart=mii.eyebrows.distApart;
        miiTo.eyebrows.yPos=mii.eyebrows.yPos;
        miiTo.nose.type=[0,mii.nose.type];
        miiTo.nose.size=mii.nose.size;
        miiTo.nose.yPos=mii.nose.yPos;
        miiTo.mouth.type=[+mii.mouth.type[0]-1,(+mii.mouth.type[1]-1)+(3*(+mii.mouth.type[2]-1))];
        miiTo.mouth.col=mouthCols3DS[wiiMouthColors.indexOf(mii.mouth.col)];
        miiTo.mouth.size=mii.mouth.size;
        miiTo.mouth.squash=3;
        miiTo.mouth.yPos=mii.mouth.yPos;
        miiTo.facialHair.mustacheType=mii.facialHair.mustacheType;
        miiTo.facialHair.beardType=mii.facialHair.beardType;
        miiTo.facialHair.col=hairCols[hairCols.indexOf(mii.facialHair.col)];
        miiTo.facialHair.mustacheSize=mii.facialHair.mustacheSize;
        miiTo.facialHair.mustacheYPos=mii.facialHair.mustacheYPos;
        miiTo.glasses.type=mii.glasses.type;
        miiTo.glasses.col=glassesCols3DS[["Grey","Brown","Red","Blue","Yellow","White"].indexOf(mii.glasses.col)];
        miiTo.glasses.size=mii.glasses.size;
        miiTo.glasses.yPos=mii.glasses.yPos;
        miiTo.mole.on=mii.mole.on;
        miiTo.mole.size=mii.mole.size;
        miiTo.mole.xPos=mii.mole.xPos;
        miiTo.mole.yPos=mii.mole.yPos;
        miiTo.console="3ds";
    }
    return miiTo;
}
function convertMiiToStudio(jsonIn) {
    if (!["3ds", "wii u"].includes(jsonIn.console?.toLowerCase())) {
        jsonIn = convertMii(jsonIn);
    }
    var mii = jsonIn;
    var studioMii = new Uint8Array([0x08, 0x00, 0x40, 0x03, 0x08, 0x04, 0x04, 0x02, 0x02, 0x0c, 0x03, 0x01, 0x06, 0x04, 0x06, 0x02, 0x0a, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x08, 0x04, 0x00, 0x0a, 0x01, 0x00, 0x21, 0x40, 0x04, 0x00, 0x02, 0x14, 0x03, 0x13, 0x04, 0x17, 0x0d, 0x04, 0x00, 0x0a, 0x04, 0x01, 0x09]);
    studioMii[0x16] = mii.info.gender === "Male" ? 0 : 1;
    studioMii[0x15] = lookupTables.favCols.indexOf(mii.info.favColor);
    studioMii[0x1E] = mii.info.height;
    studioMii[2] = mii.info.weight;
    studioMii[0x13] = lookupTables.faces.values[mii.face.shape];
    studioMii[0x11] = lookupTables.skinCols.indexOf(mii.face.col);
    studioMii[0x14] = lookupTables.faceFeatures3DS.indexOf(mii.face.feature);
    studioMii[0x12] = lookupTables.makeups3DS.indexOf(mii.face.makeup);
    studioMii[0x1D] = lookupTables.hairs.values[mii.hair.style[0]][mii.hair.style[1]];
    studioMii[0x1B] = lookupTables.hairCols.indexOf(mii.hair.col);
    if (!studioMii[0x1B]) studioMii[0x1B] = 8;
    studioMii[0x1C] = mii.hair.flipped ? 1 : 0;
    studioMii[7] = lookupTables.eyes.values[mii.eyes.type[0]][mii.eyes.type[1]];
    studioMii[4] = lookupTables.eyeCols.indexOf(mii.eyes.col) + 8;
    studioMii[6] = mii.eyes.size;
    studioMii[3] = mii.eyes.squash;
    studioMii[5] = mii.eyes.rot;
    studioMii[8] = mii.eyes.distApart;
    studioMii[9] = mii.eyes.yPos;
    studioMii[0xE] = lookupTables.eyebrows.values[mii.eyebrows.style[0]][mii.eyebrows.style[1]];
    studioMii[0xB] = lookupTables.hairCols.indexOf(mii.eyebrows.col);
    if (!studioMii[0xB]) studioMii[0xB] = 8;
    studioMii[0xD] = mii.eyebrows.size;
    studioMii[0xA] = mii.eyebrows.squash;
    studioMii[0xC] = mii.eyebrows.rot;
    studioMii[0xF] = mii.eyebrows.distApart;
    studioMii[0x10] = mii.eyebrows.yPos + 3;
    studioMii[0x2C] = lookupTables.noses.values[mii.nose.type[0]][mii.nose.type[1]];
    studioMii[0x2B] = mii.nose.size;
    studioMii[0x2D] = mii.nose.yPos;
    studioMii[0x26] = lookupTables.mouths.values[mii.mouth.type[0]][mii.mouth.type[1]];
    studioMii[0x24] = lookupTables.hairCols.indexOf(mii.mouth.col);
    if (studioMii[0x24] < 4) {
        studioMii[0x24] += 19;
    } else {
        studioMii[0x24] = 0;
    }
    studioMii[0x25] = mii.mouth.size;
    studioMii[0x23] = mii.mouth.squash;
    studioMii[0x27] = mii.mouth.yPos;
    studioMii[0x29] = mii.facialHair.mustacheType;
    studioMii[1] = mii.facialHair.beardType;
    studioMii[0] = lookupTables.hairCols.indexOf(mii.facialHair.col);
    if (!studioMii[0]) studioMii[0] = 8;
    studioMii[0x28] = mii.facialHair.mustacheSize;
    studioMii[0x2A] = mii.facialHair.mustacheYPos;
    studioMii[0x19] = mii.glasses.type;
    studioMii[0x17] = lookupTables.glassesCols3DS.indexOf(mii.glasses.col);
    if (!studioMii[0x17]) {
        studioMii[0x17] = 8;
    } else if (studioMii[0x17] < 6) {
        studioMii[0x17] += 13;
    } else {
        studioMii[0x17] = 0;
    }
    studioMii[0x18] = mii.glasses.size;
    studioMii[0x1A] = mii.glasses.yPos;
    studioMii[0x20] = mii.mole.on ? 1 : 0;
    studioMii[0x1F] = mii.mole.size;
    studioMii[0x21] = mii.mole.xPos;
    studioMii[0x22] = mii.mole.yPos;
    return encodeStudio(studioMii);
}
async function readWiiBin(binOrPath) {
    let data;
    if (/[^01]/ig.test(binOrPath)) {
        data = await fs.promises.readFile(binOrPath);
    } else {
        data = Buffer.from(binOrPath);
    }

    const thisMii = miiBufferToJson(data, WII_MII_SCHEMA, lookupTables, true);
    thisMii.console = 'wii';

    return thisMii;
}
async function read3DSQR(binOrPath,returnDecryptedBin) {
    let qrCode;
    if (/[^01]/ig.test(binOrPath)) {
        var data = await fs.promises.readFile(binOrPath);
        var img = await loadImage(data);
        const canvas = createCanvas(img.width, img.height);
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0);
        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        qrCode = jsQR(imageData.data, imageData.width, imageData.height).binaryData;
    }
    else {
        var d = binOrPath.match(/(0|1){1,8}/g);
        qrCode = [];
        d.forEach(byte => {
            qrCode.push(parseInt(byte, 2));
        });
    }
    if (qrCode) {
        var data = Buffer.from(decodeAesCcm(new Uint8Array(qrCode)));
        if(returnDecryptedBin){
            return data;
        }
        const miiJson = miiBufferToJson(data, THREEDS_MII_SCHEMA, lookupTables, false);
        miiJson.console = '3ds';
        return miiJson;
    } else {
        console.error('Failed to decode QR code');
    }
}
async function renderMiiWithStudio(jsonIn){
    if(!["3ds","wii u"].includes(jsonIn.console?.toLowerCase())){
        jsonIn=convertMii(jsonIn);
    }
    var studioMii=convert3DSMiiToStudio(jsonIn);
    return await downloadImage('https://studio.mii.nintendo.com/miis/image.png?data=' + studioMii + "&width=270&type=face");
}
async function createFFLMiiIcon(data, width, height, fflRes) {
    /**
     * Creates a Mii face render using FFL.js/Three.js/gl-headless.
     * @example
     * const fs = require('fs');
     * // NOTE: ASSUMES that this function IS EXPORTED in index.js.
     * const createFFLMiiIcon = require('./index.js').createFFLMiiIcon;
     * const miiData = '000d142a303f434b717a7b84939ba6b2bbbec5cbc9d0e2ea010d15252b3250535960736f726870757f8289a0a7aeb1';
     * const outFilePath = 'mii-render.png';
     * const fflRes = fs.readFileSync('./FFLResHigh.dat');
     * createFFLMiiIcon(miiData, 512, 512, fflRes)
     *   .then(pngBytes => fs.writeFileSync(outFilePath, pngBytes));
     */

    // Create WebGL context.
    const gl = createGL(width, height);
    if (!gl) {
        throw new Error('Failed to create WebGL 1 context');
    }

    // Create a dummy canvas for Three.js to use.
    const canvas = {
        width, height, style: {},
        addEventListener() {},
        removeEventListener() {},
        // Return the context for 'webgl' (not webgl2)
        getContext: (type, _) => type === 'webgl' ? gl : null,
    };

    // WebGLRenderer constructor sets "self" as the context.
    // As of r162, it only tries to call cancelAnimationFrame frame on it.
    globalThis.self ??= {
        // Mock window functions called by Three.js.
        cancelAnimationFrame: () => { },
    };
    // Create the Three.js renderer and scene.
    const renderer = new THREE.WebGLRenderer({ canvas, context: gl, alpha: true });
    setIsWebGL1State(!renderer.capabilities.isWebGL2); // Tell FFL.js we are WebGL1

    const scene = new THREE.Scene();
    // scene.background = null; // Transparent background.
    scene.background = new THREE.Color('white');
    // (You DO NOT need to add any lights to the scene,
    // unless you are using a Three.js built-in material.
    // If you are, look at demo-basic.js "addLightsToScene".)

    let ffl, currentCharModel;

    //const _realConsoleDebug = console.debug;
    //console.debug = () => { };
    try {
        // Initialize FFL
        ffl = await initializeFFL(fflRes, ModuleFFL);

        // Create Mii model and add to the scene.
        const studioRaw = parseHexOrB64ToUint8Array(data); // Parse studio data
        currentCharModel = createCharModel(studioRaw, null,
          FFLShaderMaterial, ffl.module);
        initCharModelTextures(currentCharModel, renderer); // Initialize fully
        scene.add(currentCharModel.meshes); // Add to scene

        // Use the camera for an icon pose.
        const camera = getCameraForViewType(ViewType.MakeIcon);

        // The pixels coming from WebGL are upside down.
        camera.projectionMatrix.elements[5] *= -1; // Flip the camera Y axis.
        // When flipping the camera, the triangles are in the wrong direction.
        scene.traverse(mesh => {
          if (mesh.isMesh && mesh.material.side === THREE.FrontSide)
            // Fix triangle winding by changing the culling (side).
            mesh.material.side = THREE.BackSide;
        });

        // Render the scene, and read the pixels into a buffer.
        renderer.render(scene, camera);
        const pixels = new Uint8Array(width * height * 4);
        gl.readPixels(0, 0, width, height, gl.RGBA, gl.UNSIGNED_BYTE, pixels);

        // Draw the pixels to a new canvas.
        const canvas = createCanvas(width, height);
        const img = new ImageData(new Uint8ClampedArray(pixels), width, height);
        canvas.getContext('2d').putImageData(img, 0, 0);

        return canvas.toBuffer('image/png'); // Encode image to PNG

    } catch (error) {
        console.error('Error during rendering:', error);
        throw error;
    } finally {
        // Clean up.
        try {
            (currentCharModel) && currentCharModel.dispose(); // Mii model
            exitFFL(ffl.module, ffl.resourceDesc); // Free fflRes from memory.
            renderer.dispose(); // Dispose Three.js renderer.
            gl.finish();
        } catch (error) {
            console.warn('Error disposing Mii and renderer:', error);
        }// finally {
        //    console.debug = _realConsoleDebug;
        //}
    }
}
async function renderMii(jsonIn, fflRes=getFFLRes()){
  if(!["3ds","wii u"].includes(jsonIn.console?.toLowerCase())){
      jsonIn=convertMii(jsonIn);
  }
  const studioMii = convert3DSMiiToStudio(jsonIn);
  const width = height = 600;

  return createFFLMiiIcon(studioMii, width, height, fflRes);
}
async function writeWiiBin(jsonIn, outPath) {
    if (jsonIn.console?.toLowerCase() !== "wii") {
        convertMii(jsonIn);
    }
    const miiBuffer = jsonToMiiBuffer(jsonIn, WII_MII_SCHEMA, lookupTables, 74);
    if(outPath){
        await fs.promises.writeFile(outPath, miiBuffer);
    }
    else{
        return miiBuffer;
    }
}
async function write3DSQR(miiJson, outPath, fflRes = getFFLRes()) {
    if (!["3ds", "wii u"].includes(miiJson.console?.toLowerCase())) {
        miiJson = convertMii(miiJson);
    }
    return new Promise(async (resolve, reject) => {
        const miiBinary = jsonToMiiBuffer(miiJson, THREEDS_MII_SCHEMA, lookupTables, 74);
        var encryptedData = Buffer.from(encodeAesCcm(new Uint8Array(miiBinary)));

        const options = {
            width: 300,
            height: 300,
            data: encryptedData.toString("latin1"),
            image: "data:image/gif;base64,R0lGODlhAQABAIAAAP///wAAACH5BAEAAAAALAAAAAABAAEAAAICRAEAOw==", // 1x1 gif
            dotsOptions: {
                color: "#000000",
                type: "square"
            },
            backgroundOptions: {
                color: "#ffffff",
            },
            imageOptions: {
                crossOrigin: "anonymous",
                imageSize: 0.4 // Changes how large center area is
            }
        }
        const qrCodeImage = new QRCodeStyling({
            jsdom: JSDOM,
            nodeCanvas,
            ...options
        });
        const qrBuffer = Buffer.from(await qrCodeImage.getRawData("png"))

        var studioMii = new Uint8Array([0x08, 0x00, 0x40, 0x03, 0x08, 0x04, 0x04, 0x02, 0x02, 0x0c, 0x03, 0x01, 0x06, 0x04, 0x06, 0x02, 0x0a, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x08, 0x04, 0x00, 0x0a, 0x01, 0x00, 0x21, 0x40, 0x04, 0x00, 0x02, 0x14, 0x03, 0x13, 0x04, 0x17, 0x0d, 0x04, 0x00, 0x0a, 0x04, 0x01, 0x09]);
        studioMii[0x16] = miiJson.info.gender === "Male" ? 0 : 1;
        studioMii[0x15] = lookupTables.favCols.indexOf(miiJson.info.favColor);
        studioMii[0x1E] = miiJson.info.height;
        studioMii[2] = miiJson.info.weight;
        studioMii[0x13] = lookupTables.faces.values[miiJson.face.shape];
        studioMii[0x11] = lookupTables.skinCols.indexOf(miiJson.face.col);
        studioMii[0x14] = lookupTables.faceFeatures3DS.indexOf(miiJson.face.feature);
        studioMii[0x12] = lookupTables.makeups3DS.indexOf(miiJson.face.makeup);
        studioMii[0x1D] = lookupTables.hairs.values[miiJson.hair.style[0]][miiJson.hair.style[1]];
        studioMii[0x1B] = lookupTables.hairCols.indexOf(miiJson.hair.col);
        if (!studioMii[0x1B]) studioMii[0x1B] = 8;
        studioMii[0x1C] = miiJson.hair.flipped ? 1 : 0;
        studioMii[7] = lookupTables.eyes.values[miiJson.eyes.type[0]][miiJson.eyes.type[1]];
        studioMii[4] = lookupTables.eyeCols.indexOf(miiJson.eyes.col) + 8;
        studioMii[6] = miiJson.eyes.size;
        studioMii[3] = miiJson.eyes.squash;
        studioMii[5] = miiJson.eyes.rot;
        studioMii[8] = miiJson.eyes.distApart;
        studioMii[9] = miiJson.eyes.yPos;
        studioMii[0xE] = lookupTables.eyebrows.values[miiJson.eyebrows.style[0]][miiJson.eyebrows.style[1]];
        studioMii[0xB] = lookupTables.hairCols.indexOf(miiJson.eyebrows.col);
        if (!studioMii[0xB]) studioMii[0xB] = 8;
        studioMii[0xD] = miiJson.eyebrows.size;
        studioMii[0xA] = miiJson.eyebrows.squash;
        studioMii[0xC] = miiJson.eyebrows.rot;
        studioMii[0xF] = miiJson.eyebrows.distApart;
        studioMii[0x10] = miiJson.eyebrows.yPos + 3;
        studioMii[0x2C] = lookupTables.noses.values[miiJson.nose.type[0]][miiJson.nose.type[1]];
        studioMii[0x2B] = miiJson.nose.size;
        studioMii[0x2D] = miiJson.nose.yPos;
        studioMii[0x26] = lookupTables.mouths.values[miiJson.mouth.type[0]][miiJson.mouth.type[1]];
        studioMii[0x24] = lookupTables.mouthCols3DS.indexOf(miiJson.mouth.col);
        if (studioMii[0x24] < 4) {
            studioMii[0x24] += 19;
        } else {
            studioMii[0x24] = 0;
        }
        studioMii[0x25] = miiJson.mouth.size;
        studioMii[0x23] = miiJson.mouth.squash;
        studioMii[0x27] = miiJson.mouth.yPos;
        studioMii[0x29] = miiJson.facialHair.mustacheType;
        studioMii[1] = miiJson.facialHair.beardType;
        studioMii[0] = lookupTables.hairCols.indexOf(miiJson.facialHair.col);
        if (!studioMii[0]) studioMii[0] = 8;
        studioMii[0x28] = miiJson.facialHair.mustacheSize;
        studioMii[0x2A] = miiJson.facialHair.mustacheYPos;
        studioMii[0x19] = miiJson.glasses.type;
        studioMii[0x17] = miiJson.glasses.col;
        if (!studioMii[0x17]) {
            studioMii[0x17] = 8;
        } else if (studioMii[0x17] < 6) {
            studioMii[0x17] += 13;
        } else {
            studioMii[0x17] = 0;
        }
        studioMii[0x18] = miiJson.glasses.size;
        studioMii[0x1A] = miiJson.glasses.yPos;
        studioMii[0x20] = miiJson.mole.on ? 1 : 0;
        studioMii[0x1F] = miiJson.mole.size;
        studioMii[0x21] = miiJson.mole.xPos;
        studioMii[0x22] = miiJson.mole.yPos;
        let miiPNGBuf = null;
        let renderedWithStudio = fflRes === null || fflRes === undefined;
        if (renderedWithStudio) {
            miiPNGBuf = await renderMiiWithStudio(miiJson);
        }
        else {
            miiPNGBuf = await renderMii(miiJson, fflRes);
        }
        const main_img = await Jimp.read(qrBuffer);
        main_img.resize(424, 424, Jimp.RESIZE_NEAREST_NEIGHBOR); // Don't anti-alias the QR code

        let miiSize, miiZoomFactor, miiYOffset;
        if (renderedWithStudio) {
            miiSize = 100;
            miiZoomFactor = 1;
            miiYOffset = -15;

        } else {
            miiSize = 100;
            miiZoomFactor = 1.25;
            miiYOffset = -5;
        }
        const mii_img = await Jimp.read(miiPNGBuf);
        mii_img.resize(miiSize * miiZoomFactor, miiSize * miiZoomFactor, Jimp.RESIZE_BICUBIC);
        mii_img.crop(
            (miiSize * miiZoomFactor - 100) / 2,
            (miiSize * miiZoomFactor - 100) / 2,
            miiSize,
            miiSize
        );

        const canvas = new Jimp(mii_img.bitmap.width, mii_img.bitmap.height, 0xFFFFFFFF);
        canvas.composite(mii_img, 0, miiYOffset);
        main_img.blit(canvas, 212 - 100 / 2, 212 - 100 / 2);
        const font = await Jimp.loadFont(Jimp.FONT_SANS_16_BLACK)

        main_img.print(font, 0, 55, {
            text: miiJson.name,
            alignmentX: Jimp.HORIZONTAL_ALIGN_CENTER,
            alignmentY: Jimp.VERTICAL_ALIGN_MIDDLE
        }, 424, 395);

        if (miiJson.info.type === "Special") {
            const crown_img = await Jimp.read(path.join(__dirname, 'crown.jpg'));
            crown_img.resize(40, 20);
            main_img.blit(crown_img, 225, 160);
        }

        main_img.write(outPath, (err, img) =>
            resolve(img)
        );
    })
}
function make3DSChild(dad,mom,options={}){
    if(!["3ds","wii u"].includes(dad.console?.toLowerCase())){
        dad=convertMii(dad,"wii");
    }
    if(!["3ds","wii u"].includes(mom.console?.toLowerCase())){
        mom=convertMii(dad,"wii");
    }
    var g=options.gender||Math.floor(Math.random()*2)===1?"Male":"Female";
    var child={
        "info":{
            "birthMonth":new Date().getMonth()+1,
            "birthday":new Date().getDay(),
            "height":64,
            "weight":64,
            "creatorName":"",
            "gender":g,
            "name":options.name||kidNames[g][Math.floor(Math.random()*kidNames[g].length)],
            "favColor":options.favColor||favCols[Math.floor(Math.random()*favCols.length)]
        },
        "perms":{
            "sharing":true,
            "copying":true
        },
        "hair":{
            "style":[8,3],//Hardcoded
            "col":Math.floor(Math.random()*2)===1?dad.hair.col:mom.hair.col,
            "flipped":Math.floor(Math.random()*2)===0?true:false
        },
        "face":{
            "shape":Math.floor(Math.random()*2)===1?dad.face.shape:mom.face.shape,
            "feature":Math.floor(Math.random()*2)===1?dad.face.feature:mom.face.feature,
            "makeup":g==="Male"?"None":Math.floor(Math.random()*2)===1?dad.face.makeup:mom.face.makeup
        },
        "eyes":Math.floor(Math.random()*2)===1?dad.eyes:mom.eyes,
        "eyebrows":Math.floor(Math.random()*2)===1?dad.eyebrows:mom.eyebrows,
        "nose":Math.floor(Math.random()*2)===1?dad.nose:mom.nose,
        "mouth":Math.floor(Math.random()*2)===1?dad.mouth:mom.mouth,
        "facialHair":g==="Female"?{
            "mustacheType": 0,
            "beardType": 0,
            "col": "Black",
            "mustacheSize": 4,
            "mustacheYPos": 10
        }:Math.floor(Math.random()*2)===0?dad.facialHair:mom.facialHair,
        "glasses":Math.floor(Math.random()*2)===1?dad.glasses:mom.glasses,
        "mole":Math.floor(Math.random()*2)===1?dad.mole:mom.mole,
        "creatorName":""
    };
    child.eyebrows.col=child.hair.col;
    var c=[skinCols.indexOf(mom.face.col),skinCols.indexOf(dad.face.col)];
    if(c[0]>c[1]){
        c[1]=c[0];
        c[0]=skinCols.indexOf(dad.face.col);
    }
    child.face.col=skinCols[c[0]+Math.round((c[1]-c[0])/2)];
    child.name=child.info.name;
    child.type="3DS";
    return child;
}
function generateInstructions(mii,full){
    let type=mii.console?.toLowerCase();
    if(type.toLowerCase()==="wii"){
        var instrs={
            "base":`Select "${mii.info.gender}", and then "Start from Scratch".`,
            "col":`On the info page (first tab), set the Favorite Color to ${mii.info.favColor} (${favCols.indexOf(mii.info.favColor)<=5?favCols.indexOf(mii.info.favColor)+1:favCols.indexOf(mii.info.favColor)-5} from the left, ${favCols.indexOf(mii.info.favColor)>5?"bottom":"top"} row).`,
            "heightWeight":`On the build page (second tab), set the height to ${Math.round((100/128)*mii.info.height)}%, and the weight to ${Math.round((100/128)*mii.info.weight)}%.`,
            "faceShape":`On the face page (third tab), set the shape to the one ${Math.floor(mii.face.shape/2)+1} from the top, in the ${mii.face.shape%2===0?"left":"right"} column.`,
            "skinCol":`On the face page (third tab), set the color to the one ${skinCols.indexOf(mii.face.col)+skinCols.indexOf(mii.face.col)>2?-2:1} from the left, on the ${skinCols.indexOf(mii.face.col)>2?`bottom`:`top`} row.`,
            "makeup":`On the face page's makeup tab, set the makeup to \"${mii.face.feature}\" (the one ${Math.ceil((wiiFaceFeatures.indexOf(mii.face.feature)+1)/3)} from the top, and ${[1,2,3,1,2,3,1,2,3,1,2,3][wiiFaceFeatures.indexOf(mii.face.feature)]} from the left).`,
            "hairStyle":`On the hair page (fourth tab), set the hair style to the one ${mii.hair.type[1]} from the left, ${mii.hair.type[2]} from the top, on page ${mii.hair.type[0]}.`,
            "hairFlipped":`${mii.hair.flipped?`On the hair page (fourth tab), press the button to flip the hair.`:``}`,
            "hairColor":`On the hair page (fourth tab), set the hair color to the one ${hairCols.indexOf(mii.hair.col)+(hairCols.indexOf(mii.hair.col)>3?-3:1)} from the left, on the ${hairCols.indexOf(mii.hair.col)>3?`bottom`:`top`} row.`,
            "eyebrowStyle":`On the eyebrow page (fifth tab), set the eyebrow style to the one ${mii.eyebrows.type[1]} from the left, ${mii.eyebrows.type[2]} from the top, on page ${mii.eyebrows.type[0]}.`,
            "eyebrowColor":`On the eyebrow page (fifth tab), set the eyebrow color to the one ${hairCols.indexOf(mii.eyebrows.col)+(hairCols.indexOf(mii.eyebrows.col)>3?-3:1)} from the left, on the ${hairCols.indexOf(mii.eyebrows.col)>3?`bottom`:`top`} row.`,
            "eyebrowY":`${mii.eyebrows.yPos!==7?`On the eyebrow page (fifth tab), `:``}${mii.eyebrows.yPos<7?`press the up button ${7-mii.eyebrows.yPos} times.`:mii.eyebrows.yPos>7?`press the down button ${mii.eyebrows.yPos-7} times.`:``}`,
            "eyebrowSize":`${mii.eyebrows.size!==4?`On the eyebrow page (fifth tab), `:``}${mii.eyebrows.size<4?`press the shrink button ${4-mii.eyebrows.size} times.`:mii.eyebrows.size>4?`press the enlarge button ${mii.eyebrows.size-4} times.`:``}`,
            "eyebrowRot":`${mii.eyebrows.rotation!==6?`On the eyebrow page (fifth tab), `:``}${mii.eyebrows.rotation<6?`press the rotate clockwise button ${6-mii.eyebrows.rotation} times.`:mii.eyebrows.rotation>6?`press the rotate counter-clockwise button ${mii.eyebrows.rotation-6} times.`:``}`,
            "eyebrowDist":`${mii.eyebrows.distApart!==2?`On the eyebrow page (fifth tab), `:``}${mii.eyebrows.distApart<2?`press the closer-together button ${2-mii.eyebrows.distApart} times.`:mii.eyebrows.distApart>2?`press the further-apart button ${mii.eyebrows.distApart-2} times.`:``}`,
            "eyeType":`On the eye page (sixth tab), set the eye type to the one ${mii.eyes.type[1]} from the left, ${mii.eyes.type[2]} from the top, on page ${mii.eyes.type[0]}.`,
            "eyeColor":`On the eye page (sixth tab), set the color to the one ${eyeCols.indexOf(mii.eyes.col)+(eyeCols.indexOf(mii.eyes.col)>2?-2:1)} from the left, on the ${eyeCols.indexOf(mii.eyes.col)>2?`bottom`:`top`} row.`,
            "eyeY":`${mii.eyes.yPos!==12?`On the eye page (sixth tab), `:``}${mii.eyes.yPos<12?`press the up button ${12-mii.eyes.yPos} times.`:mii.eyes.yPos>12?`press the down button ${mii.eyes.yPos-12} times.`:``}`,
            "eyeSize":`${mii.eyes.size!==4?`On the eye page (sixth tab), `:``}${mii.eyes.size<4?`press the shrink button ${4-mii.eyes.size} times.`:mii.eyes.size>4?`press the enlarge button ${mii.eyes.size-4} times.`:``}`,
            "eyeRot":`${mii.eyes.rotation!==(mii.info.gender==="Female"?3:4)?`On the eye page (sixth tab), `:``}${mii.eyes.rotation<(mii.info.gender==="Female"?3:4)?`press the rotate clockwise button ${(mii.info.gender==="Female"?3:4)-mii.eyes.rotation} times.`:mii.eyes.rotation>(mii.info.gender==="Female"?3:4)?`press the rotate counter-clockwise button ${mii.eyes.rotation-(mii.info.gender==="Female"?3:4)} times.`:``}`,
            "eyeDist":`${mii.eyes.distApart!==2?`On the eye page (sixth tab), `:``}${mii.eyes.distApart<2?`press the closer-together button ${2-mii.eyes.distApart} times.`:mii.eyes.distApart>2?`press the further-apart button ${mii.eyes.distApart-2} times.`:``}`,
            "noseType":`On the nose page (seventh tab), set the nose to the one ${Math.ceil((mii.nose.type+1)/3)} from the top, and ${[1,2,3,1,2,3,1,2,3,1,2,3][mii.nose.type]} from the left.`,
            "noseY":`${mii.nose.yPos!==9?`On the nose page (seventh tab), `:``}${mii.nose.yPos<9?`press the up button ${9-mii.nose.yPos} times.`:mii.nose.yPos>9?`press the down button ${mii.nose.yPos-9} times.`:``}`,
            "noseSize":`${mii.nose.size!==4?`On the nose page (seventh tab), `:``}${mii.nose.size<4?`press the shrink button ${4-mii.nose.size} times.`:mii.nose.size>4?`press the enlarge button ${mii.nose.size-4} times.`:``}`,
            "mouthType":`On the mouth page (eighth tab), set the mouth type to the one ${mii.mouth.type[1]} from the left, ${mii.mouth.type[2]} from the top, on page ${mii.mouth.type[0]}.`,
            "mouthCol":`On the mouth page (eighth tab), set the color to the one ${wiiMouthColors.indexOf(mii.mouth.col)+1} from the left.`,
            "mouthY":`${mii.mouth.yPos!==13?`On the mouth page (eighth tab), `:``}${mii.mouth.yPos<13?`press the up button ${13-mii.mouth.yPos} times.`:mii.mouth.yPos>13?`press the down button ${mii.mouth.yPos-13} times.`:``}`,
            "mouthSize":`${mii.mouth.size!==4?`On the mouth page (eighth tab), `:``}${mii.mouth.size<4?`press the shrink button ${4-mii.mouth.size} times.`:mii.mouth.size>4?`press the enlarge button ${mii.mouth.size-4} times.`:``}`,
            "glasses":`On the glasses page (within the ninth tab), set the glasses to the one ${Math.ceil((mii.glasses.type+1)/3)} from the top, and ${[1,2,3,1,2,3,1,2,3,1,2,3][mii.glasses.type]} from the left.`,
            "glassesCol":`On the glasses page (within the ninth tab), set the color to the one ${wiiGlassesCols.indexOf(mii.glasses.col)+(wiiGlassesCols.indexOf(mii.glasses.col)>2?-2:1)} from the left, on the ${wiiGlassesCols.indexOf(mii.glasses.col)>2?`bottom`:`top`} row.`,
            "glassesY":`${mii.glasses.yPos!==10?`On the glasses page (within the ninth tab), `:``}${mii.glasses.yPos<10?`press the up button ${10-mii.glasses.yPos} times.`:mii.glasses.yPos>10?`press the down button ${mii.glasses.yPos-10} times.`:``}`,
            "glassesSize":`${mii.glasses.size!==4?`On the glasses page (within the ninth tab), `:``}${mii.glasses.size<4?`press the shrink button ${4-mii.glasses.size} times.`:mii.glasses.size>4?`press the enlarge button ${mii.glasses.size-4} times.`:``}`,
            "stache":`On the mustache page (within the ninth tab), set the mustache to the one on the ${[0,1].includes(mii.facialHair.mustacheType)?`top`:`bottom`}-${[0,2].includes(mii.facialHair.mustacheType)?`left`:`right`}.`,
            "stacheY":`${mii.facialHair.mustacheYPos!==10?`On the mustache page (within the ninth tab), press the `:``}${mii.facialHair.mustacheYPos>10?`down button ${mii.facialHair.mustacheYPos-10} times.`:mii.facialHair.mustacheYPos<10?`up button ${10-mii.facialHair.mustacheYPos} times.`:``}`,
            "stacheSize":`${mii.facialHair.mustacheSize!==4?`On the mustache page (within the ninth tab), `:``}${mii.facialHair.mustacheSize<4?`press the shrink button ${4-mii.facialHair.mustacheSize} times.`:mii.facialHair.mustacheSize>4?`press the enlarge button ${mii.facialHair.mustacheSize-4} times.`:``}`,
            "mole":`${mii.mole.on?`On the mole page (within the ninth tab), turn the mole on.`:``}`,
            "moleX":`${mii.mole.xPos!==2?`On the mole page (within the ninth tab), press the `:``}${mii.mole.xPos>2?`right button ${mii.mole.xPos-2} times.`:mii.mole.xPos<2?`left button ${2-mii.mole.xPos} times.`:``}`,
            "moleY":`${mii.mole.yPos!==20?`On the mole page (within the ninth tab), press the `:``}${mii.mole.yPos>20?`down button ${mii.mole.yPos-20} times.`:mii.mole.yPos<20?`up button ${20-mii.mole.yPos} times.`:``}`,
            "moleSize":`${mii.mole.size!==4?`On the mole page (within the ninth tab), `:``}${mii.mole.size<4?`press the shrink button ${4-mii.mole.size} times.`:mii.mole.size>4?`press the enlarge button ${mii.mole.size-4} times.`:``}`,
            "beard":`On the beard page (within the ninth tab), set the beard to the one on the ${[0,1].includes(mii.facialHair.beardType)?`top`:`bottom`}-${[0,2].includes(mii.facialHair.beardType)?`left`:`right`}.`,
            "beardCol":`On the mustache OR beard pages (within the ninth tab), set the color to the one ${hairCols.indexOf(mii.facialHair.col)+(hairCols.indexOf(mii.facialHair.col)>3?-3:1)} from the left, on the ${hairCols.indexOf(mii.facialHair.col)>3?`bottom`:`top`} row.`,
            "other":`The Nickname of this Mii is ${mii.info.name}.${mii.info.creatorName?` The creator was ${mii.info.creatorName}.`:``} Mingle was turned ${mii.info.mingle?`on`:`off`}.${mii.info.birthday!==0?` Its birthday is ${["","January","February","March","April","May","June","July","August","September","October","November","December"][mii.info.birthMonth]} ${mii.info.birthday}.`:``}`
        };
        if(!full){
            var defaultMiiInstrs=structuredClone(mii.info.gender==="Male"?defaultInstrs.wii.male:defaultInstrs.wii.female);
            Object.keys(instrs).forEach(instr=>{
                if(instrs[instr]===defaultMiiInstrs[instr]){
                    delete instrs[instr];
                }
            });
        }
        return instrs;
    }
    else{
        var instrs={
            "base":`Select "Start from Scratch", and then "${mii.info.gender}".`,
            "faceShape":`On the face page (first tab), set the face shape to the one ${Math.ceil((mii.face.shape+1)/3)} from the top, and ${[1,2,3,1,2,3,1,2,3,1,2,3][mii.face.shape]} from the left.`,
            "skinCol":`On the face page (first tab), set the color to the one ${skinCols.indexOf(mii.face.col)+1} from the top.`,
            "makeup":`On the face page's makeup tab, set the makeup to \"${mii.face.makeup}\" (the one ${Math.ceil((makeups3DS.indexOf(mii.face.makeup)+1)/3)} from the top, and ${[1,2,3,1,2,3,1,2,3,1,2,3][makeups3DS.indexOf(mii.face.makeup)]} from the left).`,
            "feature":`On the face page's wrinkles tab, set the facial feature to \"${mii.face.feature}\" (the one ${Math.ceil((faceFeatures3DS.indexOf(mii.face.feature)+1)/3)+1} from the top, and ${[1,2,3,1,2,3,1,2,3,1,2,3][makeups3DS.indexOf(mii.face.makeup)]} from the left).`,
            "hairStyle":`On the hair page (second tab), set the hair style to the one ${Math.ceil((mii.hair.style[1]+1)/3)} from the top, and ${[1,2,3,1,2,3,1,2,3,1,2,3][mii.hair.style[1]]} from the left, on page ${mii.hair.style[0]+1}.`,
            "hairFlipped":`${mii.hair.flipped?`On the hair page (second tab), press the button to flip the hair.`:``}`,
            "hairColor":`On the hair page (second tab), set the hair color to the one ${hairCols.indexOf(mii.hair.col)+1} from the top.`,
            "eyebrowStyle":`On the eyebrow page (third tab), set the eyebrow style to the one ${[1,2,3,1,2,3,1,2,3,1,2,3][mii.eyebrows.style[1]]} from the left, ${Math.ceil((mii.eyebrows.style[1]+1)/3)} from the top, on page ${mii.eyebrows.style[0]+1}.`,
            "eyebrowColor":`On the eyebrow page (third tab), set the eyebrow color to the one ${hairCols.indexOf(mii.eyebrows.col)+1} from the top.`,
            "eyebrowY":`${mii.eyebrows.yPos!==7?`On the eyebrow page (third tab), `:``}${mii.eyebrows.yPos<7?`press the up button ${7-mii.eyebrows.yPos} times.`:mii.eyebrows.yPos>7?`press the down button ${mii.eyebrows.yPos-7} times.`:``}`,
            "eyebrowSize":`${mii.eyebrows.size!==4?`On the eyebrow page (third tab), `:``}${mii.eyebrows.size<4?`press the shrink button ${4-mii.eyebrows.size} times.`:mii.eyebrows.size>4?`press the enlarge button ${mii.eyebrows.size-4} times.`:``}`,
            "eyebrowRot":`${mii.eyebrows.rot!==6?`On the eyebrow page (third tab), `:``}${mii.eyebrows.rot<6?`press the rotate clockwise button ${6-mii.eyebrows.rot} times.`:mii.eyebrows.rot>6?`press the rotate counter-clockwise button ${mii.eyebrows.rot-6} times.`:``}`,
            "eyebrowDist":`${mii.eyebrows.distApart!==2?`On the eyebrow page (third tab), `:``}${mii.eyebrows.distApart<2?`press the closer-together button ${2-mii.eyebrows.distApart} times.`:mii.eyebrows.distApart>2?`press the further-apart button ${mii.eyebrows.distApart-2} times.`:``}`,
            "eyebrowSquash":`${mii.eyebrows.squash!==3?`On the eyebrow page (third tab), `:``}${mii.eyebrows.squash<3?`press the squish button ${3-mii.eyebrows.squash} times.`:mii.eyebrows.squash>3?`press the un-squish button ${mii.eyebrows.squash-3} times.`:``}`,
            "eyeType":`On the eye page (fourth tab), set the eye type to the one ${[1,2,3,1,2,3,1,2,3,1,2,3][mii.eyes.type[1]]} from the left, ${Math.ceil((mii.eyes.type[1]+1)/3)} from the top, on page ${mii.eyes.type[0]+1}.`,
            "eyeColor":`On the eye page (fourth tab), set the color to the one ${eyeCols.indexOf(mii.eyes.col)+1} from the top.`,
            "eyeY":`${mii.eyes.yPos!==12?`On the eye page (fourth tab), `:``}${mii.eyes.yPos<12?`press the up button ${12-mii.eyes.yPos} times.`:mii.eyes.yPos>12?`press the down button ${mii.eyes.yPos-12} times.`:``}`,
            "eyeSize":`${mii.eyes.size!==4?`On the eye page (fourth tab), `:``}${mii.eyes.size<4?`press the shrink button ${4-mii.eyes.size} times.`:mii.eyes.size>4?`press the enlarge button ${mii.eyes.size-4} times.`:``}`,
            "eyeRot":`${mii.eyes.rot!==(mii.info.gender==="Female"?3:4)?`On the eye page (fourth tab), `:``}${mii.eyes.rot<(mii.info.gender==="Female"?3:4)?`press the rotate clockwise button ${(mii.info.gender==="Female"?3:4)-mii.eyes.rot} times.`:mii.eyes.rot>(mii.info.gender==="Female"?3:4)?`press the rotate counter-clockwise button ${mii.eyes.rot-(mii.info.gender==="Female"?3:4)} times.`:``}`,
            "eyeDist":`${mii.eyes.distApart!==2?`On the eye page (fourth tab), `:``}${mii.eyes.distApart<2?`press the closer-together button ${2-mii.eyes.distApart} times.`:mii.eyes.distApart>2?`press the further-apart button ${mii.eyes.distApart-2} times.`:``}`,
            "eyeSquash":`${mii.eyes.squash!==3?`On the eye page (fourth tab), `:``}${mii.eyes.squash<3?`press the squish button ${3-mii.eyes.squash} times.`:mii.eyes.squash>3?`press the un-squish button ${mii.eyes.squash-3} times.`:``}`,
            "noseType":`On the nose page (fifth tab), set the nose to the one ${Math.ceil((mii.nose.type[1]+1)/3)} from the top, and ${[1,2,3,1,2,3,1,2,3,1,2,3][mii.nose.type[1]]} from the left, on page ${mii.nose.type[0]}.`,
            "noseY":`${mii.nose.yPos!==9?`On the nose page (fifth tab), `:``}${mii.nose.yPos<9?`press the up button ${9-mii.nose.yPos} times.`:mii.nose.yPos>9?`press the down button ${mii.nose.yPos-9} times.`:``}`,
            "noseSize":`${mii.nose.size!==4?`On the nose page (fifth tab), `:``}${mii.nose.size<4?`press the shrink button ${4-mii.nose.size} times.`:mii.nose.size>4?`press the enlarge button ${mii.nose.size-4} times.`:``}`,
            "mouthType":`On the mouth page (sixth tab), set the mouth type to the one ${[1,2,3,1,2,3,1,2,3,1,2,3][mii.mouth.type[1]]} from the left, ${Math.ceil((mii.mouth.type[1]+1)/3)} from the top, on page ${mii.mouth.type[0]+1}.`,
            "mouthCol":`On the mouth page (sixth tab), set the color to the one ${mouthCols3DS.indexOf(mii.mouth.col)+1} from the top.`,
            "mouthY":`${mii.mouth.yPos!==13?`On the mouth page (sixth tab), `:``}${mii.mouth.yPos<13?`press the up button ${13-mii.mouth.yPos} times.`:mii.mouth.yPos>13?`press the down button ${mii.mouth.yPos-13} times.`:``}`,
            "mouthSize":`${mii.mouth.size!==4?`On the mouth page (sixth tab), `:``}${mii.mouth.size<4?`press the shrink button ${4-mii.mouth.size} times.`:mii.mouth.size>4?`press the enlarge button ${mii.mouth.size-4} times.`:``}`,
            "mouthSquash":`${mii.mouth.squash!==3?`On the mouth page (sixth tab), `:``}${mii.mouth.squash<3?`press the squish button ${3-mii.mouth.squash} times.`:mii.mouth.squash>3?`press the un-squish button ${mii.mouth.squash-3} times.`:``}`,
            "glasses":`On the glasses page (within the seventh tab), set the glasses to the one ${Math.ceil((mii.glasses.type+1)/3)} from the top, and ${[1,2,3,1,2,3,1,2,3,1,2,3][mii.glasses.type]} from the left.`,
            "glassesCol":`On the glasses page (within the seventh tab), set the color to the one ${glassesCols3DS.indexOf(mii.glasses.col)+1} from the top.`,
            "glassesY":`${mii.glasses.yPos!==10?`On the glasses page (within the seventh tab), `:``}${mii.glasses.yPos<10?`press the up button ${10-mii.glasses.yPos} times.`:mii.glasses.yPos>10?`press the down button ${mii.glasses.yPos-10} times.`:``}`,
            "glassesSize":`${mii.glasses.size!==4?`On the glasses page (within the seventh tab), `:``}${mii.glasses.size<4?`press the shrink button ${4-mii.glasses.size} times.`:mii.glasses.size>4?`press the enlarge button ${mii.glasses.size-4} times.`:``}`,
            "stache":`On the mustache page (within the seventh tab), set the mustache to the one on the ${[0,1].includes(mii.facialHair.mustacheType)?`top`:[2,3].includes(mii.facialHair.mustacheType)?`middle`:`bottom`}-${[0,2,4].includes(mii.facialHair.mustacheType)?`left`:`right`}.`,
            "stacheY":`${mii.facialHair.mustacheYPos!==10?`On the mustache page (within the seventh tab), press the `:``}${mii.facialHair.mustacheYPos>10?`down button ${mii.facialHair.mustacheYPos-10} times.`:mii.facialHair.mustacheYPos<10?`up button ${10-mii.facialHair.mustacheYPos} times.`:``}`,
            "stacheSize":`${mii.facialHair.mustacheSize!==4?`On the mustache page (within the seventh tab), `:``}${mii.facialHair.mustacheSize<4?`press the shrink button ${4-mii.facialHair.mustacheSize} times.`:mii.facialHair.mustacheSize>4?`press the enlarge button ${mii.facialHair.mustacheSize-4} times.`:``}`,
            "mole":`${mii.mole.on?`On the mole page (within the seventh tab), turn the mole on.`:``}`,
            "moleX":`${mii.mole.xPos!==2?`On the mole page (within the seventh tab), press the `:``}${mii.mole.xPos>2?`right button ${mii.mole.xPos-2} times.`:mii.mole.xPos<2?`left button ${2-mii.mole.xPos} times.`:``}`,
            "moleY":`${mii.mole.yPos!==20?`On the mole page (within the seventh tab), press the `:``}${mii.mole.yPos>20?`down button ${mii.mole.yPos-20} times.`:mii.mole.yPos<20?`up button ${20-mii.mole.yPos} times.`:``}`,
            "moleSize":`${mii.mole.size!==4?`On the mole page (within the seventh tab), `:``}${mii.mole.size<4?`press the shrink button ${4-mii.mole.size} times.`:mii.mole.size>4?`press the enlarge button ${mii.mole.size-4} times.`:``}`,
            "beard":`On the beard page (within the seventh tab), set the beard to the one on the ${[0,1].includes(mii.facialHair.beardType)?`top`:[2,3].includes(mii.facialHair.beardType)?`middle`:`bottom`}-${[0,2].includes(mii.facialHair.beardType)?`left`:`right`}.`,
            "beardCol":`On the mustache OR beard pages (within the seventh tab), set the color to the one ${hairCols.indexOf(mii.facialHair.col)+1} from the top.`,
            "heightWeight":`On the build page (eighth tab), set the height to ${Math.round((100/128)*mii.info.height)}%, and the weight to ${Math.round((100/128)*mii.info.weight)}%.`,
            "col":`On the info page (after pressing "Next"), set the Favorite Color to ${mii.info.favColor} (${favCols.indexOf(mii.info.favColor)<=5?favCols.indexOf(mii.info.favColor)+1:favCols.indexOf(mii.info.favColor)-5} from the left, ${favCols.indexOf(mii.info.favColor)>5?"bottom":"top"} row).`,
            "other":`The Nickname of this Mii is ${mii.info.name}.${mii.info.creatorName?` The creator was ${mii.info.creatorName}.`:``} ${mii.info.birthday!==0?` Its birthday is ${["","January","February","March","April","May","June","July","August","September","October","November","December"][mii.info.birthMonth]} ${mii.info.birthday}.`:``}`
        };
        if(!full){
            var defaultMiiInstrs=structuredClone(mii.info.gender==="Male"?defaultInstrs["3ds"].male:defaultInstrs["3ds"].female);
            Object.keys(instrs).forEach(instr=>{
                if(instrs[instr]===defaultMiiInstrs[instr]){
                    delete instrs[instr];
                }
            });
        }
        return instrs;
    }
}



module.exports = {
    // Data
    Enums: require("./Enums"),

    //Functions
    convertMii,
    convertMiiToStudio,
    
    readWiiBin,
    read3DSQR,
    
    renderMiiWithStudio,
    renderMii,

    writeWiiBin,
    write3DSQR,

    //make3DSChild, //WIP
    
    generateInstructions
}
