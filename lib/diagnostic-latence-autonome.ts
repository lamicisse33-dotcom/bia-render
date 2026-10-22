import {teteDeLaReponse} from './diffusion';
import {detecterLangue} from './langue';
import {lireAudioBrique} from './briques-audio';
import {assemblerSonsCourants} from './assembler-sons-courants';

const g=globalThis as typeof globalThis&{biaDiagnosticLatence?:{rapport:any;travail?:Promise<void>}};
const etat=g.biaDiagnosticLatence??={rapport:null};
export const resumeDiagnosticLatence=()=>etat.rapport;
const exemples=[
 {id:'repas_fr',langue:'fr',texte:'Ce soir, je vais manger du poisson en ville.',history:[]},
 {id:'repas_wo',langue:'wo',texte:'Tay ci ngoon, dama bëgg dem lekk jën ci dëkk bi.',history:[]},
 {id:'suite_wo',langue:'wo',texte:'Dama bëgg lekk jën ak tamaate.',history:[{role:'user',text:'Tay ci ngoon, dama bëgg dem lekk ci dëkk bi.'},{role:'bia',text:'Lan nga bëgg lekk?'}]},
];

/** Real public HTTP routes with the owner's existing server-side credentials.
 * Fixed synthetic audio, actual ASR output, six sequential Sonnet exchanges.
 * Diagnostic flags prevent corpus/chat/lesson writes. No private text exported.
 */
export function verifierLatenceAutonome(){return etat.travail??=(async()=>{
 const rapport:any={statut:'en_cours',date:new Date().toISOString(),version:(process.env.RENDER_GIT_COMMIT||'').slice(0,12),modele:process.env.BIA_LLM_MODEL,lecture_navigateur_mesuree:false,microphone_mesure:false,perimetre:'Audio synthétique fixe → routes HTTP réelles ASR, conversation et premier clip vocal. Hors silence de fin de parole, réseau du téléphone et haut-parleur. Ordre inversé au second passage ; caches indiqués. Cache de réponse contourné pour mesurer six calculs réels ; cache de voix conservé.',cas:[]};etat.rapport=rapport;
 const code=process.env.BIA_CODE_MAITRE||'',base='https://app.khalam.app';
 const requete=(path:string,body:unknown,signal:AbortSignal)=>fetch(base+path,{method:'POST',headers:{'content-type':'application/json','x-bia-code':code,'x-bia-diagnostic-latence':'calcul'},body:JSON.stringify(body),signal,cache:'no-store'});
 try{
  if(!code)throw Error('acces_absent');
  const audios=new Map<string,Buffer>(),transcriptions=new Map<string,string>();
  rapport.preparation_audio=[];
  for(const exemple of exemples){
   const signal=AbortSignal.timeout(30000),debut=Date.now();
   const r=await requete('/api/chatterbox-test/bia',{texte:exemple.texte,langue:exemple.langue,voice:'female',lecture_fidele:true,continu:true},signal);
   const p:any={scenario:exemple.id,statut:r.status};rapport.preparation_audio.push(p);
   if(!r.ok)throw Error('audio_temoin_indisponible');
   const d=await lireAudioBrique(r,'female',signal);
   p.parties=d.parties;p.ms=Date.now()-debut;
   audios.set(exemple.id,Buffer.from(assemblerSonsCourants(d.clips,30).wav));
  }
  for(const index of [0,1,2,2,1,0]){
   const exemple=exemples[index],c:any={scenario:exemple.id,passage:rapport.cas.filter((x:any)=>x.scenario===exemple.id).length+1};rapport.cas.push(c);
   const signal=AbortSignal.timeout(45000),debut=Date.now();let voix:Promise<void>|undefined;
   try{
    const f=new FormData();f.set('audio',new Blob([new Uint8Array(audios.get(exemple.id)!)],{type:'audio/wav'}),'controle.wav');f.set('diagnostic','1');f.set('indice_langue',exemple.langue);
    const r=await fetch(base+'/api/ecouter',{method:'POST',headers:{'x-bia-code':code},body:f,signal,cache:'no-store'}),d=await r.json();c.asr_ms=Date.now()-debut;c.ecoute=d.chronometrage;
    if(!r.ok||d.panne||d.transcription_rejetee||!String(d.texte||'').trim())throw Error('ecoute_non_confirmee');
    const temoin=transcriptions.get(exemple.id);transcriptions.set(exemple.id,d.texte);c.meme_transcription=temoin===undefined?null:temoin===d.texte;c.transcription_signes=d.texte.length;
    const debutChat=Date.now(),response=await requete('/api/chat',{message:d.texte,history:exemple.history,parole:true,diffuse:true,apprentissageTest:true},signal);
    if(!response.ok||!response.body||!response.headers.get('content-type')?.includes('text/event-stream'))throw Error('conversation_indisponible');
    const parler=(tete:string,langue:string)=>{
     c.premiere_phrase_ms=Date.now()-debutChat;c.phrase_signes=tete.length;c.langue_voix=langue;
     const depart=Date.now();
     voix=(async()=>{
      const r=await requete('/api/chatterbox-test/bia',{texte:tete,langue,voice:'female',continu:true},signal);
      if(!r.ok||!r.body)throw Error('voix_indisponible');
      const reader=r.body.getReader(),decoder=new TextDecoder();let buffer='',nombre=0,fin=false;
      try{for(;;){const p=await reader.read();if(p.done)break;buffer+=decoder.decode(p.value,{stream:true});let cut;
       while((cut=buffer.indexOf('\n'))>=0){const line=buffer.slice(0,cut);buffer=buffer.slice(cut+1);if(!line.trim())continue;const a=JSON.parse(line);
        if(a.type==='erreur')throw Error('voix_indisponible');
        if(a.type==='morceau'){
         if(a.partie!==nombre++||!a.audio||Buffer.from(a.audio,'base64').length<=44)throw Error('audio_invalide');
         if(c.voix_ms===undefined){c.voix_ms=Date.now()-depart;c.premier_audio_ms=Date.now()-debut;c.voix_cache=!!a.audio_en_cache;c.voix_preparation_ms=a.preparation_ms;c.voix_fabrication_ms=a.fabrication_ms;c.voix_generation_ms=a.generation_ms;c.gpu=a.temps_gpu;}
        }else if(a.type==='fin')fin=true;
       }
      }if(!fin||!nombre)throw Error('audio_invalide');}finally{await reader.cancel().catch(()=>{});}
     })();void voix.catch(()=>{});
    };
    const reader=response.body.getReader(),decoder=new TextDecoder();let buffer='',texte='',fin=false;
    try{for(;;){const p=await reader.read();if(p.done)break;buffer+=decoder.decode(p.value,{stream:true});let cut;
     while((cut=buffer.indexOf('\n\n'))>=0){const packet=buffer.slice(0,cut);buffer=buffer.slice(cut+2);const nom=packet.match(/^event:\s*(.+)$/m)?.[1],raw=packet.match(/^data:\s*(.+)$/m)?.[1];if(!raw)continue;const e=JSON.parse(raw);
      if(nom==='texte'){c.premier_texte_ms??=Date.now()-debutChat;texte+=e.morceau||'';const tete=teteDeLaReponse(texte);if(tete&&!voix)parler(tete,detecterLangue(tete,exemple.langue as 'fr'|'wo'));}
      if(nom==='fin'){
       c.texte_complet_ms=Date.now()-debutChat;c.conversation=e.chronometrage;c.source=e.corps?.source;fin=e.statut===200&&!!e.corps?.reply;
       if(fin&&!voix){const joint=e.corps.audio_memorise?.base64||e.corps.audio_anticipe?.base64;
        if(typeof joint==='string'&&Buffer.from(joint,'base64').length>44){c.audio_joint=true;c.voix_cache=true;c.voix_ms=0;c.premier_audio_ms=Date.now()-debut;voix=Promise.resolve();}
        else parler(teteDeLaReponse(e.corps.reply)||e.corps.reply,e.corps.langue==='wo'?'wo':'fr');
       }
      }
     }
    }}finally{await reader.cancel().catch(()=>{});}
    if(!fin||!voix)throw Error('reponse_non_confirmee');await voix;c.ok=true;
   }catch{if(voix)await voix.catch(()=>{});c.ok=false;c.erreur='echange_non_confirme';c.ms=Date.now()-debut;}
  }
  rapport.statut=rapport.cas.every((c:any)=>c.ok)?'termine':'a_verifier';
 }catch(e){rapport.statut='echec';rapport.erreur=e instanceof Error&&['acces_absent','audio_temoin_indisponible','Audio incomplet'].includes(e.message)?e.message:'preparation_non_confirmee';}
 rapport.fin=new Date().toISOString();
})();}
