import {createHash,randomUUID} from 'node:crypto';
import {lireCorrectionsCourantes,enregistrerRevisionCourante,idCourant,ErreurCorrectionSon,type PhraseEditable} from './corrections-sons-courants';
import {NextRequest} from 'next/server';
import {lexiqueConfig} from './lexique';
import {PHRASES_COURANTES,VERSION_SONS_COURANTS,type SonCourant} from './sons-courants-core';
import {sonsCourantsEtat} from './sons-courants-etat';
import {assemblerSonsCourants} from './assembler-sons-courants';
import {versMp3} from './mp3';
import {POST as synthetiser} from '../app/api/chatterbox-test/bia/route';
const bucket=process.env.SUPABASE_BUCKET_REPERTOIRE||'repertoire';
const prefix='bia-courant/'+VERSION_SONS_COURANTS;
const base=()=>lexiqueConfig.url+'/storage/v1/object/public/'+bucket+'/';
const sha=(x:string)=>createHash('sha256').update(x).digest('hex').slice(0,24);
const chemin=(p:{texte:string;langue:string;cle:string})=>`${prefix}/${p.langue}/${p.cle}-${sha(p.texte)}.mp3`;
const manifesto=prefix+'/manifeste.json';
const header=(type:string)=>({'content-type':type,apikey:lexiqueConfig.cle,Authorization:'Bearer '+lexiqueConfig.cle});
let enCours:Promise<unknown>|undefined;
async function deposer(path:string,body:Uint8Array,type:string,mutable=false){
 const r=await fetch(lexiqueConfig.url+'/storage/v1/object/'+bucket+'/'+path,{method:'POST',headers:{...header(type),'x-upsert':String(mutable),'cache-control':mutable?'no-cache':'31536000'},body,signal:AbortSignal.timeout(10000)});
 if(!r.ok)throw Error('stockage_'+r.status);
}
async function lireSonsOrigine():Promise<SonCourant[]>{
 if(!lexiqueConfig.actif)return [];
 const r=await fetch(base()+manifesto+'?t='+Date.now(),{cache:'no-store',signal:AbortSignal.timeout(5000)});
 if(r.status===404||r.status===400)return [];
 if(!r.ok)throw Error('manifeste_indisponible');
 const d=await r.json();if(!Array.isArray(d.sons))throw Error('manifeste_invalide');
 return d.sons.filter((s:SonCourant)=>s.version===VERSION_SONS_COURANTS&&s.octets>1000&&s.secondes>0&&PHRASES_COURANTES.some(p=>p.cle===s.cle&&p.langue===s.langue&&p.texte===s.texte&&s.adresse===base()+chemin(p)));
}
export function genererSonsCourants(){
 if(enCours)return enCours;
 enCours=(async()=>{
  const debut=Date.now(),sons=await lireSonsOrigine(),erreurs:{cle:string;langue:string;motif:string}[]=[];
  let crees=0;const deja=sons.length;
  const reste=PHRASES_COURANTES.filter(p=>!sons.some(s=>s.cle===p.cle&&s.langue===p.langue)).sort((a,b)=>Number(b.usage==='reaction')-Number(a.usage==='reaction'));
  for(const p of reste.slice(0,10)){
   if(Date.now()-debut>55000)break;
   try{
    // Never interpret an unavailable object store as permission to regenerate.
    const check=await fetch(base()+chemin(p),{method:'HEAD',cache:'no-store',signal:AbortSignal.timeout(5000)});
    if(check.ok)throw Error('audio_present_manifeste_a_reparer');
    if(check.status!==400&&check.status!==404)throw Error('stockage_indisponible');
    const {audio,mp3}=await fabriquerSon(p);
    await deposer(chemin(p),mp3,'audio/mpeg');
    const relu=await fetch(base()+chemin(p),{cache:'no-store',signal:AbortSignal.timeout(5000)});
    if(!relu.ok||sha(Buffer.from(await relu.arrayBuffer()).toString('base64'))!==sha(Buffer.from(mp3).toString('base64')))throw Error('relecture_audio');
    const entree={...p,adresse:base()+chemin(p),secondes:Number(audio.secondes.toFixed(3)),octets:mp3.length,version:VERSION_SONS_COURANTS};
    await deposer(manifesto,new TextEncoder().encode(JSON.stringify({version:VERSION_SONS_COURANTS,sons:[...sons,entree]})), 'application/json',true);
    sons.push(entree);
    crees++;
   }catch(e){erreurs.push({cle:p.cle,langue:p.langue,motif:e instanceof Error?e.message:'generation'});break;}
  }
  const bilan={quand:new Date().toISOString(),attendus:PHRASES_COURANTES.length,enregistres:sons.length,crees,deja,restants:PHRASES_COURANTES.length-sons.length,octets:sons.reduce((n,s)=>n+s.octets,0),ms:Date.now()-debut,erreurs};
  sonsCourantsEtat.generation=bilan;return bilan;
 })().finally(()=>{enCours=undefined;});
 return enCours;
}

export async function fabriquerSon(p:{texte:string;langue:string},nouvellePrise?:string,arrierePlan=false){
    const clips:ArrayBuffer[]=[];let total=1,empreinte:string|undefined;
    for(let partie=0;partie<total;partie++){
     if(arrierePlan)while((globalThis as typeof globalThis&{biaVoixInteractiveJusqua?:number}).biaVoixInteractiveJusqua!>Date.now())await new Promise(r=>setTimeout(r,1000));
     const r=await synthetiser(new NextRequest('https://app.khalam.app/api/chatterbox-test/bia',{method:'POST',headers:{'content-type':'application/json','x-chatterbox-test-key':process.env.CHATTERBOX_TEST_KEY||'',...(arrierePlan?{'x-bia-preparation':'memoire'}:{})},body:JSON.stringify({texte:p.texte,langue:p.langue,voice:'female',lecture_fidele:true,partie,empreinte,...(nouvellePrise?{nouvelle_prise:nouvellePrise}:{})})}));
     const d=await r.json();if(!r.ok||typeof d.audio!=='string'||d.voice!=='female'||d.partie!==partie||!Number.isInteger(d.parties)||d.parties<1||d.parties>(arrierePlan?512:12))throw Error('synthese_incomplete');
     const attendu=d.langue==='fr'?'b1237586127ce98e7800a68e49938eb5092846862aabcb6e17b2fda7889a6c75':'8320e6788427029dcaf7aeea8e54124f172dd7cdd12d7fcf658cf616c0c21e9f';
     if(d.checkpoint_sha256!==attendu)throw Error('modele_inattendu');
     if(partie&&d.empreinte!==empreinte)throw Error('preparation_modifiee');
     total=d.parties;empreinte=d.empreinte;const b=Buffer.from(d.audio,'base64');clips.push(b.buffer.slice(b.byteOffset,b.byteOffset+b.byteLength));
    }
    const audio=assemblerSonsCourants(clips,arrierePlan?1200:45),mp3=versMp3(audio.wav);
 return {audio,mp3};
}

export async function lireCatalogueCourant(frais=false):Promise<PhraseEditable[]>{
 const [sons,corrections]=await Promise.all([lireSonsOrigine(),lireCorrectionsCourantes(frais)]);
 return PHRASES_COURANTES.map(p=>corrections.get(idCourant(p))||{...p,revision:0,audio:sons.find(s=>s.cle===p.cle&&s.langue===p.langue)});
}
export async function lireSonsCourants():Promise<SonCourant[]>{return (await lireCatalogueCourant()).flatMap(p=>p.audio?[p.audio]:[]);}
export async function corrigerSonCourant(cle:string,langue:'fr'|'wo',revision:number,texte:string){
 const p=(await lireCatalogueCourant(true)).find(p=>p.cle===cle&&p.langue===langue);
 if(!p||p.revision!==revision)throw new ErreurCorrectionSon('Cette phrase a changé. Recharge la page avant de la corriger.');
 if(p.texte===texte)return p;
 return enregistrerRevisionCourante(p,texte);
}
const generations=new Map<string,Promise<PhraseEditable>>();
export function regenererSonCourant(cle:string,langue:'fr'|'wo',revision:number){
 const id=cle+'-'+langue+'-'+revision;if(generations.has(id))return generations.get(id)!;
 const operation=(async()=>{
  const p=(await lireCatalogueCourant(true)).find(p=>p.cle===cle&&p.langue===langue);
  if(!p||p.revision!==revision)throw new ErreurCorrectionSon('Cette phrase a changé. Recharge la page avant de régénérer.');
  const prise=randomUUID(),{audio,mp3}=await fabriquerSon(p,prise);
  const path=prefix+'/corriges/'+idCourant(p)+'-'+prise+'.mp3';
  await deposer(path,mp3,'audio/mpeg');
  const relu=await fetch(base()+path,{cache:'no-store',signal:AbortSignal.timeout(5000)});
  if(!relu.ok||sha(Buffer.from(await relu.arrayBuffer()).toString('base64'))!==sha(Buffer.from(mp3).toString('base64')))throw Error('relecture_audio');
  const son:SonCourant={cle:p.cle,langue:p.langue,usage:p.usage,texte:p.texte,adresse:base()+path,secondes:Number(audio.secondes.toFixed(3)),octets:mp3.length,version:VERSION_SONS_COURANTS};
  // If the text changed while the GPU was working, never publish stale audio.
  return enregistrerRevisionCourante(p,p.texte,son);
 })().finally(()=>generations.delete(id));generations.set(id,operation);return operation;
}
