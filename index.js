//Imports
const fs = require('fs');
const nodeCanvas = require('canvas');
const { createCanvas, loadImage, ImageData } = nodeCanvas;
const jsQR = require('jsqr');
const Jimp = require('jimp');
const THREE = require('three');
var GLTFLoader=null;
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
} = require("./fflWrapper.js");
const ModuleFFL = require("ffl.js/examples/ffl-emscripten-single-file.js");
const FFLShaderMaterial = require("ffl.js/FFLShaderMaterial.js");

// Typedefs for intellisence
/** @typedef {import('./types').WiiMii} WiiMii */

//Miscellaneous Tables
const lookupTables = {
    //Universals
    favCols: ["Red", "Orange", "Yellow", "Lime", "Green", "Blue", "Cyan", "Pink", "Purple", "Brown", "White", "Black"],
    skinCols: ["White", "Tanned White", "Darker White", "Tanned Darker", "Mostly Black", "Black"],
    hairCols: ["Black", "Brown", "Red", "Reddish Brown", "Grey", "Light Brown", "Dark Blonde", "Blonde"],
    eyeCols: ["Black", "Grey", "Brown", "Lime", "Blue", "Green"],

    //Wii fields
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
            '0': 1,
            '1': 1,
            '2': 2,
            '3': 2,
            '4': 2,
            '5': 1,
            '6': 1,
            '7': 2,
            '8': 1,
            '9': 2,
            '10': 1,
            '11': 2,
            '12': 2,
            '13': 1,
            '14': 2,
            '15': 2,
            '16': 1,
            '17': 2,
            '18': 2,
            '19': 1,
            '20': 2,
            '21': 1,
            '22': 1,
            '23': 1
        },
        eyebrows:{
            '0': 1,
            '1': 1,
            '2': 2,
            '3': 2,
            '4': 1,
            '5': 1,
            '6': 1,
            '7': 1,
            '8': 1,
            '9': 1,
            '10': 2,
            '11': 2,
            '12': 1,
            '13': 2,
            '14': 2,
            '15': 2,
            '16': 2,
            '17': 1,
            '18': 2,
            '19': 1,
            '20': 2,
            '21': 1,
            '22': 2,
            '23': 2
        },
        eyes:{
            0: 1,
            1: 1,
            2: 1,
            3: 4,
            4: 1,
            5: 3,
            6: 3,
            7: 4,
            8: 1,
            9: 2,
            10: 4,
            11: 2,
            12: 2,
            13: 3,
            14: 4,
            15: 1,
            16: 1,
            17: 1,
            18: 3,
            19: 2,
            20: 1,
            21: 2,
            22: 4,
            23: 2,
            24: 3,
            25: 2,
            26: 1,
            27: 1,
            28: 3,
            29: 4,
            30: 3,
            31: 3,
            32: 2,
            33: 2,
            34: 2,
            35: 2,
            36: 3,
            37: 3,
            38: 4,
            39: 1,
            40: 2,
            41: 3,
            42: 4,
            43: 4,
            44: 4,
            45: 4,
            46: 3,
            47: 4
        },
        hairs:{
            '0': 5,
            '1': 4,
            '2': 6,
            '3': 5,
            '4': 4,
            '5': 4,
            '6': 5,
            '7': 4,
            '8': 4,
            '9': 6,
            '10': 5,
            '11': 5,
            '12': 4,
            '13': 4,
            '14': 5,
            '15': 6,
            '16': 6,
            '17': 5,
            '18': 6,
            '19': 4,
            '20': 5,
            '21': 5,
            '22': 5,
            '23': 3,
            '24': 6,
            '25': 4,
            '26': 4,
            '27': 4,
            '28': 6,
            '29': 6,
            '30': 3,
            '31': 1,
            '32': 2,
            '33': 1,
            '34': 3,
            '35': 5,
            '36': 3,
            '37': 2,
            '38': 3,
            '39': 1,
            '40': 1,
            '41': 3,
            '42': 3,
            '43': 3,
            '44': 1,
            '45': 1,
            '46': 6,
            '47': 2,
            '48': 2,
            '49': 1,
            '50': 2,
            '51': 1,
            '52': 2,
            '53': 6,
            '54': 3,
            '55': 2,
            '56': 1,
            '57': 3,
            '58': 2,
            '59': 1,
            '60': 2,
            '61': 6,
            '62': 2,
            '63': 5,
            '64': 2,
            '65': 3,
            '66': 2,
            '67': 3,
            '68': 1,
            '69': 4,
            '70': 1,
            '71': 6
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
    wiiNoses:{
        '0': 1,
        '1': 10,
        '2': 2,
        '3': 3,
        '4': 6,
        '5': 0,
        '6': 5,
        '7': 4,
        '8': 8,
        '9': 9,
        '10': 7,
        '11': 11
    },
    mouthTable:{
        '0': '113',
        '1': '121',
        '2': '231',
        '3': '222',
        '4': '232',
        '5': '132',
        '6': '124',
        '7': '211',
        '8': '123',
        '9': '221',
        '10': '133',
        '11': '223',
        '12': '234',
        '13': '134',
        '14': '224',
        '15': '213',
        '16': '114',
        '17': '212',
        '18': '214',
        '19': '131',
        '20': '233',
        '21': '112',
        '22': '122',
        '23': '111'
    },
    eyebrowTable:{
        '0': '121',
        '1': '112',
        '2': '231',
        '3': '212',
        '4': '134',
        '5': '124',
        '6': '111',
        '7': '113',
        '8': '133',
        '9': '122',
        '10': '221',
        '11': '211',
        '12': '131',
        '13': '223',
        '14': '222',
        '15': '213',
        '16': '224',
        '17': '114',
        '18': '214',
        '19': '132',
        '20': '232',
        '21': '123',
        '22': '233',
        '23': '234'
    },
    eyeTable:{
        '0': '131',
        '1': '113',
        '2': '111',
        '3': '413',
        '4': '121',
        '5': '311',
        '6': '332',
        '7': '411',
        '8': '112',
        '9': '222',
        '10': '414',
        '11': '221',
        '12': '232',
        '13': '331',
        '14': '424',
        '15': '114',
        '16': '133',
        '17': '132',
        '18': '314',
        '19': '231',
        '20': '134',
        '21': '233',
        '22': '433',
        '23': '213',
        '24': '313',
        '25': '214',
        '26': '123',
        '27': '124',
        '28': '324',
        '29': '432',
        '30': '323',
        '31': '333',
        '32': '212',
        '33': '211',
        '34': '223',
        '35': '234',
        '36': '312',
        '37': '322',
        '38': '431',
        '39': '122',
        '40': '224',
        '41': '321',
        '42': '412',
        '43': '423',
        '44': '421',
        '45': '422',
        '46': '334',
        '47': '434'
    },
    hairTable:{
        '0': '534',
        '1': '413',
        '2': '632',
        '3': '521',
        '4': '422',
        '5': '433',
        '6': '522',
        '7': '434',
        '8': '414',
        '9': '612',
        '10': '512',
        '11': '513',
        '12': '411',
        '13': '421',
        '14': '511',
        '15': '624',
        '16': '621',
        '17': '533',
        '18': '622',
        '19': '423',
        '20': '532',
        '21': '524',
        '22': '531',
        '23': '312',
        '24': '614',
        '25': '432',
        '26': '412',
        '27': '424',
        '28': '613',
        '29': '634',
        '30': '314',
        '31': '134',
        '32': '211',
        '33': '111',
        '34': '334',
        '35': '514',
        '36': '313',
        '37': '231',
        '38': '321',
        '39': '122',
        '40': '121',
        '41': '323',
        '42': '331',
        '43': '311',
        '44': '112',
        '45': '113',
        '46': '631',
        '47': '221',
        '48': '212',
        '49': '123',
        '50': '223',
        '51': '131',
        '52': '232',
        '53': '623',
        '54': '332',
        '55': '233',
        '56': '114',
        '57': '324',
        '58': '213',
        '59': '133',
        '60': '224',
        '61': '611',
        '62': '234',
        '63': '523',
        '64': '214',
        '65': '333',
        '66': '222',
        '67': '322',
        '68': '124',
        '69': '431',
        '70': '132',
        '71': '633'
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
    ],
    formatTo:[
        [0,1,2],
        [3,4,5],
        [6,7,8],
        [9,10,11]
    ],
    formatFrom:[
        "11","21","31",
        "12","22","32",
        "13","23","33",
        "14","24","34"
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
function getBinaryFromAddress(addr, bin){
    let byte = bin.readUInt8(addr);
    let binaryString = '';
    for (let i = 7; i >= 0; i--) {
        binaryString += ((byte >> i) & 1) ? '1' : '0';
    }
    return binaryString;
}
function getKeyByValue(object, value) {
    for (var key in object) {
      if (object[key] === value) {
        return key;
      }
    }
}
function lookupTable(table,value,paginated){
  if(paginated){
    for(var i=0;i<lookupTables[table].values.length;i++){
      for(var j=0;j<lookupTables[table].values[i].length;j++){
        if(lookupTables[table].values[i][j]===value){
          return [i,j];
        }
      }
    }
  }
  else{
    for(var i=0;i<lookupTables[table].values.length;i++){
      if(lookupTables[table].values[i]===value){
        return i;
      }
    }
  }
  return undefined;
}

//If FFLResHigh.dat is in the same directory as Node.js is calling the library from, use it by default
let _fflRes; // undefined initially
function getFFLRes() {
    // If we've already tried loading, just return the result
    if (_fflRes !== undefined) return _fflRes;
    for (const path of [ "./FFLResHigh.dat", "./ffl/FFLResHigh.dat" ]) {
        if (fs.existsSync(path)) {
            // Convert Buffer to Uint8Array explicitly
            const buffer = fs.readFileSync(path);
            return _fflRes = new Uint8Array(buffer);
        }
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
            "console":"3ds"
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
        "name": "",
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
            "console":"3ds"
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
        "name": "",
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
    encodingTable: (decodedValue, field, tables) => {
        const table = getNestedProperty(tables, field.encodingTable);
        console.log(table);
        if (!table) return "ERROR: could not find requested encoding table";

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
                return "ERROR";
            }
        }
        else{
            return "ERROR";
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
        if (fieldDef.encodingTable && fieldDef.decoder && typeof encoders !== 'undefined' && encoders[fieldDef.decoder]){
            if(fieldDef.encodingTable==="NONE"){
                continue;
            }
            raw = encoders.encodingTable([raw,getNestedProperty(miiData,fieldDef.secondaryParameter)], fieldDef, lookupTables);
        }
        else if (fieldDef.decoder && typeof encoders !== 'undefined' && encoders[fieldDef.decoder]) {
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
    'hair.page': { byteOffset: 0x22, bitOffset: 0, bitLength: 7, decoder: 'lookup', lookupTable: 'pages.hairs' },//Refuse, marked for destruction.
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
    'eyes.page': { byteOffset: 0x28, bitOffset: 0, bitLength: 6, decoder: 'lookup', lookupTable: 'pages.eyes', encodingTable: 'eyes', secondaryParameter: 'eyes.type' },//Refuse, marked for destruction.
    'eyes.type': { byteOffset: 0x28, bitOffset: 0, bitLength: 6, decoder: 'lookup', lookupTable: 'types.eyes', encodingTable:'NONE' },
    'eyes.rotation': { byteOffset: 0x29, bitOffset: 0, bitLength: 3, decoder: 'number' },
    'eyes.yPosition': { byteOffset: 0x29, bitOffset: 3, bitLength: 5, decoder: 'number' },
    'eyes.color': { byteOffset: 0x2A, bitOffset: 0, bitLength: 3, decoder: 'number' },
    'eyes.size': { byteOffset: 0x2A, bitOffset: 4, bitLength: 3 },
    'eyes.distanceApart': { byteOffset: 0x2A, bitOffset: 7, bitLength: 4, decoder: 'number' },
    'nose.type': { byteOffset: 0x2C, bitOffset: 0, bitLength: 4, decoder: 'lookup', lookupTable: 'wiiNoses' },
    'nose.size': { byteOffset: 0x2C, bitOffset: 4, bitLength: 4, decoder: 'number' },
    'nose.yPosition': { byteOffset: 0x2D, bitOffset: 0, bitLength: 5, decoder: 'number' },
    'mouth.page': { byteOffset: 0x2E, bitOffset: 0, bitLength: 5, decoder: 'lookup', lookupTable: 'pages.mouths' },//Refuse, marked for destruction.
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
    var miiTo=structuredClone(mii);
    if(["wii u","3ds"].includes(typeFrom)){
        miiTo.perms.mingle=mii.perms.sharing;
        miiTo.perms.fromCheckMiiOut=false;
        miiTo.face.type=convTables.face3DSToWii[mii.face.type];
        //We prioritize Facial Features here because the Wii supports more of those than they do Makeup types, and is more likely to apply. The 3DS has two separate fields, so you can have makeup and wrinkles applied at the same time. The Wii only has one that covers both.
        if(typeof(convTables.features3DSToWii[mii.face.feature])==='string'){
            miiTo.face.feature=convTables.makeup3DSToWii[mii.face.makeup];
        }
        else{
            miiTo.face.feature=convTables.features3DSToWii[mii.face.feature];
        }
        miiTo.nose.type=convTables.nose3DSToWii[mii.nose.page][mii.nose.type];
        miiTo.mouth.type=convTables.mouth3DSToWii[mii.mouth.page][mii.mouth.type];
        miiTo.mouth.color=mii.mouth.col>2?0:mii.mouth.col;
        miiTo.hair.type=convTables.hair3DSToWii[mii.hair.page][mii.hair.type];
        miiTo.eyebrows.type=convTables.eyebrows3DSToWii[mii.eyebrows.page][mii.eyebrows.type];
        miiTo.eyes.type=convTables.eyes3DSToWii[mii.eyes.page][mii.eyes.type];
        miiTo.glasses.col=mii.glasses.col;
        if(miiTo.beard.mustache.type===4){
            miiTo.beard.mustache.type=2;
        }
        else if(miiTo.beard.mustache.type===5){
            miiTo.beard.mustache.type=0;
            miiTo.beard.type=1;
        }
        if(mii.beard.type>3){
            mii.beard.type=3;
        }
        miiTo.console="wii";
    }
    else if(typeFrom==="wii"){
        miiTo.perms.sharing=mii.general.mingle;
        miiTo.perms.copying=mii.general.mingle;
        miiTo.hair.style=convTables.hairWiiTo3DS[mii.hair.page][mii.hair.type];
        miiTo.face.shape=convTables.faceWiiTo3DS[mii.face.shape];
        miiTo.face.makeup=0;
        miiTo.face.feature=0;
        if(typeof(convTables.featureWiiTo3DS[mii.face.feature])==='string'){
            miiTo.face.makeup=makeups3DS[+convTables.featureWiiTo3DS[mii.face.feature]];
        }
        else{
            miiTo.face.feature=faceFeatures3DS[convTables.featureWiiTo3DS[mii.face.feature]];
        }
        miiTo.eyes.squash=3;
        miiTo.eyebrows.squash=3;
        miiTo.mouth.col=mouthCols3DS[mii.mouth.col];//qk
        miiTo.mouth.squash=3;
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
    studioMii[0x16] = mii.general.gender;
    studioMii[0x15] = mii.general.favoriteColor;
    studioMii[0x1E] = mii.general.height;
    studioMii[2] = mii.general.weight;
    studioMii[0x13] = lookupTables.faces.values[mii.face.type];
    studioMii[0x11] = mii.face.color;
    studioMii[0x14] = mii.face.feature;
    studioMii[0x12] = mii.face.makeup;
    studioMii[0x1D] = lookupTables.hairs.values[mii.hair.page][mii.hair.type];
    studioMii[0x1B] = mii.hair.color;
    if (!studioMii[0x1B]) studioMii[0x1B] = 8;
    studioMii[0x1C] = mii.hair.flipped ? 1 : 0;
    studioMii[7] = lookupTables.eyes.values[mii.eyes.page][mii.eyes.type];
    studioMii[4] = mii.eyes.color + 8;
    studioMii[6] = mii.eyes.size;
    studioMii[3] = mii.eyes.squash;
    studioMii[5] = mii.eyes.rotation;
    studioMii[8] = mii.eyes.distanceApart;
    studioMii[9] = mii.eyes.yPosition;
    studioMii[0xE] = lookupTables.eyebrows.values[mii.eyebrows.page][mii.eyebrows.type];
    studioMii[0xB] = mii.eyebrows.color;
    if (!studioMii[0xB]) studioMii[0xB] = 8;
    studioMii[0xD] = mii.eyebrows.size;
    studioMii[0xA] = mii.eyebrows.squash;
    studioMii[0xC] = mii.eyebrows.rotation;
    studioMii[0xF] = mii.eyebrows.distanceApart;
    studioMii[0x10] = mii.eyebrows.yPosition + 3;
    studioMii[0x2C] = lookupTables.noses.values[mii.nose.page][mii.nose.type];
    studioMii[0x2B] = mii.nose.size;
    studioMii[0x2D] = mii.nose.yPosition;
    studioMii[0x26] = lookupTables.mouths.values[mii.mouth.page][mii.mouth.type];
    studioMii[0x24] = mii.mouth.color;
    if (studioMii[0x24] < 4) {
        studioMii[0x24] += 19;
    } else {
        studioMii[0x24] = 0;
    }
    studioMii[0x25] = mii.mouth.size;
    studioMii[0x23] = mii.mouth.squash;
    studioMii[0x27] = mii.mouth.yPosition;
    studioMii[0x29] = mii.beard.mustache.type;
    studioMii[1] = mii.beard.type;
    studioMii[0] = mii.beard.color;
    if (!studioMii[0]) studioMii[0] = 8;
    studioMii[0x28] = mii.beard.mustache.size;
    studioMii[0x2A] = mii.beard.mustache.yPosition;
    studioMii[0x19] = mii.glasses.type;
    studioMii[0x17] = mii.glasses.color;
    if (!studioMii[0x17]) {
        studioMii[0x17] = 8;
    } else if (studioMii[0x17] < 6) {
        studioMii[0x17] += 13;
    } else {
        studioMii[0x17] = 0;
    }
    studioMii[0x18] = mii.glasses.size;
    studioMii[0x1A] = mii.glasses.yPosition;
    studioMii[0x20] = mii.mole.on ? 1 : 0;
    studioMii[0x1F] = mii.mole.size;
    studioMii[0x21] = mii.mole.xPosition;
    studioMii[0x22] = mii.mole.yPosition;
    return encodeStudio(studioMii);
}
async function readWiiBin(binOrPath) {
    let data;
    if (/[^01]/ig.test(binOrPath)) {
        data = await fs.promises.readFile(binOrPath);
    } else {
        data = Buffer.from(binOrPath);
    }
    var thisMii={
        general:{},
        perms:{},
        meta:{},
        face:{},
        nose:{},
        mouth:{},
        mole:{},
        hair:{},
        eyebrows:{},
        eyes:{},
        glasses:{},
        beard:{
            mustache:{}
        }
    };

    const get = address => getBinaryFromAddress(address, data);

    var name="";
    for(var i=0;i<10;i++){
        name+=data.slice(3+i*2, 4+i*2)+"";
    }
    thisMii.meta.name=name.replaceAll("\x00","");
    var cname="";
    for(var i=0;i<10;i++){
        cname+=data.slice(55+i*2, 56+i*2)+"";
    }
    thisMii.meta.creatorName=cname.replaceAll("\x00","");
    thisMii.general.gender=+get(0x00)[1];//0 for Male, 1 for Female
    thisMii.meta.miiId=parseInt(get(0x18),2).toString(16)+parseInt(get(0x19),2).toString(16)+parseInt(get(0x1A),2).toString(16)+parseInt(get(0x1B),2).toString(16);
    switch(thisMii.meta.miiId.slice(0,3)){
        case "010":
            thisMii.meta.type="Special";
        break;
        case "110":
            thisMii.meta.type="Foreign";
        break;
        default:
            thisMii.meta.type="Default";
        break;
    }
    thisMii.meta.systemId=parseInt(get(0x1C),2).toString(16)+parseInt(get(0x1D),2).toString(16)+parseInt(get(0x1E),2).toString(16)+parseInt(get(0x1F),2).toString(16);
    var temp=get(0x20);
    thisMii.face.type=parseInt(temp.slice(0,3),2);//0-7
    thisMii.face.color=parseInt(temp.slice(3,6),2);//0-5
    temp=get(0x21);
    thisMii.face.feature=parseInt(get(0x20).slice(6,8)+temp.slice(0,2),2);//0-11
    thisMii.perms.mingle=temp[5]==="0";//0 for Mingle, 1 for Don't Mingle
    temp=get(0x2C);
    thisMii.nose.type=+getKeyByValue(lookupTables.wiiNoses,parseInt(temp.slice(0,4),2));
    thisMii.nose.size=parseInt(temp.slice(4,8),2);
    thisMii.nose.yPosition=parseInt(get(0x2D).slice(0,5),2);//From top to bottom, 0-18, default 9
    temp=get(0x2E);
    thisMii.mouth.page=+lookupTables.mouthTable[""+parseInt(temp.slice(0,5),2)][0]-1;
    thisMii.mouth.type=convTables.formatTo[lookupTables.mouthTable[""+parseInt(temp.slice(0,5),2)][2]-1][lookupTables.mouthTable[""+parseInt(temp.slice(0,5),2)][1]-1];//0-23, Needs lookup table
    thisMii.mouth.color=parseInt(temp.slice(5,7),2);//0-2, refer to mouthColors array
    temp2=get(0x2F);
    thisMii.mouth.size=parseInt(temp[7]+temp2.slice(0,3),2);//0-8, default 4
    thisMii.mouth.yPosition=parseInt(temp2.slice(3,8),2);//0-18, default 9, from top to bottom
    temp=get(0x00);
    var temp2=get(0x01);
    thisMii.general.birthMonth=parseInt(temp.slice(2,6),2);
    thisMii.general.birthday=parseInt(temp.slice(6,8)+temp2.slice(0,3),2);
    thisMii.general.favoriteColor=parseInt(temp2.slice(3,7),2);//0-11, refer to cols array
    thisMii.general.height=parseInt(get(0x16),2);//0-127
    thisMii.general.weight=parseInt(get(0x17),2);//0-127
    thisMii.perms.fromCheckMiiOut=get(0x21)[7]==="0"?false:true;
    temp=get(0x34);
    temp2=get(0x35);
    thisMii.mole.on=temp[0]==="0"?false:true;//0 for Off, 1 for On
    thisMii.mole.size=parseInt(temp.slice(1,5),2);//0-8, default 4
    thisMii.mole.xPosition=parseInt(temp2.slice(2,7),2);//0-16, Default 2
    thisMii.mole.yPosition=parseInt(temp.slice(5,8)+temp2.slice(0,2),2);//Top to bottom
    temp=get(0x22);
    temp2=get(0x23);
    thisMii.hair.page=+lookupTables.hairTable[""+parseInt(temp.slice(0,7),2)][0]-1;
    thisMii.hair.type=+convTables.formatTo[lookupTables.hairTable[""+parseInt(temp.slice(0,7),2)][2]-1][lookupTables.hairTable[""+parseInt(temp.slice(0,7),2)][1]-1];//0-71, Needs lookup table
    thisMii.hair.color=parseInt(temp[7]+temp2.slice(0,2),2);//0-7, refer to hairCols array
    thisMii.hair.flipped=temp2[2]==="0"?false:true;
    temp=get(0x24);
    temp2=get(0x25);
    thisMii.eyebrows.page=+lookupTables.eyebrowTable[""+parseInt(temp.slice(0,5),2)][0]-1;
    thisMii.eyebrows.type=convTables.formatTo[lookupTables.eyebrowTable[""+parseInt(temp.slice(0,5),2)][2]-1][lookupTables.eyebrowTable[""+parseInt(temp.slice(0,5),2)][1]-1];//0-23, Needs lookup table
    thisMii.eyebrows.rotation=parseInt(temp.slice(6,8)+temp2.slice(0,2),2);//0-11, default varies based on eyebrow type
    temp=get(0x26);
    temp2=get(0x27);
    thisMii.eyebrows.color=parseInt(temp.slice(0,3),2);
    thisMii.eyebrows.size=parseInt(temp.slice(3,7),2);//0-8, default 4
    thisMii.eyebrows.yPosition=(parseInt(temp[7]+temp2.slice(0,4),2))-3;//0-15, default 10
    thisMii.eyebrows.distanceApart=parseInt(temp2.slice(4,8),2);//0-12, default 2
    thisMii.eyes.page=+lookupTables.eyeTable[parseInt(get(0x28).slice(0,6),2)][0]-1;//0-47, needs lookup table
    thisMii.eyes.type=convTables.formatTo[lookupTables.eyeTable[parseInt(get(0x28).slice(0,6),2)][2]-1][lookupTables.eyeTable[parseInt(get(0x28).slice(0,6),2)][1]-1];//0-47, needs lookup table
    temp=get(0x29);
    thisMii.eyes.rotation=parseInt(temp.slice(0,3),2);//0-7, default varies based on eye type
    thisMii.eyes.yPosition=parseInt(temp.slice(3,8),2);//0-18, default 12, top to bottom
    temp=get(0x2A);
    thisMii.eyes.color=parseInt(temp.slice(0,3),2);//0-5
    thisMii.eyes.size=parseInt(temp.slice(4,7),2);//0-7, default 4
    temp2=get(0x2B);
    thisMii.eyes.distanceApart=parseInt(temp[7]+temp2.slice(0,3),2);//0-12, default 2
    temp=get(0x30);
    thisMii.glasses.type=parseInt(temp.slice(0,4),2);//0-8
    thisMii.glasses.color=parseInt(temp.slice(4,7),2);//0-5
    temp=get(0x31);
    thisMii.glasses.size=parseInt(temp.slice(0,3),2);//0-7, default 4
    thisMii.glasses.yPosition=parseInt(temp.slice(3,8),2);//0-20, default 10
    temp=get(0x32);
    temp2=get(0x33);
    thisMii.beard.mustache.type=parseInt(temp.slice(0,2),2);//0-3
    thisMii.beard.type=parseInt(temp.slice(2,4),2);//0-3
    thisMii.beard.color=parseInt(temp.slice(4,7),2);//0-7
    thisMii.beard.mustache.size=parseInt(temp[7]+temp2.slice(0,3),2);//0-30, default 20
    thisMii.beard.mustache.yPosition=parseInt(temp2.slice(3,8),2);//0-16, default 2
    thisMii.console="Wii";
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
        qrCode = jsQR(imageData.data, imageData.width, imageData.height)?.binaryData;
        if(!qrCode){
            console.error("Failed to read QR Code.");
            return;
        }
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
        const miiJson = {
            general:{},
            perms:{},
            meta:{},
            face:{},
            nose:{},
            mouth:{},
            mole:{},
            hair:{},
            eyebrows:{},
            eyes:{},
            glasses:{},
            beard:{
                mustache:{}
            }
        };
        const get = address => getBinaryFromAddress(address, data);
        var temp=get(0x18);
        var temp2=get(0x19);
        miiJson.general.birthday=parseInt(temp2.slice(6,8)+temp.slice(0,3),2);
        miiJson.general.birthMonth=parseInt(temp.slice(3,7),2);
        //Handle UTF-16 Names
        var name = "";
        for (var i = 0x1A; i < 0x2E; i += 2) {
            let lo = data[i];
            let hi = data[i + 1];
            if (lo === 0x00 && hi === 0x00) {
                break;
            }
            let codeUnit = (hi << 8) | lo;
            name += String.fromCharCode(codeUnit);
        }
        miiJson.meta.name = name.replace(/\u0000/g, "");
        var cname = "";
        for (var i = 0x48; i < 0x5C; i += 2) {
            let lo = data[i];
            let hi = data[i + 1];
            if (lo === 0x00 && hi === 0x00) {
                break;
            }
            let codeUnit = (hi << 8) | lo;
            cname += String.fromCharCode(codeUnit);
        }
        miiJson.meta.creatorName = cname.replace(/\u0000/g, "");
        miiJson.general.height=parseInt(get(0x2E),2);
        miiJson.general.weight=parseInt(get(0x2F),2);
        miiJson.general.gender=+temp[7];
        temp=get(0x30);
        miiJson.perms.sharing=temp[7]==="1"?false:true;
        miiJson.general.favoriteColor=parseInt(temp2.slice(2,6),2);
        miiJson.perms.copying=get(0x01)[7]==="1"?true:false;
        miiJson.hair.page=lookupTable("hairs",parseInt(get(0x32),2),true)[0];
        miiJson.hair.type=lookupTable("hairs",parseInt(get(0x32),2),true)[1];
        miiJson.face.type=lookupTable("faces",parseInt(temp.slice(3,7),2),false);
        miiJson.face.color=parseInt(temp.slice(0,3),2);
        temp=get(0x31);
        miiJson.face.feature=parseInt(temp.slice(4,8),2);
        miiJson.face.makeup=parseInt(temp.slice(0,4),2);
        temp=get(0x34);
        miiJson.eyes.page=lookupTable("eyes",parseInt(temp.slice(2,8),2),true)[0];
        miiJson.eyes.type=lookupTable("eyes",parseInt(temp.slice(2,8),2),true)[1];
        temp2=get(0x33);
        miiJson.hair.color=parseInt(temp2.slice(5,8),2);
        miiJson.hair.flipped=temp2[4]==="0"?false:true;
        miiJson.eyes.color=parseInt(get(0x35)[7]+temp.slice(0,2),2);
        temp=get(0x35);
        miiJson.eyes.size=parseInt(temp.slice(3,7),2);
        miiJson.eyes.squash=parseInt(temp.slice(0,3),2);
        temp=get(0x36);
        temp2=get(0x37);
        miiJson.eyes.rotation=parseInt(temp.slice(3,8),2);
        miiJson.eyes.distanceApart=parseInt(temp2[7]+temp.slice(0,3),2);
        miiJson.eyes.yPosition=parseInt(temp2.slice(2,7),2);
        temp=get(0x38);
        miiJson.eyebrows.page=lookupTable("eyebrows",parseInt(temp.slice(3,8),2),true)[0];
        miiJson.eyebrows.type=lookupTable("eyebrows",parseInt(temp.slice(3,8),2),true)[1];
        miiJson.eyebrows.color=parseInt(temp.slice(0,3),2);
        temp=get(0x39);
        miiJson.eyebrows.size=parseInt(temp.slice(4,8),2);
        miiJson.eyebrows.squash=parseInt(temp.slice(1,4),2);
        temp=get(0x3A);
        miiJson.eyebrows.rotation=parseInt(temp.slice(4,8),2);
        temp2=get(0x3B);
        miiJson.eyebrows.distanceApart=parseInt(temp2[7]+temp.slice(0,3),2);
        miiJson.eyebrows.yPosition=parseInt(temp2.slice(2,7),2)-3;
        temp=get(0x3C);
        miiJson.nose.page=lookupTable("noses",parseInt(temp.slice(3,8),2),true)[0];
        miiJson.nose.type=lookupTable("noses",parseInt(temp.slice(3,8),2),true)[1];
        temp2=get(0x3D);
        miiJson.nose.size=parseInt(temp2[7]+temp.slice(0,3),2);
        miiJson.nose.yPosition=parseInt(temp2.slice(2,7),2);
        temp=get(0x3E);
        miiJson.mouth.page=lookupTable("mouths",parseInt(temp.slice(2,8),2),true)[0];
        miiJson.mouth.type=lookupTable("mouths",parseInt(temp.slice(2,8),2),true)[1];
        temp2=get(0x3F);
        miiJson.mouth.color=parseInt(temp2[7]+temp.slice(0,2),2);
        miiJson.mouth.size=parseInt(temp2.slice(3,7),2);
        miiJson.mouth.squash=parseInt(temp2.slice(0,3),2);
        temp=get(0x40);
        miiJson.mouth.yPosition=parseInt(temp.slice(3,8),2);
        miiJson.beard.mustache.type=parseInt(temp.slice(0,3),2);
        temp=get(0x42);
        miiJson.beard.type=parseInt(temp.slice(5,8),2);
        miiJson.beard.color=parseInt(temp.slice(2,5),2);
        temp2=get(0x43);
        miiJson.beard.mustache.size=parseInt(temp2.slice(6,8)+temp.slice(0,2),2);
        miiJson.beard.mustache.yPosition=parseInt(temp2.slice(1,6),2);
        temp=get(0x44);
        miiJson.glasses.type=parseInt(temp.slice(4,8),2);
        miiJson.glasses.color=parseInt(temp.slice(1,4),2);
        temp2=get(0x45);
        miiJson.glasses.size=parseInt(temp2.slice(5,8)+temp[0],2);
        miiJson.glasses.yPosition=parseInt(temp2.slice(0,5),2);
        temp=get(0x46);
        miiJson.mole.on=temp[7]==="0"?false:true;
        miiJson.mole.size=parseInt(temp.slice(3,7),2);
        temp2=get(0x47);
        miiJson.mole.xPosition=parseInt(temp2.slice(6,8)+temp.slice(0,3),2);
        miiJson.mole.yPosition=parseInt(temp2.slice(1,6),2);
        miiJson.meta.type="Default";//qk, Make this actually retrieve MiiID, SystemID, and Mii type
        miiJson.console="3DS";
        return miiJson;
    } else {
        console.error('Failed to read Mii.');
    }
}
async function renderMiiWithStudio(jsonIn){
    if(!["3ds","wii u"].includes(jsonIn.console?.toLowerCase())){
        jsonIn=convertMii(jsonIn);
    }
    var studioMii=convertMiiToStudio(jsonIn);
    return await downloadImage('https://studio.mii.nintendo.com/miis/image.png?data=' + studioMii + "&width=270&type=face");
}
async function createFFLMiiIcon(data, width, height, useBody, shirtColor, fflRes) {
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
    scene.background = null; // Transparent background.

    if(useBody){
        // After: const scene = new THREE.Scene(); scene.background = null;
        const ambient = new THREE.AmbientLight(0xffffff, 0.15);
        scene.add(ambient);

        const rim = new THREE.DirectionalLight(0xffffff, 3);
        rim.position.set(0.5, -7, -1.0);
        scene.add(rim);

    }

    let ffl, currentCharModel;

    const _realConsoleDebug = console.debug;
    console.debug = () => { };
    try {
        // Initialize FFL
        ffl = await initializeFFL(fflRes, ModuleFFL);

        // Create Mii model and add to the scene.
        const studioRaw = parseHexOrB64ToUint8Array(data); // Parse studio data
        
        // Convert Uint8Array to Buffer for struct-fu compatibility
        const studioBuffer = Buffer.from(studioRaw);
        
        currentCharModel = createCharModel(studioBuffer, null, FFLShaderMaterial, ffl.module);
        initCharModelTextures(currentCharModel, renderer); // Initialize fully
        scene.add(currentCharModel.meshes); // Add to scene

        //Add body
       if (useBody) {
            if (typeof GLTFLoader === 'undefined' || !GLTFLoader) {
                const mod = await import('three/examples/jsm/loaders/GLTFLoader.js');
                GLTFLoader = mod.GLTFLoader;
            }
            //Read GLB from disk and parse (avoids URL/fetch issues)
            const absPath = path.resolve(__dirname, './mii-body.glb');
            const buf = fs.readFileSync(absPath);
            const arrayBuffer = buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength);
            const loader = new GLTFLoader();
            const gltf = await new Promise((resolve, reject) => {
                loader.parse(
                    arrayBuffer,
                    path.dirname(absPath) + path.sep,
                    resolve,
                    reject
                );
            });

            const body = gltf.scene;

            body.position.y-=110;

            //Recolor
            body.userData.isMiiBody = true;
            body.traverse(o => {
                if (o.isMesh) {
                    if (!o.geometry.attributes.normal) {
                     o.geometry.computeVertexNormals();
                    }
                    const isShirt = (o.name === 'mesh_1_');
                    o.material?.dispose?.();
                    o.material = new THREE.MeshLambertMaterial({
                        //["Red", "Orange", "Yellow", "Lime", "Green", "Blue", "Cyan", "Pink", "Purple", "Brown", "White", "Black"]
                        color: isShirt ? [0xFF2400,0xF08000,0xFFD700,0xAAFF00,0x008000,0x0000FF,0x00D7FF,0xFF69B4,0x7F00FF,0x6F4E37,0xFFFFFF,0x303030][shirtColor] : 0x808080,
                        emissive: isShirt ? 0x330000 : 0x222222,
                        emissiveIntensity: 0.0
                    });
                    o.material.side = THREE.DoubleSide;
                    o.material.needsUpdate = true;
                }
            });



            // (6) Add to scene
            scene.add(body);
        }


        // Use the camera for an icon pose.
        const camera = getCameraForViewType(ViewType.MakeIcon);

        // The pixels coming from WebGL are upside down.
        camera.projectionMatrix.elements[5] *= -1; // Flip the camera Y axis.
        // When flipping the camera, the triangles are in the wrong direction.
        scene.traverse(mesh => {
            if (
                mesh.isMesh &&
                mesh.material.side === THREE.FrontSide &&
                !mesh.userData.isMiiBody
            ) {
                mesh.material.side = THREE.BackSide;
            }
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
    const studioMii = convertMiiToStudio(jsonIn);
    const width = height = 600;

    return createFFLMiiIcon(studioMii, width, height, true, jsonIn.general.favoriteColor, fflRes);
}
async function writeWiiBin(jsonIn, outPath) {
    if (jsonIn.console?.toLowerCase() !== "wii") {
        convertMii(jsonIn);
    }
    var mii=jsonIn;
    var miiBin="0";
    miiBin+=mii.general.gender;
    miiBin+=mii.general.birthMonth.toString(2).padStart(4,"0");
    miiBin+=mii.general.birthday.toString(2).padStart(5,"0");
    miiBin+=mii.general.favoriteColor.toString(2).padStart(4,"0");
    miiBin+='0';
    for(var i=0;i<10;i++){
        if(i<mii.meta.name.length){
            miiBin+=mii.meta.name.charCodeAt(i).toString(2).padStart(16,"0");
        }
        else{
            miiBin+="0000000000000000";
        }
    }
    miiBin+=mii.general.height.toString(2).padStart(8,"0");
    miiBin+=mii.general.weight.toString(2).padStart(8,"0");
    let miiId="";
    switch(mii.meta.type){
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
    miiBin+=miiId;
    miiBin+="11111111".repeat(4);//System ID
    miiBin+=mii.face.type.toString(2).padStart(3,"0");
    miiBin+=mii.face.color.toString(2).padStart(3,"0");
    miiBin+=mii.face.feature.toString(2).padStart(4,"0");
    miiBin+="000";
    if(mii.perms.mingle&&mii.meta.type.toLowerCase()==="special"){
        mii.perms.mingle=false;
        console.warn("A Special Mii cannot have Mingle on and still render on the Wii. Turned Mingle off in the output.");
    }
    miiBin+=mii.perms.mingle?"0":"1";
    miiBin+="0";
    miiBin+=mii.perms.fromCheckMiiOut?"1":"0";
    miiBin+=(+getKeyByValue(lookupTables.hairTable,`${mii.hair.page+1}${convTables.formatFrom[mii.hair.type]}`)).toString(2).padStart(7,"0");
    miiBin+=mii.hair.color.toString(2).padStart(3,"0");
    miiBin+=mii.hair.flipped?"1":"0";
    miiBin+="00000";
    miiBin+=(+getKeyByValue(lookupTables.eyebrowTable,`${mii.eyebrows.page+1}${convTables.formatFrom[mii.eyebrows.type]}`)).toString(2).padStart(5,"0");
    miiBin+="0";
    miiBin+=mii.eyebrows.rotation.toString(2).padStart(4,"0");
    miiBin+="000000";
    miiBin+=mii.eyebrows.color.toString(2).padStart(3,"0");
    miiBin+=mii.eyebrows.size.toString(2).padStart(4,"0");
    miiBin+=(mii.eyebrows.yPosition+3).toString(2).padStart(5,"0");
    miiBin+=mii.eyebrows.distanceApart.toString(2).padStart(4,"0");
    miiBin+=(+getKeyByValue(lookupTables.eyeTable,`${mii.eyes.page+1}${convTables.formatFrom[mii.eyes.type]}`)).toString(2).padStart(6,"0");
    miiBin+="00";
    miiBin+=mii.eyes.rotation.toString(2).padStart(3,"0");
    miiBin+=mii.eyes.yPosition.toString(2).padStart(5,"0");
    miiBin+=mii.eyes.color.toString(2).padStart(3,"0");
    miiBin+="0";
    miiBin+=mii.eyes.size.toString(2).padStart(3,"0");
    miiBin+=mii.eyes.distanceApart.toString(2).padStart(4,"0");
    miiBin+="00000";
    miiBin+=lookupTables.wiiNoses[mii.nose.type].toString(2).padStart(4,"0");
    miiBin+=mii.nose.size.toString(2).padStart(4,"0");
    miiBin+=mii.nose.yPosition.toString(2).padStart(5,"0");
    miiBin+="000";
    miiBin+=(+getKeyByValue(lookupTables.mouthTable,`${mii.mouth.page+1}${convTables.formatFrom[mii.mouth.type]}`)).toString(2).padStart(5,"0");
    miiBin+=mii.mouth.color.toString(2).padStart(2,"0");
    miiBin+=mii.mouth.size.toString(2).padStart(4,"0");
    miiBin+=mii.mouth.yPosition.toString(2).padStart(5,"0");
    miiBin+=mii.glasses.type.toString(2).padStart(4,"0");
    miiBin+=mii.glasses.color.toString(2).padStart(3,"0");
    miiBin+="0";
    miiBin+=mii.glasses.size.toString(2).padStart(3,"0");
    miiBin+=mii.glasses.yPosition.toString(2).padStart(5,"0");
    miiBin+=mii.beard.mustache.type.toString(2).padStart(2,"0");
    miiBin+=mii.beard.type.toString(2).padStart(2,"0");
    miiBin+=mii.beard.color.toString(2).padStart(3,"0");
    miiBin+=mii.beard.mustache.size.toString(2).padStart(4,"0");
    miiBin+=mii.beard.mustache.yPosition.toString(2).padStart(5,"0");
    miiBin+=mii.mole.on?"1":"0";
    miiBin+=mii.mole.size.toString(2).padStart(4,"0");
    miiBin+=mii.mole.yPosition.toString(2).padStart(5,"0");
    miiBin+=mii.mole.xPosition.toString(2).padStart(5,"0");
    miiBin+="0";
    for(var i=0;i<10;i++){
        if(i<mii.meta.creatorName.length){
            miiBin+=mii.meta.creatorName.charCodeAt(i).toString(2).padStart(16,"0");
        }
        else{
            miiBin+="0000000000000000";
        }
    }
    
    //Writing based on miiBin
    var toWrite=miiBin.match(/.{1,8}/g);
    var buffers=[];
    for(var i=0;i<toWrite.length;i++){
        buffers.push(parseInt(toWrite[i],2));
    }
    toWrite=Buffer.from(buffers);
    if(outPath){
        await fs.promises.writeFile(outPath, toWrite);
    }
    else{
        return toWrite;
    }
}
async function write3DSQR(miiJson, outPath, fflRes = getFFLRes()) {
    //Convert the Mii if it isn't in 3DS format
    if (!["3ds", "wii u"].includes(miiJson.console?.toLowerCase())) {
        miiJson = convertMii(miiJson);
    }
    
    //Make the binary
    var mii=miiJson;
    var miiBin = "00000011";
    //If Special Miis are being used improperly, fix it and warn the user
    if(mii.meta.type.toLowerCase()==="special"&&(mii.console.toLowerCase()==="wii u"||mii.console.toLowerCase()==="wiiu")){
        mii.meta.type="Default";
        console.warn("Wii Us do not work with Special Miis. Reverted to Default Mii.");
    }
    if(mii.perms.sharing&&mii.meta.type==="Special"){
        mii.perms.sharing=false;
        console.warn("Cannot have Sharing enabled for Special Miis. Disabled Sharing in the output.");
    }
    miiBin+="0000000";
    miiBin+=mii.perms.copying?"1":"0";
    miiBin+="00000000";
    miiBin+="00110000";
    miiBin+="1000101011010010000001101000011100011000110001100100011001100110010101100111111110111100000001110101110001000101011101100000001110100100010000000000000000000000".slice(0,8*8);
    miiBin+=mii.meta.type==="Special"?"0":"1";
    miiBin+="0000000";
    for(var i=0;i<3;i++){
        miiBin+=Math.floor(Math.random()*255).toString(2).padStart(8,"0");
    }
    miiBin+="0000000001000101011101100000001110100100010000000000000000000000";
    miiBin+=mii.general.birthday.toString(2).padStart(5,"0").slice(2,5);
    miiBin+=mii.general.birthMonth.toString(2).padStart(4,"0");
    miiBin+=mii.general.gender;
    miiBin+="00";
    miiBin+=mii.general.favoriteColor.toString(2).padStart(4,"0");
    miiBin+=mii.general.birthday.toString(2).padStart(5,"0").slice(0,2);
    for (var i = 0; i < 10; i++) {
        if (i < mii.meta.name.length) {
            let code = mii.meta.name.charCodeAt(i);
            miiBin += (code & 0xFF).toString(2).padStart(8, "0");
            miiBin += ((code >> 8) & 0xFF).toString(2).padStart(8, "0");
        }
        else {
            miiBin += "0000000000000000";
        }
    }
    miiBin+=mii.general.height.toString(2).padStart(8,"0");
    miiBin+=mii.general.weight.toString(2).padStart(8,"0");
    miiBin+=mii.face.color.toString(2).padStart(3,"0");
    miiBin+=lookupTables.faces.values[mii.face.type].toString(2).padStart(4,"0");
    miiBin+=mii.perms.sharing?"0":"1";
    miiBin+=mii.face.makeup.toString(2).padStart(4,"0");
    miiBin+=mii.face.feature.toString(2).padStart(4,"0");
    miiBin+=lookupTables.hairs.values[mii.hair.page][mii.hair.type].toString(2).padStart(8,"0");
    miiBin+="0000";
    miiBin+=mii.hair.flipped?"1":"0";
    miiBin+=mii.hair.color.toString(2).padStart(3,"0");
    miiBin+=mii.eyes.color.toString(2).padStart(3,"0").slice(1,3);
    miiBin+=lookupTables.eyes.values[mii.eyes.page][mii.eyes.type].toString(2).padStart(6,"0");
    miiBin+=mii.eyes.squash.toString(2).padStart(3,"0");
    miiBin+=mii.eyes.size.toString(2).padStart(4,"0");
    miiBin+=mii.eyes.color.toString(2).padStart(3,"0")[0];
    miiBin+=mii.eyes.distanceApart.toString(2).padStart(4,"0").slice(1,4);
    miiBin+=mii.eyes.rotation.toString(2).padStart(5,"0");
    miiBin+="00";
    miiBin+=mii.eyes.yPosition.toString(2).padStart(5,"0");
    miiBin+=mii.eyes.distanceApart.toString(2).padStart(4,"0")[0];
    miiBin+=mii.eyebrows.color.toString(2).padStart(3,"0");
    miiBin+=lookupTables.eyebrows.values[mii.eyebrows.page][mii.eyebrows.type].toString(2).padStart(5,"0");
    miiBin+="0";
    miiBin+=mii.eyebrows.squash.toString(2).padStart(3,"0");
    miiBin+=mii.eyebrows.size.toString(2).padStart(4,"0");
    miiBin+=mii.eyebrows.distanceApart.toString(2).padStart(4,"0").slice(1,4);
    miiBin+="0";
    miiBin+=mii.eyebrows.rotation.toString(2).padStart(4,"0");
    miiBin+="00";
    miiBin+=(mii.eyebrows.yPosition+3).toString(2).padStart(5,"0");
    miiBin+=mii.eyebrows.distanceApart.toString(2).padStart(4,"0")[0];
    miiBin+=mii.nose.size.toString(2).padStart(4,"0").slice(1,4);
    miiBin+=lookupTables.noses.values[mii.nose.page][mii.nose.type].toString(2).padStart(5,"0");
    miiBin+="00";
    miiBin+=mii.nose.yPosition.toString(2).padStart(5,"0");
    miiBin+=mii.nose.size.toString(2).padStart(4,"0")[0];
    miiBin+=mii.mouth.color.toString(2).padStart(3,"0").slice(1,3);
    miiBin+=lookupTables.mouths.values[mii.mouth.page][mii.mouth.type].toString(2).padStart(6,"0");
    miiBin+=mii.mouth.squash.toString(2).padStart(3,"0");
    miiBin+=mii.mouth.size.toString(2).padStart(4,"0");
    miiBin+=mii.mouth.color.toString(2).padStart(3,"0")[0];
    miiBin+=mii.beard.mustache.type.toString(2).padStart(3,"0");
    miiBin+=mii.mouth.yPosition.toString(2).padStart(5,"0");
    miiBin+="00000000";
    miiBin+=mii.beard.mustache.size.toString(2).padStart(4,"0").slice(2,4);
    miiBin+=mii.beard.color.toString(2).padStart(3,"0");
    miiBin+=mii.beard.type.toString(2).padStart(3,"0");
    miiBin+="0";
    miiBin+=mii.beard.mustache.yPosition.toString(2).padStart(5,"0");
    miiBin+=mii.beard.mustache.size.toString(2).padStart(4,"0").slice(0,2);
    miiBin+=mii.glasses.size.toString(2).padStart(4,"0")[3];
    miiBin+=mii.glasses.color.toString(2).padStart(3,"0");
    miiBin+=mii.glasses.type.toString(2).padStart(4,"0");
    miiBin+="0";
    miiBin+=mii.glasses.yPosition.toString(2).padStart(4,"0");
    miiBin+=mii.glasses.size.toString(2).padStart(4,"0").slice(0,3);
    miiBin+=mii.mole.xPosition.toString(2).padStart(5,"0").slice(2,5);
    miiBin+=mii.mole.size.toString(2).padStart(4,"0");
    miiBin+=mii.mole.on?"1":"0";
    miiBin+="0";
    miiBin+=mii.mole.yPosition.toString(2).padStart(5,"0");
    miiBin+=mii.mole.xPosition.toString(2).padStart(5,"0").slice(0,2);
    for (var i = 0; i < 10; i++) {
        if (i < mii.meta.creatorName.length) {
            let code = mii.meta.creatorName.charCodeAt(i);
            miiBin += (code & 0xFF).toString(2).padStart(8, "0");
            miiBin += ((code >> 8) & 0xFF).toString(2).padStart(8, "0");
        }
        else {
            miiBin += "0000000000000000";
        }
    }
    //Writing based on the binary
    var toWrite=miiBin.match(/.{1,8}/g);
    var buffers=[];
    for(var i=0;i<toWrite.length;i++){
        buffers.push(parseInt(toWrite[i],2));
    }
    const buffer = Buffer.from(buffers);
    var encryptedData = Buffer.from(encodeAesCcm(new Uint8Array(buffer)));

    //Prepare a QR code
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
        },
        qrOptions:{
            errorCorrectionLevel:'H'
        }
    }
    const qrCodeImage = new QRCodeStyling({
        jsdom: JSDOM,
        nodeCanvas,
        ...options
    });
    const qrBuffer = Buffer.from(await qrCodeImage.getRawData("png"))

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
        text: miiJson.meta.name,
        alignmentX: Jimp.HORIZONTAL_ALIGN_CENTER,
        alignmentY: Jimp.VERTICAL_ALIGN_MIDDLE
    }, 424, 395);

    if (miiJson.meta.type === "Special") {
        const crown_img = await Jimp.read(path.join(__dirname, 'crown.jpg'));
        crown_img.resize(40, 20);
        main_img.blit(crown_img, 225, 160);
    }

    // Get the buffer
    const imageBuffer = await main_img.getBufferAsync(Jimp.MIME_PNG);
    
    // Optionally write to file if outPath is provided
    if (outPath) {
        await main_img.writeAsync(outPath);
    }
    
    return imageBuffer;
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
        var typeCheat=[1,2,3,1,2,3,1,2,3,1,2,3];
        var instrs={
            "base":`Select "${mii.general.gender}", and then "Start from Scratch".`,
            "col":`On the info page (first tab), set the Favorite Color to ${lookupTables.favCols[mii.general.favoriteColor]} (${mii.general.favoriteColor<=5?mii.general.favoriteColor+1:mii.general.favoriteColor-5} from the left, ${mii.general.favoriteColor>5?"bottom":"top"} row).`,
            "heightWeight":`On the build page (second tab), set the height to ${Math.round((100/128)*mii.general.height)}%, and the weight to ${Math.round((100/128)*mii.general.weight)}%.`,
            "faceShape":`On the face page (third tab), set the shape to the one ${Math.floor(mii.face.type/2)+1} from the top, in the ${mii.face.type%2===0?"left":"right"} column.`,
            "skinCol":`On the face page (third tab), set the color to the one ${mii.face.color+mii.face.color>2?-2:1} from the left, on the ${mii.face.color>2?`bottom`:`top`} row.`,
            "makeup":`On the face page's makeup tab, set the makeup to the one ${Math.ceil((mii.face.feature+1)/3)} from the top, and ${typeCheat[mii.face.feature]} from the left.`,
            "hairStyle":`On the hair page (fourth tab), set the hair style to the one ${typeCheat[mii.hair.type]} from the left, ${Math.ceil((mii.hair.type+1)/3)} from the top, on page ${mii.hair.page}.`,
            "hairFlipped":`${mii.hair.flipped?`On the hair page (fourth tab), press the button to flip the hair.`:``}`,
            "hairColor":`On the hair page (fourth tab), set the hair color to the one ${mii.hair.col+(mii.hair.col>3?-3:1)} from the left, on the ${mii.hair.col>3?`bottom`:`top`} row.`,
            "eyebrowStyle":`On the eyebrow page (fifth tab), set the eyebrow style to the one ${typeCheat[mii.eyebrows.type]} from the left, ${Math.ceil((mii.eyebrows.type+1)/3)} from the top, on page ${mii.eyebrows.page}.`,
            "eyebrowColor":`On the eyebrow page (fifth tab), set the eyebrow color to the one ${mii.eyebrows.color+(mii.eyebrows.color>3?-3:1)} from the left, on the ${mii.eyebrows.color>3?`bottom`:`top`} row.`,
            "eyebrowY":`${mii.eyebrows.yPos!==7?`On the eyebrow page (fifth tab), `:``}${mii.eyebrows.yPosition<7?`press the up button ${7-mii.eyebrows.yPosition} times.`:mii.eyebrows.yPosition>7?`press the down button ${mii.eyebrows.yPosition-7} times.`:``}`,
            "eyebrowSize":`${mii.eyebrows.size!==4?`On the eyebrow page (fifth tab), `:``}${mii.eyebrows.size<4?`press the shrink button ${4-mii.eyebrows.size} times.`:mii.eyebrows.size>4?`press the enlarge button ${mii.eyebrows.size-4} times.`:``}`,
            "eyebrowRot":`${mii.eyebrows.rotation!==6?`On the eyebrow page (fifth tab), `:``}${mii.eyebrows.rotation<6?`press the rotate clockwise button ${6-mii.eyebrows.rotation} times.`:mii.eyebrows.rotation>6?`press the rotate counter-clockwise button ${mii.eyebrows.rotation-6} times.`:``}`,
            "eyebrowDist":`${mii.eyebrows.distApart!==2?`On the eyebrow page (fifth tab), `:``}${mii.eyebrows.distanceApart<2?`press the closer-together button ${2-mii.eyebrows.distanceApart} times.`:mii.eyebrows.distanceApart>2?`press the further-apart button ${mii.eyebrows.distanceApart-2} times.`:``}`,
            "eyeType":`On the eye page (sixth tab), set the eye type to the one ${typeCheat[mii.eyes.type]} from the left, ${Math.ceil((mii.eyes.type+1)/3)} from the top, on page ${mii.eyes.page}.`,
            "eyeColor":`On the eye page (sixth tab), set the color to the one ${mii.eyes.color+(mii.eyes.color>2?-2:1)} from the left, on the ${mii.eyes.color>2?`bottom`:`top`} row.`,
            "eyeY":`${mii.eyes.yPos!==12?`On the eye page (sixth tab), `:``}${mii.eyes.yPosition<12?`press the up button ${12-mii.eyes.yPosition} times.`:mii.eyes.yPosition>12?`press the down button ${mii.eyes.yPosition-12} times.`:``}`,
            "eyeSize":`${mii.eyes.size!==4?`On the eye page (sixth tab), `:``}${mii.eyes.size<4?`press the shrink button ${4-mii.eyes.size} times.`:mii.eyes.size>4?`press the enlarge button ${mii.eyes.size-4} times.`:``}`,
            "eyeRot":`${mii.eyes.rotation!==(mii.general.gender==="Female"?3:4)?`On the eye page (sixth tab), `:``}${mii.eyes.rotation<(mii.general.gender==="Female"?3:4)?`press the rotate clockwise button ${(mii.general.gender==="Female"?3:4)-mii.eyes.rotation} times.`:mii.eyes.rotation>(mii.general.gender==="Female"?3:4)?`press the rotate counter-clockwise button ${mii.eyes.rotation-(mii.general.gender==="Female"?3:4)} times.`:``}`,
            "eyeDist":`${mii.eyes.distanceApart!==2?`On the eye page (sixth tab), `:``}${mii.eyes.distanceApart<2?`press the closer-together button ${2-mii.eyes.distanceApart} times.`:mii.eyes.distanceApart>2?`press the further-apart button ${mii.eyes.distanceApart-2} times.`:``}`,
            "noseType":`On the nose page (seventh tab), set the nose to the one ${Math.ceil((mii.nose.type+1)/3)} from the top, and ${typeCheat[mii.nose.type]} from the left.`,
            "noseY":`${mii.nose.yPosition!==9?`On the nose page (seventh tab), `:``}${mii.nose.yPosition<9?`press the up button ${9-mii.nose.yPosition} times.`:mii.nose.yPosition>9?`press the down button ${mii.nose.yPosition-9} times.`:``}`,
            "noseSize":`${mii.nose.size!==4?`On the nose page (seventh tab), `:``}${mii.nose.size<4?`press the shrink button ${4-mii.nose.size} times.`:mii.nose.size>4?`press the enlarge button ${mii.nose.size-4} times.`:``}`,
            "mouthType":`On the mouth page (eighth tab), set the mouth type to the one ${typeCheat[mii.mouth.type]} from the left, ${Math.ceil((mii.mouth.type+1)/3)} from the top, on page ${mii.mouth.page}.`,
            "mouthCol":`On the mouth page (eighth tab), set the color to the one ${mii.mouth.col+1} from the left.`,
            "mouthY":`${mii.mouth.yPosition!==13?`On the mouth page (eighth tab), `:``}${mii.mouth.yPosition<13?`press the up button ${13-mii.mouth.yPosition} times.`:mii.mouth.yPosition>13?`press the down button ${mii.mouth.yPosition-13} times.`:``}`,
            "mouthSize":`${mii.mouth.size!==4?`On the mouth page (eighth tab), `:``}${mii.mouth.size<4?`press the shrink button ${4-mii.mouth.size} times.`:mii.mouth.size>4?`press the enlarge button ${mii.mouth.size-4} times.`:``}`,
            "glasses":`On the glasses page (within the ninth tab), set the glasses to the one ${Math.ceil((mii.glasses.type+1)/3)} from the top, and ${typeCheat[mii.glasses.type]} from the left.`,
            "glassesCol":`On the glasses page (within the ninth tab), set the color to the one ${mii.glasses.color+(mii.glasses.color>2?-2:1)} from the left, on the ${mii.glasses.color>2?`bottom`:`top`} row.`,
            "glassesY":`${mii.glasses.yPosition!==10?`On the glasses page (within the ninth tab), `:``}${mii.glasses.yPosition<10?`press the up button ${10-mii.glasses.yPosition} times.`:mii.glasses.yPosition>10?`press the down button ${mii.glasses.yPosition-10} times.`:``}`,
            "glassesSize":`${mii.glasses.size!==4?`On the glasses page (within the ninth tab), `:``}${mii.glasses.size<4?`press the shrink button ${4-mii.glasses.size} times.`:mii.glasses.size>4?`press the enlarge button ${mii.glasses.size-4} times.`:``}`,
            "stache":`On the mustache page (within the ninth tab), set the mustache to the one on the ${[0,1].includes(mii.beard.mustache.type)?`top`:`bottom`}-${[0,2].includes(mii.beard.mustache.type)?`left`:`right`}.`,
            "stacheY":`${mii.beard.mustache.yPosition!==10?`On the mustache page (within the ninth tab), press the `:``}${mii.beard.mustache.yPos>10?`down button ${mii.beard.mustache.yPos-10} times.`:mii.beard.mustache.yPos<10?`up button ${10-mii.beard.mustache.yPos} times.`:``}`,
            "stacheSize":`${mii.beard.mustache.size!==4?`On the mustache page (within the ninth tab), `:``}${mii.beard.mustache.size<4?`press the shrink button ${4-mii.beard.mustache.size} times.`:mii.beard.mustache.size>4?`press the enlarge button ${mii.beard.mustache.size-4} times.`:``}`,
            "mole":`${mii.mole.on?`On the mole page (within the ninth tab), turn the mole on.`:``}`,
            "moleX":`${mii.mole.xPosition!==2?`On the mole page (within the ninth tab), press the `:``}${mii.mole.xPosition>2?`right button ${mii.mole.xPosition-2} times.`:mii.mole.xPosition<2?`left button ${2-mii.mole.xPosition} times.`:``}`,
            "moleY":`${mii.mole.yPosition!==20?`On the mole page (within the ninth tab), press the `:``}${mii.mole.yPosition>20?`down button ${mii.mole.yPosition-20} times.`:mii.mole.yPosition<20?`up button ${20-mii.mole.yPosition} times.`:``}`,
            "moleSize":`${mii.mole.size!==4?`On the mole page (within the ninth tab), `:``}${mii.mole.size<4?`press the shrink button ${4-mii.mole.size} times.`:mii.mole.size>4?`press the enlarge button ${mii.mole.size-4} times.`:``}`,
            "beard":`On the beard page (within the ninth tab), set the beard to the one on the ${[0,1].includes(mii.beard.type)?`top`:`bottom`}-${[0,2].includes(mii.beard.type)?`left`:`right`}.`,
            "beardCol":`On the mustache OR beard pages (within the ninth tab), set the color to the one ${mii.beard.col+(mii.beard.col>3?-3:1)} from the left, on the ${mii.facialHair.col>3?`bottom`:`top`} row.`,
            "other":`The Nickname of this Mii is ${mii.info.name}.${mii.info.creatorName?` The creator was ${mii.info.creatorName}.`:``} Mingle was turned ${mii.info.mingle?`on`:`off`}.${mii.info.birthday!==0?` Its birthday is ${["","January","February","March","April","May","June","July","August","September","October","November","December"][mii.info.birthMonth]} ${mii.info.birthday}.`:``}`
        };
        if(!full){
            var defaultMiiInstrs=structuredClone(mii.general.gender==="Male"?defaultInstrs.wii.male:defaultInstrs.wii.female);
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
            "base":`Select "Start from Scratch", and then "${mii.general.gender}".`,
            "faceShape":`On the face page (first tab), set the face shape to the one ${Math.ceil((mii.face.type+1)/3)} from the top, and ${typeCheat[mii.face.type]} from the left.`,
            "skinCol":`On the face page (first tab), set the color to the one ${mii.face.color+1} from the top.`,
            "makeup":`On the face page's makeup tab, set the makeup to the one ${Math.ceil((mii.face.makeup+1)/3)} from the top, and ${typeCheat[mii.face.makeup]} from the left.`,
            "feature":`On the face page's wrinkles tab, set the facial feature to the one ${Math.ceil((mii.face.feature+1)/3)+1} from the top, and ${typeCheat[mii.face.makeup]} from the left.`,
            "hairStyle":`On the hair page (second tab), set the hair style to the one ${Math.ceil((mii.hair.type+1)/3)} from the top, and ${typeCheat[mii.hair.type]} from the left, on page ${mii.hair.page+1}.`,
            "hairFlipped":`${mii.hair.flipped?`On the hair page (second tab), press the button to flip the hair.`:``}`,
            "hairColor":`On the hair page (second tab), set the hair color to the one ${mii.hair.color+1} from the top.`,
            "eyebrowStyle":`On the eyebrow page (third tab), set the eyebrow style to the one ${typeCheat[mii.eyebrows.type]} from the left, ${Math.ceil((mii.eyebrows.type+1)/3)} from the top, on page ${mii.eyebrows.page+1}.`,
            "eyebrowColor":`On the eyebrow page (third tab), set the eyebrow color to the one ${mii.eyebrows.color+1} from the top.`,
            "eyebrowY":`${mii.eyebrows.yPosition!==7?`On the eyebrow page (third tab), `:``}${mii.eyebrows.yPosition<7?`press the up button ${7-mii.eyebrows.yPosition} times.`:mii.eyebrows.yPosition>7?`press the down button ${mii.eyebrows.yPosition-7} times.`:``}`,
            "eyebrowSize":`${mii.eyebrows.size!==4?`On the eyebrow page (third tab), `:``}${mii.eyebrows.size<4?`press the shrink button ${4-mii.eyebrows.size} times.`:mii.eyebrows.size>4?`press the enlarge button ${mii.eyebrows.size-4} times.`:``}`,
            "eyebrowRot":`${mii.eyebrows.rotation!==6?`On the eyebrow page (third tab), `:``}${mii.eyebrows.rotation<6?`press the rotate clockwise button ${6-mii.eyebrows.rotation} times.`:mii.eyebrows.rotation>6?`press the rotate counter-clockwise button ${mii.eyebrows.rotation-6} times.`:``}`,
            "eyebrowDist":`${mii.eyebrows.distanceApart!==2?`On the eyebrow page (third tab), `:``}${mii.eyebrows.distanceApart<2?`press the closer-together button ${2-mii.eyebrows.distanceApart} times.`:mii.eyebrows.distanceApart>2?`press the further-apart button ${mii.eyebrows.distanceApart-2} times.`:``}`,
            "eyebrowSquash":`${mii.eyebrows.squash!==3?`On the eyebrow page (third tab), `:``}${mii.eyebrows.squash<3?`press the squish button ${3-mii.eyebrows.squash} times.`:mii.eyebrows.squash>3?`press the un-squish button ${mii.eyebrows.squash-3} times.`:``}`,
            "eyeType":`On the eye page (fourth tab), set the eye type to the one ${typeCheat[mii.eyes.type]} from the left, ${Math.ceil((mii.eyes.type+1)/3)} from the top, on page ${mii.eyes.page+1}.`,
            "eyeColor":`On the eye page (fourth tab), set the color to the one ${mii.eyes.col+1} from the top.`,
            "eyeY":`${mii.eyes.yPosition!==12?`On the eye page (fourth tab), `:``}${mii.eyes.yPosition<12?`press the up button ${12-mii.eyes.yPosition} times.`:mii.eyes.yPosition>12?`press the down button ${mii.eyes.yPosition-12} times.`:``}`,
            "eyeSize":`${mii.eyes.size!==4?`On the eye page (fourth tab), `:``}${mii.eyes.size<4?`press the shrink button ${4-mii.eyes.size} times.`:mii.eyes.size>4?`press the enlarge button ${mii.eyes.size-4} times.`:``}`,
            "eyeRot":`${mii.eyes.rotation!==(mii.general.gender==="Female"?3:4)?`On the eye page (fourth tab), `:``}${mii.eyes.rotation<(mii.general.gender==="Female"?3:4)?`press the rotate clockwise button ${(mii.general.gender==="Female"?3:4)-mii.eyes.rotation} times.`:mii.eyes.rotation>(mii.general.gender==="Female"?3:4)?`press the rotate counter-clockwise button ${mii.eyes.rotation-(mii.general.gender==="Female"?3:4)} times.`:``}`,
            "eyeDist":`${mii.eyes.distanceApart!==2?`On the eye page (fourth tab), `:``}${mii.eyes.distanceApart<2?`press the closer-together button ${2-mii.eyes.distanceApart} times.`:mii.eyes.distanceApart>2?`press the further-apart button ${mii.eyes.distanceApart-2} times.`:``}`,
            "eyeSquash":`${mii.eyes.squash!==3?`On the eye page (fourth tab), `:``}${mii.eyes.squash<3?`press the squish button ${3-mii.eyes.squash} times.`:mii.eyes.squash>3?`press the un-squish button ${mii.eyes.squash-3} times.`:``}`,
            "noseType":`On the nose page (fifth tab), set the nose to the one ${Math.ceil((mii.nose.type+1)/3)} from the top, and ${typeCheat[mii.nose.type]} from the left, on page ${mii.nose.page}.`,
            "noseY":`${mii.nose.yPosition!==9?`On the nose page (fifth tab), `:``}${mii.nose.yPosition<9?`press the up button ${9-mii.nose.yPosition} times.`:mii.nose.yPosition>9?`press the down button ${mii.nose.yPosition-9} times.`:``}`,
            "noseSize":`${mii.nose.size!==4?`On the nose page (fifth tab), `:``}${mii.nose.size<4?`press the shrink button ${4-mii.nose.size} times.`:mii.nose.size>4?`press the enlarge button ${mii.nose.size-4} times.`:``}`,
            "mouthType":`On the mouth page (sixth tab), set the mouth type to the one ${typeCheat[mii.mouth.type]} from the left, ${Math.ceil((mii.mouth.type+1)/3)} from the top, on page ${mii.mouth.page+1}.`,
            "mouthCol":`On the mouth page (sixth tab), set the color to the one ${mii.mouth.color+1} from the top.`,
            "mouthY":`${mii.mouth.yPosition!==13?`On the mouth page (sixth tab), `:``}${mii.mouth.yPosition<13?`press the up button ${13-mii.mouth.yPosition} times.`:mii.mouth.yPosition>13?`press the down button ${mii.mouth.yPosition-13} times.`:``}`,
            "mouthSize":`${mii.mouth.size!==4?`On the mouth page (sixth tab), `:``}${mii.mouth.size<4?`press the shrink button ${4-mii.mouth.size} times.`:mii.mouth.size>4?`press the enlarge button ${mii.mouth.size-4} times.`:``}`,
            "mouthSquash":`${mii.mouth.squash!==3?`On the mouth page (sixth tab), `:``}${mii.mouth.squash<3?`press the squish button ${3-mii.mouth.squash} times.`:mii.mouth.squash>3?`press the un-squish button ${mii.mouth.squash-3} times.`:``}`,
            "glasses":`On the glasses page (within the seventh tab), set the glasses to the one ${Math.ceil((mii.glasses.type+1)/3)} from the top, and ${typeCheat[mii.glasses.type]} from the left.`,
            "glassesCol":`On the glasses page (within the seventh tab), set the color to the one ${mii.glasses.col+1} from the top.`,
            "glassesY":`${mii.glasses.yPosition!==10?`On the glasses page (within the seventh tab), `:``}${mii.glasses.yPosition<10?`press the up button ${10-mii.glasses.yPosition} times.`:mii.glasses.yPosition>10?`press the down button ${mii.glasses.yPosition-10} times.`:``}`,
            "glassesSize":`${mii.glasses.size!==4?`On the glasses page (within the seventh tab), `:``}${mii.glasses.size<4?`press the shrink button ${4-mii.glasses.size} times.`:mii.glasses.size>4?`press the enlarge button ${mii.glasses.size-4} times.`:``}`,
            "stache":`On the mustache page (within the seventh tab), set the mustache to the one on the ${[0,1].includes(mii.beard.mustache.type)?`top`:[2,3].includes(mii.beard.mustache.type)?`middle`:`bottom`}-${[0,2,4].includes(mii.beard.mustache.type)?`left`:`right`}.`,
            "stacheY":`${mii.beard.mustache.yPosition!==10?`On the mustache page (within the seventh tab), press the `:``}${mii.beard.mustache.yPosition>10?`down button ${mii.beard.mustache.yPosition-10} times.`:mii.beard.mustache.yPosition<10?`up button ${10-mii.beard.mustache.yPosition} times.`:``}`,
            "stacheSize":`${mii.beard.mustache.size!==4?`On the mustache page (within the seventh tab), `:``}${mii.beard.mustache.size<4?`press the shrink button ${4-mii.beard.mustache.size} times.`:mii.beard.mustache.size>4?`press the enlarge button ${mii.beard.mustache.size-4} times.`:``}`,
            "mole":`${mii.mole.on?`On the mole page (within the seventh tab), turn the mole on.`:``}`,
            "moleX":`${mii.mole.xPosition!==2?`On the mole page (within the seventh tab), press the `:``}${mii.mole.xPosition>2?`right button ${mii.mole.xPosition-2} times.`:mii.mole.xPosition<2?`left button ${2-mii.mole.xPosition} times.`:``}`,
            "moleY":`${mii.mole.yPosition!==20?`On the mole page (within the seventh tab), press the `:``}${mii.mole.yPosition>20?`down button ${mii.mole.yPosition-20} times.`:mii.mole.yPosition<20?`up button ${20-mii.mole.yPosition} times.`:``}`,
            "moleSize":`${mii.mole.size!==4?`On the mole page (within the seventh tab), `:``}${mii.mole.size<4?`press the shrink button ${4-mii.mole.size} times.`:mii.mole.size>4?`press the enlarge button ${mii.mole.size-4} times.`:``}`,
            "beard":`On the beard page (within the seventh tab), set the beard to the one on the ${[0,1].includes(mii.beard.type)?`top`:[2,3].includes(mii.beard.type)?`middle`:`bottom`}-${[0,2].includes(mii.beard.type)?`left`:`right`}.`,
            "beardCol":`On the mustache OR beard pages (within the seventh tab), set the color to the one ${mii.beard.color+1} from the top.`,
            "heightWeight":`On the build page (eighth tab), set the height to ${Math.round((100/128)*mii.general.height)}%, and the weight to ${Math.round((100/128)*mii.general.weight)}%.`,
            "col":`On the info page (after pressing "Next"), set the Favorite Color to ${mii.general.favoriteColor} (${mii.general.favoriteColor<=5?mii.general.favoriteColor+1:mii.general.favoriteColor-5} from the left, ${mii.general.favoriteColor>5?"bottom":"top"} row).`,
            "other":`The Nickname of this Mii is ${mii.general.name}.${mii.general.creatorName?` The creator was ${mii.general.creatorName}.`:``} ${mii.general.birthday!==0?` Its birthday is ${["","January","February","March","April","May","June","July","August","September","October","November","December"][mii.general.birthMonth]} ${mii.general.birthday}.`:``}`
        };
        if(!full){
            var defaultMiiInstrs=structuredClone(mii.general.gender==="Male"?defaultInstrs["3ds"].male:defaultInstrs["3ds"].female);
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
