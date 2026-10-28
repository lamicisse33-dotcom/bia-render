import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import ts from 'typescript';

function load(path,deps={}){const m={exports:{}};const code=ts.transpileModule(fs.readFileSync(path,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText;new Function('require','module','exports',code)(id=>{assert(id in deps,id);return deps[id];},m,m.exports);return m.exports;}
const normaliser=load('lib/normaliser.ts');
const reflexion=load('lib/reflechir.ts',{'./normaliser':normaliser});
const {choisirModeleConversation,cerveauDuTour,cerveauDeLEcrit,resumeCerveauEcrit}=load('lib/routage-cerveaux.ts',{'./reflechir':reflexion,'./normaliser':normaliser});
const choisir=(question,options={})=>choisirModeleConversation(question,{modeleConfigure:'claude-sonnet-5-5',...options});

test('Haiku handles short everyday turns without adding a classifier call',()=>{
 for(const question of ['Naka nga def ?', 'Je suis fatigué aujourd’hui.', 'Dama sonn tey.'])assert.equal(choisir(question),'claude-haiku-5-5',question);
});

test('Sonnet keeps learned language, complex reasoning, actions, and longer context',()=>{
 for(const question of ['Traduis-moi bonjour en wolof.', 'Pourquoi la tomate a-t-elle ce prix ?', 'Si je travaille 21 jours, combien vais-je gagner ?', 'Mémorise cette correction.', 'Je dois choisir un traitement et je ne sais pas lequel prendre.'])assert.equal(choisir(question),'claude-sonnet-5-5',question);
 assert.equal(choisir('Naka nga def ?', {apprentissage:true}),'claude-sonnet-5-5');
 assert.equal(choisir('Naka nga def ?', {avecOutil:true}),'claude-sonnet-5-5');
});

test('manual model trials and custom model configuration remain authoritative',()=>{
 assert.equal(choisir('Explique un calcul compliqué.',{profil:'haiku'}),'claude-haiku-5-5');
 assert.equal(choisir('Naka nga def ?',{profil:'sonnet'}),'claude-sonnet-5-5');
 assert.equal(choisir('Naka nga def ?',{profil:'sonnet-segment-1500'}),'claude-sonnet-5-5');
 assert.equal(choisir('Naka nga def ?',{profil:'segment-2500'}),'claude-haiku-5-5');
 assert.equal(choisir('Traduis-moi bonjour en wolof.',{profil:'segment-2500'}),'claude-sonnet-5-5');
 assert.equal(choisir('Naka nga def ?',{modeleConfigure:'custom-model'}),'custom-model');
});

/* ── LE CERVEAU DE LA FENÊTRE ÉCRITE ───────────────────────────────────────

   Lamine, le 27 octobre 2026 : un petit moteur pour la fenêtre de discussion
   texte UNIQUEMENT, parce que le serveur d'hébergement de Khalam est en
   panne. Deux interdits à tenir, et ce sont eux qui comptent : la voix ne
   doit jamais suivre ce réglage, et une variable absente ne doit RIEN
   changer — sinon un réglage oublié déplacerait son cerveau en silence. */
test('la voix ne voit jamais le cerveau réservé à la fenêtre écrite',()=>{
 assert.equal(cerveauDuTour({ecrit:false,global:'anthropic',pourLEcrit:'groq'}),'anthropic');
 /* Même sans drapeau du tout : l'absence vaut « parlé ». */
 assert.equal(cerveauDuTour({global:'anthropic',pourLEcrit:'groq'}),'anthropic');
 /* Et la voix suit toujours SA variable à elle. */
 assert.equal(cerveauDuTour({ecrit:false,global:'cerebras',pourLEcrit:'groq'}),'cerebras');
});

test('la fenêtre écrite suit son propre cerveau quand il est posé',()=>{
 assert.equal(cerveauDuTour({ecrit:true,global:'anthropic',pourLEcrit:'groq'}),'groq');
 assert.equal(cerveauDuTour({ecrit:true,global:'anthropic',pourLEcrit:'local'}),'local');
 /* Majuscules et espaces d'un copier-coller depuis Render ne cassent rien. */
 assert.equal(cerveauDuTour({ecrit:true,global:'anthropic',pourLEcrit:'  GROQ '}),'groq');
});

test('une variable absente, vide ou faite d’espaces ne change rien',()=>{
 for(const rien of [undefined,'','   ','\t'])
  assert.equal(cerveauDuTour({ecrit:true,global:'anthropic',pourLEcrit:rien}),'anthropic',JSON.stringify(rien));
 /* Et sans cerveau global non plus : le défaut d'avant tient. */
 assert.equal(cerveauDuTour({ecrit:true}),'anthropic');
 assert.equal(cerveauDuTour({ecrit:false}),'anthropic');
 assert.equal(cerveauDuTour({ecrit:true,global:'   '}),'anthropic');
});

/* ── LE REPLI, POUR QUE L'ÉCRIT RÉPONDE TOUJOURS ───────────────────────────

   Lamine, le 28 octobre 2026 au soir, après deux heures de fenêtre écrite
   muette : « en attendant, REPLI AUTOMATIQUE sur le cerveau ordinaire pour
   que l'écrit réponde toujours. »

   Le danger qu'on ferme ici : poser `BIA_LLM_PROVIDER_ECRIT` sans poser la
   clé qui va avec rendait la fenêtre écrite muette d'une seule variable, et
   pour toujours. Une variable mal posée ne doit jamais pouvoir faire ça. */
const toutesLesCles=()=>true;
const aucuneCle=(f)=>f==='anthropic';

test('le cerveau de l’écrit sans sa clé se replie sur le cerveau ordinaire',()=>{
 const r=cerveauDeLEcrit({ecrit:true,global:'anthropic',pourLEcrit:'gemini',aLaCle:aucuneCle});
 assert.equal(r.fournisseur,'anthropic','elle doit répondre quand même');
 assert.deepEqual(r.repli,{voulu:'gemini',motif:'cle_absente'});
 /* Et le repli est COMPTÉ : « ça répond » ne doit pas cacher « ça ne répond
    pas avec ce que tu croyais ». */
 const vu=resumeCerveauEcrit();
 assert(vu.replis>=1);
 assert.equal(vu.voulu,'gemini');
 assert.equal(vu.variable,'BIA_LLM_PROVIDER_ECRIT');
});

test('quand la clé est là, le cerveau choisi est respecté et rien ne se replie',()=>{
 const r=cerveauDeLEcrit({ecrit:true,global:'anthropic',pourLEcrit:'gemini',aLaCle:toutesLesCles});
 assert.equal(r.fournisseur,'gemini');
 assert.equal(r.repli,null);
});

test('la voix ne se replie jamais : elle ne porte pas le drapeau de l’écrit',()=>{
 const r=cerveauDeLEcrit({ecrit:false,global:'gemini',pourLEcrit:'groq',aLaCle:aucuneCle});
 assert.equal(r.fournisseur,'gemini','le cerveau global de la voix reste le sien, clé ou pas');
 assert.equal(r.repli,null);
});

test('on ne replie pas vers un cerveau qui n’a pas sa clé non plus',()=>{
 /* Sinon on remplacerait une panne par la même panne, en cachant la
    première — et la raison affichée serait fausse. */
 const r=cerveauDeLEcrit({ecrit:true,global:'anthropic',pourLEcrit:'gemini',aLaCle:()=>false});
 assert.equal(r.fournisseur,'gemini');
 assert.equal(r.repli,null);
});

test('aucune variable posée : la fenêtre écrite garde le cerveau ordinaire',()=>{
 const r=cerveauDeLEcrit({ecrit:true,global:'',pourLEcrit:'',aLaCle:toutesLesCles});
 assert.equal(r.fournisseur,'anthropic');
 assert.equal(r.repli,null);
});
