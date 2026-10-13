import {POST} from '../app/api/chatterbox-test/bia/route';
import {POST as synthese} from '../app/api/chatterbox-test/route';
import {NextRequest} from 'next/server';
import {createHash} from 'node:crypto';
import {preparerPassagesKhalam} from './passages-khalam';
import {assemblerSonsCourants} from './assembler-sons-courants';
import {versMp3} from './mp3';
import {chezOreilleLocale} from './ecoute-locale';
const g=globalThis as typeof globalThis&{biaEssaiLanLool?:{rapport:unknown;travail?:Promise<unknown>}};
const etat=g.biaEssaiLanLool??={rapport:null};
export const resumeLanLool=()=>etat.rapport;
/** Fixed owner-supplied excerpts. No edits to lessons or saved recordings. */
export function verifierLanLool(){return etat.travail??=(async()=>{
 const headers={'content-type':'application/json','x-chatterbox-test-key':process.env.CHATTERBOX_TEST_KEY||''};
 const url='https://app.khalam.app/api/chatterbox-test/bia',depuis=Date.now(),cas:any[]=[];
 const decode=(s:string)=>{const b=Buffer.from(s,'base64');return b.buffer.slice(b.byteOffset,b.byteOffset+b.byteLength);};
 async function garder(variante:string,texte:string,sons:ArrayBuffer[],plan:unknown){
  const audio=assemblerSonsCourants(sons,60),mp3=versMp3(audio.wav);
  const entendu=await chezOreilleLocale(new Blob([audio.wav],{type:'audio/wav'}));
  cas.push({variante,texte,plan,secondes:audio.secondes,sha256:createHash('sha256').update(mp3).digest('hex'),transcription_indicative:entendu?.texte||null,audio_mp3:Buffer.from(mp3).toString('base64')});
 }
 for(const [variante,texte] of [
  ['emp042-actuelle','Waaw,amul problème.Lan nga bëgg nu wax léegi?'],
  ['emp042-espaces','Waaw, amul problème. Lan nga bëgg nu wax léegi?'],
  ['emp023-actuelle','Dama stressé lool.'],
 ]){
  const plan=await preparerPassagesKhalam(texte,'wo',false,true),clips:ArrayBuffer[]=[];
  let total=1,empreinte:string|undefined;
  for(let partie=0;partie<total;partie++){
   const r=await POST(new NextRequest(url,{method:'POST',headers,body:JSON.stringify({texte,langue:'wo',voice:'female',lecture_fidele:true,partie,empreinte})}));
   const d=await r.json();if(!r.ok||!d.audio||d.partie!==partie||!Number.isInteger(d.parties)||d.parties<1||d.parties>16||(partie>0&&(empreinte!==d.empreinte||total!==d.parties)))throw Error('synthese_incomplete');
   total=d.parties;empreinte=d.empreinte;clips.push(decode(d.audio));
  }
  await garder(variante,texte,clips,plan);
  if(variante==='emp023-actuelle'&&plan.at(-1)?.texte.trim()==='lool.')await garder('lool-isole','lool.',[clips.at(-1)!],[plan.at(-1)]);
 }
 for(const seed of [913,914]){
  const texte='Dama stressé lool.';
  const r=await synthese(new NextRequest(url,{method:'POST',headers,body:JSON.stringify({input:{text:texte,voice:'female',language:'wo',seed,preserve_segment:true}})}));
  const d=await r.json();if(!r.ok||!d.output?.audio_base64)throw Error('phrase_incomplete');
  await garder('emp023-entiere-'+seed,texte,[decode(d.output.audio_base64)],[{texte,langue:'wo',seed}]);
 }
 etat.rapport={date:new Date().toISOString(),statut:'termine',total_ms:Date.now()-depuis,ecoute_humaine_verifiee:false,cas:cas.map(({audio_mp3,...c})=>c)};
 return {...etat.rapport as object,cas};
})();}
