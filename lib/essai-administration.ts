import {POST} from '../app/api/chatterbox-test/bia/route';
import {POST as synthese} from '../app/api/chatterbox-test/route';
import {grainePriseVoix} from './prise-voix';
import {NextRequest} from 'next/server';
import {createHash} from 'node:crypto';
import {preparerPassagesKhalam} from './passages-khalam';
import {assemblerSonsCourants} from './assembler-sons-courants';
import {versMp3} from './mp3';
import {chezOreilleLocale} from './ecoute-locale';
const g=globalThis as typeof globalThis&{biaEssaiAdministration?:{rapport:unknown;travail?:Promise<unknown>}};
const etat=g.biaEssaiAdministration??={rapport:null};
export const resumeAdministration=()=>etat.rapport;
/** Fixed owner-supplied excerpts. No edits to lessons or saved recordings. */
export function verifierAdministration(){return etat.travail??=(async()=>{
 const headers={'content-type':'application/json','x-chatterbox-test-key':process.env.CHATTERBOX_TEST_KEY||''};
 const url='https://app.khalam.app/api/chatterbox-test/bia',depuis=Date.now(),cas:any[]=[];
 const decode=(s:string)=>{const b=Buffer.from(s,'base64');return b.buffer.slice(b.byteOffset,b.byteOffset+b.byteLength);};
 async function garder(variante:string,texte:string,sons:ArrayBuffer[],plan:unknown){
  const audio=assemblerSonsCourants(sons,60),mp3=versMp3(audio.wav);
  const entendu=await chezOreilleLocale(new Blob([audio.wav],{type:'audio/wav'}));
  cas.push({variante,texte,plan,secondes:audio.secondes,sha256:createHash('sha256').update(mp3).digest('hex'),transcription_indicative:entendu?.texte||null,audio_mp3:Buffer.from(mp3).toString('base64')});
 }
 for(const [variante,plan,seed] of [
  ['025-mixte-913',[{texte:'Ban document moo',langue:'wo'},{texte:'manqueé?',langue:'fr'}],913],
  ['025-mixte-914',[{texte:'Ban document moo',langue:'wo'},{texte:'manqueé?',langue:'fr'}],914],
  ['024-ne-913',[{texte:'Dañu ma ne',langue:'wo'},{texte:'dossierbi',langue:'fr'},{texte:'dafa manqueé bénn document.',langue:'wo'}],913],
  ['024-ne-914',[{texte:'Dañu ma ne',langue:'wo'},{texte:'dossierbi',langue:'fr'},{texte:'dafa manqueé bénn document.',langue:'wo'}],914],
  ['024-contexte-915',[{texte:'Dañu ma ne dossierbi',langue:'wo'},{texte:'dafa manqueé bénn document.',langue:'wo'}],915],
  ['036-ne-913',[{texte:'Dañu ma ne',langue:'wo'},{texte:'dossierbi en cours la.',langue:'fr'}],913],
  ['036-ne-914',[{texte:'Dañu ma ne',langue:'wo'},{texte:'dossierbi en cours la.',langue:'fr'}],914],
  ['052-contexte-914',[{texte:'Dañu ma laaj',langue:'wo'},{texte:'preuve de paiement.',langue:'fr'}],914],
  ['052-contexte-915',[{texte:'Dañu ma laaj',langue:'wo'},{texte:'preuve de paiement.',langue:'fr'}],915],
 ] as const){
  const clips:ArrayBuffer[]=[];
  for(const p of plan){
   const r=await synthese(new NextRequest(url,{method:'POST',headers,body:JSON.stringify({input:{text:p.texte,voice:'female',language:p.langue,seed,preserve_segment:true}})}));
   const d=await r.json();if(!r.ok||!d.output?.audio_base64)throw Error('comparaison_incomplete');
   clips.push(decode(d.output.audio_base64));
  }
  await garder(variante,plan.map(p=>p.texte).join(' '),clips,plan.map(p=>({...p,seed})));
 }
 etat.rapport={date:new Date().toISOString(),statut:'termine',total_ms:Date.now()-depuis,ecoute_humaine_verifiee:false,cas:cas.map(({audio_mp3,...c})=>c)};
 return {...etat.rapport as object,cas};
})();}
