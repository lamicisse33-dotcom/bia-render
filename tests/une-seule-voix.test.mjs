import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import ts from 'typescript';

const compile=s=>ts.transpileModule(s,{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText;
function charger(chemin,permis=[]){
 const m={exports:{}};
 new Function('require','module','exports','process',compile(fs.readFileSync(chemin,'utf8')))(
  id=>{assert.ok(permis.includes(id),chemin+' ne doit pas importer : '+id);return {};},m,m.exports,process);
 return m.exports;
}
const sansCommentaires=s=>s.replace(/\/\*[\s\S]*?\*\//g,' ').replace(/(^|[^:])\/\/.*$/gm,'$1');
const lire=f=>sansCommentaires(fs.readFileSync(f,'utf8'));
const frais=()=>{delete globalThis.biaVoixPage;return charger('lib/voix-page.ts');};

/* ── « EN MODE KHALAM RAPIDE, UNE SEULE VOIX, LA SIENNE » ──────────────────

   Lamine, 24 octobre 2026 : « quand la carte s'affiche ou quand elle écrit
   un message, la voix de Kha parle EN MÊME TEMPS que la voix de Khalam
   Rapide ». Les écrans de BIA ont leur propre voix depuis septembre — c'est
   juste sur Khalam, où c'est LA MÊME voix que la conversation. Sur la
   connexion rapide, les deux se télescopent. */

test('pendant une session Khalam Rapide, la page ne prononce rien',()=>{
 const V=frais();
 /* Hors session : tout passe, et Khalam garde sa voix entière. */
 assert.equal(V.pageeutParler('voix:réponse'),true);
 assert.equal(V.pageeutParler('carte:guidage'),true);
 assert.equal(V.pageeutParler('son_enregistre:jecris'),true);

 V.sessionRapide(true);
 /* Session ouverte : plus un son, et surtout par TOUS les chemins — pas
    seulement ceux qu'on connaît aujourd'hui. */
 for(const chemin of ['voix:réponse','voix:guidage','voix:lecture','carte:guidage',
                      'son_enregistre:jecris','son_enregistre:attente',
                      'un_chemin_inventé_demain']){
  assert.equal(V.pageeutParler(chemin),false,'doit se taire : '+chemin);
 }
 const r=V.resumeVoixPage();
 assert.equal(r.session_rapide_ouverte,true);
 assert.equal(r.paroles_refusees,7);
 /* Un refus n'est jamais anonyme : on doit pouvoir nommer le chemin fautif. */
 assert.equal(r.par_chemin['carte:guidage'],1);
 assert.equal(r.par_chemin['son_enregistre:jecris'],1);

 V.sessionRapide(false);
 assert.equal(V.pageeutParler('voix:réponse'),true,'la session fermée, Khalam reparle');
});

test('lib/voix-page.ts n’importe rien : une épreuve le charge seul',()=>{
 assert.doesNotMatch(lire('lib/voix-page.ts'),/\bimport\s/);
 assert.doesNotMatch(lire('lib/voix-page.ts'),/\brequire\s*\(/);
});

/* ── LA GARDE DOIT ÊTRE À L'ENTRÉE, PAS À CÔTÉ ──────────────────────────── */
test('les deux portes de la voix de la page sont gardées',()=>{
 const page=lire('app/page.tsx');
 /* La garde s'atteint par globalThis, et PAS par un import : dix-sept
    épreuves extraient le corps de speak() et lui fournissent son décor nom
    par nom. Un nom neuf dans ces lignes est un nom qu'on oubliera. */
 const speak=page.slice(page.indexOf('const speak = useCallback'));
 assert.match(speak.slice(0,1400),/biaVoixPage\?\.peutParler\?\.\("voix:/,
  'speak() doit refuser pendant une session rapide');
 /* direEnregistre() : les sons enregistrés de Kha, dont « j’écris ». */
 const dire=page.slice(page.indexOf('const direEnregistre = useCallback'));
 assert.match(dire.slice(0,800),/biaVoixPage\?\.peutParler\?\.\("son_enregistre:/,
  'direEnregistre() doit refuser pendant une session rapide');
 /* Et aucun nom importé ne doit entrer dans ces deux fonctions. */
 assert.doesNotMatch(speak.slice(0,1400),/[^.]\bpageeutParler\(/,
  'pas de nom neuf dans speak() : les décors d’épreuve ne le connaîtraient pas');
 /* Et la carte, qui a sa propre voix enregistrée. */
 assert.match(lire('app/carte/Carte.tsx'),/pageeutParler\("carte:guidage"\)/);
});

test('l’interrupteur suit vraiment la session : ouvert au démarrage, fermé à l’arrêt',()=>{
 const page=lire('app/page.tsx');
 assert.match(page,/liveMaitreRef\.current=moteur;sessionRapide\(true\)/,
  'la session ouverte doit poser l’interrupteur');
 const fermetures=[...page.matchAll(/liveMaitreRef\.current=null;/g)];
 assert.ok(fermetures.length>=3,'toutes les fermetures doivent être couvertes');
 /* Chaque remise à null doit être suivie de sessionRapide(false) : une seule
    oubliée, et la page resterait muette pour toujours après un arrêt. */
 const oubliees=[...page.matchAll(/liveMaitreRef\.current=null;(?!sessionRapide\(false\))/g)];
 assert.equal(oubliees.length,0,
  'une fermeture sans sessionRapide(false) laisserait Khalam muet : '+oubliees.length);
});

/* ── ET LA CARTE CONTINUE D'AFFICHER CE QU'ELLE NE DIT PLUS ──────────────── */
test('la carte muette écrit quand même l’instruction à l’écran',()=>{
 const carte=fs.readFileSync('app/carte/Carte.tsx','utf8');
 const bloc=carte.slice(carte.indexOf('if (!pageeutParler("carte:guidage"))'));
 assert.match(bloc.slice(0,700),/onDitTexte\(dit\)/,
  'sans voix, le virage doit rester LISIBLE : on perd la voix, pas l’instruction');
});
