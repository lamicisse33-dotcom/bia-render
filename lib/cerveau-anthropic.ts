export const MODELE_SONNET="claude-sonnet-5-5";
const g=globalThis as typeof globalThis & {biaAnthropic?:{appels:number;acceptes:number;erreurs:number;dernier_statut:number;dernier_ms:number;modele:string}};
const etat=g.biaAnthropic??={appels:0,acceptes:0,erreurs:0,dernier_statut:0,dernier_ms:0,modele:""};
export function resumeAnthropic(){return {...etat,cle_presente:Boolean(process.env.BIA_LLM_API_KEY||process.env.ANTHROPIC_API_KEY)};}
export function reglagesSonnet(model:string){
 return model===MODELE_SONNET?{thinking:{type:"between_tools"},output_config:{effort:"low"}}:{thinking:{type:"disabled"}};
}
export function corpsAnthropic(body:Record<string,any>){
 if(body.model!==MODELE_SONNET)return body;
 const {temperature,top_p,top_k,...reste}=body;
 return {...reste,...reglagesSonnet(body.model)};
}
export function contenuAnthropic(data:any):string{return (data.content||[]).filter((b:any)=>b.type==="text").map((b:any)=>String(b.text||"")).join("").trim();}
export function messagesAnthropic(messages:Array<{role:string;content:string}>){
 return {system:messages.filter(m=>m.role==="system").map((m,i)=>({type:"text",text:m.content,...(i===0&&m.content.length>=2500?{cache_control:{type:"ephemeral"}}:{})})),messages:messages.filter(m=>m.role==="user"||m.role==="assistant")};
}
export async function fetchAnthropic(url:string,init:RequestInit,fin=Date.now()+12_000){
 const body=corpsAnthropic(JSON.parse(String(init.body||"{}"))),debut=Date.now();etat.appels++;etat.modele=body.model;
 try{
  const r=await fetch(url,{...init,body:JSON.stringify(body),signal:AbortSignal.timeout(Math.max(1,fin-Date.now()))});
  etat.dernier_statut=r.status;if(r.ok)etat.acceptes++;else etat.erreurs++;return r;
 }catch{etat.erreurs++;etat.dernier_statut=503;return Response.json({error:{message:"Connexion au moteur interrompue."}},{status:503});}
 finally{etat.dernier_ms=Date.now()-debut;}
}
