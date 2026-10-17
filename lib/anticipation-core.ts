import {createHash} from 'node:crypto';
export const normaliserAnticipation=(s:string)=>String(s||'').normalize('NFC').replace(/\s+/g,' ').trim();
export const empreinteAnticipation=(s:string)=>createHash('sha256').update(s).digest('hex');
export function contexteAnticipation(history:any[],question=''){
 const h=(Array.isArray(history)?history:[]).filter(m=>['user','assistant'].includes(m?.role)&&m.transcriptionIncertaine!==true).map(m=>({role:m.role,content:String(m.content??m.text??'')}));
 if(h.at(-1)?.role==='user'&&normaliserAnticipation(h.at(-1)!.content)===normaliserAnticipation(question))h.pop();
 return h.slice(-10).map(m=>({...m,content:m.content.slice(0,3000)}));
}
// Actions, learning and current information always retain the normal chat path.
export function eligibleAnticipation(s:string){
 return s.length>=35&&s.length<=6000&&!/\b(mémoris|memoris|memorize|retiens|retenir|oublie|efface|supprim|corrig|répèt|repèt|repete|répét|apprend|enregistr|envoi|envoie|envoyer|appell|appelle|réserv|reserv|achèt|acheter|commande|ouvre|ferme|micro|vidéo|video|youtube|internet|recherch|aujourd|météo|meteo|heure|actualité|actualite|prix actuel|déplo|deplo)/i.test(s);
}
export function verifierSuite(partiel:string,final:string){
 const p=normaliserAnticipation(partiel),f=normaliserAnticipation(final);
 if(!eligibleAnticipation(f)||!f.startsWith(p))return 'refus';
 if(f===p)return 'exact';
 const suite=f.slice(p.length);
 if(suite.length>240||/\b(non|pas|mais|finalement|plutôt|plutot|sauf|annule|oublie|waaye|déedéet|deedeet|bul)\b/i.test(suite))return 'refus';
 return 'verification';
}
