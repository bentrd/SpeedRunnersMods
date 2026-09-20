'use strict';
const {contextBridge,ipcRenderer}=require('electron');
const invoke=async(name,...args)=>{const r=await ipcRenderer.invoke(name,...args);if(!r.ok)throw new Error(r.error);return r.value;};
contextBridge.exposeInMainWorld('launcher',{
 quit:()=>invoke('quit'),art:()=>invoke('art'),state:()=>invoke('state'),chooseGame:()=>invoke('choose-game'),install:()=>invoke('install'),launch:mode=>invoke('launch',mode),reveal:kind=>invoke('reveal',kind),checkUpdate:()=>invoke('check-update'),applyUpdate:()=>invoke('apply-update'),openProject:()=>invoke('open-project'),
 onProgress:fn=>{const cb=(_event,message)=>fn(message);ipcRenderer.on('progress',cb);return ()=>ipcRenderer.removeListener('progress',cb);}
});
