import type {MorceauVoix} from "./flux-khalam";
/** One HTTP response carries whole clips (not arbitrary PCM packets). The
 * reader drains immediately, keeping the next clip ready during playback. */
export function ouvrirRepliques(response:Response,annuler:()=>void,recu:()=>void=()=>{}){
 if(!response.ok||!response.body)throw Error("La voix continue est indisponible.");
 const reader=response.body.getReader(),decoder=new TextDecoder();
 const clips=new Map<number,MorceauVoix>(),attentes=new Map<number,{resolve:(m:MorceauVoix)=>void;reject:(e:Error)=>void}>();
 let erreur:Error|null=null,termine=false,prochain=0,total=0,empreinte="";
 const fail=(e:Error)=>{erreur=e;for(const p of attentes.values())p.reject(e);attentes.clear();};
 void (async()=>{
  let buffer="";
  const traiter=(line:string)=>{
   const event=JSON.parse(line);if(event.type==="erreur")throw Error(event.error||"La voix a été interrompue.");
   if(event.type==="fin"){if(!total||prochain!==total)throw Error("La voix n’a pas terminé la phrase.");termine=true;return;}
   if(termine||event.type!=="morceau"||event.partie!==prochain||!event.audio||!Number.isSafeInteger(event.parties)||event.parties<1||typeof event.empreinte!=="string")throw Error("Morceau vocal manquant ou désordonné.");
   if(prochain===0){total=event.parties;empreinte=event.empreinte;}
   if(event.parties!==total||event.empreinte!==empreinte||prochain>=total)throw Error("La préparation vocale a changé.");
   recu();const waiting=attentes.get(prochain);if(waiting){waiting.resolve(event);attentes.delete(prochain);}else clips.set(prochain,event);prochain++;
  };
  try{for(;;){const r=await reader.read();if(r.done)break;buffer+=decoder.decode(r.value,{stream:true});if(buffer.length>8_000_000)throw Error("Paquet vocal trop grand.");let n;while((n=buffer.indexOf("\n"))>=0){const line=buffer.slice(0,n);buffer=buffer.slice(n+1);if(line.trim())traiter(line);}}
   buffer+=decoder.decode();if(buffer.trim())traiter(buffer);if(!termine)throw Error("La voix a été interrompue avant la fin.");
  }catch(e){fail(e instanceof Error?e:Error("Flux vocal interrompu."));}
  finally{void reader.cancel().catch(()=>{});annuler();}
 })();
 return {morceau:(i:number):Promise<MorceauVoix>=>{
  if(erreur)return Promise.reject(erreur);const c=clips.get(i);if(c){clips.delete(i);return Promise.resolve(c);}
  if(termine)return Promise.reject(Error("Morceau vocal absent."));
  return new Promise((resolve,reject)=>attentes.set(i,{resolve,reject}));
 }};
}
