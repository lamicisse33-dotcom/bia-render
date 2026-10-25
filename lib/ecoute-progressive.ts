import {wavLong} from './ecoute-longue';
import {PREMIER_SEGMENT_MS} from './premier-segment';
/** A single ordered ASR queue; only complete decoded PCM is sent. */
export function creerEcouteProgressive(envoyer:(f:FormData)=>Promise<Response>,indice:()=>string,actuel:()=>boolean,progression:(texte:string)=>void,segmentMs=4000,porte?:(nom:string)=>void,premierMsDemande?:number){
 const tailleSegment=segmentMs===1500?24000:segmentMs===2500?40000:64000;
 /* Le premier segment part après PREMIER_SEGMENT_MS de PAROLE, jamais plus
    tard que les suivants. Le repli à 1 500 ne rattrape pas une erreur : il
    rend NaN impossible, et un seuil NaN arrête toute l'anticipation sans un
    mot. Voir lib/premier-segment.ts. */
 /* Le seuil vient du serveur quand il l'a publie (reversible par variable
    Render) ; sinon le repli du module, qui ne peut pas valoir NaN. */
 const demande=Number(premierMsDemande);
 const premierMs=demande>=500&&demande<=4000?demande:(Number(PREMIER_SEGMENT_MS)>0?Number(PREMIER_SEGMENT_MS):1500);
 let taillePremierSegment=Math.min(tailleSegment,premierMs*16);
 let buffer=new Float32Array(0),chaine:Promise<void>=Promise.resolve(),erreur:unknown=null,segments=0,total=0,commence=false,clos=false,silence=0,paroleDansBuffer=false,finParole=0,enVol=0;
 const textes:string[]=[],bruts:string[]=[],suggestions:string[]=[];
 function segment(pcm:Float32Array){total+=pcm.length;segments++;
 enVol++;
 chaine=chaine.then(async()=>{if(erreur)return;if(!actuel())throw Error('Tour annulé');const f=new FormData();f.set('audio',wavLong({sampleRate:16000,length:pcm.length,numberOfChannels:1,getChannelData:()=>pcm},0,pcm.length),'segment.wav');f.set('indice_langue',indice());
 const r=await envoyer(f),d=await r.json();if(!actuel())throw Error('Tour annulé');if(!r.ok||d.panne||d.transcription_rejetee||typeof d.texte!=='string')throw Error('Segment non confirmé');textes.push(d.texte.trim());bruts.push(String(d.texte_brut??d.texte).trim());if(Array.isArray(d.suggestions_ecriture))suggestions.push(...d.suggestions_ecriture.filter((x:any)=>typeof x==='string'));if(!clos)progression(textes.filter(Boolean).join(' '));
 /* ── LA PORTE QUI A VRAIMENT REFUSÉ, LE 23 OCTOBRE ──────────────────────
    Une transcription qui arrive après la fermeture de la capture est perdue
    sans un mot. Sur une phrase courte, le seul segment part sur les 400 ms
    de silence de fin de parole, donc ~50 ms avant que le micro se coupe :
    sa transcription atterrit TOUJOURS après `clos`, et le producteur de
    briques n'a jamais vu un caractère. D'où `jamais_de_texte` et
    `sans_preparation`. On le nomme au lieu de le jeter. */
 else{
  /* ── CHANTIER 02, 25 OCTOBRE 2026 : ON NE LA JETTE PLUS ─────────────────

     Ses compteurs, sur ses tours de ce matin :
       écoute progressive        42 segments, 42 RÉUSSIS, 0 échec
       transcription_apres_fermeture   × 24
       jamais_de_texte                 × 13
       anticipation              préparations 0, prêtes 0, servies 0

     Quarante-deux transcriptions réussies, et le producteur de briques n'a
     jamais vu un caractère dans treize tours. Le 23 octobre, j'avais NOMMÉ
     cette porte et je m'étais arrêté là : la nommer n'était que la moitié du
     travail.

     LA CONFUSION ÉTAIT DANS LE MOT « FERMÉ ». Fermer le micro, c'est finir
     d'ÉCOUTER — ce n'est pas finir le TOUR. Entre les deux il reste, mesuré
     sur son tour de 13:27 : 1 200 ms de silence exigé puis 2 401 ms de
     fabrication, soit près de deux secondes et demie pendant lesquelles une
     transcription arrivée « trop tard » est encore parfaitement utile.

     On la livre donc, tant que le tour est le sien. Et on garde l'ANCIEN
     compteur à côté du neuf : sans lui, on ne saurait pas combien de fois
     le cas se présente, et le gain d'après-demain ne se lirait plus.

     CE N'EST PAS LE LEVIER 4 REFUSÉ LE 24 OCTOBRE. Celui-là lançait une
     fabrication sur la transcription FINALE, après tout le reste, et il
     coûtait deux secondes. Ici on ne lance rien de neuf : on livre un texte
     DÉJÀ transcrit et déjà payé, dans une fenêtre qui était vide. */
  porte?.('transcription_apres_fermeture');
  /* `actuel()` vient d'être vérifié juste après la réponse, et rien
     d'asynchrone ne s'est produit depuis : il ne peut pas avoir changé ici.
     J'avais écrit un compteur « perdue » pour l'autre branche — une épreuve
     a montré qu'il ne pouvait JAMAIS se déclencher. Un compteur qui ne part
     jamais lit toujours zéro et rassure à tort : pire que pas de compteur.
     Un tour périmé est arrêté plus haut, par « Tour annulé ». */
  porte?.('transcription_apres_fermeture_servie');progression(textes.filter(Boolean).join(' '));
 }
 }).catch(e=>{erreur=e;}).finally(()=>{enVol--;});
 }
 return {
 pousser(pcm:Float32Array,parle:boolean){if(clos)return;const next=new Float32Array(buffer.length+pcm.length);next.set(buffer);next.set(pcm,buffer.length);buffer=next;
 if(!commence){if(!parle){if(buffer.length>16000)buffer=buffer.slice(-16000);return;}commence=true;
 // Le premier seuil compte la PAROLE, après le pré-micro conservé. Sans
 // cette compensation, un premier clip pourrait n'être que du silence — et
 // une ASR générative invente des mots sur du silence.
 taillePremierSegment+=buffer.length-pcm.length;
 }
 silence=parle?0:silence+pcm.length;
 if(parle){paroleDansBuffer=true;finParole=buffer.length;}
 // Use the endpointing wait for ASR/LLM work, without granting playback.
 // Keep all samples; a new segment may contain a resumed sentence.
 if(paroleDansBuffer&&silence>=6400&&buffer.length>=16000*.7){
 /* Premier segment déclenché par le silence de fin de parole : la phrase
    n'a pas atteint le seuil de parole, donc rien n'a pu être anticipé
    pendant qu'il parlait. C'est une mesure, pas une faute. */
 if(!segments)porte?.('premier_segment_hors_portee');
 const part=buffer;buffer=new Float32Array(0);silence=0;paroleDansBuffer=false;finParole=0;segment(part);return;}
 // Give the first completed thought to the producer while speech continues.
 // Keep every sample and a little look-ahead around the quietest cut.
 const seuil=segments===0?taillePremierSegment:tailleSegment;
 if(paroleDansBuffer&&buffer.length>=seuil){let end=seuil-4000,best=Infinity;for(let i=Math.max(0,seuil-16000);i<seuil-4000;i+=320){let e=0;for(let j=i;j<i+320;j++)e+=buffer[j]*buffer[j];if(e<best){best=e;end=i+160;}}const part=buffer.slice(0,end);buffer=buffer.slice(end);finParole=Math.max(0,finParole-end);paroleDansBuffer=finParole>0;segment(part);}
 },
 get segmentsCommences(){return segments;},
 /* ── CE QUI EST EN VOL, SU TOUT DE SUITE ────────────────────────────────

    Le 25 octobre, pour que `commencer()` n'ouvre pas la lecture sur un
    « rien de prêt » alors qu'une transcription allait arriver une
    milliseconde plus tard, j'avais fait ATTENDRE la fermeture jusqu'à
    800 ms. Ça marchait mécaniquement et ça n'a jamais fait gagner une
    seconde à Lamine.

    Il n'y avait pas besoin d'attendre : il suffisait de SAVOIR. Ce compteur
    se lit sans rien bloquer, et `commencer()` peut ouvrir la lecture sur
    « en fabrication » au lieu de refuser. Zéro milliseconde ajoutée. */
 envoisEnVol(){return enVol;},
 /* ── CE QUI EST DÉJÀ PARTI, ET QU'ON LAISSE SE POSER ────────────────────
    Borné : si l'ASR traîne, on n'attend pas indéfiniment — le chemin
    ordinaire doit pouvoir repartir. Rien n'est envoyé ici, on attend
    seulement ce qui est déjà en route. */
 async attendreEnvois(maxMs:number){
  if(!(maxMs>0)||!segments)return 0;
  const debut=Date.now();
  await Promise.race([chaine.catch(()=>{}),new Promise(r=>setTimeout(r,maxMs))]);
  return Date.now()-debut;
 },
 // A quiet remainder after an already recognized utterance is not a new
 // utterance. Never send it alone: a generative ASR can invent words on silence.
 async finir(){clos=true;const debut=Date.now();if(!segments)return null;if(buffer.length&&paroleDansBuffer){segment(buffer);buffer=new Float32Array(0);}await chaine;if(erreur)throw erreur;if(!actuel())throw Error('Tour annulé');return {texte:textes.filter(Boolean).join(' '),texte_brut:bruts.filter(Boolean).join(' '),suggestions_ecriture:[...new Set(suggestions)],extrait:null,au_fil_de_leau:true,progressive:{segments,secondes:total/16000,attente_finale_ms:Date.now()-debut}};},
 async abandonner(){clos=true;buffer=new Float32Array(0);await chaine;},
 };
}
