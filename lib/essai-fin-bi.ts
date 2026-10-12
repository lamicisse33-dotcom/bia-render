import {POST} from '../app/api/chatterbox-test/bia/route';
import {POST as synthese} from '../app/api/chatterbox-test/route';
import {NextRequest} from 'next/server';
import {createHash} from 'node:crypto';
import {preparerPassagesKhalam} from './passages-khalam';
import {assemblerSonsCourants} from './assembler-sons-courants';
import {versMp3} from './mp3';
import {chezOreilleLocale} from './ecoute-locale';
const g=globalThis as typeof globalThis&{biaEssaiFinBi?:{rapport:unknown;travail?:Promise<unknown>}};
const etat=g.biaEssaiFinBi??={rapport:null};
export const resumeFinBi=()=>etat.rapport;
/** Exact screenshot and three bounded endings. Diagnostic only, no source edits. */
export function verifierFinBi(){return etat.travail??=(async()=>{
 const texte='Kon yooyu ay sujets la ngeen wara wax ci lu leer avant mariage bi.';
 const plan=await preparerPassagesKhalam(texte,'wo',false,true);
 const headers={'content-type':'application/json','x-chatterbox-test-key':process.env.CHATTERBOX_TEST_KEY||''};
 const url='https://app.khalam.app/api/chatterbox-test/bia';
 const clips:ArrayBuffer[]=[];let total=1,empreinte:string|undefined;
 const depuis=Date.now();
 const decode=(s:string)=>{const b=Buffer.from(s,'base64');return b.buffer.slice(b.byteOffset,b.byteOffset+b.byteLength);};
 for(let partie=0;partie<total;partie++){
  const r=await POST(new NextRequest(url,{method:'POST',headers,body:JSON.stringify({texte,langue:'wo',voice:'female',lecture_fidele:true,partie,empreinte})}));
  const d=await r.json();if(!r.ok||!d.audio||d.partie!==partie||!Number.isInteger(d.parties)||d.parties<1||d.parties>16||(partie>0&&(empreinte!==d.empreinte||total!==d.parties)))throw Error('synthese_incomplete');
  total=d.parties;empreinte=d.empreinte;clips.push(decode(d.audio));
 }
 const cas:any[]=[];
 async function garder(variante:string,t:string,sons:ArrayBuffer[],langues:unknown){
  const audio=assemblerSonsCourants(sons,60),mp3=versMp3(audio.wav);
  const entendu=await chezOreilleLocale(new Blob([audio.wav],{type:'audio/wav'}));
  cas.push({variante,texte:t,plan:langues,secondes:audio.secondes,sha256:createHash('sha256').update(mp3).digest('hex'),transcription_indicative:entendu?.texte||null,audio_mp3:Buffer.from(mp3).toString('base64')});
 }
 await garder('lecture-actuelle',texte,clips,plan);
 const suffixe=plan.at(-1),avant=plan.at(-2);
 if(suffixe?.langue==='wo'&&/^bi\.$/iu.test(suffixe.texte.trim()))await garder('bi-isole',suffixe.texte,[clips.at(-1)!],[suffixe]);
 for(const t of ['mariage bi.','message bi.','prix bi.']){
  const r=await synthese(new NextRequest(url,{method:'POST',headers,body:JSON.stringify({input:{text:t,voice:'female',language:'fr',seed:913,preserve_segment:true}})}));
  const d=await r.json();if(!r.ok||!d.output?.audio_base64)throw Error('fin_incomplete');
  const son=decode(d.output.audio_base64);
  await garder('fin-liee-'+t.split(' ')[0],t,[son],[{texte:t,langue:'fr'}]);
  if(t==='mariage bi.'&&suffixe?.langue==='wo'&&suffixe.texte.trim()==='bi.'&&avant?.langue==='fr'&&avant.texte.trim()==='mariage'){
   await garder('phrase-fin-liee',texte,[...clips.slice(0,-2),son],[...plan.slice(0,-2),{texte:t,langue:'fr'}]);
  }
 }
 etat.rapport={date:new Date().toISOString(),statut:'termine',total_ms:Date.now()-depuis,ecoute_humaine_verifiee:false,cas:cas.map(({audio_mp3,...c})=>c)};
 return {...etat.rapport as object,cas};
})();}
