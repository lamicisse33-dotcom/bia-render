import {NextRequest} from 'next/server';
import {preparerPassagesKhalam} from './passages-khalam';
import type {PassageVoix} from './langue';
import {POST} from '../app/api/chatterbox-test/route';
import {assemblerSonsCourants} from './assembler-sons-courants';
import {versMp3} from './mp3';
const g=globalThis as typeof globalThis&{biaEssaiSa?:{rapport:Record<string,unknown>|null;audio?:Uint8Array;travail?:Promise<void>}};
const etat=g.biaEssaiSa??={rapport:null};
export const resumePossessifSa=()=>etat.rapport;
export const audioPossessifSa=()=>etat.audio;
/** Fixed screenshot excerpt. Compare the former isolated sa with one continuous
 * current preparation, keeping the same source words and learned corrections. */
export function verifierPossessifSa(){return etat.travail??=(async()=>{
 const texte='Kan nga mën a jaay sa yéré yi.',debut=Date.now(),cas=[];
 etat.rapport={statut:'en_cours',version:(process.env.RENDER_GIT_COMMIT||'').slice(0,12)};
 try{
  const apres=await preparerPassagesKhalam(texte,'wo',false,true);
  if(apres.length!==1||apres[0].langue!=='wo')throw Error('sa_encore_decoupe');
  const m=apres[0].texte.match(/^(.*?)(\s+sa)(\s+.*)$/u);if(!m)throw Error('extrait_inattendu');
  const avant:PassageVoix[]=[{texte:m[1],langue:'wo'},{texte:m[2],langue:'fr'},{texte:m[3],langue:'wo'}];
  for(const [variante,plan] of [['apres',apres],['avant',avant]] as const){
   const clips:ArrayBuffer[]=[],details=[];
   for(const p of plan){
    const r=await POST(new NextRequest('https://app.khalam.app/api/chatterbox-test',{method:'POST',headers:{'content-type':'application/json','x-chatterbox-test-key':process.env.CHATTERBOX_TEST_KEY||''},body:JSON.stringify({input:{text:p.texte,language:p.langue,voice:'female',seed:913,preserve_segment:true}})}));
    const d=await r.json();details.push({texte:p.texte,langue:p.langue,http:r.status});
    if(!r.ok||!d.output?.audio_base64)throw Error('synthese_incomplete');
    const b=Buffer.from(d.output.audio_base64,'base64');clips.push(b.buffer.slice(b.byteOffset,b.byteOffset+b.byteLength));
   }
   const audio=assemblerSonsCourants(clips);if(variante==='apres')etat.audio=versMp3(audio.wav);
   cas.push({variante,morceaux:plan.length,secondes:audio.secondes,details});
  }
  etat.rapport={statut:'termine',version:(process.env.RENDER_GIT_COMMIT||'').slice(0,12),texte,cas,ms:Date.now()-debut,audio_disponible:true,ecoute_humaine_verifiee:false,lecture_navigateur_mesuree:false};
 }catch{etat.rapport={statut:etat.audio?'comparaison_partielle':'echec',cas,ms:Date.now()-debut,audio_disponible:!!etat.audio,ecoute_humaine_verifiee:false,lecture_navigateur_mesuree:false};}
})();}
