import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import ts from 'typescript';
const module = {exports:{}};
const js = ts.transpileModule(fs.readFileSync('lib/recherche.ts','utf8'), {compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText;
new Function('require','module','exports',js)(name=>{assert.equal(name,'./nombre-env');return {nombreDeLEnvironnement:(value,fallback)=>Number(value)||fallback};},module,module.exports);
const {besoinDInternet,consigneDisponibiliteRecherche} = module.exports;
test('les demandes de recherche polies et orales joignent réellement le web',()=>{
 for(const question of [
  'Bia, peux-tu chercher sur Internet les horaires de la mairie ?',
  'Est-ce que tu peux vérifier sur internet cette annonce ?',
  'Tu pourrais regarder sur Google ce musée ?',
  'Fais une recherche sur le musée de Dakar',
  'Peux-tu faire une recherche sur les horaires du musée ?',
  'Cherche sur Internet une explication de ce phénomène',
  'Seetal ma ci internet musée bi',
 ]) assert.equal(besoinDInternet(question),true,question);
});
test('une conversation et une question sur les capacités ne lancent pas de recherche inutile',()=>{
 for(const question of ['Bonjour Bia','Tu as Internet ?','Peux-tu chercher sur Internet ?','Tu répètes que la recherche internet est indisponible','Explique cette addition','Je cherche mon téléphone','Corrige cette phrase','Comment on dit informatique en wolof ?'])
  assert.equal(besoinDInternet(question), question==='Peux-tu chercher sur Internet ?', question);
 assert.equal(besoinDInternet('Et demain ?', ['Quelle est la météo à Dakar ?']),true);
 assert.equal(besoinDInternet('Et demain ?', ['Bonjour']),false);
});
test('la consigne distingue la disponibilité et une consultation effectivement réalisée',()=>{
 assert.match(consigneDisponibiliteRecherche(true),/ACTIVÉE/);
 assert.match(consigneDisponibiliteRecherche(true),/absence d’outil/);
 assert.match(consigneDisponibiliteRecherche(true),/que si tu as reçu des résultats/);
 assert.match(consigneDisponibiliteRecherche(false),/NON CONFIGURÉE/);
});
