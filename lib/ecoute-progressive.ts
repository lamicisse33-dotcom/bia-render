import {wavLong} from './ecoute-longue';
/** A single ordered ASR queue; only complete decoded PCM is sent. */
export function creerEcouteProgressive(envoyer:(f:FormData)=>Promise<Response>,indice:()=>string,actuel:()=>boolean,progression:(texte:string)=>void,segmentMs=4000){
 const tailleSegment=segmentMs===1500?24000:segmentMs===2500?40000:64000;
 let taillePremierSegment=tailleSegment;
 let buffer=new Float32Array(0),chaine:Promise<void>=Promise.resolve(),erreur:unknown=null,segments=0,total=0,commence=false,clos=false,silence=0,paroleDansBuffer=false,finParole=0;
 const textes:string[]=[],bruts:string[]=[],suggestions:string[]=[];
 function segment(pcm:Float32Array){total+=pcm.length;segments++;
 chaine=chaine.then(async()=>{if(erreur)return;if(!actuel())throw Error('Tour annulé');const f=new FormData();f.set('audio',wavLong({sampleRate:16000,length:pcm.length,numberOfChannels:1,getChannelData:()=>pcm},0,pcm.length),'segment.wav');f.set('indice_langue',indice());
 const r=await envoyer(f),d=await r.json();if(!actuel())throw Error('Tour annulé');if(!r.ok||d.panne||d.transcription_rejetee||typeof d.texte!=='string')throw Error('Segment non confirmé');textes.push(d.texte.trim());bruts.push(String(d.texte_brut??d.texte).trim());if(Array.isArray(d.suggestions_ecriture))suggestions.push(...d.suggestions_ecriture.filter((x:any)=>typeof x==='string'));if(!clos)progression(textes.filter(Boolean).join(' '));
 }).catch(e=>{erreur=e;});
 }
 return {
 pousser(pcm:Float32Array,parle:boolean){if(clos)return;const next=new Float32Array(buffer.length+pcm.length);next.set(buffer);next.set(pcm,buffer.length);buffer=next;
 if(!commence){if(!parle){if(buffer.length>16000)buffer=buffer.slice(-16000);return;}commence=true;
 // The 1.5 s trial counts speech after the retained microphone pre-roll.
 // Otherwise the quiet-cut window can send a first clip made only of silence.
 if(segmentMs===1500)taillePremierSegment+=buffer.length-pcm.length;
 }
 silence=parle?0:silence+pcm.length;
 if(parle){paroleDansBuffer=true;finParole=buffer.length;}
 // Use the endpointing wait for ASR/LLM work, without granting playback.
 // Keep all samples; a new segment may contain a resumed sentence.
 if(paroleDansBuffer&&silence>=6400&&buffer.length>=16000*.7){const part=buffer;buffer=new Float32Array(0);silence=0;paroleDansBuffer=false;finParole=0;segment(part);return;}
 // Give the first completed thought to the producer while speech continues.
 // Keep every sample and a little look-ahead around the quietest cut.
 const seuil=segments===0?taillePremierSegment:tailleSegment;
 if(paroleDansBuffer&&buffer.length>=seuil){let end=seuil-4000,best=Infinity;for(let i=seuil-16000;i<seuil-4000;i+=320){let e=0;for(let j=i;j<i+320;j++)e+=buffer[j]*buffer[j];if(e<best){best=e;end=i+160;}}const part=buffer.slice(0,end);buffer=buffer.slice(end);finParole=Math.max(0,finParole-end);paroleDansBuffer=finParole>0;segment(part);}
 },
 get segmentsCommences(){return segments;},
 // A quiet remainder after an already recognized utterance is not a new
 // utterance. Never send it alone: a generative ASR can invent words on silence.
 async finir(){clos=true;const debut=Date.now();if(!segments)return null;if(buffer.length&&paroleDansBuffer){segment(buffer);buffer=new Float32Array(0);}await chaine;if(erreur)throw erreur;if(!actuel())throw Error('Tour annulé');return {texte:textes.filter(Boolean).join(' '),texte_brut:bruts.filter(Boolean).join(' '),suggestions_ecriture:[...new Set(suggestions)],extrait:null,au_fil_de_leau:true,progressive:{segments,secondes:total/16000,attente_finale_ms:Date.now()-debut}};},
 async abandonner(){clos=true;buffer=new Float32Array(0);await chaine;},
 };
}
