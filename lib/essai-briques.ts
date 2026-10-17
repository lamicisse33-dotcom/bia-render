import {preparerBrique} from './briques-reponse';
import {etatBriques} from './briques-etat';
import {createHash} from 'node:crypto';
/** Bounded real-model/audio smoke check; never stored as a user's conversation. */
export async function verifierBriques(){
 if(etatBriques.essai||!process.env.BIA_CODE_MAITRE)return;
 const essai=etatBriques.essai={statut:'en_cours',synthetique:true,apparence:'rara',revision:'chaine-continue-v2'} as Record<string,unknown>;
 const code=process.env.BIA_CODE_MAITRE;
 const texte='Ce matin, en allant au marché, je suis passé chez le cordonnier pour faire réparer mes chaussures. Ensuite je suis passé chez le coiffeur.';
 try{
  const debut=Date.now();
  const a=await preparerBrique({texte,tour:'diagnostic-briques-20261017',history:[],resume:'',voice:'female',persona:'rara'},code,true,AbortSignal.timeout(35000));
  essai.premiere_preparation_ms=Date.now()-debut;
  if(!a?.brique){essai.statut='premiere_non_confirmee';return;}
  const empreinte=createHash('sha256').update(a.brique.audio).digest('hex');essai.premier_audio_octets=Buffer.from(a.brique.audio,'base64').length;
  if(a.continuer){
   const suite=await preparerBrique({id:a.id,texte},code,true,AbortSignal.timeout(35000));
   essai.point_suivant_prepare_sans_nouveaux_mots=!!suite?.brique;
  }
  const fin=Date.now();
  const b=await preparerBrique({id:a.id,texte:texte+' Je suis ensuite allé au marché pour acheter un chargeur. Le vendeur demandait quinze mille francs. Je me corrige : après discussion, il me l’a vendu à trois mille francs.',final:true},code,true,AbortSignal.timeout(35000));
  essai.suite_preparation_ms=Date.now()-fin;
  essai.premiere_inchangee=empreinte===createHash('sha256').update(a.brique.audio).digest('hex');
  essai.suite_audio_octets=b?.brique?Buffer.from(b.brique.audio,'base64').length:0;
  essai.statut=b?.brique&&b.termine&&essai.premiere_inchangee?'confirme':'suite_non_confirmee';
 }catch{essai.statut='erreur';}finally{essai.termine=new Date().toISOString();}
}
