import {NextRequest} from 'next/server';
import {indexDialogue} from './dialogue-devoirs';
import {montantDeLeconNonConfirme,resumeReferencesApprises} from './dialogue-devoirs-core';
const g=globalThis as typeof globalThis&{biaControleContexteAppris?:{rapport:any;travail?:Promise<void>}};
const etat=g.biaControleContexteAppris??={rapport:null};
export const resumeContexteAppris=()=>({filtrage:resumeReferencesApprises(),controle:etat.rapport});
/** Two synthetic written replays through the real web route and private
 * lessons. No audio, lesson edits or conversation-memory writes. */
export function verifierContexteAppris(){return etat.travail??=(async()=>{
 const rapport:any={statut:'en_cours',version:(process.env.RENDER_GIT_COMMIT||'').slice(0,12),date:new Date().toISOString(),mesure:'Rejeu écrit avec Sonnet et mémoire réelle. Hors microphone, voix et validation humaine du wolof.',cas:[]};etat.rapport=rapport;
 try{
  const {POST}=await import('../app/api/chat/route'),index=await indexDialogue();
  const h=[{role:'user',text:'Je vais au restaurant ce soir en ville. Réponds en wolof.'},{role:'bia',text:'Qu’est-ce que tu veux manger ?'}];
  const question='Jën ak tamaate.';
  const references=index.flatMap(d=>d.repliques).filter(p=>/tomat|tamaat|tamate/i.test(p.fr+' '+p.wo));
  rapport.source={repliques_aliment:references.length,exemples_chiffres_non_confirmes:references.filter(p=>montantDeLeconNonConfirme(p.fr,p.wo,question,h)).length};
  for(const [nom,history,message] of [
   ['repas',h,question],
   ['reprise_apres_prix_invente',[...h,{role:'user',text:question},{role:'bia',text:'Les tomates coûtent 1000 francs. Ces chiffres, c’est le prix ou le nombre de kilos ?'}],'Je ne t’ai donné aucun chiffre. Je parlais du repas au restaurant. Réponds en wolof.'],
  ] as const){
   const debut=Date.now();
   const r=await POST(new NextRequest('https://app.khalam.app/api/chat',{method:'POST',headers:{'content-type':'application/json','x-bia-code':process.env.BIA_CODE_MAITRE||''},body:JSON.stringify({message,history,apprentissageTest:true})}));
   const d=await r.json(),texte=String(d.reply||''),n=texte.normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase();
   rapport.cas.push({cas:nom,http:r.status,ms:Date.now()-debut,reponse_presente:!!texte.trim(),prix_exemple_repris:/1000|1[ \u00a0\u202f]000|mille francs|francs|fcfa|cfa/.test(n),clarification_chiffres:/(?:prix|chiffres?|montants?)\s+(?:la\s+)?(?:ou|wala)|kilos?/.test(n),une_question_max:(texte.match(/\?/g)||[]).length<=1,source:d.source||null});
  }
  rapport.statut=rapport.cas.every((c:any)=>c.http===200&&c.reponse_presente&&!c.prix_exemple_repris&&!c.clarification_chiffres&&c.une_question_max)?'termine':'a_verifier';
 }catch{rapport.statut='echec';}
 rapport.fin=new Date().toISOString();
})();}
