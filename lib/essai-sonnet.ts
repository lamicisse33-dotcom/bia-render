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
 return {conversation,actif,dialogue:dialogue?{...dialogue.bilan,tours:dialogue.resultats.map(s=>({scenario:s.scenario,tours:s.tours.map(t=>({ms:t.ms,fr:t.fr,statut:t.statut}))})),erreurs_selection:(resumeDialogueDevoirs().erreurs_diagnostic||0)-erreursAvant}:undefined};
})();}
