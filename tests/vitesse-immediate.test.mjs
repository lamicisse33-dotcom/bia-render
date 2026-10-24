import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';import ts from 'typescript';
async function load(p){return import('data:text/javascript;base64,'+Buffer.from(ts.transpileModule(fs.readFileSync(p,'utf8'),{compilerOptions:{module:ts.ModuleKind.ESNext,target:ts.ScriptTarget.ES2022}}).outputText).toString('base64'))}
const micro=await load('lib/micro.ts'),diff=await load('lib/diffusion.ts');
/* 24 octobre 2026 : Lamine revient sur ses 400 ms du 20 octobre — « elle ne
   doit JAMAIS répondre tant que je parle ou que je fais une pause pour
   réfléchir ». On n'éprouve donc plus un nombre, on éprouve la RÈGLE : une
   pause d'une seconde ne ferme pas le micro, quelle que soit la longueur de
   la phrase et quel que soit le compteur de coupures. */
test('une pause d’une seconde ne ferme jamais le micro, et le réglage demandé l’emporte',()=>{
 for(const duration of [0,300,700,2500,7000,120000])for(const cuts of [0,2,100]){
  assert.ok(micro.silenceQuiSuffit(duration,cuts)>1000,'une pause d’une seconde doit survivre');
  assert.equal(micro.silenceQuiSuffit(duration,cuts),1200);
  /* La vraie valeur vient du serveur ; elle doit l'emporter sur le repli. */
  assert.equal(micro.silenceQuiSuffit(duration,cuts,1500),1500);
  /* Hors bornes ou absurde : on reprend le repli plutôt que de laisser
     passer un seuil qui rouvrirait le défaut. */
  assert.equal(micro.silenceQuiSuffit(duration,cuts,120),1200);
  assert.equal(micro.silenceQuiSuffit(duration,cuts,NaN),1200);
 }
});
test('a short complete useful sentence can start before the next sentence without speaking partial text or commands',()=>{assert.equal(diff.teteDeLaReponse('Tu peux essayer.'),'Tu peux essayer.');assert.equal(diff.teteDeLaReponse('Tu peux essayer'), '');assert.equal(diff.teteDeLaReponse('[[carte:Dakar]] Tu peux essayer.'),'');assert.equal(diff.resteADire('Tu peux essayer. Ensuite, appelle-la.','Tu peux essayer.'),'Ensuite, appelle-la.')});

