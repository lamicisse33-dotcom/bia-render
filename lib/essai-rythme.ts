import {POST} from '../app/api/chatterbox-test/bia/route';
import {ouvrirRepliques} from './flux-repliques';
import {grainePriseVoix} from './prise-voix';
import {NextRequest} from 'next/server';
import {createHash} from 'node:crypto';
import {preparerPassagesKhalam} from './passages-khalam';
import {assemblerSonsCourants} from './assembler-sons-courants';
import {versMp3} from './mp3';
import {chezOreilleLocale} from './ecoute-locale';
const g=globalThis as typeof globalThis&{biaEssaiRythme?:{rapport:unknown;travail?:Promise<unknown>}};
const etat=g.biaEssaiRythme??={rapport:null};
export const resumeRythme=()=>etat.rapport;
/** Fixed owner-supplied excerpts. No edits to lessons or saved recordings. */
export function verifierRythme(){return etat.travail??=(async()=>{
 const headers={'content-type':'application/json','x-chatterbox-test-key':process.env.CHATTERBOX_TEST_KEY||''};
 const url='https://app.khalam.app/api/chatterbox-test/bia',depuis=Date.now(),cas:any[]=[];
 const decode=(s:string)=>{const b=Buffer.from(s,'base64');return b.buffer.slice(b.byteOffset,b.byteOffset+b.byteLength);};
 async function garder(variante:string,texte:string,sons:ArrayBuffer[],plan:unknown){
  const audio=assemblerSonsCourants(sons,60),mp3=versMp3(audio.wav);
  const entendu=await chezOreilleLocale(new Blob([audio.wav],{type:'audio/wav'}));
  cas.push({variante,texte,plan,secondes:audio.secondes,sha256:createHash('sha256').update(mp3).digest('hex'),transcription_indicative:entendu?.texte||null,audio_mp3:Buffer.from(mp3).toString('base64')});
 }
 const flux=[];
 for(const texte of ['Naka sa famille ?','Dañu ma ne dossierbi en cours la.'])for(let essai=0;essai<2;essai++){
  const debut=Date.now();
  const r=await fetch(url,{method:'POST',headers,body:JSON.stringify({texte,langue:'wo',voice:'female',lecture_fidele:false,continu:true}),signal:AbortSignal.timeout(40000)});
  const lecteur=ouvrirRepliques(r,()=>{});let total=1;const arrives:number[]=[],durees:number[]=[],clips:ArrayBuffer[]=[];let cache=0;
  for(let i=0;i<total;i++){
   const d=await lecteur.morceau(i) as Awaited<ReturnType<typeof lecteur.morceau>>&{audio_en_cache?:boolean};total=d.parties;arrives.push(Date.now()-debut);if(d.audio_en_cache)cache++;
   const wav=decode(d.audio!);clips.push(wav);durees.push(assemblerSonsCourants([wav],60).secondes);
  }
  const depart=(total>1&&durees[0]<1.6?arrives[1]:arrives[0])+60;let fin=depart+1000*durees[0],couture=0;
  for(let i=1;i<total;i++){couture=Math.max(couture,Math.max(0,arrives[i]+60-fin));fin=Math.max(fin,arrives[i]+60)+1000*durees[i];}
  const plan=await preparerPassagesKhalam(texte,'wo',false,false);
  flux.push({texte,essai,parties:total,cache,arrivees_ms:arrives,premier_son_estime_ms:depart,couture_estimee_max_ms:Math.round(couture)});
  if(!essai)await garder('conversation-'+texte,texte,clips,plan);
 }
 etat.rapport={date:new Date().toISOString(),statut:'termine',total_ms:Date.now()-depuis,flux,mesure:'réception HTTP et calendrier audio simulé ; débit français et wolof à 1×',ecoute_humaine_verifiee:false,cas:cas.map(({audio_mp3,...c})=>c)};
 return {...etat.rapport as object,cas};
})();}
