'use strict';
const {app,BrowserWindow,ipcMain,dialog,shell,Menu}=require('electron');
const path=require('node:path');
const {Library}=require('./library');
app.setName('SpeedRunners Mods');
let win,library;
if(!app.requestSingleInstanceLock())app.quit();
app.on('second-instance',()=>{win?.show();win?.focus();});
app.whenReady().then(async()=>{
 if(!app.isPackaged)app.dock?.setIcon(path.join(__dirname,'../../resources/app-icon.png'));
 const root=app.getPath('userData');
 library=new Library(root,app.isPackaged?path.join(process.resourcesPath,'port'):path.join(__dirname,'../../resources/port'),message=>win?.webContents.send('progress',message));
 await library.init();
 const handle=(channel,fn)=>ipcMain.handle(channel,async(event,...args)=>{
  if(event.sender!==win.webContents||event.senderFrame!==win.webContents.mainFrame)throw new Error('Invalid request');
  try{return {ok:true,value:await fn(...args)};}catch(e){return {ok:false,error:e.message};}
 });
 handle('state',async()=>({...await library.state(),appVersion:app.getVersion(),packaged:app.isPackaged}));
 handle('quit',()=>app.quit());
 handle('art',()=>require('./art').loadArt(library.config.gamePath));
 handle('choose-game',async()=>{const r=await dialog.showOpenDialog(win,{title:'Locate SpeedRunners',properties:['openFile','openDirectory'],defaultPath:library.config.gamePath,filters:[{name:'Mac application',extensions:['app']}]});return r.canceled?null:library.chooseGame(r.filePaths[0]);});
 handle('install',()=>library.install());
 handle('launch',mode=>library.launch(mode));
 handle('reveal',async kind=>{
  const targets={game:library.config.gamePath,velo:path.join(library.veloApp,'Contents/Resources/Velo'),log:library.logPath};
  if(!Object.hasOwn(targets,kind)||!targets[kind])throw new Error('This location is not available yet.');
  shell.showItemInFolder(targets[kind]);
 });
 handle('check-update',()=>require('./updater').check(app.getVersion()));
 handle('apply-update',async()=>{if(library.busy||await library.running())throw new Error('Quit the game before updating the launcher.');return require('./updater').install(app, message=>win.webContents.send('progress',message));});
 handle('open-project',()=>shell.openExternal('https://github.com/bentrd/SpeedRunnersMods'));
 function createWindow(){
  win=new BrowserWindow({width:900,height:555,minWidth:700,minHeight:450,title:'SpeedRunners Mods',titleBarStyle:'hiddenInset',trafficLightPosition:{x:12,y:10},backgroundColor:'#2b334b',webPreferences:{preload:path.join(__dirname,'preload.js'),contextIsolation:true,nodeIntegration:false,sandbox:true}});
  win.webContents.setWindowOpenHandler(()=>({action:'deny'}));win.webContents.on('will-navigate',e=>e.preventDefault());
  win.webContents.session.setPermissionRequestHandler((_w,_p,cb)=>cb(false));
  win.loadFile(path.join(__dirname,'../renderer/index.html'));
 }
 Menu.setApplicationMenu(Menu.buildFromTemplate([{label:app.name,submenu:[{role:'about'},{type:'separator'},{role:'hide'},{role:'hideOthers'},{role:'unhide'},{type:'separator'},{role:'quit'}]},{label:'Edit',submenu:[{role:'undo'},{role:'redo'},{type:'separator'},{role:'cut'},{role:'copy'},{role:'paste'},{role:'selectAll'}]},{label:'Window',submenu:[{role:'minimize'},{role:'zoom'},{role:'front'}]}]));
 createWindow();app.on('activate',()=>{if(BrowserWindow.getAllWindows().length===0)createWindow();});
});
app.on('window-all-closed',()=>{if(process.platform!=='darwin')app.quit();});
