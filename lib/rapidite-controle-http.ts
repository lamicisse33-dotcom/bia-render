import {NextRequest} from 'next/server';
import {POST as ecouter} from '../app/api/ecouter/route';
import {POST as discuter} from '../app/api/chat/route';
import {POST as synthetiser} from '../app/api/chatterbox-test/bia/route';
import {teteDeLaReponse} from './diffusion';
import type {ProfilRapidite} from './rapidite-core';
const g=globalThis as typeof globalThis&{biaRapiditeControle?:{rapport:any;travail?:Promise<void>}};
const etat=g.biaRapiditeControle??={rapport:null};
export const resumeControleRapidite=()=>etat.rapport;
/** Six ordered synthetic replays, one fixed recording, no corpus/chat memory
 * writes. Measures receipt of audio, never claims a browser/speaker result. */
export function verifierChaineRapidite(){return etat.travail??=(async()=>{
 const rapport:any={statut:'en_cours',date:new Date().toISOString(),version:(process.env.RENDER_GIT_COMMIT||'').slice(0,12),lecture_navigateur_mesuree:false,limite:'Rejeu synthétique ASR → vraie route de conversation en mode diagnostic → premier audio HTTP. Hors microphone, détection de fin de parole et lecture navigateur. Deux essais par profil ; cache et ordre peuvent influencer les résultats.',cas:[]};etat.rapport=rapport;
 const code=process.env.BIA_CODE_MAITRE||'',signal=AbortSignal.timeout(180000),base='https://app.khalam.app';
 const requete=(path:string,body:unknown,profil?:ProfilRapidite)=>new NextRequest(base+path,{method:'POST',headers:{'content-type':'application/json','x-bia-code':code,...(profil?{'x-bia-essai-rapidite':profil}:{})},body:JSON.stringify(body),signal});
 try{
  if(!code)throw Error('acces_absent');
  const source=await synthetiser(requete('/api/chatterbox-test/bia',{texte:'Pourquoi le ciel est bleu ?',langue:'fr',voice:'female',lecture_fidele:true}));
  const audio=await source.json();if(!source.ok||!audio.audio||audio.parties!==1)throw Error('audio_temoin_indisponible');
  const bytes=Buffer.from(audio.audio,'base64');let transcriptionTemoin:string|undefined;
  const ordre:ProfilRapidite[]=['sonnet','haiku','haiku-optimise','haiku-optimise','haiku','sonnet'];
  for(const profil of ordre){
   signal.throwIfAborted();const c:any={profil,ordre:rapport.cas.length+1};rapport.cas.push(c);const debut=Date.now();
   try{
    const form=new FormData();form.set('audio',new Blob([bytes],{type:'audio/wav'}),'controle.wav');form.set('diagnostic','1');form.set('indice_langue','fr');
    const asr=await ecouter(new NextRequest(base+'/api/ecouter',{method:'POST',headers:{'x-bia-code':code,'x-bia-essai-rapidite':profil},body:form,signal}));
    const d=await asr.json();c.transcription_ms=Date.now()-debut;
    if(!asr.ok||d.panne||d.transcription_rejetee||!String(d.texte||'').trim())throw Error('ecoute_non_confirmee');
    transcriptionTemoin??=d.texte;c.meme_transcription=d.texte===transcriptionTemoin;
    const debutChat=Date.now(),response=await discuter(requete('/api/chat',{message:d.texte,history:[],parole:true,diffuse:true,apprentissageTest:true},profil));
    if(!response.ok||!response.body||!response.headers.get('content-type')?.includes('text/event-stream'))throw Error('conversation_indisponible');
    const reader=response.body.getReader(),decoder=new TextDecoder();let buffer='',texte='',fin=false,voix:Promise<void>|undefined;
    try{for(;;){const v=await reader.read();if(v.done)break;buffer+=decoder.decode(v.value,{stream:true});let i;
     while((i=buffer.indexOf('\n\n'))>=0){const packet=buffer.slice(0,i);buffer=buffer.slice(i+2);const nom=packet.match(/^event:\s*(.+)$/m)?.[1],raw=packet.match(/^data:\s*(.+)$/m)?.[1];if(!raw)continue;const ev=JSON.parse(raw);
      if(nom==='texte'){
       c.premier_texte_ms??=Date.now()-debutChat;texte+=ev.morceau||'';const tete=teteDeLaReponse(texte);
       if(tete&&!voix){c.premiere_phrase_ms=Date.now()-debutChat;const debutVoix=Date.now();
        voix=(async()=>{const r=await synthetiser(requete('/api/chatterbox-test/bia',{texte:tete,langue:'fr',voice:'female'}));const a=await r.json();if(!r.ok||!a.audio)throw Error('premier_audio_indisponible');c.voix_ms=Date.now()-debutVoix;c.premier_audio_depuis_envoi_ms=Date.now()-debut;c.audio_en_cache=!!a.audio_en_cache;c.fabrication_ms=a.fabrication_ms;c.audio_recu=true;})();
        void voix.catch(()=>{});
       }
      }
      if(nom==='fin'){fin=ev.statut===200&&!!ev.corps?.reply;c.texte_complet_ms=Date.now()-debutChat;}
     }
    }}finally{await reader.cancel().catch(()=>{});reader.releaseLock();}
    if(!fin||!voix)throw Error('reponse_non_confirmee');await voix;c.ok=true;
   }catch(e){c.ok=false;c.erreur=e instanceof Error&&['ecoute_non_confirmee','conversation_indisponible','premier_audio_indisponible','reponse_non_confirmee'].includes(e.message)?e.message:'controle_interrompu';}
  }
  rapport.statut=rapport.cas.every((c:any)=>c.ok)?'termine':'a_verifier';
 }catch(e){rapport.statut='echec';rapport.erreur=e instanceof Error&&['acces_absent','audio_temoin_indisponible'].includes(e.message)?e.message:'controle_interrompu';}
 rapport.fin=new Date().toISOString();
})();}
