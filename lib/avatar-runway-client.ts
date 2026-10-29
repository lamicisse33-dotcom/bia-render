'use client';
import type {Room,ByteStreamWriter} from 'livekit-client';
import {pcmPourAvatar} from './avatar-runway-pcm';
export const RUNWAY_DIRECT='runway-direct';
const CLE='bia-habillage-20261027';
type Groupe={generation:number;duree:number;premiers:((date:number)=>void)[];fins:((ms:number)=>void)[];date:number;commence:boolean;ferme:boolean;writer:Promise<ByteStreamWriter>;file:Promise<void>;timer?:ReturnType<typeof setTimeout>;limite?:ReturnType<typeof setTimeout>};
type Etat={large:boolean;pret:boolean;connexion:boolean;message:string;video:MediaStream|null};
let etat:Etat={large:false,pret:false,connexion:false,message:'',video:null};
const abonnes=new Set<(e:Etat)=>void>();
const emettre=(patch:Partial<Etat>)=>{etat={...etat,...patch};for(const f of abonnes)f(etat);};
let producteur:Room|null=null,spectateur:Room|null=null,session='',code='',numero='',ouverture:Promise<void>|null=null,epoch=0,connexionEpoch=0;
let groupes:Groupe[]=[],groupe:Groupe|null=null,barriere:Promise<unknown>=Promise.resolve(),limiteSession:ReturnType<typeof setTimeout>|null=null;
let maintenir=false;
let reprise:ReturnType<typeof setTimeout>|null=null,tentatives=0;
function annulerReprise(){if(reprise)clearTimeout(reprise);reprise=null;}
function reprendreSiActif(){
 if(!maintenir||!avatarSelectionne()||reprise||tentatives>=5)return;
 const delai=Math.min(15000,1000*2**tentatives++);
 reprise=setTimeout(()=>{reprise=null;if(maintenir&&avatarSelectionne()){mesure('reconnexion');void preparerAvatarBia();}},delai);
}
let repos:ReturnType<typeof setTimeout>|null=null;
function fermerSiRepos(){if(repos)clearTimeout(repos);if(!maintenir)repos=setTimeout(()=>{if(!maintenir&&!avatarParle())void fermerAvatarBia();},15000);}
let piste:MediaStream|null=null,contexte:AudioContext|null=null,source:MediaStreamAudioSourceNode|null=null,gain:GainNode|null=null,analyse:AnalyserNode|null=null,raf=0,energie=0,muet=false;
export function suivreAvatarBia(f:(e:Etat)=>void){abonnes.add(f);f(etat);return()=>{abonnes.delete(f);};}
export function avatarSelectionne(){try{return localStorage.getItem(CLE)===RUNWAY_DIRECT;}catch{return false;}}
export function avatarPret(){return avatarSelectionne()&&etat.pret;}
export function avatarParle(){return avatarPret()&&groupes.some(g=>g.generation===epoch&&g.fins.length>0);}
export function energieAvatar(){return avatarPret()&&!muet?energie:0;}
export function maintenirAvatarBia(actif:boolean){maintenir=actif;if(actif){tentatives=0;void preparerAvatarBia();}else{annulerReprise();void fermerAvatarBia();}}
function entetes(){return {'Content-Type':'application/json','x-bia-code':code,'x-bia-numero':numero};}
function mesure(evenement:string,ms?:number){void fetch('/api/avatar-runway',{method:'POST',headers:entetes(),body:JSON.stringify({action:'mesure',evenement,ms}),keepalive:true}).catch(()=>{});}
function premier(g:Groupe){if(g.commence||g.generation!==epoch)return;g.commence=true;const date=Date.now();mesure('lecture_signalee',performance.now()-g.date);for(const f of g.premiers.splice(0))f(date);}
function finir(g:Groupe,interrompu=false){
 if(g.timer)clearTimeout(g.timer);if(g.limite)clearTimeout(g.limite);
 for(const f of g.fins.splice(0))f(interrompu?0:g.duree);g.premiers=[];
 groupes=groupes.filter(v=>v!==g);if(groupe===g)groupe=null;
 if(!groupes.some(v=>v.fins.length))fermerSiRepos();
}
function brancherPiste(){
 if(!contexte||!piste||source)return;
 source=contexte.createMediaStreamSource(piste);gain=contexte.createGain();gain.gain.value=muet?0:1;analyse=contexte.createAnalyser();analyse.fftSize=256;
 source.connect(analyse);analyse.connect(gain);gain.connect(contexte.destination);
 const valeurs=new Float32Array(256);
 const lire=()=>{
  if(!analyse)return;analyse.getFloatTimeDomainData(valeurs);let somme=0;for(const v of valeurs)somme+=v*v;energie=Math.sqrt(somme/valeurs.length);
  if(!muet&&energie>.002){const g=groupes.find(v=>v.generation===epoch&&!v.commence);if(g)premier(g);}
  raf=requestAnimationFrame(lire);
 };raf=requestAnimationFrame(lire);
}
/** Utilise le contexte déjà réveillé par le micro de Bia : pas de seconde
 * voix HTML bloquée par l'autoplay Safari, ni de copie audio locale audible. */
export function contexteAvatar(ctx:AudioContext){
 if(contexte!==ctx){source?.disconnect();analyse?.disconnect();gain?.disconnect();cancelAnimationFrame(raf);source=null;analyse=null;gain=null;contexte=ctx;}
 brancherPiste();
}
export async function preparerAvatarBia(ctx?:AudioContext){
 if(ctx)contexteAvatar(ctx);
 if(!avatarSelectionne()||etat.pret)return;
 if(ouverture)return ouverture;
 const generation=connexionEpoch;
 ouverture=(async()=>{
  code=localStorage.getItem('bia-code')||'';numero=localStorage.getItem('bia-numero')||'';
  if(!code)return;
  emettre({connexion:true,message:'Connexion du personnage…'});
  const {Room,RoomEvent,Track}=await import('livekit-client');
  const response=await fetch('/api/avatar-runway',{method:'POST',headers:entetes(),body:JSON.stringify({action:'ouvrir',conversation:true}),signal:AbortSignal.timeout(30000)});
  const data=await response.json();if(!response.ok)throw Error(data.erreur||'Avatar indisponible');
  session=data.session;
  if(connexionEpoch!==generation){await fermerAvatarBia();return;}
  const entree=new Room({adaptiveStream:false,dynacast:false}),ecran=new Room({adaptiveStream:false,dynacast:false});producteur=entree;spectateur=ecran;
  let videoPrete=false,audioPret=false,resoudre:()=>void=()=>{};const pret=new Promise<void>(resolve=>{resoudre=resolve;});
  const verifier=()=>{if(videoPrete&&audioPret)resoudre();};
  ecran.on(RoomEvent.TrackSubscribed,track=>{
   if(connexionEpoch!==generation)return;
   const stream=new MediaStream([track.mediaStreamTrack]);
   if(track.kind===Track.Kind.Video){videoPrete=true;emettre({video:stream});}
   else if(track.kind===Track.Kind.Audio){audioPret=true;piste=stream;brancherPiste();}
   verifier();
  });
  entree.registerRpcMethod('lk.playback_started',async d=>{if(d.callerIdentity!==data.destination)return 'reject';const g=groupes[0];if(g)premier(g);return 'ok';});
  entree.registerRpcMethod('lk.playback_finished',async d=>{
   if(d.callerIdentity!==data.destination)return 'reject';const g=groupes[0];
   if(g){let coupe=false;try{coupe=JSON.parse(d.payload).interrupted===true;}catch{}finir(g,coupe||g.generation!==epoch);mesure('lecture_terminee',performance.now()-g.date);}return 'ok';
  });
  const deconnexion=()=>{if(etat.pret&&connexionEpoch===generation){mesure('session_deconnectee');emettre({pret:false,message:'Animation déconnectée. La voix habituelle reste disponible.'});void fermerAvatarBia(true);}};
  ecran.on(RoomEvent.Disconnected,deconnexion);entree.on(RoomEvent.Disconnected,deconnexion);
  await ecran.connect(data.url,data.spectateur);await entree.connect(data.url,data.token);
  let attente:ReturnType<typeof setTimeout>|undefined;
  try{await Promise.race([pret,new Promise((_,reject)=>{attente=setTimeout(()=>reject(Error('Connexion du personnage trop longue')),45000);})]);}finally{if(attente)clearTimeout(attente);}
  if(connexionEpoch!==generation){await fermerAvatarBia();return;}
  annulerReprise();tentatives=0;
  emettre({pret:true,large:data.cadrage==='pied'||data.cadrage==='hanches',connexion:false,message:''});mesure('video_recue');
  fermerSiRepos();
  const deadline=performance.now()+(data.duree_maximale_s-3)*1000;
  const renouveler=async()=>{
   if(avatarParle()&&performance.now()<deadline){limiteSession=setTimeout(()=>void renouveler(),2000);return;}
   await fermerAvatarBia(true);
  };
  limiteSession=setTimeout(()=>void renouveler(),Math.max(20000,(data.duree_maximale_s-30)*1000));
 })().catch(async()=>{await fermerAvatarBia(true);emettre({message:'Le personnage animé est indisponible. Bia conserve sa voix habituelle.'});}).finally(()=>{ouverture=null;});
 return ouverture;
}
export function interrompreAvatarBia(){
 const avaitDuSon=groupes.some(g=>g.fins.length>0||!g.ferme);
 epoch++;muet=true;energie=0;if(gain)gain.gain.value=0;
 // Les notifications de l'ancien flux restent dans leur ordre. Elles ne
 // doivent jamais terminer une nouvelle réponse après une interruption.
 for(const g of groupes){if(g.timer)clearTimeout(g.timer);if(g.limite)clearTimeout(g.limite);for(const f of g.fins.splice(0))f(0);g.premiers=[];g.ferme=true;void g.writer.then(w=>w.close()).catch(()=>{});}
 groupe=null;
 const r=producteur;
 if(r&&avaitDuSon)barriere=barriere.catch(()=>{}).then(()=>r.localParticipant.performRpc({destinationIdentity:'runway-avatar-agent',method:'lk.clear_buffer',payload:'',responseTimeout:3})).catch(()=>{if(producteur===r)void fermerAvatarBia(true);});
}
export async function fermerAvatarBia(reprendre=false){
 annulerReprise();
 epoch++;connexionEpoch++;const fermetureGeneration=connexionEpoch;emettre({pret:false,connexion:false,video:null});muet=true;if(gain)gain.gain.value=0;
 if(limiteSession)clearTimeout(limiteSession);limiteSession=null;
 if(repos)clearTimeout(repos);repos=null;
 for(const g of [...groupes])finir(g,true);groupe=null;
 if(repos)clearTimeout(repos);repos=null;
 const p=producteur,s=spectateur,id=session;producteur=null;spectateur=null;session='';
 source?.disconnect();gain?.disconnect();analyse?.disconnect();source=null;gain=null;analyse=null;piste=null;cancelAnimationFrame(raf);energie=0;barriere=Promise.resolve();
 const fermetureServeur=id?fetch('/api/avatar-runway',{method:'POST',headers:entetes(),body:JSON.stringify({action:'fermer',session:id}),keepalive:true,signal:AbortSignal.timeout(10000)}).catch(()=>{}):Promise.resolve();
 await p?.disconnect();await s?.disconnect();
 await fermetureServeur;
 if(reprendre&&fermetureGeneration===connexionEpoch)reprendreSiActif();
}
/** La promesse se termine sur la notification de lecture distante, et non
 * sur l'envoi des octets. L'appelant peut donc garder son micro et ses tours. */
export function parlerAvecAvatar(buffer:AudioBuffer,premierSon?:(date:number)=>void):Promise<number>{
 if(!avatarPret()||!producteur)return Promise.resolve(0);
 if(repos)clearTimeout(repos);repos=null;
 const generation=epoch;let g=groupe;
 if(!g||g.ferme||g.generation!==generation){
  const r=producteur;
  g={generation,duree:0,premiers:[],fins:[],date:performance.now(),commence:false,ferme:false,writer:barriere.then(()=>r.localParticipant.streamBytes({name:'BIA_'+crypto.randomUUID(),topic:'lk.audio_stream',destinationIdentities:['runway-avatar-agent'],attributes:{sample_rate:'16000',num_channels:'1'}})),file:Promise.resolve()};
  groupe=g;groupes.push(g);
 }
 const courant=g;courant.duree+=buffer.duration*1000;
 if(premierSon){if(courant.commence)premierSon(Date.now());else courant.premiers.push(premierSon);}
 if(courant.timer)clearTimeout(courant.timer);if(courant.limite)clearTimeout(courant.limite);
 const octets=pcmPourAvatar(Array.from({length:buffer.numberOfChannels},(_,i)=>buffer.getChannelData(i)),buffer.sampleRate);
 const resultat=new Promise<number>(resolve=>courant.fins.push(resolve));
 courant.file=courant.file.then(async()=>{
  if(generation!==epoch)return;
  const writer=await courant.writer;if(generation!==epoch)return;
  muet=false;if(gain)gain.gain.value=1;
  for(let i=0;i<octets.length;i+=6400){if(generation!==epoch)return;await writer.write(octets.slice(i,i+6400));}
 }).catch(()=>{if(generation===epoch){mesure('erreur_client');void fermerAvatarBia(true);}});
 courant.timer=setTimeout(()=>{
  courant.ferme=true;if(groupe===courant)groupe=null;
  void courant.file.then(async()=>{if(generation===epoch)await (await courant.writer).close();}).catch(()=>{if(generation===epoch)void fermerAvatarBia(true);});
 },180);
 courant.limite=setTimeout(()=>{if(courant.fins.length){mesure('attente_fin_depassee');mesure('erreur_client');void fermerAvatarBia(true);}},courant.duree+20000);
 return resultat;
}
