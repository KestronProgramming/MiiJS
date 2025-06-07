const fs = require('fs');
const { createCanvas, loadImage, ImageData } = require('canvas');
const jsQR = require('jsqr');
const Jimp = require('jimp');
const THREE = require('three');
const QRCode = require('qrcode');
const httpsLib = require('https');
const asmCrypto=require("./asmCrypto.js");
const path=require("path");
const createGL = require('gl');
const {FFLCharModelDescDefault,createCharModel,initCharModelTextures,initializeFFL,parseHexOrB64ToUint8Array}=require("./ffl.js");
const ModuleFFL=require("./ffl-emscripten-single-file.js");
const FFLShaderMaterial=require("./FFLShaderMaterial.js");
function getKeyByValue(object, value) {
    for (var key in object) {
      if (object[key] === value) {
        return key;
      }
    }
}

//If FFLResHigh.dat is in the same directory as Node.js is calling the library from, use it by default
var _fflRes=null;
if(fs.existsSync("./FFLResHigh.dat")){
    _fflRes=new Uint8Array(fs.readFileSync("./FFLResHigh.dat",""));
}

var binary;
function getBinaryFromAddress(addr){//EG: 0x20
    let byte = binary.readUInt8(addr);
    let binaryString = '';
    for (let i = 7; i >= 0; i--) {
        binaryString += ((byte >> i) & 1) ? '1' : '0';
    }
    return binaryString;
}
var NONCE_OFFSET = 0xC;
var NONCE_LENGTH = 8;
var TAG_LENGTH = 0x10;
var aes_key = new Uint8Array([0x59, 0xFC, 0x81, 0x7E, 0x64, 0x46, 0xEA, 0x61, 0x90, 0x34, 0x7B, 0x20, 0xE9, 0xBD, 0xCE, 0x52]);
var pad = new Uint8Array([0,0,0,0]);
function Uint8Cat(){
  var destLength = 0
  for(var i = 0;i < arguments.length;i++)destLength += arguments[i].length;
  var dest = new Uint8Array(destLength);
  var index = 0;
  for(i = 0;i < arguments.length;i++){
      dest.set(arguments[i],index);
      index += arguments[i].length;
  }
  return dest;
}
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
function downloadImage(url, filepath) {
    return new Promise((resolve, reject) => {
        httpsLib.get(url, (res) => {
            if (res.statusCode === 200) {
                res.pipe(fs.createWriteStream(filepath))
                    .on('error', reject)
                    .once('close', () => resolve(filepath));
            } else {
                // Consume response data to free up memory
                res.resume();
                reject(new Error(`Request Failed With a Status Code: ${res.statusCode}`));

            }
        });
    });
}
var favCols=["Red","Orange","Yellow","Lime","Green","Blue","Cyan","Pink","Purple","Brown","White","Black"];
var skinCols=["White","Tanned White","Darker White","Tanned Darker","Mostly Black","Black"];
var hairCols=["Black","Brown","Red","Reddish Brown","Grey","Light Brown","Dark Blonde","Blonde"];
var eyeCols=["Black","Grey","Brown","Lime","Blue","Green"];
var wiiFaceFeatures=["None","Blush","Makeup and Blush","Freckles","Bags","Wrinkles on Cheeks","Wrinkles near Eyes","Chin Wrinkle","Makeup","Stubble","Wrinkles near Mouth","Wrinkles"];
var wiiMouthColors=["Peach","Red","Pink"];
var wiiGlassesCols=["Grey","Brown","Red","Blue","Yellow","White"];
var wiiNoses={
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
};
var mouthTable={
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
};
var eyebrowTable={
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
};
var eyeTable={
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
};
var hairTable={
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
};
var faceFeatures3DS=["None","Near Eye Creases","Cheek Creases","Far Eye Creases","Near Nose Creases","Giant Bags","Cleft Chin","Chin Crease","Sunken Eyes","Far Cheek Creases","Lines Near Eyes","Wrinkles"];
var makeups3DS=["None","Blush","Orange Blush","Blue Eyes","Blush 2","Orange Blush 2","Blue Eyes and Blush","Orange Eyes and Blush","Purple Eyes and Blush 2","Freckles","Beard Stubble","Beard and Mustache Stubble"];
var mouthCols3DS=["Orange","Red","Pink","Peach","Black"];
var glassesCols3DS=["Black","Brown","Red","Blue","Yellow","Grey"];

var tables={
    faces: [
        0x00,0x01,0x08,
        0x02,0x03,0x09,
        0x04,0x05,0x0a,
        0x06,0x07,0x0b
    ],
    hairs: [
        [0x21,0x2f,0x28,
        0x25,0x20,0x6b,
        0x30,0x33,0x37,
        0x46,0x2c,0x42],
        [0x34,0x32,0x26,
        0x31,0x2b,0x1f,
        0x38,0x44,0x3e,
        0x73,0x4c,0x77],
        [0x40,0x51,0x74,
        0x79,0x16,0x3a,
        0x3c,0x57,0x7d,
        0x75,0x49,0x4b],
        [0x2a,0x59,0x39,
        0x36,0x50,0x22,
        0x17,0x56,0x58,
        0x76,0x27,0x24],
        [0x2d,0x43,0x3b,
        0x41,0x29,0x1e,
        0x0c,0x10,0x0a,
        0x52,0x80,0x81],
        [0x0e,0x5f,0x69,
        0x64,0x06,0x14,
        0x5d,0x66,0x1b,
        0x04,0x11,0x6e],
        [0x7b,0x08,0x6a,
        0x48,0x03,0x15,
        0x00,0x62,0x3f,
        0x5a,0x0b,0x78],
        [0x05,0x4a,0x6c,
        0x5e,0x7c,0x19,
        0x63,0x45,0x23,
        0x0d,0x7a,0x71],
        [0x35,0x18,0x55,
        0x53,0x47,0x83,
        0x60,0x65,0x1d,
        0x07,0x0f,0x70],
        [0x4f,0x01,0x6d,
        0x7f,0x5b,0x1a,
        0x3d,0x67,0x02,
        0x4d,0x12,0x5c],
        [0x54,0x09,0x13,
        0x82,0x61,0x68,
        0x2e,0x4e,0x1c,
        0x72,0x7e,0x6f]
    ],
    eyebrows: [
        [0x06,0x00,0x0c,
        0x01,0x09,0x13,
        0x07,0x15,0x08,
        0x11,0x05,0x04],
        [0x0b,0x0a,0x02,
        0x03,0x0e,0x14,
        0x0f,0x0d,0x16,
        0x12,0x10,0x17]
    ],
    eyes: [
        [0x02,0x04,0x00,
        0x08,0x27,0x11,
        0x01,0x1a,0x10,
        0x0f,0x1b,0x14],
        [0x21,0x0b,0x13,
        0x20,0x09,0x0c,
        0x17,0x22,0x15,
        0x19,0x28,0x23],
        [0x05,0x29,0x0d,
        0x24,0x25,0x06,
        0x18,0x1e,0x1f,
        0x12,0x1c,0x2e],
        [0x07,0x2c,0x26,
        0x2a,0x2d,0x1d,
        0x03,0x2b,0x16,
        0x0a,0x0e,0x2f],
        [0x30,0x31,0x32,
        0x35,0x3b,0x38,
        0x36,0x3a,0x39,
        0x37,0x33,0x34]
    ],
    noses: [
        [0x01,0x0a,0x02,
        0x03,0x06,0x00,
        0x05,0x04,0x08,
        0x09,0x07,0x0B],
        [0x0d,0x0e,0x0c,
        0x11,0x10,0x0f]
    ],
    mouths: [
        [0x17,0x01,0x13,
        0x15,0x16,0x05,
        0x00,0x08,0x0a,
        0x10,0x06,0x0d],
        [0x07,0x09,0x02,
        0x11,0x03,0x04,
        0x0f,0x0b,0x14,
        0x12,0x0e,0x0c],
        [0x1b,0x1e,0x18,
        0x19,0x1d,0x1c,
        0x1a,0x23,0x1f,
        0x22,0x21,0x20]
    ]
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
function lookupTable(table,value,paginated){
  if(paginated){
    for(var i=0;i<tables[table].length;i++){
      for(var j=0;j<tables[table][i].length;j++){
        if(tables[table][i][j]===value){
          return [i,j];
        }
      }
    }
  }
  else{
    for(var i=0;i<tables[table].length;i++){
      if(tables[table][i]===value){
        return i;
      }
    }
  }
  return undefined;
}
var kidNames={
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
var defaultInstrs={
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

function isPowerOfTwo(n) {
  return (n & (n - 1)) === 0 && n !== 0;
}
async function renderMii(studioMii,fflRes=_fflRes) {
  var width=600,height=600;
  /* ---------- WebGL 1 context ---------- */
  const gl = createGL(width, height, { preserveDrawingBuffer: true });

  /* ---------- dummy canvas to keep Three.js happy ---------- */
  const dummyCanvas = {
    width,
    height,
    getContext: () => gl,
    addEventListener () {},
    removeEventListener () {},
    style: {},
  };

  /* ---------- Three.js renderer ---------- */

  
  const renderer = new THREE.WebGLRenderer({
    canvas:  dummyCanvas,
    context: gl,
  });
  renderer.setSize(width, height);
  renderer.setClearColor(0xffffff);

  let moduleFFL, currentCharModel;
  /* ---------- simple scene ---------- */
  const scene   = new THREE.Scene();
  scene.background = new THREE.Color().setHex(0xffffff, THREE.ColorManagement ? THREE.ColorManagement.workingColorSpace : '');
  let camera = new THREE.PerspectiveCamera(15, width / height, 1, 5000);
  camera.position.set(0, 30, 500);
  function updateCharModelInScene(data, modelDesc) {
      // Decode data.
      if (typeof data === 'string') {
          data = parseHexOrB64ToUint8Array(data);
      }
      // Continue assuming it is Uint8Array.
      // If an existing CharModel exists, update it.
      if (currentCharModel) {
          // Remove current CharModel from the scene, then dispose it.
          currentCharModel.meshes && scene.remove(currentCharModel.meshes);
          currentCharModel.dispose();
      }

      // Create a new CharModel.
      currentCharModel = createCharModel(data, modelDesc, FFLShaderMaterial, moduleFFL);
      // Initialize textures for the new CharModel.
      initCharModelTextures(currentCharModel, renderer);

      // Add CharModel meshes to scene.
      scene.add(currentCharModel.meshes);
  }

  const box     = new THREE.Mesh(
    new THREE.BoxGeometry(),
    new THREE.MeshBasicMaterial({ color: 0x00ffff })
  );
  scene.add(box);
  const initResult = await initializeFFL(fflRes, ModuleFFL);
  moduleFFL = initResult.module;

  updateCharModelInScene(studioMii, FFLCharModelDescDefault); // Use default expression.

  renderer.render(scene, camera);



  /* ---------- read pixels ---------- */
  const pixels   = new Uint8Array(width * height * 4);
  gl.readPixels(0, 0, width, height, gl.RGBA, gl.UNSIGNED_BYTE, pixels);

  /* ---------- flip rows (Uint8Array → Buffer) ---------- */
  const src      = Buffer.from(pixels);          // <-- Convert here
  const flipped  = Buffer.alloc(src.length);

  const rowBytes = width * 4;
  for (let y = 0; y < height; y++) {
    const srcStart = y * rowBytes;
    const dstStart = (height - y - 1) * rowBytes;
    src.copy(flipped, dstStart, srcStart, srcStart + rowBytes);
  }

  /* ---------- draw into Node-canvas ---------- */
  const canvas = createCanvas(width, height);
  const ctx    = canvas.getContext('2d');
  const img    = new ImageData(new Uint8ClampedArray(flipped.buffer), width, height);
  ctx.putImageData(img, 0, 0);

  return canvas.toBuffer('image/png');
}

var exports={
    readWiiBin:function(binOrPath){
        var thisMii={
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
        if(/[^01]/ig.test(binOrPath)){
            binary = fs.readFileSync(binOrPath);
        }
        else{
            binary=Buffer.from(binOrPath);
        }
        var name="";
        for(var i=0;i<10;i++){
            name+=binary.slice(3+i*2, 4+i*2)+"";
        }
        thisMii.name=name.replaceAll("\x00","");
        var cname="";
        for(var i=0;i<10;i++){
            cname+=binary.slice(55+i*2, 56+i*2)+"";
        }
        thisMii.creatorName=cname.replaceAll("\x00","");
        thisMii.info.creatorName=thisMii.creatorName;
        thisMii.info.name=thisMii.name;//Up to ten characters
        thisMii.info.gender=getBinaryFromAddress(0x00)[1]==="1"?"Female":"Male";//0 for Male, 1 for Female
        thisMii.info.miiId=parseInt(getBinaryFromAddress(0x18),2).toString(16)+parseInt(getBinaryFromAddress(0x19),2).toString(16)+parseInt(getBinaryFromAddress(0x1A),2).toString(16)+parseInt(getBinaryFromAddress(0x1B),2).toString(16);
        thisMii.info.systemId=parseInt(getBinaryFromAddress(0x1C),2).toString(16)+parseInt(getBinaryFromAddress(0x1D),2).toString(16)+parseInt(getBinaryFromAddress(0x1E),2).toString(16)+parseInt(getBinaryFromAddress(0x1F),2).toString(16);
        var temp=getBinaryFromAddress(0x20);
        thisMii.face.shape=parseInt(temp.slice(0,3),2);//0-7
        thisMii.face.col=skinCols[parseInt(temp.slice(3,6),2)];//0-5
        temp=getBinaryFromAddress(0x21);
        thisMii.face.feature=wiiFaceFeatures[parseInt(getBinaryFromAddress(0x20).slice(6,8)+temp.slice(0,2),2)];//0-11
        thisMii.info.mingle=temp[5]==="0";//0 for Mingle, 1 for Don't Mingle
        temp=getBinaryFromAddress(0x2C);
        for(var i=0;i<12;i++){
            if(wiiNoses[i]===parseInt(temp.slice(0,4),2)){
                thisMii.nose.type=i;
            }
        }
        thisMii.nose.size=parseInt(temp.slice(4,8),2);
        thisMii.nose.yPos=parseInt(getBinaryFromAddress(0x2D).slice(0,5),2);//From top to bottom, 0-18, default 9
        temp=getBinaryFromAddress(0x2E);
        thisMii.mouth.type=mouthTable[""+parseInt(temp.slice(0,5),2)];//0-23, Needs lookup table
        thisMii.mouth.col=wiiMouthColors[parseInt(temp.slice(5,7),2)];//0-2, refer to mouthColors array
        temp2=getBinaryFromAddress(0x2F);
        thisMii.mouth.size=parseInt(temp[7]+temp2.slice(0,3),2);//0-8, default 4
        thisMii.mouth.yPos=parseInt(temp2.slice(3,8),2);//0-18, default 9, from top to bottom
        temp=getBinaryFromAddress(0x00);
        var temp2=getBinaryFromAddress(0x01);
        thisMii.info.birthMonth=parseInt(temp.slice(2,6),2);
        thisMii.info.birthday=parseInt(temp.slice(6,8)+temp2.slice(0,3),2);
        thisMii.info.favColor=favCols[parseInt(temp2.slice(3,7),2)];//0-11, refer to cols array
        thisMii.info.favorited=temp2[7]==="0"?false:true;
        thisMii.info.height=parseInt(getBinaryFromAddress(0x16),2);//0-127
        thisMii.info.weight=parseInt(getBinaryFromAddress(0x17),2);//0-127
        thisMii.info.downloadedFromCheckMiiOut=getBinaryFromAddress(0x21)[7]==="0"?false:true;
        temp=getBinaryFromAddress(0x34);
        temp2=getBinaryFromAddress(0x35);
        thisMii.mole.on=temp[0]==="0"?false:true;//0 for Off, 1 for On
        thisMii.mole.size=parseInt(temp.slice(1,5),2);//0-8, default 4
        thisMii.mole.xPos=parseInt(temp2.slice(2,7),2);//0-16, Default 2
        thisMii.mole.yPos=parseInt(temp.slice(5,8)+temp2.slice(0,2),2);//Top to bottom
        temp=getBinaryFromAddress(0x22);
        temp2=getBinaryFromAddress(0x23);
        thisMii.hair.type=hairTable[""+parseInt(temp.slice(0,7),2)];//0-71, Needs lookup table
        thisMii.hair.col=hairCols[parseInt(temp[7]+temp2.slice(0,2),2)];//0-7, refer to hairCols array
        thisMii.hair.flipped=temp2[2]==="0"?false:true;
        temp=getBinaryFromAddress(0x24);
        temp2=getBinaryFromAddress(0x25);
        thisMii.eyebrows.type=eyebrowTable[""+parseInt(temp.slice(0,5),2)];//0-23, Needs lookup table
        thisMii.eyebrows.rotation=parseInt(temp.slice(6,8)+temp2.slice(0,2),2);//0-11, default varies based on eyebrow type
        temp=getBinaryFromAddress(0x26);
        temp2=getBinaryFromAddress(0x27);
        thisMii.eyebrows.col=hairCols[parseInt(temp.slice(0,3),2)];
        thisMii.eyebrows.size=parseInt(temp.slice(3,7),2);//0-8, default 4
        thisMii.eyebrows.yPos=(parseInt(temp[7]+temp2.slice(0,4),2))-3;//0-15, default 10
        thisMii.eyebrows.distApart=parseInt(temp2.slice(4,8),2);//0-12, default 2
        thisMii.eyes.type=eyeTable[parseInt(getBinaryFromAddress(0x28).slice(0,6),2)];//0-47, needs lookup table
        temp=getBinaryFromAddress(0x29);
        thisMii.eyes.rotation=parseInt(temp.slice(0,3),2);//0-7, default varies based on eye type
        thisMii.eyes.yPos=parseInt(temp.slice(3,8),2);//0-18, default 12, top to bottom
        temp=getBinaryFromAddress(0x2A);
        thisMii.eyes.col=eyeCols[parseInt(temp.slice(0,3),2)];//0-5
        thisMii.eyes.size=parseInt(temp.slice(4,7),2);//0-7, default 4
        temp2=getBinaryFromAddress(0x2B);
        thisMii.eyes.distApart=parseInt(temp[7]+temp2.slice(0,3),2);//0-12, default 2
        temp=getBinaryFromAddress(0x30);
        thisMii.glasses.type=parseInt(temp.slice(0,4),2);//0-8
        thisMii.glasses.col=wiiGlassesCols[parseInt(temp.slice(4,7),2)];//0-5
        temp=getBinaryFromAddress(0x31);
        thisMii.glasses.size=parseInt(temp.slice(0,3),2);//0-7, default 4
        thisMii.glasses.yPos=parseInt(temp.slice(3,8),2);//0-20, default 10
        temp=getBinaryFromAddress(0x32);
        temp2=getBinaryFromAddress(0x33);
        thisMii.facialHair.mustacheType=parseInt(temp.slice(0,2),2);//0-3
        thisMii.facialHair.beardType=parseInt(temp.slice(2,4),2);//0-3
        thisMii.facialHair.col=hairCols[parseInt(temp.slice(4,7),2)];//0-7
        thisMii.facialHair.mustacheSize=parseInt(temp[7]+temp2.slice(0,3),2);//0-30, default 20
        thisMii.facialHair.mustacheYPos=parseInt(temp2.slice(3,8),2);//0-16, default 2
        return thisMii;
    },
    read3DSQR:async function(binOrPath){
        function readMii(data){
            var miiJson={
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
            binary=data;
            var temp=getBinaryFromAddress(0x18);
            var temp2=getBinaryFromAddress(0x19);
            miiJson.info.birthday=parseInt(temp2.slice(6,8)+temp.slice(0,3),2);
            miiJson.info.birthMonth=parseInt(temp.slice(3,7),2);
            var name="";
            for(var i=0x1A;i<0x2E;i+=2){
                if(getBinaryFromAddress(i)==="00000000"){
                    break;
                }
                name+=binary.slice(i,i+1);
            }
            miiJson.name=name.replaceAll("\x00","");
            var cname="";
            for(var i=0x48;i<0x5C;i+=2){
                if(getBinaryFromAddress(i)==="00000000"){
                    break;
                }
                cname+=binary.slice(i,i+1);
            }
            miiJson.creatorName=cname.replaceAll("\x00","");
            miiJson.info.name=miiJson.name;
            miiJson.info.creatorName=miiJson.creatorName;
            miiJson.info.height=parseInt(getBinaryFromAddress(0x2E),2);
            miiJson.info.weight=parseInt(getBinaryFromAddress(0x2F),2);
            miiJson.info.gender=temp[7]==="1"?"Female":"Male";
            temp=getBinaryFromAddress(0x30);
            miiJson.perms.sharing=temp[7]==="1"?false:true;
            miiJson.info.favColor=favCols[parseInt(temp2.slice(2,6),2)];
            miiJson.perms.copying=getBinaryFromAddress(0x01)[7]==="1"?true:false;
            miiJson.hair.style=lookupTable("hairs",parseInt(getBinaryFromAddress(0x32),2),true);
            miiJson.face.shape=lookupTable("faces",parseInt(temp.slice(3,7),2),false);
            miiJson.face.col=skinCols[parseInt(temp.slice(0,3),2)];
            temp=getBinaryFromAddress(0x31);
            miiJson.face.feature=faceFeatures3DS[parseInt(temp.slice(4,8),2)];
            miiJson.face.makeup=makeups3DS[parseInt(temp.slice(0,4),2)];
            temp=getBinaryFromAddress(0x34);
            miiJson.eyes.type=lookupTable("eyes",parseInt(temp.slice(2,8),2),true);
            temp2=getBinaryFromAddress(0x33);
            miiJson.hair.col=hairCols[parseInt(temp2.slice(5,8),2)];
            miiJson.hair.flipped=temp2[4]==="0"?false:true;
            miiJson.eyes.col=eyeCols[parseInt(getBinaryFromAddress(0x35)[7]+temp.slice(0,2),2)];
            temp=getBinaryFromAddress(0x35);
            miiJson.eyes.size=parseInt(temp.slice(3,7),2);
            miiJson.eyes.squash=parseInt(temp.slice(0,3),2);
            temp=getBinaryFromAddress(0x36);
            temp2=getBinaryFromAddress(0x37);
            miiJson.eyes.rot=parseInt(temp.slice(3,8),2);
            miiJson.eyes.distApart=parseInt(temp2[7]+temp.slice(0,3),2);
            miiJson.eyes.yPos=parseInt(temp2.slice(2,7),2);
            temp=getBinaryFromAddress(0x38);
            miiJson.eyebrows.style=lookupTable("eyebrows",parseInt(temp.slice(3,8),2),true);
            miiJson.eyebrows.col=hairCols[parseInt(temp.slice(0,3),2)];
            temp=getBinaryFromAddress(0x39);
            miiJson.eyebrows.size=parseInt(temp.slice(4,8),2);
            miiJson.eyebrows.squash=parseInt(temp.slice(1,4),2);
            temp=getBinaryFromAddress(0x3A);
            miiJson.eyebrows.rot=parseInt(temp.slice(4,8),2);
            temp2=getBinaryFromAddress(0x3B);
            miiJson.eyebrows.distApart=parseInt(temp2[7]+temp.slice(0,3),2);
            miiJson.eyebrows.yPos=parseInt(temp2.slice(2,7),2)-3;
            temp=getBinaryFromAddress(0x3C);
            miiJson.nose.type=lookupTable("noses",parseInt(temp.slice(3,8),2),true);
            temp2=getBinaryFromAddress(0x3D);
            miiJson.nose.size=parseInt(temp2[7]+temp.slice(0,3),2);
            miiJson.nose.yPos=parseInt(temp2.slice(2,7),2);
            temp=getBinaryFromAddress(0x3E);
            miiJson.mouth.type=lookupTable("mouths",parseInt(temp.slice(2,8),2),true);
            temp2=getBinaryFromAddress(0x3F);
            miiJson.mouth.col=mouthCols3DS[parseInt(temp2[7]+temp.slice(0,2),2)];
            miiJson.mouth.size=parseInt(temp2.slice(3,7),2);
            miiJson.mouth.squash=parseInt(temp2.slice(0,3),2);
            temp=getBinaryFromAddress(0x40);
            miiJson.mouth.yPos=parseInt(temp.slice(3,8),2);
            miiJson.facialHair.mustacheType=parseInt(temp.slice(0,3),2);
            temp=getBinaryFromAddress(0x42);
            miiJson.facialHair.beardType=parseInt(temp.slice(5,8),2);
            miiJson.facialHair.col=hairCols[parseInt(temp.slice(2,5),2)];
            temp2=getBinaryFromAddress(0x43);
            miiJson.facialHair.mustacheSize=parseInt(temp2.slice(6,8)+temp.slice(0,2),2);
            miiJson.facialHair.mustacheYPos=parseInt(temp2.slice(1,6),2);
            temp=getBinaryFromAddress(0x44);
            miiJson.glasses.type=parseInt(temp.slice(4,8),2);
            miiJson.glasses.col=glassesCols3DS[parseInt(temp.slice(1,4),2)];
            temp2=getBinaryFromAddress(0x45);
            miiJson.glasses.size=parseInt(temp2.slice(5,8)+temp[0],2);
            miiJson.glasses.yPos=parseInt(temp2.slice(0,5),2);
            temp=getBinaryFromAddress(0x46);
            miiJson.mole.on=temp[7]==="0"?false:true;
            miiJson.mole.size=parseInt(temp.slice(3,7),2);
            temp2=getBinaryFromAddress(0x47);
            miiJson.mole.xPos=parseInt(temp2.slice(6,8)+temp.slice(0,3),2);
            miiJson.mole.yPos=parseInt(temp2.slice(1,6),2);
            return miiJson;
        }
        let qrCode;
        if(/[^01]/ig.test(binOrPath)){
            var data=fs.readFileSync(binOrPath);
            var img=await loadImage(data);
            const canvas = createCanvas(img.width, img.height);
            const ctx = canvas.getContext('2d');
            ctx.drawImage(img, 0, 0);
            const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
            qrCode = jsQR(imageData.data, imageData.width, imageData.height).binaryData;
        }
        else{
            var d=binOrPath.match(/(0|1){1,8}/g);
            qrCode=[];
            d.forEach(byte=>{
                qrCode.push(parseInt(byte,2));
            });
        }
        if (qrCode) {
            var data = decodeAesCcm(new Uint8Array(qrCode));
            return Promise.resolve(readMii(Buffer.from(data)));
        } else {
            console.error('Failed to decode QR code');
        }
    },
    writeWiiBin:function(jsonIn,outPath){
        var mii=jsonIn;
        var miiBin="0";
        miiBin+=mii.info.gender==="Male"?"0":"1";
        miiBin+=mii.info.birthMonth.toString(2).padStart(4,"0");
        miiBin+=mii.info.birthday.toString(2).padStart(5,"0");
        miiBin+=favCols.indexOf(mii.info.favColor).toString(2).padStart(4,"0");
        miiBin+=mii.info.favorited?1:0;
        for(var i=0;i<10;i++){
            miiBin+="00000000";
            if(i<mii.name.length){
                miiBin+=mii.name.charCodeAt(i).toString(2).padStart(8,"0");
            }
            else{
                miiBin+="00000000";
            }
        }
        miiBin+=mii.info.height.toString(2).padStart(8,"0");
        miiBin+=mii.info.weight.toString(2).padStart(8,"0");
        let miiId="";
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
        miiBin+=miiId;
        miiBin+="11111111".repeat(4);//System ID
        miiBin+=mii.face.shape.toString(2).padStart(3,"0");
        miiBin+=skinCols.indexOf(mii.face.col).toString(2).padStart(3,"0");
        miiBin+=wiiFaceFeatures.indexOf(mii.face.feature).toString(2).padStart(4,"0");
        miiBin+="000";
        if(mii.info.mingle&&mii.info.type==="Special"){
            mii.info.mingle=false;
            console.error("A Special Mii cannot have Mingle on and still render on the Wii. Turned Mingle off in the output file.");
        }
        miiBin+=mii.info.mingle?"0":"1";
        miiBin+="0";
        miiBin+=mii.info.downloadedFromCheckMiiOut?"1":"0";
        miiBin+=(+getKeyByValue(hairTable,mii.hair.type)).toString(2).padStart(7,"0");
        miiBin+=hairCols.indexOf(mii.hair.col).toString(2).padStart(3,"0");
        miiBin+=mii.hair.flipped?"1":"0";
        miiBin+="00000";
        miiBin+=(+getKeyByValue(eyebrowTable,mii.eyebrows.type)).toString(2).padStart(5,"0");
        miiBin+="0";
        miiBin+=mii.eyebrows.rotation.toString(2).padStart(4,"0");
        miiBin+="000000";
        miiBin+=hairCols.indexOf(mii.eyebrows.col).toString(2).padStart(3,"0");
        miiBin+=mii.eyebrows.size.toString(2).padStart(4,"0");
        miiBin+=(mii.eyebrows.yPos+3).toString(2).padStart(5,"0");
        miiBin+=mii.eyebrows.distApart.toString(2).padStart(4,"0");
        miiBin+=(+getKeyByValue(eyeTable,mii.eyes.type)).toString(2).padStart(6,"0");
        miiBin+="00";
        miiBin+=mii.eyes.rotation.toString(2).padStart(3,"0");
        miiBin+=mii.eyes.yPos.toString(2).padStart(5,"0");
        miiBin+=eyeCols.indexOf(mii.eyes.col).toString(2).padStart(3,"0");
        miiBin+="0";
        miiBin+=mii.eyes.size.toString(2).padStart(3,"0");
        miiBin+=mii.eyes.distApart.toString(2).padStart(4,"0");
        miiBin+="00000";
        miiBin+=wiiNoses[mii.nose.type].toString(2).padStart(4,"0");
        miiBin+=mii.nose.size.toString(2).padStart(4,"0");
        miiBin+=mii.nose.yPos.toString(2).padStart(5,"0");
        miiBin+="000";
        miiBin+=(+getKeyByValue(mouthTable,mii.mouth.type)).toString(2).padStart(5,"0");
        miiBin+=wiiMouthColors.indexOf(mii.mouth.col).toString(2).padStart(2,"0");
        miiBin+=mii.mouth.size.toString(2).padStart(4,"0");
        miiBin+=mii.mouth.yPos.toString(2).padStart(5,"0");
        miiBin+=mii.glasses.type.toString(2).padStart(4,"0");
        miiBin+=wiiGlassesCols.indexOf(mii.glasses.col).toString(2).padStart(3,"0");
        miiBin+="0";
        miiBin+=mii.glasses.size.toString(2).padStart(3,"0");
        miiBin+=mii.glasses.yPos.toString(2).padStart(5,"0");
        miiBin+=mii.facialHair.mustacheType.toString(2).padStart(2,"0");
        miiBin+=mii.facialHair.beardType.toString(2).padStart(2,"0");
        miiBin+=hairCols.indexOf(mii.facialHair.col).toString(2).padStart(3,"0");
        miiBin+=mii.facialHair.mustacheSize.toString(2).padStart(4,"0");
        miiBin+=mii.facialHair.mustacheYPos.toString(2).padStart(5,"0");
        miiBin+=mii.mole.on?"1":"0";
        miiBin+=mii.mole.size.toString(2).padStart(4,"0");
        miiBin+=mii.mole.yPos.toString(2).padStart(5,"0");
        miiBin+=mii.mole.xPos.toString(2).padStart(5,"0");
        miiBin+="0";
        for(var i=0;i<10;i++){
            miiBin+="00000000";
            if(i<mii.creatorName.length){
                miiBin+=mii.creatorName.charCodeAt(i).toString(2).padStart(8,"0");
            }
            else{
                miiBin+="00000000";
            }
        }
        
        //Writing based on miiBin
        var toWrite=miiBin.match(/.{1,8}/g);
        var buffers=[];
        for(var i=0;i<toWrite.length;i++){
            buffers.push(parseInt(toWrite[i],2));
        }
        fs.writeFileSync(outPath, Buffer.from(buffers));
    },
    write3DSQR:async function(jsonIn,outPath,fflRes=_fflRes){
        return new Promise(async (resolve, reject) => {
            var mii=jsonIn;
            function makeMiiBinary(mii){
                if(mii.perms.sharing&&mii.info.type==="Special"){
                    mii.perms.sharing=false;
                    console.log("Cannot have Sharing enabled for Special Miis. Disabled Sharing.");
                }
                var miiBin="00000011";
                miiBin+="0000000";
                miiBin+=mii.perms.copying?"1":"0";
                miiBin+="00000000";
                miiBin+="00110000";
                miiBin+="1000101011010010000001101000011100011000110001100100011001100110010101100111111110111100000001110101110001000101011101100000001110100100010000000000000000000000".slice(0,8*8);
                miiBin+=mii.info.type==="Special"?"0":"1";
                miiBin+="0000000";
                for(var i=0;i<3;i++){
                    miiBin+=Math.floor(Math.random()*255).toString(2).padStart(8,"0");
                }
                miiBin+="0000000001000101011101100000001110100100010000000000000000000000";
                miiBin+=mii.info.birthday.toString(2).padStart(5,"0").slice(2,5);
                miiBin+=mii.info.birthMonth.toString(2).padStart(4,"0");
                miiBin+=mii.info.gender==="Male"?"0":"1";
                miiBin+="00";
                miiBin+=favCols.indexOf(mii.info.favColor).toString(2).padStart(4,"0");
                miiBin+=mii.info.birthday.toString(2).padStart(5,"0").slice(0,2);
                for(var i=0;i<10;i++){
                    if(i<mii.name.length){
                        miiBin+=mii.name.charCodeAt(i).toString(2).padStart(8,"0");
                    }
                    else{
                        miiBin+="00000000";
                    }
                    miiBin+="00000000";
                }
                miiBin+=mii.info.height.toString(2).padStart(8,"0");
                miiBin+=mii.info.weight.toString(2).padStart(8,"0");
                miiBin+=skinCols.indexOf(mii.face.col).toString(2).padStart(3,"0");
                miiBin+=tables.faces[mii.face.shape].toString(2).padStart(4,"0");
                miiBin+=mii.perms.sharing?"0":"1";
                miiBin+=makeups3DS.indexOf(mii.face.makeup).toString(2).padStart(4,"0");
                miiBin+=faceFeatures3DS.indexOf(mii.face.feature).toString(2).padStart(4,"0");
                miiBin+=tables.hairs[mii.hair.style[0]][mii.hair.style[1]].toString(2).padStart(8,"0");
                miiBin+="0000";
                miiBin+=mii.hair.flipped?"1":"0";
                miiBin+=hairCols.indexOf(mii.hair.col).toString(2).padStart(3,"0");
                miiBin+=eyeCols.indexOf(mii.eyes.col).toString(2).padStart(3,"0").slice(1,3);
                miiBin+=tables.eyes[mii.eyes.type[0]][mii.eyes.type[1]].toString(2).padStart(6,"0");
                miiBin+=mii.eyes.squash.toString(2).padStart(3,"0");
                miiBin+=mii.eyes.size.toString(2).padStart(4,"0");
                miiBin+=eyeCols.indexOf(mii.eyes.col).toString(2).padStart(3,"0")[0];
                miiBin+=mii.eyes.distApart.toString(2).padStart(4,"0").slice(1,4);
                miiBin+=mii.eyes.rot.toString(2).padStart(5,"0");
                miiBin+="00";
                miiBin+=mii.eyes.yPos.toString(2).padStart(5,"0");
                miiBin+=mii.eyes.distApart.toString(2).padStart(4,"0")[0];
                miiBin+=hairCols.indexOf(mii.eyebrows.col).toString(2).padStart(3,"0");
                miiBin+=tables.eyebrows[mii.eyebrows.style[0]][mii.eyebrows.style[1]].toString(2).padStart(5,"0");
                miiBin+="0";
                miiBin+=mii.eyebrows.squash.toString(2).padStart(3,"0");
                miiBin+=mii.eyebrows.size.toString(2).padStart(4,"0");
                miiBin+=mii.eyebrows.distApart.toString(2).padStart(4,"0").slice(1,4);
                miiBin+="0";
                miiBin+=mii.eyebrows.rot.toString(2).padStart(4,"0");
                miiBin+="00";
                miiBin+=(mii.eyebrows.yPos+3).toString(2).padStart(5,"0");
                miiBin+=mii.eyebrows.distApart.toString(2).padStart(4,"0")[0];
                miiBin+=mii.nose.size.toString(2).padStart(4,"0").slice(1,4);
                miiBin+=tables.noses[mii.nose.type[0]][mii.nose.type[1]].toString(2).padStart(5,"0");
                miiBin+="00";
                miiBin+=mii.nose.yPos.toString(2).padStart(5,"0");
                miiBin+=mii.nose.size.toString(2).padStart(4,"0")[0];
                miiBin+=mouthCols3DS.indexOf(mii.mouth.col).toString(2).padStart(3,"0").slice(1,3);
                miiBin+=tables.mouths[mii.mouth.type[0]][mii.mouth.type[1]].toString(2).padStart(6,"0");
                miiBin+=mii.mouth.squash.toString(2).padStart(3,"0");
                miiBin+=mii.mouth.size.toString(2).padStart(4,"0");
                miiBin+=mouthCols3DS.indexOf(mii.mouth.col).toString(2).padStart(3,"0")[0];
                miiBin+=mii.facialHair.mustacheType.toString(2).padStart(3,"0");
                miiBin+=mii.mouth.yPos.toString(2).padStart(5,"0");
                miiBin+="00000000";
                miiBin+=mii.facialHair.mustacheSize.toString(2).padStart(4,"0").slice(2,4);
                miiBin+=hairCols.indexOf(mii.facialHair.col).toString(2).padStart(3,"0");
                miiBin+=mii.facialHair.beardType.toString(2).padStart(3,"0");
                miiBin+="0";
                miiBin+=mii.facialHair.mustacheYPos.toString(2).padStart(5,"0");
                miiBin+=mii.facialHair.mustacheSize.toString(2).padStart(4,"0").slice(0,2);
                miiBin+=mii.glasses.size.toString(2).padStart(4,"0")[3];
                miiBin+=glassesCols3DS.indexOf(mii.glasses.col).toString(2).padStart(3,"0");
                miiBin+=mii.glasses.type.toString(2).padStart(4,"0");
                miiBin+="0";
                miiBin+=mii.glasses.yPos.toString(2).padStart(4,"0");
                miiBin+=mii.glasses.size.toString(2).padStart(4,"0").slice(0,3);
                miiBin+=mii.mole.xPos.toString(2).padStart(5,"0").slice(2,5);
                miiBin+=mii.mole.size.toString(2).padStart(4,"0");
                miiBin+=mii.mole.on?"1":"0";
                miiBin+="0";
                miiBin+=mii.mole.yPos.toString(2).padStart(5,"0");
                miiBin+=mii.mole.xPos.toString(2).padStart(5,"0").slice(0,2);
                for(var i=0;i<10;i++){
                    if(i<mii.creatorName.length){
                        miiBin+=mii.creatorName.charCodeAt(i).toString(2).padStart(8,"0");
                    }
                    else{
                        miiBin+="00000000";
                    }
                    miiBin+="00000000";
                }
                //Writing based on miiBin
                var toWrite=miiBin.match(/.{1,8}/g);
                var buffers=[];
                for(var i=0;i<toWrite.length;i++){
                    buffers.push(parseInt(toWrite[i],2));
                }
                const buffer = Buffer.from(buffers);
                fs.writeFileSync(outPath, buffer);
            }
            makeMiiBinary(mii);
            var encryptedData = Buffer.from(encodeAesCcm(new Uint8Array(fs.readFileSync(outPath))));
            fs.writeFileSync(outPath,encryptedData);
            await QRCode.toFile('./'+mii.name+'Output.png', [{ data: fs.readFileSync(outPath), mode: 'byte' }], {type: 'png'}, function (err) {
                if (err) throw err;
            });
            var studioMii=new Uint8Array([0x08, 0x00, 0x40, 0x03, 0x08, 0x04, 0x04, 0x02, 0x02, 0x0c, 0x03, 0x01, 0x06, 0x04, 0x06, 0x02, 0x0a, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x08, 0x04, 0x00, 0x0a, 0x01, 0x00, 0x21, 0x40, 0x04, 0x00, 0x02, 0x14, 0x03, 0x13, 0x04, 0x17, 0x0d, 0x04, 0x00, 0x0a, 0x04, 0x01, 0x09]);
            studioMii[0x16] = mii.info.gender==="Male"?0:1;
            studioMii[0x15] = favCols.indexOf(mii.info.favColor);
            studioMii[0x1E] = mii.info.height;
            studioMii[2] = mii.info.weight;
            studioMii[0x13] = tables.faces[mii.face.shape];
            studioMii[0x11] = skinCols.indexOf(mii.face.col);
            studioMii[0x14] = faceFeatures3DS.indexOf(mii.face.feature);
            studioMii[0x12] = makeups3DS.indexOf(mii.face.makeup);
            studioMii[0x1D] = tables.hairs[mii.hair.style[0]][mii.hair.style[1]];
            studioMii[0x1B] = hairCols.indexOf(mii.hair.col);
            if (!studioMii[0x1B]) studioMii[0x1B] = 8;
            studioMii[0x1C] = mii.hair.flipped?1:0;
            studioMii[7] = tables.eyes[mii.eyes.type[0]][mii.eyes.type[1]];
            studioMii[4] = eyeCols.indexOf(mii.eyes.col) + 8;
            studioMii[6] = mii.eyes.size;
            studioMii[3] = mii.eyes.squash;
            studioMii[5] = mii.eyes.rot;
            studioMii[8] = mii.eyes.distApart;
            studioMii[9] = mii.eyes.yPos;
            studioMii[0xE] = tables.eyebrows[mii.eyebrows.style[0]][mii.eyebrows.style[1]];
            studioMii[0xB] = hairCols.indexOf(mii.eyebrows.col);
            if (!studioMii[0xB]) studioMii[0xB] = 8;
            studioMii[0xD] = mii.eyebrows.size;
            studioMii[0xA] = mii.eyebrows.squash;
            studioMii[0xC] = mii.eyebrows.rot;
            studioMii[0xF] = mii.eyebrows.distApart;
            studioMii[0x10] = mii.eyebrows.yPos+3;
            studioMii[0x2C] = tables.noses[mii.nose.type[0]][mii.nose.type[1]];
            studioMii[0x2B] = mii.nose.size;
            studioMii[0x2D] = mii.nose.yPos;
            studioMii[0x26] = tables.mouths[mii.mouth.type[0]][mii.mouth.type[1]];
            studioMii[0x24] = mouthCols3DS.indexOf(mii.mouth.col);
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
            studioMii[0] = hairCols.indexOf(mii.facialHair.col);
            if (!studioMii[0]) studioMii[0] = 8;
            studioMii[0x28] = mii.facialHair.mustacheSize;
            studioMii[0x2A] = mii.facialHair.mustacheYPos;
            studioMii[0x19] = mii.glasses.type;
            studioMii[0x17] = mii.glasses.col;
            if (!studioMii[0x17]) {
                studioMii[0x17] = 8;
            } else if (studioMii[0x17] < 6) {
                studioMii[0x17] += 13;
            } else {
                studioMii[0x17] = 0;
            }
            studioMii[0x18] = mii.glasses.size;
            studioMii[0x1A] = mii.glasses.yPos;
            studioMii[0x20] = mii.mole.on?1:0;
            studioMii[0x1F] = mii.mole.size;
            studioMii[0x21] = mii.mole.xPos;
            studioMii[0x22] = mii.mole.yPos;
            if(fflRes===null||fflRes===undefined){
                await this.render3DSMiiWithStudio(jsonIn,"./temp.png");
            }
            else{
                var buf=await this.render3DSMii(jsonIn,fflRes);
                fs.writeFileSync("./temp.png",buf);
            }
            const sec_img = await Jimp.read('temp.png');
            const fir_img = await Jimp.read(mii.name+'Output.png');
            fir_img.resize(424, 424);
            sec_img.resize(100,100);

            const canvas = new Jimp(sec_img.bitmap.width, sec_img.bitmap.height, 0xFFFFFFFF);
            canvas.composite(sec_img, 0, 0);
            fir_img.blit(canvas, 212-100/2,212-100/2);
            const font = await Jimp.loadFont(Jimp.FONT_SANS_16_BLACK)
            
            fir_img.print(font, 0, 50, {
                text: mii.name,
                alignmentX: Jimp.HORIZONTAL_ALIGN_CENTER,
                alignmentY: Jimp.VERTICAL_ALIGN_MIDDLE
            }, 424, 395);
            if(mii.info.type==="Special"){
                const thi_img = await Jimp.read(path.join(__dirname, 'crown.jpg'));
                thi_img.resize(40,20);
                fir_img.blit(thi_img,232,150);
            }

            fs.unlinkSync("./temp.png");
            fs.unlinkSync(mii.name+"Output.png");
            fir_img.write(outPath, (err, img) =>
                resolve(img)
            );
        })
    },
    render3DSMiiWithStudio:async function(jsonIn,outPath){
        var studioMii=this.convert3DSMiiToStudio(jsonIn);
        await downloadImage('https://studio.mii.nintendo.com/miis/image.png?data=' + studioMii + "&width=270&type=face",outPath);
    },
    convertMii:function (jsonIn,typeFrom){
        typeFrom=typeFrom.toLowerCase();
        let mii=jsonIn;
        var miiTo={};
        if(typeFrom==="3ds"){
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
        }
        return miiTo;
    },
    make3DSChild:function(dad,mom,options={}){
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
        return child;
    },
    generateInstructions:function(mii,type,full){
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
    },
    convert3DSMiiToStudio:function(jsonIn){
        var mii=jsonIn;
        var studioMii=new Uint8Array([0x08, 0x00, 0x40, 0x03, 0x08, 0x04, 0x04, 0x02, 0x02, 0x0c, 0x03, 0x01, 0x06, 0x04, 0x06, 0x02, 0x0a, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x08, 0x04, 0x00, 0x0a, 0x01, 0x00, 0x21, 0x40, 0x04, 0x00, 0x02, 0x14, 0x03, 0x13, 0x04, 0x17, 0x0d, 0x04, 0x00, 0x0a, 0x04, 0x01, 0x09]);
        function encodeStudio(studio) {
            function byteToString(int){
                var str = int.toString(16);
                if(str.length < 2)str = '0' + str;
                return str;
            }
            var n = 0;
            var eo;
            var dest = byteToString(n);
            for (var i = 0; i < studio.length; i++) {
                eo = (7 + (studio[i] ^ n)) & 0xFF;
                n = eo;
                dest += byteToString(eo);
            }
            return dest;
        }
        studioMii[0x16] = mii.info.gender==="Male"?0:1;
        studioMii[0x15] = favCols.indexOf(mii.info.favColor);
        studioMii[0x1E] = mii.info.height;
        studioMii[2] = mii.info.weight;
        studioMii[0x13] = tables.faces[mii.face.shape];
        studioMii[0x11] = skinCols.indexOf(mii.face.col);
        studioMii[0x14] = faceFeatures3DS.indexOf(mii.face.feature);
        studioMii[0x12] = makeups3DS.indexOf(mii.face.makeup);
        studioMii[0x1D] = tables.hairs[mii.hair.style[0]][mii.hair.style[1]];
        studioMii[0x1B] = hairCols.indexOf(mii.hair.col);
        if (!studioMii[0x1B]) studioMii[0x1B] = 8;
        studioMii[0x1C] = mii.hair.flipped?1:0;
        studioMii[7] = tables.eyes[mii.eyes.type[0]][mii.eyes.type[1]];
        studioMii[4] = eyeCols.indexOf(mii.eyes.col) + 8;
        studioMii[6] = mii.eyes.size;
        studioMii[3] = mii.eyes.squash;
        studioMii[5] = mii.eyes.rot;
        studioMii[8] = mii.eyes.distApart;
        studioMii[9] = mii.eyes.yPos;
        studioMii[0xE] = tables.eyebrows[mii.eyebrows.style[0]][mii.eyebrows.style[1]];
        studioMii[0xB] = hairCols.indexOf(mii.eyebrows.col);
        if (!studioMii[0xB]) studioMii[0xB] = 8;
        studioMii[0xD] = mii.eyebrows.size;
        studioMii[0xA] = mii.eyebrows.squash;
        studioMii[0xC] = mii.eyebrows.rot;
        studioMii[0xF] = mii.eyebrows.distApart;
        studioMii[0x10] = mii.eyebrows.yPos+3;
        studioMii[0x2C] = tables.noses[mii.nose.type[0]][mii.nose.type[1]];
        studioMii[0x2B] = mii.nose.size;
        studioMii[0x2D] = mii.nose.yPos;
        studioMii[0x26] = tables.mouths[mii.mouth.type[0]][mii.mouth.type[1]];
        studioMii[0x24] = mouthCols3DS.indexOf(mii.mouth.col);
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
        studioMii[0] = hairCols.indexOf(mii.facialHair.col);
        if (!studioMii[0]) studioMii[0] = 8;
        studioMii[0x28] = mii.facialHair.mustacheSize;
        studioMii[0x2A] = mii.facialHair.mustacheYPos;
        studioMii[0x19] = mii.glasses.type;
        studioMii[0x17] = glassesCols3DS.indexOf(mii.glasses.col);
        if (!studioMii[0x17]) {
            studioMii[0x17] = 8;
        } else if (studioMii[0x17] < 6) {
            studioMii[0x17] += 13;
        } else {
            studioMii[0x17] = 0;
        }
        studioMii[0x18] = mii.glasses.size;
        studioMii[0x1A] = mii.glasses.yPos;
        studioMii[0x20] = mii.mole.on?1:0;
        studioMii[0x1F] = mii.mole.size;
        studioMii[0x21] = mii.mole.xPos;
        studioMii[0x22] = mii.mole.yPos;
        return encodeStudio(studioMii);
    },
    render3DSMii:async function(jsonIn,fflRes=_fflRes){
        return await renderMii(this.convert3DSMiiToStudio(jsonIn),fflRes);
    }
}
module.exports=exports;