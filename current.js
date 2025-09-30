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

        let data;
        if(/[^01]/ig.test(binOrPath)){
            data = fs.readFileSync(binOrPath);
        }
        else{
            data=Buffer.from(binOrPath);
        }

        const get = address => getBinaryFromAddress(address, data);

        var name="";
        for(var i=0;i<10;i++){
            name+=data.slice(3+i*2, 4+i*2)+"";
        }
        thisMii.name=name.replaceAll("\x00","");
        var cname="";
        for(var i=0;i<10;i++){
            cname+=data.slice(55+i*2, 56+i*2)+"";
        }
        thisMii.creatorName=cname.replaceAll("\x00","");
        thisMii.info.creatorName=thisMii.creatorName;
        thisMii.info.name=thisMii.name;//Up to ten characters
        thisMii.info.gender=get(0x00)[1]==="1"?"Female":"Male";//0 for Male, 1 for Female
        thisMii.info.miiId=parseInt(get(0x18),2).toString(16)+parseInt(get(0x19),2).toString(16)+parseInt(get(0x1A),2).toString(16)+parseInt(get(0x1B),2).toString(16);
        thisMii.info.systemId=parseInt(get(0x1C),2).toString(16)+parseInt(get(0x1D),2).toString(16)+parseInt(get(0x1E),2).toString(16)+parseInt(get(0x1F),2).toString(16);
        var temp=get(0x20);
        thisMii.face.shape=parseInt(temp.slice(0,3),2);//0-7
        thisMii.face.col=skinCols[parseInt(temp.slice(3,6),2)];//0-5
        temp=get(0x21);
        thisMii.face.feature=wiiFaceFeatures[parseInt(get(0x20).slice(6,8)+temp.slice(0,2),2)];//0-11
        thisMii.info.mingle=temp[5]==="0";//0 for Mingle, 1 for Don't Mingle
        temp=get(0x2C);
        for(var i=0;i<12;i++){
            if(wiiNoses[i]===parseInt(temp.slice(0,4),2)){
                thisMii.nose.type=i;
            }
        }
        thisMii.nose.size=parseInt(temp.slice(4,8),2);
        thisMii.nose.yPos=parseInt(get(0x2D).slice(0,5),2);//From top to bottom, 0-18, default 9
        temp=get(0x2E);
        thisMii.mouth.type=mouthTable[""+parseInt(temp.slice(0,5),2)];//0-23, Needs lookup table
        thisMii.mouth.col=wiiMouthColors[parseInt(temp.slice(5,7),2)];//0-2, refer to mouthColors array
        temp2=get(0x2F);
        thisMii.mouth.size=parseInt(temp[7]+temp2.slice(0,3),2);//0-8, default 4
        thisMii.mouth.yPos=parseInt(temp2.slice(3,8),2);//0-18, default 9, from top to bottom
        temp=get(0x00);
        var temp2=get(0x01);
        thisMii.info.birthMonth=parseInt(temp.slice(2,6),2);
        thisMii.info.birthday=parseInt(temp.slice(6,8)+temp2.slice(0,3),2);
        thisMii.info.favColor=favCols[parseInt(temp2.slice(3,7),2)];//0-11, refer to cols array
        thisMii.info.favorited=temp2[7]==="0"?false:true;
        thisMii.info.height=parseInt(get(0x16),2);//0-127
        thisMii.info.weight=parseInt(get(0x17),2);//0-127
        thisMii.info.downloadedFromCheckMiiOut=get(0x21)[7]==="0"?false:true;
        temp=get(0x34);
        temp2=get(0x35);
        thisMii.mole.on=temp[0]==="0"?false:true;//0 for Off, 1 for On
        thisMii.mole.size=parseInt(temp.slice(1,5),2);//0-8, default 4
        thisMii.mole.xPos=parseInt(temp2.slice(2,7),2);//0-16, Default 2
        thisMii.mole.yPos=parseInt(temp.slice(5,8)+temp2.slice(0,2),2);//Top to bottom
        temp=get(0x22);
        temp2=get(0x23);
        thisMii.hair.type=hairTable[""+parseInt(temp.slice(0,7),2)];//0-71, Needs lookup table
        thisMii.hair.col=hairCols[parseInt(temp[7]+temp2.slice(0,2),2)];//0-7, refer to hairCols array
        thisMii.hair.flipped=temp2[2]==="0"?false:true;
        temp=get(0x24);
        temp2=get(0x25);
        thisMii.eyebrows.type=eyebrowTable[""+parseInt(temp.slice(0,5),2)];//0-23, Needs lookup table
        thisMii.eyebrows.rotation=parseInt(temp.slice(6,8)+temp2.slice(0,2),2);//0-11, default varies based on eyebrow type
        temp=get(0x26);
        temp2=get(0x27);
        thisMii.eyebrows.col=hairCols[parseInt(temp.slice(0,3),2)];
        thisMii.eyebrows.size=parseInt(temp.slice(3,7),2);//0-8, default 4
        thisMii.eyebrows.yPos=(parseInt(temp[7]+temp2.slice(0,4),2))-3;//0-15, default 10
        thisMii.eyebrows.distApart=parseInt(temp2.slice(4,8),2);//0-12, default 2
        thisMii.eyes.type=eyeTable[parseInt(get(0x28).slice(0,6),2)];//0-47, needs lookup table
        temp=get(0x29);
        thisMii.eyes.rotation=parseInt(temp.slice(0,3),2);//0-7, default varies based on eye type
        thisMii.eyes.yPos=parseInt(temp.slice(3,8),2);//0-18, default 12, top to bottom
        temp=get(0x2A);
        thisMii.eyes.col=eyeCols[parseInt(temp.slice(0,3),2)];//0-5
        thisMii.eyes.size=parseInt(temp.slice(4,7),2);//0-7, default 4
        temp2=get(0x2B);
        thisMii.eyes.distApart=parseInt(temp[7]+temp2.slice(0,3),2);//0-12, default 2
        temp=get(0x30);
        thisMii.glasses.type=parseInt(temp.slice(0,4),2);//0-8
        thisMii.glasses.col=wiiGlassesCols[parseInt(temp.slice(4,7),2)];//0-5
        temp=get(0x31);
        thisMii.glasses.size=parseInt(temp.slice(0,3),2);//0-7, default 4
        thisMii.glasses.yPos=parseInt(temp.slice(3,8),2);//0-20, default 10
        temp=get(0x32);
        temp2=get(0x33);
        thisMii.facialHair.mustacheType=parseInt(temp.slice(0,2),2);//0-3
        thisMii.facialHair.beardType=parseInt(temp.slice(2,4),2);//0-3
        thisMii.facialHair.col=hairCols[parseInt(temp.slice(4,7),2)];//0-7
        thisMii.facialHair.mustacheSize=parseInt(temp[7]+temp2.slice(0,3),2);//0-30, default 20
        thisMii.facialHair.mustacheYPos=parseInt(temp2.slice(3,8),2);//0-16, default 2
        thisMii.console="Wii";
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
            const get = address => getBinaryFromAddress(address, data);
            var temp=get(0x18);
            var temp2=get(0x19);
            miiJson.info.birthday=parseInt(temp2.slice(6,8)+temp.slice(0,3),2);
            miiJson.info.birthMonth=parseInt(temp.slice(3,7),2);
            var name="";
            for(var i=0x1A;i<0x2E;i+=2){
                if(get(i)==="00000000"){
                    break;
                }
                name+=data.slice(i,i+1);
            }
            miiJson.name=name.replaceAll("\x00","");
            var cname="";
            for(var i=0x48;i<0x5C;i+=2){
                if(get(i)==="00000000"){
                    break;
                }
                cname+=data.slice(i,i+1);
            }
            miiJson.creatorName=cname.replaceAll("\x00","");
            miiJson.info.name=miiJson.name;
            miiJson.info.creatorName=miiJson.creatorName;
            miiJson.info.height=parseInt(get(0x2E),2);
            miiJson.info.weight=parseInt(get(0x2F),2);
            miiJson.info.gender=temp[7]==="1"?"Female":"Male";
            temp=get(0x30);
            miiJson.perms.sharing=temp[7]==="1"?false:true;
            miiJson.info.favColor=favCols[parseInt(temp2.slice(2,6),2)];
            miiJson.perms.copying=get(0x01)[7]==="1"?true:false;
            miiJson.hair.style=lookupTable("hairs",parseInt(get(0x32),2),true);
            miiJson.face.shape=lookupTable("faces",parseInt(temp.slice(3,7),2),false);
            miiJson.face.col=skinCols[parseInt(temp.slice(0,3),2)];
            temp=get(0x31);
            miiJson.face.feature=faceFeatures3DS[parseInt(temp.slice(4,8),2)];
            miiJson.face.makeup=makeups3DS[parseInt(temp.slice(0,4),2)];
            temp=get(0x34);
            miiJson.eyes.type=lookupTable("eyes",parseInt(temp.slice(2,8),2),true);
            temp2=get(0x33);
            miiJson.hair.col=hairCols[parseInt(temp2.slice(5,8),2)];
            miiJson.hair.flipped=temp2[4]==="0"?false:true;
            miiJson.eyes.col=eyeCols[parseInt(get(0x35)[7]+temp.slice(0,2),2)];
            temp=get(0x35);
            miiJson.eyes.size=parseInt(temp.slice(3,7),2);
            miiJson.eyes.squash=parseInt(temp.slice(0,3),2);
            temp=get(0x36);
            temp2=get(0x37);
            miiJson.eyes.rot=parseInt(temp.slice(3,8),2);
            miiJson.eyes.distApart=parseInt(temp2[7]+temp.slice(0,3),2);
            miiJson.eyes.yPos=parseInt(temp2.slice(2,7),2);
            temp=get(0x38);
            miiJson.eyebrows.style=lookupTable("eyebrows",parseInt(temp.slice(3,8),2),true);
            miiJson.eyebrows.col=hairCols[parseInt(temp.slice(0,3),2)];
            temp=get(0x39);
            miiJson.eyebrows.size=parseInt(temp.slice(4,8),2);
            miiJson.eyebrows.squash=parseInt(temp.slice(1,4),2);
            temp=get(0x3A);
            miiJson.eyebrows.rot=parseInt(temp.slice(4,8),2);
            temp2=get(0x3B);
            miiJson.eyebrows.distApart=parseInt(temp2[7]+temp.slice(0,3),2);
            miiJson.eyebrows.yPos=parseInt(temp2.slice(2,7),2)-3;
            temp=get(0x3C);
            miiJson.nose.type=lookupTable("noses",parseInt(temp.slice(3,8),2),true);
            temp2=get(0x3D);
            miiJson.nose.size=parseInt(temp2[7]+temp.slice(0,3),2);
            miiJson.nose.yPos=parseInt(temp2.slice(2,7),2);
            temp=get(0x3E);
            miiJson.mouth.type=lookupTable("mouths",parseInt(temp.slice(2,8),2),true);
            temp2=get(0x3F);
            miiJson.mouth.col=mouthCols3DS[parseInt(temp2[7]+temp.slice(0,2),2)];
            miiJson.mouth.size=parseInt(temp2.slice(3,7),2);
            miiJson.mouth.squash=parseInt(temp2.slice(0,3),2);
            temp=get(0x40);
            miiJson.mouth.yPos=parseInt(temp.slice(3,8),2);
            miiJson.facialHair.mustacheType=parseInt(temp.slice(0,3),2);
            temp=get(0x42);
            miiJson.facialHair.beardType=parseInt(temp.slice(5,8),2);
            miiJson.facialHair.col=hairCols[parseInt(temp.slice(2,5),2)];
            temp2=get(0x43);
            miiJson.facialHair.mustacheSize=parseInt(temp2.slice(6,8)+temp.slice(0,2),2);
            miiJson.facialHair.mustacheYPos=parseInt(temp2.slice(1,6),2);
            temp=get(0x44);
            miiJson.glasses.type=parseInt(temp.slice(4,8),2);
            miiJson.glasses.col=glassesCols3DS[parseInt(temp.slice(1,4),2)];
            temp2=get(0x45);
            miiJson.glasses.size=parseInt(temp2.slice(5,8)+temp[0],2);
            miiJson.glasses.yPos=parseInt(temp2.slice(0,5),2);
            temp=get(0x46);
            miiJson.mole.on=temp[7]==="0"?false:true;
            miiJson.mole.size=parseInt(temp.slice(3,7),2);
            temp2=get(0x47);
            miiJson.mole.xPos=parseInt(temp2.slice(6,8)+temp.slice(0,3),2);
            miiJson.mole.yPos=parseInt(temp2.slice(1,6),2);
            miiJson.console="3DS";
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
        if(jsonIn.console?.toLowerCase()!=="wii"){
            this.convertMii(jsonIn);
        }
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
        if(!["3ds","wii u"].includes(jsonIn.console?.toLowerCase())){
            jsonIn=this.convertMii(jsonIn);
        }
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
                return buffer;
            }
            const miiBinary = makeMiiBinary(mii);
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
            const qrBuffer = Buffer.from( await qrCodeImage.getRawData("png") )

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
            let miiPNGBuf = null;
            let renderedWithStudio = fflRes===null || fflRes===undefined; 
            if(renderedWithStudio){
                miiPNGBuf = await this.render3DSMiiWithStudio(jsonIn);
            }
            else{
                miiPNGBuf = await this.render3DSMii(jsonIn,fflRes);
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
            mii_img.resize(miiSize*miiZoomFactor, miiSize*miiZoomFactor, Jimp.RESIZE_BICUBIC);
            mii_img.crop(
                (miiSize*miiZoomFactor - 100) / 2,
                (miiSize*miiZoomFactor - 100) / 2,
                miiSize,
                miiSize
            );

            const canvas = new Jimp(mii_img.bitmap.width, mii_img.bitmap.height, 0xFFFFFFFF);
            canvas.composite(mii_img, 0, miiYOffset);
            main_img.blit(canvas, 212-100/2, 212-100/2);
            const font = await Jimp.loadFont(Jimp.FONT_SANS_16_BLACK)
            
            main_img.print(font, 0, 55, {
                text: mii.name,
                alignmentX: Jimp.HORIZONTAL_ALIGN_CENTER,
                alignmentY: Jimp.VERTICAL_ALIGN_MIDDLE
            }, 424, 395);
            
            if(mii.info.type==="Special"){
                const crown_img = await Jimp.read(path.join(__dirname, 'crown.jpg'));
                crown_img.resize(40,20);
                main_img.blit(crown_img,225,160);
            }

            main_img.write(outPath, (err, img) =>
                resolve(img)
            );
        })
    }