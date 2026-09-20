'use strict';
const $=s=>document.querySelector(s);
let state,working=false,noticeTimer,lastError,selectedMode=null;
function notice(message,error=false){clearTimeout(noticeTimer);for(const id of ['notice','settings-notice']){$('#'+id).textContent=message;$('#'+id).classList.toggle('error',error);}if(message&&!working&&!error)noticeTimer=setTimeout(()=>notice(''),6500);}
async function refresh(){try{state=await window.launcher.state();render();if(state.error&&state.error!==lastError)notice(state.error,true);lastError=state.error;}catch(e){notice(e.message,true);}}
function render(){
 if(!state)return;const installed=!!state.velo,busy=working||state.busy;
 $('#game-path').textContent=state.gamePath||'Choose your Steam copy of SpeedRunners.app.';
 $('#app-version').textContent=state.appVersion;
 document.querySelectorAll('[data-launch]').forEach(b=>{const mode=b.dataset.launch;b.disabled=busy||state.running;b.textContent=busy&&selectedMode===mode?'Preparing…':state.running&&state.session===mode?'Running…':!state.gameFound?'Locate SpeedRunners':mode==='velo'?'Launch Velo':'Launch Vanilla';});
 $('#install').disabled=busy||state.running;$('#install').hidden=!installed;
 $('#open-velo').disabled=!installed;$('#open-game').disabled=!state.gameFound;$('#choose-game').disabled=busy||state.running;

}
async function action(fn){if(working)return;working=true;render();try{await fn();}catch(e){notice(e.message,true);}finally{working=false;await refresh();}}
window.launcher.onProgress(m=>notice(m));
$('#quit').onclick=()=>window.launcher.quit();
$('#settings').onclick=()=>$('#preferences').showModal();$('#close-settings').onclick=()=>$('#preferences').close();
const menuItems=[...document.querySelectorAll('.menu-item')];
function highlight(button){menuItems.forEach(b=>b.classList.toggle('selected',b===button));}
menuItems.forEach((b,i)=>{b.onpointerenter=()=>highlight(b);b.onfocus=()=>highlight(b);b.onkeydown=e=>{if(['ArrowUp','ArrowDown'].includes(e.key)){e.preventDefault();const available=menuItems.filter(n=>!n.disabled);available[(available.indexOf(b)+(e.key==='ArrowDown'?1:-1)+available.length)%available.length]?.focus();}};});
document.querySelectorAll('[data-launch]').forEach(b=>b.onclick=()=>action(async()=>{selectedMode=b.dataset.launch;render();if(!state.gameFound){await window.launcher.chooseGame();await loadArt();return;}if(selectedMode==='velo'&&(!state.velo||state.needsPortUpdate))await window.launcher.install();await window.launcher.launch(selectedMode);notice('Opening SpeedRunners…');}));
$('#install').onclick=()=>action(()=>window.launcher.install());$('#choose-game').onclick=()=>action(async()=>{await window.launcher.chooseGame();await loadArt();});
for(const [id,kind] of [['open-velo','velo'],['open-game','game'],['open-log','log']])$('#'+id).onclick=()=>action(()=>window.launcher.reveal(kind));
$('#project').onclick=()=>action(()=>window.launcher.openProject());
async function checkUpdate(){const r=await window.launcher.checkUpdate();$('#update-status').hidden=false;$('#update-status').textContent=r.available?`Version ${r.version} is available.`:'You’re up to date.';$('#apply-update').hidden=!r.available;$('#settings').textContent=r.available?'Settings •':'Settings';}
$('#check-update').onclick=()=>action(checkUpdate);
checkUpdate().catch(()=>{});
$('#apply-update').onclick=()=>action(()=>window.launcher.applyUpdate());
refresh();setInterval(refresh,2500);
async function loadArt(){try{const art=await window.launcher.art();for(const [key,id] of [['sky','sky-art'],['city','city-art'],['logo','game-logo']]){if(art[key])$('#'+id).src=art[key];else $('#'+id).hidden=true;}if(art.font){const font=await new FontFace('SpeedRunners Menu',`url(${art.font})`,{weight:'900'}).load();document.fonts.add(font);}}catch{}}
loadArt();
