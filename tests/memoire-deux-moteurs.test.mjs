import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import ts from 'typescript';
const compile=s=>ts.transpileModule(s,{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText;
function load(path,req=id=>assert.fail('dépendance non prévue : '+id)){
 const m={exports:{}};
 new Function('require','module','exports',compile(fs.readFileSync(path,'utf8')))(req,m,m.exports);
 return m.exports;}
function reglages(){delete process.env.BIA_FIL_MESSAGES;delete process.env.BIA_FIL_SIGNES;
 delete process.env.BIA_SOUVENIRS_SIGNES;delete process.env.BIA_LIVE_HISTORIQUE;delete process.env.BIA_LIVE_COMPRESSION;
 return load('lib/memoire-reglages.ts');}

/* ── LES SIX CISEAUX, MESURÉS AVANT D'ÊTRE OUVERTS ─────────────────────────

   /api/etat le 24 octobre 2026, memoire_transmise.derniere :
   historique_tours 12, souvenirs_signes 1799, lexique_signes 1898,
   devoirs_signes 0 — alors que le téléphone envoie 32 à 40 messages
   (lib/fenetre-du-fil.ts) et que 12 540 souvenirs existent. */
test('les ciseaux du mode rapide sont ouverts, et chacun revient par sa variable',()=>{
 const r=reglages();
 assert.equal(r.filRapideMessages(),40,'le fil gardait 12 messages sur 32 à 40 envoyés');
 assert.equal(r.filRapideSignes(),24000,'le budget était de 6 000 signes');
 assert.equal(r.souvenirsSignes(),4500,'les souvenirs étaient coupés à 1 800');
 assert.equal(r.liveHistoriqueTours(),40,'Khalam Rapide gardait 12 tours');
 assert.equal(r.liveCompressionJetons(),60000,'Google compressait dès 18 000 jetons');
 assert.equal(r.liveCompressionCible(),30000);
 /* Et le retour exact au comportement d'avant, sans déploiement. */
 process.env.BIA_FIL_MESSAGES='12';process.env.BIA_FIL_SIGNES='6000';
 process.env.BIA_SOUVENIRS_SIGNES='1800';process.env.BIA_LIVE_HISTORIQUE='12';
 process.env.BIA_LIVE_COMPRESSION='18000';
 assert.equal(r.filRapideMessages(),12);assert.equal(r.filRapideSignes(),6000);
 assert.equal(r.souvenirsSignes(),1800);assert.equal(r.liveHistoriqueTours(),12);
 assert.equal(r.liveCompressionJetons(),18000);
 /* Les valeurs d'avant sont publiées à côté des nouvelles : on compare sans
    aller chercher un commit. */
 assert.equal(r.reglagesMemoire().avant_le_24_octobre.fil_messages,12);
 for(const [v,defaut] of [['BIA_FIL_MESSAGES',12],['BIA_FIL_SIGNES',6000]]) process.env[v]=String(defaut);
 process.env.BIA_FIL_MESSAGES='0';assert.equal(r.filRapideMessages(),40,'une valeur absurde garde le défaut');
 delete process.env.BIA_FIL_MESSAGES;delete process.env.BIA_FIL_SIGNES;
 delete process.env.BIA_SOUVENIRS_SIGNES;delete process.env.BIA_LIVE_HISTORIQUE;delete process.env.BIA_LIVE_COMPRESSION;
});

/* ── UN MESSAGE TROP LONG N'EFFACE PLUS LES AUTRES ─────────────────────────
   L'ancienne boucle faisait `break` dès qu'un message dépassait le budget
   restant : un seul récit de 6 000 signes effaçait d'un coup les onze
   messages qui le précédaient. On le saute, on continue à remonter. */
test('un message trop long est sauté, pas suivi d’un abandon du reste du fil',()=>{
 const garder=(messages,budget)=>{
  const retenus=[];let restant=budget,sautes=0;
  for(let i=messages.length-1;i>=0;i--){
   const m=messages[i];
   if(m.length>restant){sautes++;if(restant<=0)break;continue;}
   retenus.unshift(m);restant-=m.length;
  }
  return {retenus:retenus.length,sautes};
 };
 const fil=['a'.repeat(50),'b'.repeat(9000),'c'.repeat(50),'d'.repeat(50)];
 /* Ancien comportement : on s'arrêtait sur le long et on perdait le premier. */
 assert.deepEqual(garder(fil,6000),{retenus:3,sautes:1},'les trois courts sont gardés');
});

/* ── LA CLÉ DE MÉMOIRE DOIT ÊTRE LA MÊME SUR LES DEUX MOTEURS ──────────────

   app/api/chat/route.ts garde et retrouve sous « maitre ». Si Khalam Rapide
   écrivait sous un autre nom — « maitre-vocal », un hachage du code — Lamine
   aurait eu DEUX mémoires qui ne se parlent pas, et la conversation du soir
   serait restée invisible le lendemain. C'est la faute que cette épreuve
   interdit. */
test('les deux moteurs écrivent et lisent sous la même personne',()=>{
 const chat=fs.readFileSync('app/api/chat/route.ts','utf8');
 const live=fs.readFileSync('app/api/gemini-live/session/route.ts','utf8');
 const page=fs.readFileSync('app/page.tsx','utf8');
 assert(/\?\s*"maitre"\s*$/m.test(chat)||chat.includes('? "maitre"'),'Khalam garde sous « maitre »');
 assert(live.includes("const personne=acces.maitre?'maitre':''"),'Khalam Rapide aussi, au mot près');
 /* ── 24 OCTOBRE 2026 : LA MÉMOIRE DES VISITEURS N'EXISTAIT PAS ──────────
    Le téléphone envoyait 'maitre' ou RIEN. Sans identifiant, garder()
    n'écrit pas : toute conversation d'un visiteur sur la connexion rapide
    disparaissait entièrement, alors que Khalam rangeait déjà par profil
    depuis le 10 septembre. « Même BIA, mêmes écritures » : le téléphone
    envoie maintenant le profil actif, comme Khalam. */
 assert(page.includes("estMaitreRef.current?'maitre':(profilRef.current||'')"),
  'le téléphone envoie « maitre » ou le profil actif, comme Khalam');
 assert(!page.includes("estMaitreRef.current?'maitre':''"),
  'plus de visiteur sans mémoire sur la connexion rapide');
 for(const faux of ['maitre-vocal','live-'])assert(!live.includes("?'"+faux),'aucune identité inventée : '+faux);
});

/* ── LES LIGNES LUES PAR SOURCE, ET LE ZÉRO QUI SE DISTINGUE ───────────────
   « devoirs_signes 0 » pouvait vouloir dire trois choses : lecture échouée,
   zéro ligne rendue, ou lignes coupées par un budget. Le champ les sépare. */
test('le relevé par source distingue zéro ligne rendue de source non lue',()=>{
 delete globalThis.biaLecturesSupabase;
 const l=load('lib/lectures-supabase.ts');
 assert.equal(l.resumeLecturesSupabase().khalam,null,'aucun tour : rien n’est affirmé');
 const t=l.ouvrirLecture('tour-1','khalam');
 l.noterLectureSource(t,'souvenirs',6,1800);
 l.noterLectureSource(t,'devoirs',0,0);
 l.fermerLecture(t);
 const r=l.resumeLecturesSupabase().khalam;
 assert.equal(r.tours,1);
 assert.equal(r.souvenirs.lignes_medianes,6);
 assert.equal(r.devoirs.tours_avec_lecture,1,'les devoirs ONT été lus');
 assert.equal(r.devoirs.tours_a_zero_ligne,1,'et ils ont rendu zéro ligne');
 assert.equal(r.lexique.tours_avec_lecture,0,'le lexique, lui, n’a pas été lu du tour');
 assert.equal(r.lexique.lignes_medianes,null);
 /* Et rien d'autre que des noms et des comptes ne sort. */
 const t2=l.ouvrirLecture('tour-2','khalam_rapide');
 l.noterLectureSource(t2,'souvenirs',3,900);l.fermerLecture(t2);
 const brut=JSON.stringify(l.resumeLecturesSupabase());
 assert(!brut.includes('tour-1')&&!brut.includes('tour-2'),'aucun identifiant de tour exporté');
 assert.equal(l.resumeLecturesSupabase().khalam_rapide.tours,1);
});

/* L'outil ne doit plus être la seule porte de la mémoire, et son compteur dit
   s'il est appelé — zéro appel et une mémoire absente donnaient la même
   conversation, sans moyen de les distinguer. */
test('le compteur de l’outil sépare les appels, les refus et les réponses vides',()=>{
 delete globalThis.biaOutilConnaissances;
 const o=load('lib/outil-connaissances-etat.ts');
 o.noterOutilConnaissances({action:'chercher',lignes:12,ms:140});
 o.noterOutilConnaissances({action:'chercher',lignes:0,ms:90});
 o.noterOutilConnaissances({action:'inventee',lignes:5,ms:10});
 o.noterOutilConnaissances({refus:true});
 const r=o.resumeOutilConnaissances();
 assert.equal(r.appels,3);
 assert.equal(r.par_action.chercher,2);
 assert.equal(r.par_action.inconnue,1,'une action inventée est comptée à part, pas ignorée');
 assert.equal(r.acces_refuses,1);
 assert.equal(r.reponses_sans_aucune_ligne,1);
});

/* ── LA MÉMOIRE DE KHALAM RAPIDE ÉTAIT MORTE DEPUIS LE PREMIER JOUR ───────

   Lamine, 24 octobre 2026 : « BIA semble sans mémoire ». Lu sur /api/etat →
   lectures_supabase.khalam_rapide : devoirs 21 lignes, lexique 659,
   corrections exactes 300… et SOUVENIRS ZÉRO, trois tours sur trois, pendant
   que la table en porte treize mille.

   La cause : derniersSouvenirs() demandait les colonnes `role` et
   `created_at`. La table a `qui` et `quand` — elle n'a JAMAIS eu les deux
   autres. PostgREST répondait 400 à chaque appel, et le .catch(()=>[]) de la
   session rendait une liste vide. Sans un message, sans un compteur rouge. */
test('derniersSouvenirs demande les colonnes qui existent vraiment',()=>{
 const code=fs.readFileSync('lib/souvenirs.ts','utf8');
 const sql=fs.readFileSync('data/souvenirs.sql','utf8');
 /* Les commentaires sont retirés : celui qui explique la panne NOMME les
    deux colonnes fautives, et mon motif les relisait comme du code. Un motif
    qui lit de la prose n'éprouve rien — sixième fois. */
 const sansCommentaires=t=>t.replace(/\/\*[\s\S]*?\*\//g,' ').replace(/(^|[^:])\/\/.*$/gm,'$1');
 const bloc=sansCommentaires(code.slice(code.indexOf('export async function derniersSouvenirs')));
 const requete=bloc.slice(0,bloc.indexOf('const lignes'));

 /* Les colonnes demandées doivent toutes exister dans le schéma. */
 const demandees=(requete.match(/select=([a-z_,]+)/)||[])[1]?.split(',')||[];
 assert.ok(demandees.length,'la requête doit sélectionner des colonnes');
 for(const c of demandees)
  assert.ok(new RegExp('^\\s+'+c+'\\s','m').test(sql),
   'colonne demandée mais absente de data/souvenirs.sql : '+c);

 /* Et l’ordre doit porter sur une colonne qui existe aussi. */
 const ordre=(requete.match(/order=([a-z_]+)\./)||[])[1];
 assert.ok(ordre,'la requête doit ordonner');
 assert.ok(new RegExp('^\\s+'+ordre+'\\s','m').test(sql),
  'tri sur une colonne absente du schéma : '+ordre);

 /* Les deux noms fautifs ne doivent plus apparaître nulle part ici. */
 assert.ok(!requete.includes('created_at'),'created_at n’existe pas dans cette table');
 assert.ok(!requete.includes('role'),'role n’existe pas dans cette table');
});

test('une panne de souvenirs ne peut plus se taire',()=>{
 const code=fs.readFileSync('lib/souvenirs.ts','utf8');
 assert.match(code,/derniereDate/,'la date de la dernière panne doit être gardée');
 assert.match(code,/dernierMotif: ""/, 'et son motif publié dans le résumé');
});
