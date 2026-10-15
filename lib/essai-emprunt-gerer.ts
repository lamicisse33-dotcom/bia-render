import {NextRequest} from 'next/server';
import {preparerPassagesKhalam} from './passages-khalam';
import {POST} from '../app/api/chatterbox-test/route';
import {assemblerSonsCourants} from './assembler-sons-courants';
import {versMp3} from './mp3';
const g=globalThis as typeof globalThis&{biaEssaiGerer?:{rapport:Record<string,unknown>|null;audio?:Uint8Array;travail?:Promise<void>}};
const etat=g.biaEssaiGerer??={rapport:null};
export const resumeEmpruntGerer=()=>etat.rapport;
export const audioEmpruntGerer=()=>etat.audio;
/** One fixed owner-reported excerpt; never alters a source lesson. */
export function verifierEmpruntGerer(){return etat.travail??=(async()=>{
 const texte='Dafa yomb a gérer.',debut=Date.now(),clips:ArrayBuffer[]=[],cas=[];
 etat.rapport={statut:'en_cours',version:(process.env.RENDER_GIT_COMMIT||'').slice(0,12)};
 try{
  const plan=await preparerPassagesKhalam(texte,'wo',false,true);
  if(!plan.some(p=>p.langue==='fr'&&p.texte.includes('gérer')))throw Error('routage_incorrect');
  for(const p of plan){
   const r=await POST(new NextRequest('https://app.khalam.app/api/chatterbox-test',{method:'POST',headers:{'content-type':'application/json','x-chatterbox-test-key':process.env.CHATTERBOX_TEST_KEY||''},body:JSON.stringify({input:{text:p.texte,language:p.langue,voice:'female',seed:913,preserve_segment:true}})}));
   const d=await r.json();cas.push({texte:p.texte,langue:p.langue,http:r.status,modele:d.output?.checkpoint_sha256||null});
   if(!r.ok||!d.output?.audio_base64)throw Error('synthese_incomplete');
   const b=Buffer.from(d.output.audio_base64,'base64');clips.push(b.buffer.slice(b.byteOffset,b.byteOffset+b.byteLength));
  }
  const audio=assemblerSonsCourants(clips);etat.audio=versMp3(audio.wav);
  etat.rapport={statut:'termine',version:(process.env.RENDER_GIT_COMMIT||'').slice(0,12),texte,cas,ms:Date.now()-debut,secondes:audio.secondes,audio_disponible:true,ecoute_humaine_verifiee:false};
 }catch{etat.rapport={statut:'echec',version:(process.env.RENDER_GIT_COMMIT||'').slice(0,12),cas,ms:Date.now()-debut,audio_disponible:false};}
})();}
