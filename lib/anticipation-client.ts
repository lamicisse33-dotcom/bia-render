import {creerEcouteProgressive} from './ecoute-progressive';
import {creerProducteurBriques} from './briques-client';
import {entetesRapidite,profilRapiditeNavigateur,segmentRapiditeMs} from './rapidite-core';
export async function brancherAnticipation(o:{ctx:AudioContext;flux:MediaStream;code:string;tour:string;history:unknown[];resume:string;voice:'female'|'male';persona:string;langue:()=>string;parle:()=>boolean;actuel:()=>boolean;surTranscriptionFinale?:boolean;seuilSignes?:number;premierSegmentMs?:number;attenteEnvoiMs?:number;segmentMs?:number}){
 let node:AudioWorkletNode|null=null,entree:MediaStreamAudioSourceNode|null=null,muet:GainNode|null=null,fin=false;
 const briques=creerProducteurBriques({...o,segments:()=>pipeline.segmentsCommences,seuilSignes:o.seuilSignes,
  /* Une transcription en vol vaut une préparation en cours : elle arrivera
     dans la milliseconde. Savoir suffit — il n'y a rien à attendre. */
  envoiEnVol:()=>pipeline.envoisEnVol()>0});
 const abort=new AbortController();let accuseFin:(()=>void)|undefined;
 const headers={'x-bia-code':o.code,...entetesRapidite()};
 /* ── FERMER LE MICRO N'EST PAS FINIR LE TOUR ─────────────────────────────
    `fin` dit que la capture est close, pas que la réponse est partie. Tant
    que le tour est le sien, une transcription qui arrive après la fermeture
    sert encore : c'est la fenêtre de deux secondes et demie que ses
    compteurs montraient vide (42 segments réussis, 0 préparation). */
 const progresser=(texte:string)=>{if(o.actuel())briques.progresser(texte);};
 const pipeline=creerEcouteProgressive(f=>fetch('/api/anticipation/segment',{method:'POST',headers,body:f,signal:AbortSignal.any([abort.signal,AbortSignal.timeout(25000)])}),o.langue,o.actuel,progresser,(o.segmentMs??segmentRapiditeMs(profilRapiditeNavigateur())),nom=>briques.porte(nom),o.premierSegmentMs);
 function detacher(){node?.disconnect();entree?.disconnect();muet?.disconnect();if(node)node.port.onmessage=null;}
 try{let timer:ReturnType<typeof setTimeout>|undefined;try{await Promise.race([o.ctx.audioWorklet.addModule('/anticipation/capture.js'),new Promise((_,reject)=>{timer=setTimeout(()=>reject(Error('Capture indisponible')),1500);})]);}finally{if(timer)clearTimeout(timer);}if(!o.actuel())return null;
 node=new AudioWorkletNode(o.ctx,'bia-anticipation');node.port.onmessage=({data:d})=>{if(d.pcm)pipeline.pousser(d.pcm,o.parle());if(d.fin)accuseFin?.();};entree=o.ctx.createMediaStreamSource(o.flux);muet=o.ctx.createGain();muet.gain.value=0;entree.connect(node);node.connect(muet);muet.connect(o.ctx.destination);
 }catch{briques.annuler();detacher();return null;}
 return {
 livrerBriques:briques.livree,
 etatBriques:briques.etat,
  commencerBriques:(options:Parameters<typeof briques.commencer>[0])=>briques.commencer(options),
 terminerBriques:briques.terminer,
 async fermerCapture(){if(fin)return;fin=true;
  /* On NE coupe plus le producteur ici. Il garde sa fenêtre jusqu'à ce que
     la réponse commence — c'est `terminerBriques` ou `annuler` qui la
     ferment, pas l'arrêt du micro.

     ── ET L'ORDRE ÉTAIT LE DÉFAUT ────────────────────────────────────────
     Mesuré le 25 octobre : six préparations sur sept tuées à UNE
     milliseconde. La transcription livrée après la fermeture déclenchait
     `lancer()`, mais `commencer()` venait de rendre la main en disant
     « rien de prêt » — et la ligne suivante tuait ce que la précédente
     venait de démarrer. On laisse donc ce qui est DÉJÀ EN VOL se poser
     avant de rendre la main. Borné, et réversible par
     BIA_ATTENTE_ENVOI_MS=0. */
  await new Promise<void>((resolve,reject)=>{const timer=setTimeout(()=>reject(Error('Capture non confirmée')),800);accuseFin=()=>{clearTimeout(timer);resolve();};node?.port.postMessage('fin');}).finally(detacher);
  const attendu=await pipeline.attendreEnvois(o.attenteEnvoiMs??0);
  if(attendu>0)void fetch('/api/mesure',{method:'POST',keepalive:true,headers:{'content-type':'application/json'},
   body:JSON.stringify({type:'briques',etape:'attente_envoi',ms:attendu,en_vol:Number(!!briques.etat().en_cours)})}).catch(()=>{});
 },
 async resultat(){return pipeline.finir();},
 async annuler(raison?:string){fin=true;abort.abort();briques.annuler(raison);detacher();await pipeline.abandonner();},
 };
}
