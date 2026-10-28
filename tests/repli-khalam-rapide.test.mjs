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
 /* Et la phrase est écrite UNE fois : plusieurs variantes finiraient par
    diverger, et l'une d'elles laisserait passer l'anglais. */
 assert.match(client,/const INDISPONIBLE=/);
 assert.equal([...client.matchAll(/const INDISPONIBLE=/g)].length,1);
});

/* ── CE QU'ELLE DIT QUAND LE FOURNISSEUR REFUSE ──────────────────────

   Le 25 octobre, Lamine avait demandé : « elle dit "Khalam Rapide est
   indisponible pour le moment, je passe sur Khalam" et bascule toute seule ».
   C'était juste tant que Khalam répondait.

   Le 28 octobre au soir, il tranche autrement : « Khalam Voice (GPU RunPod)
   est HORS SERVICE, ne le répare pas » et « Khalam Rapide = moteur UNIQUE ».
   La phrase ne doit donc plus promettre un chemin mort. */
test('la phrase du refus est en français clair et ne promet plus Khalam',()=>{
 const client=fs.readFileSync('lib/gemini-live-client.ts','utf8');
 const m=client.match(/const INDISPONIBLE="([^"]+)"/);
 assert.ok(m,'la phrase doit être une constante');
 assert.ok(!/Khalam/.test(m[1]),'elle ne doit plus nommer Khalam : '+m[1]);
 assert.ok(!/passe sur/.test(m[1]),'elle ne doit plus promettre une bascule : '+m[1]);
 assert.match(m[1],/Écris-moi ici/,'elle doit ouvrir la porte écrite : '+m[1]);
 assert.ok(!/HTTP|404|GPU|RunPod|quota|Gemini|Google/i.test(m[1]),
  'aucun mot technique dans ce qu’elle dit : '+m[1]);
});

/* ── UN REFUS NE BASCULE PLUS : IL COUPE, IL LE DIT, IL OUVRE L'ÉCRIT ────

   Basculer vers Khalam était un filet tant qu'il y avait quelque chose
   dessous. Son oreille répond HTTP 404 depuis la veille : la bascule menait
   au silence complet — c'est exactement ce que Lamine a vécu à 16 h 30, le
   mot « Khalam » sous le micro et aucune voix. */
test('un refus coupe la session, le dit, et ne bascule plus',()=>{
 const page=lire('app/page.tsx');
 const bloc=page.slice(page.indexOf('indisponible:(message:string)=>{'));
 const corps=bloc.slice(0,bloc.indexOf('photo:()=>'));
 assert.match(corps,/liveMaitreRef\.current=null/);
 assert.match(corps,/sessionRapide\(false\)/,'sinon la page resterait muette');
 assert.match(corps,/setPanne\(message\)/);
 assert.match(corps,/direParEcrit\("rapide", message\)/,'elle doit le dire et ouvrir l’écrit');
 assert.ok(!/poserMode/.test(corps),'un refus ne doit plus changer de moteur : '+corps);
});

/* ── PLUS RIEN NE PEUT POSER UN TÉLÉPHONE SUR KHALAM, SAUF L'ADRESSE ───── */
test('Khalam Rapide est le moteur unique, et `?mode=khalam` reste la seule porte',()=>{
 const page=lire('app/page.tsx');
 assert.match(page,/poserMode\(demande!=='khalam'\)/,'le défaut est rapide, sans condition');
 assert.ok(!/bia-mode-conversation/.test(page),'le choix gardé à la main ne doit plus être lu');
 assert.ok(!/bia-rapide-refuse/.test(page),'la mémoire du refus n’a plus de raison d’être');
 assert.ok(!/bascule-mode/.test(page),'aucun bouton de sélection de moteur à l’écran');
 assert.match(page,/searchParams\.get\('mode'\)/,'`?mode=khalam` reste, pour éprouver Khalam plus tard');
 /* Et aucun personnage ne choisit son moteur : la règle du mode ne doit
    connaître ni persona, ni tenue, ni habillage. */
 const regle=page.slice(page.indexOf("const demande=new URL(window.location.href)"),
                        page.indexOf("const utiliserLiveMaitre="));
 assert.ok(!/persona|tenue|habillage/.test(regle),
  'le moteur ne doit dépendre d’aucun personnage : '+regle);
});

/* ── ET AUCUN NOM DE PRODUIT QUAND SA VOIX NE SORT PAS ────────────────
   Lamine, 28 octobre : « plus de message "KHALAM Voice n'a pas produit de
   son" ». Un nom de produit et un ordre de réessayer ne disent rien à celui
   qui attend une voix. */
test('« KHALAM Voice n’a pas produit de son » n’est plus affiché nulle part',()=>{
 const page=lire('app/page.tsx');
 const affiches=[...page.matchAll(/setPanne\(([^)]*)\)/g)].map(m=>m[1]);
 for(const a of affiches)
  assert.ok(!/KHALAM Voice|essai vocal/i.test(a),'message de produit encore affiché : '+a);
});

/* ── « JAMAIS EN SILENCE » ────────────────────────────────────

   Lamine, le 28 octobre 2026 : « quand la voix ne peut pas sortir, BIA doit au
   moins répondre par écrit et le dire clairement, jamais en silence ».

   Ce jour-là, trois pannes se taisaient complètement. Le message était bien
   écrit par `setPanne` — mais il ne s'affiche qu'À L'INTÉRIEUR du panneau du
   clavier, et aucun des trois chemins ne l'ouvrait. /api/etat comptait
   dix-sept écoutes ratées ; l'écran, lui, ne disait rien du tout. */
test('une oreille morte et une voix muette parlent par écrit, et une seule fois',()=>{
 const page=lire('app/page.tsx');
 assert.match(page,/direParEcrit\("oreille", PHRASE_SOURDE\)/,'l’oreille morte doit le dire');
 assert.match(page,/direParEcrit\("voix", PHRASE_MUETTE\)/,'la voix muette doit le dire');
 /* Le fil ET le panneau : une ligne dans un panneau fermé n'est pas dite. */
 assert.match(page,/setHistory\(items=>\[\.\.\.items,\{role:"bia",text:phrase\}\]\)/);
 assert.match(page,/dejaDitEnPanne\.current\[cause\]\)return/,'une seule fois par cause');
 assert.match(page,/dejaDitEnPanne\.current\.oreille = false/,'une réussite doit réarmer');
 /* Et une seule explication à la fois : une oreille morte n'a rien entendu,
    donc une plainte sur sa voix par-dessus ne serait que du bruit. */
 assert.match(page,/cause!=="oreille"&&dejaDitEnPanne\.current\.oreille\)return/,
  'l’oreille doit passer devant les autres causes');
 /* Et ce qu'elle DIT n'est pas un motif technique : celui-là part dans
    /api/etat et dans la ligne `panne`, qui sont pour moi, pas pour lui. */
 for(const nom of ['PHRASE_SOURDE','PHRASE_MUETTE']){
  const m=page.match(new RegExp('const '+nom+'="([^"]+)"'));
  assert.ok(m,nom+' doit être une constante');
  assert.ok(!/HTTP|404|GPU|RunPod|quota|Gemini/i.test(m[1]),
   'elle ne doit pas réciter un motif technique : '+m[1]);
 }
 const sourde=page.match(/const PHRASE_SOURDE="([^"]+)"/)[1];
 assert.match(sourde,/Écris-moi ici/,'elle doit proposer la porte écrite, qui ne dépend d’aucun GPU');
});

/* Ce filet exigeait aussi que la bascule automatique soit COMPTÉE
   (`basculements.vers_khalam`). Il n'y a plus de bascule à compter : le
   refus est déjà lisible dans /api/etat → khalam_rapide.fermetures, avec son
   code 1011 et son motif. Le compteur du serveur n'est pas touché : il reste
   à zéro, et ce zéro est vrai. */

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
