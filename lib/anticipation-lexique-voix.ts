import {lireLecons} from './lexique-apprentissage';
import {reglesPrononciation} from './prononciation';
import {preparerPassagesKhalam} from './passages-khalam';

const g=globalThis as typeof globalThis&{biaAnticipationLexique?:{
 appels:number;erreurs:number;dernier_ms:number;enCours?:Promise<void>;diagnostic?:unknown;
}};
const etat=g.biaAnticipationLexique??={appels:0,erreurs:0,dernier_ms:0};
export function resumeAnticipationLexique(){const {enCours,...r}=etat;return {...r,en_cours:!!enCours};}
/** No separate snapshot or extended TTL: existing loaders own invalidation.
 * A correction saved during generation therefore still wins in the voice route.
 * Never await this speculative read on the conversational critical path. */
export function anticiperLexiqueVoix():void{
 if(etat.enCours)return;
 const debut=performance.now();etat.appels++;
 etat.enCours=Promise.all([lireLecons(),reglesPrononciation()]).then(()=>{},()=>{etat.erreurs++;})
 .finally(()=>{etat.dernier_ms=Math.round(performance.now()-debut);etat.enCours=undefined;});
}
/** Bounded read-only comparison, no synthesis or source edits. */
export async function verifierAnticipation(){
 const tours=[];
 for(const texte of ['Je peux t’aider à organiser ta journée.','Mu dem ci marse bi, jënd soble ak tamaate, te dellusi ci kër ga.']){
  const langue=texte.startsWith('Je')?'fr':'wo';
  const t=performance.now();
  await lireLecons(true);
  const avant=await preparerPassagesKhalam(texte,langue);
  const nonAnticipe=performance.now()-t;
  anticiperLexiqueVoix();await etat.enCours;
  const u=performance.now(),apres=await preparerPassagesKhalam(texte,langue);
  tours.push({langue,lecture_et_preparation_ms:Math.round(nonAnticipe),preparation_apres_anticipation_ms:Math.round(performance.now()-u),passages_identiques:JSON.stringify(avant)===JSON.stringify(apres)});
 }
 etat.diagnostic={date:new Date().toISOString(),tours,perimetre:'Lecture Supabase forcée comparée à un lexique déjà préparé ; aucun gain bout à bout déduit de cet essai.'};
}
