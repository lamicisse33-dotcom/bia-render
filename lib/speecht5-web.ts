import type {MorceauVoix} from './flux-khalam';
export function speecht5WebActif(){try{return typeof window!=='undefined'&&localStorage.getItem('bia-choix-voix-v1')==='speecht5-web';}catch{return false;}}
export function vitesseSpeechT5(){return 1;}
export function mesurerSpeechT5(etape:string,ms=0){void fetch('/api/speecht5-web/mesure',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({etape,ms}),keepalive:true}).catch(()=>{});}
let worker:Worker|null=null,id=0;
type Result={id:number;ready?:boolean;error?:string;progress?:string;wav?:ArrayBuffer;empty?:boolean;parts:number;part:number;ms:number;speed:number};
const pending=new Map<number,{resolve:(r:Result)=>void;reject:(e:Error)=>void;cleanup:()=>void}>();
let dernierEtat='SpeechT5 attend sa préparation.';
export const etatSpeechT5=()=>dernierEtat;
function statut(message:string){dernierEtat=message;window.dispatchEvent(new CustomEvent('bia-piper-web',{detail:message}));}
export function annulerSpeechT5(){
 worker?.terminate();worker=null;
 for(const p of pending.values()){p.cleanup();p.reject(new DOMException('Parole interrompue','AbortError'));}pending.clear();
}
function moteur(){
 if(worker)return worker;
 if(typeof Worker==='undefined'||typeof WebAssembly==='undefined')throw Error('Ce navigateur ne peut pas utiliser SpeechT5.');
 worker=new Worker('/speecht5/worker.js?v=essai-1');
 worker.onmessage=({data:d}:{data:Result})=>{
  if(d.progress){statut(d.progress);return;}
  const p=pending.get(d.id);if(!p)return;pending.delete(d.id);p.cleanup();
  if(d.error){statut(d.error);mesurerSpeechT5('erreur');p.reject(Error(d.error));}
  else{if(d.ready)mesurerSpeechT5('pret');else if(d.wav)mesurerSpeechT5('generation',d.ms);p.resolve(d);}
 };
 worker.onerror=()=>{statut('SpeechT5 n’a pas pu démarrer dans ce navigateur.');annulerSpeechT5();};
 return worker;
}
function demander(data:object,signal?:AbortSignal){
 return new Promise<Result>((resolve,reject)=>{
  if(signal?.aborted){reject(signal.reason);return;}
  const n=++id;
  // Cancelling a turn must also cancel work already queued in ONNX's worker.
  const abort=()=>annulerSpeechT5();
  const timer=setTimeout(()=>{statut('La préparation prend trop de temps. Réessaie.');annulerSpeechT5();},data && (data as {kind?:string}).kind==='prepare'?600000:45000);
  const cleanup=()=>{clearTimeout(timer);signal?.removeEventListener('abort',abort);};
  try{const w=moteur();pending.set(n,{resolve,reject,cleanup});signal?.addEventListener('abort',abort,{once:true});w.postMessage({...data,id:n});}
  catch(e){cleanup();pending.delete(n);reject(e);}
 });
}
export async function preparerSpeechT5(code:string){await demander({kind:'prepare',code});}
export async function lireSpeechT5(texte:string,partie:number,code:string,signal?:AbortSignal):Promise<MorceauVoix>{
 const d=await demander({kind:'speak',text:texte,part:partie,code,speed:1},signal);
 let audio:string|null=null;
 if(d.wav){const bytes=new Uint8Array(d.wav);let str='';for(let at=0;at<bytes.length;at+=8192)str+=String.fromCharCode(...bytes.subarray(at,at+8192));audio=btoa(str);}
 return {parties:d.parts,partie:d.part,audio,type_mime:'audio/wav',fabrication_ms:d.ms,speed:d.speed};
}
