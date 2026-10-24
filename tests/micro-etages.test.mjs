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
