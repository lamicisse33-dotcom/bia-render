import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import ts from 'typescript';

const module = {exports:{}};
const source = fs.readFileSync('lib/etapes.ts','utf8');
const js = ts.transpileModule(source,{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText;
new Function('module','exports',js)(module,module.exports);
const {noterEtape,resumeEtapes} = module.exports;

test('model timing summary distinguishes Haiku and Sonnet without changing aggregate timings',()=>{
  noterEtape('modele',1000,2000,3000,80,'claude-haiku-5-5');
  noterEtape('modele',4000,6000,8000,80,'claude-sonnet-5-5');
  noterEtape('modele',9000,10000,12000,80,'claude-haiku-5-5');

  const mesures = resumeEtapes().modele;
  assert.equal(mesures.appels,3);
  assert.equal(mesures.premier_octet_ms,1000);
  assert.equal(mesures.par_modele['claude-haiku-5-5'].appels,2);
  assert.equal(mesures.par_modele['claude-haiku-5-5'].premier_octet_ms,1000);
  assert.equal(mesures.par_modele['claude-sonnet-5-5'].appels,1);
  assert.equal(mesures.par_modele['claude-sonnet-5-5'].premier_octet_ms,2000);
});
