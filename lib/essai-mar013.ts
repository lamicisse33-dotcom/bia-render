import {POST} from '../app/api/chatterbox-test/bia/route';
import {NextRequest} from 'next/server';
import {createHash} from 'node:crypto';
import {preparerPassagesKhalam} from './passages-khalam';
import {assemblerSonsCourants} from './assembler-sons-courants';
import {versMp3} from './mp3';
import {chezOreilleLocale} from './ecoute-locale';
const etat={rapport:null as unknown,travail:undefined as Promise<unknown>|undefined};
export const resumeMar013=()=>etat.rapport;
/** Owner's exact screenshot, bounded comparison; no source/cache replacement. */
export function verifierMar013(){return etat.travail??=(async()=>{
 const texte='Dañu bëgg ma séy ak ku ñu xam.';
 const cas=[];
 for(const variante of [{id:'decoupage-actuel',fidele:true,prise:''},{id:'phrase-entiere',fidele:false,prise:''},{id:'phrase-entiere-prise-2',fidele:false,prise:'mar013-phrase-2'}]){
  const plan=await preparerPassagesKhalam(texte,'wo',false,variante.fidele);
  const clips:ArrayBuffer[]=[];let total=1,empreinte:string|undefined;
  const debut=Date.now();
  for(let partie=0;partie<total;partie++){
   const r=await POST(new NextRequest('https://app.khalam.app/api/chatterbox-test/bia',{method:'POST',headers:{'content-type':'application/json','x-chatterbox-test-key':process.env.CHATTERBOX_TEST_KEY||''},body:JSON.stringify({texte,langue:'wo',voice:'female',lecture_fidele:variante.fidele,partie,empreinte,...(variante.prise?{nouvelle_prise:variante.prise}:{})})}));
   const d=await r.json();if(!r.ok||!d.audio||d.partie!==partie||!Number.isInteger(d.parties)||d.parties<1||d.parties>8||(partie>0&&(empreinte!==d.empreinte||total!==d.parties)))throw Error('synthese_incomplete');
   total=d.parties;empreinte=d.empreinte;const b=Buffer.from(d.audio,'base64');clips.push(b.buffer.slice(b.byteOffset,b.byteOffset+b.byteLength));
  }
  const synthese_ms=Date.now()-debut;
  const audio=assemblerSonsCourants(clips,30),mp3=versMp3(audio.wav);
  const entendu=await chezOreilleLocale(new Blob([audio.wav],{type:'audio/wav'}));
  cas.push({variante:variante.id,texte,plan,parties:total,secondes:audio.secondes,synthese_ms,sha256:createHash('sha256').update(mp3).digest('hex'),transcription_indicative:entendu?.texte||null,audio_mp3:Buffer.from(mp3).toString('base64')});
 }
 etat.rapport={date:new Date().toISOString(),statut:'termine',ecoute_humaine_verifiee:false,cas:cas.map(({audio_mp3,...c})=>c)};
 return {...etat.rapport as object,cas};
})();}
