import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import ts from 'typescript';

const compile=s=>ts.transpileModule(s,{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText;
const sansCommentaires=s=>s.replace(/\/\*[\s\S]*?\*\//g,' ').replace(/(^|[^:])\/\/.*$/gm,'$1');
const lire=f=>sansCommentaires(fs.readFileSync(f,'utf8'));
function charger(chemin,permis=[]){
 const m={exports:{}};
 new Function('require','module','exports','process',compile(fs.readFileSync(chemin,'utf8')))(
  id=>{assert.ok(permis.includes(id),chemin+' ne doit pas importer : '+id);return {};},m,m.exports,process);
 return m.exports;
}

/* ── « CE MESSAGE DE GOOGLE NE DOIT PLUS JAMAIS S'AFFICHER » ──────────────

   Lamine, 25 octobre. Il avait raison de le réclamer, et c'est moi qui
   l'avais mis à l'écran : la veille, pour pouvoir nommer la cause d'une
   fermeture, j'avais ajouté le motif brut de Google dans le message affiché.
   Le motif reste — il part dans /api/etat, c'est là qu'il sert — mais il ne
   se montre plus. */

test('aucun chemin ne peut afficher le texte brut de Google',()=>{
 const client=lire('lib/gemini-live-client.ts');
 /* Le motif de fermeture et l'erreur de Google ne doivent apparaître dans
    AUCUN appel aux événements montrés à l'écran. */
 for(const montre of ['events.erreur(','events.etat(']){
  const appels=[...client.matchAll(new RegExp(montre.replace(/[.()]/g,'\\$&')+'([^)]*)\\)','g'))].map(m=>m[1]);
  for(const a of appels){
   assert.ok(!/motif|erreurGoogle|e\?\.reason|d\.error/.test(a),
    'un texte de Google part à l’écran : '+montre+a);
  }
 }
 /* Et la phrase de repli est écrite UNE fois : plusieurs variantes
    finiraient par diverger, et l'une d'elles laisserait passer l'anglais. */
 const phrases=[...client.matchAll(/Khalam Rapide est indisponible[^"']*/g)];
 assert.equal(phrases.length,1,'la phrase de repli doit être écrite une seule fois');
 assert.match(client,/const INDISPONIBLE=/);
});

test('la phrase est exactement celle qu’il a demandée',()=>{
 const client=fs.readFileSync('lib/gemini-live-client.ts','utf8');
 const m=client.match(/const INDISPONIBLE="([^"]+)"/);
 assert.ok(m,'la phrase doit être une constante');
 assert.match(m[1],/Khalam Rapide est indisponible pour le moment/);
 assert.match(m[1],/je passe sur Khalam/);
});

test('un refus fait BASCULER, et la bascule est gardée sur le téléphone',()=>{
 const page=lire('app/page.tsx');
 const bloc=page.slice(page.indexOf('indisponible:(message:string)=>{'));
 const corps=bloc.slice(0,bloc.indexOf('},'));
 /* La session rapide est arrêtée pour de bon… */
 assert.match(corps,/liveMaitreRef\.current=null/);
 assert.match(corps,/sessionRapide\(false\)/,'sinon la page resterait muette');
 /* …le mode passe sur Khalam, et c'est GARDÉ : sans ça, le prochain appui
    retomberait sur la connexion refusée, et il verrait le même échec en
    boucle. */
 assert.match(corps,/poserMode\(false,true\)/,'la bascule doit être gardée');
 /* Et la phrase vient du client, pas d'une seconde écrite ici. */
 assert.match(corps,/setPanne\(message\)/);
});

/* ── COMBIEN DE SESSIONS, ET PAR QUI ─────────────────────────────────────── */
test('les ouvertures sont comptées par origine, et un nom inventé n’entre pas',()=>{
 delete globalThis.biaSessionsLive;
 const S=charger('lib/sessions-live-etat.ts',[]);
 assert.equal(S.resumeSessionsLive().depuis_minuit.total,0);
 S.noterSessionLive('telephone');
 S.noterSessionLive('telephone');
 S.noterSessionLive('essai');
 S.noterSessionLive('je-suis-un-client-bricole');
 const v=S.resumeSessionsLive().depuis_minuit;
 assert.equal(v.total,4);
 assert.equal(v.par_origine.telephone,2);
 assert.equal(v.par_origine.essai,1);
 assert.equal(v.par_origine.inconnue,1,'un nom inventé tombe dans « inconnue », il ne crée pas de colonne');
 assert.equal(v.par_origine['je-suis-un-client-bricole'],undefined);
 /* Le refus de quota est compté À PART : c'est lui qui dit si le quota est
    épuisé, et il ne doit pas se confondre avec les ouvertures. */
 S.noterRefusQuota();
 assert.equal(S.resumeSessionsLive().depuis_minuit.refus_1011,1);
 assert.equal(S.resumeSessionsLive().depuis_minuit.total,4,'un refus n’est pas une ouverture de plus');
});

test('le compteur dit d’où il compte, pour qu’un total bas ne rassure pas à tort',()=>{
 delete globalThis.biaSessionsLive;
 const S=charger('lib/sessions-live-etat.ts',[]);
 S.noterSessionLive('telephone');
 const v=S.resumeSessionsLive();
 assert.ok(v.depuis_minuit.premiere,'l’heure du premier compte doit être dite');
 assert.match(v.limite,/dernier démarrage/i,
  'un total bas peut vouloir dire « instance jeune » : il faut le dire');
});

/* ── LA ROUTE D'ESSAI NE DOIT PLUS POUVOIR COÛTER CHER ───────────────────── */
test('l’essai n’ouvre qu’UNE session par défaut, et il est plafonné',()=>{
 const essai=lire('app/api/gemini-live/essai/route.ts');
 /* Neuf variantes ne partent que si on les demande explicitement. */
 assert.match(essai,/toutes \? variantes\(modele\) : variantes\(modele\)\.filter\(\(v\) => v\.nom === "nu"\)/,
  'une seule variante par défaut');
 assert.match(essai,/const PLAFOND_JOUR = 20/);
 assert.match(essai,/plafond de \$\{PLAFOND_JOUR\} poignées de main par jour/);
 /* Et chaque poignée de main est comptée AVANT la demande : un refus
    consomme le quota autant qu'une réussite. */
 assert.match(essai,/noterSessionLive\("essai"\)/);
});

test('la session de production compte ses ouvertures et ses refus de quota',()=>{
 const session=lire('app/api/gemini-live/session/route.ts');
 assert.match(session,/noterSessionLive\('telephone'\)/);
 assert.match(session,/r\.status===429\)noterRefusQuota\(\)/,
  'un 429 est un refus de quota, et il doit être compté à part');
 /* Comptée avant l'appel : ne compter que les réussites ferait croire qu'on
    n'a rien demandé. */
 const avant=session.indexOf("noterSessionLive('telephone')");
 const appel=session.indexOf("auth_tokens");
 assert.ok(avant>=0&&avant<appel,'l’ouverture doit être comptée AVANT la demande');
});
