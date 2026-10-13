import {NextRequest} from 'next/server';
import {resumeRecherche,rechercheActive} from './recherche';
const g=globalThis as typeof globalThis&{biaFonctionsBase?:{rapport:unknown;travail?:Promise<unknown>}};
const etat=g.biaFonctionsBase??={rapport:null};
export const resumeFonctionsBase=()=>etat.rapport;
// Authenticated, fixed questions. No conversation/lesson writes, no microphone.
export function verifierFonctionsBase(){return etat.travail??=(async()=>{
 const {POST}=await import('../app/api/chat/route');
 const cas=[];
 for(const message of ["On est quel jour aujourd'hui ?","Il fait quelle heure ?","Cherche sur Internet le site officiel de l'Université Cheikh Anta Diop de Dakar et donne-moi son adresse web."]){
  const debut=Date.now();
  try{
   const r=await POST(new NextRequest('https://app.khalam.app/api/chat',{method:'POST',headers:{'content-type':'application/json','x-bia-code':process.env.BIA_CODE_MAITRE||''},body:JSON.stringify({message,history:[],apprentissageTest:true})}));
   const d=await r.json();cas.push({question:message,reponse:d.reply,source:d.source,horloge:d.horloge,statut:r.status,ms:Date.now()-debut});
  }catch{cas.push({question:message,statut:'echec',ms:Date.now()-debut});}
 }
 return etat.rapport={date:new Date().toISOString(),version:(process.env.RENDER_GIT_COMMIT||'').slice(0,12),mesure:'Route web réelle ; réponses texte, sans mesure de lecture audio.',recherche_active:rechercheActive(),recherche:resumeRecherche(),cas};
})();}
