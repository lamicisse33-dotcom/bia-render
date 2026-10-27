import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import ts from 'typescript';
function load(path,deps={},env={}){const m={exports:{}};new Function('require','module','exports',...Object.keys(env),ts.transpileModule(fs.readFileSync(path,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText)(n=>{assert(n in deps,n);return deps[n];},m,m.exports,...Object.values(env));return m.exports;}
const mode=load('lib/mode-apprentissage.ts'),correction=load('lib/correction-maitre.ts');
const rapidite=load('lib/rapidite-core.ts');
const dialogue=load('lib/dialogue-devoirs-core.ts'),racine=load('lib/correction-devoir-core.ts',{'./dialogue-devoirs-core':dialogue});
function service(verifier,read=async()=>({devoirs:[]})){return load('lib/correction-vocale.ts',{'./mode-apprentissage':mode,'./correction-maitre':correction,'./correction-devoir-core':racine,'./devoirs-apprentissage':{devoirsALire:read},'./transcription-contextuelle':{verifierTranscriptionContextuelle:verifier}});}
const verdict=(texte,statut='corrigee')=>({texte,verification:{statut,ms:10}});
test('ordinary speech, typed lessons, non-master requests and control commands bypass the extra brain',async()=>{
 const s=service(()=>{throw Error('unexpected model');});
 for(const [input,maitre,commande] of [[{message:'Bonjour',parole:true},true,false],[{message:'Dama sokhla.',apprend:true},true,false],[{message:'Dama sokhla.',parole:true,apprend:true},false,false],[{message:'Mémorise',parole:true,apprend:true},true,true],[{message:'Stop stop, ne continue pas.',parole:true,apprend:true},true,true]])assert.equal(await s.preparerCorrectionVocale(input,maitre,commande),null);
});
test('contextual repair completes before repetition and strips only the command from the verifier input',async()=>{
 let release,called;const s=service(async(...args)=>{called=args;return new Promise(r=>release=r);});
 let finished=false;const pending=s.preparerCorrectionVocale({parole:true,message:'Répète : Dama sokhla preuve de paiement.',history:[{role:'user',text:'Nous corrigeons les preuves de paiement.'},{role:'user',text:'Répète : Dama sokhla preuve de paiement.'}]},true,false).then(r=>{finished=true;return r;});
 assert.equal(finished,false);assert.equal(called[0],'Dama sokhla preuve de paiement.');assert.equal(called[1].length,1);
 release(verdict('Dama soxla preuve de paiement.'));const r=await pending;
 assert.equal(r.message,'Répète : Dama soxla preuve de paiement.');assert.equal(r.transcription.brut,'Dama sokhla preuve de paiement.');
 const echoed=await mode.executerLecon({texte:r.message,maitre:true,actif:false,phrase:''},()=>{throw Error('no save');});assert.equal(echoed.aRepeter,'Dama soxla preuve de paiement.');
});
test('ambiguous or unavailable verification cannot repeat or retain the defective draft',async()=>{
 for(const statut of ['a_confirmer','indisponible']){
  const s=service(async()=>verdict('texte mal entendu',statut));
  const r=await s.preparerCorrectionVocale({parole:true,apprend:true,message:'texte mal entendu',aRepeter:'ancienne mauvaise phrase'},true,false);
  assert.equal(r.reponse.aRepeter,'');assert.notEqual(r.reponse.reply,'texte mal entendu');assert.equal(r.reponse.apprend,true);
 }
});
test('only a verified source revision becomes a reference, and new corrections never get saved automatically',async()=>{
 const origine={devoir_id:'devoir',texte:'Dama soxla preuve de paiement.',debut:0,revision:'a'.repeat(64),langue:'wo'};
 let received;const s=service(async(...args)=>{received=args;return verdict('Dama soxla preuve de paiement.');},async()=>({devoirs:[{id:'devoir',texte:origine.texte,valide:true,revision:origine.revision}]}));
 const r=await s.preparerCorrectionVocale({parole:true,apprend:true,correctionDevoir:origine,message:'Mémorise : Dama sokhla preuve de paiement.'},true,true);
 assert.deepEqual(received[3].references,[origine.texte]);assert.equal(r.message,'Répète : Dama soxla preuve de paiement.');
 let writes=0;const draft=await mode.executerLecon({texte:r.message,maitre:true,actif:true,phrase:''},async()=>writes++);assert.equal(writes,0);
 await mode.executerLecon({texte:'Mémorise',maitre:true,actif:true,phrase:draft.aRepeter},async p=>{assert.equal(p,'Dama soxla preuve de paiement.');writes++;});assert.equal(writes,1);
});
test('actual authenticated chat awaits verification before either repetition shortcut or stream',async()=>{
 const source=fs.readFileSync('app/api/chat/route.ts','utf8'),ast=ts.createSourceFile('route.ts',source,ts.ScriptTarget.Latest,true);let post;
 function visit(n){if(ts.isFunctionDeclaration(n)&&n.name?.text==='POST')post=n;ts.forEachChild(n,visit);}visit(ast);
 const js=ts.transpileModule(post.getText(ast).replace(/^export /,''),{compilerOptions:{target:ts.ScriptTarget.ES2022}}).outputText;
 for(const diffuse of [false,true]){
  let release,called=0,saved=0;const api=new Function('env',`with(env){${js};return POST;}`)({profilRapiditeAutorise:rapidite.profilRapiditeAutorise,verifierCode:()=>({ok:true,maitre:true}),lireLOrdre:()=>null,preparerCorrectionVocale:()=>new Promise(r=>release=r),DIFFUSER_LE_MODELE:true,
   repondre:async body=>{called++;assert.equal(body.message,'Répète : Dama soxla.');return {corps:{reply:'Dama soxla.'}};},garderCeTour:()=>saved++,NextResponse:Response});
  const pending=api(new Request('https://bia.test/api/chat',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({message:'Répète : Dama sokhla.',parole:true,diffuse})}));
  await new Promise(r=>setTimeout(r,5));assert.equal(called,0);
  release({message:'Répète : Dama soxla.',transcription:{brut:'Dama sokhla.',texte:'Dama soxla.',statut:'corrigee'},reponse:null});
  const r=await pending,content=await r.text();assert(content.includes('Dama soxla.'));assert(content.includes('transcription'));assert.equal(called,1);assert.equal(saved,0);
 }
});
