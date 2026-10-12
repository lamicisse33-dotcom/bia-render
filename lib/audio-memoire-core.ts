import {createHash} from 'node:crypto';
import {analyserDevoir,normaliserDialogue} from './dialogue-devoirs-core';
import type {DevoirALire} from './lecture-devoirs-core';
import type {Lecon} from './lexique-apprentissage-core';
import {VERSION_SONS_COURANTS} from './sons-courants-core';
export type PhraseMemoire={texte:string;langue:'fr'|'wo';sources:string[]};
export type AudioMemoire=PhraseMemoire&{id:string;octets?:number;secondes?:number};
export function inventorierMemoire(devoirs:DevoirALire[],lecons:Lecon[],anciennes:Array<{source:string;corrigee:string;langue?:string;auteur?:string}>,partage:Array<{id:string;fr:string;wo:string}>=[]){
 const phrases=new Map<string,PhraseMemoire>(),aVerifier:string[]=[];let devoirsValides=0;
 function ajouter(texte:string,langue:'fr'|'wo',source:string){
  texte=texte.trim();if(!texte)return;
  if(texte.length>6000){aVerifier.push(source+': texte trop long');return;}
  const cle=langue+':'+texte;const p=phrases.get(cle);if(p){if(!p.sources.includes(source))p.sources.push(source);}else phrases.set(cle,{texte,langue,sources:[source]});
 }
 // A newer draft/revocation must not resurrect an older validated lesson.
 const derniers=new Map<string,DevoirALire>();for(const d of devoirs){const titre=d.texte.split(/\r?\n/).find(l=>/\bDEVOIR\s*\d+\b/i.test(l));const cle=titre?normaliserDialogue(titre):d.id;const precedent=derniers.get(cle);if(!precedent||d.date>=precedent.date)derniers.set(cle,d);}
 for(const d of derniers.values()){
  if(!d.valide)continue;
  if(/^\s*(?:[#*]\s*)*(?:instruction|consigne|règle|regle|test technique)\b/i.test(d.texte))continue;
  devoirsValides++;const dialogue=analyserDevoir(d);
  if(dialogue.repliques.length){for(const p of dialogue.repliques){ajouter(p.wo,'wo','devoir:'+d.id+':'+p.id);ajouter(p.fr,'fr','devoir:'+d.id+':'+p.id);}continue;}
  // Preserve explicitly labelled monolingual lines; do not invent translations.
  let n=0;for(const ligne of d.texte.split(/\r?\n/)){const m=ligne.trim().match(/^(?:\d+[.)]\s*)?(Wolof|Fran[cç]ais|WO|FR)\s*[:：]\s*(.+)$/i);if(m){ajouter(m[2],/^wo/i.test(m[1])?'wo':'fr','devoir:'+d.id);n++;}}
  if(!n){
   // A validated monolingual exercise can be plain lines, with its language
   // stored on the source block (for example the five Wave practice lines).
   const lignes=d.texte.split(/\r?\n/).map(l=>l.trim()).filter(l=>l&&!/^(?:[#*]\s*)*(?:DEVOIR\b|EXERCICE\b|PARTIE\b|OBJECTIF\b|CONSIGNE\b|DIALOGUE\b)/i.test(l));
   if(lignes.length)for(const [i,texte] of lignes.entries())ajouter(texte,d.langue,'devoir:'+d.id+':ligne-'+i);
   else aVerifier.push('devoir:'+d.id+': format à vérifier');
  }
 }
 for(const l of lecons)if(l.statut==='validé'&&l.date_validation){ajouter(l.texte,l.langue,'lexique:'+l.texte);if(l.exemple)ajouter(l.exemple,l.langue,'exemple:'+l.texte);}
 const vus=new Set<string>();for(const e of anciennes){const cle=(e.langue||'wo')+':'+e.source;if(vus.has(cle))continue;vus.add(cle);
  if(!['maitre-lecon','maitre-vocal'].includes(e.auteur||''))continue;
  ajouter(e.corrigee,e.langue==='fr'?'fr':'wo','ancienne:'+e.source);
  if(e.auteur==='maitre-lecon'&&e.source)ajouter(e.source,'fr','ancienne:'+e.source);
 }
 for(const p of partage){ajouter(p.fr,'fr','lexique-partage:'+p.id);ajouter(p.wo,'wo','lexique-partage:'+p.id);}
 return {phrases:[...phrases.values()],devoirsValides,aVerifier};
}
export const idAudioMemoire=(p:PhraseMemoire,passages:unknown)=>createHash('sha256').update(JSON.stringify(['memoire-v1',VERSION_SONS_COURANTS,p.langue,p.texte,passages])).digest('hex');
