import {verdictLocuteur} from './focus-locuteur-core';
/** Session-local voice reference. No names, embeddings or audio are persisted. */
export function creerFocusLocuteur(){
 let worker:Worker|null=null,node:AudioWorkletNode|null=null,epoch=0,pret=false,reference=false,fiable=false,actif=true;
 let verdict:'meme'|'autre'|'incertain'='incertain',dernier=0,voix=false,fin=0;
 const compte={verifications:0,autres:0,incertains:0,erreurs:0,dernier_ms:0};
 const deja={verifications:0,autres:0,incertains:0,erreurs:0};
 const mesurer=()=>{const delta={...compte,pret,reference};for(const k of Object.keys(deja) as Array<keyof typeof deja>){delta[k]=compte[k]-deja[k];deja[k]=compte[k];}void fetch("/api/mesure",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({type:"focus_locuteur",...delta}),keepalive:true}).catch(()=>{});};
 const reset=()=>{epoch++;reference=false;verdict='incertain';dernier=0;voix=false;fin=0;worker?.postMessage({type:'reset',epoch});};
 return {
  reset,
  activer(v:boolean){actif=v;reset();},
  async brancher(ctx:AudioContext,entree:MediaStreamAudioSourceNode){
   try{
    if(!worker){worker=new Worker('/locuteur/worker.js');worker.onmessage=({data:d})=>{
     if(d.type==='pret'){pret=true;mesurer();return;}
     if(d.type==='erreur'){compte.erreurs++;pret=false;mesurer();return;}
     if(d.epoch!==epoch)return;
     if(d.type==='voix'){reference=d.reference;verdict=d.score===null?'meme':verdictLocuteur(d.score);dernier=Date.now();compte.verifications++;compte.dernier_ms=d.ms;if(verdict==='autre')compte.autres++;if(verdict==='incertain')compte.incertains++;if(compte.verifications%10===0||d.score===null)mesurer();}
    };worker.onerror=()=>{compte.erreurs++;pret=false;mesurer();};worker.postMessage({type:'reset',epoch});}
    await ctx.audioWorklet.addModule('/locuteur/capture.js');
    const capture=new AudioWorkletNode(ctx,'bia-locuteur');node=capture;capture.port.onmessage=({data:pcm})=>{
     if(pret&&voix&&worker)worker.postMessage({type:'pcm',epoch,pcm,fiable},[pcm.buffer]);
    };
    entree.connect(capture);const muet=ctx.createGain();muet.gain.value=0;capture.connect(muet);muet.connect(ctx.destination);
    return ()=>{capture.port.onmessage=null;capture.disconnect();muet.disconnect();if(node===capture)node=null;};
   }catch{compte.erreurs++;pret=false;return ()=>{};}
  },
  observer(v:boolean,confiance=true){
   if(!actif){voix=false;return;}
   fiable=confiance;
   const now=Date.now();
   if(v&&!voix&&now-fin>450){epoch++;verdict='incertain';dernier=0;worker?.postMessage({type:'nouvelle',epoch});}
   if(!v&&voix)fin=now;voix=v;
  },
  autoriser(){return !actif||!pret||!reference||verdict!=='autre'||Date.now()-dernier>1600;},
  // An uncertain/old embedding must not veto acoustically confirmed speech.
  interruption(){return !actif||!pret||!reference||verdict!=='autre'||Date.now()-dernier>1600;},
  bilan(){return {...compte,actif,pret,reference,verdict};},
  terminer(){mesurer();reset();node?.disconnect();node=null;worker?.terminate();worker=null;pret=false;},
 };
}
