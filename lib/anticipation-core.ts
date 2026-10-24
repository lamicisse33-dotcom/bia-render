import {createHash} from 'node:crypto';
import {signesAnticipation} from './seuils-anticipation';
export const normaliserAnticipation=(s:string)=>String(s||'').normalize('NFC').replace(/\s+/g,' ').trim();
export const empreinteAnticipation=(s:string)=>createHash('sha256').update(s).digest('hex');
export function contexteAnticipation(history:any[],question=''){
 const h=(Array.isArray(history)?history:[]).filter(m=>['user','assistant'].includes(m?.role)&&m.transcriptionIncertaine!==true).map(m=>({role:m.role,content:String(m.content??m.text??'')}));
 if(h.at(-1)?.role==='user'&&normaliserAnticipation(h.at(-1)!.content)===normaliserAnticipation(question))h.pop();
 return h.slice(-10).map(m=>({...m,content:m.content.slice(0,3000)}));
}
// Actions, learning and current information always retain the normal chat path.
export function eligibleAnticipation(s:string){
 return s.length>=signesAnticipation()&&s.length<=6000&&!/\b(mémoris|memoris|memorize|retiens|retenir|oublie|efface|supprim|corrig|répèt|repèt|repete|répét|apprend|enregistr|envoi|envoie|envoyer|appell|appelle|réserv|reserv|achèt|acheter|commande|ouvre|ferme|micro|vidéo|video|youtube|internet|recherch|aujourd|météo|meteo|heure|actualité|actualite|prix actuel|déplo|deplo)/i.test(s);
}
// A story about buying/closing/correcting something is not an instruction to
// Bia. The brick model also classifies intent, and has no tools or write access.
export function eligibleBriques(s:string){
 return s.length>=signesAnticipation()&&s.length<=6000&&!/(?:^|[.!?;,]\s*)(?:(?:bia|s’il te plaît|s'il te plaît|et|puis)\s*[, :]?\s*)?(mémorise|memorise|retiens|oublie|efface|supprime|corrige|répète|repete|enregistre|envoie|appelle|réserve|reserve|achète|achete|commande|ouvre|ferme|recherche|déploie|deploie)\b/i.test(s)
  &&!/(?:peux[- ]tu|pourrais[- ]tu|tu peux|je (?:veux|voudrais) que tu|je te demande de|il faut que tu).{0,100}\b(?:mémoris|memoris|corrig|enregistr|envoy|appel|réserv|reserv|achet|ouvrir|ferm|recherch|déploy|deploy)/i.test(s);
}
export function verifierSuite(partiel:string,final:string){
 const p=normaliserAnticipation(partiel),f=normaliserAnticipation(final);
 if(!eligibleAnticipation(f)||!f.startsWith(p))return 'refus';
 if(f===p)return 'exact';
 const suite=f.slice(p.length);
 if(suite.length>240||/\b(non|pas|mais|finalement|plutôt|plutot|sauf|annule|oublie|waaye|déedéet|deedeet|bul)\b/i.test(suite))return 'refus';
 return 'verification';
}
