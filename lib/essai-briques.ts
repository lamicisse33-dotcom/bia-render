import {preparerBrique} from './briques-reponse';
import {etatBriques} from './briques-etat';
import {createHash} from 'node:crypto';
/** Bounded real-model/audio smoke check; never stored as a user's conversation. */
export async function verifierBriques(){
 const precedent=etatBriques.essai;
 if(!process.env.BIA_CODE_MAITRE||precedent&&(precedent.statut!=='erreur'||Number(precedent.tentatives||1)>=2))return;
 const essai=etatBriques.essai={tentatives:precedent?Number(precedent.tentatives||1)+1:1,statut:'en_cours',synthetique:true,apparence:'rara',revision:'audio-une-preparation-v6-texte-avance'} as Record<string,unknown>;
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
  // Leave the coiffeur point pending so the final phase has at least two
  // distinct points, exercising text look-ahead rather than only synthesis.
  essai.points_en_attente_avant_fin=Boolean(a.continuer);
  const fin=Date.now();
  const texteFinal=texte+' Je suis ensuite allé au marché pour acheter un chargeur. Le vendeur demandait quinze mille francs. Je me corrige : après discussion, il me l’a vendu à trois mille francs.';
  let b:Awaited<ReturnType<typeof preparerBrique>>=null,octets=0;
  const delais:number[]=[];const mesures:Array<{modele_anticipe?:boolean;modele_ms?:number;modele_attente_ms?:number}>=[];
  for(let i=0;i<8;i++){
   const depart=Date.now();
   b=await preparerBrique({id:a.id,texte:texteFinal,final:true},code,true,AbortSignal.timeout(35000));
   delais.push(Date.now()-depart);
   if(b&&'mesure'in b)mesures.push(b.mesure);
   if(b?.brique)octets+=Buffer.from(b.brique.audio,'base64').length;
   if(!b||b.termine||b.normal||!b.brique)break;
  }
  essai.suite_briques_ms=delais;
  essai.mesures_suite=mesures;
  essai.anticipation_texte_utilisee=mesures.some(m=>m.modele_anticipe);
  essai.modele_attente_evitee_ms=mesures.filter(m=>m.modele_anticipe).reduce((n,m)=>n+Math.max(0,(m.modele_ms||0)-(m.modele_attente_ms||0)),0);
  essai.suite_preparation_ms=Date.now()-fin;
  essai.premiere_inchangee=empreinte===createHash('sha256').update(a.brique.audio).digest('hex');
  essai.suite_audio_octets=octets;
  essai.statut=octets>0&&b?.termine&&!b.normal&&essai.premiere_inchangee?'confirme':'suite_non_confirmee';
 }catch(e){essai.statut='erreur';const message=e instanceof Error?e.message:'';essai.motif=['Instructions Supabase inaccessibles','Index commun en actualisation','Catalogue absent','Lecture mémoire indisponible','Modèle indisponible','JSON incomplet','Brique invalide','Audio incomplet'].includes(message)?message:'contexte_ou_generation_indisponible';}finally{essai.termine=new Date().toISOString();}
}
