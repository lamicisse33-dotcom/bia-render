import {identiteReconnue} from './identite-core';
import {VERSION_SONS_COURANTS,type SonCourant} from './sons-courants-core';
/** Any turn may ask Bia's name; no opening greeting or waiting sentence. */
export function identiteLocale(question:string,sons:SonCourant[],options:{apprend:boolean;correction:boolean}){
 if(options.apprend||options.correction)return null;
 const r=identiteReconnue(question);if(!r)return null;
 const son=sons.find(s=>s.cle==='ton-nom'&&s.langue===r.langue&&s.texte===r.reply&&s.version===VERSION_SONS_COURANTS&&s.octets>1000);
 return son?{...r,source:'identité Bia locale préenregistrée',son_courant:son}:null;
}
