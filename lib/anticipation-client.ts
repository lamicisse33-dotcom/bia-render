import {creerEcouteProgressive} from './ecoute-progressive';
import {creerProducteurBriques} from './briques-client';
import {entetesRapidite,profilRapiditeNavigateur,segmentRapiditeMs} from './rapidite-core';
export async function brancherAnticipation(o:{ctx:AudioContext;flux:MediaStream;code:string;tour:string;history:unknown[];resume:string;voice:'female'|'male';persona:string;langue:()=>string;parle:()=>boolean;actuel:()=>boolean}){
 let node:AudioWorkletNode|null=null,entree:MediaStreamAudioSourceNode|null=null,muet:GainNode|null=null,fin=false;
 const briques=creerProducteurBriques(o);
 const abort=new AbortController();let accuseFin:(()=>void)|undefined;
 const headers={'x-bia-code':o.code,...entetesRapidite()};
 const progresser=(texte:string)=>{if(!fin&&o.actuel())briques.progresser(texte);};
 const pipeline=creerEcouteProgressive(f=>fetch('/api/anticipation/segment',{method:'POST',headers,body:f,signal:AbortSignal.any([abort.signal,AbortSignal.timeout(25000)])}),o.langue,o.actuel,progresser,segmentRapiditeMs(profilRapiditeNavigateur()));
 function detacher(){node?.disconnect();entree?.disconnect();muet?.disconnect();if(node)node.port.onmessage=null;}
 try{let timer:ReturnType<typeof setTimeout>|undefined;try{await Promise.race([o.ctx.audioWorklet.addModule('/anticipation/capture.js'),new Promise((_,reject)=>{timer=setTimeout(()=>reject(Error('Capture indisponible')),1500);})]);}finally{if(timer)clearTimeout(timer);}if(!o.actuel())return null;
 node=new AudioWorkletNode(o.ctx,'bia-anticipation');node.port.onmessage=({data:d})=>{if(d.pcm)pipeline.pousser(d.pcm,o.parle());if(d.fin)accuseFin?.();};entree=o.ctx.createMediaStreamSource(o.flux);muet=o.ctx.createGain();muet.gain.value=0;entree.connect(node);node.connect(muet);muet.connect(o.ctx.destination);
 }catch{briques.annuler();detacher();return null;}
 return {
 livrerBriques:briques.livree,
 etatBriques:briques.etat,
  commencerBriques:(options:Parameters<typeof briques.commencer>[0])=>briques.commencer(options),
 terminerBriques:briques.terminer,
 async fermerCapture(){if(fin)return;fin=true;briques.arreterEcoute();await new Promise<void>((resolve,reject)=>{const timer=setTimeout(()=>reject(Error('Capture non confirmée')),800);accuseFin=()=>{clearTimeout(timer);resolve();};node?.port.postMessage('fin');}).finally(detacher);},
 async resultat(){return pipeline.finir();},
 async annuler(){fin=true;abort.abort();briques.annuler();detacher();await pipeline.abandonner();},
 };
}
