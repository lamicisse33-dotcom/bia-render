import {randomUUID} from "node:crypto";
import {origineReplique} from "./correction-devoir-core";
import {lexiqueConfig} from "./lexique";
import {APP_LECONS} from "./lexique-apprentissage-core";
import {assemblerDevoirs,type BlocDevoir} from "./lecture-devoirs-core";
import {invaliderDevoirs,revisionDevoir} from "./devoirs-apprentissage";
import {origineValide,type OrigineDevoir} from "./correction-devoir-core";
const g=globalThis as typeof globalThis&{biaCorrectionsDevoir?:{tentatives:number;confirmees:number;erreurs:number;dernier_ms:number;diagnostic?:unknown;essai?:Promise<unknown>}};
const etat=g.biaCorrectionsDevoir??={tentatives:0,confirmees:0,erreurs:0,dernier_ms:0};
export const resumeCorrectionsDevoir=()=>({tentatives:etat.tentatives,confirmees:etat.confirmees,erreurs:etat.erreurs,dernier_ms:etat.dernier_ms,diagnostic:etat.diagnostic,actif:true});
/** Root update, compare-and-swap on the stored payload, then durable reread.
 * No fallback insertion into the standalone lexicon. No model-generated edit. */
export async function corrigerDevoir(origine:OrigineDevoir,texte:string):Promise<OrigineDevoir>{
 return modifierDevoir(origine,texte,"maitre-devoir");
}
async function modifierDevoir(origine:OrigineDevoir,texte:string,auteur:string):Promise<OrigineDevoir>{
 const debut=Date.now();etat.tentatives++;
 try{
  if(!origineValide(origine)||typeof texte!=="string"||!texte.trim()||texte.length>6000)throw Error("Phrase ou origine invalide.");
  if(!lexiqueConfig.actif)throw Error("Supabase indisponible.");
  const base=lexiqueConfig.url+"/rest/v1/"+lexiqueConfig.table;
  const headers={apikey:lexiqueConfig.cle,Authorization:"Bearer "+lexiqueConfig.cle,"content-type":"application/json"};
  const filtre="application=eq."+APP_LECONS+"&auteur=eq."+auteur;
  const q=filtre+"&proposee=not.is.null";
  const rows:Array<{id:number;proposee:string;bloc:BlocDevoir}>=[];const seen=new Set<number>();
  for(let offset=0;;offset+=500){
   const r=await fetch(base+"?select=id,proposee&"+q+"&order=id.desc&limit=500&offset="+offset,{headers,cache:"no-store",signal:AbortSignal.timeout(8000)});
   if(!r.ok)throw Error("Lecture du devoir impossible.");const page=await r.json();if(!Array.isArray(page))throw Error("Lecture invalide.");
   for(const row of page){try{const b=JSON.parse(row.proposee) as BlocDevoir;if(b.version===2&&b.type==="devoir"&&b.id===origine.devoir_id&&!seen.has(b.index)){seen.add(b.index);rows.push({...row,bloc:b});}}catch{}}
   if(page.length<500)break;
  }
  const d=assemblerDevoirs(rows.map(r=>r.bloc)).devoirs[0];
  if(!d)throw Error("Devoir introuvable ou incomplet.");
  if(revisionDevoir(d.texte)!==origine.revision||d.texte.slice(origine.debut,origine.debut+origine.texte.length)!==origine.texte)throw Error("Le devoir a changé. Fais relire la phrase avant de la corriger.");
  let at=0;const row=rows.sort((a,b)=>a.bloc.index-b.bloc.index).find(r=>{const start=at;at+=r.bloc.texte.length;return origine.debut>=start&&origine.debut+origine.texte.length<=at;});
  if(!row)throw Error("Cette phrase traverse deux blocs. Corrige un passage plus court.");
  const start=at-row.bloc.texte.length,local=origine.debut-start;
  const b=row.bloc as BlocDevoir&{corrections?:unknown[]};const date=new Date().toISOString();
  const bloc={...b,texte:b.texte.slice(0,local)+texte+b.texte.slice(local+origine.texte.length),corrections:[...(Array.isArray(b.corrections)?b.corrections:[]),{date,debut:local,avant:origine.texte,apres:texte}],...(b.statut==="validé"?{date_validation:date}:{})};
  const proposee=JSON.stringify(bloc);
  const cas=new URLSearchParams({id:"eq."+row.id,proposee:"eq."+row.proposee});
  const r=await fetch(base+"?"+filtre+"&"+cas,{method:"PATCH",headers:{...headers,Prefer:"return=representation"},body:JSON.stringify({corrigee:bloc.texte,proposee}),signal:AbortSignal.timeout(8000)});
  if(!r.ok)throw Error("Supabase a refusé la correction.");const updated=await r.json();
  if(!Array.isArray(updated)||updated.length!==1)throw Error("Le devoir a changé pendant la correction. Fais relire la phrase.");
  invaliderDevoirs();
  const check=await fetch(base+"?select=proposee&id=eq."+row.id+"&"+filtre,{headers,cache:"no-store",signal:AbortSignal.timeout(8000)});
  if(!check.ok||(await check.json())[0]?.proposee!==proposee)throw Error("La relecture de confirmation a échoué. Vérifie le devoir avant de recommencer.");
  etat.confirmees++;
  return {...origine,texte,revision:revisionDevoir(d.texte.slice(0,origine.debut)+texte+d.texte.slice(origine.debut+origine.texte.length))};
 }catch(e){etat.erreurs++;throw e;}finally{etat.dernier_ms=Date.now()-debut;}
}
/** Private diagnostic: one isolated synthetic record, excluded from every
 * lesson reader by its author. Exercise the same PATCH/CAS/reread and delete. */
export function verifierCorrectionDevoir(){
 return etat.essai??=(async()=>{
  const id="verification-"+randomUUID(),auteur="verification-correction-devoir";
  const base=lexiqueConfig.url+"/rest/v1/"+lexiqueConfig.table;
  const headers={apikey:lexiqueConfig.cle,Authorization:"Bearer "+lexiqueConfig.cle,"content-type":"application/json"};
  const source="DEVOIR:"+id+":0",filtre=new URLSearchParams({source:"eq."+source,auteur:"eq."+auteur,application:"eq."+APP_LECONS});
  const texte="DEVOIR TEST TECHNIQUE\nWolof : Naka nga def ?\nFrançais : Comment vas-tu ?";
  const bloc={version:2 as const,type:"devoir" as const,id,index:0,total:1,texte,date:new Date().toISOString()};
  const diagnostic={quand:new Date().toISOString(),racine_modifiee:false,relecture_exacte:false,historique_conserve:false,ancienne_revision_refusee:false,nettoye:false};
  try{
   const r=await fetch(base,{method:"POST",headers,body:JSON.stringify([{source,corrigee:texte,proposee:JSON.stringify(bloc),application:APP_LECONS,auteur,langue:"wo"}]),signal:AbortSignal.timeout(8000)});
   if(!r.ok)throw Error("fixture");
   const d={...assemblerDevoirs([bloc]).devoirs[0],revision:revisionDevoir(texte)};
   const origine=origineReplique(d,"0","wo");if(!origine)throw Error("origine");
   const nouvelle=await modifierDevoir(origine,"Nanga def ?",auteur);
   const check=await fetch(base+"?select=proposee,corrigee&"+filtre,{headers,cache:"no-store",signal:AbortSignal.timeout(8000)});
   if(!check.ok)throw Error("lecture");const rows=await check.json(),b=JSON.parse(rows[0]?.proposee||"{}");
   diagnostic.racine_modifiee=b.texte===texte.replace("Naka nga def ?","Nanga def ?")&&rows[0]?.corrigee===b.texte;
   diagnostic.relecture_exacte=assemblerDevoirs([b]).devoirs[0]?.texte===b.texte&&nouvelle.revision===revisionDevoir(b.texte);
   diagnostic.historique_conserve=b.corrections?.[0]?.avant==="Naka nga def ?";
   try{await modifierDevoir(origine,"Ne doit pas être enregistré.",auteur);}catch{diagnostic.ancienne_revision_refusee=true;}
  }catch{ /* Only safe boolean evidence is exposed publicly. */ }
  finally{
   try{const r=await fetch(base+"?"+filtre,{method:"DELETE",headers,signal:AbortSignal.timeout(8000)});
    if(r.ok){const check=await fetch(base+"?select=id&"+filtre,{headers,cache:"no-store",signal:AbortSignal.timeout(8000)});diagnostic.nettoye=check.ok&&(await check.json()).length===0;}
   }catch{}
  }
  etat.diagnostic=diagnostic;return diagnostic;
 })();
}
