const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs/promises'),path=require('node:path'),os=require('node:os');
const {Library}=require('../src/main/library');const {hash}=require('../src/main/patches');
test('bundled Velo installs and reinstalls while preserving data and the Steam game',{skip:!process.env.SPEEDRUNNERS_TEST_GAME},async()=>{
 const root=await fs.mkdtemp(path.join(os.tmpdir(),'sr-install-'));const game=process.env.SPEEDRUNNERS_TEST_GAME,port=path.join(__dirname,'../resources/port');
 const files=['SpeedRunners.exe','Steamworks.NET.dll','FNA.dll'];const before=await Promise.all(files.map(f=>fs.readFile(path.join(game,'Contents/Resources',f)).then(hash)));
 try{const lib=new Library(root,port);await lib.init();lib.config.gamePath=game;lib.running=async()=>false;await lib.install();const res=path.join(lib.veloApp,'Contents/Resources');
  const recipe=JSON.parse(await fs.readFile(path.join(port,'velo-patch.json'),'utf8'));assert.equal(hash(await fs.readFile(path.join(res,'Velo.dll'))),recipe.outputSha256);
  await fs.writeFile(path.join(res,'Velo/preserved-test.txt'),'keep');await lib.install();assert.equal(await fs.readFile(path.join(res,'Velo/preserved-test.txt'),'utf8'),'keep');assert.equal((await lib.state()).needsPortUpdate,false);
  const lb=JSON.parse(await fs.readFile(path.join(res,'Velo/Leaderboard.json'),'utf8'));assert.equal(lb.Settings.find(s=>s.Name==='general').Value.find(s=>s.Name==='disable submissions').Value,true);
  assert.deepEqual(await Promise.all(files.map(f=>fs.readFile(path.join(game,'Contents/Resources',f)).then(hash))),before);
 }finally{await fs.rm(root,{recursive:true,force:true});}
});
