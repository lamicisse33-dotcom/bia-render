import {wavLong} from './ecoute-longue';

/** A thinking-phase capture: each PCM sample is recognized at most once.
 * The complete WebM watcher remains the fallback if any segment fails. */
export function creerRepriseProgressive(envoyer:(f:FormData)=>Promise<Response>,langue:()=>string,actuel:()=>boolean){
 let buffer=new Float32Array(0),chaine=Promise.resolve(),erreur:unknown=null,fermee=false;
 let commence=false,voix=false,silence=0,segments=0,echantillons=0;
 const textes:string[]=[];
 function envoyerBuffer(fin=buffer.length){
  if(!buffer.length||!voix)return;
  const pcm=buffer.slice(0,fin);buffer=buffer.slice(fin);voix=buffer.length>0;silence=0;
  segments++;echantillons+=pcm.length;
  chaine=chaine.then(async()=>{
   if(erreur)return;if(fermee||!actuel())throw Error('Reprise annulée');
   const f=new FormData();f.set('audio',wavLong({sampleRate:16000,length:pcm.length,numberOfChannels:1,getChannelData:()=>pcm},0,pcm.length),'reprise.wav');f.set('indice_langue',langue());
   const r=await envoyer(f),d=await r.json();
   if(fermee||!actuel())throw Error('Reprise annulée');
   if(!r.ok||d.panne||d.transcription_rejetee||typeof d.texte!=='string')throw Error('Reprise incomplète');
   textes.push(d.texte.trim());
  }).catch(e=>{erreur=e;});
 }
 return {
  pousser(pcm:Float32Array,parle:boolean){
   if(fermee||erreur)return;
   const next=new Float32Array(buffer.length+pcm.length);next.set(buffer);next.set(pcm,buffer.length);buffer=next;
   if(!commence&&!parle){buffer=buffer.slice(-16000);return;}
   if(parle){commence=true;voix=true;silence=0;}else silence+=pcm.length;
   if(echantillons+buffer.length>16000*125){erreur=Error('Reprise trop longue');return;}
   if(voix&&silence>=8000&&buffer.length>=16000*1.25)envoyerBuffer();
   else if(voix&&buffer.length>=16000*4){
    let fin=16000*3.75,best=Infinity;
    for(let i=16000*3;i<16000*3.75;i+=320){let energie=0;for(let j=i;j<i+320;j++)energie+=buffer[j]*buffer[j];if(energie<best){best=energie;fin=i+160;}}
    envoyerBuffer(fin);
   }
   // Bound silent tails; they are not a new utterance and need no ASR.
   if(!voix&&buffer.length>16000)buffer=buffer.slice(-16000);
  },
  async lire(){
   if(fermee||!actuel())throw Error('Reprise annulée');
   envoyerBuffer();const attente=chaine;await attente;
   if(erreur)throw erreur;if(fermee||!actuel())throw Error('Reprise annulée');
   return segments?textes.filter(Boolean).join(' '):null;
  },
  etat:()=>({segments,echantillons}),
  annuler(){fermee=true;buffer=new Float32Array(0);},
 };
}

export async function brancherReprise(o:{ctx:AudioContext;flux:MediaStream;code:string;langue:()=>string;parle:()=>boolean;dejaParle:()=>boolean;actuel:()=>boolean}){
 let node:AudioWorkletNode|null=null,entree:MediaStreamAudioSourceNode|null=null,muet:GainNode|null=null,fermee=false;
 const abort=new AbortController();let accuse:(()=>void)|undefined;
 const pipeline=creerRepriseProgressive(f=>fetch('/api/anticipation/segment',{method:'POST',headers:{'x-bia-code':o.code},body:f,signal:AbortSignal.any([abort.signal,AbortSignal.timeout(6000)])}),o.langue,()=>!fermee&&o.actuel());
 const annuler=()=>{fermee=true;abort.abort();pipeline.annuler();node?.disconnect();entree?.disconnect();muet?.disconnect();if(node)node.port.onmessage=null;accuse?.();};
 try{
  let timer:ReturnType<typeof setTimeout>|undefined;
  try{await Promise.race([o.ctx.audioWorklet.addModule('/anticipation/reprise.js'),new Promise((_,reject)=>{timer=setTimeout(()=>reject(Error('Capture indisponible')),1500);})]);}finally{clearTimeout(timer);}
  // Never claim full coverage if the person started before the new node existed.
  if(!o.actuel()||o.dejaParle()){annuler();return null;}
  node=new AudioWorkletNode(o.ctx,'bia-reprise');
  node.port.onmessage=({data:d})=>{if(d.pcm)pipeline.pousser(d.pcm,o.parle());if(d.apercu)accuse?.();};
  entree=o.ctx.createMediaStreamSource(o.flux);muet=o.ctx.createGain();muet.gain.value=0;entree.connect(node);node.connect(muet);muet.connect(o.ctx.destination);
  return {
   async lire(){
    if(fermee||!o.actuel())throw Error('Reprise annulée');
    await new Promise<void>((resolve,reject)=>{const timer=setTimeout(()=>{accuse=undefined;reject(Error('Capture non confirmée'));},800);accuse=()=>{clearTimeout(timer);accuse=undefined;resolve();};node!.port.postMessage('apercu');});
    return pipeline.lire();
   },
   etat:pipeline.etat,annuler,
  };
 }catch{annuler();return null;}
}
