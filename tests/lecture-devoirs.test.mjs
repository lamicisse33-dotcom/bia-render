import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import ts from 'typescript';
function load(file,modules={},extra={}){
 const js=ts.transpileModule(fs.readFileSync(file,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022,jsx:ts.JsxEmit.ReactJSX}}).outputText;
 const module={exports:{}};
 new Function('require','module','exports',...Object.keys(extra),js)(name=>{assert(name in modules,`Unexpected ${name}`);return modules[name];},module,module.exports,...Object.values(extra));return module.exports;
}
const {demandeLectureMemoire}=load('lib/intention-lecture.ts');
const {assemblerDevoirs}=load('lib/lecture-devoirs-core.ts');
const {LectureContinue,segmentsLecture}=load('lib/lecture-continue.ts');
const {suitePendantReflexion}=load('lib/sa-propre-voix.ts',{'./normaliser':load('lib/normaliser.ts')});
const {creerDetectionInterruption}=load('lib/tour-de-parole.ts');
const {reveiller}=load('lib/reveil-du-son.ts');
const block=(id,index,total,texte,rest={})=>({version:2,type:'devoir',id,index,total,texte,date:'2026-10-11',...rest});
const wait=ms=>new Promise(r=>setTimeout(r,ms));
async function until(f){for(let i=0;i<300;i++){if(f())return;await wait(10);}throw Error('timeout');}

test('the reported spoken requests open memory; lesson payloads and questions do not',()=>{
 for(const s of ['Lis-moi tous les devoirs que tu as en mémoire.','Lis à haute voix tous les devoirs que tu as en mémoire.','Peux-tu me lire toutes les leçons enregistrées ?','Bia, je veux que tu me lises tous mes devoirs.','lis mes devoirs','lis tous les exercices'])assert.equal(demandeLectureMemoire(s),true,s);
 for(const s of ['Ne lis pas mes devoirs.','Pourquoi ne lis-tu pas mes devoirs ?','Comment lire tous mes devoirs ?','Lis ce texte :\nVoici tous les devoirs.','Voici tous mes devoirs','Lis ce texte : tous mes devoirs sont terminés.'])assert.equal(demandeLectureMemoire(s),false,s);
});
test('all stored lessons are reconstructed in chronological order, without the chat 8k limit',()=>{
 const whole='Ñu ngi fi. '.repeat(2000)+'🙂 Fin';
 const parts=Array.from({length:Math.ceil(whole.length/4000)},(_,i)=>block('b',i,Math.ceil(whole.length/4000),whole.slice(i*4000,(i+1)*4000)));
 const r=assemblerDevoirs([...parts.reverse(),block('a',0,1,'Bonjour.',{date:'2026-10-10',langue:'fr'}),block('b',0,parts.length,'OLD'),block('incomplete',0,2,'Ne pas lire la moitié.')]);
 assert.equal(r.devoirs.length,2);assert.equal(r.incomplets,1);assert.equal(r.devoirs[0].langue,'fr');assert.equal(r.devoirs[1].texte,whole);
 assert.equal(assemblerDevoirs([block('bad',1,2,'fin'),block('bad',2,2,'hors limite')]).devoirs.length,0);
});
test('successive late questions preserve the prepared answer; real continuation and stop still work',()=>{
 for(const delay of [10369,16060,17045])assert.equal(suitePendantReflexion('Lis les devoirs','Tu ne réponds pas',delay).action,'ensuite');
 assert.deepEqual(suitePendantReflexion('Lis les devoirs','les devoirs',200),{action:'ignorer',texte:''});
 assert.deepEqual(suitePendantReflexion('Lis les devoirs','et les leçons',1500),{action:'recoller',texte:'Lis les devoirs et les leçons'});
 assert.equal(suitePendantReflexion('Lis les devoirs','Non, arrête la lecture',16060).action,'remplacer');
});
test('three spurious voiced ticks cannot block thinking, while sustained speech can',()=>{
 const detector=creerDetectionInterruption(true);
 for(let i=0;i<3;i++)assert.equal(detector(true,true,60),false);
 for(let i=0;i<12;i++)assert.equal(detector(false,false,60),false);
 assert(Array.from({length:8},()=>detector(true,true,60)).some(Boolean));
});
test('mixed saved lessons preserve every character and select the saved language for every segment',async()=>{
 const passages=[{texte:'Texte français. '.repeat(100),langue:'fr'},{texte:'Ñu ngi fi. '.repeat(100),langue:'wo'}];
 const played=[];let final;
 const p=new LectureContinue(async(texte,signal,langue)=>({texte,langue}),async v=>{played.push(v);},{stop(){},pause(){},reprendre(){}},s=>{final=s;});
 p.demarrerPassages(passages);await until(()=>final.etat==='terminé');
 assert.deepEqual(played, [...passages.flatMap(p=>segmentsLecture(p.texte).map(texte=>({texte,langue:p.langue}))),{texte:'Exercice terminé',langue:'fr'}]);
});
function mount({audioState='running',pendingMemory=false}={}){
 const effects=[],calls=[],states=[],starts=[];let stopped=false,release;
 const react={useRef:current=>({current}),useMemo:f=>f(),useState:v=>[v,x=>states.push(x)],useEffect:f=>effects.push(f)};
 const ctx={state:audioState,currentTime:0,resume:()=>audioState==='running'?Promise.resolve():new Promise(()=>{}),decodeAudioData:async()=>({duration:0.01}),
 createBufferSource:()=>{const node={connect(){},disconnect(){},stop(){},onended:null,start(){starts.push(true);setTimeout(()=>node.onended?.(),1);}};return node;}};
 const fetch=async(url,opt)=>{calls.push({url,body:opt.body?JSON.parse(opt.body):null});
 if(url==='/api/apprentissage/devoir'){if(pendingMemory)await new Promise(r=>release=r);return {ok:true,json:async()=>({devoirs:[{id:'a',texte:'Bonjour.',langue:'fr'}],incomplets:0})};}
 if(url==='/api/chatterbox-test/bia')return {ok:true,json:async()=>({audio:'AA==',partie:0,parties:1,empreinte:'test'})};
 return {ok:true,json:async()=>({})};};
 const component=load('app/LectureApprentissage.tsx',{'react':react,'react/jsx-runtime':{jsx:(t,p)=>({t,p}),jsxs:(t,p)=>({t,p})},'@/lib/routage-apprentissage':load('lib/routage-apprentissage.ts'),'@/lib/lecture-continue':{LectureContinue},'@/lib/langue':{ambiguitiesWolof:()=>[]},'@/lib/voix-piper-locale':{},'@/lib/flux-khalam':{},'@/lib/reveil-du-son':{reveiller},'@/lib/lecture-morceaux':load('lib/lecture-morceaux.ts')},{fetch});
 const tree=component.default({code:'fixture',voice:'female',demande:{texte:'',nonce:1,auto:true,source:'memoire'},onStart(){},onClose(){},edition:true,obtenirAudio:()=>ctx});
 const cleanup=effects.map(f=>f());
 return {calls,states,starts,release:()=>release?.(),unmount:()=>{for(const c of cleanup)c?.();}};
}
test('actual web reader loads memory, schedules sound, reports first sound, never calls chat or saves',async()=>{
 const m=mount();await until(()=>m.states.some(s=>s?.etat==='terminé'));
 assert.equal(m.starts.length,2);assert.deepEqual(m.calls.filter(c=>c.url==='/api/chatterbox-test/bia').map(c=>[c.body.texte,c.body.langue]),[['Bonjour.','fr'],['Exercice terminé','fr']]);
 assert(m.calls.some(c=>c.body?.type==='lecture_devoirs'&&c.body.etape==='premier_son'));
 assert(!m.calls.some(c=>c.url==='/api/chat'||c.url==='/api/apprentissage/instruction'||c.body?.valide));m.unmount();
});
test('closing the web reader during loading cannot start a late sound',async()=>{
 const m=mount({pendingMemory:true});m.unmount();m.release();await wait(20);assert.equal(m.starts.length,0);assert(!m.calls.some(c=>c.url.includes('chatterbox')));
});
test('web audio blocked by the browser becomes an actionable error, not indefinite silence',async()=>{
 const m=mount({audioState:'suspended'});await until(()=>m.states.some(s=>s?.etat==='erreur'));
 assert.equal(m.starts.length,0);assert(m.states.some(s=>s?.erreur?.includes('REPRENDRE')));assert.equal(m.calls.filter(c=>c.url.includes('chatterbox')).length,1);m.unmount();
});
test('saved homework GET requires master access; no lesson data leaks without it',async()=>{
 let reads=0;let permitted=false;
 const {GET}=load('app/api/apprentissage/devoir/route.ts',{'next/server':{NextResponse:Response},'@/lib/codes':{verifierCode:()=>({ok:permitted,maitre:permitted})},'@/lib/devoirs-apprentissage':{devoirsALire:async()=>{reads++;return {devoirs:[{texte:'private'}],incomplets:0};}}});
 const req=new Request('https://example.test/api/apprentissage/devoir');assert.equal((await GET(req)).status,401);assert.equal(reads,0);
 permitted=true;const r=await GET(req);assert.equal(r.status,200);assert.equal(r.headers.get('cache-control'),'private, no-store');assert.equal(reads,1);
});
function callback(name){
 const page=fs.readFileSync('app/page.tsx','utf8'),ast=ts.createSourceFile('page.tsx',page,ts.ScriptTarget.Latest,true,ts.ScriptKind.TSX);let source;
 function visit(n){if(ts.isVariableDeclaration(n)&&n.name.getText(ast)===name){source=(ts.isCallExpression(n.initializer)?n.initializer.arguments[0]:n.initializer).getText(ast);}ts.forEachChild(n,visit);}visit(ast);assert(source);
 const js=ts.transpileModule('const fn='+source,{compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.None}}).outputText;
 return new Function('env',`with(env){${js};return fn;}`);
}
test('actual question handler opens saved memory even during a busy stalled turn, before chat',async()=>{
 const events=[];
 const fn=callback('askBia')({demandeLectureMemoire,fermerConversation:()=>events.push('close'),taire:()=>events.push('stop'),setSaisie(){},setClavier(){},setLectureContinue:d=>events.push(d),busyRef:{current:true}});
 await fn('Lis à haute voix tous les devoirs que tu as en mémoire',true);
 assert.deepEqual(events.slice(0,2),['close','stop']);assert.equal(events[2].source,'memoire');assert.equal(events[2].texte,'');
});
test('actual thinking gate releases the prepared reply and buffers a late question without another model call',async()=>{
 const {recoller}=load('lib/sa-propre-voix.ts',{'./normaliser':load('lib/normaliser.ts')});let opened=0;
 const gate={ouvrir:()=>opened++};
 const env={finEnCours:false,questionEnVolRef:{current:'Lis mes devoirs'},transcritRef:{current:false},busyRef:{current:true},numeroDuTourRef:{current:1},porteDuGuet:gate,porteRef:{current:gate},revisionParole:0,bornesRef:{current:{micro:Date.now()-16000}},dejaRepris:false,motsDuGuetteur:async()=> 'Pourquoi tu ne réponds pas',vivant:true,tuDepuis:2500,silenceQuiSuffit:()=>1500,coupesTropTotRef:{current:0},suitePendantReflexion,mesurerLaCoupure(){},ilParle:true,motsRattrapesRef:{current:null},recoller,ouvrirUnTour:()=>{throw Error('must not discard ready answer');},askBiaRef:{current:()=>{throw Error('must not call model again');}}};
 await callback('finDeSaParole')(env)(Date.now());assert.equal(opened,1);assert.equal(env.porteRef.current,null);assert.equal(env.busyRef.current,true);assert.equal(env.motsRattrapesRef.current.texte,'Pourquoi tu ne réponds pas');
});
