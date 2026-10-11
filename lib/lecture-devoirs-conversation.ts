import {segmentsLecture} from "./lecture-continue";
import type {DevoirALire} from "./lecture-devoirs-core";

/** Read the saved originals through BIA's ordinary animated voice. No chat,
 * learning dialog, validation, or write to memory belongs to this operation. */
export async function lireDevoirsConversation(options:{
 charger:()=>Promise<{devoirs:DevoirALire[];incomplets:number}>;
 actuel:()=>boolean;
 annoncer:(nombre:number,incomplets:number)=>void;
 parler:(texte:string,langue:"fr"|"wo")=>Promise<void>;
}){
 const {devoirs,incomplets}=await options.charger();
 if(!options.actuel())return false;
 if(!devoirs.length)throw Error(incomplets?"Les devoirs enregistrés sont incomplets. Aucun texte complet à lire.":"Aucun devoir enregistré à lire.");
 options.annoncer(devoirs.length,incomplets);
 for(const devoir of devoirs){
  for(const texte of segmentsLecture(devoir.texte)){
   if(!options.actuel())return false;
   await options.parler(texte,devoir.langue);
   if(!options.actuel())return false;
  }
 }
 return true;
}
