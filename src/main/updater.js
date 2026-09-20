'use strict';
const fs=require('node:fs/promises');
const path=require('node:path');
const crypto=require('node:crypto');
const {execFile,spawn}=require('node:child_process');
const {promisify}=require('node:util');
const exec=promisify(execFile);
const REPO='bentrd/SpeedRunnersMods';
const BUNDLE_ID='dev.bentrd.speedrunnersmods';
function newer(a,b){const parse=s=>{if(!/^\d+\.\d+\.\d+$/.test(s))throw new Error('Invalid release version');return s.split('.').map(Number);};const x=parse(a),y=parse(b);for(let i=0;i<3;i++){if(x[i]!==y[i])return x[i]>y[i];}return false;}
function chooseAsset(release,arch=process.arch){return release.assets?.find(a=>a.name===`SpeedRunners-Mods-${release.tag_name.replace(/^v/,'')}-${arch}.zip`);}
async function release(){const response=await fetch(`https://api.github.com/repos/${REPO}/releases/latest`,{headers:{Accept:'application/vnd.github+json'},signal:AbortSignal.timeout(20000)});if(response.status===404)return null;if(!response.ok)throw new Error(`Could not check for updates (${response.status}). Try again later.`);const r=await response.json();if(r.draft||r.prerelease)return null;return r;}
async function check(current){const r=await release();if(!r)return {available:false};const version=r.tag_name.replace(/^v/,'');return {available:newer(version,current)&&!!chooseAsset(r),version};}
function quote(s){return "'"+s.replace(/'/g,"'\\''")+"'";}
function swapScript({pid,target,staged,backup,log}){
 return `#!/bin/bash\nset -eu\nexec >>${quote(log)} 2>&1\nfor i in {1..300}; do\n if ! kill -0 ${pid} 2>/dev/null; then break; fi\n sleep 0.2\ndone\nif kill -0 ${pid} 2>/dev/null; then echo 'App did not exit; update cancelled'; exit 1; fi\nif ! mv ${quote(target)} ${quote(backup)}; then exit 1; fi\nif mv ${quote(staged)} ${quote(target)}; then\n /usr/bin/open ${quote(target)} || { mv ${quote(target)} ${quote(staged)}; mv ${quote(backup)} ${quote(target)}; /usr/bin/open ${quote(target)}; }\nelse\n mv ${quote(backup)} ${quote(target)}\n /usr/bin/open ${quote(target)}\n exit 1\nfi\n`;
}
async function install(app,notify=()=>{}){
 if(!app.isPackaged)throw new Error('App updates are available in the installed macOS app.');
 const r=await release();if(!r||!newer(r.tag_name.replace(/^v/,''),app.getVersion()))return {updated:false};
 const asset=chooseAsset(r);if(!asset)throw new Error('No update is available for this Mac.');
 if(!/^sha256:[a-f0-9]{64}$/.test(asset.digest||''))throw new Error('The release has no verified checksum yet. Try again later.');
 if(!asset.browser_download_url.startsWith(`https://github.com/${REPO}/releases/download/`))throw new Error('Unexpected update source.');
 const marker='.app/Contents/',exe=app.getPath('exe'),i=exe.indexOf(marker);if(i<0)throw new Error('Could not locate the installed app.');
 const target=exe.slice(0,i+4);if(target.includes('/AppTranslocation/')||target.startsWith('/Volumes/'))throw new Error('Move the app to Applications before updating.');
 await fs.access(path.dirname(target),2);
 const work=await fs.mkdtemp(path.join(path.dirname(target),'.speedrunners-update-'));const zip=path.join(work,'update.zip');
 try{
  notify('Downloading launcher update…');
  const response=await fetch(asset.browser_download_url,{signal:AbortSignal.timeout(300000)});if(!response.ok)throw new Error(`Update download failed (${response.status}).`);
  const out=await fs.open(zip,'wx');const h=crypto.createHash('sha256');let size=0;
  try{for await(const chunk of response.body){size+=chunk.length;if(size>500*1024*1024)throw new Error('Update is unexpectedly large.');h.update(chunk);await out.write(chunk);}}finally{await out.close();}
  if(size!==asset.size||'sha256:'+h.digest('hex')!==asset.digest)throw new Error('Update checksum mismatch. Your current app was kept.');
  const unpack=path.join(work,'unpacked');await exec('/usr/bin/ditto',['-xk',zip,unpack]);
  const staged=path.join(unpack,'SpeedRunners Mods.app');
  const plist=path.join(staged,'Contents/Info.plist');
  const read=async key=>(await exec('/usr/libexec/PlistBuddy',['-c',`Print :${key}`,plist])).stdout.trim();
  if(await read('CFBundleIdentifier')!==BUNDLE_ID||await read('CFBundleShortVersionString')!==r.tag_name.replace(/^v/,''))throw new Error('Update bundle identity does not match this app.');
  await exec('/usr/bin/codesign',['--verify','--deep','--strict',staged]);
  const script=path.join(work,'swap.sh');const log=path.join(app.getPath('userData'),'update.log');
  await fs.writeFile(script,swapScript({pid:process.pid,target,staged,backup:path.join(work,'previous.app'),log}),{mode:0o700});
  notify('Update verified. Restarting the launcher…');
  spawn('/bin/bash',[script],{detached:true,stdio:'ignore'}).unref();setTimeout(()=>app.quit(),400);return {updated:true};
 }catch(e){await fs.rm(work,{recursive:true,force:true});throw e;}
}
module.exports={newer,chooseAsset,quote,swapScript,check,install};
