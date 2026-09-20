using dnlib.DotNet;
using dnlib.DotNet.Emit;
var mod = ModuleDefMD.Load(args[0]);
var stats = mod.Types.First(t => t.FullName == "Steamworks.SteamUserStats");
if (!stats.Methods.Any(m => m.Name == "RequestCurrentStats" && m.Parameters.Count == 0)) {
 var m = new MethodDefUser("RequestCurrentStats", MethodSig.CreateStatic(mod.CorLibTypes.Boolean), MethodImplAttributes.IL | MethodImplAttributes.Managed, MethodAttributes.Public | MethodAttributes.Static | MethodAttributes.HideBySig);
 m.Body=new CilBody(); m.Body.Instructions.Add(OpCodes.Ldc_I4_1.ToInstruction());m.Body.Instructions.Add(OpCodes.Ret.ToInstruction());stats.Methods.Add(m);
}
var user=mod.Types.First(t=>t.FullName=="Steamworks.SteamUser");
if(!user.Methods.Any(m=>m.Name=="GetAuthSessionTicket"&&m.Parameters.Count==3)){
 var newer=user.Methods.Single(m=>m.Name=="GetAuthSessionTicket"&&m.Parameters.Count==4);
 var m=new MethodDefUser("GetAuthSessionTicket",MethodSig.CreateStatic(newer.ReturnType,new SZArraySig(mod.CorLibTypes.Byte),mod.CorLibTypes.Int32,new ByRefSig(mod.CorLibTypes.UInt32)),MethodImplAttributes.IL|MethodImplAttributes.Managed,MethodAttributes.Public|MethodAttributes.Static|MethodAttributes.HideBySig);
 var ident=mod.Types.First(t=>t.FullName=="Steamworks.SteamNetworkingIdentity").ToTypeSig();
 m.Body=new CilBody{InitLocals=true,MaxStack=4};var tmp=new Local(ident);m.Body.Variables.Add(tmp);
 foreach(var op in new[]{OpCodes.Ldarg_0,OpCodes.Ldarg_1,OpCodes.Ldarg_2})m.Body.Instructions.Add(op.ToInstruction());
 m.Body.Instructions.Add(OpCodes.Ldloca_S.ToInstruction(tmp));m.Body.Instructions.Add(OpCodes.Call.ToInstruction(newer));m.Body.Instructions.Add(OpCodes.Ret.ToInstruction());user.Methods.Add(m);
}
mod.Write(args[1]);Console.WriteLine("Steam authentication compatibility methods installed");
