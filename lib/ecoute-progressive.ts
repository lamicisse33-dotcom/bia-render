import {wavLong} from './ecoute-longue';
/** A single ordered ASR queue; only complete decoded PCM is sent. */
export function creerEcouteProgressive(envoyer:(f:FormData)=>Promise<Response>,indice:()=>string,actuel:()=>boolean,progression:(texte:string)=>void){
 let buffer=new Float32Array(0),chaine:Promise<void>=Promise.resolve(),erreur:unknown=null,segments=0,total=0,commence=false,clos=false;
 const textes:string[]=[],bruts:string[]=[],suggestions:string[]=[];
 function segment(pcm:Float32Array){total+=pcm.length;segments++;
 chaine=chaine.then(async()=>{if(erreur)return;if(!actuel())throw Error('Tour annulé');const f=new FormData();f.set('audio',wavLong({sampleRate:16000,length:pcm.length,numberOfChannels:1,getChannelData:()=>pcm},0,pcm.length),'segment.wav');f.set('indice_langue',indice());
 const r=await envoyer(f),d=await r.json();if(!actuel())throw Error('Tour annulé');if(!r.ok||d.panne||d.transcription_rejetee||typeof d.texte!=='string')throw Error('Segment non confirmé');textes.push(d.texte.trim());bruts.push(String(d.texte_brut??d.texte).trim());if(Array.isArray(d.suggestions_ecriture))suggestions.push(...d.suggestions_ecriture.filter((x:any)=>typeof x==='string'));if(!clos)progression(textes.filter(Boolean).join(' '));
 }).catch(e=>{erreur=e;});
 }
 return {
 pousser(pcm:Float32Array,parle:boolean){if(clos)return;const next=new Float32Array(buffer.length+pcm.length);next.set(buffer);next.set(pcm,buffer.length);buffer=next;
 if(!commence){if(!parle){if(buffer.length>16000)buffer=buffer.slice(-16000);return;}commence=true;}
 if(buffer.length>=16000*9){let end=16000*8,best=Infinity;for(let i=16000*7;i<16000*8;i+=320){let e=0;for(let j=i;j<i+320;j++)e+=buffer[j]*buffer[j];if(e<best){best=e;end=i+160;}}const part=buffer.slice(0,end);buffer=buffer.slice(end);segment(part);}
 },
 async finir(){clos=true;const debut=Date.now();if(!segments)return null;if(buffer.length){segment(buffer);buffer=new Float32Array(0);}await chaine;if(erreur)throw erreur;if(!actuel())throw Error('Tour annulé');return {texte:textes.filter(Boolean).join(' '),texte_brut:bruts.filter(Boolean).join(' '),suggestions_ecriture:[...new Set(suggestions)],extrait:null,au_fil_de_leau:true,progressive:{segments,secondes:total/16000,attente_finale_ms:Date.now()-debut}};},
 async abandonner(){clos=true;buffer=new Float32Array(0);await chaine;},
 };
}
