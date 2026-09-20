#!/usr/bin/env python3
"""Adapt the pinned upstream Velo_UI source. Never alters the Steam installation."""
from pathlib import Path
import re,sys
p=Path(sys.argv[1])
s=(p/'Global.hpp').read_text()
a=s.index('#include <Windows.h>'); b=s.index('enum GraphicsDeviceType')
s=s[:a]+'''#include <array>
#include <cstring>
#include <cstdio>
#include <cstdlib>
#include <algorithm>
#include <utility>
#include <cfloat>
#include <imgui.h>
#include <imgui_internal.h>
#include <imgui_impl_opengl3.h>
#include <imgui_impl_sdl2.h>
#include <SDL.h>
#include "MacKeys.hpp"
constexpr int MAX_PATH = 4096;
inline size_t strnlen_s(const char* s,size_t n){return strnlen(s,n);}
inline void _itoa_s(int v,char* s,size_t n,int){snprintf(s,n,"%d",v);}
inline void strcpy_s(char* dst, size_t n, const char* src) { if(n) snprintf(dst,n,"%s",src); }
''' + s[b:]
s=re.sub(r'\tinline (HWND|HHOOK|HWINEVENTHOOK|ID3D11Device\*|ID3D11DeviceContext\*|IDXGISwapChain\*)[^;]+;', '', s)
s=s.replace('\\\\','/')
(p/'Global.hpp').write_text(s)
s=(p/'Keys.hpp').read_text()
a=s.index('\t\tstd::array<wchar_t');b=s.index('\n\t}',a)
s=s[:a]+'''        if ((keyCode >= 'A' && keyCode <= 'Z') || (keyCode >= '0' && keyCode <= '9')) name = std::string(1, (char)keyCode);
        else { char hex[8]; snprintf(hex,sizeof(hex),"0x%02X", keyCode); name=hex; }'''+s[b:]
s=re.sub(r'GetAsyncKeyState\(([^)]+)\) & 0x8000',r'Global::keysDown[\1]',s)
(p/'Keys.hpp').write_text(s)
s=(p/'App.hpp').read_text().replace('App app;', 'App& app = *new App();')
(p/'App.hpp').write_text(s)
# Standard Win32 virtual-key values are the managed mod's ABI, not OS hooks.
names={'LBUTTON':1,'RBUTTON':2,'MBUTTON':4,'XBUTTON1':5,'XBUTTON2':6,'BACK':8,'TAB':9,'CLEAR':12,'RETURN':13,'SHIFT':16,'CONTROL':17,'MENU':18,'PAUSE':19,'CAPITAL':20,'ESCAPE':27,'SPACE':32,'PRIOR':33,'NEXT':34,'END':35,'HOME':36,'LEFT':37,'UP':38,'RIGHT':39,'DOWN':40,'SELECT':41,'PRINT':42,'EXECUTE':43,'SNAPSHOT':44,'INSERT':45,'DELETE':46,'HELP':47,'LWIN':91,'RWIN':92,'SLEEP':95,'MULTIPLY':106,'ADD':107,'SEPARATOR':108,'SUBTRACT':109,'DECIMAL':110,'DIVIDE':111,'NUMLOCK':144,'SCROLL':145,'LSHIFT':160,'RSHIFT':161,'LCONTROL':162,'RCONTROL':163,'LMENU':164,'RMENU':165}
names.update({f'NUMPAD{i}':96+i for i in range(10)});names.update({f'F{i}':111+i for i in range(1,25)})
(p/'MacKeys.hpp').write_text('#pragma once\n'+'\n'.join(f'constexpr int VK_{k} = {v};' for k,v in names.items()))

s=(p/'Setting.hpp').read_text()
s=re.sub(r'(json\["[RGBA]"\]) / 255.0f',r'\1.get<float>() / 255.0f',s)
(p/'Setting.hpp').write_text(s)
s=(p/'Module.hpp').read_text().replace('BasicSettingsModule(json["Name"])','BasicSettingsModule(json["Name"].get<std::string>())')
(p/'Module.hpp').write_text(s)
s=(p/'Setting.hpp').read_text().replace(r'\xe800',r'\ue800')
(p/'Setting.hpp').write_text(s)
s=(p/'Module.hpp').read_text().replace('BasicSettingsModule{ data["Name"] }','BasicSettingsModule{ data["Name"].get<std::string>() }')
(p/'Module.hpp').write_text(s)
