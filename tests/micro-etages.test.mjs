import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import ts from 'typescript';
const compile=s=>ts.transpileModule(s,{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText;
function charger(){delete globalThis.biaMicroEtat;const m={exports:{}};
 new Function('require','module','exports',compile(fs.readFileSync('lib/micro-etat.ts','utf8')))(id=>assert.fail(id),m,m.exports);return m.exports;}

/* ── LES QUATRE TOURS RÉELS, TELS QUE /api/etat LES A PUBLIÉS ─────────────
   micro_capture.derniers, 23 octobre 2026 à 23:36. Ces nombres ne sont pas
   inventés pour l'épreuve : ce sont ceux de Lamine. */
const REELS=[
 {duree_ms:2522,parole_ms:838,silence_ms:421,mesures:41,vocales:13},
 {duree_ms:2343,parole_ms:358,silence_ms:422,mesures:39,vocales:6},
 {duree_ms:2161,parole_ms:420,silence_ms:419,mesures:36,vocales:6},
 {duree_ms:2462,parole_ms:1498,silence_ms:421,mesures:41,vocales:17},
];

/* LA QUESTION DE LAMINE : « combien de ms de parole sont comptées pour une
   phrase de 2,5 s ». La réponse n'est pas une sévérité de seuil, c'est une
   confusion de grandeurs : `duree_ms` est la durée d'ENREGISTREMENT, qui
   contient le silence d'avant qu'il parle et les 400 ms de fin. */
test('le champ distingue la durée d’enregistrement de l’écart de parole',()=>{
 const etat=charger();
 for(const r of REELS)etat.noterMicro({cause:'silence',...r,actuel:true,contexte:'running'});
 const e=etat.resumeMicro().etages_de_detection;
 assert.equal(e.tours_avec_parole,4);
 assert.equal(e.enregistrement_ms_median,2402.5);
 assert.equal(e.parole_ms_mediane,629);
 /* Et voilà où passe la différence : près d'une seconde et demie avant la
    première trame vocale, parce qu'on ouvre le micro avant qu'il parle. */
 assert.equal(e.avant_la_premiere_voix_ms_median,1292.5);
 /* Les trois médianes ne portent pas sur les mêmes tours, donc elles ne se
    rajoutent pas à l'unité près. Le compte se vérifie tour par tour. */
 for(const r of REELS)assert.equal(r.duree_ms-r.parole_ms-r.silence_ms+r.parole_ms+r.silence_ms,r.duree_ms);
 assert.deepEqual(REELS.map(r=>r.duree_ms-r.parole_ms-r.silence_ms),[1263,1563,1322,543],
  'le temps avant la première trame vocale, tour par tour');
});

/* LA SECONDE QUESTION : le seuil hache-t-il la phrase ? On mesure la part des
   trames reconnues À L'INTÉRIEUR de l'écart de parole. Sans les compteurs
   d'étages, le champ doit le dire franchement plutôt que de deviner. */
test('sans les compteurs d’étages, rien n’est déduit',()=>{
 const etat=charger();
 for(const r of REELS)etat.noterMicro({cause:'silence',...r,actuel:true,contexte:'running'});
 const e=etat.resumeMicro().etages_de_detection;
 assert.equal(e.tours_detailles,0,'un ancien téléphone ne fausse pas les médianes');
 assert.equal(e.part_reconnue_dans_la_parole_pourcent,null);
 assert.equal(e.refus_par_etage_median.volume,null);
 assert.equal(e.seuil_median,null);
});

/* AVEC LES COMPTEURS : chaque étage dit ce qu'il a refusé, en part des trames
   de la capture. C'est ça qui permettra de décider SANS toucher au seuil. */
test('chaque étage de détection dit ce qu’il refuse',()=>{
 const etat=charger();
 /* Une capture de 2,4 s, 40 trames de 60 ms, 1,5 s de parole : 26 trames
    attendues dans l'écart, 24 reconnues — la détection ne hache pas. */
 etat.noterMicro({cause:'silence',duree_ms:2400,parole_ms:1500,silence_ms:420,mesures:40,vocales:24,
  audibles:30,bande_vocale_ok:34,candidates:26,periodiques:22,refus_focus:2,
  vocales_dans_la_parole:24,intervalle_ms:60,seuil:9,actuel:true,contexte:'running'});
 const e=etat.resumeMicro().etages_de_detection;
 assert.equal(e.tours_detailles,1);
 assert.equal(e.intervalle_ms_median,60);
 assert.equal(e.seuil_median,9);
 assert.equal(e.part_reconnue_dans_la_parole_pourcent,92,'24 reconnues sur 26 attendues');
 assert.equal(e.refus_par_etage_median.volume,25,'10 trames sur 40 sous le seuil de volume');
 assert.equal(e.refus_par_etage_median.anti_scintillement,10,'4 trames audibles sur 40 arrêtées par le filtre');
 assert.equal(e.refus_par_etage_median.focus_locuteur,5,'2 trames sur 40 refusées par le guetteur');
});

/* Et la promesse tenue à Lamine, écrite dans le champ public : rien de ce qui
   est mesuré ici ne modifie une décision de détection. */
test('le champ déclare qu’aucun seuil n’est touché, et ne porte aucun son',()=>{
 const etat=charger();
 etat.noterMicro({cause:'silence',duree_ms:2400,parole_ms:1500,silence_ms:420,mesures:40,vocales:24,
  audibles:30,bande_vocale_ok:34,candidates:26,periodiques:22,refus_focus:2,
  vocales_dans_la_parole:24,intervalle_ms:60,seuil:9,actuel:true,contexte:'running',
  texte:'phrase privée',audio:'AAAA'});
 const r=etat.resumeMicro();
 assert.equal(r.detection_inchangee,true);
 assert.equal(r.revision,'capture-etages-v1');
 assert(r.limite.includes('aucun seuil de détection'));
 const brut=JSON.stringify(r);
 for(const secret of ['phrase privée','AAAA'])assert(!brut.includes(secret),secret);
});

/* ── LES DEUX SEUILS DE L'ANTICIPATION : DÉFAUTS, BORNES, RETOUR EN ARRIÈRE ─

   Levier 1 du 24 octobre 2026. Ce qui est éprouvé ici, c'est la promesse de
   réversibilité : deux variables Render ramènent EXACTEMENT les valeurs du
   23 octobre, et une valeur absurde ne peut pas s'installer. */
function seuils(){const m={exports:{}};
 new Function('require','module','exports',compile(fs.readFileSync('lib/seuils-anticipation.ts','utf8')))(id=>assert.fail(id),m,m.exports);return m.exports;}

test('les deux seuils ont leurs nouvelles valeurs par défaut, et reviennent par variable Render',()=>{
 const vieux={p:process.env.BIA_PREMIER_SEGMENT_MS,s:process.env.BIA_SIGNES_ANTICIPATION};
 try{
  delete process.env.BIA_PREMIER_SEGMENT_MS;delete process.env.BIA_SIGNES_ANTICIPATION;
  const d=seuils();
  assert.equal(d.premierSegmentMs(),1000,'premier segment : 1 000 ms de parole, tranché par Lamine');
  assert.equal(d.signesAnticipation(),20,'plancher de texte : 20 signes');
  /* Le retour au comportement du 23 octobre, sans déploiement. */
  process.env.BIA_PREMIER_SEGMENT_MS='1500';process.env.BIA_SIGNES_ANTICIPATION='35';
  assert.equal(d.premierSegmentMs(),1500);
  assert.equal(d.signesAnticipation(),35);
 }finally{
  if(vieux.p===undefined)delete process.env.BIA_PREMIER_SEGMENT_MS;else process.env.BIA_PREMIER_SEGMENT_MS=vieux.p;
  if(vieux.s===undefined)delete process.env.BIA_SIGNES_ANTICIPATION;else process.env.BIA_SIGNES_ANTICIPATION=vieux.s;
 }
});

test('une valeur absurde ne peut pas s’installer : on garde le défaut',()=>{
 const vieux={p:process.env.BIA_PREMIER_SEGMENT_MS,s:process.env.BIA_SIGNES_ANTICIPATION};
 try{
  const d=seuils();
  /* 100 ms de parole enverrait des fragments de silence à l'ASR, et 0 signe
     préparerait sur un soupir. Les bornes sont là pour ça. */
  for(const mauvais of ['0','100','99999','abc','']){
   process.env.BIA_PREMIER_SEGMENT_MS=mauvais;
   assert.equal(d.premierSegmentMs(),1000,'premier segment refuse '+JSON.stringify(mauvais));
  }
  for(const mauvais of ['0','5','99999','abc','']){
   process.env.BIA_SIGNES_ANTICIPATION=mauvais;
   assert.equal(d.signesAnticipation(),20,'plancher refuse '+JSON.stringify(mauvais));
  }
  /* Les bornes elles-mêmes restent acceptées. */
  process.env.BIA_PREMIER_SEGMENT_MS='500';assert.equal(d.premierSegmentMs(),500);
  process.env.BIA_PREMIER_SEGMENT_MS='4000';assert.equal(d.premierSegmentMs(),4000);
  process.env.BIA_SIGNES_ANTICIPATION='10';assert.equal(d.signesAnticipation(),10);
  process.env.BIA_SIGNES_ANTICIPATION='200';assert.equal(d.signesAnticipation(),200);
 }finally{
  if(vieux.p===undefined)delete process.env.BIA_PREMIER_SEGMENT_MS;else process.env.BIA_PREMIER_SEGMENT_MS=vieux.p;
  if(vieux.s===undefined)delete process.env.BIA_SIGNES_ANTICIPATION;else process.env.BIA_SIGNES_ANTICIPATION=vieux.s;
 }
});

/* Et la porte de 700 ms remise à l'épreuve des durées réelles : sur les neuf
   `parole_ms` mesurés, sept qualifient au lieu de deux. C'est le gain attendu
   du levier 1, écrit en chiffres avant de l'annoncer. */
test('sur les neuf durées de parole mesurées, trois franchissent 1 000 ms au lieu d’une',()=>{
 const PAROLE_REELLE=[300,358,420,702,767,838,1151,1498,2686];
 /* 1 498 ms passait JUSTE en dessous de 1 500 : une seule phrase sur neuf
    atteignait l'ancien seuil. Le segment vu sur ce tour-là venait du silence
    de fin de parole, pas du seuil — ce qui colle aux compteurs publiés. */
 assert.equal(PAROLE_REELLE.filter(ms=>ms>=1500).length,1,'avec l’ancien seuil');
 assert.equal(PAROLE_REELLE.filter(ms=>ms>=1000).length,3,'avec le nouveau, tranché par Lamine');
 assert.equal(PAROLE_REELLE.filter(ms=>ms>=700).length,6,'ce qu’un seuil à 0,7 s aurait donné : plus de fragments, plus de replis');
});

/* ── LEVIER 2 : LE MODÈLE DES BRIQUES, ET LA PROMESSE DE RÉVERSIBILITÉ ─────

   Lamine, 24 octobre 2026 : « Haiku pour le texte des briques, wolof appris
   vérifié sur mes phrases réelles, réversible par variable Render. »

   Le piège était que `BIA_LLM_MODEL` est posé dans Render (claude-sonnet-5-5)
   et pilotait aussi les briques : laissé devant, le levier aurait été inerte.
   Cette épreuve vérifie qu'il ne l'est plus, et que la variable dédiée ramène
   exactement Sonnet. */
function cerveau(){const m={exports:{}};
 new Function('require','module','exports',compile(fs.readFileSync('lib/cerveau-anthropic.ts','utf8')))(
  id=>({'./panne':{noterPanne(){}},'./depense':{noterModele(){}},'./latence-cache-anthropic':{entetesCacheAnthropic:()=>({})}})[id]??{},m,m.exports);
 return m.exports;}

test('le modèle des briques est Haiku par défaut et revient à Sonnet par variable Render',()=>{
 const vieux={b:process.env.BIA_BRIQUES_MODEL,l:process.env.BIA_LLM_MODEL};
 try{
  const c=cerveau();
  delete process.env.BIA_BRIQUES_MODEL;
  /* Le piège : la variable globale est posée en production. Elle ne doit plus
     décider du modèle des briques, sinon le levier ne fait rien. */
  process.env.BIA_LLM_MODEL='claude-sonnet-5-5';
  assert.equal(c.modeleBriques(),c.MODELE_HAIKU,'BIA_LLM_MODEL ne pilote plus les briques');
  assert.equal(c.MODELE_HAIKU,'claude-haiku-5-5');
  /* Et le retour en arrière, sans déploiement. */
  process.env.BIA_BRIQUES_MODEL='claude-sonnet-5-5';
  assert.equal(c.modeleBriques(),c.MODELE_SONNET);
 }finally{
  if(vieux.b===undefined)delete process.env.BIA_BRIQUES_MODEL;else process.env.BIA_BRIQUES_MODEL=vieux.b;
  if(vieux.l===undefined)delete process.env.BIA_LLM_MODEL;else process.env.BIA_LLM_MODEL=vieux.l;
 }
});

/* Le verdict de l'essai est volontairement sévère, et c'est le cœur de la
   garantie : un gain de temps payé par une reformulation wolof n'est pas un
   gain. On éprouve la règle de décision, pas le modèle. */
/* ── ZÉRO CONTRE ZÉRO N'EST PAS UNE RÉUSSITE ───────────────────────────────

   Ma première règle valait `configure >= temoin`, donc VRAIE quand aucun des
   deux ne reproduisait la formulation. C'est ce qui est arrivé en ligne le
   24 octobre à 00:31 : `wolof_appris_preserve: true` sur une épreuve qui
   n'avait rien éprouvé. Un compteur qui dit « bon » sans avoir rien vu est
   pire qu'un compteur absent — RÈGLE 3, prise par l'autre bout. */
test('le verdict est nul quand rien n’est en jeu, et refuse une perte de fidélité',()=>{
 const verdict=(c,t)=>{const concluant=c+t>0;return {concluant,wolof_appris_preserve:concluant?c>=t:null};};
 assert.deepEqual(verdict(3,3),{concluant:true,wolof_appris_preserve:true},'autant : on garde');
 assert.deepEqual(verdict(3,2),{concluant:true,wolof_appris_preserve:true},'mieux : on garde');
 assert.deepEqual(verdict(2,3),{concluant:true,wolof_appris_preserve:false},'moins : on refuse, même si c’est plus rapide');
 assert.deepEqual(verdict(0,0),{concluant:false,wolof_appris_preserve:null},'rien en jeu : NUL, pas « bon »');
});

/* Et un refus de brique compte aussi : le 24 octobre, Haiku n'a produit aucune
   brique sur un des deux cas là où Sonnet en produisait une. Plus rapide en
   refusant n'est pas plus rapide. */
test('un refus de brique de plus que le témoin ne passe pas',()=>{
 const aussiSouvent=(c,t)=>c<=t;
 assert.equal(aussiSouvent(0,0),true);
 assert.equal(aussiSouvent(1,1),true,'les deux refusent autant : ce n’est pas le modèle');
 assert.equal(aussiSouvent(1,0),false,'un refus de plus : on ne garde pas');
});

/* Et la normalisation qui décide du « mot pour mot » : la ponctuation et les
   apostrophes typographiques ne doivent pas faire échouer une formulation
   réellement reprise, ni faire passer une reformulation. */
test('le mot-pour-mot tolère la ponctuation, jamais une reformulation',()=>{
 const normaliser=s=>String(s||'').normalize('NFC').toLowerCase()
  .replace(/[’']/g,"'").replace(/[.,!?;:()«»"…—–-]/g,' ').replace(/\s+/g,' ').trim();
 const apprise='waaw, dama ko xam bu baax';
 assert(normaliser('Waaw — dama ko xam bu baax !').includes(normaliser(apprise)));
 assert(normaliser('Oui papa. Waaw, dama ko xam bu baax.').includes(normaliser(apprise)));
 assert(!normaliser('Waaw, xam naa ko bu baax').includes(normaliser(apprise)),'une reformulation échoue');
});

/* ── LEVIER 3 : LA TÊTE COURTE, ET CE QU'ELLE NE DOIT PAS HACHER ───────────

   Lamine, 24 octobre 2026 : premier son à ~0,5 s de fabrication. Le pod est
   déjà chaud (file_gpu attente_ms 0, santé 200) : ce qui coûte, c'est la
   LONGUEUR du premier clip. On coupe à la virgule — mais seulement sur une
   phrase longue, sinon on hacherait toutes ses réponses. */
function diffusion(){const m={exports:{}};
 new Function('require','module','exports',compile(fs.readFileSync('lib/diffusion.ts','utf8')))(
  id=>assert.fail('lib/diffusion.ts ne doit rien importer : '+id),m,m.exports);
 return m.exports;}

test('une phrase courte garde sa mélodie entière, une phrase longue est coupée à la virgule',()=>{
 const {teteDeLaReponse}=diffusion();
 /* Courte : rien ne change, c'est la phrase entière. */
 const courte='Waaw papa, dama ko xam. Te suite.';
 assert.equal(teteDeLaReponse(courte),'Waaw papa, dama ko xam.');
 /* Longue : on coupe à la virgule qui donne au moins 20 signes, et le reste
    part au clip suivant pendant qu'elle dit le début. */
 const longue='Je comprends très bien ce que tu dis, et je vais te répondre franchement sur ce point. Suite.';
 assert.equal(teteDeLaReponse(longue),'Je comprends très bien ce que tu dis,');
 /* Et le texte dit reste le MÊME : seule la coupe change. */
 assert(longue.startsWith(teteDeLaReponse(longue)));

 /* Une virgule trop tôt — deux mots — ne fait pas abandonner la coupe : on
    cherche la suivante. S'il n'y en a pas, la phrase entière part, et sa
    mélodie reste intacte. */
 const tropTot='D’accord papa, je vais regarder ça tout de suite et je te dis ce que j’en pense. Suite.';
 assert.equal(teteDeLaReponse(tropTot),'D’accord papa, je vais regarder ça tout de suite et je te dis ce que j’en pense.');
 const deuxVirgules='D’accord papa, je regarde ça maintenant, et je te réponds franchement sur ce point. Suite.';
 assert.equal(teteDeLaReponse(deuxVirgules),'D’accord papa, je regarde ça maintenant,');
});

test('la tête courte ne coupe jamais au-delà de ce qu’on aurait dit, ni sur un nombre',()=>{
 const {teteDeLaReponse}=diffusion();
 /* La virgule est cherchée DANS la phrase trouvée, jamais après : ici elle
    n'arrive qu'après le point, donc la phrase entière part. */
 const apres='Bonjour papa comment vas-tu aujourd’hui mon cher ami de toujours. Ensuite, autre chose.';
 assert.equal(teteDeLaReponse(apres),'Bonjour papa comment vas-tu aujourd’hui mon cher ami de toujours.');
 /* « 1,5 » n'est pas une pause : la virgule doit être suivie d'une espace. */
 const nombre='Ça fait 1,5 million de francs et ça reste beaucoup trop cher pour ce service. Suite.';
 assert.equal(teteDeLaReponse(nombre),'Ça fait 1,5 million de francs et ça reste beaucoup trop cher pour ce service.');
});

test('le réglage à zéro rend exactement la tête d’avant',()=>{
 const {teteDeLaReponse}=diffusion();
 const longue='D’accord papa, je vais regarder ça tout de suite et je te dis ce que j’en pense vraiment. Suite.';
 assert.equal(teteDeLaReponse(longue,0),'D’accord papa, je vais regarder ça tout de suite et je te dis ce que j’en pense vraiment.');
});

/* Le verdict du levier 4, écrit en chiffres : c'est la règle que j'avais posée
   avant de lancer l'essai, appliquée aux nombres réels de ses quatre tours. */
test('la règle de l’essai briques finales condamne l’essai sur ses chiffres réels',()=>{
 const juger=({replis,chaines,premierSonMedian,vecuOrdinaire})=>
   ({part_replis:Math.round((replis/chaines)*100),garder:premierSonMedian!==null&&premierSonMedian<vecuOrdinaire});
 /* 24 octobre, 00:51 : 7 replis sur 10 chaînes, premier son par briques
    6 749 ms contre 6 340 ms au chemin ordinaire. */
 assert.deepEqual(juger({replis:7,chaines:10,premierSonMedian:6749,vecuOrdinaire:6340}),
  {part_replis:70,garder:false});
 /* Et ce qu'il aurait fallu pour le garder. */
 assert.equal(juger({replis:1,chaines:10,premierSonMedian:3000,vecuOrdinaire:6340}).garder,true);
});
