import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import ts from 'typescript';
function load(path,deps={}){const m={exports:{}};const code=ts.transpileModule(fs.readFileSync(path,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText;new Function('require','module','exports',code)(id=>{assert(id in deps,id);return deps[id];},m,m.exports);return m.exports;}
const core=load('lib/rapidite-core.ts');
test('trial models are bounded and selection is authorized by the authenticated master',()=>{
 assert.equal(core.profilRapiditeAutorise('haiku',false),null);
 assert.equal(core.profilRapiditeAutorise('haiku-optimise',true),'haiku-optimise');
 assert.equal(core.profilRapiditeAutorise('segment-2500',true),'segment-2500');
 assert.equal(core.profilRapiditeAutorise('segment-2500',false),null);
 assert.equal(core.profilRapiditeAutorise('arbitrary-expensive-model',true),null);
 assert.equal(core.modeleRapidite(null,'original-model'),'original-model');
 assert.equal(core.modeleRapidite('sonnet','original-model'),'claude-sonnet-5-5');
 assert.equal(core.modeleRapidite('sonnet-segment-1500','original-model'),'claude-sonnet-5-5');
 assert.equal(core.segmentRapiditeMs('sonnet-segment-1500'),1500);
 assert.equal(core.modeleRapidite('haiku','original-model'),'claude-haiku-5-5');
 assert.equal(core.modeleRapidite('segment-2500','original-model'),'original-model');
 assert.equal(core.rapiditeOptimisee('segment-2500'),false);
 assert.equal(core.segmentRapiditeMs(null),4000);assert.equal(core.segmentRapiditeMs('haiku'),4000);assert.equal(core.segmentRapiditeMs('haiku-optimise'),2500);assert.equal(core.segmentRapiditeMs('segment-2500'),2500);
});
test('no browser preference survives leaving the trial URL',()=>{
 const old=globalThis.window;try{
  globalThis.window={location:{href:'https://app.khalam.app/?essai-rapidite=haiku'}};
  assert.deepEqual(core.entetesRapidite(),{'x-bia-essai-rapidite':'haiku'});
  globalThis.window.location.href='https://app.khalam.app/';assert.deepEqual(core.entetesRapidite(),{});
 }finally{if(old===undefined)delete globalThis.window;else globalThis.window=old;}
});
test('ordinary and brick measurements preserve the long resumed turn without blaming playback alone',()=>{
 delete globalThis.biaEssaiRapidite;const api=load('lib/rapidite-etat.ts',{'./rapidite-core':core});
 const d={profil_rapidite:'haiku',vecu_ms:5000,queue_ms:400,transcription_ms:900,modele_ms:1800,voix_ms:1800,demarrage_ms:100};
 api.noterTourRapidite(d);api.noterTourRapidite({...d,vecu_ms:15000,reprises:2});
 api.noterPremierSonRapidite({profil_rapidite:'haiku',etape:'premier_son',ms:1000,micro_ms:600});
 api.noterTourRapidite({...d,vecu_ms:-1});
 const p=api.resumeEssaiRapidite().profils.find(p=>p.profil==='haiku');
 assert.equal(p.tours,3);assert.equal(p.ordinaires,2);assert.equal(p.briques,1);assert.equal(p.tours_avec_reprise,1);assert.equal(p.mediane_sans_reprise_ms,3000);
 assert.equal(api.resumeEssaiRapidite().tours[1].vecu_ms,15000);
 api.noterTourRapidite({...d,profil_rapidite:'sonnet-segment-1500',vecu_ms:2100});
 const nouveau=api.resumeEssaiRapidite().profils.find(p=>p.profil==='sonnet-segment-1500');
 assert.equal(nouveau.tours,1);assert.equal(nouveau.mediane_sans_reprise_ms,2100);
});
test('the faster progressive cut sends every sample in order and never starts playback',async()=>{
 const {creerEcouteProgressive}=load('lib/ecoute-progressive.ts',{'./ecoute-longue':load('lib/ecoute-longue.ts')});
 for(const seuil of [1500,2500,4000]){
  const clips=[];let recorded=0,firstAt;
  const p=creerEcouteProgressive(async f=>{firstAt??=recorded;const b=await f.get('audio').arrayBuffer();clips.push((b.byteLength-44)/2);return Response.json({texte:'Une pensée complète.'});},()=> 'fr',()=>true,()=>{},seuil);
  for(let n=0;n<120;n++){recorded+=100;p.pousser(new Float32Array(1600).fill(.2),true);await Promise.resolve();}
  await p.finir();assert.equal(firstAt,seuil);assert.equal(clips.reduce((a,b)=>a+b,0),192000);assert(clips.every(n=>n>0));
 }
});
test('the 1.5 s trial keeps pre-roll but never sends it alone as its first continuous-speech clip',async()=>{
 const {creerEcouteProgressive}=load('lib/ecoute-progressive.ts',{'./ecoute-longue':load('lib/ecoute-longue.ts')});
 const clips=[];let recorded=0,firstAt;
 const p=creerEcouteProgressive(async f=>{firstAt??=recorded;const a=await f.get('audio').arrayBuffer(),v=new DataView(a),samples=[];for(let i=44;i<a.byteLength;i+=2)samples.push(v.getInt16(i,true));clips.push(samples);return Response.json({texte:'Une pensée complète.'});},()=> 'fr',()=>true,()=>{},1500);
 for(let i=0;i<10;i++){recorded+=100;p.pousser(new Float32Array(1600),false);await Promise.resolve();}
 for(let i=0;i<25;i++){recorded+=100;p.pousser(new Float32Array(1600).fill(.2),true);await Promise.resolve();}
 await p.finir();assert.equal(firstAt,2500);
 assert(clips[0].some(n=>n!==0),'first clip must include speech');
 const all=clips.flat();assert.equal(all.length,56000);
 assert(all.slice(0,16000).every(n=>n===0));assert(all.slice(16000).every(n=>n>0));
});
test('preloading is read-only, shared and does not need to finish before ASR can proceed',async()=>{
 let reads=0,release;const gate=new Promise(r=>release=r),done=[];
 const read=async()=>{reads++;await gate;};
 const api=load('lib/rapidite-precharger.ts',{'./lexique':{motsCorriges:read},'./instructions-apprentissage':{contexteInstructions:read},'./dialogue-devoirs':{indexDialogue:read},'./audio-memoire':{catalogueAudioMemoire:read},'./memoire-organisee':{preparerMemoireCommune:read},'./anticipation-lexique-voix':{anticiperLexiqueVoix(){}},'./rapidite-etat':{noterPrechargementRapidite:d=>done.push(d)}});
 assert.equal(api.prechargerPendantEcoute(),undefined);api.prechargerPendantEcoute();assert.equal(reads,5);assert.equal(done.length,0);release();await new Promise(r=>setTimeout(r,0));assert.equal(done[0].lectures_reussies,5);
});
test('a non-master cannot select a different brick model through JSON or headers',async()=>{
 let passed;
 const route=load('app/api/anticipation/briques/route.ts',{'@/lib/codes':{verifierCode:()=>({ok:true,maitre:false})},'@/lib/rapidite-core':core,'@/lib/briques-reponse':{preparerBrique:async b=>{passed=b;return null;}}});
 await route.POST(new Request('https://app.khalam.app/api/anticipation/briques',{method:'POST',headers:{'x-bia-code':'ordinary-test','x-bia-essai-rapidite':'haiku'},body:JSON.stringify({essaiRapidite:'haiku-optimise'})}));
 assert.equal(passed.essaiRapidite,null);
});
test('ordinary authenticated master speech preloads without delaying ASR or changing its words',async()=>{
 for(const acces of [{ok:false,maitre:false},{ok:true,maitre:false},{ok:true,maitre:true}]){
  let preparations=0,ecoutes=0;
  const route=load('app/api/ecouter/route.ts',{
   '@/lib/rapidite-precharger':{prechargerPendantEcoute(){preparations++;return new Promise(()=>{});}},
   '@/lib/transcription-en-boucle':{transcriptionEnBoucle:()=>false},'@/lib/langue':{detecterLangue:()=> 'wo'},
   '@/lib/preparer-ecoute':{preparerEcoute:async()=>{ecoutes++;return {reco:{texte:'Jën ak tamaate.'},ecriture:{texte:'Jën ak tamaate.'},correction_disponible:true,chronometrage:{}};}},
   'next/server':{NextResponse:{json:Response.json}},'@/lib/codes':{verifierCode:()=>acces},'@/lib/panne':{noterPanne(){}},
   '@/lib/morceaux-de-parole':{cleValide:()=>null},'@/lib/corpus':{corpusActif:()=>false},
  });
  const f=new FormData();f.set('audio',new Blob(['test'],{type:'audio/wav'}),'test.wav');
  const r=await route.POST({headers:{get:()=>null},formData:async()=>f});
  assert.equal(r.status,acces.ok?200:401);assert.equal(preparations,acces.maitre?1:0);assert.equal(ecoutes,acces.ok?1:0);
  if(acces.ok)assert.equal((await r.json()).texte,'Jën ak tamaate.');
 }
});
