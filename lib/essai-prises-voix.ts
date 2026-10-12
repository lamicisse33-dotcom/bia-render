import {POST} from '../app/api/chatterbox-test/bia/route';
import {NextRequest} from 'next/server';
import {createHash} from 'node:crypto';
import {assemblerSonsCourants} from './assembler-sons-courants';
import {versMp3} from './mp3';
import {chezOreilleLocale} from './ecoute-locale';
const g=globalThis as typeof globalThis&{biaEssaiPrises?:{rapport:unknown;travail?:Promise<unknown>}};
const etat=g.biaEssaiPrises??={rapport:null};
export const resumeEssaiPrises=()=>etat.rapport;
/** Finite diagnosis of the user's exact phrase; private audio, public metrics. */
export function verifierPrisesVoix(){return etat.travail??=(async()=>{
 const texte='Déédéét,dama ragal ñu mer.';
 const cas=[];
 for(const prise of ['', 'etu035-prise-2','etu035-prise-3','etu035-prise-4']){
  const clips:ArrayBuffer[]=[];let total=1,empreinte:string|undefined;
  const debut=Date.now();
  for(let partie=0;partie<total;partie++){
   const r=await POST(new NextRequest('https://app.khalam.app/api/chatterbox-test/bia',{method:'POST',headers:{'content-type':'application/json','x-chatterbox-test-key':process.env.CHATTERBOX_TEST_KEY||''},body:JSON.stringify({texte,langue:'wo',voice:'female',lecture_fidele:true,partie,empreinte,...(prise?{nouvelle_prise:prise}:{})})}));
   const d=await r.json();if(!r.ok||!d.audio||d.partie!==partie||d.parties>8)throw Error('synthese_incomplete');
   total=d.parties;empreinte=d.empreinte;const b=Buffer.from(d.audio,'base64');clips.push(b.buffer.slice(b.byteOffset,b.byteOffset+b.byteLength));
  }
  const audio=assemblerSonsCourants(clips,30);const mp3=versMp3(audio.wav);
  const entendu=await chezOreilleLocale(new Blob([audio.wav],{type:'audio/wav'}));
  cas.push({prise:prise||'origine',texte,secondes:audio.secondes,ms:Date.now()-debut,sha256:createHash('sha256').update(mp3).digest('hex'),transcription_indicative:entendu?.texte||null,audio_mp3:Buffer.from(mp3).toString('base64')});
 }
 etat.rapport={date:new Date().toISOString(),statut:'termine',audios_distincts:new Set(cas.map(c=>c.sha256)).size,ecoute_humaine_verifiee:false,cas:cas.map(({audio_mp3,...c})=>c)};
 return {...etat.rapport as object,cas};
})();}
