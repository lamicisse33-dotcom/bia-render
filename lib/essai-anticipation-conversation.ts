import {preparerReponseAnticipee,consommerReponseAnticipee} from './anticipation-reponse';
import {createHash} from 'node:crypto';
const g=globalThis as typeof globalThis&{biaEssaiAnticipation?:any};
const etat=g.biaEssaiAnticipation??={statut:'non_lance',synthetique:true};
export const resumeEssaiAnticipation=()=>({...etat});
export async function verifierAnticipationConversation(){
 if(etat.statut!=='non_lance'||!process.env.BIA_CODE_MAITRE)return;
 etat.statut='en_cours';const debut=Date.now();
 try{
  const texte='Je voudrais comprendre comment mieux écouter un ami qui traverse une période difficile, sans lui imposer mes conseils.';
  const code=process.env.BIA_CODE_MAITRE;
  const pret=await preparerReponseAnticipee({texte,tour:'diagnostic-anticipation-20261017',history:[],resume:'',voice:'female',persona:'bia'},code,true,AbortSignal.timeout(45000));
  if(!pret){etat.statut='preparation_non_confirmee';return;}
  etat.preparation_ms=Date.now()-debut;const fin=Date.now();
  const d=await consommerReponseAnticipee({anticipationId:pret.id,message:texte+' C’est tout.',history:[],resume:'',voixAnticipee:'female',persona:'bia'},code,AbortSignal.timeout(12000));
  etat.validation_finale_ms=Date.now()-fin;
  if(!d){etat.statut='validation_non_confirmee';return;}
  const bytes=Buffer.from(d.audio_anticipe.base64,'base64');etat.octets_audio=bytes.length;etat.sha256_audio=createHash('sha256').update(bytes).digest('hex');
  etat.consommation_unique=(await consommerReponseAnticipee({anticipationId:pret.id},code))===null;
  etat.statut=bytes.length>1000&&etat.consommation_unique?'confirme':'audio_non_confirme';
 }catch{etat.statut='erreur';}finally{etat.termine=new Date().toISOString();}
}
