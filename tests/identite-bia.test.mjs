import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import ts from 'typescript';
const compile=s=>ts.transpileModule(s,{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText;
function load(path,deps={}){const m={exports:{}};new Function('require','module','exports',compile(fs.readFileSync(path,'utf8')))(n=>{assert(n in deps,n);return deps[n];},m,m.exports);return m.exports;}
const identite=load('lib/identite-bia.ts',{'./normaliser':load('lib/normaliser.ts'),'./repertoire-textes':load('lib/repertoire-textes.ts')});
test('name questions receive the existing Bia wording in the question language',()=>{
 for(const q of ["Comment tu t'appelles ?",'Comment t’appelles-tu ?','Bonjour Bia, quel est ton nom ?','Rara, comment tu t’appelles ?','Comment vous appelez-vous ?'])assert.equal(identite.reponseIdentite(q).reply,"Je m'appelle BIA.");
 for(const q of ['Noo tudd ?','Naka la tudd ?','Sa tur mooy lan ?'])assert.equal(identite.reponseIdentite(q).reply,'Sama tur mooy BIA.');
 for(const q of ['Lis la leçon : comment tu t’appelles ?','Comment tu t’appelles et que peux-tu faire ?','Mon amie s’appelle Rara','Comment tu appelles ma mère ?'])assert.equal(identite.reponseIdentite(q),null);
});
test('real chat handles both saved portraits and an old Rara answer before any lesson or model',async()=>{
 const source=fs.readFileSync('app/api/chat/route.ts','utf8'),ast=ts.createSourceFile('route.ts',source,ts.ScriptTarget.Latest,true);let fn;
 ast.forEachChild(n=>{if(ts.isFunctionDeclaration(n)&&n.name?.text==='repondre')fn=n.getText(ast);});
 const env={...identite,noterPanne:(...x)=>{throw Error(JSON.stringify(x));},verifierCode:()=>({ok:true,maitre:true}),noterPassage(){},parleDeMemoire:()=>false,executerLecon:async()=>null,correctionDuMaitre:()=>null,corrigerDevoir:async()=>{throw Error("Unexpected write");},corrigerDevoirConversation:async()=>null,lireLOrdre:()=>null,repetitionExacteDuMaitre:()=>null};
 const run=new Function('env',`with(env){${compile(fn)}return repondre;}`)(env);
 for(const persona of ['rara','bia',undefined]){
  const r=await run({message:"Comment tu t'appelles ?",persona,history:[{role:'bia',text:"Je m'appelle Rara."}]},'test-code',null);
  assert.equal(r.corps.reply,"Je m'appelle BIA.");assert.equal(r.corps.identite,true);
 }
});

test('compact model prompt keeps Bia and the requested warm personality despite a legacy persona',()=>{
 const api=load('lib/conversation-groq.ts',{'./comprehension-conversation':load('lib/comprehension-conversation.ts')});
 const messages=api.messagesConversation({question:'Qui es-tu ?',history:[{role:'assistant',content:"Je m’appelle Rara."}],nom:'Rara'});
 assert(messages[0].content.startsWith('Tu es BIA,'));
 for(const mot of ['joviale','complice','amicale','joyeuse','séduisante'])assert(messages[0].content.includes(mot));
 assert(messages[0].content.includes('une ancienne réponse'));
});
