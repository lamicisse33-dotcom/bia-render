import {salutationReconnue} from './salutations-dialogue';
import {indicesLangue} from './langue';
import {VERSION_SONS_COURANTS,type SonCourant} from './sons-courants-core';
/** Full greetings only. Catalogue text and audio stay paired after owner edits. */
export function salutationLocale(question:string,sons:SonCourant[],options:{apprend:boolean;correction:boolean;persona:string}){
 if(options.apprend||options.correction||options.persona==='rara')return null;
 const e=salutationReconnue(question);if(!e)return null;
 const score=indicesLangue(question),fr=/\b(?:bonjour|bonsoir|salut|hello|hey|comment|allez|vas|vous|tu)\b/iu.test(question);
 const langue: 'fr'|'wo'=score.wo>score.fr?'wo':fr?'fr':score.fr>score.wo?'fr':'wo';
 const son=sons.find(s=>s.cle===e.cle&&s.langue===langue&&s.version===VERSION_SONS_COURANTS&&s.octets>1000);
 return son?{reply:son.texte,langue,emotion:e.emotion||'douce',salutation:true,cle_salutation:e.cle,source:'salutation locale préenregistrée',son_courant:son}:null;
}
