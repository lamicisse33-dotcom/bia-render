import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import ts from 'typescript';

const compile=s=>ts.transpileModule(s,{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText;
const sansCommentaires=s=>s.replace(/\/\*[\s\S]*?\*\//g,' ').replace(/(^|[^:])\/\/.*$/gm,'$1');
const lire=f=>sansCommentaires(fs.readFileSync(f,'utf8'));

/* ── « LECTURE DE DOCUMENTS : VÉRIFIER SI ELLE MARCHE ; SINON LA CONSTRUIRE »
     et « TRADUCTION : L'OUVRIR DANS LA CONVERSATION, PAS SEULEMENT PAR LE
     BOUTON » — Lamine, 24 octobre 2026.

   Ce que la vérification a donné : /api/papier-photo et /api/traduire
   marchent depuis septembre, mais les DEUX n'étaient atteignables que par un
   bouton. À la voix, « lis-moi ce papier » n'avait aucune réponse, ni sur
   Khalam ni sur Khalam Rapide. */

test('les deux routes qui lisent un papier existent toujours et exigent le code',()=>{
 for(const f of ['app/api/papier-photo/route.ts','app/api/traduire/route.ts']){
  const code=lire(f);
  assert.match(code,/verifierCode\(/,f+' doit exiger un code');
  assert.match(code,/erreur:\s*"code"/,f+' doit refuser sans code');
 }
});

test('Khalam Rapide a enfin les deux outils, et le client sait les servir',()=>{
 const session=lire('app/api/gemini-live/session/route.ts');
 const client=lire('lib/gemini-live-client.ts');
 for(const outil of ['lire_un_papier','lire_en_wolof']){
  assert.match(session,new RegExp("name:'"+outil+"'"),outil+' doit être déclaré');
  assert.match(client,new RegExp(outil),outil+' doit être servi par le client');
 }
 assert.match(client,/'\/api\/papier-photo'|events\.photo/,'la photo passe par la page');
 assert.match(client,/'\/api\/traduire'/,'la lecture en wolof passe par sa route');
});

test('Khalam a la balise, et la page ouvre vraiment l’appareil photo',()=>{
 const chat=lire('app/api/chat/route.ts');
 const page=lire('app/page.tsx');
 assert.match(chat,/detacherPhoto\(/,'la balise doit être détachée du texte parlé');
 assert.match(chat,/photo:true/,'et remontée au téléphone');
 assert.match(page,/data as \{photo\?:boolean\}\)\.photo/,'la page doit lire ce drapeau');
 assert.match(page,/photoRef\.current\?\.click\(\)/,'et ouvrir le champ de photo');
});

/* RÈGLE 2 : une balise qui reste dans la phrase se fait PRONONCER. Le
   15 septembre, « mail » manquait dans ce filtre et BIA s'est mise à écrire
   le mail à la main dans la conversation. */
test('la balise de photo ne peut pas se prononcer : elle est retirée du texte',()=>{
 const source=fs.readFileSync('app/api/chat/route.ts','utf8');
 const m=source.match(/function detacherPhoto\(texte:string\)\{[\s\S]*?\n\}/);
 assert(m,'detacherPhoto doit exister');
 const mod={exports:{}};
 new Function('module','exports',compile(
  source.match(/const PHOTO=[\s\S]*?\n\}/)[0]+'\nmodule.exports={detacherPhoto,PHOTO};'))(mod,mod.exports);
 const {detacherPhoto}=mod.exports;
 for(const dit of ['[[photo]] Donne-moi le papier.','Donne-moi le papier. [[ photo ]]','[photo]']){
  const v=detacherPhoto(dit);
  assert.equal(v.photo,true,'doit être reconnue : '+dit);
  assert.doesNotMatch(v.texte,/photo\s*\]/,'la balise ne doit plus être dans ce qu’elle dit : '+dit);
  assert.doesNotMatch(v.texte,/\[\[/,'aucun crochet ne reste : '+dit);
 }
 /* Et une phrase ordinaire qui parle de photo ne déclenche RIEN : sinon
    « envoie-moi la photo » ouvrirait l'appareil sans qu'on l'ait demandé. */
 for(const ordinaire of ['Je prends une photo du marché.','Envoie-moi la photo.','photo']){
  assert.equal(detacherPhoto(ordinaire).photo,false,'ne doit rien déclencher : '+ordinaire);
 }
});

test('la consigne PARTAGÉE enseigne les deux chemins, et interdit de commenter le papier',()=>{
 const socle=fs.readFileSync('lib/socle-bia.ts','utf8');
 assert.match(socle,/lire_un_papier/,'l’outil est nommé dans le socle partagé');
 assert.match(socle,/lire_en_wolof/);
 assert.match(socle,/\[\[photo\]\]/,'la balise aussi');
 /* On vise une phrase qui ne peut pas se couper : la mienne tombait sur un
    retour à la ligne (« pas\nde conseil ») et accusait le socle à tort. Un
    motif qui dépend de la mise en page d'un texte est un motif faux. */
 assert.match(socle,/NE COMMENTES PAS LE PAPIER/,'l’interdiction de commenter doit être écrite');
 assert.match(socle.replace(/\s+/g,' '),/pas de conseil, pas d'avis/,'et détaillée');
 /* Un seul socle pour les deux moteurs : c'est sa règle prioritaire. */
 const live=fs.readFileSync('lib/gemini-live-prompt.ts','utf8');
 assert.match(live,/SOCLE_BIA/,'Khalam Rapide lit le même socle, pas une copie');
});

test('la photo rendue à BIA n’est pas prononcée deux fois',()=>{
 const page=lire('app/page.tsx');
 const m=page.match(/const photographierPourBia[\s\S]*?\n  \}, \[\]\);/);
 assert(m,'photographierPourBia doit exister');
 const corps=m[0];
 /* Sur Khalam Rapide c'est BIA qui parle : si la page prononçait AUSSI le
    texte, deux voix se chevaucheraient. Elle rend le texte, elle ne le dit
    pas. */
 assert.doesNotMatch(corps,/\bspeak\(/,'cette fonction ne doit jamais parler');
 assert.match(corps,/setHistory/,'mais elle garde le français dans le fil, comme le bouton');
 assert.match(corps,/120000/,'et elle lâche la promesse au bout de deux minutes');
});
