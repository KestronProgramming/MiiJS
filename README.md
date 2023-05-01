# MiiJS
Read, Edit, Write, and make Special Miis from a Wiimote binary file or 3DS QR Code to a binary file or QR code

## Installation
`npm i miijs` OR `npm install miijs`

## Making a Special Mii
To make a special Mii, read in the file using the appropriate function, set `mii.info.type="Special";`, and then write a new file with the appropriate function.

# Functions
 - async read3DSQR(pathToQR), returns JSON
 - write3DSQR(miiJSON,path), writes QR
 - readWiiBin(pathToMii), returns JSON
 - writeWiiBin(miiJSON,path), writes new bin
 
 
 
# Credits
 - [kazuki-4ys' MiiInfoEditorCTR](https://github.com/kazuki-4ys/kazuki-4ys.github.io/tree/master/web_apps/MiiInfoEditorCTR), I took the code for how to decrypt and reencrypt the QR codes from here, including the asmCrypto.js file (with some slight modifications to work in my coding style). I believe I also modified the code for rendering the Mii using Nintendo's Mii Studio from here as well.
