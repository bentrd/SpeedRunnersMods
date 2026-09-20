#!/usr/bin/env python3
"""Same-size, metadata-directed macOS patches. Cecil is strictly read-only.
Input is a pristine Velo DLL plus the Inspector JSON for that exact DLL.
The patch report records every changed byte range for review and reproduction.
"""
import json,struct,sys,hashlib
from pathlib import Path

def patch(source,metadata,destination):
 original=Path(source).read_bytes(); data=bytearray(original); meta=json.loads(Path(metadata).read_text()); changes=[]
 def u16(o):return struct.unpack_from('<H',data,o)[0]
 def u32(o):return struct.unpack_from('<I',data,o)[0]
 pe=u32(0x3c); sec=pe+24+u16(pe+20)
 sections=[struct.unpack_from('<IIII',data,sec+i*40+8) for i in range(u16(pe+6))]
 def offset(rva):
  for size,start,rawsize,raw in sections:
   if start<=rva<start+max(size,rawsize):return raw+rva-start
  raise ValueError(f'Unmapped RVA {rva:x}')
 def code(m):
  p=offset(m['rva']);return p+(1 if data[p]&3==2 else (u16(p)>>12)*4)
 def edit(pos,old,new,label):
  assert len(old)==len(new),label
  assert bytes(data[pos:pos+len(old)])==old,f'{label}: unexpected bytes at {pos:x}'
  if old!=new:data[pos:pos+len(old)]=new;changes.append(dict(offset=pos,before=old.hex(),after=new.hex(),reason=label))
 def method(t,n):
  ms=[m for m in meta['methods'] if m['type']==t and m['name']==n];assert len(ms)==1,(t,n);return ms[0]
 def replace_body(m,new,label):
  p=code(m);n=m['codeSize'];assert len(new)<=n
  # A branch to the final return avoids Mono validating unreachable invalid tails.
  edit(p,bytes(data[p:p+n]),new+b'\x00'*(n-len(new)-1)+b'\x2a' if len(new)<n else new,label)
 # Walk #US, not arbitrary byte patterns; preserve offsets and heap lengths.
 opt=pe+24; directories=opt+(112 if u16(opt)==0x20b else 96)
 cli=offset(u32(directories+14*8)); md=offset(u32(cli+8)); p=md+16+u32(md+12);p=(p+3)&~3
 count=u16(p+2);p+=4; us=None
 for _ in range(count):
  start,size=u32(p),u32(p+4);end=data.index(0,p+8);name=data[p+8:end].decode();p=(end+4)&~3
  if name=='#US':us=(md+start,size)
 assert us
 p=us[0]+1;end=us[0]+us[1]
 while p<end:
  first=data[p];p+=1
  if first&0x80==0:n=first
  elif first&0xc0==0x80:n=((first&0x3f)<<8)|data[p];p+=1
  else:n=((first&0x1f)<<24)|(data[p]<<16)|(data[p+1]<<8)|data[p+2];p+=3
  if not n:continue
  raw=bytes(data[p:p+n-1]);s=raw.decode('utf-16le');new=s
  if '\\' in s and (s=='\\' or s.startswith(('Velo\\','UI\\Font\\','CEngine\\Debug\\','Content\\','\\consol','\\onStart.','\\VeloLib.','\\audio.wav','\\backup','\\blist','\\_temp','Levels\\')) or (' ' in s and len(s)>50 and '{' not in s and any(w in s.lower() for w in ['the ','you ','this ','for ','your ']))):new=s.replace('\\','/')
  if new!=s:edit(p,raw,new.encode('utf-16le'),'Unix path: '+s[:65])
  p+=n
 m=method('Velo.SettingsUI','InitImGui');edit(code(m),b'\x16',b'\x17','Default OpenGL renderer')
 m=method('Velo.JsonString','ToString');ins=m['instructions'];assert [i['op'] for i in ins[3:6]]==['ldstr','ldstr','callvirt']
 p=code(m)+11;edit(p,bytes(data[p:p+15]),bytes(15),'Remove backslash escape replacement whose shared separator was normalized')
 m=method('Velo.ConsoleFont','.cctor')
 for i in m['instructions']:
  if i['op'] in ['ldc.i4.1','ldc.i4.2','ldc.i4.3']:p=code(m)+i['offset'];edit(p,bytes([data[p]]),b'\x16','Use available fallback font face')
 m=method('Velo.Storage','Load')
 for i in m['instructions']:
  if i['op']=='ldc.i4.s' and i['operand']=='92':edit(code(m)+i['offset'],b'\x1f\x5c',b'\x1f\x2f','Load settings using Unix separator')
 m=method('Velo.Storage','OnPreUpdate')
 for i in m['instructions']:
  if i['op']=='ldc.r8' and i['operand']=='1':edit(code(m)+i['offset']+1,struct.pack('<d',1),struct.pack('<d',0),'Flush settings next frame')
 m=method('Velo.Velo','on_exit')
 for i in m['instructions']:
  if 'Scripts::StopAll' in (i['operand'] or ''):
   p=code(m)+i['offset'];edit(p,bytes(data[p:p+5]),bytes(5),'Avoid collection mutation during shutdown')
 m=method('Velo.AutoUpdate','Check');p=code(m);edit(p,bytes(data[p:p+m['codeSize']]),b'\x2a'*m['codeSize'],'Updates are installed by the macOS launcher; never run Windows updater')
 m=method('Velo.Velo','check_vc_redist');p=code(m);edit(p,bytes(data[p:p+5]),bytes(5),'No Visual C++ redistributable check on macOS')
 # Compatibility only: upstream online/poisoned/verification guards are unchanged.
 assert len(data)==len(original)
 Path(destination).write_bytes(data)
 report=dict(sourceSha256=hashlib.sha256(original).hexdigest(),outputSha256=hashlib.sha256(data).hexdigest(),size=len(data),changes=changes)
 Path(str(destination)+'.patches.json').write_text(json.dumps(report,indent=2))
 print(f'Patched {len(changes)} ranges; preserved {len(data)} bytes')
if __name__=='__main__':patch(*sys.argv[1:])
