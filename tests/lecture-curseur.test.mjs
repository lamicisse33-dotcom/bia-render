import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';import ts from 'typescript';
function load(path){const m={exports:{}};new Function('module','exports',ts.transpileModule(fs.readFileSync(path,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText)(m,m.exports);return m.exports;}
const {planLecture,LectureContinue}=load('lib/lecture-continue.ts');
test('caret inside an accented word retains its beginning and exact source offsets',()=>{
 const texte='Bonjour. Ñu ngi fi. Dernière phrase.';const depart=texte.indexOf('ngi')+1;
 const plan=planLecture([{texte}],depart);assert.equal(plan[0].debut,texte.indexOf('ngi'));
 assert.equal(plan.map(p=>p.texte).join(''),texte.slice(texte.indexOf('ngi')));
 for(const p of plan)assert.equal(texte.slice(p.debut,p.fin),p.texte);
 assert.deepEqual(planLecture([{texte}],texte.length),[]);
});
test('seeking across saved lessons retains separators, language and remaining lessons',()=>{
 const passages=[{texte:'Bonjour.',langue:'fr'},{texte:'Ñu ngi fi.',langue:'wo'},{texte:'Au revoir.',langue:'fr'}];
 const complet=passages.map(p=>p.texte).join('\n\n'),plan=planLecture(passages,complet.indexOf('ngi'));
 assert.deepEqual(plan.map(p=>p.langue),['wo','fr']);
 for(const p of plan)assert.equal(complet.slice(p.debut,p.fin),p.texte);
 assert.equal(plan[0].texte,'ngi fi.');
});
test('a second click cancels the pending old synthesis and only reads the new position',async()=>{
 let release,first=true,etat;const played=[];
 const c=new LectureContinue(async text=>{if(first){first=false;await new Promise(r=>release=r);}return text;},async(text,signal,plage)=>{assert(!signal.aborted);played.push({text,plage});},{pause(){},reprendre(){},stop(){}},s=>etat=s);
 const texte='Première phrase. Deuxième phrase. Dernière phrase.';
 c.demarrer(texte);await new Promise(r=>setTimeout(r,0));c.demarrer(texte,texte.indexOf('Deuxième'));release();
 for(let n=0;n<100&&etat?.etat!=='terminé';n++)await new Promise(r=>setTimeout(r,10));
 assert.equal(etat.etat,'terminé');assert.deepEqual(played.map(p=>p.text),['Deuxième phrase. ','Dernière phrase.','Exercice terminé']);
 assert.equal(played[0].plage.debut,texte.indexOf('Deuxième'));assert.equal(played.at(-1).plage,undefined);
});
test('highlight uses the audible clock, pauses, resumes and clears when stopped',()=>{
 const {LecteurAudioContinu}=load('lib/lecteur-audio-continu.ts');
 const ctx={currentTime:0,state:'running',destination:{},createBufferSource(){return {connect(){},disconnect(){},start(){},stop(){},onended:null};}};
 const file=new LecteurAudioContinu(ctx);file.ajouter({duration:2});assert.equal(file.audible(),false);
 ctx.currentTime=.1;assert.equal(file.audible(),true);file.pause();assert.equal(file.audible(),false);
 ctx.currentTime=5;file.reprendre();assert.equal(file.audible(),false);ctx.currentTime=5.1;assert.equal(file.audible(),true);
 ctx.state='suspended';assert.equal(file.audible(),false);ctx.state='running';file.arreter();assert.equal(file.audible(),false);
});
