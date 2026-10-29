'use client';
import {useEffect,useRef,useState} from 'react';
import {Room,RoomEvent,Track} from 'livekit-client';

/** Relais audio officiel LiveKit DataStream : PCM16 mono, 16 kHz.
 * Références : livekit/agents-js plugins/runway/src/avatar.ts et
 * agents/src/voice/avatar/datastream_io.ts. Aucun micro ni cerveau secondaire. */
export default function EssaiAvatar(){
 const [code,setCode]=useState(''),[etat,setEtat]=useState('Prêt pour un essai de 10 secondes avec la voix enregistrée de Bia.'),[actif,setActif]=useState(false),[mesures,setMesures]=useState<string[]>([]);
 const video=useRef<HTMLVideoElement>(null),audio=useRef<HTMLAudioElement>(null),room=useRef<Room|null>(null),session=useRef(''),cle=useRef(''),tour=useRef(0),timer=useRef<ReturnType<typeof setTimeout>|null>(null);
 const spectateur=useRef<Room|null>(null);
 useEffect(()=>{setCode(localStorage.getItem('bia-code')||'');return()=>{tour.current++;room.current?.disconnect();spectateur.current?.disconnect();if(timer.current)clearTimeout(timer.current);if(session.current)void fetch('/api/avatar-runway',{method:'POST',headers:{'Content-Type':'application/json','x-bia-code':cle.current},body:JSON.stringify({action:'fermer',session:session.current}),keepalive:true});};},[]);
 async function arreter(){
  tour.current++;if(timer.current)clearTimeout(timer.current);timer.current=null;
  const r=room.current,id=session.current;room.current=null;session.current='';
  try{await r?.localParticipant.publishData(new Uint8Array(new TextEncoder().encode(JSON.stringify({type:'END_CALL'}))),{reliable:true,destinationIdentities:['runway-avatar-agent']});}catch{}
  await r?.disconnect();
  await spectateur.current?.disconnect();spectateur.current=null;
  if(id)await fetch('/api/avatar-runway',{method:'POST',headers:{'Content-Type':'application/json','x-bia-code':cle.current},body:JSON.stringify({action:'fermer',session:id}),keepalive:true}).catch(()=>{});
  setActif(false);setEtat('Essai terminé.');
 }
 async function lancer(){
  const generation=++tour.current;setActif(true);setMesures([]);cle.current=code.trim();
  const debut=performance.now();let envoye=0,premiereVideo=false;
  const noter=(s:string)=>setMesures(m=>[...m,s]);
  const mesurer=(evenement:string,ms?:number)=>{void fetch('/api/avatar-runway',{method:'POST',headers:{'Content-Type':'application/json','x-bia-code':cle.current},body:JSON.stringify({action:'mesure',evenement,ms}),keepalive:true}).catch(()=>{});};
  try{
   setEtat('Préparation de l’audio de Bia…');
   const ctx=new AudioContext();let pcm:Float32Array;
   try{const buffer=await ctx.decodeAudioData(await (await fetch('/voix-bia.wav')).arrayBuffer());const n=Math.min(Math.floor(buffer.duration*16000),160000);const offline=new OfflineAudioContext(1,n,16000);const src=offline.createBufferSource();src.buffer=buffer;src.connect(offline.destination);src.start();pcm=(await offline.startRendering()).getChannelData(0);}finally{await ctx.close();}
   if(tour.current!==generation)return;
   setEtat('Connexion de l’avatar…');
   const response=await fetch('/api/avatar-runway',{method:'POST',headers:{'Content-Type':'application/json','x-bia-code':cle.current},body:JSON.stringify({action:'ouvrir'})});
   const data=await response.json();if(!response.ok)throw new Error(data.erreur||'Ouverture refusée.');
   session.current=data.session;
   if(tour.current!==generation){await arreter();return;}
   timer.current=setTimeout(()=>void arreter(),110000);
   const r=new Room({adaptiveStream:false,dynacast:false});room.current=r;
   const ecran=new Room({adaptiveStream:false,dynacast:false});spectateur.current=ecran;
   let readyResolve:()=>void=()=>{};const ready=new Promise<void>(resolve=>{readyResolve=resolve;});
   ecran.on(RoomEvent.TrackSubscribed,(track)=>{
    if(track.kind===Track.Kind.Video&&video.current){track.attach(video.current);void video.current.play().catch(()=>{});readyResolve();}
    if(track.kind===Track.Kind.Audio&&audio.current){track.attach(audio.current);void audio.current.play().catch(()=>setEtat('Clique sur la vidéo pour autoriser le son.'));}
   });
   r.registerRpcMethod('lk.playback_started',async d=>{if(d.callerIdentity!==data.destination)return 'reject';mesurer('lecture_signalee',performance.now()-envoye);noter('Lecture signalée par Runway : '+Math.round(performance.now()-envoye)+' ms après le premier envoi audio.');return 'ok';});
   r.registerRpcMethod('lk.playback_finished',async d=>{if(d.callerIdentity!==data.destination)return 'reject';mesurer('lecture_terminee',performance.now()-envoye);noter('Fin de lecture reçue.');setTimeout(()=>{if(tour.current===generation)void arreter();},1500);return 'ok';});
   await ecran.connect(data.url,data.spectateur);await ecran.startAudio();await r.connect(data.url,data.token);
   await Promise.race([ready,new Promise((_,reject)=>setTimeout(()=>reject(new Error('La vidéo de l’avatar n’est pas arrivée sous 45 secondes.')),45000))]);
   if(tour.current!==generation)return;
   noter('Connexion et préparation : '+Math.round(performance.now()-debut)+' ms.');
   mesurer('video_recue',performance.now()-debut);
   if(video.current?.requestVideoFrameCallback)video.current.requestVideoFrameCallback(()=>{premiereVideo=true;noter('Première image vidéo reçue (ne mesure pas le début des lèvres).');});
   const writer=await r.localParticipant.streamBytes({name:'BIA_'+crypto.randomUUID(),topic:'lk.audio_stream',destinationIdentities:[data.destination],attributes:{sample_rate:'16000',num_channels:'1'}});
   setEtat('La vraie voix enregistrée de Bia est envoyée au personnage.');envoye=performance.now();
   for(let i=0;i<pcm.length;i+=320){if(tour.current!==generation)break;const samples=pcm.subarray(i,i+320),bytes=new Uint8Array(samples.length*2),view=new DataView(bytes.buffer);for(let j=0;j<samples.length;j++)view.setInt16(j*2,Math.round(Math.max(-1,Math.min(1,samples[j]))*32767),true);await writer.write(bytes);}
   await writer.close();
   mesurer('audio_envoye',performance.now()-envoye);
   if(tour.current===generation){noter('Audio envoyé : '+(pcm.length/16000).toFixed(1)+' s, PCM16 mono 16 kHz.');noter('La synchronisation précise reste à observer sur la lecture.');if(!premiereVideo)noter('En attente de la première image décodée.');timer.current&&clearTimeout(timer.current);timer.current=setTimeout(()=>void arreter(),20000);}
  }catch(e){mesurer('erreur_client');const message=e instanceof Error?e.message:'Erreur inconnue';await arreter();setEtat(message);}
 }
 return <main style={{maxWidth:760,margin:'auto',padding:24,color:'#eee',background:'#111',minHeight:'100dvh',fontFamily:'system-ui'}}>
  <h1>Bia — essai de synchronisation</h1><p>Un extrait de 10 secondes de la voix de Bia anime le personnage Runway. Le micro reste fermé. La conversation habituelle est conservée.</p>
  <video ref={video} autoPlay playsInline muted onClick={()=>void spectateur.current?.startAudio()} style={{width:'100%',aspectRatio:'16/10',background:'#000',objectFit:'contain'}}/><audio ref={audio} autoPlay/>
  <p><label>Code maître <input type="password" value={code} onChange={e=>setCode(e.target.value)} disabled={actif} autoComplete="off"/></label></p>
  <button disabled={actif||!code.trim()} onClick={()=>void lancer()}>Tester avec la voix de Bia</button>{' '}<button disabled={!actif} onClick={()=>void arreter()}>Arrêter</button>
  <p role="status">{etat}</p><ul>{mesures.map((m,i)=><li key={i}>{m}</li>)}</ul><p>Une session consomme les crédits Runway pendant qu’elle est active. Arrêt automatique prévu ; plafond serveur de deux minutes.</p><a href="/">Retour à Bia</a>
 </main>;
}
