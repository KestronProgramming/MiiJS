# MiiJS
Read, Edit, Write, and make Special Miis from a Wiimote binary file or 3DS QR Code to a binary file or QR code

### *3DS and Wii U Miis function the same, the term 3DS here also applies to the Wii U for everything

## Installation
`npm i miijs` OR `npm install miijs`

## Making a Special Mii
To make a special Mii, read in the file using the appropriate function, set `mii.info.type="Special";`, and then write a new file with the appropriate function.

# Functions
 - async read3DSQR(pathToQR), returns JSON
 - write3DSQR(miiJSON, path), writes QR
 - readWiiBin(pathToMii), returns JSON
 - writeWiiBin(miiJSON, path), writes new bin to the path specified
 - render3DSMiiFromJSON(miiJSON, path), writes PNG representation of Mii's face to the path specified
 - convertMii(miiJson, whatConsoleItIsForOriginallly ("3ds" or "wii")), converts the Mii JSON format

 ## Discrepancies in Conversion function
All of these discrepancies only apply when converting from the 3DS to the Wii, converting from the Wii to the 3DS should be a perfect conversion.
There is a reason that the Wii supports sending Miis to the 3DS, but not vice versa. Many of the fields on the 3DS are new, and not present on the Wii. This function does its absolute best to backport 3DS Miis, but it *is not perfect and never will be*. If you rely heavily on 3DS exclusive options in your Mii, the outputted Mii will likely not be satisfactory.

Here is a list of discrepancies this function attempts to handle.
 - The 3DS has four more face shapes, thus some are converted to the closest possible for the Wii
 - The 3DS allows you to set Makeup and Wrinkles simultaneously, as well as having 7 more "makeup" (including beard shadow and freckles) types and 5 more wrinkle types. This is probably one of the messiest conversions since one field has to be ignored entirely if both are set. Since the 3DS has some that are not even close to anything the Wii has, it will ignore these if the other field is set, allowing for the other field to be added in it's place, prioritizing wrinkles over makeup. The outputted Mii will almost certainly require further editing to be satisfactory if these fields are used.
 - The 3DS has 6 extra nose types, all on the second page - these are mapped to similar noses on the first page that the Wii has
 - The 3DS has an extra page of mouth types containing 12 extra mouth types. These are mapped to similar mouths on the other two pages that the Wii supports.
 - The 3DS has two extra lip colors. These are changed into the default Orangey lip color if used since both of the extra colors are closest to this.
 - The Wii does not have the option to "squish" parts to be thinner. This function ignores this field as a result.
 - The 3DS has 60 extra hairstyles. These are mapped to hairstyles the Wii does have, but obviously out of 60 it won't be perfect. There will also be typoes more than likely, but I'm not testing 132 different Miis, sorry 😜. This will not be a perfect conversion and has a decent chance of needing a manual change anyway.
 - The 3DS has an extra page of eye types that the Wii does not, which the function maps to a similar eye type that the Wii does support if used. Will likely require a manual edit.
 - The 3DS has two extra mustaches and two extra beards. These are mapped to a similar beard or mustache if used - the two extra beards will likely need a manual change if used.
 
 
 
# Credits
 - [kazuki-4ys' MiiInfoEditorCTR](https://github.com/kazuki-4ys/kazuki-4ys.github.io/tree/master/web_apps/MiiInfoEditorCTR), I took the code for how to decrypt and reencrypt the QR codes from here, including the asmCrypto.js file (with some slight modifications to work in my coding style). I believe I also modified the code for rendering the Mii using Nintendo's Mii Studio from here as well.
