import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';import ts from 'typescript';
async function load(p){const js=ts.transpileModule(fs.readFileSync(p,'utf8'),{compilerOptions:{module:ts.ModuleKind.ESNext,target:ts.ScriptTarget.ES2022}}).outputText;return import('data:text/javascript;base64,'+Buffer.from(js).toString('base64'));}
const {segmentsLecture,LectureContinue}=await load('lib/lecture-continue.ts');
const {validerLecon,dernieresLecons,appliquerRegles}=await load('lib/lexique-apprentissage-core.ts');
const wait=ms=>new Promise(r=>setTimeout(r,ms));
async function until(fn){for(let i=0;i<600;i++){if(fn())return;await wait(10);}throw new Error('timeout');}
const transport={pause(){},reprendre(){},stop(){}};
test('long exercise preserves all characters, sentences, accents and original order',()=>{
 const long=Array.from({length:200},(_,i)=>`Phrase ${i} : Émilie préfère le café. Ñu ngi fi, jërëjëf.\n`).join('');
 const parts=segmentsLecture(long);assert.equal(parts.join(''),long);assert(parts.every(s=>s.length<=500));
 const sentence='Cette phrase possède assez de mots pour dépasser largement la limite habituelle de dix mots, mais elle reste bien entière.';
 assert.deepEqual(segmentsLecture(sentence),[sentence]);
 const huge=('un mot, puis une pause; '.repeat(100))+'Fin.';const split=segmentsLecture(huge);assert.equal(split.join(''),huge);assert(split.every(x=>x.length<=500));
});
test('full >60-word exercise retries the failed segment, continues and announces completion once',async()=>{
 const text=Array.from({length:35},(_,i)=>`Phrase numéro ${i} avec des mots à lire exactement. `).join('');
 const expected=segmentsLecture(text);let fail=true;const played=[];let state;
 const c=new LectureContinue(async t=>{if(t===expected[4]&&fail){fail=false;throw Error('503');}return t;},async a=>{played.push(a);},transport,s=>{state=s;});
 c.demarrer(text);await until(()=>state?.etat==='terminé');assert.deepEqual(played,[...expected,'Exercice terminé']);assert.equal(state.index,expected.length);
});
test('pause during synthesis holds audio; stop discards late results',async()=>{
 let release;const pending=new Promise(r=>release=r);const played=[];let state;
 const c=new LectureContinue(async t=>{await pending;return t;},async a=>{played.push(a);},transport,s=>state=s);
 c.demarrer('Première phrase. Deuxième phrase.');c.pause();release();await wait(100);assert.equal(played.length,0);
 c.reprendre();await until(()=>state.etat==='terminé');assert.equal(played.at(-1),'Exercice terminé');
 let late;const p=new Promise(r=>late=r);const d=new LectureContinue(async t=>{await p;return t;},async a=>played.push(a),transport,()=>{});
 const count=played.length;d.demarrer('Ne pas lire.');d.stop();late();await wait(100);assert.equal(played.length,count);
});
test('persistent failure retains cursor; Resume retries without skipping or false completion',async()=>{
 let fail=true,state;const played=[];const c=new LectureContinue(async t=>{if(fail)throw Error('offline');return t;},async a=>played.push(a),transport,s=>state=s);
 c.demarrer('Première phrase. Dernière phrase.');await until(()=>state.etat==='erreur');assert.equal(state.index,0);assert.deepEqual(played,[]);
 fail=false;c.reprendre();await until(()=>state.etat==='terminé');assert.deepEqual(played,['Première phrase. ','Dernière phrase.','Exercice terminé']);
});
test('only explicit validation has a validation date; latest invalidation wins after reload',()=>{
 const b={texte:'ñu',langue:'wo',prononciation:'gnou',exemple:'Ñu ngi fi.',statut:'validé'};
 assert.throws(()=>validerLecon(b));const good=validerLecon({...b,validation_expresse:true});assert(good.date_validation);
 const bad=validerLecon({...b,statut:'à corriger'});assert.equal(bad.date_validation,null);
 const persisted=JSON.stringify([{proposee:JSON.stringify({version:1,lecon:bad})},{proposee:JSON.stringify({version:1,lecon:good})}]);
 assert.deepEqual(dernieresLecons(JSON.parse(persisted)),[bad]);
 assert.equal(appliquerRegles('ñu ngir ñu',[{mot:'ñu',dire:'gnou'},{mot:'gnou',dire:'WRONG'}]),'gnou ngir gnou');
});
