import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import ts from 'typescript';
function load(deps){const m={exports:{}};new Function('require','module','exports',ts.transpileModule(fs.readFileSync('lib/preparer-ecoute.ts','utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText)(id=>{assert(id in deps,id);return deps[id];},m,m.exports);return m.exports;}
test('lexicon lookup starts during ASR and the exact same promise feeds post-ASR correction',async()=>{
 let lexStarted=false,lexReads=0,finishLex,finishASR;const lex=new Promise(r=>finishLex=r),asr=new Promise(r=>finishASR=r);
 const api=load({'./ecoute':{transcrire:async()=>{assert(lexStarted);return asr;}},'./lexique':{motsCorriges:async()=>[]},'./mots-a-entendre':{pourScribe:x=>x},'./salutations-dialogue':{salutationReconnue:()=>undefined},'./correction-transcription':{
  phrasesLexiqueComplet:()=>{lexStarted=true;lexReads++;return lex;},lireCorrectionsTranscription:async()=>[],corrigerTranscription:async(t,_regles,p)=>{assert.deepEqual(await p,['Dama soxla.']);return {texte:t,texte_brut:t,corrections_transcription:[],suggestions_ecriture:[]};}
 }});
 const pending=api.preparerEcoute(new Blob(['audio']),'sample.wav','wo');assert.equal(lexReads,1);finishLex(['Dama soxla.']);finishASR({texte:'Dama soxla.'});const r=await pending;assert(r.correction_disponible);assert.equal(r.ecriture.texte,'Dama soxla.');assert.equal(lexReads,1);
});
