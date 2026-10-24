export const MODELE_SONNET="claude-sonnet-5-5";
export const MODELE_HAIKU="claude-haiku-5-5";
/* ── LEVIER 2 : LE TEXTE DES BRIQUES PASSE À HAIKU ─────────────────────────

   Demandé par Lamine le 24 octobre 2026, dans le plan −2 s. Mesuré la veille,
   le modèle prend 1 372 ms sur le chemin ordinaire — le plus gros poste après
   la voix. Les briques n'ont pas besoin du même cerveau que la conversation
   entière : chacune produit UNE phrase de 6 à 10 mots sur un point achevé,
   avec les formulations apprises déjà fournies dans sa consigne.

   ATTENTION, CE N'EST PAS `BIA_LLM_MODEL`. Cette variable est posée dans
   Render (claude-sonnet-5-5) et pilotait aussi les briques : la laisser
   devant aurait rendu ce levier inerte. Les briques suivent désormais leur
   propre variable, et c'est dit plutôt que découvert — un futur changement
   global de cerveau ne les emportera plus.

   RÉVERSIBLE SANS DÉPLOIEMENT : BIA_BRIQUES_MODEL=claude-sonnet-5-5 ramène
   exactement le comportement d'avant. Le modèle RÉELLEMENT utilisé est publié
   dans briques_conversation.modele_briques — pas l'intention, l'usage.

   CE QUI RESTE À PROUVER, et qui n'est pas une opinion : le wolof appris.
   Haiku doit reprendre les formulations validées MOT POUR MOT. C'est
   lib/essai-modele-briques.ts qui le mesure sur les devoirs réels, et le
   verdict se lit dans briques_conversation.essai_modele. */
export const modeleBriques=()=>process.env.BIA_BRIQUES_MODEL||MODELE_HAIKU;
// The native conversion is the body actually sent by chat and by bricks.
// Keep the intended hour-long cache here too; the older chat body is replaced.
export const CACHE_CONTEXTE_ANTHROPIC={type:"ephemeral",ttl:"1h"} as const;
const g=globalThis as typeof globalThis & {biaAnthropic?:{appels:number;acceptes:number;erreurs:number;dernier_statut:number;dernier_ms:number;modele:string;derniere_erreur?:{quand:string;motif:string;statut:number;ms:number}}};
const etat=g.biaAnthropic??={appels:0,acceptes:0,erreurs:0,dernier_statut:0,dernier_ms:0,modele:""};
export function resumeAnthropic(){return {...etat,cle_presente:Boolean(process.env.BIA_LLM_API_KEY||process.env.ANTHROPIC_API_KEY)};}
export function reglagesSonnet(model:string){
 return model===MODELE_SONNET?{thinking:{type:"between_tools"},output_config:{effort:"low"}}:{thinking:{type:"disabled"}};
}
export function corpsAnthropic(body:Record<string,any>){
 if(body.model===MODELE_HAIKU){
  const {temperature,top_p,top_k,...reste}=body;
  return {...reste,thinking:{type:'disabled'},output_config:{effort:'low',...body.output_config}};
 }
 if(body.model!==MODELE_SONNET)return body;
 const {temperature,top_p,top_k,...reste}=body;
 return {...reste,...reglagesSonnet(body.model),output_config:{effort:"low",...body.output_config}};
}
export function contenuAnthropic(data:any):string{return (data.content||[]).filter((b:any)=>b.type==="text").map((b:any)=>String(b.text||"")).join("").trim();}
export function messagesAnthropic(messages:Array<{role:string;content:string}>,cacherOutils=true){
  return {system:messages.filter(m=>m.role==="system").map((m,i)=>({type:"text",text:m.content,...((i===0||i===1&&m.content.startsWith('INSTRUCTIONS PÉDAGOGIQUES DU MAÎTRE AUTHENTIFIÉ')||cacherOutils&&i<=2&&m.content.startsWith("Les commandes d'écran se placent"))&&m.content.length>=2500?{cache_control:{...CACHE_CONTEXTE_ANTHROPIC}}:{})})),messages:messages.filter(m=>m.role==="user"||m.role==="assistant")};
}
export async function fetchAnthropic(url:string,init:RequestInit,fin=Date.now()+12_000){
 const body=corpsAnthropic(JSON.parse(String(init.body||"{}"))),debut=Date.now();etat.appels++;etat.modele=body.model;
 const delai=AbortSignal.timeout(Math.max(1,fin-Date.now()));
 const signal=init.signal?AbortSignal.any([init.signal,delai]):delai;
 const panne=(motif:string,statut:number)=>{etat.derniere_erreur={quand:new Date().toISOString(),motif,statut,ms:Date.now()-debut};};
 try{
  const r=await fetch(url,{...init,body:JSON.stringify(body),signal});
  etat.dernier_statut=r.status;if(r.ok)etat.acceptes++;else{etat.erreurs++;panne("fournisseur_HTTP_"+r.status,r.status);}return r;
 }catch(error){
  const motif=delai.aborted||(error as Error)?.name==="TimeoutError"?"delai_depasse":init.signal?.aborted?"annule":"connexion_interrompue";
  const statut=motif==="delai_depasse"?504:503;
  etat.erreurs++;etat.dernier_statut=statut;panne(motif,statut);
  return Response.json({error:{message:"Connexion au moteur interrompue."}},{status:statut,headers:{"x-bia-erreur":motif}});
 }
 finally{etat.dernier_ms=Date.now()-debut;}
}
