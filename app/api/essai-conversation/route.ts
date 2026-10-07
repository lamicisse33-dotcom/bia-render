import { timingSafeEqual } from "node:crypto";
import { messagesConversation, reglagesConversation, CONSIGNE_RESUME_CONVERSATION, type MessageConversation } from "@/lib/conversation-groq";
import { fetchGroqAvecSecours, delaiModele } from "@/lib/reprise-modele";
export const runtime="nodejs";
export const dynamic="force-dynamic";
let appels=0;
// Temporary bounded synthetic evaluation only: no user data, memory writes or app actions.
// Existing private diagnostic credential stays on the GPU; never sent to a browser.
export async function POST(request:Request){
 const expected=Buffer.from(process.env.LOCAL_LLM_API_KEY||"");
 const received=Buffer.from(request.headers.get("x-brain-key")||"");
 if(!expected.length||expected.length!==received.length||!timingSafeEqual(expected,received))return Response.json({erreur:"acces"},{status:401});
 if(Date.now()>Date.parse("2026-10-07T22:30:00Z")||appels>=60)return Response.json({erreur:"essai_ferme"},{status:410});
 if(!process.env.GROQ_API_KEY)return Response.json({erreur:"configuration"},{status:503});
 const b=await request.json().catch(()=>null);
 if(!b||typeof b.message!=="string"||b.message.length>1800||!b.message.trim()||
    (b.resume!==undefined&&(typeof b.resume!=="string"||b.resume.length>4000))||
    !Array.isArray(b.history)||b.history.length>40||b.history.some((m:MessageConversation)=>!m||!["user","assistant"].includes(m.role)||typeof m.content!=="string"||m.content.length>6000))return Response.json({erreur:"message"},{status:400});
 appels++;
 const model=process.env.GROQ_MODEL||"openai/gpt-oss-120b";
 const settings=b.mode==="resume"?{reasoning_effort:"low",include_reasoning:false,max_completion_tokens:2048}:reglagesConversation(b.message);
 const messages=b.mode==="resume"?[
  {role:"system",content:CONSIGNE_RESUME_CONVERSATION},
  {role:"user",content:JSON.stringify({notes:b.resume||"",echanges:b.history.slice(0,12)})}
 ]:messagesConversation({question:b.message,history:b.history,resume:b.resume});
 const started=Date.now();
 const r=await fetchGroqAvecSecours("https://api.groq.com/openai/v1/chat/completions",{
  method:"POST",headers:{"Content-Type":"application/json",Authorization:`Bearer ${process.env.GROQ_API_KEY}`},
  body:JSON.stringify({model,messages,...settings,temperature:0.35,service_tier:"on_demand"})
 },Date.now()+12000,false);
 if(!r.ok){
  const detail=await r.text().catch(()=>"");
  return Response.json({erreur:"modele",status:r.status,attendre_ms:r.status===429?delaiModele(r,detail,0):null,
   limite_tokens:r.headers.get("x-ratelimit-limit-tokens"),reste_tokens:r.headers.get("x-ratelimit-remaining-tokens"),limite_requetes:r.headers.get("x-ratelimit-limit-requests")},
   {status:r.status,headers:{"cache-control":"no-store"}});
 }
 const d=await r.json();
 return Response.json({reply:d.choices?.[0]?.message?.content||"",modele:d.model,effort:settings.reasoning_effort,finish:d.choices?.[0]?.finish_reason,ms:Date.now()-started,usage:d.usage,messages:messages.length},{headers:{"cache-control":"no-store"}});
}
