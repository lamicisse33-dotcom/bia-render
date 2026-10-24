import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import ts from 'typescript';
const compile=s=>ts.transpileModule(s,{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText;
function charger(){
 const m={exports:{}};
 new Function('require','module','exports',compile(fs.readFileSync('lib/veille-native.ts','utf8')))(
  id=>assert.fail('lib/veille-native.ts ne doit rien importer : '+id),m,m.exports);
 return m.exports.maintenirEcranEveille;
}
const souffler=()=>new Promise(r=>setTimeout(r,0));

/* ── LE DÉCOR : UN iPHONE, SES GESTES, ET SES REFUS ────────────────────────

   On rejoue ce que /api/etat a mesuré sur son iPhone le 24 octobre 2026 :
   `tenu 8, relache 3, refuse 3, motif NotAllowedError, dernier relache`.
   L'horloge et les écoutes sont pilotées à la main : aucune attente réelle. */
function decor({refuser=()=>false,avecEvenementRelease=true}={}){
 const notes=[],demandes=[],relaches=[],ecoutes=new Map();
 let visible=true,minuteries=[],prochain=1;
 const verrous=[];
 const api={request:async()=>{
  demandes.push(Date.now());
  if(refuser(demandes.length))throw Object.assign(new Error('refus'),{name:'NotAllowedError'});
  const v={released:false,release:async()=>{v.released=true;relaches.push(verrous.indexOf(v));},
   addEventListener:avecEvenementRelease?(t,fn)=>{if(t==='release')v.declencherRelease=fn;}:undefined};
  verrous.push(v);return v;
 }};
 const arret=charger()({
  api,visible:()=>visible,noter:(e,d)=>notes.push(d?e+':'+d:e),
  ecouter:(event,fn)=>{ecoutes.set(event,[...(ecoutes.get(event)||[]),fn]);return()=>{};},
  planifier:(fn,ms)=>{const id=prochain++;minuteries.push({id,fn,ms});return id;},
  annuler:(id)=>{minuteries=minuteries.filter(t=>t.id!==id);},
 });
 return {notes,demandes,relaches,verrous,arret,
  async emettre(event){for(const fn of ecoutes.get(event)||[])fn();await souffler();},
  ecoute:(event)=>ecoutes.has(event),
  async battre(){const t=minuteries.shift();if(!t)return null;t.fn();await souffler();return t.ms;},
  minuteries:()=>minuteries.map(t=>t.ms),
  cacher(){visible=false;},montrer(){visible=true;},
 };
}

/* ── LE DÉFAUT 1 : ON CROYAIT TENIR UN VERROU PERDU ────────────────────────

   L'ancien code n'avait qu'un test, `verrou.released`. Quand iOS relâche sans
   mettre ce drapeau à jour, il prenait la branche « j'ai déjà un verrou »,
   reprogrammait à 30 s, et refaisait le même constat indéfiniment : l'écran
   s'éteignait et aucune touche ne le rallumait. Le battement REDEMANDE
   maintenant, au lieu de supposer. */
test('le battement redemande le verrou au lieu de se croire sur parole',async()=>{
 const d=decor({avecEvenementRelease:false});
 await souffler();
 assert.equal(d.demandes.length,1,'un verrou demandé à l’ouverture');
 assert.deepEqual(d.notes,['tenu']);
 /* iOS a relâché en silence : `released` reste faux, aucun événement. */
 assert.equal(await d.battre(),30000,'le battement est à trente secondes');
 assert.equal(d.demandes.length,2,'il REDEMANDE, il ne suppose pas');
 assert.deepEqual(d.notes,['tenu','tenu']);
 /* Et l'ancien verrou est relâché : on n'en laisse pas traîner deux. */
 assert.deepEqual(d.relaches,[0],'le premier verrou est rendu');
 d.arret();
});

/* ── LE DÉFAUT 2 : LA REPRISE N'AVAIT PAS DE GESTE ─────────────────────────

   `NotAllowedError` sur iOS, c'est une demande sans activation. Pendant qu'il
   écoute BIA parler, il ne touche rien : la reprise automatique échouait, le
   repli passait à 15 s, et échouait pareil. Un geste doit redemander tout de
   suite — c'est le chemin de retour qu'il a demandé. */
test('un refus NotAllowedError est rattrapé par le premier geste',async()=>{
 let refus=true;
 const d=decor({refuser:()=>refus});
 await souffler();
 assert.deepEqual(d.notes,['refuse:NotAllowedError']);
 assert.deepEqual(d.minuteries(),[15000],'on réessaie, sans bloquer');
 /* Il repose le téléphone, il ne touche rien : le réessai échoue encore. */
 await d.battre();
 assert.deepEqual(d.notes,['refuse:NotAllowedError','refuse:NotAllowedError']);
 /* Il touche l'écran. iOS accepte alors, et le verrou revient. */
 refus=false;
 await d.emettre('pointerdown');
 assert.equal(d.notes.at(-1),'tenu','le geste rattrape le refus');
 d.arret();
});

/* Les quatre gestes comptent : un doigt, un relâchement, un clic, une touche.
   Et les trois retours à la page aussi — « re-demandé quand on revient sur
   l'onglet », mot pour mot. */
test('les gestes et les retours à la page sont tous écoutés',async()=>{
 const d=decor();await souffler();
 for(const e of ['pointerdown','touchend','click','keydown'])assert(d.ecoute(e),'geste écouté : '+e);
 for(const e of ['visibilitychange','pageshow','focus'])assert(d.ecoute(e),'retour écouté : '+e);
 d.arret();
});

/* Le verrou ne tient que page visible — c'est le navigateur qui l'exige. On le
   rend en partant, et on le redemande en revenant : sans ça il ne revenait
   jamais après le premier changement d'application. */
test('le verrou est rendu quand on quitte, et redemandé quand on revient',async()=>{
 const d=decor();await souffler();
 assert.equal(d.demandes.length,1);
 d.cacher();await d.emettre('visibilitychange');
 assert.deepEqual(d.relaches,[0],'rendu en quittant');
 assert.equal(d.demandes.length,1,'et rien n’est demandé tant qu’on est parti');
 d.montrer();await d.emettre('visibilitychange');
 assert.equal(d.demandes.length,2,'redemandé au retour');
 assert.equal(d.notes.at(-1),'tenu');
 d.arret();
});

/* Un relâchement annoncé par le navigateur se note et se reprend vite : c'est
   le compteur `relache` de /api/etat, qui valait 3 sur son iPhone. */
test('un relâchement annoncé est noté et reprogrammé à une seconde',async()=>{
 const d=decor();await souffler();
 d.verrous[0].declencherRelease();
 await souffler();
 assert(d.notes.includes('relache'));
 assert(d.minuteries().includes(1000),'reprise rapide après un relâchement');
 await d.battre();
 assert.equal(d.notes.at(-1),'tenu');
 d.arret();
});

/* Sans l'API — un navigateur qui ne sait pas faire — on ne demande rien et
   rien ne casse. Le refus du système reste lisible dans /api/etat. */
test('un navigateur sans l’API le dit, et ne tente rien',async()=>{
 const notes=[];
 const arret=charger()({api:undefined,visible:()=>true,noter:e=>notes.push(e),
  ecouter:()=>()=>{},planifier:()=>1,annuler:()=>{}});
 await souffler();
 assert.deepEqual(notes,['api_absente']);
 arret();
});

/* Et le ménage : en quittant BIA, plus de verrou, plus de minuterie. Un écran
   allumé en permanence est ce qui vide un téléphone le plus vite. */
test('en quittant BIA, le verrou est rendu et la minuterie annulée',async()=>{
 const d=decor();await souffler();
 d.arret();
 assert.deepEqual(d.relaches,[0]);
 assert.deepEqual(d.minuteries(),[]);
});
