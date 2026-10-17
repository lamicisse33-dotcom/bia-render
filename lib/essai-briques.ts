import {preparerBrique} from './briques-reponse';
import {etatBriques} from './briques-etat';
import {createHash} from 'node:crypto';
/** Bounded real-model/audio smoke check; never stored as a user's conversation. */
export async function verifierBriques(){
 if(etatBriques.essai||!process.env.BIA_CODE_MAITRE)return;
 const essai=etatBriques.essai={statut:'en_cours',synthetique:true,apparence:'rara',revision:'audio-une-preparation-v5'} as Record<string,unknown>;
 const code=process.env.BIA_CODE_MAITRE;
 const texte='Ce matin, en allant au marché, je suis passé chez le cordonnier pour faire réparer mes chaussures. Ensuite je suis passé chez le coiffeur.';
 try{
  // Warm the fixed compact grammar before comparing model times; its first
  // compilation is measured separately and is not a steady-state sample.
  const chauffe=await preparerBrique({texte,tour:'diagnostic-grammaire-chauffe',history:[],resume:'',voice:'female',persona:'rara'},code,true,AbortSignal.timeout(35000),'chauffe');
  essai.chauffe=chauffe&&'mesure'in chauffe?chauffe.mesure:null;
  const avant=await preparerBrique({texte,tour:'diagnostic-comparaison-avant',history:[],resume:'',voice:'female',persona:'rara'},code,true,AbortSignal.timeout(35000),'classique');
  essai.comparaison={echantillons:1,ordre:'classique_puis_concis',avant:avant&&'mesure'in avant?avant.mesure:null};
  const debut=Date.now();
  const a=await preparerBrique({texte,tour:'diagnostic-briques-20261017',history:[],resume:'',voice:'female',persona:'rara'},code,true,AbortSignal.timeout(35000));
  essai.premiere_preparation_ms=Date.now()-debut;
  (essai.comparaison as Record<string,unknown>).apres=a&&'mesure'in a?a.mesure:null;
  if(!a?.brique){essai.statut='premiere_non_confirmee';return;}
  const empreinte=createHash('sha256').update(a.brique.audio).digest('hex');essai.premier_audio_octets=Buffer.from(a.brique.audio,'base64').length;
  if(a.continuer){
   const suite=await preparerBrique({id:a.id,texte},code,true,AbortSignal.timeout(35000));
   essai.point_suivant_prepare_sans_nouveaux_mots=!!suite?.brique;
  }
  const fin=Date.now();
  const texteFinal=texte+' Je suis ensuite allé au marché pour acheter un chargeur. Le vendeur demandait quinze mille francs. Je me corrige : après discussion, il me l’a vendu à trois mille francs.';
  let b:Awaited<ReturnType<typeof preparerBrique>>=null,octets=0;
  const delais:number[]=[];
  for(let i=0;i<8;i++){
   const depart=Date.now();
   b=await preparerBrique({id:a.id,texte:texteFinal,final:true},code,true,AbortSignal.timeout(35000));
   delais.push(Date.now()-depart);
   if(b?.brique)octets+=Buffer.from(b.brique.audio,'base64').length;
   if(!b||b.termine||b.normal||!b.brique)break;
  }
  essai.suite_briques_ms=delais;
  essai.suite_preparation_ms=Date.now()-fin;
  essai.premiere_inchangee=empreinte===createHash('sha256').update(a.brique.audio).digest('hex');
  essai.suite_audio_octets=octets;
  essai.statut=octets>0&&b?.termine&&!b.normal&&essai.premiere_inchangee?'confirme':'suite_non_confirmee';
 }catch{essai.statut='erreur';}finally{essai.termine=new Date().toISOString();}
}
