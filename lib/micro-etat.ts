/* ── LE SEUIL DE PAROLE DÉTECTÉE, ÉTAGE PAR ÉTAGE ──────────────────────────

   Demandé par Lamine le 23 octobre 2026 : « creuse le seuil de parole
   détectée du micro. Mesure avant/après sur mes tours : combien de ms de
   parole sont comptées pour une phrase de 2,5 s. Ne change rien qui attrape
   plus de bruit sans me le dire. »

   RIEN N'EST CHANGÉ À LA DÉTECTION. Ce qui suit n'ajoute que des compteurs.
   Quatre étages décident qu'une trame est de la parole, et aucun ne disait
   combien il en refusait :

     1. `audible`        — le volume dépasse le seuil adaptatif du fond
     2. `bande_vocale`   — l'énergie est entre 200 et 3 500 Hz (part >= 0,2)
     3. `candidate`      — l'anti-scintillement : 2 trames sur les 4 dernières
     4. `focus`          — le guetteur de locuteur laisse passer

   ET LA DISTINCTION QUI MANQUAIT LE PLUS : `parole_ms` est un ÉCART, de la
   première à la dernière trame vocale — pas un temps d'enregistrement.
   `duree_ms` contient en plus le silence d'avant qu'il parle et les 400 ms de
   fin. Lire « 838 ms de parole pour 2 522 ms » comme une détection sévère
   était une erreur de lecture ; `vocales_dans_la_parole` tranche, en disant
   combien de trames ont été reconnues À L'INTÉRIEUR de cet écart. */

import {PAROLE_MINIMALE,PAROLE_MINIMALE_VOIX} from './micro';

type Fin={cause:string;duree_ms:number;parole_ms:number;silence_ms:number;pic:number;mesures:number;vocales:number;
 audibles:number|null;bande_vocale_ok:number|null;candidates:number|null;periodiques:number|null;refus_focus:number|null;
 vocales_dans_la_parole:number|null;intervalle_ms:number|null;seuil:number|null;
 plat:boolean;actuel:boolean;contexte:string;quand:string};
/* ── 26 OCTOBRE : CE QUI ÉTAIT REFUSÉ NE LAISSAIT AUCUNE TRACE ────────────

   « Je dis oui tout court, rien n'est entendu. » Le refus d'un mot court
   était muet : pas de compteur, pas de journal, et le seul `console.warn` de
   la page ne se déclenche que si la durée passait DÉJÀ le plancher — donc
   jamais pour un mot court. On ne pouvait ni le voir ni le mesurer.

   Un filet qui ne peut pas voir le trou ne sert à rien. Ces compteurs disent
   combien de paroles ont été écartées, et avec quelles mesures. */
type Refus={parole_comptee_ms:number;part_vocale:number|null;hauteur:number|null;morceaux:number;focus:boolean;quand:string};
type Etat={fins:number;courts:number;causes:Record<string,number>;derniers:Fin[];
 refuses?:number;refuses_courts?:number;refus_derniers?:Refus[]};
const g=globalThis as typeof globalThis&{biaMicroEtat?:Etat};
const etat:Etat=g.biaMicroEtat??={fins:0,courts:0,causes:{},derniers:[]};

const mediane=(v:number[])=>{const a=[...v].sort((x,y)=>x-y),m=Math.floor(a.length/2);return a.length?(a[m]+a[(a.length-1)>>1])/2:null;};

/** Ce que les étages de détection ont réellement laissé passer, en médiane. */
function etages(){
 const avecParole=etat.derniers.filter(f=>f.parole_ms>0&&f.mesures>0);
 const complets=avecParole.filter(f=>f.audibles!==null);
 if(!avecParole.length)return null;
 const part=(a:number|null,b:number)=>a===null||!b?null:Math.round((a/b)*100);
 return {
  tours_avec_parole:avecParole.length,
  tours_detailles:complets.length,
  /* La question de Lamine, en un nombre : combien de millisecondes de parole
     sont comptées, et sur quelle durée d'enregistrement. */
  parole_ms_mediane:mediane(avecParole.map(f=>f.parole_ms)),
  enregistrement_ms_median:mediane(avecParole.map(f=>f.duree_ms)),
  avant_la_premiere_voix_ms_median:mediane(avecParole.map(f=>Math.max(0,f.duree_ms-f.parole_ms-f.silence_ms))),
  intervalle_ms_median:mediane(complets.map(f=>f.intervalle_ms!).filter(Number.isFinite)),
  /* Et la réponse à « le seuil est-il trop sévère » : la part des trames
     reconnues À L'INTÉRIEUR de l'écart de parole. Proche de 100, la détection
     ne perd rien ; basse, elle hache la phrase. */
  part_reconnue_dans_la_parole_pourcent:mediane(
   complets.filter(f=>f.intervalle_ms&&f.vocales_dans_la_parole!==null)
    .map(f=>{const attendues=Math.max(1,Math.round(f.parole_ms/f.intervalle_ms!)+1);return Math.min(100,Math.round((f.vocales_dans_la_parole!/attendues)*100));})),
  refus_par_etage_median:{
   volume:mediane(complets.map(f=>part(f.mesures-f.audibles!,f.mesures)!).filter(x=>x!==null)),
   bande_vocale:mediane(complets.map(f=>part(f.audibles!-Math.min(f.audibles!,f.bande_vocale_ok!),f.mesures)!).filter(x=>x!==null)),
   anti_scintillement:mediane(complets.map(f=>part(Math.max(0,f.audibles!-f.candidates!),f.mesures)!).filter(x=>x!==null)),
   focus_locuteur:mediane(complets.map(f=>part(f.refus_focus!,f.mesures)!).filter(x=>x!==null)),
  },
  seuil_median:mediane(complets.map(f=>f.seuil!).filter(Number.isFinite)),
 };
}

/** Ce qui a été entendu puis écarté sans jamais partir à la transcription. */
function refus(){
 const l=etat.refus_derniers||[];
 if(!l.length)return {paroles_ecartees:etat.refuses||0,dont_trop_courtes:etat.refuses_courts||0,derniers:[]};
 return {
  paroles_ecartees:etat.refuses||0,
  dont_trop_courtes:etat.refuses_courts||0,
  parole_comptee_ms_mediane:mediane(l.map(r=>r.parole_comptee_ms)),
  plancher_mot_court_ms:PAROLE_MINIMALE_VOIX,
  plancher_ordinaire_ms:PAROLE_MINIMALE,
  derniers:l,
 };
}

export const resumeMicro=()=>({
 revision:'capture-etages-v2-refus-visibles',
 detection_inchangee:false,
 mots_courts:'plancher abaissé à '+PAROLE_MINIMALE_VOIX+' ms pour une voix PROUVÉE (bande + périodicité) ; '+PAROLE_MINIMALE+' ms pour tout le reste',
 etages_de_detection:etages(),
 paroles_ecartees:refus(),
 limite:'UN seuil est modifié depuis le 26 octobre, et il est écrit ici : le plancher de durée tombe à '+PAROLE_MINIMALE_VOIX+' ms quand la bande de la voix ET la périodicité prouvent une voix ; il reste à '+PAROLE_MINIMALE+' ms pour tout le reste, donc une porte qui claque est toujours écartée. Rien d’autre ne bouge : aucun seuil de volume, aucun filtre de bruit. `parole_ms` reste l’écart de la première à la dernière trame vocale ; `parole_comptee_ms` est ce qui DÉCIDE, trames comprises ; `duree_ms` contient en plus le silence d’avant la parole et les 400 ms de fin.',
 ...etat,
});

export function noterMicro(d:Record<string,unknown>){
 const cause=String(d.cause);if(!['silence','analyseur_plat','limite','reprise','absence','exterieur'].includes(cause))return;
 const n=(k:string,max:number)=>Math.max(0,Math.min(max,Number(d[k])||0));
 /* Les étages sont facultatifs : un téléphone qui n'a pas encore la nouvelle
    page continue d'être compté, sans fausser les médianes. */
 const o=(k:string,max:number)=>{const v=Number(d[k]);return Number.isFinite(v)&&v>=0&&v<=max?Math.round(v):null;};
 const fin:Fin={cause,duree_ms:n('duree_ms',600000),parole_ms:n('parole_ms',180000),silence_ms:n('silence_ms',600000),pic:n('pic',128),mesures:n('mesures',10000),vocales:n('vocales',10000),
  audibles:o('audibles',10000),bande_vocale_ok:o('bande_vocale_ok',10000),candidates:o('candidates',10000),periodiques:o('periodiques',10000),refus_focus:o('refus_focus',10000),
  vocales_dans_la_parole:o('vocales_dans_la_parole',10000),intervalle_ms:o('intervalle_ms',10000),seuil:o('seuil',255),
  plat:d.plat===true,actuel:d.actuel===true,contexte:['running','suspended','closed','interrupted'].includes(String(d.contexte))?String(d.contexte):'inconnu',quand:new Date().toISOString()};
 etat.fins++;if(fin.duree_ms<1000)etat.courts++;etat.causes[cause]=(etat.causes[cause]||0)+1;etat.derniers.push(fin);etat.derniers=etat.derniers.slice(-20);
}

/** Une parole entendue par le micro puis écartée avant la transcription. */
export function noterRefusMicro(d:Record<string,unknown>){
 const ms=Number(d.parole_comptee_ms);
 if(!Number.isFinite(ms)||ms<0||ms>180000)return;
 const pourcent=(k:string)=>{const v=Number(d[k]);return Number.isFinite(v)&&v>=0&&v<=100?Math.round(v):null;};
 const r:Refus={parole_comptee_ms:Math.round(ms),part_vocale:pourcent('part_vocale'),hauteur:pourcent('hauteur'),
  morceaux:Math.max(0,Math.min(10000,Number(d.morceaux)||0)),focus:d.focus!==false,quand:new Date().toISOString()};
 etat.refuses=(etat.refuses||0)+1;
 /* « Trop court » veut dire : même le plancher des mots courts n'est pas
    atteint. C'est le nombre que Lamine doit voir tomber à zéro. */
 if(r.parole_comptee_ms<PAROLE_MINIMALE_VOIX)etat.refuses_courts=(etat.refuses_courts||0)+1;
 etat.refus_derniers=[...(etat.refus_derniers||[]),r].slice(-20);
}
