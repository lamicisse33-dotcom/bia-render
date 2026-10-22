import {createHash} from 'node:crypto';
import {reunirWav} from './essai-transport-voix';
import {mesurerReceptionAudio} from './mesure-reception-audio';
import {comparerTranscriptionAudio,motsComparaisonAudio} from './comparaison-transcription-audio';
type PriseComparaison={cas:number;mode:string;langue:string;texte:string;audio:string;duree_ms:number;sha256_pcm:string;transcription_brute?:string;transcription_corrigee?:string};
const g=globalThis as typeof globalThis&{biaStreamingIsole?:{rapport:any;travail?:Promise<void>;navigateur:any[];erreurs?:any[];lecteurs?:any[];prises?:PriseComparaison[];comparaison_lectures?:any[]}};
const etat=g.biaStreamingIsole??={rapport:null,navigateur:[]};
export const resumeStreamingIsole=()=>({reference:'441951c3c93f',conversation_modifiee:false,serveur:etat.rapport,navigateur:etat.navigateur,erreurs:etat.erreurs||[],lecteurs:etat.lecteurs||[],comparaison_lectures:etat.comparaison_lectures||[]});
/** Only the authenticated owner route calls this. Public status stays numeric;
 * retain at most the six bounded synthetic WAVs actually measured, never user audio. */
export const prisesStreamingIsole=()=>({version:etat.rapport?.version,date:etat.rapport?.date,statut:etat.rapport?.statut,prises:(etat.prises||[]).map(p=>({...p}))});
export function noterEssaiStreaming(d:any){
 if(!d||!['complet','stream'].includes(d.mode)||!['fr','wo'].includes(d.langue))return false;
 if(d.type==='comparaison'){
  if(!Number.isSafeInteger(d.cas)||d.cas<0||d.cas>2||!['lecture','fin','erreur'].includes(d.evenement))return false;
  etat.comparaison_lectures??=[];etat.comparaison_lectures.push({cas:d.cas,mode:d.mode,evenement:d.evenement,date:new Date().toISOString()});etat.comparaison_lectures=etat.comparaison_lectures.slice(-24);return true;
 }
 if(d.type==='lecteur'){
  if(d.essai!==917||!['lecture','fin','erreur'].includes(d.evenement))return false;
  etat.lecteurs??=[];etat.lecteurs.push({essai:917,evenement:d.evenement,date:new Date().toISOString()});etat.lecteurs=etat.lecteurs.slice(-20);return true;
 }
 if(d.type==='erreur'){
  if(!['activation_audio','verification_code','demande_voix','decodage_audio','lecture_audio'].includes(d.etape)||!['interrompu','acces_refuse_ou_reseau','son_bloque','audio_non_decode','lecture_incomplete'].includes(d.code))return false;
  etat.erreurs??=[];etat.erreurs.push({mode:d.mode,langue:d.langue,etape:d.etape,code:d.code,date:new Date().toISOString()});etat.erreurs=etat.erreurs.slice(-12);return true;
 }
 const propre:any={mode:d.mode,langue:d.langue,date:new Date().toISOString()};
 for(const k of ['premier_audio_ms','demarrage_programme_ms','reception_complete_ms','trou_max_ms','paquets','parties']){
  if(typeof d[k]!=='number'||!Number.isFinite(d[k])||d[k]<0||d[k]>300000)return false;propre[k]=Math.round(d[k]);
 }
 propre.audio_en_cache=d.audio_en_cache===true;propre.integrite=d.integrite===true;
 if(d.flux_http!==undefined){
  if(!Array.isArray(d.flux_http)||d.flux_http.length>24)return false;
  propre.flux_http=[];
  for(const flux of d.flux_http){
   if(!flux||!Number.isSafeInteger(flux.partie)||flux.partie<0||flux.partie>120)return false;
   const row:any={partie:flux.partie};
   for(const k of ['premier_octet_ms','metadonnees_ms','premier_audio_ms','dernier_audio_ms','fin_flux_ms','fermeture_http_ms','generation_ms','ecart_premier_dernier_audio_ms']){
    const v=flux[k];if(v!==null&&(typeof v!=='number'||!Number.isFinite(v)||v<0||v>300000))return false;row[k]=v===null?null:Math.round(v);
   }
   for(const k of ['lectures_http','lectures_avec_audio','paquets_audio','octets_recus']){
    const v=flux[k];if(!Number.isSafeInteger(v)||v<0||v>100_000_000)return false;row[k]=v;
   }
   if(!Array.isArray(flux.arrivees_audio_ms)||flux.arrivees_audio_ms.length>16||flux.arrivees_audio_ms.some((n:unknown)=>typeof n!=='number'||!Number.isFinite(n)||n<0||n>300000))return false;
   row.arrivees_audio_ms=flux.arrivees_audio_ms.map(Math.round);row.audio_en_cache=flux.audio_en_cache===true;row.generation_progressive_confirmee=false;
   propre.flux_http.push(row);
  }
 }
 etat.navigateur.push(propre);etat.navigateur=etat.navigateur.slice(-12);return true;
}
/** Same input/seed/checkpoint, sequential TTS then read-only ASR verification.
 * No conversation, corpus, learned-source or production configuration writes. */
export function verifierStreamingIsole(){return etat.travail??=(async()=>{
 const url=(process.env.CHATTERBOX_TEST_URL||'').replace(/\/$/,''),key=process.env.CHATTERBOX_TEST_KEY||'';
 const rapport:any={statut:'en_cours',date:new Date().toISOString(),version:(process.env.RENDER_GIT_COMMIT||'').slice(0,12),mesure:'Client HTTP du GPU : octets, premier/dernier paquet audio et fin du flux. Hors micro/LLM/téléphone. Une livraison étalée ne prouve pas le chevauchement de la génération ; pas une validation de prononciation.',cas:[]};etat.rapport=rapport;
 if(!url||!key){rapport.statut='configuration_absente';return;}
 etat.prises=[];
 const cas=[['wo','Dañu bëgg ma def lu ma bëggul.'],['wo','Mu dem ci marse bi, jënd soble ak tamaate, te dellusi ci kër ga.'],['fr','Le budget doit rester accessible à tous.']];
 for(let index=0;index<cas.length;index++){
  const [langue,texte]=cas[index];const c:any={langue,texte,passes:[]};rapport.cas.push(c);
  // Alternate order to expose warm-up effects. No cache at the app layer.
  for(const mode of index%2?['stream','complet']:['complet','stream']){
   const debut=Date.now(),depart=performance.now(),frames:Buffer[]=[];let premier:number|null=null,paquets=0,samples=0,meta=false,fin=false,generation:number|undefined,chronologie:ReturnType<typeof mesurerReceptionAudio>|undefined;
   try{
    const r=await fetch(url+(mode==='stream'?'/tts/stream':'/tts'),{method:'POST',headers:{'content-type':'application/json','x-khalam-key':key},body:JSON.stringify({input:{text:texte,voice:'female',language:langue,seed:913,language_id:'fr',temperature:langue==='fr'?.3:.4,...(langue==='fr'?{exaggeration:.25,cfg_weight:.7}:{}),preserve_segment:true}}),signal:AbortSignal.timeout(25000),cache:'no-store'});
    if(!r.ok)throw Error('HTTP_'+r.status);
    const sha=langue==='fr'?'b1237586127ce98e7800a68e49938eb5092846862aabcb6e17b2fda7889a6c75':'8320e6788427029dcaf7aeea8e54124f172dd7cdd12d7fcf658cf616c0c21e9f';
    if(mode==='complet'){
     const d=await r.json(),o=d.output;if(d.status!=='COMPLETED'||o?.checkpoint_sha256!==sha||o.voice!=='female'||!o.audio_base64)throw Error('modele_ou_audio_invalide');
     premier=Date.now()-debut;frames.push(Buffer.from(o.audio_base64,'base64'));generation=o.generation_ms;paquets=1;
    }else{
     chronologie=mesurerReceptionAudio(r,depart);
     if(!chronologie.response.body)throw Error('flux_absent');const reader=chronologie.response.body.getReader(),decoder=new TextDecoder();let buffer='';
     try{for(;;){const v=await reader.read();if(v.done)break;buffer+=decoder.decode(v.value,{stream:true});if(buffer.length>2000000)throw Error('paquet_trop_grand');let n;
      while((n=buffer.indexOf('\n'))>=0){const line=buffer.slice(0,n);buffer=buffer.slice(n+1);if(!line.trim())continue;const d=JSON.parse(line);
       if(fin)throw Error('donnees_apres_fin');
       if(d.type==='meta'){if(meta||d.checkpoint_sha256!==sha||d.voice!=='female'||d.sample_rate!==24000)throw Error('modele_invalide');meta=true;}
       else if(d.type==='audio'){if(!meta||d.sequence!==paquets||d.offset_samples!==samples||!Number.isSafeInteger(d.samples)||d.samples<=0||typeof d.audio_base64!=='string')throw Error('sequence_invalide');const frame=Buffer.from(d.audio_base64,'base64');const wav=reunirWav([frame]);if((wav.length-44)/2!==d.samples)throw Error('taille_invalide');premier??=Date.now()-debut;frames.push(frame);paquets++;samples+=d.samples;}
       else if(d.type==='end'){if(!paquets||d.samples!==samples||d.packets!==paquets)throw Error('fin_invalide');fin=true;generation=d.generation_ms;}
       else throw Error('flux_interrompu');
      }
     }if(!fin||buffer.trim())throw Error('fin_absente');}finally{await reader.cancel().catch(()=>{});}
    }
    const wav=reunirWav(frames),duree_ms=Math.round((wav.length-44)/48),sha256_pcm=createHash('sha256').update(wav.subarray(44)).digest('hex');
    if(wav.length<=1024*1024&&etat.prises.length<6)etat.prises.push({cas:index,mode,langue,texte,audio:wav.toString('base64'),duree_ms,sha256_pcm});
    c.passes.push({mode,premier_audio_ms:premier,reception_complete_ms:Date.now()-debut,generation_ms:generation,paquets,duree_ms,sha256_pcm,integrite:true,...(chronologie?{chronologie:chronologie.bilan()}: {})});
   }catch(e){const message=String((e as Error).message);c.passes.push({mode,erreur:/^[a-zA-Z_0-9]+$/.test(message)?message:'connexion_ou_format',ms:Date.now()-debut,...(chronologie?{chronologie:chronologie.bilan()}: {})});}
  }
  const a=c.passes.find((p:any)=>p.mode==='complet'),b=c.passes.find((p:any)=>p.mode==='stream');
  if(a?.integrite&&b?.integrite){c.gain_premier_audio_ms=a.premier_audio_ms-b.premier_audio_ms;c.pcm_identique=a.sha256_pcm===b.sha256_pcm;c.ecart_duree_ms=b.duree_ms-a.duree_ms;}
 }
 // Recognize the exact retained audio only after all TTS timings are complete.
 // Do not send the expected sentence to ASR or let spelling correction hide
 // omissions: evaluate texte_brut separately and expose only reference words.
 rapport.verification_fidelite={statut:'en_cours',methode:'ASR brut indicatif sur les prises exactes ; aucune validation humaine ni activation automatique.',validation_humaine:false};
 const code=process.env.BIA_CODE_MAITRE||'';
 if(!code)rapport.verification_fidelite.statut='acces_absent';
 else{
  for(const prise of etat.prises){
   const passe=rapport.cas[prise.cas].passes.find((p:any)=>p.mode===prise.mode),debut=Date.now();
   try{
    const form=new FormData();form.set('audio',new Blob([new Uint8Array(Buffer.from(prise.audio,'base64'))],{type:'audio/wav'}),'verification-streaming.wav');form.set('diagnostic','1');form.set('indice_langue',prise.langue);
    const r=await fetch('https://app.khalam.app/api/ecouter',{method:'POST',headers:{'x-bia-code':code},body:form,signal:AbortSignal.timeout(25000),cache:'no-store'}),d=await r.json();
    const brut=typeof d.texte_brut==='string'?d.texte_brut:String(d.texte||'');
    if(!r.ok||d.panne||d.transcription_rejetee||!brut.trim())throw Error('reconnaissance_non_confirmee');
    prise.transcription_brute=brut;prise.transcription_corrigee=String(d.texte||'');
    passe.verification_asr={statut:'indicatif',brut_disponible:typeof d.texte_brut==='string',ms:Date.now()-debut,...comparerTranscriptionAudio(prise.texte,brut)};
   }catch{passe.verification_asr={statut:'non_confirmee',ms:Date.now()-debut,validation_humaine:false};}
  }
  for(let n=0;n<rapport.cas.length;n++){
   const complet=etat.prises.find(p=>p.cas===n&&p.mode==='complet'),stream=etat.prises.find(p=>p.cas===n&&p.mode==='stream');
   if(complet?.transcription_brute&&stream?.transcription_brute)rapport.cas[n].asr_complet_flux_identique=JSON.stringify(motsComparaisonAudio(complet.transcription_brute))===JSON.stringify(motsComparaisonAudio(stream.transcription_brute));
  }
  rapport.verification_fidelite.statut=etat.prises.length===6&&rapport.cas.every((c:any)=>c.passes.every((p:any)=>p.verification_asr?.statut==='indicatif'))?'termine_indicatif':'a_verifier';
  // Real authenticated read-back proves the page receives these exact takes,
  // including across Next route bundles. No audio is copied into public status.
  try{
   const cible='https://app.khalam.app/api/essai-streaming?prises=1';
   const refuse=await fetch(cible,{signal:AbortSignal.timeout(10000),cache:'no-store'});await refuse.body?.cancel();
   const r=await fetch(cible,{headers:{'x-bia-code':code},signal:AbortSignal.timeout(10000),cache:'no-store'}),d=await r.json();
   const identiques=Array.isArray(d.prises)?d.prises.filter((p:any)=>{
    const attendu=etat.prises!.find(a=>a.cas===p.cas&&a.mode===p.mode);
    if(!attendu||typeof p.audio!=='string'||p.audio.length>1_500_000)return false;
    const wav=reunirWav([Buffer.from(p.audio,'base64')]);return createHash('sha256').update(wav.subarray(44)).digest('hex')===attendu.sha256_pcm;
   }).length:0;
   const distinctes=Array.isArray(d.prises)?new Set(d.prises.map((p:any)=>`${p.cas}:${p.mode}`)).size:0;
   rapport.controle_acces_prises={statut:r.status,refus_sans_code:refuse.status,prises_disponibles:d.prises?.length||0,prises_identiques:identiques,ok:r.ok&&refuse.status===401&&d.version===rapport.version&&identiques===6&&distinctes===6&&d.prises?.length===6};
  }catch{rapport.controle_acces_prises={ok:false};}
 }
 rapport.statut='termine';rapport.fin=new Date().toISOString();
})().catch(()=>{etat.rapport={statut:'echec',date:new Date().toISOString()};});}
