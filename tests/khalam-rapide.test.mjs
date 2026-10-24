import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import ts from 'typescript';

function load(path,deps={}){
 const m={exports:{}};
 const code=ts.transpileModule(fs.readFileSync(path,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText;
 new Function('require','module','exports',code)(id=>{assert(id in deps,id);return deps[id];},m,m.exports);
 return m.exports;
}
function frais(){delete globalThis.biaKhalamRapide;return load('lib/khalam-rapide-etat.ts');}

/* RÈGLE 1 de AVANT-DE-DIRE-QUE-C-EST-BON.md : on ne dit pas qu'une écoute ou
   une voix va plus vite sans un champ de /api/etat lu sur le serveur. Ce test
   vérifie le champ, pas la vitesse. */
test('la fin de parole au premier son de Khalam Rapide se lit dans /api/etat',()=>{
 const etat=frais();
 assert.equal(etat.resumeKhalamRapide().fin_de_parole_au_premier_son.mediane_ms,null);
 assert.equal(etat.resumeKhalamRapide().defaut_pour_tous,true);
 let tour=0;
 for(const ms of [1200,800,1600]) etat.noterKhalamRapide({type:'khalam_rapide',etape:'premier_son',ms,session:'telephone1',tour:++tour});
 const r=etat.resumeKhalamRapide();
 assert.equal(r.tours_mesures,3);
 assert.equal(r.fin_de_parole_au_premier_son.mediane_ms,1200);
 assert.equal(r.fin_de_parole_au_premier_son.minimum_ms,800);
 assert.equal(r.fin_de_parole_au_premier_son.maximum_ms,1600);
 assert.equal(r.fin_de_parole_au_premier_son.derniers_ms.length,3);
 assert.equal(r.mesures_refusees,0);
 assert.equal(r.tours_en_double_refuses,0);
 assert.equal(r.telephones_mesures,1);
});

/* ── LE FILET SOUS LE BON TROU ─────────────────────────────────────────────

   Le 23 octobre à 22:28, neuf mesures d'une même réponse sont passées : elles
   étaient toutes DANS les bornes. `mesures_refusees` affichait 0 pendant que
   la médiane était fausse. RÈGLE 4 : « un filet doit être posé sous le défaut
   réel ». Le défaut réel était le doublon de tour. */
test('un tour déjà mesuré est refusé et compté à part, sans toucher à la médiane',()=>{
 const etat=frais();
 etat.noterKhalamRapide({etape:'premier_son',ms:1400,session:'telephone1',tour:1});
 /* La rafale du 23 octobre : le même tour, huit fois de suite, avec des
    valeurs croissantes qui étaient en fait la profondeur de la file audio. */
 for(const ms of [31,319,476,642,878,1398,1732,2324]) etat.noterKhalamRapide({etape:'premier_son',ms,session:'telephone1',tour:1});
 const r=etat.resumeKhalamRapide();
 assert.equal(r.tours_mesures,1);
 assert.equal(r.tours_en_double_refuses,8);
 assert.equal(r.mesures_refusees,0);
 assert.equal(r.fin_de_parole_au_premier_son.mediane_ms,1400);
 assert.equal(r.fin_de_parole_au_premier_son.minimum_ms,1400);
});

test('deux téléphones dans la même seconde ne sont pas des doublons',()=>{
 const etat=frais();
 etat.noterKhalamRapide({etape:'premier_son',ms:1000,session:'telephone1',tour:1});
 etat.noterKhalamRapide({etape:'premier_son',ms:2000,session:'telephone2',tour:1});
 const r=etat.resumeKhalamRapide();
 assert.equal(r.tours_mesures,2,'un seuil de temps aurait rejeté le second');
 assert.equal(r.tours_en_double_refuses,0);
 assert.equal(r.telephones_mesures,2);
 assert.equal(r.fin_de_parole_au_premier_son.mediane_ms,1500);
});

/* Un ancien téléphone qui n'a pas encore la nouvelle page envoie une mesure
   sans numéro de tour : on la refuse plutôt que de la mélanger aux bonnes. */
test('une mesure sans numéro de tour est refusée et comptée',()=>{
 const etat=frais();
 etat.noterKhalamRapide({etape:'premier_son',ms:1400});
 etat.noterKhalamRapide({etape:'premier_son',ms:1400,session:'telephone1'});
 etat.noterKhalamRapide({etape:'premier_son',ms:1400,session:'telephone1',tour:0});
 etat.noterKhalamRapide({etape:'premier_son',ms:1400,session:'!!',tour:1});
 const r=etat.resumeKhalamRapide();
 assert.equal(r.tours_mesures,0);
 assert.equal(r.mesures_refusees,4);
 assert.equal(r.tours_en_double_refuses,0);
});

/* RÈGLE 3 : un compteur ne doit jamais devenir muet. Une mesure hors bornes
   est refusée ET comptée, sinon un client cassé ferait disparaître la
   mesure sans que rien ne le dise. */
test('une mesure impossible est refusée et comptée, jamais silencieuse',()=>{
 const etat=frais();
 const t=(d)=>etat.noterKhalamRapide({session:'telephone1',tour:1,...d});
 t({etape:'premier_son',ms:-1});
 t({etape:'premier_son',ms:600000});
 t({etape:'premier_son',ms:'vite'});
 t({etape:'autre_chose',ms:900});
 const r=etat.resumeKhalamRapide();
 assert.equal(r.tours_mesures,0);
 assert.equal(r.mesures_refusees,4);
 assert.equal(r.fin_de_parole_au_premier_son.mediane_ms,null);
});

test('les basculements sont comptés des deux côtés et ne polluent pas les durées',()=>{
 const etat=frais();
 etat.noterKhalamRapide({etape:'bascule',vers:'khalam'});
 etat.noterKhalamRapide({etape:'bascule',vers:'rapide'});
 etat.noterKhalamRapide({etape:'bascule',vers:'rapide'});
 etat.noterKhalamRapide({etape:'bascule',vers:'autre'});
 const r=etat.resumeKhalamRapide();
 assert.deepEqual(r.basculements,{vers_rapide:2,vers_khalam:1});
 assert.equal(r.tours_mesures,0);
 assert.equal(r.mesures_refusees,0);
});

/* Aucun texte, aucune transcription, aucun son ne sort par ce champ. */
test('le champ public ne porte que des durées et des comptes',()=>{
 const etat=frais();
 etat.noterKhalamRapide({etape:'premier_son',ms:1000,session:'telephone1',tour:1,texte:'phrase privée',audio:'AAAA',code:'MASTER'});
 const brut=JSON.stringify(etat.resumeKhalamRapide());
 for(const secret of ['phrase privée','AAAA','MASTER']) assert(!brut.includes(secret),secret);
});

/* Le téléphone déclare sa mesure sur la route existante, sans code d'accès —
   refuser une mesure parce qu'un code a expiré nous priverait précisément des
   mesures des moments où ça se passe mal. */
test('la route de mesure aiguille le type khalam_rapide',async()=>{
 delete globalThis.biaKhalamRapide;
 const vus=[];
 const muet=new Proxy({},{get:()=>()=>{}});
 const route=load('app/api/mesure/route.ts',{
  '@/lib/khalam-rapide-etat':{noterKhalamRapide:d=>vus.push(d)},
  '@/lib/eligibilite-etat':muet,
  'next/server':{NextResponse:{json:(d)=>Response.json(d)}},
  '@/lib/relecture-etat':muet,'@/lib/rapidite-etat':muet,'@/lib/micro-etat':muet,
  '@/lib/reprise-etat':muet,'@/lib/protection-parole-etat':muet,'@/lib/briques-etat':muet,
  '@/lib/anticipation-etat':muet,'@/lib/ecoute-longue-etat':muet,'@/lib/focus-locuteur-etat':muet,
  '@/lib/piper-web-etat':muet,'@/lib/audio-memoire':muet,'@/lib/sons-courants-etat':muet,
  '@/lib/lecture-devoirs-etat':muet,'@/lib/attentes-vues':muet,'@/lib/journal-parole':muet,
 });
 const corps={type:'khalam_rapide',etape:'premier_son',ms:1340,session:'telephone1',tour:3};
 const r=await route.POST({json:async()=>corps});
 assert.equal(r.status,200);
 assert.deepEqual(vus,[corps]);
});

/* ── ELLE SE COUPE ELLE-MÊME : COMPTER AVANT DE SOIGNER ────────────────────

   Lamine, le 24 octobre 2026 : « BIA se coupe elle-même parfois. » Cause
   probable : le micro capte sa propre voix par le haut-parleur, et la
   détection d'activité de Google la prend pour une interruption.

   Une coupure survenue PENDANT qu'elle parlait est une interruption d'elle-
   même jusqu'à preuve du contraire ; une coupure dans le silence vient bien
   de la personne, et celle-là doit continuer de marcher. Les deux sont
   comptées à part — sinon on ne saurait pas si le remède soigne, ou s'il
   empêche la personne de la couper pour de vrai. */
test('les coupures pendant sa parole et celles au silence sont comptées à part',()=>{
 const etat=frais();
 etat.noterKhalamRapide({etape:'echo',coupures_pendant_parole:4,coupures_au_silence:1,
  trames_retenues:220,trames_laissees:6,echo_plancher:31});
 const e=etat.resumeKhalamRapide().echo;
 assert.equal(e.coupures_pendant_parole,4,'elle s’est coupée elle-même quatre fois');
 assert.equal(e.coupures_au_silence,1,'et la personne l’a coupée une fois — ça doit rester possible');
 assert.equal(e.trames_retenues,220,'l’écho filtré');
 assert.equal(e.trames_laissees,6,'et ce qui est passé malgré le filtre : de vraies voix');
 assert.equal(e.plancher_pour_mille,31);
 assert.equal(e.tours,1);
});

test('les compteurs d’écho ne redescendent pas entre deux envois du même tour',()=>{
 const etat=frais();
 /* Le téléphone renvoie le cumul du tour à chaque coupure : prendre le
    maximum évite qu'un envoi tardif efface un compte plus élevé. */
 etat.noterKhalamRapide({etape:'echo',coupures_pendant_parole:3,coupures_au_silence:0,trames_retenues:100,trames_laissees:2,echo_plancher:28});
 etat.noterKhalamRapide({etape:'echo',coupures_pendant_parole:1,coupures_au_silence:0,trames_retenues:40,trames_laissees:1,echo_plancher:25});
 const e=etat.resumeKhalamRapide().echo;
 assert.equal(e.coupures_pendant_parole,3);
 assert.equal(e.trames_retenues,100);
 assert.equal(e.tours,2,'les deux envois sont comptés');
});

/* Et le filtre lui-même : l'écho est retenu, une vraie voix passe. C'est la
   règle de décision, éprouvée sans navigateur. */
test('le filtre retient l’écho et laisse passer une voix franche',()=>{
 const SEUIL=0.06;
 const passe=(rms,plancher)=>rms>Math.max(SEUIL,plancher*2.5);
 /* Son propre écho, dans une pièce ordinaire. */
 assert.equal(passe(0.020,0.022),false,'l’écho ne doit pas la couper');
 assert.equal(passe(0.055,0.022),false,'ni un écho un peu fort');
 /* Quelqu'un qui parle par-dessus. */
 assert.equal(passe(0.120,0.022),true,'une vraie voix passe');
 /* Pièce très résonnante : le plancher appris monte, et il décide. */
 assert.equal(passe(0.100,0.050),false,'plancher haut : 0,10 reste de l’écho');
 assert.equal(passe(0.200,0.050),true,'mais une voix franche passe quand même');
});

/* ── UN ZÉRO QUI N'A JAMAIS ÉTÉ ÉCRIT N'EST PAS UNE MESURE ─────────────────

   Le 24 octobre à 15:35, BIA s'est coupée plusieurs fois et tous les
   compteurs d'écho valaient zéro. Mon relevé ne partait que sur une
   interruption de Google : zéro pouvait vouloir dire « pas d'écho » comme
   « ancien code en cache ». Deux causes, un seul chiffre — donc aucune cause
   nommée. `mesure_recue` sépare les deux. */
test('tant qu’aucune mesure n’est arrivée, on ne conclut rien',()=>{
 const etat=frais();
 assert.equal(etat.resumeKhalamRapide().echo.mesure_recue,false,'zéro sans mesure ne prouve rien');
 etat.noterKhalamRapide({etape:'echo',coupures_pendant_parole:0,coupures_au_silence:0,
  trames_retenues:0,trames_laissees:0,echo_plancher:0});
 assert.equal(etat.resumeKhalamRapide().echo.mesure_recue,true,'là, un zéro veut dire zéro');
});

test('chaque arrêt porte son nom, et un nom inventé n’entre pas',()=>{
 const etat=frais();
 etat.noterKhalamRapide({etape:'echo',arrets:{fermeture_pendant_parole:2,alphabet:1,veille:3,invente:9},
  code_fermeture:1011,version:'65e537d04a34'});
 const e=etat.resumeKhalamRapide().echo;
 assert.equal(e.arrets.fermeture_pendant_parole,2,'elle s’est arrêtée EN PLEINE RÉPONSE deux fois');
 assert.equal(e.arrets.alphabet,1,'la garde « français et wolof » a fermé une fois');
 assert.equal(e.arrets.veille,3);
 assert.equal(e.arrets.invente,undefined,'un nom inventé par un client bricolé n’entre pas');
 assert.equal(e.code_fermeture,1011,'le code de fermeture du WebSocket est gardé');
 assert.deepEqual(e.versions,{'65e537d04a34':1},'et la version que le téléphone a chargée');
});

test('la version chargée distingue « pas d’écho » de « ancien code »',()=>{
 const etat=frais();
 etat.noterKhalamRapide({etape:'echo',version:'65e537d04a34'});
 etat.noterKhalamRapide({etape:'echo',version:'65e537d04a34'});
 etat.noterKhalamRapide({etape:'echo',version:'e214b94fefac'});
 const v=etat.resumeKhalamRapide().echo.versions;
 assert.deepEqual(v,{'65e537d04a34':2,'e214b94fefac':1},'deux téléphones, deux versions : on le voit');
 etat.noterKhalamRapide({etape:'echo',version:'pas-une-version'});
 assert.equal(Object.keys(etat.resumeKhalamRapide().echo.versions).length,2,'rien d’autre n’entre');
});
