const fs = require('fs');
const { createCanvas, loadImage } = require('canvas');
const jsQR = require('jsqr');
var Jimp = require('jimp');
const QRCode = require('qrcode');
const httpsLib = require('https');
const asmCrypto=require("./asmCrypto.js");
function getKeyByValue(object, value) {
    for (var key in object) {
      if (object[key] === value) {
        return key;
      }
    }
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
var wiiCols=["Red","Orange","Yellow","Lime","Green","Blue","Light Blue","Pink","Purple","Brown","White","Black"];
var wiiFaceFeatures=["None","Blush","Makeup and Blush","Freckles","Bags","Wrinkles on Cheeks","Wrinkles near Eyes","Chin Wrinkle","Makeup","Stubble","Wrinkles near Mouth","Wrinkles"];
var wiiSkinColors=["White","Tanned White","Darker Skin","Tanned Darker","Mostly Black","Black"];
var wiiMouthColors=["Peach","Red","Pink"];
var wiiHairCols=["Black","Dark Brown","Mid Brown","Brown","Grey","Wooden Brown","Dark Blonde","Blonde"];
var wiiEyeCols=["Black","Grey","Brown","Lime","Blue","Green"];
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
var cols3DS=["Red","Orange","Yellow","Lime","Green","Blue","Teal","Pink","Purple","Brown","White","Black"];
var skinCols3DS=["White","Tanned White","Darker White","Tanned Darker","Mostly Black","Black"];
var faceFeatures3DS=["None","Near Eye Creases","Cheek Creases","Far Eye Creases","Near Nose Creases","Giant Bags","Cleft Chin","Chin Crease","Sunken Eyes","Far Cheek Creases","Lines Near Eyes","Wrinkles"];
var makeups3DS=["None","Blush","Orange Blush","Blue Eyes","Blush 2","Orange Blush 2","Blue Eyes and Blush","Orange Eyes and Blush","Purple Eyes and Blush 2","Freckles","Beard Stubble","Beard and Mustache Stubble"];
var eyeCols3DS=["Black","Grey","Brown","Lime","Blue","Green"];
var hairCols3DS=["Black","Brown","Red","Reddish Brown","Grey","Light Brown","Dark Blonde","Blonde"];
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
module.exports={
    readWiiBin:function(binPath){
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
        binary = fs.readFileSync(binPath);
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
        thisMii.face.col=wiiSkinColors[parseInt(temp.slice(3,6),2)];//0-5
        temp=getBinaryFromAddress(0x21);
        thisMii.face.feature=wiiFaceFeatures[parseInt(getBinaryFromAddress(0x20).slice(6,8)+temp.slice(0,2),2)];//0-11
        thisMii.info.mingle=temp[5]==="1"?false:true;//0 for Mingle, 1 for Don't Mingle
        temp=getBinaryFromAddress(0x2C);
        for(var i=0;i<12;i++){
            if(wiiNoses[i]===parseInt(temp.slice(0,4),2)){
                thisMii.nose.type=i;
            }
        }
        thisMii.nose.size=parseInt(temp.slice(4,8),2);
        thisMii.nose.vertPos=parseInt(getBinaryFromAddress(0x2D).slice(0,5),2);//From top to bottom, 0-18, default 9
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
        thisMii.info.favColor=wiiCols[parseInt(temp2.slice(3,7),2)];//0-11, refer to cols array
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
        thisMii.hair.col=wiiHairCols[parseInt(temp[7]+temp2.slice(0,2),2)];//0-7, refer to hairCols array
        thisMii.hair.flipped=temp2[2]==="0"?false:true;
        temp=getBinaryFromAddress(0x24);
        temp2=getBinaryFromAddress(0x25);
        thisMii.eyebrows.type=eyebrowTable[""+parseInt(temp.slice(0,5),2)];//0-23, Needs lookup table
        thisMii.eyebrows.rotation=parseInt(temp.slice(6,8)+temp2.slice(0,2),2);//0-11, default varies based on eyebrow type
        temp=getBinaryFromAddress(0x26);
        temp2=getBinaryFromAddress(0x27);
        thisMii.eyebrows.col=wiiHairCols[parseInt(temp.slice(0,3),2)];
        thisMii.eyebrows.size=parseInt(temp.slice(3,7),2);//0-8, default 4
        thisMii.eyebrows.yPos=(parseInt(temp[7]+temp2.slice(0,4),2))-3;//0-15, default 10
        thisMii.eyebrows.distApart=parseInt(temp2.slice(4,8),2);//0-12, default 2
        thisMii.eyes.type=eyeTable[parseInt(getBinaryFromAddress(0x28).slice(0,6),2)];//0-47, needs lookup table
        temp=getBinaryFromAddress(0x29);
        thisMii.eyes.rotation=parseInt(temp.slice(0,3),2);//0-7, default varies based on eye type
        thisMii.eyes.yPos=parseInt(temp.slice(3,8),2);//0-18, default 12, top to bottom
        temp=getBinaryFromAddress(0x2A);
        thisMii.eyes.col=wiiEyeCols[parseInt(temp.slice(0,3),2)];//0-5
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
        thisMii.facialHair.col=wiiHairCols[parseInt(temp.slice(4,7),2)];//0-7
        thisMii.facialHair.mustacheSize=parseInt(temp[7]+temp2.slice(0,3),2);//0-30, default 20
        thisMii.facialHair.mustacheYPos=parseInt(temp2.slice(3,8),2);//0-16, default 2
        return thisMii;
    },
    read3DSQR:async function(qrPath){
        function readMii(){
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
            binary=fs.readFileSync("./decryptedTemp.3dMii");
            var temp=getBinaryFromAddress(0x18);
            var temp2=getBinaryFromAddress(0x19);
            miiJson.info.birthday=parseInt(temp2.slice(6,8)+temp.slice(0,3),2);
            miiJson.info.birthMonth=parseInt(temp.slice(3,7),2);
            var name="";
            for(var i=0x1A;i<0x2E;i++){
                name+=binary.slice(i,i+1);
            }
            miiJson.name=name.replaceAll("\x00","");
            var cname="";
            for(var i=0x48;i<0x5C;i++){
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
            miiJson.info.favColor=cols3DS[parseInt(temp2.slice(2,6),2)];
            miiJson.perms.copying=getBinaryFromAddress(0x01)[7]==="1"?true:false;
            miiJson.hair.style=lookupTable("hairs",parseInt(getBinaryFromAddress(0x32),2),true);
            miiJson.face.shape=lookupTable("faces",parseInt(temp.slice(3,7),2),false);
            miiJson.face.col=skinCols3DS[parseInt(temp.slice(0,3),2)];
            temp=getBinaryFromAddress(0x31);
            miiJson.face.feature=faceFeatures3DS[parseInt(temp.slice(4,8),2)];
            miiJson.face.makeup=makeups3DS[parseInt(temp.slice(0,4),2)];
            temp=getBinaryFromAddress(0x34);
            miiJson.eyes.type=lookupTable("eyes",parseInt(temp.slice(2,8),2),true);
            temp2=getBinaryFromAddress(0x33);
            miiJson.hair.col=hairCols3DS[parseInt(temp2.slice(5,8),2)];
            miiJson.hair.flipped=temp2[4]==="0"?false:true;
            miiJson.eyes.col=eyeCols3DS[parseInt(getBinaryFromAddress(0x35)[7]+temp.slice(0,2),2)];
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
            miiJson.eyebrows.col=hairCols3DS[parseInt(temp.slice(0,3),2)];
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
            miiJson.facialHair.col=hairCols3DS[parseInt(temp.slice(2,5),2)];
            temp2=getBinaryFromAddress(0x43);
            miiJson.facialHair.mustacheSize=parseInt(temp2.slice(6,8)+temp.slice(0,2),2);
            miiJson.facialHair.mustacheYPos=parseInt(temp2.slice(1,6),2);
            temp=getBinaryFromAddress(0x44);
            miiJson.glasses.type=parseInt(temp.slice(4,8),2);
            miiJson.glasses.col=glassesCols3DS[parseInt(temp.slice(1,4),2)];
            temp2=getBinaryFromAddress(0x45);
            miiJson.glasses.size=parseInt(temp2.slice(5,8)+temp[0],2);
            miiJson.glasses.yPos=parseInt(temp2.slice(1,5),2);
            temp=getBinaryFromAddress(0x46);
            miiJson.mole.on=temp[7]==="0"?false:true;
            miiJson.mole.size=parseInt(temp.slice(3,7),2);
            temp2=getBinaryFromAddress(0x47);
            miiJson.mole.xPos=parseInt(temp2.slice(6,8)+temp.slice(0,3),2);
            miiJson.mole.yPos=parseInt(temp2.slice(1,6),2);
            fs.unlinkSync("./decryptedTemp.3dMii");
            return miiJson;
        }
        var data=fs.readFileSync(qrPath);
        var img=await loadImage(data);
        const canvas = createCanvas(img.width, img.height);
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0);
        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const qrCode = jsQR(imageData.data, imageData.width, imageData.height);
    
        if (qrCode) {
            var data = decodeAesCcm(new Uint8Array(qrCode.binaryData));
            fs.writeFileSync("./decryptedTemp.3dMii",Buffer.from(data));
            return Promise.resolve(readMii());
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
        miiBin+=wiiCols.indexOf(mii.info.favColor).toString(2).padStart(4,"0");
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
                miiId="10101001";
            break;
        }
        for(var i=0;i<3;i++){
            miiId+=Math.floor(Math.random()*255).toString(2).padStart(8,"0");
        }
        miiBin+=miiId;
        miiBin+="11111111".repeat(4);//System ID
        miiBin+=mii.face.shape.toString(2).padStart(3,"0");
        miiBin+=wiiSkinColors.indexOf(mii.face.col).toString(2).padStart(3,"0");
        miiBin+=wiiFaceFeatures.indexOf(mii.face.feature).toString(2).padStart(4,"0");
        miiBin+="000";
        if(mii.info.mingle&&mii.info.type==="Special"){
            console.error("A Special Mii cannot have Mingle on and still render on the Wii. Turned Mingle off in the output file.");
        }
        miiBin+=mii.info.mingle?"0":"1";
        miiBin+="0";
        miiBin+=mii.info.downloadedFromCheckMiiOut?"1":"0";
        miiBin+=(+getKeyByValue(hairTable,mii.hair.type)).toString(2).padStart(7,"0");
        miiBin+=wiiHairCols.indexOf(mii.hair.col).toString(2).padStart(3,"0");
        miiBin+=mii.hair.flipped?"1":"0";
        miiBin+="00000";
        miiBin+=(+getKeyByValue(eyebrowTable,mii.eyebrows.type)).toString(2).padStart(5,"0");
        miiBin+="0";
        miiBin+=mii.eyebrows.rotation.toString(2).padStart(4,"0");
        miiBin+="000000";
        miiBin+=wiiHairCols.indexOf(mii.eyebrows.col).toString(2).padStart(3,"0");
        miiBin+=mii.eyebrows.size.toString(2).padStart(4,"0");
        miiBin+=(mii.eyebrows.yPos+3).toString(2).padStart(5,"0");
        miiBin+=mii.eyebrows.distApart.toString(2).padStart(4,"0");
        miiBin+=(+getKeyByValue(eyeTable,mii.eyes.type)).toString(2).padStart(6,"0");
        miiBin+="00";
        miiBin+=mii.eyes.rotation.toString(2).padStart(3,"0");
        miiBin+=mii.eyes.yPos.toString(2).padStart(5,"0");
        miiBin+=wiiEyeCols.indexOf(mii.eyes.col).toString(2).padStart(3,"0");
        miiBin+="0";
        miiBin+=mii.eyes.size.toString(2).padStart(3,"0");
        miiBin+=mii.eyes.distApart.toString(2).padStart(4,"0");
        miiBin+="00000";
        miiBin+=wiiNoses[mii.nose.type].toString(2).padStart(4,"0");
        miiBin+=mii.nose.size.toString(2).padStart(4,"0");
        miiBin+=mii.nose.vertPos.toString(2).padStart(5,"0");
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
        miiBin+=wiiHairCols.indexOf(mii.facialHair.col).toString(2).padStart(3,"0");
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
        const buffer = Buffer.from(buffers);
        fs.writeFileSync(outPath, buffer);
    },
    write3DSQR:function(jsonIn,outPath){
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
            miiBin+="0111111110111100000001110101110001000101011101100000001110100100010000000000000000000000";
            miiBin+=mii.info.birthday.toString(2).padStart(5,"0").slice(2,5);
            miiBin+=mii.info.birthMonth.toString(2).padStart(4,"0");
            miiBin+=mii.info.gender==="Male"?"0":"1";
            miiBin+="00";
            miiBin+=cols3DS.indexOf(mii.info.favColor).toString(2).padStart(4,"0");
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
            miiBin+=skinCols3DS.indexOf(mii.face.col).toString(2).padStart(3,"0");
            miiBin+=tables.faces[mii.face.shape].toString(2).padStart(4,"0");
            miiBin+=mii.perms.sharing?"0":"1";
            miiBin+=makeups3DS.indexOf(mii.face.makeup).toString(2).padStart(4,"0");
            miiBin+=faceFeatures3DS.indexOf(mii.face.feature).toString(2).padStart(4,"0");
            miiBin+=tables.hairs[mii.hair.style[0]][mii.hair.style[1]].toString(2).padStart(8,"0");
            miiBin+="0000";
            miiBin+=mii.hair.flipped?"1":"0";
            miiBin+=hairCols3DS.indexOf(mii.hair.col).toString(2).padStart(3,"0");
            miiBin+=eyeCols3DS.indexOf(mii.eyes.col).toString(2).padStart(3,"0").slice(1,3);
            miiBin+=tables.eyes[mii.eyes.type[0]][mii.eyes.type[1]].toString(2).padStart(6,"0");
            miiBin+=mii.eyes.squash.toString(2).padStart(3,"0");
            miiBin+=mii.eyes.size.toString(2).padStart(4,"0");
            miiBin+=eyeCols3DS.indexOf(mii.eyes.col).toString(2).padStart(3,"0")[0];
            miiBin+=mii.eyes.distApart.toString(2).padStart(4,"0").slice(1,4);
            miiBin+=mii.eyes.rot.toString(2).padStart(5,"0");
            miiBin+="00";
            miiBin+=mii.eyes.yPos.toString(2).padStart(5,"0");
            miiBin+=mii.eyes.distApart.toString(2).padStart(4,"0")[0];
            miiBin+=hairCols3DS.indexOf(mii.eyebrows.col).toString(2).padStart(3,"0");
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
            miiBin+=hairCols3DS.indexOf(mii.facialHair.col).toString(2).padStart(3,"0");
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
        QRCode.toFile('./'+mii.name+'Output.png', [{ data: fs.readFileSync(outPath), mode: 'byte' }], {type: 'png'}, function (err) {
            if (err) throw err;
        });
        var studioMii=new Uint8Array([0x08, 0x00, 0x40, 0x03, 0x08, 0x04, 0x04, 0x02, 0x02, 0x0c, 0x03, 0x01, 0x06, 0x04, 0x06, 0x02, 0x0a, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x08, 0x04, 0x00, 0x0a, 0x01, 0x00, 0x21, 0x40, 0x04, 0x00, 0x02, 0x14, 0x03, 0x13, 0x04, 0x17, 0x0d, 0x04, 0x00, 0x0a, 0x04, 0x01, 0x09]);
        //miiPreview.src = 'https://studio.mii.nintendo.com/miis/image.png?data=' + mii.previewData + "&width=270&type=face";
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
        studioMii[0x15] = cols3DS.indexOf(mii.info.favColor);
        studioMii[0x1E] = mii.info.height;
        studioMii[2] = mii.info.weight;
        studioMii[0x13] = tables.faces[mii.face.shape];
        studioMii[0x11] = skinCols3DS.indexOf(mii.face.col);
        studioMii[0x14] = faceFeatures3DS.indexOf(mii.face.feature);
        studioMii[0x12] = makeups3DS.indexOf(mii.face.makeup);
        studioMii[0x1D] = tables.hairs[mii.hair.style[0]][mii.hair.style[1]];
        studioMii[0x1B] = hairCols3DS.indexOf(mii.hair.col);
        if (!studioMii[0x1B]) studioMii[0x1B] = 8;
        studioMii[0x1C] = mii.hair.flipped?1:0;
        studioMii[7] = tables.eyes[mii.eyes.type[0]][mii.eyes.type[1]];
        studioMii[4] = eyeCols3DS.indexOf(mii.eyes.col) + 8;
        studioMii[6] = mii.eyes.size;
        studioMii[3] = mii.eyes.squash;
        studioMii[5] = mii.eyes.rot;
        studioMii[8] = mii.eyes.distApart;
        studioMii[9] = mii.eyes.yPos;
        studioMii[0xE] = tables.eyebrows[mii.eyebrows.style[0]][mii.eyebrows.style[1]];
        studioMii[0xB] = hairCols3DS.indexOf(mii.eyebrows.col);
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
        studioMii[0] = mii.facialHair.col;
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
        downloadImage('https://studio.mii.nintendo.com/miis/image.png?data=' + encodeStudio(studioMii) + "&width=270&type=face","./temp.png").then(d=>{
            Jimp.read(mii.name+'Output.png', (err, fir_img) => {
                if(err) {
                    console.log(err);
                } else {
                    Jimp.read('temp.png', (err, sec_img) => {
                        if(err) {
                            console.log(err);
                        } else {
                            fir_img.resize(424, 424);
                            sec_img.resize(130,130);
                            const canvas = new Jimp(sec_img.bitmap.width, sec_img.bitmap.height, 0xFFFFFFFF);
                            canvas.composite(sec_img, 0, 0);
                            fir_img.blit(canvas, 212-130/2,212-130/2);
                            Jimp.loadFont(Jimp.FONT_SANS_16_BLACK).then(font => {
                                fir_img.print(font, 0, 50, {
                                  text: mii.name,
                                  alignmentX: Jimp.HORIZONTAL_ALIGN_CENTER,
                                  alignmentY: Jimp.VERTICAL_ALIGN_MIDDLE
                                }, 424, 424);
                                Jimp.read('./node_modules/miijs/crown.jpg',(err,thi_img)=>{
                                    thi_img.resize(40,20);
                                    if(mii.info.type==="Special") fir_img.blit(thi_img,232,150);
                                    fir_img.write(outPath);
                                    fs.unlinkSync("./temp.png");
                                });
                              });
                        }
                    })
                }
                fs.unlinkSync(mii.name+"Output.png");
            });
        });
    },
    render3DSMiiFromJSON:function(jsonIn,outPath){
        var mii=jsonIn;
        var studioMii=new Uint8Array([0x08, 0x00, 0x40, 0x03, 0x08, 0x04, 0x04, 0x02, 0x02, 0x0c, 0x03, 0x01, 0x06, 0x04, 0x06, 0x02, 0x0a, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x08, 0x04, 0x00, 0x0a, 0x01, 0x00, 0x21, 0x40, 0x04, 0x00, 0x02, 0x14, 0x03, 0x13, 0x04, 0x17, 0x0d, 0x04, 0x00, 0x0a, 0x04, 0x01, 0x09]);
        //miiPreview.src = 'https://studio.mii.nintendo.com/miis/image.png?data=' + mii.previewData + "&width=270&type=face";
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
        studioMii[0x15] = cols3DS.indexOf(mii.info.favColor);
        studioMii[0x1E] = mii.info.height;
        studioMii[2] = mii.info.weight;
        studioMii[0x13] = tables.faces[mii.face.shape];
        studioMii[0x11] = skinCols3DS.indexOf(mii.face.col);
        studioMii[0x14] = faceFeatures3DS.indexOf(mii.face.feature);
        studioMii[0x12] = makeups3DS.indexOf(mii.face.makeup);
        studioMii[0x1D] = tables.hairs[mii.hair.style[0]][mii.hair.style[1]];
        studioMii[0x1B] = hairCols3DS.indexOf(mii.hair.col);
        if (!studioMii[0x1B]) studioMii[0x1B] = 8;
        studioMii[0x1C] = mii.hair.flipped?1:0;
        studioMii[7] = tables.eyes[mii.eyes.type[0]][mii.eyes.type[1]];
        studioMii[4] = eyeCols3DS.indexOf(mii.eyes.col) + 8;
        studioMii[6] = mii.eyes.size;
        studioMii[3] = mii.eyes.squash;
        studioMii[5] = mii.eyes.rot;
        studioMii[8] = mii.eyes.distApart;
        studioMii[9] = mii.eyes.yPos;
        studioMii[0xE] = tables.eyebrows[mii.eyebrows.style[0]][mii.eyebrows.style[1]];
        studioMii[0xB] = hairCols3DS.indexOf(mii.eyebrows.col);
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
        studioMii[0] = hairCols3DS.indexOf(mii.facialHair.col);
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
        downloadImage('https://studio.mii.nintendo.com/miis/image.png?data=' + encodeStudio(studioMii) + "&width=270&type=face",outPath);
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
                    miiId="10101001";
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
            miiTo.nose.vertPos=mii.nose.yPos;
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
            if(mii.facialHair.beardType>4){
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
            miiTo.hair.col=hairCols3DS[wiiHairCols.indexOf(mii.hair.col)];
            miiTo.hair.flipped=mii.hair.flipped;
            miiTo.hair.style=convTables.hairWiiTo3DS[+mii.hair.type[0]-1][0+(3*(+mii.hair.type[2]-1))+(+mii.hair.type[1]-1)];
            miiTo.face.shape=convTables.faceWiiTo3DS[mii.face.shape];
            miiTo.face.col=skinCols3DS[wiiSkinColors.indexOf(mii.face.col)];
            miiTo.face.makeup="None";
            miiTo.face.feature="None";
            if(typeof(convTables.featureWiiTo3DS[wiiFaceFeatures.indexOf(mii.face.feature)])==='string'){
                miiTo.face.makeup=makeups3DS[+convTables.featureWiiTo3DS[wiiFaceFeatures.indexOf(mii.face.feature)]];
            }
            else{
                miiTo.face.feature=faceFeatures3DS[convTables.featureWiiTo3DS[wiiFaceFeatures.indexOf(mii.face.feature)]];
            }
            miiTo.eyes.col=eyeCols3DS[wiiEyeCols.indexOf(mii.eyes.col)];
            miiTo.eyes.type=[+mii.eyes.type[0]-1,(+mii.eyes.type[1]-1)+(3*(+mii.eyes.type[2]-1))];
            miiTo.eyes.size=mii.eyes.size;
            miiTo.eyes.squash=3;
            miiTo.eyes.rot=mii.eyes.rotation;
            miiTo.eyes.distApart=mii.eyes.distApart;
            miiTo.eyes.yPos=mii.eyes.yPos;
            miiTo.eyebrows.style=[+mii.eyebrows.type[0]-1,(+mii.eyebrows.type[1]-1)+(3*(+mii.eyebrows.type[2]-1))];
            miiTo.eyebrows.col=hairCols3DS[wiiHairCols.indexOf(mii.eyebrows.col)];
            miiTo.eyebrows.size=mii.eyebrows.size;
            miiTo.eyebrows.squash=3;
            miiTo.eyebrows.rot=mii.eyebrows.rotation;
            miiTo.eyebrows.distApart=mii.eyebrows.distApart;
            miiTo.eyebrows.yPos=mii.eyebrows.yPos;
            miiTo.nose.type=[0,mii.nose.type];
            miiTo.nose.size=mii.nose.size;
            miiTo.nose.yPos=mii.nose.vertPos;
            miiTo.mouth.type=[+mii.mouth.type[0]-1,(+mii.mouth.type[1]-1)+(3*(+mii.mouth.type[2]-1))];
            miiTo.mouth.col=mouthCols3DS[wiiMouthColors.indexOf(mii.mouth.col)];
            miiTo.mouth.size=mii.mouth.size;
            miiTo.mouth.squash=3;
            miiTo.mouth.yPos=mii.mouth.yPos;
            miiTo.facialHair.mustacheType=mii.facialHair.mustacheType;
            miiTo.facialHair.beardType=mii.facialHair.beardType;
            miiTo.facialHair.col=hairCols3DS[wiiHairCols.indexOf(mii.facialHair.col)];
            miiTo.facialHair.mustacheSize=mii.facialHair.mustacheSize;
            miiTo.facialHair.mustacheYPos=mii.facialHair.mustacheYPos;
            miiTo.glasses.type=mii.glasses.type;
            miiTo.glasses.col=glassesCols3DS[wiiGlassesCols.indexOf(mii.glasses.col)];
            miiTo.glasses.size=mii.glasses.size;
            miiTo.glasses.yPos=mii.glasses.yPos;
            miiTo.mole.on=mii.mole.on;
            miiTo.mole.size=mii.mole.size;
            miiTo.mole.xPos=mii.mole.xPos;
            miiTo.mole.yPos=mii.mole.yPos;
        }
        return miiTo;
    }
}
