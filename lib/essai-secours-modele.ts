import {appelerCerebras,resumeSecoursCerebras} from "./cerveau-cerebras";
import {essayerDialogueDevoirs} from "./dialogue-devoirs";
let essai:Promise<unknown>|undefined;
// Fixed owner-requested recovery check. No conversation writes or private text
// in the report. Only called behind the existing private diagnostic credential.
export function verifierSecoursModele(){return essai??=(async()=>{
 const debut=Date.now();
 const r=await appelerCerebras("",{method:"POST",headers:{"content-type":"application/json",authorization:`Bearer ${process.env.CEREBRAS_API_KEY}`},body:JSON.stringify({model:process.env.CEREBRAS_MODEL||"gpt-oss-120b",messages:[{role:"user",content:"Réponds en français en une phrase : à quoi sert une liste de courses ?"}],reasoning_effort:"low",max_completion_tokens:1536,stream:false})},Date.now()+8000);
 const d=await r.json().catch(()=>null);
 const conversation={ok:r.ok&&Boolean(d?.choices?.[0]?.message?.content?.trim()),statut:r.status,fournisseur:r.headers.get("x-bia-provider"),ms:Date.now()-debut};
 const dialogue=await essayerDialogueDevoirs();
 return {conversation,dialogue,secours:resumeSecoursCerebras()};
})();}
