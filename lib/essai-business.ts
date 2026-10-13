import {POST} from '../app/api/chatterbox-test/bia/route';
import {POST as synthese} from '../app/api/chatterbox-test/route';
import {grainePriseVoix} from './prise-voix';
import {NextRequest} from 'next/server';
import {createHash} from 'node:crypto';
import {preparerPassagesKhalam} from './passages-khalam';
import {assemblerSonsCourants} from './assembler-sons-courants';
import {versMp3} from './mp3';
import {chezOreilleLocale} from './ecoute-locale';
const g=globalThis as typeof globalThis&{biaEssaiBusiness?:{rapport:unknown;travail?:Promise<unknown>}};
const etat=g.biaEssaiBusiness??={rapport:null};
export const resumeBusiness=()=>etat.rapport;
/** Fixed owner-supplied excerpts. No edits to lessons or saved recordings. */
export function verifierBusiness(){return etat.travail??=(async()=>{
 const headers={'content-type':'application/json','x-chatterbox-test-key':process.env.CHATTERBOX_TEST_KEY||''};
 const url='https://app.khalam.app/api/chatterbox-test/bia',depuis=Date.now(),cas:any[]=[];
 const decode=(s:string)=>{const b=Buffer.from(s,'base64');return b.buffer.slice(b.byteOffset,b.byteOffset+b.byteLength);};
 async function garder(variante:string,texte:string,sons:ArrayBuffer[],plan:unknown){
  const audio=assemblerSonsCourants(sons,60),mp3=versMp3(audio.wav);
  const entendu=await chezOreilleLocale(new Blob([audio.wav],{type:'audio/wav'}));
  cas.push({variante,texte,plan,secondes:audio.secondes,sha256:createHash('sha256').update(mp3).digest('hex'),transcription_indicative:entendu?.texte||null,audio_mp3:Buffer.from(mp3).toString('base64')});
 }
 for(const [id,texte] of [
  ['BIA-BUS-048','Déedéet,livraison bi à part la.'],
  ['BIA-BUS-077','Bul tontu ak insultes.Dëfal sa réponse calme te professionnel.'],
 ])for(const nouvelle_prise of [undefined,'business-prise-1','business-prise-2']){
  const variante=id+'-'+(nouvelle_prise||'actuelle');
  const plan=await preparerPassagesKhalam(texte,'wo',false,true),clips:ArrayBuffer[]=[];
  let total=1,empreinte:string|undefined;
  for(let partie=0;partie<total;partie++){
   const r=await POST(new NextRequest(url,{method:'POST',headers,body:JSON.stringify({texte,langue:'wo',voice:'female',lecture_fidele:true,partie,empreinte,nouvelle_prise})}));
   const d=await r.json();if(!r.ok||!d.audio||d.partie!==partie||!Number.isInteger(d.parties)||d.parties<1||d.parties>16||(partie>0&&(empreinte!==d.empreinte||total!==d.parties)))throw Error('synthese_incomplete');
   total=d.parties;empreinte=d.empreinte;clips.push(decode(d.audio));
  }
  await garder(variante,texte,clips,plan.map((p,i)=>({...p,seed:grainePriseVoix(nouvelle_prise,'female',i,p.prise?.female)})));
 }
 for(const [variante,plan] of [
  ['048-liee-wo',[{texte:'Déedéet,livraison bi à part la.',langue:'wo'}]],
  ['048-liee-fr',[{texte:'Déedéet,',langue:'wo'},{texte:'livraison bi à part la.',langue:'fr'}]],
  ['077-defal-sa',[{texte:'Bul tontu ak insultes.',langue:'wo'},{texte:'Dëfal sa',langue:'wo'},{texte:'réponse calme te professionnel.',langue:'fr'}]],
 ] as const){
  const clips:ArrayBuffer[]=[];
  for(const p of plan){
   const r=await synthese(new NextRequest(url,{method:'POST',headers,body:JSON.stringify({input:{text:p.texte,voice:'female',language:p.langue,seed:913,preserve_segment:true}})}));
   const d=await r.json();if(!r.ok||!d.output?.audio_base64)throw Error('comparaison_incomplete');
   clips.push(decode(d.output.audio_base64));
  }
  await garder(variante,plan.map(p=>p.texte).join(' '),clips,plan);
 }
 etat.rapport={date:new Date().toISOString(),statut:'termine',total_ms:Date.now()-depuis,ecoute_humaine_verifiee:false,cas:cas.map(({audio_mp3,...c})=>c)};
 return {...etat.rapport as object,cas};
})();}
