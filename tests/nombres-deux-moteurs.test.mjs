import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import ts from 'typescript';
import {createRequire} from 'node:module';

const require_=createRequire(import.meta.url);
const compile=s=>ts.transpileModule(s,{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText;
function charger(chemin,deps={}){
 const m={exports:{}};
 new Function('require','module','exports','process',compile(fs.readFileSync(chemin,'utf8')))(
  id=>{if(id in deps)return deps[id];if(id.startsWith('node:'))return require_(id);
   assert.fail(chemin+' importe '+id+' : ajoute-le au décor');},m,m.exports,process);
 return m.exports;
}
const sansCommentaires=s=>s.replace(/\/\*[\s\S]*?\*\//g,' ').replace(/(^|[^:])\/\/.*$/gm,'$1');

/* ── « BRANCHER lib/wolof-nombres.ts DANS LA CONVERSATION EN DIRECT » ──────

   Vérifié avant d'écrire : Khalam court-circuite le modèle depuis septembre
   (demandeDeNombre dans app/api/chat/route.ts) ; Khalam Rapide n'avait RIEN,
   et le socle partagé lui INTERDIT de composer un nombre en wolof elle-même
   (« Pas de ñaar-fukk, pas de juróomi junni »). La question n'avait donc
   aucune réponse sur la connexion rapide. */

const demandeDe=(phrase,code='MASTER')=>({
 headers:{get:n=>n==='x-bia-code'?code:null},
 json:async()=>({phrase}),
});

/* Un résolveur qui charge les modules relatifs de lib/ tout seul. Première
   version : je listais les dépendances à la main et j'en ai oublié une
   (./nombres-textes), ce qui a fait échouer quatre épreuves sur un détail de
   décor et non sur le produit. Un décor incomplet accuse le code à tort. */
const cache=new Map();
function libRelatif(id){
 const chemin='lib/'+id.replace(/^\.\//,'')+'.ts';
 if(cache.has(chemin))return cache.get(chemin);
 const m={exports:{}};
 cache.set(chemin,m.exports);
 new Function('require','module','exports','process',compile(fs.readFileSync(chemin,'utf8')))(
  x=>x.startsWith('node:')?require_(x):libRelatif(x),m,m.exports,process);
 cache.set(chemin,m.exports);
 return m.exports;
}
function route(){
 return charger('app/api/nombre/route.ts',{
  'next/server':{NextResponse:{json:(corps,opt)=>({statut:opt?.status||200,corps})}},
  '@/lib/codes':{verifierCode:c=>({ok:c==='MASTER',maitre:c==='MASTER'})},
  '@/lib/nombre-demande':libRelatif('./nombre-demande'),
 });
}

test('la route des nombres rend la table de Lamine, mot pour mot',async()=>{
 const r=await route().POST(demandeDe('comment on dit 250 en wolof'));
 assert.equal(r.statut,200);
 assert.equal(r.corps.trouve,true);
 assert.equal(r.corps.nombre,250);
 assert.ok(r.corps.a_dire&&r.corps.a_dire.length>1,'elle doit recevoir quelque chose à dire');
 /* Et la consigne doit lui interdire de broder par-dessus : c'est le point
    du socle — un montant mal dit coûte de l'argent à quelqu'un. */
 assert.match(r.corps.consigne,/mot pour mot/);
});

test('une phrase qui n’est pas une demande de nombre ne compose rien',async()=>{
 for(const phrase of ['naka nga def ?','il me faut 3 cachets de 500 mg','parle-moi de DD SKIN']){
  const r=await route().POST(demandeDe(phrase));
  assert.equal(r.corps.trouve,false,'ne doit rien composer : '+phrase);
  assert.match(r.corps.raison,/normalement|table/i);
 }
});

test('quand la table ne couvre pas, elle le dit et interdit d’inventer',async()=>{
 /* Au-delà du plafond de la table : la réponse doit être « je ne sais pas »,
    jamais un mot wolof fabriqué. */
 const r=await route().POST(demandeDe('comment on dit 999999999999 en wolof'));
 assert.equal(r.corps.trouve,false);
 assert.match(r.corps.raison,/n'invente|invente/i);
});

test('sans code, la route ne répond pas',async()=>{
 assert.equal((await route().POST(demandeDe('comment on dit 250 en wolof','RIEN'))).statut,401);
});

test('la route ne peut rien écrire : aucune écriture, aucun réseau',()=>{
 const code=sansCommentaires(fs.readFileSync('app/api/nombre/route.ts','utf8'));
 for(const interdit of ['fetch(','rest/v1','garder','ecrire','lexiqueConfig'])
  assert.ok(!code.includes(interdit),'la route des nombres ne doit pas contenir : '+interdit);
});

test('les deux moteurs utilisent le MÊME détecteur de demande de nombre',()=>{
 const chat=sansCommentaires(fs.readFileSync('app/api/chat/route.ts','utf8'));
 const nombre=sansCommentaires(fs.readFileSync('app/api/nombre/route.ts','utf8'));
 assert.match(chat,/demandeDeNombre\(/,'Khalam appelle le détecteur');
 assert.match(nombre,/demandeDeNombre\(/,'et la route de Khalam Rapide le MÊME');
 /* Deux détecteurs différents finiraient par ne pas répondre pareil, et
    « Khalam Rapide = même BIA » serait faux. */
 assert.match(nombre,/repondreAuNombre\(/,'et la même composition');
});

test('l’outil est déclaré à Khalam Rapide et le client sait le servir',()=>{
 const session=sansCommentaires(fs.readFileSync('app/api/gemini-live/session/route.ts','utf8'));
 const client=sansCommentaires(fs.readFileSync('lib/gemini-live-client.ts','utf8'));
 assert.match(session,/dire_un_nombre_en_wolof/,'déclaré dans la session');
 assert.match(client,/dire_un_nombre_en_wolof/,'et servi par le client');
 assert.match(client,/'\/api\/nombre'/,'vers la route qui porte la table');
});
