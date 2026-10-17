import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import ts from 'typescript';
import vm from 'node:vm';
function load(path,imports={}){const m={exports:{}};new Function('require','module','exports',ts.transpileModule(fs.readFileSync(path,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText)(id=>{assert(id in imports,id);return imports[id];},m,m.exports);return m.exports;}
const api=load('lib/reprise-progressive.ts',{'./ecoute-longue':load('lib/ecoute-longue.ts')});
const tick=()=>new Promise(r=>setTimeout(r,0));
function callback(name){
 const page=fs.readFileSync('app/page.tsx','utf8'),ast=ts.createSourceFile('page.tsx',page,ts.ScriptTarget.Latest,true,ts.ScriptKind.TSX);let source;
 function visit(n){if(ts.isVariableDeclaration(n)&&n.name.getText(ast)===name)source=n.initializer.getText(ast);ts.forEachChild(n,visit);}visit(ast);assert(source);
 return new Function('env',`with(env){${ts.transpileModule('const fn='+source,{compilerOptions:{target:ts.ScriptTarget.ES2022}}).outputText};return fn;}`);
}
test('actual thinking watcher uses ready incremental words without upload wait or full preview',async()=>{
 const events=[];const env={dejaRepris:false,guetteur:{},ditsRef:{current:[]},pendantLaReflexion:true,repriseProgressive:Promise.resolve({lire:async()=> 'Puis le coiffeur.',etat:()=>({segments:1,echantillons:24000})}),vivant:true,dernierSignalParoleRef:{current:{quand:Date.now()-2000}},mesurerReprise:(s)=>events.push(s),faut_il_se_taire:t=>({couper:true,dit:t}),fetch:()=>assert.fail('must not retranscribe full WebM'),setTimeout:()=>assert.fail('must not wait 250 ms')};
 assert.equal(await callback('motsDuGuetteur')(env)(),'Puis le coiffeur.');assert.deepEqual(events,['lecture','transcrit']);
});
test('actual watcher falls back to the complete recording on failed incremental ASR',async()=>{
 let preview=0,cancelled=0;const env={dejaRepris:false,guetteur:{state:'recording',requestData(){}},ditsRef:{current:[]},pendantLaReflexion:true,repriseProgressive:Promise.resolve({lire:async()=>{throw Error('failed');},annuler:()=>cancelled++}),vivant:true,dernierSignalParoleRef:{current:{quand:Date.now()}},mesurerReprise(){},faut_il_se_taire:t=>({couper:true,dit:t}),FLUX_DU_GUETTEUR:0,envois:[],morceauxGuet:1,tourGuet:'gdiagnostic123',langueDuFil:{current:'fr'},codeRef:{current:'fixture'},fetch:async url=>{assert.equal(url,'/api/ecouter/apercu');preview++;return Response.json({texte:'La phrase complète.'});}};
 assert.equal(await callback('motsDuGuetteur')(env)(),'La phrase complète.');assert.equal(preview,1);assert.equal(cancelled,1);assert.equal(env.repriseProgressive,null);
});
test('actual watcher cannot use a late transcript or launch fallback after its phase ended',async()=>{
 let release;const env={dejaRepris:false,guetteur:{},ditsRef:{current:[]},pendantLaReflexion:true,repriseProgressive:Promise.resolve({lire:()=>new Promise(r=>release=r)}),vivant:true,dernierSignalParoleRef:{current:{quand:Date.now()}},mesurerReprise(){},fetch:()=>assert.fail('old phase must stop')};
 const result=callback('motsDuGuetteur')(env)();await tick();env.vivant=false;release('ancien');assert.equal(await result,'');
});
test('thinking continuation transcribes during speech and snapshots never resend old samples',async()=>{
 let frames=0,calls=0,active=0,max=0;
 const p=api.creerRepriseProgressive(async f=>{active++;max=Math.max(max,active);frames+=((await f.get('audio').arrayBuffer()).byteLength-44)/2;calls++;await tick();active--;return Response.json({texte:'point'+calls});},()=> 'wo',()=>true);
 for(let i=0;i<8;i++)p.pousser(new Float32Array(4000).fill(.2),true);
 for(let i=0;i<2;i++)p.pousser(new Float32Array(4000),false);
 await tick();await tick();assert.equal(calls,1,'recognize before turn-ending silence');
 const first=await p.lire();assert.equal(first,'point1');assert.equal(frames,40000);
 assert.equal(await p.lire(),first);assert.equal(calls,1);
 for(let i=0;i<4;i++)p.pousser(new Float32Array(4000).fill(.1),true);
 assert.equal(await p.lire(),'point1 point2');assert.equal(frames,56000);assert.equal(max,1);
});
test('two-minute resumed speech retains every sample in order with one ASR at a time',async()=>{
 let frames=0,active=0,max=0,calls=0;
 const p=api.creerRepriseProgressive(async f=>{active++;max=Math.max(max,active);const a=await f.get('audio').arrayBuffer(),v=new DataView(a);for(let i=44;i<a.byteLength;i+=2){assert.equal(v.getInt16(i,true),Math.round(((Math.floor(frames/4000)%7)+1)*.05*32767));frames++;}calls++;await tick();active--;return Response.json({texte:'bloc'+calls});},()=> 'wo',()=>true);
 for(let i=0;i<480;i++)p.pousser(new Float32Array(4000).fill(((i%7)+1)*.05),true);
 const text=await p.lire();assert.equal(frames,120*16000);assert.equal(max,1);assert(text.endsWith('bloc'+calls));
});
test('continuing during pending recognition queues only the new words',async()=>{
 let release,calls=0;const p=api.creerRepriseProgressive(async()=>{calls++;if(calls===1)await new Promise(r=>release=r);return Response.json({texte:'point'+calls});},()=> 'fr',()=>true);
 p.pousser(new Float32Array(16000),true);const first=p.lire();await tick();
 p.pousser(new Float32Array(16000),true);release();assert.equal(await first,'point1');
 assert.equal(await p.lire(),'point1 point2');assert.equal(calls,2);
});
test('one failed segment rejects the complete progressive transcript, never a partial result',async()=>{
 let calls=0;const p=api.creerRepriseProgressive(async()=>Response.json(++calls===1?{texte:'premier'}:{panne:true}),()=> 'fr',()=>true);
 p.pousser(new Float32Array(16000),true);assert.equal(await p.lire(),'premier');
 p.pousser(new Float32Array(16000),true);await assert.rejects(p.lire(),/incomplète/);await assert.rejects(p.lire());assert.equal(calls,2);
});
test('cancellation prevents a late transcript and all queued recognition',async()=>{
 let release,calls=0;const p=api.creerRepriseProgressive(async()=>{calls++;await new Promise(r=>release=r);return Response.json({texte:'ancien'});},()=> 'fr',()=>true);
 for(let i=0;i<40;i++)p.pousser(new Float32Array(4000),true);
 const reading=p.lire();await tick();p.annuler();release();await assert.rejects(reading,/annulée/);assert.equal(calls,1);
});
test('silence alone cannot launch recognition and pre-roll preserves speech onset',async()=>{
 let frames=0;const p=api.creerRepriseProgressive(async f=>{frames+=((await f.get('audio').arrayBuffer()).byteLength-44)/2;return Response.json({texte:'Bonjour'});},()=> 'fr',()=>true);
 for(let i=0;i<80;i++)p.pousser(new Float32Array(4000),false);
 assert.equal(await p.lire(),null);assert.equal(frames,0);
 p.pousser(new Float32Array(4000),true);await p.lire();assert.equal(frames,20000);
});
test('worklet snapshots flush final samples without closing capture or duplicating audio',()=>{
 let Klass;const messages=[];
 vm.runInNewContext(fs.readFileSync('public/anticipation/reprise.js','utf8'),{AudioWorkletProcessor:class{constructor(){this.port={postMessage:m=>messages.push(m)};}},sampleRate:48000,Float32Array,registerProcessor:(name,k)=>{Klass=k;}});
 const w=new Klass();for(let i=0;i<10;i++)w.process([[new Float32Array(1000).fill(.25)]]);
 w.port.onmessage({data:'apercu'});assert.equal(messages.at(-1).apercu,true);
 for(let i=0;i<20;i++)w.process([[new Float32Array(1000).fill(.25)]]);
 w.port.onmessage({data:'apercu'});assert.equal(messages.filter(x=>x.pcm).reduce((n,x)=>n+x.pcm.length,0),10000);
 assert.equal(messages.filter(x=>x.apercu).length,2);
});
test('continuation telemetry accepts only bounded metadata, never speech or audio',()=>{
 delete globalThis.biaReprises;const a=load('lib/reprise-etat.ts');
 a.noterReprise({tour:'gdiagnostic123',etape:'transcrit',ms:85,segments:3,texte:'secret',audio:'secret'});
 a.noterReprise({tour:'bad',etape:'transcrit',ms:10});
 const s=a.resumeReprises();assert.equal(s.comptes.transcrit,1);assert.equal(s.derniers.length,1);assert.equal(s.derniers[0].texte,undefined);assert.equal(s.derniers[0].audio,undefined);
});
