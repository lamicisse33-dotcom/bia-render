import {salutationReconnue} from './salutations-dialogue';
import {indicesLangue} from './langue';
import {VERSION_SONS_COURANTS,type SonCourant} from './sons-courants-core';
/** Full greetings only. Catalogue text and audio stay paired after owner edits. */
export function salutationLocale(question:string,sons:SonCourant[],options:{apprend:boolean;correction:boolean;persona:string;ouverture?:boolean}){
 if(options.apprend||options.correction||options.ouverture!==true)return null;
 const e=salutationReconnue(question);if(!e)return null;
 const score=indicesLangue(question),fr=/\b(?:bonjour|bonsoir|salut|coucou|allô|allo|hello|hey|comment|allez|vas|vous|tu)\b/iu.test(question);
 const francais=fr||/ça\s+va|ca\s+va/iu.test(question);
 const langue: 'fr'|'wo'=score.wo>score.fr?'wo':francais?'fr':score.fr>score.wo?'fr':'wo';
 const son=sons.find(s=>s.cle===e.cle&&s.langue===langue&&s.version===VERSION_SONS_COURANTS&&s.octets>1000);
 return son?{reply:son.texte,langue,emotion:e.emotion||'douce',salutation:true,salutation_ouverture:true,cle_salutation:e.cle,source:'salutation locale préenregistrée',son_courant:son}:null;
}
/** A shipped audio can be reused only when the live catalogue still names it. */
export function lotSalutationsCourant(sons:SonCourant[],lot:unknown):Array<{son:SonCourant;audio:string}>{
 if(!lot||typeof lot!=='object'||!Array.isArray((lot as {sons?:unknown}).sons))return [];
 return ((lot as {sons:unknown[]}).sons).flatMap(row=>{
  if(!row||typeof row!=='object')return [];const r=row as {son?:SonCourant;audio?:unknown};
  if(typeof r.audio!=='string'||!r.son)return [];
  const courant=sons.find(s=>s.usage==='salutation'&&s.version===VERSION_SONS_COURANTS&&s.cle===r.son!.cle&&s.langue===r.son!.langue&&s.texte===r.son!.texte&&s.adresse===r.son!.adresse);
  return courant?[{son:courant,audio:r.audio}]:[];
 });
}
