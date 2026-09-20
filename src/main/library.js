'use strict';
const fs=require('node:fs/promises');
const path=require('node:path');
const os=require('node:os');
const {execFile,spawn}=require('node:child_process');
const {promisify}=require('node:util');
const exec=promisify(execFile);
const Zip=require('adm-zip');
const {hash,applyPatch,validateEntries}=require('./patches');
const APPID='207140';
const defaultSteam=path.join(os.homedir(),'Library/Application Support/Steam');
const exists=async p=>fs.access(p).then(()=>true,()=>false);
async function discoverGame(){
 let roots=[defaultSteam];
 try{const vdf=await fs.readFile(path.join(defaultSteam,'steamapps/libraryfolders.vdf'),'utf8');roots.push(...[...vdf.matchAll(/"path"\s+"([^"]+)"/g)].map(m=>m[1].replace(/\\\\/g,'\\')));}catch{}
 for(const root of [...new Set(roots)]){const p=path.join(root,'steamapps/common/SpeedRunners/SpeedRunners.app');if(await validGame(p))return p;}
 return null;
}
async function validGame(p){return typeof p==='string'&&p.endsWith('.app')&&await exists(path.join(p,'Contents/MacOS/SpeedRunners'))&&await exists(path.join(p,'Contents/Resources/SpeedRunners.exe'));}
class Library {
 constructor(root,port,notify=()=>{}){this.root=root;this.port=port;this.notify=notify;this.busy=false;this.process=null;this.session=null;this.error=null;this.launchPendingUntil=0;}
 async init(){await fs.mkdir(this.root,{recursive:true});this.config=await this.readJSON('settings.json',{});if(!await validGame(this.config.gamePath))this.config.gamePath=await discoverGame();await this.save();}
 async readJSON(file,fallback){try{return JSON.parse(await fs.readFile(path.join(this.root,file),'utf8'));}catch{return fallback;}}
 async save(){const temp=path.join(this.root,'settings.json.tmp');await fs.writeFile(temp,JSON.stringify(this.config,null,2));await fs.rename(temp,path.join(this.root,'settings.json'));}
 get veloApp(){return path.join(this.root,'installations/velo/SpeedRunners.app');}
 get logPath(){return path.join(this.root,'logs/game.log');}
 async running(){if(this.process||Date.now()<this.launchPendingUntil)return true;try{await exec('/usr/bin/pgrep',['-x','SpeedRunners']);return true;}catch{return false;}}
 async state(){const velo=await this.readJSON('installations/velo/install.json',null);const manifest=JSON.parse(await fs.readFile(path.join(this.port,'manifest.json'),'utf8'));return {gamePath:this.config.gamePath,gameFound:await validGame(this.config.gamePath),velo,needsPortUpdate:!!velo&&(velo.portVersion!==manifest.portVersion||velo.version!==manifest.version),running:await this.running(),session:this.session,busy:this.busy,error:this.error,root:this.root};}
 async chooseGame(p){if(this.busy||await this.running())throw new Error('Quit SpeedRunners before changing the game location.');if(!await validGame(p))throw new Error('Choose the SpeedRunners.app installed by Steam.');this.config.gamePath=p;await this.save();return this.state();}
 async install(zipPath=path.join(this.port,'Velo_2.4.40.zip')){
  if(this.busy)throw new Error('An installation is already in progress.');
  if(await this.running())throw new Error('Quit SpeedRunners before installing Velo.');
  if(!await validGame(this.config.gamePath))throw new Error('Locate your Steam copy of SpeedRunners first.');
  this.busy=true;this.error=null;let stage;
  try {
   const manifest=JSON.parse(await fs.readFile(path.join(this.port,'manifest.json'),'utf8'));
   this.notify('Checking Velo archive…');const bytes=await fs.readFile(zipPath);
   if(hash(bytes)!==manifest.archiveSha256)throw new Error('The included Velo archive failed its integrity check. Reinstall the launcher.');
   const zip=new Zip(bytes);validateEntries(zip.getEntries());
   const vanillaRes=path.join(this.config.gamePath,'Contents/Resources');
   const steamRecipe=JSON.parse(await fs.readFile(path.join(this.port,'steam-patch.json'),'utf8'));
   const steam=applyPatch(await fs.readFile(path.join(vanillaRes,'Steamworks.NET.dll')),steamRecipe);
   const veloRecipe=JSON.parse(await fs.readFile(path.join(this.port,'velo-patch.json'),'utf8'));
   const velo=applyPatch(zip.readFile('Velo.dll'),veloRecipe);
   stage=path.join(this.root,'installations',`.staging-${Date.now()}`);await fs.mkdir(stage,{recursive:true});
   this.notify('Preparing a separate game installation…');const appPath=path.join(stage,'SpeedRunners.app');
   // APFS clones copy-on-write; fallback works for other volumes. No source writes.
   await exec('/bin/cp',['-cR',this.config.gamePath,appPath]).catch(async()=>{await fs.rm(appPath,{recursive:true,force:true});await exec('/usr/bin/ditto',[this.config.gamePath,appPath]);});
   const res=path.join(appPath,'Contents/Resources');this.notify('Installing the Mac compatibility files…');
   for(const e of zip.getEntries()){
    if(e.isDirectory||['Steamworks.NET.dll','steam_api.dll','VeloUpdater2.exe'].includes(e.entryName))continue;
    const dest=path.join(res,e.entryName);await fs.mkdir(path.dirname(dest),{recursive:true});await fs.writeFile(dest,e.getData());
   }
   await fs.writeFile(path.join(res,'Velo.dll'),velo);await fs.writeFile(path.join(res,'Steamworks.NET.dll'),steam);
   for(const file of manifest.files)await fs.copyFile(path.join(this.port,file),path.join(res,file));
   // Preserve user settings, scripts, recordings, and TAS projects on reinstall.
   const previousData=path.join(this.veloApp,'Contents/Resources/Velo');
   if(await exists(previousData))await exec('/usr/bin/ditto',[previousData,path.join(res,'Velo')]);
   await fs.rm(path.join(res,'Velo/update'),{recursive:true,force:true});
   // The upstream native verifier is Windows-only; never auto-submit unsigned runs.
   const lb=path.join(res,'Velo/Leaderboard.json');
   let settings;
   try{settings=JSON.parse(await fs.readFile(lb,'utf8'));}catch{settings={Name:'Leaderboard',Settings:[]};}
   let general=settings.Settings.find(s=>s.Name==='general');
   if(!general){general={Name:'general',Value:[]};settings.Settings.push(general);}
   let submissions=general.Value.find(s=>s.Name==='disable submissions');
   if(submissions)submissions.Value=true;else general.Value.push({Name:'disable submissions',Value:true});
   await fs.writeFile(lb,JSON.stringify(settings,null,2));
   const record={version:'2.4.40',portVersion:manifest.portVersion,installedAt:new Date().toISOString(),sourceGame:this.config.gamePath,archiveSha256:manifest.archiveSha256};
   await fs.writeFile(path.join(stage,'install.json'),JSON.stringify(record,null,2));
   const target=path.dirname(this.veloApp),backup=target+'.previous';
   await fs.rm(backup,{recursive:true,force:true});
   if(await exists(target))await fs.rename(target,backup);
   try{await fs.rename(stage,target);}catch(e){if(await exists(backup))await fs.rename(backup,target);throw e;}
   await fs.rm(backup,{recursive:true,force:true});this.notify('Velo is ready.');
  }catch(e){this.error=e.message;throw e;}finally{if(stage)await fs.rm(stage,{recursive:true,force:true});this.busy=false;}
  return this.state();
 }
 async launch(mode){
  if(!['vanilla','velo'].includes(mode))throw new Error('Unknown launch mode.');
  if(this.busy||await this.running())throw new Error('SpeedRunners is already running. Quit it before switching modes.');
  this.error=null;
  if(mode==='vanilla'){
   if(!await validGame(this.config.gamePath))throw new Error('Locate SpeedRunners first.');
   await exec('/usr/bin/open',[`steam://rungameid/${APPID}`]);this.launchPendingUntil=Date.now()+15000;this.session='vanilla';return this.state();
  }
  if(!await exists(path.join(path.dirname(this.veloApp),'install.json')))throw new Error('Install Velo first.');
  // Steam must already be signed in; launching Steam alone is not proof of readiness.
  try{await exec('/usr/bin/pgrep',['-x','steam_osx']);}catch{await exec('/usr/bin/open',['-a','Steam']);throw new Error('Steam is opening. Wait until it is signed in, then launch Velo again.');}
  const res=path.join(this.veloApp,'Contents/Resources');await fs.mkdir(path.dirname(this.logPath),{recursive:true});
  const log=await fs.open(this.logPath,'w');
  try{
   const child=spawn(path.join(this.veloApp,'Contents/MacOS/SpeedRunners'),['opengl'],{cwd:res,env:{...process.env,SteamAppId:APPID,SteamGameId:APPID,FNA3D_FORCE_DRIVER:'OpenGL',DYLD_LIBRARY_PATH:`${res}:${path.join(this.veloApp,'Contents/MacOS/osx')}`},stdio:['ignore',log.fd,log.fd],detached:true});
   this.process=child;this.session='velo';
   child.on('error',e=>{this.error=e.message;this.process=null;this.notify('Launch failed.');});
   child.on('exit',code=>{this.process=null;this.session=null;if(code)this.error=`Velo exited with code ${code}. Open the game log for details.`;this.notify(code?'Velo stopped unexpectedly.':'Game closed.');});
   child.unref();
  }finally{await log.close();}
  return this.state();
 }
}
module.exports={Library,discoverGame,validGame,exists};
