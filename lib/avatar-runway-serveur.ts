import {AccessToken, RoomServiceClient} from 'livekit-server-sdk';
import {randomUUID} from 'node:crypto';

export const AVATAR_BIA='e15f387a-20ae-4dd4-986d-601fb748ec07';
export const AVATAR_IDENTITE='runway-avatar-agent';
const racine='https://api.dev.runwayml.com/v1';
const sessions=new Map<string,{room:string;expiration:number;proprietaire:string}>();
export function configurationAvatar(){return Object.fromEntries(['RUNWAYML_API_SECRET','LIVEKIT_URL','LIVEKIT_API_KEY','LIVEKIT_API_SECRET'].map(n=>[n,Boolean(process.env[n]?.trim())]));}
function conf(){
 if(Object.values(configurationAvatar()).some(v=>!v))throw new Error('configuration_incomplete');
 return {url:process.env.LIVEKIT_URL!.trim(),key:process.env.LIVEKIT_API_KEY!.trim(),secret:process.env.LIVEKIT_API_SECRET!.trim()};
}
function salles(){const c=conf();return new RoomServiceClient(c.url.replace(/^wss:/,'https:').replace(/^ws:/,'http:'),c.key,c.secret);}
async function runway(path:string,method='GET',body?:unknown){
 const r=await fetch(racine+path,{method,headers:{Authorization:`Bearer ${process.env.RUNWAYML_API_SECRET!.trim()}`,'X-Runway-Version':'2024-11-06','Content-Type':'application/json'},body:body?JSON.stringify(body):undefined,signal:AbortSignal.timeout(20000),cache:'no-store'});
 if(!r.ok)throw new Error(`runway_http_${r.status}`);
 return r;
}
export async function verifierAccesAvatar(){
 const [a,b]=await Promise.allSettled([runway('/organization'),salles().listRooms(['bia-diagnostic-sans-session'])]);
 return {runway:a.status==='fulfilled'?'accessible':String(a.reason?.message||'indisponible'),livekit:b.status==='fulfilled'?'accessible':'acces_refuse_ou_indisponible'};
}
// Restauration demandée par Lamine : conserver le personnage parlant validé.
// Les variantes de cadrage restent dans Runway mais ne sont plus sélectionnées.
export const cadrageAvatar=()=>({statut:'pret',id:AVATAR_BIA,erreur:''});
export function preparerCadrageAvatar(){return Promise.resolve();}
export async function ouvrirAvatar(proprietaire='essai',conversation=false){
 for(const [id,s] of sessions)if(s.expiration<Date.now())sessions.delete(id);
 if([...sessions.values()].some(s=>s.proprietaire===proprietaire)||sessions.size>=4)throw new Error('essai_deja_en_cours');
 const duree=conversation?600:120;
 const c=conf(),room='bia-avatar-'+randomUUID(),identity='bia-audio-'+randomUUID();
 await salles().createRoom({name:room,emptyTimeout:20,maxParticipants:3});
 try{
  const client=new AccessToken(c.key,c.secret,{identity,ttl:duree+60});
  client.kind='agent';
  client.addGrant({roomJoin:true,room,canPublish:true,canSubscribe:true,canPublishData:true});
  const spectateur=new AccessToken(c.key,c.secret,{identity:'bia-ecran-'+randomUUID(),ttl:duree+60});
  spectateur.addGrant({roomJoin:true,room,canPublish:false,canSubscribe:true,canPublishData:false});
  const avatar=new AccessToken(c.key,c.secret,{identity:AVATAR_IDENTITE,ttl:duree+60});
  avatar.kind='agent';avatar.attributes={'lk.publish_on_behalf':identity};
  avatar.addGrant({roomJoin:true,room});
  const avatarId=AVATAR_BIA;
  const r=await runway('/realtime_sessions','POST',{model:'gwm1_avatars',avatar:{type:'custom',avatarId},maxDuration:duree,livekit:{url:c.url,token:await avatar.toJwt(),roomName:room,agentIdentity:identity}});
  const data=await r.json();if(typeof data.id!=='string')throw new Error('session_sans_identifiant');
  sessions.set(data.id,{room,expiration:Date.now()+(duree+5)*1000,proprietaire});
  return {session:data.id,url:c.url,token:await client.toJwt(),spectateur:await spectateur.toJwt(),destination:AVATAR_IDENTITE,duree_maximale_s:duree,cadrage:avatarId===AVATAR_BIA?'buste':'hanches'};
 }catch(e){await salles().deleteRoom(room).catch(()=>{});throw e;}
}
export async function fermerAvatar(id:string,proprietaire='essai'){
 const s=sessions.get(id);if(!s)return;
 if(s.proprietaire!==proprietaire)throw Error('session_refusee');
 // Garder l'identifiant si l'annulation échoue pour permettre une nouvelle tentative.
 await runway('/realtime_sessions/'+encodeURIComponent(id),'DELETE');
 sessions.delete(id);await salles().deleteRoom(s.room).catch(()=>{});
}
