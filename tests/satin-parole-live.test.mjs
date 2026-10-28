import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import ts from 'typescript';
const source=fs.readFileSync('app/page.tsx','utf8');
const corps=/parle:actif=>\{([\s\S]*?)\n        \},/.exec(source)?.[1];
assert(corps,'Le rappel de lecture Live doit être présent');
const js=ts.transpileModule(fs.readFileSync('lib/animation-satin.ts','utf8'),{compilerOptions:{module:ts.ModuleKind.ESNext,target:ts.ScriptTarget.ES2022}}).outputText;
const a=await import('data:text/javascript;base64,'+Buffer.from(js).toString('base64'));
test('le vrai rappel Live débloque le portrait après une transcription partielle, sans effacer une nouvelle reprise',()=>{
 const m={},live={current:m},conv={current:true};let utilisateur=false,mode='listening';
 const cb=new Function('liveMaitreRef','moteur','conversationRef','setEntendParler','boucheSurLeSon','bouche','setMode','setFace',`let lectureBiaActive=false;return actif=>{${corps}}`)(live,m,conv,v=>utilisateur=v,v=>{if(v)mode='speaking';return true;},()=>{},v=>mode=v,()=>{});
 utilisateur=true; // premier texte utilisateur partiel ; fin pas encore reçue
 cb(true);
 assert.equal(utilisateur,false);
 assert.equal(a.sequenceSatin({parle:mode==='speaking',ecoute:utilisateur}),'parole');
 utilisateur=true; // nouvelle reprise alors que des paquets arrivent encore
 cb(true);assert.equal(utilisateur,true);
 assert.equal(a.sequenceSatin({parle:true,ecoute:utilisateur}),'ecoute');
 cb(false);assert.equal(mode,'listening');
 cb(true);assert.equal(utilisateur,false);
});
test('un court son commence dans la partie parlante, et non dans les premières secondes bouche fermée',()=>{
 const f=a.fenetreParoleSatin('parole');assert(f.debut>=3.5&&f.debut<4);assert(f.fin>f.debut);
 assert.equal(a.fenetreParoleSatin('ecoute'),null);
 assert.equal(a.fenetreParoleSatin('coeurs'),null);
});
