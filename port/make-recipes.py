#!/usr/bin/env python3
"""Create checksum-locked binary deltas; game binaries never ship in the app."""
from pathlib import Path
import hashlib,json,base64,sys,shutil
root=Path(__file__).resolve().parent.parent;work=root/'.work';out=root/'resources/port';game=Path(sys.argv[1]);zipfile=Path(sys.argv[2])
hash=lambda b:hashlib.sha256(b).hexdigest()
a=(game/'Contents/Resources/Steamworks.NET.dll').read_bytes();b=(work/'Steamworks.NET.dll').read_bytes()
size=32;index={a[i:i+size]:i for i in range(0,len(a)-size+1)};ops=[];pos=0;literal=bytearray()
def flush():
 if literal:ops.append({'data':base64.b64encode(literal).decode()});literal.clear()
while pos<len(b):
 match=index.get(b[pos:pos+size])
 if match is None:literal.append(b[pos]);pos+=1;continue
 flush();length=size
 while match+length<len(a) and pos+length<len(b) and a[match+length]==b[pos+length]:length+=1
 ops.append({'copy':[match,length]});pos+=length
flush()
(out/'steam-patch.json').write_text(json.dumps(dict(sourceSha256=hash(a),outputSha256=hash(b),blocks=ops)))
shutil.copy(work/'Velo.dll.patches.json',out/'velo-patch.json')
shutil.copy(zipfile,out/'Velo_2.4.40.zip') if zipfile.resolve()!=(out/'Velo_2.4.40.zip').resolve() else None
(out/'manifest.json').write_text(json.dumps(dict(version='2.4.40',portVersion=1,archiveSha256=hash(zipfile.read_bytes()),files=['libVelo_UI.dylib','Velo.dll.config','System.Windows.Forms.dll','liblua54.dylib','KeraLua.dll.config']),indent=2))
