import type {MorceauVoix} from './flux-khalam';
/* Un téléphone déjà ouvert a pu garder « piper » : c'était le moteur
   INSTALLÉ, remplacé par Khalam Gratuit le 25 octobre. choixVoixBia() le
   convertit à sa première lecture, mais pas forcément avant que la parole
   ne demande son chemin : sans cette reconnaissance immédiate, le tout
   premier mot après la mise à jour partait sur l'autre moteur. */
export function piperWebActif(){try{if(typeof window==='undefined')return false;const choix=localStorage.getItem('bia-choix-voix-v1');return choix==='piper-web'||choix==='piper';}catch{return false;}}
export function vitessePiperWeb(){try{const v=Number(localStorage.getItem('bia-piper-web-speed'));return v>=.7&&v<=1.2?v:1;}catch{return 1;}}
export function mesurerPiperWeb(etape:string,ms=0){void fetch('/api/mesure',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({type:'piper_web',etape,ms}),keepalive:true}).catch(()=>{});}
export type VoixFemininePiper = 0 | 1;
export function voixFemininePiper():VoixFemininePiper {try{return localStorage.getItem('bia-piper-web-speaker')==='0'?0:1;}catch{return 1;}}
export function choisirVoixFemininePiper(speaker:VoixFemininePiper){
 if(speaker!==0&&speaker!==1)return false;
 try{localStorage.setItem('bia-piper-web-speaker',String(speaker));return true;}catch{return false;}
}
let worker:Worker|null=null,id=0;
type Result={id:number;ready?:boolean;error?:string;progress?:string;wav?:ArrayBuffer;empty?:boolean;parts:number;part:number;ms:number;speed:number};
const pending=new Map<number,{resolve:(r:Result)=>void;reject:(e:Error)=>void;cleanup:()=>void}>();
let dernierEtat='Khalam Gratuit attend sa préparation.';
export const etatPiperWeb=()=>dernierEtat;
function statut(message:string){dernierEtat=message;window.dispatchEvent(new CustomEvent('bia-piper-web',{detail:message}));}
export function annulerPiperWeb(){
 worker?.terminate();worker=null;
 for(const p of pending.values()){p.cleanup();p.reject(new DOMException('Parole interrompue','AbortError'));}pending.clear();
}
function moteur(){
 if(worker)return worker;
 if(typeof Worker==='undefined'||typeof WebAssembly==='undefined')throw Error('Ce navigateur ne peut pas utiliser Khalam Gratuit.');
 worker=new Worker('/piper/worker.js?v=voix-feminines-1');
 worker.onmessage=({data:d}:{data:Result})=>{
  if(d.progress){statut(d.progress);return;}
  const p=pending.get(d.id);if(!p)return;pending.delete(d.id);p.cleanup();
  if(d.error){statut(d.error);mesurerPiperWeb('erreur');p.reject(Error(d.error));}
  else{if(d.ready)mesurerPiperWeb('pret');else if(d.wav)mesurerPiperWeb('generation',d.ms);p.resolve(d);}
 };
 worker.onerror=()=>{statut('Khalam Gratuit n’a pas pu démarrer dans ce navigateur.');annulerPiperWeb();};
 return worker;
}
function demander(data:object,signal?:AbortSignal){
 return new Promise<Result>((resolve,reject)=>{
  if(signal?.aborted){reject(signal.reason);return;}
  const n=++id;
  // Cancelling a turn must also cancel work already queued in ONNX's worker.
  const abort=()=>annulerPiperWeb();
  const timer=setTimeout(()=>{statut('La préparation prend trop de temps. Réessaie.');annulerPiperWeb();},120000);
  const cleanup=()=>{clearTimeout(timer);signal?.removeEventListener('abort',abort);};
  try{const w=moteur();pending.set(n,{resolve,reject,cleanup});signal?.addEventListener('abort',abort,{once:true});w.postMessage({...data,id:n});}
  catch(e){cleanup();pending.delete(n);reject(e);}
 });
}
export async function preparerPiperWeb(code:string){await demander({kind:'prepare',code});}
export async function lirePiperWeb(texte:string,partie:number,code:string,signal?:AbortSignal,speaker:VoixFemininePiper=voixFemininePiper()):Promise<MorceauVoix>{
 const d=await demander({kind:'speak',text:texte,part:partie,code,speaker,speed:vitessePiperWeb()},signal);
 let audio:string|null=null;
 if(d.wav){const bytes=new Uint8Array(d.wav);let str='';for(let at=0;at<bytes.length;at+=8192)str+=String.fromCharCode(...bytes.subarray(at,at+8192));audio=btoa(str);}
 return {parties:d.parts,partie:d.part,audio,type_mime:'audio/wav',fabrication_ms:d.ms,speed:d.speed};
}
/** Explicit voice requests only; never intercept global fetch or a native bridge. */
export async function fetchVoixBia(url:string,init:RequestInit):Promise<Response>{
 if(url!=='/api/piper-web/synthese')return fetch(url,init);
 const d=JSON.parse(String(init.body));const headers=new Headers(init.headers);
 const audio=await lirePiperWeb(d.texte,d.partie??0,headers.get('x-bia-code')||'',init.signal??undefined);
 return Response.json(audio);
}
