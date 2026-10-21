// Replay alone uses the platform media output. Conversation streaming is unchanged.
export function creerRelectureMedia(audio:HTMLAudioElement,signal:AbortSignal,silence:string){
 audio.preload='auto';audio.muted=false;audio.volume=1;audio.setAttribute('playsinline','');
 audio.src=silence;
 // This call must execute inside the original click, before network awaits.
 const amorce=audio.play();
 let minuterie:ReturnType<typeof setTimeout>;
 const pret=Promise.race([amorce,new Promise<void>((_,rej)=>{minuterie=setTimeout(()=>rej(Error('Appuie de nouveau sur Réécouter pour activer le son.')),2000);})]).finally(()=>clearTimeout(minuterie));
 void pret.catch(()=>{});
 let nettoyerLecture:(()=>void)|undefined;
 const arreter=()=>{audio.pause();nettoyerLecture?.();audio.removeAttribute('src');audio.load();};
 signal.addEventListener('abort',arreter,{once:true});
 return {
  async jouer(bytes:ArrayBuffer,vitesse:number,commence:()=>void){
   await pret;if(signal.aborted)throw Error('Relecture annulée');
   audio.pause();
   const debut=new Uint8Array(bytes,0,Math.min(4,bytes.byteLength));
   const type=String.fromCharCode(...debut)==='RIFF'?'audio/wav':'audio/mpeg';
   const url=URL.createObjectURL(new Blob([bytes],{type}));audio.src=url;audio.playbackRate=vitesse;audio.preservesPitch=true;
   try{await new Promise<void>((resolve,reject)=>{
    let termine=false;
    const finir=(erreur?:Error)=>{if(termine)return;termine=true;clearTimeout(timer);audio.removeEventListener('playing',playing);audio.removeEventListener('ended',ended);audio.removeEventListener('error',error);nettoyerLecture=undefined;erreur?reject(erreur):resolve();};
    const playing=()=>{if(!signal.aborted)commence();},ended=()=>finir(),error=()=>finir(Error('Le téléphone n’a pas pu lire cet audio. Réessaie.'));
    const timer=setTimeout(()=>finir(Error('La lecture audio est restée bloquée. Réessaie.')),120000);
    nettoyerLecture=()=>finir(Error('Relecture annulée'));
    audio.addEventListener('playing',playing);audio.addEventListener('ended',ended);audio.addEventListener('error',error);
    void audio.play().catch(e=>finir(e instanceof Error?e:Error('Lecture audio refusée')));
   });}finally{URL.revokeObjectURL(url);}
  },
  fermer(){signal.removeEventListener('abort',arreter);arreter();},
 };
}
export async function relireMorceaux(o:{signal:AbortSignal;demander:(partie:number,empreinte?:string)=>Promise<{audio?:string;partie?:number;parties:number;empreinte?:string;speed?:number}>;jouer:(b64:string,speed?:number)=>Promise<void>}){
 const premier=await o.demander(0);if(o.signal.aborted)throw Error('Relecture annulée');
 const total=premier.parties;if(!Number.isInteger(total)||total<1||total>200)throw Error('Lecture incomplète');
 let enVol=Promise.resolve(premier);
 for(let i=0;i<total;i++){
  const d=await enVol;if(o.signal.aborted)throw Error('Relecture annulée');
  if(!d.audio||d.partie!==undefined&&d.partie!==i||d.parties!==total||premier.empreinte&&d.empreinte!==premier.empreinte)throw Error('Le passage audio ne correspond pas au texte à relire');
  if(i+1<total){enVol=o.demander(i+1,premier.empreinte);void enVol.catch(()=>{});}
  await o.jouer(d.audio,d.speed);
 }
}
