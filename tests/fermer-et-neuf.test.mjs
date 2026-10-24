import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import ts from 'typescript';

const compile=s=>ts.transpileModule(s,{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText;
const sansCommentaires=s=>s.replace(/\/\*[\s\S]*?\*\//g,' ').replace(/(^|[^:])\/\/.*$/gm,'$1');
const lire=f=>sansCommentaires(fs.readFileSync(f,'utf8'));

/* ── (1) « C'EST FERMÉ » ALORS QUE LA FENÊTRE RESTE ────────────────────────

   Lamine, 24 octobre : « elle répond "c'est fermé" mais la fenêtre reste
   affichée — elle n'a aucun outil pour fermer, donc elle ment. » Même faute
   que la carte du 23 octobre : dire sans pouvoir faire. */

test('la fermeture existe sur les DEUX moteurs, et par le même chemin',()=>{
 const session=lire('app/api/gemini-live/session/route.ts');
 const client=lire('lib/gemini-live-client.ts');
 const chat=lire('app/api/chat/route.ts');
 const page=lire('app/page.tsx');
 assert.match(session,/name:'fermer_ecran'/,'l’outil doit être déclaré');
 assert.match(client,/call\.name==='fermer_ecran'/,'et servi par le client');
 assert.match(chat,/detacherFerme\(/,'Khalam doit avoir sa balise');
 /* Les deux entrées passent par la MÊME fonction : deux fermetures
    différentes finiraient par ne pas fermer la même chose. */
 assert.match(page,/fermer:\(quoi\)=>fermerCeQuiEstAffiche\(quoi\)/,'l’outil appelle la fonction partagée');
 assert.match(page,/fermerCeQuiEstAffiche\(aFermer\)/,'la balise aussi');
});

test('la fermeture rend ce qu’elle a VRAIMENT fermé, jamais une promesse',()=>{
 const page=fs.readFileSync('app/page.tsx','utf8');
 const bloc=page.slice(page.indexOf('const fermerCeQuiEstAffiche'));
 const corps=bloc.slice(0,bloc.indexOf('}, [revenir]);'));
 /* Elle construit une liste de ce qui était ouvert, et la rend. */
 assert.match(corps,/const ferme: string\[\] = \[\]/);
 assert.match(corps,/return ferme;/);
 /* Et elle ne pousse un nom que si l'écran était RÉELLEMENT affiché : sinon
    « c'est fermé » redeviendrait un mensonge, poli mais faux. */
 for(const quoi of ['carte','document','photo'])
  assert.ok(corps.includes('ferme.push("'+quoi+'")'),'doit déclarer avoir fermé : '+quoi);
 assert.match(corps,/if \(carteRef\.current\)/,'la carte n’est comptée que si elle était ouverte');
 assert.match(corps,/if \(ecranRef\.current\)/,'les images aussi');
});

test('sans outil de fermeture, elle doit refuser de dire que c’est fermé',()=>{
 const client=lire('lib/gemini-live-client.ts');
 assert.match(client,/Ne dis pas que c’est fermé/,
  'l’absence de l’outil doit interdire l’annonce');
 assert.match(client,/RIEN n’était ouvert/,
  'une liste vide doit être dite comme telle');
 const socle=fs.readFileSync('lib/socle-bia.ts','utf8').replace(/\s+/g,' ');
 assert.match(socle,/NE DIS JAMAIS « c'est fermé » SANS L'AVOIR FAIT/);
});

/* ── (2) LE NOUVEAU MESSAGE AFFICHAIT L'ANCIEN ────────────────────────────

   « Quand je demande ensuite un nouveau message pour un autre destinataire,
   elle affiche l'ANCIEN message et dit "c'est déjà écrit". »

   Deux causes : l'ancien document restait affichable, et surtout l'outil est
   appelé AVANT que la transcription du tour soit versée dans le fil — donc
   /api/document ne voyait que la conversation d'AVANT et réécrivait le
   message précédent, pour l'ancien destinataire. */

test('chaque demande d’écriture efface l’ancien document AVANT de fabriquer',()=>{
 const page=fs.readFileSync('app/page.tsx','utf8');
 const bloc=page.slice(page.indexOf('ecrire:async(sorte,consigne)=>{'));
 const corps=bloc.slice(0,bloc.indexOf('fabriquerPapier('));
 assert.match(corps,/setPapier\(null\)/,'l’ancien document doit être effacé');
 assert.match(corps,/papierRef\.current=null/,'et son témoin aussi');
 /* Le témoin est ce que l'outil relit pour répondre : s'il gardait l'ancien,
    elle dirait « c'est écrit » sur un document qui n'a pas été refait. */
 assert.match(corps,/papierOuvertId\.current=""/);
});

test('la demande est JOINTE au document : elle ne dépend plus du minutage',()=>{
 const page=lire('app/page.tsx');
 assert.match(page,/fabriquerPapier = useCallback\(async \(sorte: Sorte, demandeParLui = true, consigne = ""\)/,
  'fabriquerPapier doit accepter la consigne');
 assert.match(page,/consigne\s*\?\s*\[\.\.\.historyRef\.current\.slice\(-24\), \{ role: "user", text: consigne \}\]/,
  'la demande doit être ajoutée au fil envoyé à /api/document');
 const session=lire('app/api/gemini-live/session/route.ts');
 assert.match(session,/consigne:\{type:'STRING'/,'l’outil doit réclamer la consigne');
 assert.match(session,/CHAQUE appel écrit un document NEUF/,
  'et interdire explicitement « c’est déjà écrit »');
});

test('fermer un document l’efface, pour qu’il ne revienne pas à la demande suivante',()=>{
 const page=fs.readFileSync('app/page.tsx','utf8');
 const bloc=page.slice(page.indexOf('const fermerCeQuiEstAffiche'));
 const corps=bloc.slice(0,bloc.indexOf('}, [revenir]);'));
 const doc=corps.slice(corps.indexOf('quoi === "document"'));
 assert.match(doc,/setPapier\(null\); papierRef\.current = null/,
  'un document fermé ne doit plus pouvoir être réaffiché');
});

/* La balise ne doit jamais se faire prononcer, et une phrase ordinaire qui
   parle de fermer ne doit RIEN déclencher. */
test('la balise de fermeture est retirée du texte, et n’attrape pas une phrase ordinaire',()=>{
 const source=fs.readFileSync('app/api/chat/route.ts','utf8');
 const mod={exports:{}};
 new Function('module','exports',compile(
  source.match(/const FERME=[\s\S]*?\n\}/)[0]+'\nmodule.exports={detacherFerme};'))(mod,mod.exports);
 const {detacherFerme}=mod.exports;
 for(const [dit,attendu] of [
  ['[[ferme:document]] Voilà.','document'],
  ['Voilà. [[ ferme : carte ]]','carte'],
  ['[[ferme:tout]]','tout'],
 ]){
  const v=detacherFerme(dit);
  assert.equal(v.ferme,attendu,'doit reconnaître : '+dit);
  assert.doesNotMatch(v.texte,/\[\[|ferme\s*:/,'la balise ne doit plus être dite : '+dit);
 }
 for(const ordinaire of ['Ferme la porte derrière toi.','Le marché ferme à six heures.','ferme']){
  assert.equal(detacherFerme(ordinaire).ferme,'','ne doit rien déclencher : '+ordinaire);
 }
});
