import {NextRequest} from 'next/server';
const g=globalThis as typeof globalThis&{biaEssaiComprehension?:{rapport:unknown;travail?:Promise<unknown>}};
const etat=g.biaEssaiComprehension??={rapport:null};
export const resumeEssaiComprehension=()=>etat.rapport;
// Fixed synthetic turns, authenticated trigger, no microphone or TTS claim.
// Pedagogical test mode prevents conversation and lesson writes.
export function verifierComprehension(){return etat.travail??=(async()=>{
 const {POST}=await import('../app/api/chat/route');
 const cas=[
  {id:'fr_faute_contextuelle',message:'depui hier soire',history:[{role:'user',text:'Ma copine ne répond plus à mes appels.'},{role:'bia',text:'Depuis quand ?'}],suggestionsTranscription:['Depuis hier soir.']},
  {id:'wo_phonetique',message:'Dama sokhla preuve de paiement.',history:[],suggestionsTranscription:['Dama soxla preuve de paiement.']},
  {id:'mixte_contexte',message:'pour dem université bi',history:[{role:'user',text:'Dama bëgg jënd ay chaussures.'},{role:'bia',text:'Pour aller où ?'}]},
  {id:'ambiguite_reelle',message:'ça marche plus',history:[{role:'user',text:'Mon téléphone et mon ordinateur ont chacun un problème.'},{role:'bia',text:'Quel appareil veux-tu examiner en premier ?'}]},
  {id:'negation_wolof',message:'Déedéet, bëgguma.',history:[{role:'user',text:'Ma famille veut me marier.'},{role:'bia',text:'Est-ce que tu veux accepter ce mariage ?'}]},
 ];
 const resultats=[];
 for(const c of cas){
  const debut=Date.now();
  try{
   const r=await POST(new NextRequest('https://app.khalam.app/api/chat',{method:'POST',headers:{'content-type':'application/json','x-bia-code':process.env.BIA_CODE_MAITRE||''},body:JSON.stringify({...c,apprentissageTest:true})}));
   const d=await r.json();
   resultats.push({id:c.id,question:c.message,reponse:d.reply||null,source:d.source,statut:r.status,ms:Date.now()-debut});
  }catch{resultats.push({id:c.id,statut:'echec',ms:Date.now()-debut});}
 }
 const rapport={date:new Date().toISOString(),version:(process.env.RENDER_GIT_COMMIT||'').slice(0,12),mesure:'Route chat réelle, transcriptions simulées ; ni micro ni écoute humaine.',cas:resultats};
 etat.rapport={...rapport,cas:resultats.map(c=>{const {reponse,...publics}=c as typeof c&{reponse?:unknown};return publics;})};
 return rapport;
})();}
