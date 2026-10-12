import { fetchModeleAvecReprise, fetchGroqAvecSecours } from "./reprise-modele";

const g=globalThis as typeof globalThis & {biaSecoursCerebras?:{jusqua:number;refus_paiement:number;appels_secours:number;reussites_secours:number;dernier_statut:number;dernier_ms:number}};
const etat=g.biaSecoursCerebras??={jusqua:0,refus_paiement:0,appels_secours:0,reussites_secours:0,dernier_statut:0,dernier_ms:0};
export function resumeSecoursCerebras(){return {...etat,actif:etat.jusqua>Date.now(),fournisseur_secours:"groq"};}
// Convert the compact conversation request to Cerebras' API contract.
export function corpsCerebras(source: Record<string, unknown>) {
  const { include_reasoning, service_tier, tools, ...body } = source;
  return { ...body, model: String(body.model || "gpt-oss-120b").replace(/^openai\//, ""), reasoning_format: "hidden" };
}
function avecFournisseur(r:Response,fournisseur:string){
  const headers=new Headers(r.headers);headers.set("x-bia-provider",fournisseur);
  return new Response(r.body,{status:r.status,statusText:r.statusText,headers});
}
export async function appelerCerebras(_url: string, init: RequestInit, limite: number, _secours = false) {
  const source=JSON.parse(String(init.body || "{}"));
  const secours=async()=>{
    const {reasoning_format,tools,...body}=source;
    const headers=new Headers(init.headers);
    headers.set("authorization",`Bearer ${process.env.GROQ_API_KEY}`);
    const debut=Date.now();etat.appels_secours++;
    const r=await fetchGroqAvecSecours("https://api.groq.com/openai/v1/chat/completions",{
      ...init,headers,body:JSON.stringify({...body,model:process.env.GROQ_MODEL||"openai/gpt-oss-120b",include_reasoning:false,service_tier:"on_demand"}),
    },limite,true);
    etat.dernier_statut=r.status;etat.dernier_ms=Date.now()-debut;
    if(r.ok)etat.reussites_secours++;
    return avecFournisseur(r,"groq");
  };
  // A billing refusal cannot recover by retrying. Share the short circuit
  // with lesson selection so each turn does not hit the same unpaid service.
  if(process.env.GROQ_API_KEY&&etat.jusqua>Date.now())return secours();
  const r=await fetchModeleAvecReprise("https://api.cerebras.ai/v1/chat/completions", {
    ...init, body: JSON.stringify(corpsCerebras(source)),
  }, limite);
  if(r.status===402){
    etat.refus_paiement++;etat.jusqua=Date.now()+300_000;
    if(process.env.GROQ_API_KEY&&Date.now()+200<limite){
      void r.body?.cancel().catch(()=>{});
      return secours();
    }
  }
  return avecFournisseur(r,"cerebras");
}
