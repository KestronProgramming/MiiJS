# MiiJS
MiiJS is a complete and comprehensive Mii library for reading, converting, modifying, writing, and rendering Mii characters from an accessible coding language. Support for all Mii types, including DS, Wii, 3DS, Wii U, Amiibo, Switch 1 & 2, Amiibos, and Mii Studio. Capable of making Special Miis and 3DS QR codes. Able to generate instructions to recreate Miis from scratch.
<hr>

## Installation
`npm install miijs` || `npm i miijs`

<hr>

## Table of Contents
- [Functions](#functions)
- [Code Examples](#code-examples)
- [Special Miis](#special-miis)
- [Other Console Support](#other-console-support)
- [`convertMii` Discrepancies](#discrepancies-in-convertmii-function)
- [Transferring to/from the System](#transferring-miis-to-and-from-the-system)
- [FFLResHigh.dat](#fflreshighdat)
- [Credits](#credits)

<hr>

# Functions

### Reading Miis
- **`async read3DSQR(PathToMiiQR OR BinaryDataFromQR, ReturnDecryptedBin?)`** - Returns JSON by default. By specifying `true` as the secondary parameter you can receive only the decrypted Mii data from the QR.
- **`readWiiBin(PathToMii OR BinaryMiiData)`** - Returns JSON from a Wii Mii binary file.

### Writing Miis
- **`async write3DSQR(MiiJSON, PathToWriteTo, fflRes?)`** - Writes a JPG QR of a 3DS scannable Mii to the path specified. If no fflRes is specified, the QR will render using Nintendo Studio's API. If one is provided, it will contain a locally rendered version. fflRes must either be passed as a buffer, or FFLResHigh.dat present in your project's root directory.
- **`async writeWiiBin(MiiJSON, PathToWriteTo?)`** - Returns Mii binary which can then be written by default. If PathToWriteTo is specified, it will instead be written to a file.

### Converting Miis
- **`convertMii(miiJson, typeTo?)`** - Converts the Mii JSON format between consoles (3DS ↔ Wii) and returns the JSON. If typeTo is not specified, converts to the opposite type.
- **`convertMiiToStudio(miiJSON)`** - Returns a Studio compatible Mii in hex format.
- **`convertStudioToMii(input)`** - Converts Studio format (hex string or Uint8Array) to 3DS Mii JSON.

### Rendering Miis
- **`async renderMiiWithStudio(miiJSON)`** - Returns a buffer containing a PNG representation of the Mii's face using Nintendo's Studio API.
- **`async renderMii(miiJSON, fflRes?)`** - Returns a buffer containing a PNG representation of the Mii's face using local rendering. fflRes must either be passed as a buffer, or FFLResHigh.dat present in your project's root directory. Currently bodies render but are unaffected by height and weight changes, though this is planned to be changed in the future.

### Amiibo Functions
- **`insertMiiIntoAmiibo(amiiboDump, miiData)`** - Inserts Mii data (92 or 96 bytes, decrypted 3DS format) into an Amiibo dump. Returns the modified Amiibo dump.
- **`extractMiiFromAmiibo(amiiboDump)`** - Extracts the Mii data (92 bytes, decrypted 3DS format) from an Amiibo dump. Returns a Buffer.

### Utility Functions
- **`generateInstructions(miiJson, fullInstructions?)`** - Returns a JSON object of different instruction fields for manually recreating the Mii. If fullInstructions is not set, only the instructions that differ from a default Mii will be returned.
- **`miiHeightToFeetInches(value)`** - Converts Mii height value (0-127) to real-world feet and inches. Returns `{feet, inches, totalInches}`.
- **`inchesToMiiHeight(totalInches)`** - Converts real-world height in inches to Mii height value (0-127).
- **`heightWeightToMiiWeight(heightInches, weightLbs)`** - Converts real-world height and weight to Mii weight value (0-127). **EXPERIMENTAL**
- **`miiWeightToRealWeight(heightInches, miiWeight)`** - Converts Mii weight value to real-world pounds and BMI. Returns `{pounds, bmi}`. **EXPERIMENTAL**

<hr>

# Code Examples

## Reading a 3DS Mii from QR Code
```javascript
const miijs = require('miijs');

// Read from file path
const miiJson = await miijs.read3DSQR('./example3DSQR.jpg');
console.log('Mii Name:', miiJson.meta.name);
console.log('Favorite Color:', miiJson.general.favoriteColor);

// Or get just the decrypted binary data
const decryptedBin = await miijs.read3DSQR('./example3DSQR.jpg', true);
console.log('Decrypted binary length:', decryptedBin.length);
```

## Reading a Wii Mii from Binary File
```javascript
const miijs = require('miijs');

// Read from file path
const miiJson = await miijs.readWiiBin('./exampleWii.bin');
console.log('Mii Name:', miiJson.meta.name);
console.log('Gender:', miiJson.general.gender === 0 ? 'Male' : 'Female');

// Or pass binary data directly
const fs = require('fs');
const binaryData = fs.readFileSync('./exampleWii.bin');
const miiJson2 = await miijs.readWiiBin(binaryData);
```

## Writing a 3DS Mii QR Code
```javascript
const miijs = require('miijs');

// First, read or create a Mii JSON
const miiJson = await miijs.read3DSQR('./example3DSQR.jpg');

// Write QR code with Studio rendering (no FFLResHigh.dat needed)
await miijs.write3DSQR(miiJson, './output_qr.jpg');

// Or with local rendering (requires FFLResHigh.dat in project root or passed as buffer)
const fs = require('fs');
const fflRes = fs.readFileSync('./FFLResHigh.dat');
await miijs.write3DSQR(miiJson, './output_qr_local.jpg', fflRes);
```

## Writing a Wii Mii Binary
```javascript
const miijs = require('miijs');
const fs = require('fs');

// Read a Mii (from any format)
const miiJson = await miijs.read3DSQR('./example3DSQR.jpg');

// Convert to Wii format first if needed
const wiiMii = miijs.convertMii(miiJson, 'wii');

// Write to file
await miijs.writeWiiBin(wiiMii, './output_wii.bin');

// Or get buffer without writing
const buffer = await miijs.writeWiiBin(wiiMii);
fs.writeFileSync('./manual_write.bin', buffer);
```

## Converting Between Formats
```javascript
const miijs = require('miijs');

// Read a 3DS Mii
const ds3Mii = await miijs.read3DSQR('./example3DSQR.jpg');

// Convert to Wii format
const wiiMii = miijs.convertMii(ds3Mii, 'wii');

// Convert back to 3DS
const backTo3DS = miijs.convertMii(wiiMii, '3ds');

// Auto-detect and convert to opposite
const autoConverted = miijs.convertMii(ds3Mii);
```

## Converting to/from Studio Format
```javascript
const miijs = require('miijs');

// Read a Mii and convert to Studio format
const miiJson = await miijs.read3DSQR('./example3DSQR.jpg');
const studioHex = miijs.convertMiiToStudio(miiJson);
console.log('Studio URL:', `https://studio.mii.nintendo.com/miis/image.png?data=${studioHex}`);

// Convert Studio format back to JSON
const studioData = '000d142a303f434b717a7b84939ba6b2bbbec5cbc9d0e2ea...';
const miiFromStudio = miijs.convertStudioToMii(studioData);
console.log('Converted Mii:', miiFromStudio.meta.name);
```

## Rendering Miis
```javascript
const miijs = require('miijs');
const fs = require('fs');

// Read a Mii
const miiJson = await miijs.read3DSQR('./example3DSQR.jpg');

// Render using Studio API (simple, no setup needed)
const studioPng = await miijs.renderMiiWithStudio(miiJson);
fs.writeFileSync('./mii_studio_render.png', studioPng);

// Render locally with full body (requires FFLResHigh.dat)
const fflRes = fs.readFileSync('./FFLResHigh.dat');
const localPng = await miijs.renderMii(miiJson, fflRes);
fs.writeFileSync('./mii_local_render.png', localPng);

// Shirt color comes from miiJson.general.favoriteColor
```

## Working with Amiibos
```javascript
const miijs = require('miijs');
const fs = require('fs');

// Read an Amiibo dump
const amiiboDump = fs.readFileSync('./exampleAmiiboDump.bin');

// Extract the Mii from the Amiibo (returns 92 bytes decrypted)
const miiData = miijs.extractMiiFromAmiibo(amiiboDump);

// Convert the raw Mii data to readable JSON
// (miiData is already decrypted 3DS format)
const miiJson = miijs.decode3DSMii(miiData); // Note: decode3DSMii not exported, use read3DSQR workflow

// Better workflow: Read from QR, get decrypted data, insert into Amiibo
const qrMiiJson = await miijs.read3DSQR('./example3DSQR.jpg');
const decryptedMiiData = await miijs.read3DSQR('./example3DSQR.jpg', true);

// Insert new Mii into Amiibo
const modifiedAmiibo = miijs.insertMiiIntoAmiibo(amiiboDump, decryptedMiiData);
fs.writeFileSync('./modified_amiibo.bin', modifiedAmiibo);
```

## Generating Recreation Instructions
```javascript
const miijs = require('miijs');

// Read a Mii
const miiJson = await miijs.read3DSQR('./example3DSQR.jpg');

// Generate only non-default instructions (minimal)
const minimalInstructions = miijs.generateInstructions(miiJson);
console.log('Steps to recreate:');
Object.values(minimalInstructions).forEach(step => {
    if (step) console.log('- ' + step);
});

// Generate complete instructions (every step)
const fullInstructions = miijs.generateInstructions(miiJson, true);
console.log('\nComplete recreation guide:');
Object.entries(fullInstructions).forEach(([field, instruction]) => {
    console.log(`${field}: ${instruction}`);
});
```

## Height and Weight Conversions
```javascript
const miijs = require('miijs');

// Convert Mii height (0-127) to feet/inches
const heightInfo = miijs.miiHeightToFeetInches(64); // midpoint value
console.log(`Height: ${heightInfo.feet}'${heightInfo.inches}" (${heightInfo.totalInches} inches)`);

// Convert real height to Mii value
const miiHeightValue = miijs.inchesToMiiHeight(72); // 6'0"
console.log('Mii height value for 6\'0":', miiHeightValue);

// EXPERIMENTAL: Convert real weight to Mii weight
const heightInches = 69; // 5'9"
const weightLbs = 160;
const miiWeightValue = miijs.heightWeightToMiiWeight(heightInches, weightLbs);
console.log('Mii weight value:', miiWeightValue);

// EXPERIMENTAL: Convert Mii weight to real weight
const weightInfo = miijs.miiWeightToRealWeight(heightInches, 64);
console.log(`Weight: ${weightInfo.pounds.toFixed(1)} lbs, BMI: ${weightInfo.bmi.toFixed(1)}`);
```

## Creating and Modifying a Mii
```javascript
const miijs = require('miijs');

// Read an existing Mii
const miiJson = await miijs.read3DSQR('./example3DSQR.jpg');

// Modify properties
miiJson.meta.name = 'Custom Name';
miiJson.general.favoriteColor = 5; // Blue
miiJson.hair.color = 0; // Black
miiJson.eyes.color = 2; // Brown

// Make it a Special Mii (3DS only)
miiJson.meta.type = 'Special';

// Convert to Wii format
const wiiVersion = miijs.convertMii(miiJson, 'wii');

// Save as both formats
await miijs.write3DSQR(miiJson, './modified_3ds.jpg');
await miijs.writeWiiBin(wiiVersion, './modified_wii.bin');
```

## Complete Workflow Example
```javascript
const miijs = require('miijs');
const fs = require('fs');

async function processMyMii() {
    // 1. Read from QR code
    const mii = await miijs.read3DSQR('./example3DSQR.jpg');
    console.log('Loaded:', mii.meta.name);
    
    // 2. Customize the Mii
    mii.general.favoriteColor = 0; // Red
    mii.general.height = miijs.inchesToMiiHeight(66); // 5'6"
    
    // 3. Render it
    const renderBuffer = await miijs.renderMiiWithStudio(mii);
    fs.writeFileSync('./my_mii_face.png', renderBuffer);
    
    // 4. Generate recreation instructions
    const instructions = miijs.generateInstructions(mii);
    console.log('\nRecreation steps:', instructions);
    
    // 5. Export to multiple formats
    await miijs.write3DSQR(mii, './my_mii_qr.jpg');
    
    const wiiMii = miijs.convertMii(mii, 'wii');
    await miijs.writeWiiBin(wiiMii, './my_mii_wii.bin');
    
    const studioCode = miijs.convertMiiToStudio(mii);
    console.log('\nStudio URL:', `https://studio.mii.nintendo.com/miis/image.png?data=${studioCode}`);
    
    console.log('\nDone! All formats exported.');
}

processMyMii().catch(console.error);
```

<hr>

## Special Miis
Special Miis were on the Wii and 3DS, identifiable via their golden pants. They were created by Nintendo employees, and not consumers. They could not be edited, or copied. In every other instance transferring a Mii to another system would leave a copy on both systems. For Special Miis, they would delete themselves from the console sending them, and only ever be present in one place at a time per copy Nintendo sent out. When receiving them via QR code on the 3DS, it would only allow you to scan that QR once, and never again. On the Wii, these were distributed via the WiiConnect24 service, and would arrive via the Message Board. On the 3DS, these were distributed occasionally via Spotpass, Streetpass, and QR codes.
### Making a Special Mii
To make a special Mii, read in the file using the appropriate function, set `mii.info.type="Special";`, and then write a new file with the appropriate function.
-# Special Miis only work on the Wii and 3DS, and no other console.

<hr>

## Other Console Support
- DS
   - DS and Wii Miis are interchangeable. The DS only contains Miis in a handful of games, and is not baked into the system, however every instance where it does it is based off the Wii version of Miis, and to my current knowledge always provides a way to transfer from the Wii, being the only way short of recreation to transfer onto the DS. There is, to my knowledge, no way to transfer Miis off of the DS short of recreation.
   - Use Wii functions for DS Miis
- Wii U
   - The Wii U and 3DS Miis are interchangeable, with one major exception. The 3DS has Special Miis, while the Wii U will not render any Mii set as a Special Mii. So since the 3DS has this one added feature, 3DS is what takes priority in the naming schemes across this project, however it is for all intents and purposes interchangeable with a Wii U Mii.
   - Use 3DS functions for Wii U Miis
- Switch/2
   - Miis are more isolated than they've ever been on the Switch/2. To take them on and off of the Switch/2 via direct transfer, an Amiibo _and_ one of, a 3DS with NFC Reader accessory, New 3DS, or Wii U, is **required**. The only other method is to recreate manually from scratch. When the Switch writes to an Amiibo, it converts it to a 3DS/Wii U format. Due to this limitation of direct transfer, all Miis that this library can affect will be going through the 3DS/Wii U anyway, and direct Switch/2 support is thus irrelevant. The only differences between Switch Miis and Wii U Miis (no Special Mii support on the Switch either) is a ton more hair colors anyway.
   - Use 3DS, Studio, and Amiibo functions for Switch/2 Miis
- Studio
   - Studio Miis are in essence Switch/2 Miis. Transferring directly on/off of Studio (a browser Mii Maker used purely for profile pictures across Nintendo's online logins) requires a developer console and code paste, or browser extension. I may undertake making my own version of this in the future, but for the time being [this tool](https://mii.tools/studioloader/) by HEYimHeroic serves this purpose (from what I can tell, I have not used it myself).
   - Use Studio Functions for Studio Miis
- Miitomo/Kaerutomo and Tomodachi Life
   - Both Mii formats are the same as 3DS formats, with extra info added to the end. The way the library is set up, it can already read these. My devices are too new for Kaerutomo support, but I believe it should be able to scan the 3DS format Miis. Writing specific to Tomodachi Life Miis with game data already present in the QR is more within the realm of a Tomodachi Life save editor. I may undertake this for the Miis in the future, but it would be a separate project.
   - Use 3DS functions for these Miis

<hr>

## Discrepancies in `convertMii` function
All of these discrepancies __only__ apply when converting from the **3DS to the Wii**, converting from the Wii to the 3DS should be a perfect conversion.
There is a reason that the Wii supports sending Miis to the 3DS, but not vice versa. Many of the fields on the 3DS are new, and not present on the Wii. This function does its absolute best to backport 3DS Miis, but it *is not perfect and never will be*. If you rely heavily on 3DS exclusive options in your Mii, the outputted Mii will likely not be satisfactory.
 - The 3DS has four more face shapes, thus some are converted to the closest possible for the Wii.
 - The 3DS allows you to set Makeup and Wrinkles seperately, as well as having 7 more "makeup" (including beard shadow and freckles) types and 5 more wrinkle types. This is probably one of the messiest conversions since one field has to be ignored entirely if both are set. Since the 3DS has some that are not even close to anything the Wii has, it will ignore these if the other field is set, allowing for the other field to be added in its place, prioritizing wrinkles over makeup. The outputted Mii will almost certainly require further editing to be satisfactory if these fields are used.
 - The 3DS has 6 extra nose types, all on the second page - these are mapped to similar noses on the first page that the Wii has.
 - The 3DS has an extra page of mouth types containing 12 extra mouth types. These are mapped to similar mouths on the other two pages that the Wii supports.
 - The 3DS has two extra lip colors. These are changed into the default Orangey lip color if used since both of the extra colors are closest to this.
 - The Wii does not have the option to "squish" parts to be thinner. This function ignores this field as a result.
 - The 3DS has 60 extra hairstyles. These are mapped to hairstyles the Wii does have. This will not be a perfect conversion and has a decent chance of needing a manual change.
 - The 3DS has an extra page of eye types that the Wii does not, which the function maps to a similar eye type that the Wii does support if used. Will likely require a manual edit.
 - The 3DS has two extra mustaches and two extra beards. These are mapped to a similar beard or mustache if used - the two extra beards will likely need a manual change if used.
 
 <hr>

# Transferring Miis to and from the System
 - DS
    - If the game you would like to transfer Miis to supports it, the option to "Connect to Wii" will be found in various places and worded different ways. The main game you might want to do this for is Tomodachi Collection, which will be in Town Hall after three Mii residents are on the island. On the Wii, you then want to press the DS icon in the top right and follow the prompts from there. If the option is not present, press and _release_ **A**, press and release **B**, press and release **1**, and then press and _hold_ **2**. The option should then be visible. This option is not available on Wii U or the Wii mode of the Wii U, and can only be used to send Miis to DS and 3DS, not from. No option to retrieve Miis from the DS is available besides recreating the Mii.
 - Wii
    - Method 1 (Recommended, doesn't require homebrew): Connect the Wiimote to your PC, Dolphin seems to be the easiest way to do so though there are some more difficult ways to do so, and use [WDMLMiiTransfer](https://sourceforge.net/projects/wdml/files/WDML%20-%20MiiTransfer/). Open the `readSlotX.bat` file for the slot you're trying to read from (Array notation, 0=1, 1=2, 2=3, and so on). The Mii will be in the same directory under the name `miiX.mii`, where X is the same number as the readSlot you opened. If you used `readSlotAll.bat`, then there will be 10 Miis (0-9) in the directory. Note that if no Mii was ever present in that slot ever on the Wiimote, it will still output a `miiX.mii` file, though it will not contain the Mii data correctly. To write to the Wiimote, make sure the Mii you're writing is in the same directory and named `miiX.mii`, where X is the slot you're writing to, and open `writeSlotX.bat`, where X is the slot you're writing to (in array notation). You can transfer Miis on and off the Wiimote from the Wii by using the Wiimote icon in the top right of Mii Maker.
    - Method 2 (Requires Homebrew, is untested by me): [Mii Installer](https://wiibrew.org/wiki/Mii_Installer) for writing from the SD card to the Wii, and [Mii Extractor](https://wiibrew.org/wiki/Mii_Extractor) for reading from the Wii.
 - 3DS and Wii U
    - Open Mii Maker, select "QR Code/Image Options", and then select the respective QR Code option, be it scanning a QR code or saving a Mii as a QR code.
 - Amiibo
    - You can use [Tagmo](https://play.google.com/store/apps/details?id=com.hiddenramblings.tagmo.eightbit&hl=en_US&pli=1) on Android, bottom right NFC button -> Backup to retrieve an Amiibo file, or Amiibo bin in explorer -> Write: first write to blank NTAG215 tag OR Update: subsequent writes to already-an-Amiibo tags. _Reportedly_ [one of these apps](https://www.reddit.com/r/tagmo/comments/ynxonu/list_of_ios_iphone_amiibo_apps/) can be used for an equivalent on iPhone. I have not tested and cannot verify any of the iPhone apps at this time.
 - Switch/2
    - You have to use Amiibos as a conduit to interact with Miis on the Switch/2. To take these Miis on and off of the Switch, in System Settings under the Amiibo menu you can register or change the Owner Mii to set the Mii stored on the Amiibo, and under Miis you can select Create a Mii and then Copy from Amiibo to take a Mii from the Amiibo onto the Switch.

<sub>If you are unable to transfer to the console you wish to, you can use the `generateInstructions` function provided here and manually recreate the Mii on the console using the provided instructions.</sub>

<hr>

## FFLResHigh.dat
FFLResHigh.dat provides the necessary models and textures to build a 3D model of the Mii. This will not be provided by the library but can be provided by placing it in the directory of the project calling MiiJS. By providing FFLResHigh.dat, you can then render Miis locally without using Studio. If you do not have or do not provide FFLResHigh.dat, rendering is still available via Studio.
### Finding FFLResHigh.dat
Any version of AFLResHigh.dat will work as well, renamed to FFLResHigh.dat.
You can find FFLResHigh using a Wii U with an FTP program installed at `sys/title/0005001b/10056000/content/FFLResHigh.dat`. From a Miitomo install, it can be found in the cache at `res/asset/model/character/mii/AFLResHigh_2_3.dat`.

<hr>

# Credits
 - **[kazuki-4ys' MiiInfoEditorCTR](https://github.com/kazuki-4ys/kazuki-4ys.github.io/tree/master/web_apps/MiiInfoEditorCTR)** - I repurposed how to decrypt and reencrypt the QR codes from here, including repurposing the asmCrypto.js file in its entirety with very small modifications (it has since been stripped down to only include the functions this library uses). I believe I also modified the code for rendering the Mii using Nintendo's Mii Studio from here as well, though I do not remember for certain.
 - **[ariankordi's FFL.js](https://github.com/ariankordi/FFL.js/)** - Rendering Miis locally would not be possible without this library. Instructions for finding FFLResHigh are also learned from [ariankordi's FFL-Testing repository](https://github.com/ariankordi/FFL-Testing).
 - **[Models Resource](https://models.spriters-resource.com/3ds/systembios/asset/306260/)** - For the bodies used in Mii rendering
 - **[socram8888's Amiitools](https://github.com/socram8888/amiitool)** - I _think_, for the code reverse engineered to help with aspects of Amiibo dump processing. I went through so many iterations in research and coding, there may be other credits due as well but I _think_ this was the only repo actually used for the reverse engineering in the final working code.