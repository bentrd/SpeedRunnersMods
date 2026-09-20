'use strict';
const fs=require('node:fs/promises');const path=require('node:path');
let cachedPath,cachedArt;
async function texture(file){
 const bytes=await fs.readFile(file);
 if(bytes.length>16*1024*1024)throw new Error('Unexpected texture size');
 // xnb reads the entire underlying ArrayBuffer, so avoid pooled Buffer offsets.
 const input=Buffer.alloc(bytes.length);bytes.copy(input);
 const results=await require('xnb').unpackToFiles(input,{fileName:path.basename(file),contentOnly:true});
 const png=results.find(f=>f.extension==='png');if(!png)throw new Error('Missing texture');
 const data=Buffer.from(typeof png.data.arrayBuffer==='function'?await png.data.arrayBuffer():png.data);
 return 'data:image/png;base64,'+data.toString('base64');
}
async function loadArt(gamePath){
 if(!gamePath)return {};
 if(cachedPath===gamePath&&cachedArt)return cachedArt;
 const root=path.join(gamePath,'Contents/Resources/Content/UI');
 const result={};
 for(const [name,file] of [['sky','SpeedRunners/Menu_Sky'],['city','SpeedRunners/Menu_City'],['logo','SpeedRunnerLogo']]){
  try{result[name]=await texture(path.join(root,'MainMenu',file+'.xnb'));}catch(e){console.warn(`Game artwork ${name}: ${e.message}`);}
 }
 try{result.font='data:font/ttf;base64,'+(await fs.readFile(path.join(root,'Font/ariblk.ttf'))).toString('base64');}catch{}
 cachedPath=gamePath;cachedArt=result;return result;
}
module.exports={loadArt,texture};
