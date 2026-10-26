import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import ts from 'typescript';
function load(path,imports={}){const m={exports:{}};new Function('require','module','exports',ts.transpileModule(fs.readFileSync(path,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText)(id=>{assert(id in imports,id);return imports[id];},m,m.exports);return m.exports;}
const {creerEcouteProgressive}=load('lib/ecoute-progressive.ts',{'./ecoute-longue':load('lib/ecoute-longue.ts'),'./premier-segment':load('lib/premier-segment.ts')});
function pipeline(){
 const clips=[];
 const p=creerEcouteProgressive(async f=>{
  const bytes=await f.get('audio').arrayBuffer(),v=new DataView(bytes);let voiced=false;
  for(let i=44;i<bytes.byteLength;i+=2)if(v.getInt16(i,true)!==0)voiced=true;
  clips.push({voiced,frames:(bytes.byteLength-44)/2});
  return Response.json({texte:voiced?'Bonjour, je parle français.':'Texte inventé sur silence.'});
 },()=> 'fr',()=>true,()=>{});
 return {p,clips};
}
const voice=()=>new Float32Array(4000).fill(.2),quiet=()=>new Float32Array(4000);
/* ── CE QUI EST GARDÉ, ET CE QUI N'ÉTAIT QUE LE SEUIL DE 4 s ──────────────

   La garantie de ces deux épreuves est qu'une queue de SILENCE ne part jamais
   seule à l'ASR — « une ASR générative invente des mots sur du silence ».
   Elle est intacte : aucun clip muet, aucun mot inventé dans le résultat.

   Ce qui change le 23 octobre 2026 : deux secondes de parole produisent
   maintenant DEUX clips vocaux — un à 1,5 s pendant la parole, un à la pause
   — là où le seuil de 4 s n'en produisait qu'un, à la pause, trop tard pour
   préparer quoi que ce soit. Voir lib/premier-segment.ts. Le compte de clips
   était la conséquence du seuil, pas la garantie. */
test('a silence-only final tail cannot append invented words to recognized French',async()=>{
 const {p,clips}=pipeline();
 for(let i=0;i<8;i++)p.pousser(voice(),true);
 for(let i=0;i<8;i++)p.pousser(quiet(),false);
 const r=await p.finir();
 assert(!r.texte.includes('inventé'),r.texte);
 assert.equal(clips.length,2,'un pendant la parole, un à la pause');
 assert(clips.every(c=>c.voiced),'aucun clip muet ne part à l’ASR');
});
test('a long quiet tail cannot trigger another recognition of its own',async()=>{
 const {p,clips}=pipeline();
 for(let i=0;i<8;i++)p.pousser(voice(),true);
 for(let i=0;i<24;i++)p.pousser(quiet(),false);
 await p.finir();
 assert.equal(clips.length,2,'les six secondes de silence n’ajoutent aucun clip');
 assert(clips.every(c=>c.voiced));
});
test('a resumed utterance in the final buffer is still recognized',async()=>{
 const {p,clips}=pipeline();
 for(let i=0;i<8;i++)p.pousser(voice(),true);
 for(let i=0;i<4;i++)p.pousser(quiet(),false);
 p.pousser(voice(),true);
 /* Trois clips depuis le seuil de 1,5 s : un pendant la parole, un à la
    pause, un pour la reprise. La garantie est que la REPRISE est reconnue et
    qu'aucun clip muet ne part — pas qu'il y en ait exactement deux. */
 const r=await p.finir();assert.equal(clips.length,3);assert(clips.every(c=>c.voiced));
 assert.equal(r.texte,'Bonjour, je parle français. Bonjour, je parle français. Bonjour, je parle français.');
});
test('continuous speech crossing forced cuts preserves every audio sample',async()=>{
 const {p,clips}=pipeline();for(let i=0;i<32;i++)p.pousser(voice(),true);
 await p.finir();assert.equal(clips.reduce((n,c)=>n+c.frames,0),128000);assert(clips.every(c=>c.voiced));
});

/* ── LA PART SERVEUR DE LA TRANSCRIPTION, QUI VALAIT 0 POUR RIEN ───────────

   Manche du 26 octobre : « la transcription, part SERVEUR (l'oreille
   elle-même) » sortait à 0 ms de médiane sur 10 tours sur 11. L'oreille n'est
   pas instantanée : le chemin progressif assemble son résultat dans le
   téléphone et jetait le `chronometrage` que /api/ecouter renvoie à chaque
   segment. Lamine ne pouvait donc pas savoir, dans T1→T3, ce qui est l'oreille
   et ce qui est le réseau. Ce filet exige que la durée remonte — et que ce
   soit celle du DERNIER segment, le seul qui retienne la fin.             */
test('le chemin progressif rend la durée déclarée par le serveur, celle du dernier segment',async()=>{
 const vus=[];
 const p=creerEcouteProgressive(async f=>{
  const bytes=await f.get('audio').arrayBuffer(),v=new DataView(bytes);let voiced=false;
  for(let i=44;i<bytes.byteLength;i+=2)if(v.getInt16(i,true)!==0)voiced=true;
  vus.push(voiced);
  // Le premier segment a tourné pendant qu'il parlait ; le dernier retient T3.
  return Response.json({texte:'Bonjour.',chronometrage:{total_ms:vus.length===1?900:412}});
 },()=> 'fr',()=>true,()=>{});
 for(let i=0;i<8;i++)p.pousser(new Float32Array(4000).fill(.2),true);
 for(let i=0;i<8;i++)p.pousser(new Float32Array(4000),false);
 const r=await p.finir();
 assert.equal(vus.length,2,'deux segments : un pendant la parole, un à la pause');
 assert.equal(r.chronometrage.total_ms,412,'c’est le dernier segment qui compte, pas le premier');
});

test('un serveur muet sur son chronométrage ne fabrique pas une durée',async()=>{
 const p=creerEcouteProgressive(async()=>Response.json({texte:'Bonjour.'}),
  ()=> 'fr',()=>true,()=>{});
 for(let i=0;i<8;i++)p.pousser(new Float32Array(4000).fill(.2),true);
 for(let i=0;i<8;i++)p.pousser(new Float32Array(4000),false);
 const r=await p.finir();
 assert.equal(r.chronometrage.total_ms,0,'zéro, et tout T1→T3 reste du côté réseau');
});
