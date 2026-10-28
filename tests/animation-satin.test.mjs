import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {execFileSync} from 'node:child_process';
import ts from 'typescript';
const js = ts.transpileModule(fs.readFileSync('lib/animation-satin.ts','utf8'), {compilerOptions:{module:ts.ModuleKind.ESNext,target:ts.ScriptTarget.ES2022}}).outputText;
const a = await import('data:text/javascript;base64,'+Buffer.from(js).toString('base64'));
test('une reprise utilisateur prime sur une ancienne parole ou un geste tendre',()=>{
 for(const face of ['bouche_A','bisou_3','coeur_double_4','rire'])
  assert.equal(a.sequenceSatin({parle:true,ecoute:true,face,emotion:'joie'}),'ecoute');
 assert.equal(a.sequenceSatin({parle:true,ecoute:false,anime:false}),null);
});
test('les réactions restent contextuelles et les huit images d’un geste ont une même séquence',()=>{
 for(let i=1;i<=8;i++) {
  assert.equal(a.reactionSatin(`bisou_${i}`),'bisou');
  assert.equal(a.reactionSatin(`coeur_double_${i}`),'coeurs');
 }
 assert.equal(a.sequenceSatin({parle:true,ecoute:false,emotion:'triste'}),'parole');
 assert.equal(a.sequenceSatin({parle:true,ecoute:false,emotion:'joie'}),'joie');
 assert.equal(a.sequenceSatin({parle:false,ecoute:false,face:'yeux_ouverts'}),'ecoute');
 assert.equal(a.reactionSatin('pensive'),null);
 assert.equal(a.estSequenceSatin('../autre'),false);
});
test('toutes les séquences publiées sont décodables, à définition native et réellement sans piste audio',()=>{
 const base='public'+a.SATIN_BASE;
 for(const nom of a.SEQUENCES_SATIN){
  const d=JSON.parse(execFileSync('ffprobe',['-v','error','-show_streams','-show_format','-of','json',`${base}/${nom}.mp4`],{encoding:'utf8'}));
  assert.equal(d.streams.length,1,nom);
  const v=d.streams[0];assert.equal(v.codec_name,'h264');
  assert(v.width>=1080&&v.height>=1600,nom);
  assert(Number(d.format.duration)>3,nom);
 }
 assert(fs.existsSync('public'+a.SATIN_POSTER));
});
