#include "App.hpp"
#include <sys/time.h>
#include <fstream>
#include <OpenGL/gl.h>
#include <OpenGL/glext.h>
struct GLStateGuard {
 GLint active,program,fb,rb;
 GLStateGuard(){glGetIntegerv(GL_ACTIVE_TEXTURE,&active);glGetIntegerv(GL_CURRENT_PROGRAM,&program);glGetIntegerv(GL_FRAMEBUFFER_BINDING_EXT,&fb);glGetIntegerv(GL_RENDERBUFFER_BINDING_EXT,&rb);glPushAttrib(GL_ALL_ATTRIB_BITS);glPushClientAttrib(GL_CLIENT_ALL_ATTRIB_BITS);}
 ~GLStateGuard(){glPopClientAttrib();glPopAttrib();glUseProgram(program);glActiveTexture(active);glBindFramebufferEXT(GL_FRAMEBUFFER_EXT,fb);glBindRenderbufferEXT(GL_RENDERBUFFER_EXT,rb);}
};
static void logMessage(const char* message) { FILE* f=fopen("/tmp/sr_velo_ui.log","a"); if(f){fprintf(f,"%s\n",message);fclose(f);} }
static int vk(SDL_Keycode k) {
 if(k>=SDLK_a && k<=SDLK_z) return 'A'+k-SDLK_a;
 if(k>=SDLK_0 && k<=SDLK_9) return k;
 if(k>=SDLK_F1 && k<=SDLK_F12)return VK_F1+k-SDLK_F1;
 switch(k) {
#define K(s,v) case SDLK_##s:return VK_##v;
 K(BACKSPACE,BACK) K(TAB,TAB) K(RETURN,RETURN) K(ESCAPE,ESCAPE) K(SPACE,SPACE)
 K(LEFT,LEFT) K(RIGHT,RIGHT) K(UP,UP) K(DOWN,DOWN) K(LSHIFT,LSHIFT) K(RSHIFT,RSHIFT)
 K(LCTRL,LCONTROL) K(RCTRL,RCONTROL) K(LALT,LMENU) K(RALT,RMENU) K(DELETE,DELETE)
 K(HOME,HOME) K(END,END) K(PAGEUP,PRIOR) K(PAGEDOWN,NEXT) K(INSERT,INSERT)
#undef K
 default: return 0;
 }
}
static void syncKeys() {
 Global::keysDown.fill(false);
 if(!SDL_GetKeyboardFocus())return;
 int n=0; const Uint8* keys=SDL_GetKeyboardState(&n);
 for(int i=0;i<n;i++)if(keys[i]){int v=vk(SDL_GetKeyFromScancode((SDL_Scancode)i));if(v>0&&v<256)Global::keysDown[v]=true;}
 Global::keysDown[VK_SHIFT]=Global::keysDown[VK_LSHIFT]||Global::keysDown[VK_RSHIFT];
 Global::keysDown[VK_CONTROL]=Global::keysDown[VK_LCONTROL]||Global::keysDown[VK_RCONTROL];
 Global::keysDown[VK_MENU]=Global::keysDown[VK_LMENU]||Global::keysDown[VK_RMENU];
 auto mouse=SDL_GetMouseState(nullptr,nullptr);
 Global::keysDown[VK_LBUTTON]=mouse&SDL_BUTTON_LMASK; Global::keysDown[VK_RBUTTON]=mouse&SDL_BUTTON_RMASK;
 Global::keysDown[VK_MBUTTON]=mouse&SDL_BUTTON_MMASK;
}
extern "C" {
void Test() {}
void Memcpy(void* dst,void* src,size_t n){memcpy(dst,src,n);}
void SetGameHwnd(void*){}
int32_t IsGameFocused(){return SDL_GetKeyboardFocus()!=nullptr;}
void InitializeImGui_d3d11(void*){logMessage("D3D11 is not supported on macOS");}
void InitializeImGui_opengl(){
 if(ImGui::GetCurrentContext())return;
 GLStateGuard guard; Global::graphicsDeviceType=gdtOPENGL3; ImGui::CreateContext();
 ImGui_ImplSDL2_InitForOpenGL(SDL_GL_GetCurrentWindow(),SDL_GL_GetCurrentContext());
 ImGui_ImplOpenGL3_Init("#version 120"); Global::app.Init();
 ImGui::GetIO().IniFilename=Global::iniPath; logMessage("InitializeImGui_opengl done");
}
void UnfocusAll(){if(auto* ctx=ImGui::GetCurrentContext())for(auto* w:ctx->Windows)w->Active=false;}
void RenderImGui(float x,float y,float w,float h){
 if(!ImGui::GetCurrentContext())return;
 GLStateGuard guard; Global::windowSize={w,h}; ImGui_ImplOpenGL3_NewFrame(); ImGui_ImplSDL2_NewFrame();
 ImGui::GetIO().AddMousePosEvent(x,y); ImGui::GetIO().DisplaySize={w,h}; ImGui::GetIO().DisplayFramebufferScale={1,1};
 ImGui::NewFrame(); Global::app.RenderImGui(); ImGui::Render(); ImGui_ImplOpenGL3_RenderDrawData(ImGui::GetDrawData());
 static bool logged=false;if(!logged){logMessage("RenderImGui done");logged=true;}
}
void ShutdownImGui(){if(!ImGui::GetCurrentContext())return;ImGui_ImplOpenGL3_Shutdown();ImGui_ImplSDL2_Shutdown();ImGui::DestroyContext();Global::graphicsDeviceType=gdtNONE;}
void ProcessEvent(SDL_Event* e){if(e->type==SDL_WINDOWEVENT&&e->window.event==SDL_WINDOWEVENT_MOVED)Global::windowDragged=true;if(ImGui::GetCurrentContext())ImGui_ImplSDL2_ProcessEvent(e);}
void LoadFromJson(const char* s){try{Global::app.LoadFromJson(nlohmann::json::parse(s));logMessage("LoadFromJson done");}catch(const std::exception& e){logMessage(e.what());}}
void UpdateFromJson(const char* s){try{Global::app.UpdateFromJson(nlohmann::json::parse(s));}catch(const std::exception& e){logMessage(e.what());}}
char* GetUpdatesAsJson(){try{auto s=Global::app.ChangesAsJsonString();return s.empty()?nullptr:strdup(s.c_str());}catch(...){return nullptr;}}
int32_t IsAnyFocused(){return ImGui::GetCurrentContext()&&ImGui::IsAnyItemActive();}
int32_t WindowDragged(){return std::exchange(Global::windowDragged,false);}
void GetGamePadButtonState(char* p){for(size_t i=0;i<Global::gamePadButtonsDown.size();i++)Global::gamePadButtonsDown[i]=p[i]!=0;}
void InitLLKeyboardHook(){syncKeys();} void InitLLMouseHook(){syncKeys();} void InitWndProcHook(){} void RemoveHooks(){}
void PollLLHooks(){syncKeys();} bool IsKeyDown(uint8_t k){return Global::keysDown[k];}
int GetPressedKey(){syncKeys();return getPressedKey(0);} void ClearKeys(){Global::keysDown.fill(false);}
char* KeyToString(uint16_t k){return strdup(keyCodeToString(k).c_str());}
void SetMaximumTimerResolution(){} void ResetTimerResolution(){} int32_t IsTimerResolutionSet(){return 0;}
void StartAudioCapture(int){logMessage("Audio loopback capture is unavailable on macOS");}
void StopAudioCapture(const char*){}
int RtlGetVersion(void* p){uint32_t* v=(uint32_t*)p;v[1]=10;v[2]=0;return 0;}
void GetSystemTimeAsFileTime(int64_t* result){timeval tv;gettimeofday(&tv,nullptr);*result=(int64_t(tv.tv_sec)+11644473600LL)*10000000LL+tv.tv_usec*10;}
void GetSystemTimePreciseAsFileTime(int64_t* result){GetSystemTimeAsFileTime(result);}
}
