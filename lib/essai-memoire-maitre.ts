import {executerLecon} from './mode-apprentissage';
import {enregistrerPhraseMaitre,phraseMaitrePresente} from './memoire-maitre';
import {retirerCorrection} from './lexique';
const g=globalThis as typeof globalThis&{biaEssaiMemoire?:{rapport:unknown;travail?:Promise<unknown>}};
const etat=g.biaEssaiMemoire??={rapport:null};
export const resumeEssaiMemoire=()=>etat.rapport;
/** Authenticated fixed diagnostic. Unique records, removed by exact text+author.
 * Same command handler and writer as chat; no model, audio or conversation log. */
export function verifierMemoireMaitre(){return etat.travail??=(async()=>{
 const cas=[];let nettoye=true;
 for(const texte of ['Mémorise ça.','Garde ça.']){
  const phrase=`Contrôle technique de mémoire ${crypto.randomUUID()}.`;
  const debut=Date.now();
  try{
   const r=await executerLecon({texte,maitre:true,actif:false,phrase:'',history:[{role:'user',text:phrase},{role:'bia',text:'Je ne peux pas mémoriser.'},{role:'user',text:texte}]},p=>enregistrerPhraseMaitre(p,'fr'));
   cas.push({commande:texte,ecrit_et_relu:r?.retenu===phrase,reste_en_conversation:r?.apprend===false,ms:Date.now()-debut});
  }catch{cas.push({commande:texte,ecrit_et_relu:false,ms:Date.now()-debut});}
  finally{
   try{await retirerCorrection(phrase,'maitre-vocal');if(await phraseMaitrePresente(phrase))nettoye=false;}catch{nettoye=false;}
  }
 }
 let ecritureNonMaitre=false;
 await executerLecon({texte:'Mémorise ceci : test',maitre:false,actif:false,phrase:''},async()=>{ecritureNonMaitre=true;});
 return etat.rapport={date:new Date().toISOString(),version:(process.env.RENDER_GIT_COMMIT||'').slice(0,12),mesure:'Reconnaissance des commandes du chat et écriture/relecture Supabase réelles ; aucun test micro ou audio.',cas,non_maitre_bloque:!ecritureNonMaitre,donnees_test_supprimees:nettoye};
})();}
