import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import ts from 'typescript';
import {createRequire} from 'node:module';

const require_=createRequire(import.meta.url);
const compile=s=>ts.transpileModule(s,{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText;
function charger(chemin,permis=[]){
 const m={exports:{}};
 new Function('require','module','exports','process',compile(fs.readFileSync(chemin,'utf8')))(
  id=>{if(!permis.includes(id))assert.fail(chemin+' ne doit pas importer : '+id);return require_(id);},
  m,m.exports,process);
 return m.exports;
}
const sansCommentaires=s=>s.replace(/\/\*[\s\S]*?\*\//g,' ').replace(/(^|[^:])\/\/.*$/gm,'$1');

/* ── LA RÈGLE DE LAMINE, ÉPROUVÉE SUR LES DEUX MOTEURS ────────────────────
   « Elle ne doit JAMAIS répondre tant que je parle ou que je fais une pause
   pour réfléchir. » Donc : le silence exigé doit dépasser une seconde, et il
   doit être LE MÊME des deux côtés. */

test('lib/fin-de-parole.ts n’importe rien et exige plus d’une seconde',()=>{
 const F=charger('lib/fin-de-parole.ts');
 assert.ok(F.silenceFinDeParoleMs()>1000,'une pause d’une seconde doit survivre');
 assert.equal(F.silenceFinDeParoleMs(),1200);
 assert.equal(F.SILENCE_FIN_PAROLE_MS_DEFAUT,1200);
});

/* Le piège que j’ai déjà payé deux fois : lib/micro.ts est chargé comme
   module `data:` par tests/protection-parole.test.mjs, donc il ne peut pas
   importer la source partagée. Il garde un littéral — et un littéral qui
   dérive est un mensonge silencieux. */
test('le repli de lib/micro.ts vaut exactement le défaut partagé',()=>{
 const F=charger('lib/fin-de-parole.ts');
 const M=charger('lib/micro.ts');
 assert.equal(M.SILENCE_QUI_FERME,F.SILENCE_FIN_PAROLE_MS_DEFAUT,
  'si ces deux nombres divergent, les deux moteurs ne se comportent plus pareil');
 assert.equal(M.SILENCE_LE_PLUS_COURT,F.SILENCE_FIN_PAROLE_MS_DEFAUT);
 assert.equal(M.SILENCE_LE_PLUS_LONG,F.SILENCE_FIN_PAROLE_MS_DEFAUT);
});

test('lib/micro.ts ne contient aucun import : une épreuve le charge seul',()=>{
 const code=sansCommentaires(fs.readFileSync('lib/micro.ts','utf8'));
 assert.doesNotMatch(code,/\bimport\s/,'un import relatif ici arrête toute l’écoute sans un mot');
 assert.doesNotMatch(code,/\brequire\s*\(/);
});

test('une variable Render règle le silence sans redéployer, et les bornes tiennent',()=>{
 const avant=process.env.BIA_SILENCE_FIN_PAROLE_MS;
 try{
  process.env.BIA_SILENCE_FIN_PAROLE_MS='1500';
  assert.equal(charger('lib/fin-de-parole.ts').silenceFinDeParoleMs(),1500,
   'la valeur de son propre raisonnement de septembre doit être atteignable');
  /* Sous le plancher : on refuse, sinon la variable rouvrirait le défaut
     qu’on vient de corriger. */
  for(const mauvais of ['400','0','-1','abc','','99999']){
   process.env.BIA_SILENCE_FIN_PAROLE_MS=mauvais;
   assert.equal(charger('lib/fin-de-parole.ts').silenceFinDeParoleMs(),1200,'refusé : '+mauvais);
  }
 }finally{
  if(avant===undefined)delete process.env.BIA_SILENCE_FIN_PAROLE_MS;
  else process.env.BIA_SILENCE_FIN_PAROLE_MS=avant;
 }
});

/* ── KHALAM RAPIDE : LE RÉGLAGE DOIT VRAIMENT PARTIR DANS LE SETUP ───────
   Un réglage écrit dans un fichier et jamais posé dans la requête, c’est
   exactement la faute du 20 octobre sur la balise du mail : quatre
   vérifications au vert et le seul endroit qui comptait n’en portait aucune. */
test('la session Khalam Rapide pose le silence partagé, pas 500 ms en dur',()=>{
 const code=sansCommentaires(fs.readFileSync('app/api/gemini-live/session/route.ts','utf8'));
 assert.match(code,/silenceDurationMs:\s*silenceFinDeParoleMs\(\)/,
  'silenceDurationMs doit venir de la source partagée');
 assert.match(code,/prefixPaddingMs:\s*prefixePartMs\(\)/);
 assert.doesNotMatch(code,/silenceDurationMs:\s*\d/,'plus aucun nombre en dur');
 /* Et l’interruption par la personne RESTE : « je dois pouvoir, moi,
    l’interrompre pendant qu’elle parle : ça, ça reste. » */
 assert.match(code,/activityHandling:\s*'START_OF_ACTIVITY_INTERRUPTS'/,
  'retirer ceci lui enlèverait le droit de la couper');
 /* Le téléphone doit recevoir ce qu’on a demandé, pour pouvoir le comparer
    à ce qu’il observe. */
 assert.match(code,/fin_de_parole:\s*reglagesFinDeParole\(\)/);
});

/* ── LE RÉGLAGE SE POSE UNE FOIS, PAS SEPT ───────────────────────────────
   Première version : la valeur passait en argument aux sept appels de
   app/page.tsx. Trois épreuves sont parties en « silenceDemande is not
   defined » — elles extraient le callback `ecouter` et lui fournissent son
   décor nom par nom. Sept appels et N décors : la prochaine épreuve écrite
   aurait oublié, et le défaut serait revenu sans un mot. Un seul endroit où
   le nombre peut se perdre, et c'est celui-ci qu'on éprouve. */
test('app/page.tsx pose le silence du serveur une seule fois, à la réponse de /api/etat',()=>{
 const code=sansCommentaires(fs.readFileSync('app/page.tsx','utf8'));
 assert.match(code,/reglerSilenceQuiFerme\(/,'le réglage doit être posé');
 assert.equal([...code.matchAll(/reglerSilenceQuiFerme\(/g)].length,1,
  'un seul appel : plus d’un, et ils divergeront');
 /* Et il est posé AVEC la valeur publiée, pas avec une constante. */
 assert.match(code,/reglerSilenceQuiFerme\([\s\S]{0,160}?silence_fin_parole_ms/,
  'posé avec la valeur publiée, pas avec une constante');
 /* Les appels de décision, eux, gardent leur forme d’avant. */
 assert.doesNotMatch(code,/silenceDemande/,'aucun nom nouveau dans les lignes de décision');
});

test('le réglage posé l’emporte, et une valeur hors bornes garde le repli',()=>{
 const M=charger('lib/micro.ts');
 assert.equal(M.silenceQuiSuffit(2500,0),1200,'repli avant toute réponse du serveur');
 assert.equal(M.reglerSilenceQuiFerme(1500),1500);
 assert.equal(M.silenceQuiSuffit(2500,0),1500,'posé une fois, vu partout');
 assert.equal(M.silenceQuiSuffit(0,100),1500);
 for(const mauvais of [400,0,-1,99999,NaN,undefined,'abc']){
  assert.equal(M.reglerSilenceQuiFerme(mauvais),1200,'refusé : '+String(mauvais));
  assert.equal(M.silenceQuiSuffit(2500,0),1200);
 }
});

/* ── LE JOURNAL : CE QUI DIT « ELLE M’A COUPÉ » ──────────────────────────── */
test('le journal nomme une coupure quand le silence observé est sous ce qu’on exigeait',()=>{
 const J=charger('lib/journal-parole.ts');
 /* Rien n’est arrivé : on ne conclut rien. RÈGLE 3 — un zéro jamais écrit
    n’est pas une mesure. */
 assert.equal(J.resumeJournalParole().mesure_recue,false);

 J.noterTourDeParole({type:'journal_parole',moteur:'rapide',
  debut_parole:'15:30:01',fin_detectee:'15:30:04',premier_son:'15:30:05',
  parole_ms:3000,silence_exige_ms:1200,silence_observe_ms:480,attente_ms:1100,
  texte_ms:480,son_ms:900,demarrage_audio_ms:40});
 let v=J.resumeJournalParole();
 assert.equal(v.mesure_recue,true);
 assert.equal(v.khalam_rapide.coupures_suspectes,1,'480 ms observés contre 1200 exigés : elle a coupé');
 assert.equal(v.khalam_rapide.tours,1);
 assert.equal(v.khalam.tours,0,'les deux moteurs restent séparés');

 /* Un tour qui respecte le silence n’est pas une coupure. */
 J.noterTourDeParole({type:'journal_parole',moteur:'rapide',
  debut_parole:'15:31:01',fin_detectee:'15:31:04',premier_son:'15:31:06',
  parole_ms:3000,silence_exige_ms:1200,silence_observe_ms:1340,attente_ms:2100,
  texte_ms:1340,son_ms:1900,demarrage_audio_ms:45});
 v=J.resumeJournalParole();
 assert.equal(v.khalam_rapide.coupures_suspectes,1);
 assert.equal(v.khalam_rapide.tours,2);
 assert.equal(v.khalam_rapide.fin_de_parole_au_premier_son.median_ms,1600);
 assert.equal(v.khalam_rapide.fin_de_parole_au_premier_son.etapes_medianes_ms.jusqu_au_texte,910);

 /* Khalam compte à part, et ses étapes aussi. */
 J.noterTourDeParole({type:'journal_parole',moteur:'khalam',
  debut_parole:'15:32:00',fin_detectee:'15:32:03',premier_son:'15:32:07',
  parole_ms:3000,silence_exige_ms:1200,silence_observe_ms:1205,attente_ms:4300,
  son_ms:4300,demarrage_audio_ms:1300});
 v=J.resumeJournalParole();
 assert.equal(v.khalam.tours,1);
 assert.equal(v.khalam.coupures_suspectes,0);
 assert.equal(v.khalam.fin_de_parole_au_premier_son.median_ms,4300);
});

test('le journal refuse ce qui n’est pas un tour, et le compte',()=>{
 const J=charger('lib/journal-parole.ts');
 const avant=J.resumeJournalParole().tours_refuses;
 /* Un moteur inventé n’entre pas : sinon un client bricolé pourrait créer
    des colonnes qui n’existent pas dans le code. */
 J.noterTourDeParole({moteur:'autre',debut_parole:'15:30:01'});
 /* Et un tour sans aucune heure est un client mal branché, pas un tour :
    le compter diluerait la médiane. */
 J.noterTourDeParole({moteur:'khalam'});
 J.noterTourDeParole({moteur:'khalam',debut_parole:'pas une heure',fin_detectee:'x',premier_son:'y'});
 assert.equal(J.resumeJournalParole().tours_refuses,avant+3);
});

test('le journal ne laisse sortir aucun texte ni aucune transcription',()=>{
 const code=sansCommentaires(fs.readFileSync('lib/journal-parole.ts','utf8'));
 /* `texte_ms` est une DURÉE, pas un texte : on interdit le mot quand il
    désigne un contenu, pas quand il nomme une étape en millisecondes. */
 /* Les chaînes sont retirées avec les commentaires : le champ `limite` décrit
    en français ce qui NE sort pas d'ici, et mon motif le lisait comme du
    code. Un motif qui lit de la prose ne prouve rien du programme — RÈGLE 2,
    et c'est la quatrième fois que je me fais prendre. */
 const identifiants=code.replace(/"(?:[^"\\]|\\.)*"/g,'""').replace(/'(?:[^'\\]|\\.)*'/g,"''");
 for(const interdit of ['transcription','userText','biaText','question','reponse'])
  assert.doesNotMatch(identifiants,new RegExp('\\b'+interdit+'\\b'),'ne doit pas manipuler : '+interdit);
 /* On vise les CLÉS publiées, pas la prose : un champ nommé « texte » est
    celui qui recevra du texte un jour. `texte_ms` est une durée. */
 for(const cle of ['texte','question','reponse','dit','repondu'])
  assert.doesNotMatch(code,new RegExp('[{,]\\s*'+cle+'\\s*:'),'aucun champ publié « '+cle+' »');
});
