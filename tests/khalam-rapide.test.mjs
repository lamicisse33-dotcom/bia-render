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
  '@/lib/lecture-devoirs-etat':muet,'@/lib/attentes-vues':muet,
 });
 const corps={type:'khalam_rapide',etape:'premier_son',ms:1340,session:'telephone1',tour:3};
 const r=await route.POST({json:async()=>corps});
 assert.equal(r.status,200);
 assert.deepEqual(vus,[corps]);
});
