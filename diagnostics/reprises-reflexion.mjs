// Read-only reproductions of the production callbacks. No network or microphone.
import fs from 'node:fs';
import assert from 'node:assert/strict';
import ts from 'typescript';
function load(path,imports={}){
 const m={exports:{}};
 new Function('require','module','exports',ts.transpileModule(fs.readFileSync(path,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText)(id=>{assert(id in imports,id);return imports[id];},m,m.exports);
 return m.exports;
}
function callback(name){
 const page=fs.readFileSync('app/page.tsx','utf8'),ast=ts.createSourceFile('page.tsx',page,ts.ScriptTarget.Latest,true,ts.ScriptKind.TSX);let source;
 function visit(n){if(ts.isVariableDeclaration(n)&&n.name.getText(ast)===name)source=n.initializer.getText(ast);ts.forEachChild(n,visit);}visit(ast);assert(source);
 const js=ts.transpileModule('const fn='+source,{compilerOptions:{target:ts.ScriptTarget.ES2022}}).outputText;
 return new Function('env',`with(env){${js};return fn;}`);
}
const {suitePendantReflexion,recoller}=load('lib/sa-propre-voix.ts',{'./normaliser':load('lib/normaliser.ts')});
const {silenceQuiSuffit}=load('lib/micro.ts');
const {exclusionAnticipation}=load('lib/activation-anticipation.ts');
const run=callback('finDeSaParole');
let opened=0,recognitions=0,restarts=0,release;
const gate={ouvrir:()=>opened++};
const env={finEnCours:false,questionEnVolRef:{current:'Je suis passé au marché'},transcritRef:{current:true},busyRef:{current:true},numeroDuTourRef:{current:1},porteDuGuet:gate,porteRef:{current:gate},revisionParole:0,bornesRef:{current:{micro:Date.now()-16000}},dejaRepris:false,motsDuGuetteur:async()=>{recognitions++;await new Promise(r=>release=r);return 'Puis je suis passé chez le coiffeur';},vivant:true,tuDepuis:4000,silenceQuiSuffit,coupesTropTotRef:{current:0},suitePendantReflexion,mesurerLaCoupure(){},ilParle:true,motsRattrapesRef:{current:null},recoller,ouvrirUnTour:()=>restarts++,askBiaRef:{current:()=>restarts++}};
const pending=run(env)(Date.now());
env.revisionParole++; // The user resumes during recognition.
release();await pending;
assert.equal(opened,0);assert.equal(env.porteRef.current,gate);assert.equal(env.finEnCours,false);
const retry=run(env)(Date.now());release();await retry;
assert.equal(recognitions,2);assert.equal(opened,1);assert.equal(restarts,0);
assert.equal(env.motsRattrapesRef.current.texte,'Puis je suis passé chez le coiffeur');
const options={persona:'rara',voixCompatible:true,desactivee:false,apprentissage:false,correctionDevoir:false,correctionListe:false,prenom:false,reprise:true};
assert.equal(exclusionAnticipation(options),'reprise');
assert.equal(exclusionAnticipation({...options,reprise:false}),'');
const pauses=[0,1,2,3,4].map(n=>silenceQuiSuffit(7000,n));
assert.deepEqual(pauses,[2000,2300,2600,2900,3000]);
// Each preview includes the same old chunks again; it does not consume them.
const depot=load('lib/morceaux-de-parole.ts');
const key='diagnostic-reflexion';
for(let i=0;i<10;i++)assert(depot.poserMorceau(key,i,new Uint8Array(300),'audio/webm','parole.webm').ok);
const first=depot.apercu(key);assert(first.ok);assert.equal(first.son.morceaux,10);
for(let i=10;i<15;i++)assert(depot.poserMorceau(key,i,new Uint8Array(300),'audio/webm','parole.webm').ok);
const second=depot.apercu(key);assert(second.ok);assert.equal(second.son.morceaux,15);
depot.oublierLeDepot(key);
console.log(JSON.stringify({simulation:true,code_production_modifie:false,transcriptions_si_reprise_pendant_ASR:recognitions,reponse_prete_conservee:restarts===0,exclusion_reprise:exclusionAnticipation(options),silence_long_apres_0_a_4_reprises_ms:pauses,morceaux_retranscrits_aux_deux_apercus:[first.son.morceaux,second.son.morceaux]},null,2));
