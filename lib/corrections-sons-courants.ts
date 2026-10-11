import {randomUUID} from 'node:crypto';
import {sonsCourantsEtat} from './sons-courants-etat';
import {lexiqueConfig} from './lexique';
import {PHRASES_COURANTES,VERSION_SONS_COURANTS,type SonCourant,type PhraseCourante} from './sons-courants-core';
export type PhraseEditable=PhraseCourante&{revision:number;audio?:SonCourant;ancienAudio?:SonCourant};
type Correction=PhraseEditable&{date:string;avant:string;action:'texte'|'audio'};
const bucket=process.env.SUPABASE_BUCKET_REPERTOIRE||'repertoire';
export const PREFIXE_CORRECTIONS='bia-courant/'+VERSION_SONS_COURANTS+'/corrections';
export const adresseCourante=(path:string)=>lexiqueConfig.url+'/storage/v1/object/public/'+bucket+'/'+path;
const headers=()=>({'content-type':'application/json',apikey:lexiqueConfig.cle,Authorization:'Bearer '+lexiqueConfig.cle});
export class ErreurCorrectionSon extends Error{constructor(message:string,public status=409){super(message);}}
export const idCourant=(p:{cle:string;langue:string})=>p.cle+'-'+p.langue;
let cache:{jusqua:number;valeurs:Map<string,Correction>}|undefined;
let generation=0;
let chargement:Promise<Map<string,Correction>>|undefined;
export async function lireCorrectionsCourantes(frais=false):Promise<Map<string,Correction>>{
 if(!lexiqueConfig.actif)return new Map();
 if(!frais&&cache&&cache.jusqua>Date.now())return cache.valeurs;
 if(!frais&&chargement)return chargement;
 const epoch=generation;
 const lire=async()=>{
  const fichiers=new Map<string,{name:string;revision:number}>();
  for(let offset=0;;offset+=1000){
   const r=await fetch(lexiqueConfig.url+'/storage/v1/object/list/'+bucket,{method:'POST',headers:headers(),body:JSON.stringify({prefix:PREFIXE_CORRECTIONS,limit:1000,offset,sortBy:{column:'name',order:'asc'}}),cache:'no-store',signal:AbortSignal.timeout(5000)});
   if(!r.ok)throw new ErreurCorrectionSon('Les corrections sont indisponibles. Réessaie.',503);
   const lot=await r.json();if(!Array.isArray(lot))throw Error('liste_corrections_invalide');
   for(const o of lot){
    const m=typeof o.name==='string'&&o.name.match(/^(.+)-(wo|fr)-(\d+)\.json$/);if(!m)continue;
    const id=m[1]+'-'+m[2],revision=Number(m[3]);
    if(PHRASES_COURANTES.some(p=>idCourant(p)===id)&&Number.isSafeInteger(revision)&&revision>0&&revision>(fichiers.get(id)?.revision||0))fichiers.set(id,{name:o.name,revision});
   }
   if(lot.length<1000)break;
  }
  const valeurs=new Map<string,Correction>();
  await Promise.all([...fichiers].map(async([id,f])=>{
   const ancien=cache?.valeurs.get(id);if(ancien?.revision===f.revision){valeurs.set(id,ancien);return;}
   const r=await fetch(adresseCourante(PREFIXE_CORRECTIONS+'/'+f.name),{cache:'no-store',signal:AbortSignal.timeout(5000)});
   if(!r.ok)throw Error('correction_illisible');const p=await r.json() as Correction;
   const origine=PHRASES_COURANTES.find(x=>idCourant(x)===id);
   if(!origine||idCourant(p)!==id||p.revision!==f.revision||typeof p.texte!=='string'||!p.texte.trim()||p.texte.length>600||p.usage!==origine.usage)throw Error('correction_invalide');
   if(p.audio&&(p.audio.texte!==p.texte||idCourant(p.audio)!==id||p.audio.version!==VERSION_SONS_COURANTS||!p.audio.adresse.startsWith(adresseCourante('bia-courant/'+VERSION_SONS_COURANTS+'/corriges/'))))throw Error('audio_corrige_invalide');
   valeurs.set(id,p);
  }));
  if(epoch===generation)cache={jusqua:Date.now()+10000,valeurs};return valeurs;
 };
 const pending=lire();if(!frais){chargement=pending;try{return await pending;}finally{if(chargement===pending)chargement=undefined;}}return pending;
}
/** A revision has a deterministic object name, uploaded WITHOUT upsert.
 * Supabase's unique object key is the compare-and-swap: even two Render
 * instances cannot overwrite one another or erase another phrase's edits.
 * Every prior text/audio revision remains in this immutable journal. */
export async function enregistrerRevisionCourante(p:PhraseEditable,texte:string,audio?:SonCourant):Promise<PhraseEditable>{
 if(!lexiqueConfig.actif)throw new ErreurCorrectionSon('Supabase est indisponible.',503);
 const courant=(await lireCorrectionsCourantes(true)).get(idCourant(p));
 if((courant?.revision||0)!==p.revision)throw new ErreurCorrectionSon('Cette phrase a changé. Recharge la page avant de continuer.');
 const nouveau:Correction={cle:p.cle,langue:p.langue,usage:p.usage,texte,revision:p.revision+1,date:new Date().toISOString(),avant:p.texte,action:audio?'audio':'texte',...(audio?{audio}:{}),...((p.audio||p.ancienAudio)?{ancienAudio:p.audio||p.ancienAudio}:{})};
 const path=PREFIXE_CORRECTIONS+'/'+idCourant(p)+'-'+String(nouveau.revision).padStart(8,'0')+'.json';
 const body=JSON.stringify(nouveau);
 const r=await fetch(lexiqueConfig.url+'/storage/v1/object/'+bucket+'/'+path,{method:'POST',headers:{...headers(),'x-upsert':'false'},body,signal:AbortSignal.timeout(10000)});
 generation++;cache=undefined;chargement=undefined;
 if(!r.ok)throw new ErreurCorrectionSon('Enregistrement refusé ou correction simultanée. Recharge la page avant de réessayer.',r.status>=500?503:409);
 const check=await fetch(adresseCourante(path),{cache:'no-store',signal:AbortSignal.timeout(5000)});
 if(!check.ok||JSON.stringify(await check.json())!==body)throw new ErreurCorrectionSon('Enregistrement envoyé, mais confirmation impossible. Recharge la page pour vérifier.',503);
 return nouveau;
}
export async function correctionCourantePour(cle:string,langue:'fr'|'wo'){
 if(!PHRASES_COURANTES.some(p=>p.cle===cle&&p.langue===langue))return;
 try{return (await lireCorrectionsCourantes()).get(cle+'-'+langue);}
 catch{return cache?.valeurs.get(cle+'-'+langue);}
}

/** Isolated storage check. No catalogue phrase or audio is edited. */
export async function verifierStockageCorrectionsCourantes(){
 const path='bia-courant/'+VERSION_SONS_COURANTS+'/verification/'+randomUUID()+'.json';
 const url=lexiqueConfig.url+'/storage/v1/object/'+bucket+'/'+path;
 const body=JSON.stringify({verification:true,version:1});
 const bilan={quand:new Date().toISOString(),ecriture:false,relecture:false,ecrasement_refuse:false,nettoye:false};
 try{
  const a=await fetch(url,{method:'POST',headers:{...headers(),'x-upsert':'false'},body,signal:AbortSignal.timeout(5000)});
  bilan.ecriture=a.ok;if(!a.ok)return bilan;
  const b=await fetch(url,{method:'POST',headers:{...headers(),'x-upsert':'false'},body:JSON.stringify({verification:true,version:2}),signal:AbortSignal.timeout(5000)});
  bilan.ecrasement_refuse=!b.ok;
  const c=await fetch(adresseCourante(path),{cache:'no-store',signal:AbortSignal.timeout(5000)});
  bilan.relecture=c.ok&&JSON.stringify(await c.json())===body;
 }finally{
  if(bilan.ecriture){const d=await fetch(lexiqueConfig.url+'/storage/v1/object/'+bucket,{method:'DELETE',headers:headers(),body:JSON.stringify({prefixes:[path]}),signal:AbortSignal.timeout(5000)});bilan.nettoye=d.ok;}
  sonsCourantsEtat.corrections=bilan;
 }
 return bilan;
}
