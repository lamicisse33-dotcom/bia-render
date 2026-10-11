import {analyserDevoir} from "./dialogue-devoirs-core";
import type {DevoirALire} from "./lecture-devoirs-core";
export type OrigineDevoir={devoir_id:string;texte:string;debut:number;revision:string;langue:"fr"|"wo"};
export function origineValide(x:unknown):x is OrigineDevoir{
 const o=x as OrigineDevoir;
 return !!o&&typeof o.devoir_id==="string"&&o.devoir_id.length>0&&o.devoir_id.length<=200&&typeof o.texte==="string"&&o.texte.length>0&&o.texte.length<=6000&&Number.isSafeInteger(o.debut)&&o.debut>=0&&typeof o.revision==="string"&&/^[a-f0-9]{64}$/.test(o.revision)&&["fr","wo"].includes(o.langue);
}
/** Locate the actual language cell, including repeated wording in a lesson.
 * Reparse a marker substitution to prove which bilingual utterance it belongs to. */
export function origineReplique(d:DevoirALire,id:string,langue:"fr"|"wo"):OrigineDevoir|null{
 const p=analyserDevoir(d).repliques.find(p=>p.id===id);if(!p||!d.revision)return null;
 const texte=p[langue],marker="BIA_CORRECTION_SOURCE_7f934";
 for(let start=d.texte.indexOf(texte);start>=0;start=d.texte.indexOf(texte,start+1)){
  const probe=analyserDevoir({...d,texte:d.texte.slice(0,start)+marker+d.texte.slice(start+texte.length)}).repliques.find(p=>p.id===id);
  if(probe?.[langue]===marker)return {devoir_id:d.id,texte,debut:start,revision:d.revision,langue};
 }
 return null;
}
export type SourceDevoir=OrigineDevoir|{devoir_id:string;indisponible:true};
/** A reading segment may contain a heading or several bilingual utterances.
 * Never replace these structural elements with a user's spoken correction. */
export function originePassageLu(d:DevoirALire,debut:number,texte:string):SourceDevoir{
 const candidats:OrigineDevoir[]=[];
 for(const p of analyserDevoir(d).repliques)for(const langue of ["wo","fr"] as const){
  const o=origineReplique(d,p.id,langue);
  if(o&&o.debut<debut+texte.length&&o.debut+o.texte.length>debut)candidats.push(o);
 }
 return candidats.length===1?candidats[0]:{devoir_id:d.id,indisponible:true};
}
