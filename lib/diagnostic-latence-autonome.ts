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
 const rapport:any={statut:'en_cours',date:new Date().toISOString(),version:(process.env.RENDER_GIT_COMMIT||'').slice(0,12),modele:process.env.BIA_LLM_MODEL,lecture_navigateur_mesuree:false,microphone_mesure:false,perimetre:'Audio synthétique fixe → routes HTTP réelles ASR, conversation et premier clip vocal. Hors silence de fin de parole, réseau du téléphone et haut-parleur. Ordre inversé au second passage ; caches indiqués. Cache de réponse contourné pour mesurer six calculs réels ; cache de voix conservé. Un septième jeu d\u2019échanges, lui, laisse le cache de sélection répondre : c\u2019est le seul qui mesure le chemin appris par la vraie route, et il publie ce qui reste sans nom.',cas:[]};etat.rapport=rapport;
 const code=process.env.BIA_CODE_MAITRE||'',base='https://app.khalam.app';
 const requete=(path:string,body:unknown,signal:AbortSignal,profil?:'sonnet'|'haiku',diagnostic:'calcul'|'1'='calcul')=>fetch(base+path,{method:'POST',headers:{'content-type':'application/json','x-bia-code':code,'x-bia-diagnostic-latence':diagnostic,...(profil?{'x-bia-essai-rapidite':profil}:{})},body:JSON.stringify(body),signal,cache:'no-store'});
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
        else parler(teteDeLaReponse(e.corps.reply)||e.corps.reply,e.corps.langue==='wo'||e.corps.langue==='fr'?e.corps.langue:detecterLangue(e.corps.reply,exemple.langue as 'wo'|'fr'));
       }
      }
     }
    }}finally{await reader.cancel().catch(()=>{});}
    if(!fin||!voix)throw Error('reponse_non_confirmee');await voix;c.ok=true;
   }catch{if(voix)await voix.catch(()=>{});c.ok=false;c.erreur='echange_non_confirme';c.ms=Date.now()-debut;}
  }
  // Paired, text-only model comparison: identical ASR transcript and history,
  // forced model per request. Store timings and model labels, never response text.
  rapport.comparaison_modeles=[];
  for(const [index,exemple] of exemples.entries())for(const profil of (index%2?['haiku','sonnet']:['sonnet','haiku']) as ('haiku'|'sonnet')[]){
   const c:any={scenario:exemple.id,profil};rapport.comparaison_modeles.push(c);
   try{
    const question=transcriptions.get(exemple.id);if(!question)throw Error('transcription_absente');
    const debut=Date.now(),signal=AbortSignal.timeout(30000);
    const response=await requete('/api/chat',{message:question,history:exemple.history,apprentissageTest:true,diffuse:true},signal,profil);
    if(!response.ok||!response.body)throw Error('conversation_indisponible');
    const reader=response.body.getReader(),decoder=new TextDecoder();let buffer='',termine=false;
    try{for(;;){const p=await reader.read();if(p.done)break;buffer+=decoder.decode(p.value,{stream:true});let cut;
     while((cut=buffer.indexOf('\n\n'))>=0){const packet=buffer.slice(0,cut);buffer=buffer.slice(cut+2);const nom=packet.match(/^event:\s*(.+)$/m)?.[1],raw=packet.match(/^data:\s*(.+)$/m)?.[1];if(!raw)continue;const e=JSON.parse(raw);
      if(nom==='texte')c.premier_texte_ms??=Date.now()-debut;
      if(nom==='fin'){c.complet_ms=Date.now()-debut;termine=e.statut===200&&!!e.corps?.reply;}
     }
    }}finally{await reader.cancel().catch(()=>{});}
    c.ok=termine&&c.premier_texte_ms!==undefined;
   }catch{c.ok=false;c.erreur='comparaison_non_confirmee';}
  }
  // Read-only verification of the learned-answer finalization, independent of
  // whether the six current model outputs happen to select a source tag.
  const [{dialoguerAvecDevoirs},{devoirsALire},{origineReplique},{audioPourReponse}]=await Promise.all([import('./dialogue-devoirs'),import('./devoirs-apprentissage'),import('./correction-devoir-core'),import('./audio-memoire')]);
  rapport.reponses_apprises=[];
  for(const exemple of exemples.filter(e=>e.langue==='wo')){
   const c:any={scenario:exemple.id},debut=Date.now();rapport.reponses_apprises.push(c);
   try{
    const memorisee=await dialoguerAvecDevoirs(transcriptions.get(exemple.id)!,exemple.history,{diagnostic:true,cacheSeulement:true});c.choix_ms=Date.now()-debut;c.disponible=!!memorisee;
    if(!memorisee)continue;
    const debutAudio=Date.now(),son=audioPourReponse(memorisee.reply,memorisee.langue).then(a=>{c.audio_ms=Date.now()-debutAudio;c.audio_disponible=!!a;});
    const t=Date.now(),d=(await devoirsALire(1500)).devoirs.find(d=>d.id===memorisee.lecon_id);c.devoirs_ms=Date.now()-t;
    const u=Date.now();c.provenance_disponible=!!(d&&origineReplique(d,memorisee.replique_id!,memorisee.langue));c.origine_ms=Date.now()-u;
    await son;c.total_ms=Date.now()-debut;c.ok=true;
   }catch{c.ok=false;}
  }
  /* ── LE CHEMIN APPRIS, PAR LA VRAIE ROUTE, SANS FORCER LE CALCUL ────────

    docs/DIAGNOSTIC-AUTONOME-2026-10-22.md laisse « environ 3 289 ms après le
    modèle » à tracer sur la sélection apprise wolof. `reponses_apprises`
    juste au-dessus mesure les briques EN MÉMOIRE — utile, mais ce n'est pas
    la fenêtre où le délai a été vu : celle-là va de la fin du modèle à la
    réponse HTTP complète.

    Et les six échanges ci-dessus ne peuvent pas la voir : ils posent
    `forcer_calcul`, qui annule exprès la lecture du cache de sélection pour
    mesurer six calculs neufs. Le chemin le plus emprunté restait donc hors
    de toute mesure HTTP.

    Ici, on envoie la même transcription avec l'en-tête de diagnostic SANS
    forcer le calcul : le cache de sélection répond s'il a quelque chose, et
    `chronometrage` rapporte le chemin pris et ses trois attentes
    (devoirs, provenance, audio mémorisé). Lecture seule, aucun écrit —
    `apprentissageTest` reste posé. Si rien n'est en cache, on le dit au lieu
    de le déduire. */
 rapport.chemin_appris_http=[];
 for(const exemple of exemples.filter(e=>e.langue==='wo')){
  const c:any={scenario:exemple.id};rapport.chemin_appris_http.push(c);
  try{
   const question=transcriptions.get(exemple.id);if(!question)throw Error('transcription_absente');
   const debut=Date.now(),signal=AbortSignal.timeout(30000);
   const response=await requete('/api/chat',{message:question,history:exemple.history,apprentissageTest:true,diffuse:true},signal,undefined,'1');
   if(!response.ok||!response.body)throw Error('conversation_indisponible');
   const reader=response.body.getReader(),decoder=new TextDecoder();let buffer='',termine=false;
   try{for(;;){const p=await reader.read();if(p.done)break;buffer+=decoder.decode(p.value,{stream:true});let cut;
    while((cut=buffer.indexOf('\n\n'))>=0){const packet=buffer.slice(0,cut);buffer=buffer.slice(cut+2);const nom=packet.match(/^event:\s*(.+)$/m)?.[1],raw=packet.match(/^data:\s*(.+)$/m)?.[1];if(!raw)continue;const e=JSON.parse(raw);
     if(nom==='texte')c.premier_texte_ms??=Date.now()-debut;
     if(nom==='fin'){
      c.reponse_http_complete_ms=Date.now()-debut;c.chronometrage=e.chronometrage;c.source=e.corps?.source;
      /* CE QUI RESTAIT SANS NOM, maintenant soustrait au lieu d'être deviné :
         la réponse HTTP complète moins ce que le serveur a su nommer. */
      const m=e.chronometrage||{};
      const nomme=(m.preparation_ms||0)+(m.modele_complet_ms||0)+(m.devoirs_ms||0)+(m.origine_ms||0)+(m.audio_memoire_ms||0);
      c.chemin=m.chemin??'reponse_libre';c.nomme_ms=nomme;c.sans_nom_ms=Math.max(0,(c.reponse_http_complete_ms||0)-nomme);
      termine=e.statut===200&&!!e.corps?.reply;
     }
    }
   }}finally{await reader.cancel().catch(()=>{});}
   c.ok=termine;
  }catch{c.ok=false;c.erreur='chemin_appris_non_confirme';}
 }
 rapport.statut=rapport.cas.every((c:any)=>c.ok)?'termine':'a_verifier';
 }catch(e){rapport.statut='echec';rapport.erreur=e instanceof Error&&['acces_absent','audio_temoin_indisponible','Audio incomplet'].includes(e.message)?e.message:'preparation_non_confirmee';}
 rapport.fin=new Date().toISOString();
})();}
