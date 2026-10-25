import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';import ts from 'typescript';
async function load(p){return import('data:text/javascript;base64,'+Buffer.from(ts.transpileModule(fs.readFileSync(p,'utf8'),{compilerOptions:{module:ts.ModuleKind.ESNext,target:ts.ScriptTarget.ES2022}}).outputText).toString('base64'))}
const micro=await load('lib/micro.ts'),diff=await load('lib/diffusion.ts');
/* ── 25 OCTOBRE, MANDAT VITESSE : 600 MS, AVEC PROTECTION ────────────────

   Le 24 octobre, Lamine demandait 1 200 ms contre les coupures. Le mandat du
   25 demande 600 ms « avec protection des hésitations » ET « zéro coupure de
   la personne ». Ce qui était contradictoire, c'était un seuil FIXE : on
   choisissait entre couper les hésitants et faire attendre tout le monde.

   La règle éprouvée ici est la neuve : base 600 ms, et le seuil s'allonge de
   300 ms par coupure déjà subie dans cette conversation. La personne qu'on a
   coupée une fois est protégée davantage que celle qu'on n'a jamais coupée. */
test('base 600 ms, et le seuil s’allonge pour qui a déjà été coupé',()=>{
 for(const duration of [0,300,700,2500,7000,120000]){
  assert.equal(micro.silenceQuiSuffit(duration,0),600,'jamais coupé : 600 ms');
  assert.equal(micro.silenceQuiSuffit(duration,1),900,'coupé une fois : +300');
  assert.equal(micro.silenceQuiSuffit(duration,2),1200,'coupé deux fois');
  /* Et la protection est plafonnée : on ne laisse pas le seuil dériver
     jusqu'à donner l'impression que BIA ne répond plus. */
  assert.equal(micro.silenceQuiSuffit(duration,50),1800,'plafonné');
  /* La valeur du serveur l'emporte sur le repli, et la protection s'y
     ajoute de la même façon. */
  assert.equal(micro.silenceQuiSuffit(duration,0,1200),1200);
  assert.equal(micro.silenceQuiSuffit(duration,1,1200),1500);
  /* Hors bornes ou absurde : on reprend le repli. */
  assert.equal(micro.silenceQuiSuffit(duration,0,120),600);
  assert.equal(micro.silenceQuiSuffit(duration,0,NaN),600);
 }
});
test('a short complete useful sentence can start before the next sentence without speaking partial text or commands',()=>{assert.equal(diff.teteDeLaReponse('Tu peux essayer.'),'Tu peux essayer.');assert.equal(diff.teteDeLaReponse('Tu peux essayer'), '');assert.equal(diff.teteDeLaReponse('[[carte:Dakar]] Tu peux essayer.'),'');assert.equal(diff.resteADire('Tu peux essayer. Ensuite, appelle-la.','Tu peux essayer.'),'Ensuite, appelle-la.')});

