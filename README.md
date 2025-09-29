# MiiJS
MiiJS is a JS library for working with Mii characters in an accessible way. Reading and writing binary representations or QR codes, converting between consoles, rendering via Studio or locally, generating instructions to recreate the Miis, making Special Miis, and more functions planned. This library reads Mii data into JSON, which is human and computer readable.
<hr>

## Installation
`npm install miijs` | `npm i miijs`

<hr>

## Table of Contents
- [Functions](#functions)
- [Special Miis](#special-miis)
- [Other Console Support](#other-console-support)
- [`convertMii` Discrepancies](#discrepancies-in-convertmii-function)
- [Transferring to/from the System](#transferring-miis-to-and-from-the-system)
- [FFLResHigh.dat](#fflreshighdat)
- [Credits](#credits)
<hr>

# Functions
 - **`async read3DSQR(PathToMiiQR OR BinaryDataFromQR, ReturnDecryptedBin?)`** - returns JSON by default, by specifying `true` as the secondary parameter you can receive only the decrypted Mii data from the QR.
 - **`async write3DSQR(MiiJSON, PathToWriteTo, fflRes)`** - writes a JPG QR of a 3DS scannable Mii to the path specified. If no fflRes is specified, the QR will render using Nintendo Studio's API. If one is, it will contain a locally rendered version. fflRes must either be passed as a buffer, or FFLResHigh.dat present in your project's root directory.

 - **`readWiiBin(PathToMii OR BinaryMiiData)`** - returns JSON.
 - **`writeWiiBin(MiiJSON, PathToWriteTo)`** - returns Mii binary which can then be written by default. If PathToWriteTo is specified, it will instead be written to a file.

 - **`convertMii(miiJson)`** - converts the Mii JSON format to the opposite Mii type (3DS, Wii) and returns the JSON.
 - **`convertMiiToStudio(miiJSON)`** - returns a Studio compatible Mii in hex format.

 - **`async renderMiiWithStudio(miiJSON)`** - Returns a buffer containing a JPG representation of the Mii's face using Studio.
 - **`async renderMii(miiJSON,fflRes)`** - Returns a buffer containing a JPG representation of the Mii's face. fflRes must either be passed as a buffer, or FFLResHigh.dat present in your project's root directory.

 - **`generateInstructions(miiJson, fullInstructions)`** - returns a JSON object of different instruction fields. If full is not set, only the instructions that differ from a default Mii will be returned.

<hr>

## Special Miis
Special Miis were on the Wii and 3DS, identifiable via their golden pants. They were created by Nintendo employees, and not consumers. They could not be edited, or copied. In every other instance transferring a Mii to another system would leave a copy on both systems. For Special Miis, they would delete themselves from the console sending them, and only ever be present in one place at a time per copy Nintendo sent out. When receiving them via QR code on the 3DS, it would only allow you to scan that QR once, and never again. On the Wii, these were distributed via the WiiConnect24 service, and would arrive via the Message Board. On the 3DS, these were distributed occasionally via Spotpass, Streetpass, and QR codes.
### Making a Special Mii
To make a special Mii, read in the file using the appropriate function, set `mii.info.type="Special";`, and then write a new file with the appropriate function.
-# The Wii U does not support Special Miis.

<hr>

## Other Console Support
- DS
   - DS and Wii Miis are interchangeable. The DS only contains Miis in a handful of games, and is not baked into the system, however every instance where it does it is based off the Wii version of Miis, and to my current knowledge always provides a way to transfer to and from the Wii, being the only way short of recreation to transfer on and off.
- Wii U
   - The Wii U and 3DS Miis are interchangeable, with one major exception. The 3DS has Special Miis, while the Wii U will not render any Mii set as a Special Mii. So since the 3DS has this one added feature, 3DS is what takes priority in the naming schemes across this project, however it is for all intents and purposes interchangeable with a Wii U Mii.
- Switch/2
   - Miis are more isolated than they've ever been on the Switch/2. To take them on and off of the Switch/2 via direct transfer, an Amiibo _and_ one of, a 3DS with NFC Reader accessory, New 3DS, or Wii U, is **required**. The only other method is to recreate manually from scratch. Due to this limitation of direct transfer, all Miis that this library can affect will be going through the 3DS or Wii U anyway, and direct Switch/2 support is thus irrelevant. 
- Studio
   - Studio Miis are in essence Switch/2 Miis. Transferring directly on/off of Studio (a browser Mii Maker used purely for profile pictures across Nintendo's online logins) requires a developer console and code paste, or browser extension. I may undertake making my own version of this in the future, but for the time being [this tool](https://mii.tools/studioloader/) by HEYimHeroic serves this purpose (from what I can tell, I have not used it myself).
- Miitomo/Kaerutomo and Tomodachi Life
   - Both Mii formats are the same as 3DS formats, with extra info added to the end. The way the library is set up, it can already read these. My devices are too new for Kaerutomo support, but I believe it should be able to scan the 3DS format Miis. Writing specific to Tomodachi Life Miis with game data already present in the QR is more within the realm of a Tomodachi Life save editor. I may undertake this for the Miis in the future, but it would be a separate project.

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
 - Wii
    - Method 1 (Recommended, doesn't require homebrew): Connect the Wiimote to your PC, Dolphin seems to be the easiest way to do so though there are some more difficult ways to do so, and use [WDMLMiiTransfer](https://sourceforge.net/projects/wdml/files/WDML%20-%20MiiTransfer/). Open the `readSlotX.bat` file for the slot you're trying to read from (Array notation, 0=1, 1=2, 2=3, and so on). The Mii will be in the same directory under the name `miiX.mii`, where X is the same number as the readSlot you opened. If you used `readSlotAll.bat`, then there will be 10 Miis (0-9) in the directory. Note that if no Mii was ever present in that slot ever on the Wiimote, it will still output a `miiX.mii` file, though it will not contain the Mii data correctly. To write to the Wiimote, make sure the Mii you're writing is in the same directory and named `miiX.mii`, where X is the slot you're writing to, and open `writeSlotX.bat`, where X is the slot you're writing to (in array notation). You can transfer Miis on and off the Wiimote from the Wii by using the Wiimote icon in the top right of Mii Maker.
    - Method 2 (Requires Homebrew, is untested by me): [Mii Installer](https://wiibrew.org/wiki/Mii_Installer) for writing from the SD card to the Wii, and [Mii Extractor](https://wiibrew.org/wiki/Mii_Extractor) for reading from the Wii.
 - 3DS and Wii U
    - Open Mii Maker, select "QR Code/Image Options", and then select the respective QR Code option, be it scanning a QR code or saving a Mii as a QR code.

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