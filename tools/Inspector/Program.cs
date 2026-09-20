using Mono.Cecil;
using Mono.Cecil.Cil;
using System.Text.Json;
var path = args[0];
using var module = ModuleDefinition.ReadModule(path);
IEnumerable<TypeDefinition> All(IEnumerable<TypeDefinition> ts) { foreach(var t in ts) { yield return t; foreach(var n in All(t.NestedTypes)) yield return n; } }
var types=All(module.Types).ToArray();
var methods=types.SelectMany(t=>t.Methods).Where(m=>m.HasBody).Select(m=>new {
 type=m.DeclaringType.FullName,name=m.Name,fullName=m.FullName,token=m.MetadataToken.ToInt32(),rva=m.RVA,codeSize=m.Body.CodeSize,maxStack=m.Body.MaxStackSize,
 instructions=m.Body.Instructions.Select(i=>new {offset=i.Offset,op=i.OpCode.Name,size=i.GetSize(),operand=i.Operand?.ToString(),token=i.Operand is IMetadataTokenProvider p?p.MetadataToken.ToInt32():0})
});
Console.WriteLine(JsonSerializer.Serialize(new {methods,imports=types.SelectMany(t=>t.Methods).Where(m=>m.HasPInvokeInfo).Select(m=>new {name=m.Name,entry=m.PInvokeInfo.EntryPoint,library=m.PInvokeInfo.Module.Name}),fields=types.SelectMany(t=>t.Fields).Select(f=>new {name=f.FullName,token=f.MetadataToken.ToInt32()})}));
