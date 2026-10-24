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
test('le verdict refuse Haiku s’il préserve moins de formulations que Sonnet',()=>{
 const verdict=(configure,temoin)=>configure>=temoin;
 assert.equal(verdict(3,3),true,'autant : on garde');
 assert.equal(verdict(3,2),true,'mieux : on garde');
 assert.equal(verdict(2,3),false,'moins : on refuse, même si c’est plus rapide');
 assert.equal(verdict(0,0),true,'aucune formulation en jeu : rien à conclure sur le wolof');
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
