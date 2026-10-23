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
 for(const ms of [1200,800,1600]) etat.noterKhalamRapide({type:'khalam_rapide',etape:'premier_son',ms});
 const r=etat.resumeKhalamRapide();
 assert.equal(r.tours_mesures,3);
 assert.equal(r.fin_de_parole_au_premier_son.mediane_ms,1200);
 assert.equal(r.fin_de_parole_au_premier_son.minimum_ms,800);
 assert.equal(r.fin_de_parole_au_premier_son.maximum_ms,1600);
 assert.equal(r.fin_de_parole_au_premier_son.derniers_ms.length,3);
 assert.equal(r.mesures_refusees,0);
});

/* RÈGLE 3 : un compteur ne doit jamais devenir muet. Une mesure hors bornes
   est refusée ET comptée, sinon un client cassé ferait disparaître la
   mesure sans que rien ne le dise. */
test('une mesure impossible est refusée et comptée, jamais silencieuse',()=>{
 const etat=frais();
 etat.noterKhalamRapide({etape:'premier_son',ms:-1});
 etat.noterKhalamRapide({etape:'premier_son',ms:600000});
 etat.noterKhalamRapide({etape:'premier_son',ms:'vite'});
 etat.noterKhalamRapide({etape:'autre_chose',ms:900});
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
 etat.noterKhalamRapide({etape:'premier_son',ms:1000,texte:'phrase privée',audio:'AAAA',code:'MASTER'});
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
  'next/server':{NextResponse:{json:(d)=>Response.json(d)}},
  '@/lib/relecture-etat':muet,'@/lib/rapidite-etat':muet,'@/lib/micro-etat':muet,
  '@/lib/reprise-etat':muet,'@/lib/protection-parole-etat':muet,'@/lib/briques-etat':muet,
  '@/lib/anticipation-etat':muet,'@/lib/ecoute-longue-etat':muet,'@/lib/focus-locuteur-etat':muet,
  '@/lib/piper-web-etat':muet,'@/lib/audio-memoire':muet,'@/lib/sons-courants-etat':muet,
  '@/lib/lecture-devoirs-etat':muet,'@/lib/attentes-vues':muet,
 });
 const r=await route.POST({json:async()=>({type:'khalam_rapide',etape:'premier_son',ms:1340})});
 assert.equal(r.status,200);
 assert.deepEqual(vus,[{type:'khalam_rapide',etape:'premier_son',ms:1340}]);
});
