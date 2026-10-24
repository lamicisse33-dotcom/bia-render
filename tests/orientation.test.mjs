import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import ts from 'typescript';
const compile=s=>ts.transpileModule(s,{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText;
const m={exports:{}};
new Function('require','module','exports',compile(fs.readFileSync('lib/orientation.ts','utf8')))(
 id=>assert.fail('lib/orientation.ts ne doit rien importer : '+id),m,m.exports);
const O=m.exports;

/* Des points réels de Dakar, pris sur la carte, pas inventés. */
const SANDAGA={lat:14.6733,lon:-17.4467};
const ALMADIES={lat:14.7447,lon:-17.5088};
const MEDINA={lat:14.6830,lon:-17.4530};
const OUAKAM={lat:14.7230,lon:-17.4900};
const PLATEAU={lat:14.6690,lon:-17.4350};

/* ── ON NE TOUCHE AU GPS QUE QUAND ELLE PARLE DE CHEMIN ────────────────────
   « demandée seulement quand la personne parle de chemin, lieu ou "je suis
   perdu" ». Le reste de ses phrases ne doit RIEN déclencher. */
test('la position n’est demandée que sur une vraie demande de chemin',()=>{
 for(const oui of [
  'Je suis perdu, aide-moi',
  'je ne sais pas où je suis',
  'Fi laa nekk ?',
  'Quel est le chemin pour aller au marché ?',
  'Tu peux m’emmener à l’hôpital ?',
  'Jox ma yoon wi ba marché bi',
  'Comment je fais pour aller à la gare ?',
 ]) assert.equal(O.demandeDOrientation(oui),true,'devrait demander : '+oui);

 for(const non of [
  'Bonjour, comment vas-tu ?',
  'Raconte-moi une histoire',
  /* « Je suis perdu dans mes comptes » déclenche, et c'est assumé : un faux
     positif coûte UNE question refusable à l'écran, un faux négatif laisse
     quelqu'un perdu dans une ville inconnue. */
  'Quelle heure est-il ?',
  'Naka nga def ?',
  'Explique-moi ce mot wolof',
  '',
 ]) assert.equal(O.demandeDOrientation(non),false,'ne devrait RIEN déclencher : '+non);
});

/* « je suis perdu dans mes comptes » est le piège : le mot « perdu » seul ne
   suffit pas, il faut un lieu ou un chemin — sauf pour les phrases de
   détresse, qui ont leur propre liste. */
test('« perdu » tout court ne suffit pas, « je suis perdu » oui',()=>{
 assert.equal(O.demandeDOrientation('j’ai perdu mes clés'),false,'perdre ses clés n’est pas se perdre');
 assert.equal(O.demandeDOrientation('j’ai perdu mon téléphone'),false);
 assert.equal(O.demandeDOrientation('Je suis perdu'),true);
 assert.equal(O.demandeDOrientation('Je suis perdu dans mes comptes'),true,'le doute penche du côté de l’aide');
});

/* Le piège du 24 octobre 2026 : `/\bmarché\b/` ne reconnaît PAS « marché »,
   parce que `é` n'est pas un caractère de mot pour `\b`. La moitié des lieux
   de Dakar s'écrit avec un accent. */
test('les lieux accentués sont reconnus : marché, hôpital, aéroport, mosquée',()=>{
 for(const lieu of ['marché','hôpital','aéroport','mosquée','église','hôtel'])
  assert.equal(O.demandeDOrientation(`Quel est le chemin pour aller au ${lieu} ?`),true,lieu);
});

/* ── LA DISTANCE ET LE CAP, VÉRIFIÉS SUR DAKAR ─────────────────────────── */
test('la distance à vol d’oiseau est juste sur des points réels de Dakar',()=>{
 const d=O.distanceM(SANDAGA,ALMADIES);
 assert(d>10000&&d<12000,`Sandaga → Almadies : ${d} m, attendu entre 10 et 12 km`);
 assert.equal(O.distanceM(SANDAGA,SANDAGA),0);
 /* Symétrique : la distance ne dépend pas du sens. */
 assert.equal(O.distanceM(MEDINA,OUAKAM),O.distanceM(OUAKAM,MEDINA));
});

test('la direction est celle qu’on donnerait du doigt',()=>{
 /* Les Almadies sont au nord-ouest de Sandaga : c'est la géographie de Dakar. */
 assert.equal(O.direction(SANDAGA,ALMADIES,'fr'),'le nord-ouest');
 assert.equal(O.direction(ALMADIES,SANDAGA,'fr'),'le sud-est','et l’inverse à l’opposé');
 assert.equal(O.direction(MEDINA,OUAKAM,'fr'),'le nord-ouest');
 /* Plateau est au sud-est de la Médina. */
 assert.equal(O.direction(MEDINA,PLATEAU,'fr'),'le sud-est');
 /* Huit directions, jamais seize : « est-nord-est » ne se retient pas à pied. */
 const toutes=new Set();
 for(let a=0;a<360;a+=5){
  const vers={lat:SANDAGA.lat+Math.cos(a*Math.PI/180)*0.05,lon:SANDAGA.lon+Math.sin(a*Math.PI/180)*0.05};
  toutes.add(O.direction(SANDAGA,vers,'fr'));
 }
 assert.equal(toutes.size,8);
});

test('le wolof a ses propres points cardinaux',()=>{
 assert.equal(O.direction(SANDAGA,ALMADIES,'wo'),'bëj-gànnaar ak sowu');
 assert.equal(O.direction(MEDINA,PLATEAU,'wo'),'bëj-saalum ak penku');
});

/* ── LA DURÉE D'OSRM N'EST JAMAIS DITE À UN PIÉTON ─────────────────────────
   Mesuré le 24 octobre : les cinq profils du routeur public rendent la même
   durée, 8,5 min sur Médina → Ouakam — toujours la voiture. À pied, 6,7 km
   font près d'une heure. */
test('le temps de marche est calculé ici, pas repris du routeur',()=>{
 assert.equal(O.VITESSE_MARCHE_KMH,4.5);
 const minutes=O.minutesDeMarche(6720);
 assert(minutes>=85&&minutes<=95,`6,7 km à pied : ${minutes} min, loin des 8,5 min du routeur`);
 assert.equal(O.minutesDeMarche(10),1,'jamais zéro minute');
 /* Arrondi vers le haut : arriver avant l’heure annoncée vaut mieux. */
 assert.equal(O.minutesDeMarche(76),2);
});

test('la distance se dit comme on la dit, pas comme un géomètre',()=>{
 assert.equal(O.distanceDite(60),'moins de cent mètres');
 assert.equal(O.distanceDite(640),'600 mètres');
 assert.equal(O.distanceDite(1240),'1,2 kilomètres');
 assert.equal(O.distanceDite(12480),'12 kilomètres');
 assert.equal(O.distanceDite(640,'wo'),'600 meetar');
});

/* ── LA PHRASE : COURTE, DIRECTION ET DISTANCE ─────────────────────────── */
test('la phrase donne la direction et la distance, et reste courte',()=>{
 const p=O.phraseOrientation({de:MEDINA,vers:OUAKAM,nom:'Ouakam',metres:6720});
 assert(p.includes('le nord-ouest'),p);
 assert(p.includes('6,7 kilomètres'),p);
 assert(p.includes('90 minutes'),p);
 assert(!/\b8[,.]5\b/.test(p),'la durée du routeur ne doit jamais apparaître');
 assert(p.length<=120,'une phrase, pas un itinéraire récité : '+p.length+' signes');
 const w=O.phraseOrientation({de:MEDINA,vers:OUAKAM,nom:'Ouakam',metres:6720,langue:'wo'});
 assert(w.includes('bëj-gànnaar ak sowu'),w);
 assert(w.includes('simili'),w);
});

test('sans distance du routeur, la phrase se rabat sur le vol d’oiseau',()=>{
 const p=O.phraseOrientation({de:MEDINA,vers:OUAKAM,nom:'Ouakam',metres:null});
 assert(p.includes('le nord-ouest'),p);
 assert(/kilom[eè]tres/.test(p),p);
});

/* Et la promesse qui compte autant que le reste : ce module ne sait pas
   écrire. Aucun import, aucun réseau, aucun stockage — la position ne peut
   pas lui échapper. */
test('le module ne peut rien écrire ni envoyer nulle part',()=>{
 const source=fs.readFileSync('lib/orientation.ts','utf8');
 for(const interdit of ['fetch(','localStorage','supabase','garder(','require('])
  assert(!source.includes(interdit),'ce module ne doit pas contenir : '+interdit);
 /* Aucune instruction d'import. Le mot « import » apparaît dans un
    commentaire du module — c'est le motif qui doit être juste, pas la prose
    qu'on tord autour : une instruction TypeScript commence en colonne zéro. */
 assert(!/^import\s/m.test(source),'aucune instruction d’import');
 assert(!/^export\s+\*\s+from/m.test(source),'aucune ré-exportation');
});

/* ── LA ROUTE : ELLE RÉPOND, ET ELLE N'ÉCRIT RIEN ──────────────────────────

   « la position n'est jamais écrite en mémoire ni dans Supabase, elle sert au
   tour en cours. » Cette épreuve vérifie les deux : la réponse est juste, et
   aucune écriture n'est seulement POSSIBLE depuis ce fichier. */
function routeOrientation(reponseRouteur){
 const mod={exports:{}};const notes=[];
 const deps={
  'next/server':{NextResponse:{json:(d,o)=>Response.json(d,o)}},
  '@/lib/codes':{verifierCode:code=>({ok:code==='CODE',maitre:true})},
  '@/lib/orientation':O,
  '@/lib/orientation-etat':{noterOrientation:d=>notes.push(d)},
 };
 new Function('require','module','exports',compile(fs.readFileSync('app/api/orientation/route.ts','utf8')))(
  id=>{assert(id in deps,'dépendance non prévue : '+id);return deps[id];},mod,mod.exports);
 const vieux=globalThis.fetch;
 globalThis.fetch=async()=>reponseRouteur();
 return {POST:mod.exports.POST,notes,rendre:()=>{globalThis.fetch=vieux;}};
}
const requete=(corps,code='CODE')=>({headers:new Headers({'x-bia-code':code}),json:async()=>corps});

test('la route rend la direction, la distance par les rues et une phrase courte',async()=>{
 const r=routeOrientation(()=>Response.json({code:'Ok',routes:[{distance:6720}]}));
 try{
  const d=await (await r.POST(requete({de:MEDINA,vers:{...OUAKAM,nom:'Ouakam'}}))).json();
  assert.equal(d.direction,'le nord-ouest');
  assert.equal(d.distance_m,6720);
  assert.equal(d.par_les_rues,true,'la distance vient des rues, et on le dit');
  assert(d.marche_minutes>=85&&d.marche_minutes<=95,'temps de marche calculé ici : '+d.marche_minutes);
  assert(d.phrase.includes('Ouakam')&&d.phrase.includes('le nord-ouest'),d.phrase);
  assert.equal(d.routeur_provisoire,true,'le routeur public est annoncé provisoire');
  /* Ce qui est compté : un succès et une durée. Jamais un lieu. */
  assert.equal(r.notes.length,1);
  assert.deepEqual(Object.keys(r.notes[0]).sort(),['ms','ok','parLesRues']);
 }finally{r.rendre();}
});

test('un routeur muet ne laisse pas quelqu’un sans réponse',async()=>{
 const r=routeOrientation(()=>{throw new Error('réseau');});
 try{
  const d=await (await r.POST(requete({de:MEDINA,vers:{...OUAKAM,nom:'Ouakam'}}))).json();
  assert.equal(d.par_les_rues,false,'on dit que c’est un vol d’oiseau');
  assert.equal(d.distance_m,d.distance_vol_oiseau_m);
  assert(d.phrase.includes('le nord-ouest'),'la direction reste juste : '+d.phrase);
 }finally{r.rendre();}
});

test('une coordonnée impossible est refusée, et comptée comme telle',async()=>{
 const r=routeOrientation(()=>Response.json({code:'Ok',routes:[{distance:10}]}));
 try{
  for(const mauvais of [{de:{lat:200,lon:0},vers:OUAKAM},{de:MEDINA,vers:{lat:0,lon:999}},{de:MEDINA},{}])
   assert.equal((await r.POST(requete(mauvais))).status,400,JSON.stringify(mauvais));
  assert.equal((await r.POST(requete({de:MEDINA,vers:OUAKAM},'AUTRE'))).status,401,'sans code, rien');
  assert.equal(r.notes.filter(n=>n.motif==='coordonnees').length,4);
 }finally{r.rendre();}
});

test('la route ne peut rien écrire : ni souvenir, ni Supabase, ni fil',()=>{
 /* On regarde le CODE, pas la prose : les commentaires de ce fichier parlent
    justement de Supabase pour dire qu'on n'y écrit rien. Corriger le motif,
    pas tordre le texte autour. */
 const sansCommentaires=(chemin)=>fs.readFileSync(chemin,'utf8')
  .replace(/\/\*[\s\S]*?\*\//g,' ').replace(/(^|[^:])\/\/.*$/gm,'$1');
 const code=sansCommentaires('app/api/orientation/route.ts');
 for(const interdit of ['souvenirs','garder','lexique','supabase','Supabase','khalam_souvenirs','lectures-supabase'])
  assert(!code.includes(interdit),'la route ne doit pas pouvoir écrire : '+interdit);
 /* Et ce qu'elle importe se compte : rien qui sache écrire. */
 const imports=[...code.matchAll(/from\s+["']([^"']+)["']/g)].map(m=>m[1]).sort();
 assert.deepEqual(imports,['@/lib/codes','@/lib/orientation','@/lib/orientation-etat','next/server']);
 /* Et son compteur non plus : aucune coordonnée, aucun nom de lieu. */
 const etat=sansCommentaires('lib/orientation-etat.ts');
 for(const interdit of ['lat','lon','nom','phrase'])
  assert(!new RegExp('\\b'+interdit+'\\s*[:=]').test(etat),'le compteur ne doit pas porter : '+interdit);
});

/* ── L'OUTIL DE KHALAM RAPIDE : L'ORDRE DES GESTES ─────────────────────────

   Lamine, le 24 octobre 2026 : « toujours pas la carte pour une indication ».
   La cause : ce moteur n'avait qu'un outil et sa consigne interdisait les
   commandes d'écran — depuis qu'il est le défaut, la carte était devenue
   inatteignable pour tout le monde.

   Ce qui est éprouvé ici, c'est l'ORDRE : l'accord d'abord, le GPS seulement
   après, et rien du tout si elle dit non. */
function moteurRapide({accord,position,lieu,orientation}){
 const mod={exports:{}};
 new Function('module','exports',compile(fs.readFileSync('lib/gemini-live-client.ts','utf8')))(mod,mod.exports);
 const journal=[],cartes=[];
 /* `navigator` n'a qu'un accesseur dans Node : on le redéfinit, on ne
    l'affecte pas. */
 const vieux={fetch:globalThis.fetch,geo:Object.getOwnPropertyDescriptor(globalThis,'navigator')};
 Object.defineProperty(globalThis,'navigator',{configurable:true,writable:true,
  value:{geolocation:{getCurrentPosition:(ok,non)=>{
   journal.push('gps');
   position?ok({coords:position}):non(new Error('refus'));
  }}}});
 globalThis.fetch=async(url)=>{
  const chemin=String(url);
  journal.push(chemin.split('?')[0]);
  if(chemin.startsWith('/api/lieu'))return {ok:true,json:async()=>lieu};
  if(chemin.startsWith('/api/orientation'))return {ok:true,json:async()=>orientation};
  throw new Error('appel non prévu : '+chemin);
 };
 const client=new mod.exports.BiaGeminiLive('CODE',{
  etat(){},transcription(){},parle(){},latence(){},erreur(){},
  accordPosition:async()=>{journal.push('accord');return accord;},
  carte:(l)=>{cartes.push(l);},
 });
 return {journal,cartes,
  appeler:(destination)=>client.montrerLeChemin(destination),
  rendre:()=>{globalThis.fetch=vieux.fetch;
   if(vieux.geo)Object.defineProperty(globalThis,'navigator',vieux.geo);
   else delete globalThis.navigator;}};
}

test('l’accord est demandé AVANT le GPS, et un non arrête tout',async()=>{
 const m=moteurRapide({accord:false,position:{latitude:14.683,longitude:-17.453}});
 try{
  const r=await m.appeler('Ouakam');
  assert.equal(r.refus,true);
  assert.deepEqual(m.journal,['accord'],'le GPS n’est JAMAIS touché après un refus');
  assert.equal(m.cartes.length,0,'et aucune carte ne s’ouvre');
  assert(/ne la redemande pas/i.test(r.erreur),'et BIA ne doit pas insister : '+r.erreur);
 }finally{m.rendre();}
});

test('sur un oui, la carte s’ouvre vraiment et BIA reçoit une phrase à dire',async()=>{
 const m=moteurRapide({accord:true,position:{latitude:14.683,longitude:-17.453},
  lieu:{candidats:[{dit:'Ouakam',lat:14.723,lon:-17.490,sur:true}]},
  orientation:{phrase:'Ouakam, c’est vers le nord-ouest, à 6,7 kilomètres. À pied, environ 90 minutes.',
   direction:'le nord-ouest',distance_m:6720,marche_minutes:90,par_les_rues:true}});
 try{
  const r=await m.appeler('Ouakam');
  assert.deepEqual(m.journal,['accord','gps','/api/lieu','/api/orientation'],'l’ordre des gestes');
  assert.equal(r.carte_affichee,true);
  assert.equal(m.cartes.length,1,'la carte s’ouvre VRAIMENT');
  assert.deepEqual(m.cartes[0],{dit:'Ouakam',lat:14.723,lon:-17.490,sur:true});
  assert.equal(r.direction,'le nord-ouest');
  assert.equal(r.marche_minutes,90);
  assert(r.a_dire.includes('nord-ouest'),r.a_dire);
  assert(/Ne donne pas de durée en voiture/.test(r.instruction),'la durée du routeur reste interdite');
 }finally{m.rendre();}
});

test('un lieu introuvable le dit, sans ouvrir de carte au hasard',async()=>{
 const m=moteurRapide({accord:true,position:{latitude:14.683,longitude:-17.453},lieu:{candidats:[]}});
 try{
  const r=await m.appeler('Un endroit qui n’existe pas');
  assert.equal(m.cartes.length,0);
  assert(/je ne trouve pas/i.test(r.erreur),r.erreur);
 }finally{m.rendre();}
});

test('sans destination, on ne demande ni accord ni position',async()=>{
 const m=moteurRapide({accord:true});
 try{
  const r=await m.appeler('   ');
  assert.deepEqual(m.journal,[],'rien n’est touché');
  assert(r.erreur);
 }finally{m.rendre();}
});
