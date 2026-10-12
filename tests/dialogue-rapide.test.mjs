import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';import ts from 'typescript';import crypto from 'node:crypto';
function load(file,deps={},env={}){const m={exports:{}};new Function('require','module','exports',...Object.keys(env),ts.transpileModule(fs.readFileSync(file,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText)(n=>{assert(n in deps,n);return deps[n];},m,m.exports,...Object.values(env));return m.exports;}
test('verified routes survive restart without storing user history and invalidate on source or facts',async()=>{
 let stored;const deps={'node:crypto':crypto,'./audio-memoire-stockage':{lireObjetMemoire:async()=>stored?Response.json(JSON.parse(stored)):null,ecrireObjetMemoire:async(path,body)=>{stored=body;}}};
 const server=()=>load('lib/dialogue-rapide.ts',deps,{globalThis:{},setTimeout:()=>({unref(){}})});
 const a=server(),index=[{id:'d',titre:'Couple',date:'1',repliques:[{id:'0',wo:'W',fr:'F',role:'bia'}]}],history=[{role:'user',text:'Je l’ai appelée cinq fois.'}];
 const key=a.cleDialogue(index,'Non.',history);a.garderChoixRapide(key,{devoir:'d',replique:'0'});await a.sauverDialoguesRapides();
 assert(!stored.includes('appelée'));const b=server();await b.chargerDialoguesRapides();assert.deepEqual(b.chercherChoixRapide(key),{devoir:'d',replique:'0'});
 assert.equal(b.chercherChoixRapide(b.cleDialogue(index,'Oui.',history)),undefined);
 assert.notEqual(key,b.cleDialogue(index,'Non.',[{role:'user',text:'Je l’ai appelée six fois.'}]));
 const modified=structuredClone(index);modified[0].repliques[0].wo='Corrigé';assert.notEqual(key,b.cleDialogue(modified,'Non.',history));
});
test('audio received with chat plays from bytes even before catalogue load, with no network',async()=>{
 const {creerMemoireAudio}=load('lib/audio-memoire-client.ts');let calls=0;
 const c=creerMemoireAudio('private-code',async()=>{calls++;throw Error('Network unavailable');});
 const id='a'.repeat(64),base64=Buffer.alloc(2500,42).toString('base64');
 assert(c.installer('Nanga def ?','wo',{id,base64}));
 assert.equal((await c.lire('Nanga def ?','wo')).byteLength,2500);assert.equal(calls,0);
 assert.equal(await c.lire('Nanga def ?','fr'),undefined);
 c.actualiser([{id:'b'.repeat(64),texte:'Nanga def ?','langue':'wo'}]);
 assert.equal(await c.lire('Nanga def ?','wo'),undefined);assert.equal(calls,1);
});
test('a new signed-in session cannot read audio cached by the old one',async()=>{
 const {creerMemoireAudio}=load('lib/audio-memoire-client.ts');const a=creerMemoireAudio('a'),b=creerMemoireAudio('b');
 a.installer('Texte','fr',{id:'f'.repeat(64),base64:Buffer.alloc(1500).toString('base64')});assert.equal(await b.lire('Texte','fr'),undefined);
 assert.equal(creerMemoireAudio(null).installer('Texte','fr',{id:'f'.repeat(64),base64:Buffer.alloc(1500).toString('base64')}),false);
});
