import {fetchAnthropic,MODELE_SONNET,contenuAnthropic,messagesAnthropic} from "./cerveau-anthropic";
import {messagesConversation} from "./conversation-groq";
import {resumeDialogueDevoirs} from "./dialogue-devoirs";
import {verifierDialoguesAppris} from "./essai-dialogue-devoirs";
let essai:Promise<unknown>|undefined;
// Fixed, authenticated preflight for the owner's requested model switch.
// Reads the existing credential in place; never returns it or private lessons.
export function verifierSonnet(){return essai??=(async()=>{
 const key=process.env.BIA_LLM_API_KEY||process.env.ANTHROPIC_API_KEY;
 if(!key)return {ok:false,motif:"cle_absente",modele:MODELE_SONNET};
 const debut=Date.now(),r=await fetchAnthropic(`${process.env.ANTHROPIC_BASE_URL||"https://api.anthropic.com"}/v1/messages`,{method:"POST",headers:{"content-type":"application/json","x-api-key":key,"anthropic-version":"2023-06-01"},body:JSON.stringify({model:MODELE_SONNET,max_tokens:170,...messagesAnthropic(messagesConversation({question:"À quoi sert une liste de courses ? Réponds en une phrase.",history:[]}))})},Date.now()+8000);
 const d=await r.json().catch(()=>null);
 const motif=r.ok?null:r.status===401?"cle_refusee":/credit|balance|billing|payment/i.test(String(d?.error?.message||""))?"credit_insuffisant":`HTTP_${r.status}`;
 const conversation={ok:r.ok&&Boolean(d&&contenuAnthropic(d)),statut:r.status,motif,modele:d?.model||MODELE_SONNET,ms:Date.now()-debut};
 const actif=process.env.BIA_LLM_PROVIDER==="anthropic";
 const erreursAvant=resumeDialogueDevoirs().erreurs_diagnostic||0;
 const dialogue=actif&&conversation.ok?await verifierDialoguesAppris():undefined;
 // Exercise the real ordinary-chat path too. The existing pedagogical-test
 // flag suppresses conversation/lesson writes and skips the learned selector.
 // Use the existing server credential in place; never expose it in the report.
 let conversation_web:unknown;
 if(actif&&conversation.ok&&process.env.BIA_CODE_MAITRE){
  const debutWeb=Date.now();
  try{
   const {POST}=await import("../app/api/chat/route");
   const {NextRequest}=await import("next/server");
   const r=await POST(new NextRequest("https://app.khalam.app/api/chat",{method:"POST",headers:{"content-type":"application/json","x-bia-code":process.env.BIA_CODE_MAITRE},body:JSON.stringify({message:"À quoi sert une liste de courses ? Réponds en français en une phrase.",history:[],apprentissageTest:true})}));
   const d=await r.json();
   conversation_web={ok:r.ok&&Boolean(d.reply)&&!(/panne|erreur|indisponible|code/i.test(String(d.source||""))),statut:r.status,source:d.source,ms:Date.now()-debutWeb};
  }catch{conversation_web={ok:false,motif:"verification_chat_impossible",ms:Date.now()-debutWeb};}
 }
 return {conversation,conversation_web,actif,dialogue:dialogue?{...dialogue.bilan,details:dialogue.resultats.map(s=>({scenario:s.scenario,tours:s.tours.map(t=>({ms:t.ms,fr:t.fr,statut:t.statut}))})),erreurs_selection:(resumeDialogueDevoirs().erreurs_diagnostic||0)-erreursAvant}:undefined};
})();}
