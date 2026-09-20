'use strict';
const crypto = require('node:crypto');
const hash = b => crypto.createHash('sha256').update(b).digest('hex');
function applyPatch(source, recipe) {
 if(hash(source)!==recipe.sourceSha256) throw new Error('This game/mod version does not match the tested Mac port. No files were changed.');
 let output;
 if(recipe.blocks) output=Buffer.concat(recipe.blocks.map(b=>b.copy?source.subarray(b.copy[0],b.copy[0]+b.copy[1]):Buffer.from(b.data,'base64')));
 else {
  output=Buffer.from(source);
  for(const c of recipe.changes){const old=Buffer.from(c.before,'hex'), next=Buffer.from(c.after,'hex');
   if(old.length!==next.length||!output.subarray(c.offset,c.offset+old.length).equals(old))throw new Error('Patch validation failed.');
   next.copy(output,c.offset);
  }
 }
 if(hash(output)!==recipe.outputSha256)throw new Error('Patched file failed its checksum.');
 return output;
}
function validateEntries(entries) {
 let total=0;
 for(const e of entries){const n=e.entryName;
  if(!n||n.includes('\\')||n.startsWith('/')||n.split('/').some(p=>p==='..')||/^[A-Za-z]:/.test(n)||n.includes('\0'))throw new Error('Archive contains an unsafe path.');
  const mode=(e.header.attr>>>16)&0xf000;if(mode===0xa000)throw new Error('Archive symlinks are not supported.');
  total+=e.header.size;if(total>150*1024*1024)throw new Error('Velo archive is unexpectedly large.');
 }
}
module.exports={hash,applyPatch,validateEntries};
