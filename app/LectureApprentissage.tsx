"use client";
import {LecteurAudioContinu} from "@/lib/lecteur-audio-continu";
import {sansSilence} from "@/lib/bords-audio";
import {lirePiperWeb,mesurerPiperWeb} from "@/lib/piper-web";
import {useEffect,useMemo,useRef,useState} from "react";
import {routerApprentissage,type TypeApprentissage} from "@/lib/routage-apprentissage";
import {LectureContinue,type Progression,type PlageLecture} from "@/lib/lecture-continue";
import {ambiguitiesWolof} from "@/lib/langue";
import type {Lecon} from "@/lib/lexique-apprentissage-core";
import {lirePiperLocale,piperLocaleDisponible} from "@/lib/voix-piper-locale";
import {ouvrirFluxVoix,type MorceauVoix} from "@/lib/flux-khalam";
import {reveiller} from "@/lib/reveil-du-son";
import type {DevoirALire} from "@/lib/lecture-devoirs-core";
import type {PassageCorrige} from '@/lib/correction-apprentissage-core';
import {morceauxLecture} from "@/lib/lecture-morceaux";

export default function LectureApprentissage({code,voice,demande,onStart,onClose,edition=false,obtenirAudio}:{obtenirAudio:()=>AudioContext;edition?:boolean;code:string;voice:"piper"|"piper-web"|"female"|"male";
 demande:{texte:string;nonce:number;auto:boolean;source?:"memoire"};onStart:()=>void;onClose:()=>void}){
 const [curseur,setCurseur]=useState(0);
 const [fenetreLecture,setFenetreLecture]=useState(0);
 const [plageLue,setPlageLue]=useState<PlageLecture|null>(null);
 const suivi=useRef<HTMLDivElement|null>(null);

 const depuis=useRef(0);const premierSon=useRef(false);
 const lectureMemoire=useRef(false);lectureMemoire.current=demande.source==="memoire";
 const chargement=useRef<AbortController|null>(null);
 const [charge,setCharge]=useState(false);
 const passagesMemoire=useRef<DevoirALire[]>([]);
 const mesurer=(etape:"premier_son"|"fin"|"erreur")=>{if(lectureMemoire.current)void fetch("/api/mesure",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({type:"lecture_devoirs",etape,ms:performance.now()-depuis.current}),keepalive:true}).catch(()=>{});};
 const [typeMessage,setTypeMessage]=useState<TypeApprentissage>("exercice");
 const [resultatMessage,setResultatMessage]=useState("");
 const exercice=useRef({texte:"",valide:false,langue:"wo" as "fr"|"wo"});
 const messageGeneration=useRef(0);
 const [texte,setTexte]=useState(demande.texte);const [langue,setLangue]=useState<"fr"|"wo">("wo");
 const motsLecture=useMemo(()=>Array.from(texte.matchAll(/\S+|\s+/gu),m=>({texte:m[0],debut:m.index!,fin:m.index!+m[0].length})),[texte]);
 const motsVisibles=useMemo(()=>motsLecture.filter(m=>m.fin>fenetreLecture&&m.debut<fenetreLecture+6000),[motsLecture,fenetreLecture]);
 useEffect(()=>{const position=plageLue?.debut??curseur;
  setFenetreLecture(debut=>position<debut||position>=debut+6000?Math.max(0,position-800):debut);
 },[curseur,plageLue?.debut]);
 const correctionGeneration=useRef(0);
 const [correctionLexique,setCorrectionLexique]=useState<{original:string;texte:string;passages:PassageCorrige[]}|null>(null);
 const [etatCorrection,setEtatCorrection]=useState("");const [correctionEnCours,setCorrectionEnCours]=useState(false);
 async function corrigerCollage(original:string){
  const generation=++correctionGeneration.current;player.current?.stop();exercice.current.valide=false;setCorrectionLexique(null);
  if(!edition||langue!=="wo"||routerApprentissage(original).type!=="exercice"){setTexte(original);return;}
  setTexte(original);setToutCorrect(false);setCorrectionEnCours(true);setEtatCorrection("Vérification des formes validées dans Supabase…");player.current?.stop();
  try{const r=await fetch('/api/apprentissage/corriger',{method:'POST',headers:headers(),signal:AbortSignal.timeout(12000),body:JSON.stringify({texte:original})});const d=await r.json();
   if(!r.ok)throw Error(d.error||"Correction indisponible");if(generation!==correctionGeneration.current)return;
   setTexte(d.texte);setCorrectionLexique({original,texte:d.texte,passages:d.passages});
   setEtatCorrection(d.passages.length?"Corrections appliquées : vérifie les passages surlignés avant de lire et valider.":"Aucune correction certaine trouvée dans le lexique validé.");
  }catch(e){if(generation===correctionGeneration.current)setEtatCorrection((e as Error).message);}
  finally{if(generation===correctionGeneration.current)setCorrectionEnCours(false);}
 }
 const [p,setP]=useState<Progression>({etat:"prêt",index:0,total:0});
 const [lecons,setLecons]=useState<Lecon[]>([]);const [info,setInfo]=useState("");
 const [mot,setMot]=useState("");const [dire,setDire]=useState("");const [exemple,setExemple]=useState("");
 const [statut,setStatut]=useState<Lecon["statut"]>("incertain");const [confirme,setConfirme]=useState(false);const [saving,setSaving]=useState(false);
 const [entendu,setEntendu]=useState("");const [ecrit,setEcrit]=useState("");const [accordEcriture,setAccordEcriture]=useState(false);
 const [toutCorrect,setToutCorrect]=useState(false);const [validationEnCours,setValidationEnCours]=useState(false);const [validationInfo,setValidationInfo]=useState("");
 const [memoire,setMemoire]=useState("");const sauvegarde=useRef(0);
 const [revus,setRevus]=useState<string[]>([]);const texteEditeur=useRef<HTMLTextAreaElement|null>(null);
 const points=useMemo(()=>{if(demande.source==="memoire")return [];const candidats=ambiguitiesWolof(texte,langue);
  const presents=lecons.filter(l=>l.langue==="wo"&&l.statut!=="validé"&&texte.toLocaleLowerCase().includes(l.texte.toLocaleLowerCase())).map(l=>l.texte);
  const valides=new Set(lecons.filter(l=>l.langue==="wo"&&l.statut==="validé").map(l=>l.texte.toLocaleLowerCase()));
  return [...new Set([...presents,...candidats])].filter(m=>!valides.has(m.toLocaleLowerCase())&&!revus.includes(m));
 },[texte,langue,lecons,revus,demande.source]);
 function corriger(m:string){setMot(m);setDire("");setLangue("wo");setStatut("incertain");setConfirme(false);setInfo("Écoute puis indique la prononciation correcte. Le texte reste intact.");}
 const audio=useRef<HTMLAudioElement|null>(null);const player=useRef<LectureContinue|null>(null);
 const enPause=useRef(false);
 const settings=useRef({code,voice,langue,onStart});settings.current={code,voice,langue,onStart};
 const headers=()=>({"content-type":"application/json","x-bia-code":settings.current.code});
 async function charger(){try{const r=await fetch("/api/apprentissage/lexique",{headers:headers()});const d=await r.json();
  if(!r.ok)throw new Error(d.error);setLecons(d.lecons);setInfo("Lexique Supabase chargé.");}catch{setInfo("Lexique inaccessible. Les validations ne sont pas confirmées.");}}
 useEffect(()=>{
  const ctx=obtenirAudio();
  let lecteur:LecteurAudioContinu|null=null;
  const suspendre=()=>lecteur?.pause();
  const reprendreSon=()=>lecteur?.reprendre();
  const arreterSon=()=>{lecteur?.arreter();lecteur=null;};
  let preparation:{original:string;langue:string;texte:string}|null=null;
  let secoursComplet=true;
  const demander=async(text:string,partie:number,signal:AbortSignal,empreinte?:string,langue=settings.current.langue)=>{
   signal=AbortSignal.any([signal,AbortSignal.timeout(settings.current.voice==="piper-web"?45000:12000)]);
   if(settings.current.voice==="piper"||settings.current.voice==="piper-web"){
    if(settings.current.voice==="piper"&&!piperLocaleDisponible())throw Error("Ouvre BIA installée sur le téléphone pour utiliser Piper.");
    if(!preparation||preparation.original!==text||preparation.langue!==langue){
     const r=await fetch("/api/apprentissage/preparer",{method:"POST",headers:headers(),signal,body:JSON.stringify({texte:text,langue:langue})});
     const d=await r.json();if(!r.ok||typeof d.texte!=="string")throw Error(d.error||"Lexique indisponible");
     preparation={original:text,langue:langue,texte:d.texte};
    }
    return settings.current.voice==="piper-web"?lirePiperWeb(preparation.texte,partie,settings.current.code,signal):lirePiperLocale(preparation.texte,partie,signal);
   }
   if(secoursComplet){
    const r=await fetch("/api/chatterbox-test/bia",{method:"POST",headers:headers(),signal,body:JSON.stringify({texte:text,langue:langue,voice:settings.current.voice,partie,empreinte,lecture_fidele:true})});
    const d=await r.json();if(!r.ok||!d.audio)throw Error(d.error||"Voix indisponible");
    if(d.partie!==partie||(empreinte!==undefined&&d.empreinte!==empreinte))throw Error("Le passage reçu ne correspond pas à la lecture. Réessaie ce passage.");
    return d as MorceauVoix;
   }
   const abort=new AbortController();const stop=()=>abort.abort();signal.addEventListener("abort",stop,{once:true});
   const cleanup=()=>{signal.removeEventListener("abort",stop);abort.abort();};
   try{
    const r=await fetch("/api/chatterbox-test/bia/stream",{method:"POST",headers:headers(),signal:abort.signal,
     body:JSON.stringify({texte:text,langue:langue,voice:settings.current.voice,partie,lecture:true})});
    return await ouvrirFluxVoix(r,cleanup);
   }catch(error){cleanup();if(!signal.aborted)secoursComplet=true;throw error;}
  };
  async function* packets(value:{text:string;first:MorceauVoix;langue:"fr"|"wo"},signal:AbortSignal){
   try{yield* morceauxLecture(value.first,(part,empreinte)=>demander(value.text,part,signal,empreinte,value.langue),signal,(settings.current.voice!=="piper"&&settings.current.voice!=="piper-web"));}
   catch(error){if(!signal.aborted)secoursComplet=true;throw error;}
  }
  const jouer=async(value:unknown,signal:AbortSignal,plage?:PlageLecture)=>{
   const debutLecture=performance.now();
   const file=new LecteurAudioContinu(ctx,()=>{
    if(!premierSon.current){premierSon.current=true;mesurer("premier_son");if(settings.current.voice==="piper-web")mesurerPiperWeb("lecture",performance.now()-depuis.current);}
   },!(value as {first:MorceauVoix}).first.flux&&(value as {first:MorceauVoix}).first.parties>1);
   lecteur=file;
   let animation=0;
   const suivre=()=>{
    if(signal.aborted)return;
    const next=file.audible()&&plage?plage:null;
    if(!enPause.current)setPlageLue(old=>old?.debut===next?.debut&&old?.fin===next?.fin?old:next);
    animation=requestAnimationFrame(suivre);
   };
   animation=requestAnimationFrame(suivre);
   const abort=()=>file.arreter();signal.addEventListener("abort",abort,{once:true});
   if(enPause.current)file.pause();
   try{
    for await(const base64 of packets(value as {text:string;first:MorceauVoix;langue:"fr"|"wo"},signal)){
     if(signal.aborted)throw Error("arrêté");
     const bytes=Uint8Array.from(atob(base64),c=>c.charCodeAt(0));
     const buffer=await ctx.decodeAudioData(bytes.buffer);
     if(signal.aborted)throw Error("arrêté");
     if(!await reveiller(ctx)){const e=new Error("Le navigateur a suspendu le son. Appuie sur REPRENDRE pour activer la voix.");e.name="AudioSuspendu";throw e;}
     if(signal.aborted)throw Error("arrêté");
     // Decode and schedule the next complete clip BEFORE the current one ends.
     // Streaming packets can end inside a syllable: retain them verbatim.
     file.ajouter((value as {first:MorceauVoix}).first.flux?buffer:sansSilence(ctx,buffer));
    }
    await file.terminer();
    void fetch('/api/mesure',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({type:'lecture',continu:true,...file.bilan,duree_ms:performance.now()-debutLecture}),keepalive:true}).catch(()=>{});
   }catch(e){file.arreter(e instanceof Error?e:Error("Lecture interrompue"));throw e;}
   finally{cancelAnimationFrame(animation);signal.removeEventListener("abort",abort);if(lecteur===file){lecteur=null;setPlageLue(null);}}
  };
  player.current=new LectureContinue(async(text,signal,langue=settings.current.langue)=>{
   return {text,langue,first:await demander(text,0,signal,undefined,langue)};
  },jouer,{pause:()=>{enPause.current=true;suspendre();},reprendre:()=>{enPause.current=false;reprendreSon();},stop:()=>{enPause.current=true;arreterSon();}},progression=>{setP(progression);if(["arrêté","terminé","erreur"].includes(progression.etat))setPlageLue(null);if(progression.etat==="erreur")mesurer("erreur");if(progression.etat==="terminé")mesurer("fin");});
  if(edition&&!lectureMemoire.current)void charger();return()=>{chargement.current?.abort();player.current?.stop();arreterSon();};
 },[code]);
 async function retenirDevoir(t:string,valide=false,langueDevoir=settings.current.langue){
  if(!edition||!t.trim())return;
  const generation=++sauvegarde.current;setMemoire("Sauvegarde de la leçon dans Supabase…");
  try{
   const hash=await crypto.subtle.digest("SHA-256",new TextEncoder().encode(t));
   const id=Array.from(new Uint8Array(hash),b=>b.toString(16).padStart(2,"0")).join("");
   const blocs:string[]=[];for(let offset=0;offset<t.length;){let end=Math.min(offset+4000,t.length);
    if(end<t.length&&/[\uD800-\uDBFF]/.test(t[end-1]))end--;blocs.push(t.slice(offset,end));offset=end;}
   for(let index=0;index<blocs.length;index++){
    let ok=false;
    for(let essai=0;essai<3&&!ok;essai++){
     try{const r=await fetch("/api/apprentissage/devoir",{method:"POST",headers:headers(),body:JSON.stringify({texte:blocs[index],id,index,total:blocs.length,valide,confirme:valide,langue:langueDevoir})});
      const d=await r.json();if(!r.ok||!d.verifie||(valide&&!d.valide))throw Error(d.error||"Sauvegarde non confirmée");ok=true;
     }catch(e){if(essai===2)throw e;}
    }
    if(generation===sauvegarde.current)setMemoire("Sauvegarde vérifiée : "+(index+1)+" / "+blocs.length+" blocs.");
   }
   if(valide)setValidationInfo("Devoir entier validé et enregistré dans Supabase.");
   if(generation===sauvegarde.current)setMemoire("Leçon complète sauvegardée et relue dans Supabase. Disponible pour les prochaines conversations.");
  }catch{if(valide)setValidationInfo("Validation incomplète : réessaie. Le devoir entier n’est pas encore confirmé.");if(generation===sauvegarde.current)setMemoire("Leçon non sauvegardée entièrement. Garde le texte et clique sur Réessayer la sauvegarde.");}
 }
 async function validerTout(){if(typeMessage!=="exercice"||!toutCorrect||!texte.trim()||validationEnCours)return;exercice.current={texte,valide:true,langue};setValidationEnCours(true);setValidationInfo("Validation et vérification du devoir entier…");try{await retenirDevoir(texte,true);}finally{setValidationEnCours(false);}}
 useEffect(()=>{setToutCorrect(false);setValidationInfo("");},[texte,langue]);
 async function traiter(t=texte,depart=0){
  const route=routerApprentissage(t),generation=++messageGeneration.current;
  setTypeMessage(route.type);setResultatMessage("");player.current?.stop();
  if(!route.contenu.trim()){setResultatMessage("Ajoute le contenu après le préfixe.");return;}
  if(route.type==="exercice"){
   setTexte(route.contenu);setRevus([]);setToutCorrect(false);setValidationInfo("");setMemoire("");
   exercice.current={texte:route.contenu,valide:false,langue:settings.current.langue};
   const position=Math.max(0,depart-Math.max(0,t.indexOf(route.contenu)));setCurseur(position);
   settings.current.onStart();player.current?.demarrer(route.contenu,position);return;
  }
  // Instructions, save commands and tests never enter the reader.
  setP({etat:"prêt",index:0,total:0});
  if(route.type==="memorisation"){
   if(!edition){setResultatMessage("Code maître requis pour enregistrer.");return;}
   if(!exercice.current.valide){setResultatMessage("Aucun devoir validé à enregistrer. Valide d’abord la lecture avec la case de confirmation.");return;}
   setValidationEnCours(true);
   try{await retenirDevoir(exercice.current.texte,true,exercice.current.langue);}finally{setValidationEnCours(false);}
   return;
  }
  setResultatMessage(route.type==="instruction"?"Application et sauvegarde de l’instruction…":"Test en cours, sans sauvegarde…");
  try{
   const r=await fetch(route.type==="instruction"?"/api/apprentissage/instruction":"/api/chat",{
    method:"POST",headers:headers(),body:JSON.stringify(route.type==="instruction"?{texte:route.contenu}:{message:route.contenu,history:[],apprend:false,apprentissageTest:true})});
   const d=await r.json();if(!r.ok||(route.type==="instruction"&&!d.verifie))throw Error(d.error||d.motif||"Traitement non confirmé");
   if(generation===messageGeneration.current)setResultatMessage(route.type==="instruction"?"Instruction appliquée et enregistrée dans Supabase.":String(d.reply||"Aucune réponse au test."));
  }catch(e){if(generation===messageGeneration.current)setResultatMessage((e as Error).message);}
 }
 function lancer(t=texte,depart=0){
  void reveiller(obtenirAudio());setPlageLue(null);
  depuis.current=performance.now();premierSon.current=false;
  if(lectureMemoire.current){settings.current.onStart();player.current?.demarrerPassages(passagesMemoire.current,depart);return;}
  void traiter(t,depart);
 }
 useEffect(()=>{
  ++correctionGeneration.current;setCorrectionEnCours(false);setCorrectionLexique(null);setEtatCorrection("");player.current?.stop();setCurseur(0);setFenetreLecture(0);setPlageLue(null);setTexte(demande.texte);depuis.current=performance.now();premierSon.current=false;
  if(demande.source!=="memoire"){if(demande.texte.trim()){if(edition&&routerApprentissage(demande.texte).type==="exercice")void corrigerCollage(demande.texte);else lancer(demande.texte);}return;}
  const controller=new AbortController();chargement.current=controller;setCharge(true);setResultatMessage("Chargement des devoirs enregistrés…");
  void (async()=>{try{
   const r=await fetch("/api/apprentissage/devoir",{headers:headers(),cache:"no-store",signal:AbortSignal.any([controller.signal,AbortSignal.timeout(10000)])});
   const d=await r.json() as {devoirs:DevoirALire[];incomplets:number;error?:string};
   if(controller.signal.aborted)return;
   if(!r.ok||!Array.isArray(d.devoirs))throw Error(d.error||"Impossible de charger les devoirs.");
   passagesMemoire.current=d.devoirs;
   setTexte(d.devoirs.map(p=>p.texte).join("\n\n"));
   setResultatMessage(`${d.devoirs.length} devoir(s) complet(s) enregistré(s).${d.incomplets?` ${d.incomplets} sauvegarde(s) incomplète(s), non lue(s).`:""}${!d.devoirs.length?" Aucun devoir complet à lire.":""}`);
   if(d.devoirs.length){settings.current.onStart();player.current?.demarrerPassages(d.devoirs);}
  }catch(e){if(!controller.signal.aborted){setResultatMessage(e instanceof Error?e.message:"Chargement impossible. Réessaie.");mesurer("erreur");}}
  finally{if(!controller.signal.aborted)setCharge(false);}})();
  return()=>controller.abort();
 },[demande.nonce]);
 function lireIci(position:number){
  if(correctionEnCours||charge||validationEnCours||routerApprentissage(texte).type!=="exercice")return;
  setCurseur(position);lancer(texte,position);
 }
 useEffect(()=>{
  const conteneur=suivi.current,actif=conteneur?.querySelector<HTMLElement>('[data-lu="true"]');
  if(conteneur&&actif){const c=conteneur.getBoundingClientRect(),a=actif.getBoundingClientRect();
   if(a.top<c.top||a.bottom>c.bottom)conteneur.scrollTop+=a.top-c.top-conteneur.clientHeight/3;
  }
 },[plageLue?.debut]);
 function arreter(){chargement.current?.abort();setCharge(false);player.current?.stop();}
 function reprendre(){void reveiller(obtenirAudio()).then(ok=>{if(ok)player.current?.reprendre();else setResultatMessage("Le son reste bloqué. Réessaie en activant le son du navigateur.");});}

 function coller(e:React.ClipboardEvent<HTMLTextAreaElement>){
  const ajout=e.clipboardData.getData("text");if(!ajout)return;
  e.preventDefault();
  // A marked message is a new command, not text appended to the old lesson.
  const route=routerApprentissage(ajout),a=e.currentTarget;
  const complet=route.explicite?ajout:a.value.slice(0,a.selectionStart)+ajout+a.value.slice(a.selectionEnd);
  if(route.type==="exercice")void corrigerCollage(complet);else {++correctionGeneration.current;setCorrectionEnCours(false);setCorrectionLexique(null);setTexte(complet);lancer(complet);}
 }
 async function garderEcriture(){setSaving(true);try{
  const r=await fetch("/api/apprentissage/transcription",{method:"POST",headers:headers(),body:JSON.stringify({entendu,corrige:ecrit,confirme:accordEcriture})});
  const d=await r.json();if(!r.ok||!d.verifie)throw Error(d.error||"Non enregistré");setInfo("Correction d’écriture sauvegardée et relue. Elle sera appliquée aux prochaines transcriptions.");setAccordEcriture(false);
 }catch(e){setInfo((e as Error).message);}finally{setSaving(false);}}
 async function garder(){setSaving(true);try{
  const r=await fetch("/api/apprentissage/lexique",{method:"POST",headers:headers(),body:JSON.stringify({texte:mot,langue,prononciation:dire,exemple,statut,validation_expresse:confirme})});
  const d=await r.json();if(!r.ok)throw new Error(d.error);await charger();if(statut==="validé")setRevus(r=>[...r,mot]);setInfo(`Enregistré : ${d.lecon.statut}.`);
 }catch(e){setInfo((e as Error).message);}finally{setSaving(false);}}
 return <section role="dialog" aria-modal="true" aria-label="Apprentissage et lecture continue" style={{position:"fixed",inset:0,zIndex:1000,background:"#101014",color:"#fff",overflowY:"auto",padding:"max(20px, env(safe-area-inset-top)) 20px 40px"}}>
  <div style={{maxWidth:760,margin:"0 auto",display:"grid",gap:14}}>
   <button type="button" onClick={()=>{arreter();onClose();}}>Fermer et arrêter</button>
   <h2>{demande.source==="memoire"?"Lecture des devoirs enregistrés":"Apprentissage — lecture continue"}</h2>
   <p hidden={demande.source==="memoire"}>Utilise INSTRUCTION:, EXERCICE:, MÉMORISATION: ou TEST:. Les préfixes passent en priorité. Seul un exercice est lu ; il est enregistré après ta validation. Un texte sans préfixe reste un exercice.</p>
   <p role="status">mode_{typeMessage}</p>
   <p role="status" aria-live="polite">{resultatMessage}</p>
   <label>Langue <select value={langue} disabled={demande.source==="memoire"||validationEnCours||p.etat==="lecture"||p.etat==="pause"} onChange={e=>setLangue(e.target.value as "fr"|"wo")}><option value="wo">Wolof</option><option value="fr">Français</option></select></label>
   <textarea ref={texteEditeur} aria-label="Texte complet de l’exercice" value={texte} readOnly={demande.source==="memoire"} disabled={validationEnCours} rows={10} onSelect={e=>setCurseur(e.currentTarget.selectionStart)} onPaste={coller} onChange={e=>{player.current?.stop();setCurseur(e.currentTarget.selectionStart);exercice.current.valide=false;++correctionGeneration.current;setCorrectionEnCours(false);setCorrectionLexique(null);setEtatCorrection("");setTexte(e.target.value);setToutCorrect(false);}} style={{width:"100%",color:"#fff",background:"#222",padding:12}}/>
   {routerApprentissage(texte).type==="exercice"&&texte.trim()&&<>
    <button type="button" disabled={correctionEnCours||charge||validationEnCours||curseur>=texte.length} onClick={()=>lireIci(texteEditeur.current?.selectionStart??curseur)}>LIRE À PARTIR DU CURSEUR</button>
    <p>Place le curseur dans le texte puis appuie sur « Lire à partir du curseur », ou touche un mot ci-dessous. Le passage entendu apparaît en jaune.</p>
    {texte.length>6000&&<nav aria-label="Parcourir le texte à écouter" style={{display:"flex",gap:12}}>
     <button type="button" disabled={fenetreLecture===0} onClick={()=>setFenetreLecture(n=>Math.max(0,n-5000))}>Voir avant</button>
     <button type="button" disabled={fenetreLecture+6000>=texte.length} onClick={()=>setFenetreLecture(n=>n+5000)}>Voir la suite</button>
    </nav>}
    <div ref={suivi} aria-label="Suivi de la lecture — toucher un mot pour écouter à partir de là" style={{whiteSpace:"pre-wrap",overflowWrap:"anywhere",maxHeight:320,overflowY:"auto",padding:14,background:"#191920",border:"1px solid #555",borderRadius:8,lineHeight:2,fontSize:18}}>
     {motsVisibles.map(m=>/^\s+$/u.test(m.texte)?<span key={m.debut}>{m.texte}</span>:<button key={m.debut} type="button" data-lu={Boolean(plageLue&&m.debut<plageLue.fin&&m.fin>plageLue.debut)} disabled={correctionEnCours||charge||validationEnCours} aria-label={`Lire à partir de : ${m.texte}`} onClick={()=>lireIci(m.debut)} style={{display:"inline",font:"inherit",lineHeight:"inherit",border:0,borderRadius:3,padding:"2px 0",margin:0,cursor:"pointer",color:plageLue&&m.debut<plageLue.fin&&m.fin>plageLue.debut?"#201800":"inherit",background:plageLue&&m.debut<plageLue.fin&&m.fin>plageLue.debut?"#ffe083":"transparent"}}>{m.texte}</button>)}
    </div>
   </>}
   {edition&&demande.source!=="memoire"&&<>
    <p role="status">{etatCorrection}</p>
    <button type="button" disabled={correctionEnCours||validationEnCours||!texte.trim()} onClick={()=>void corrigerCollage(texte)}>Corriger avec le lexique validé</button>
    {correctionLexique?.passages.length? <>
     <p>Texte corrigé — passages modifiés surlignés :</p>
     <div aria-label="Aperçu des corrections du lexique" style={{whiteSpace:"pre-wrap",maxHeight:300,overflowY:"auto",padding:12,background:"#222"}}>
      {correctionLexique.passages.map((c,i)=><span key={i}>{correctionLexique.texte.slice(i?correctionLexique.passages[i-1].fin:0,c.debut)}<mark title={`Avant : ${c.avant}`} style={{background:"#ffe083",color:"#201800"}}>{c.apres}</mark></span>)}
      {correctionLexique.texte.slice(correctionLexique.passages.at(-1)!.fin)}
     </div>
     <ul>{correctionLexique.passages.map((c,i)=><li key={i}>{c.avant} → <mark>{c.apres}</mark></li>)}</ul>
     <button type="button" onClick={()=>{player.current?.stop();exercice.current.valide=false;++correctionGeneration.current;setTexte(correctionLexique.original);setCorrectionLexique(null);setEtatCorrection("Texte initial rétabli.");setToutCorrect(false);}}>Revenir au texte initial</button>
    </>:null}
   </>}

   <div style={{display:"flex",flexWrap:"wrap",gap:12}}>
    <button type="button" disabled={correctionEnCours||charge||!texte.trim()||p.etat==="lecture"||p.etat==="pause"} onClick={()=>lancer()}>{demande.source==="memoire"?"RELIRE LES DEVOIRS":"TRAITER LE MESSAGE"}</button>
    <button type="button" disabled={p.etat!=="lecture"} onClick={()=>player.current?.pause()}>PAUSE</button>
    <button type="button" disabled={p.etat!=="pause"&&p.etat!=="erreur"} onClick={reprendre}>REPRENDRE</button>
    <button type="button" onClick={arreter}>STOP</button>
   </div>
   <p hidden={typeMessage!=="exercice"} role="status" aria-live="polite">{p.etat} — {Math.min(p.index+1,p.total)} / {p.total}{p.erreur?` — ${p.erreur}. Le segment est conservé. Reprendre pour réessayer.`:""}</p>
   {edition && demande.source!=="memoire" && <>
   <p role="status" aria-live="polite">{memoire}</p>
   
   <h3>Valider le devoir entier</h3>
   <label><input type="checkbox" checked={toutCorrect} disabled={validationEnCours||typeMessage!=="exercice"} onChange={e=>{setToutCorrect(e.target.checked);exercice.current={texte,valide:e.target.checked,langue};}}/> J’ai tout écouté : la lecture correspond au texte et toutes les prononciations sont correctes.</label>
   <button type="button" disabled={correctionEnCours||typeMessage!=="exercice"||!toutCorrect||!texte.trim()||validationEnCours||p.etat==="lecture"||p.etat==="pause"} onClick={()=>void validerTout()}>{validationEnCours?"Enregistrement…":"VALIDER ET ENREGISTRER TOUT LE DEVOIR"}</button>
   <p role="status" aria-live="polite">{validationInfo}</p>
   <p>Cette validation conserve le texte complet et ton accord d’écoute, sans remplacer les corrections de prononciation déjà apprises.</p>
   <h3>Passages wolof à vérifier ({points.length})</h3>
   <p>Ces indices signalent des mots inconnus du détecteur ou ambigus, pas des erreurs certaines. La lecture continue sans les modifier. Les phrases ambiguës peuvent aussi être sélectionnées dans le texte.</p>
   <button type="button" onClick={()=>{const a=texteEditeur.current;if(a&&a.selectionEnd>a.selectionStart)corriger(texte.slice(a.selectionStart,a.selectionEnd));}}>Corriger la sélection</button>
   <div style={{display:"flex",flexWrap:"wrap",gap:8}}>{points.slice(0,50).map(m=><button type="button" key={m} onClick={()=>corriger(m)}>{m} — vérifier</button>)}</div>
   {points.length>50&&<p>Les 50 premiers points sont affichés. Les suivants apparaîtront après validation.</p>}
   <h3>Apprendre à corriger la transcription</h3>
   <label>Ce que l’oreille a écrit <input value={entendu} maxLength={400} onChange={e=>{setEntendu(e.target.value);setAccordEcriture(false);}}/></label>
   <label>Écriture correcte <input value={ecrit} maxLength={400} onChange={e=>{setEcrit(e.target.value);setAccordEcriture(false);}}/></label>
   <label><input type="checkbox" checked={accordEcriture} onChange={e=>setAccordEcriture(e.target.checked)}/> Je confirme que ces deux écritures représentent exactement ce que j’ai dit.</label>
   <button type="button" disabled={saving||!entendu.trim()||!ecrit.trim()||!accordEcriture} onClick={()=>void garderEcriture()}>Retenir cette correction d’écriture</button>
   <h3>Valider un mot ou une expression</h3>
   <label>Texte exact <input value={mot} maxLength={400} onChange={e=>{setMot(e.target.value);setConfirme(false);}}/></label>
   <label>Prononciation à utiliser <input value={dire} maxLength={400} onChange={e=>{setDire(e.target.value);setConfirme(false);}}/></label>
   <label>Exemple de phrase <textarea value={exemple} maxLength={2000} onChange={e=>setExemple(e.target.value)}/></label>
   <label>Statut <select value={statut} onChange={e=>{setStatut(e.target.value as Lecon["statut"]);setConfirme(false);}}><option>incertain</option><option>à corriger</option><option>validé</option></select></label>
   <label><input type="checkbox" checked={confirme} onChange={e=>setConfirme(e.target.checked)}/> J’ai écouté et je confirme que cette prononciation est correcte.</label>
   <button type="button" disabled={saving||!mot.trim()||(statut==="validé"&&(!confirme||!dire.trim()))} onClick={()=>void garder()}>Enregistrer dans le lexique</button>
   <p role="status">{info}</p>
   <details><summary>Corrections enregistrées ({lecons.length})</summary>{lecons.map(l=><p key={l.langue+l.texte}>{l.texte} — {l.langue} — {l.statut} — {l.prononciation} {l.date_validation||""} <button type="button" onClick={()=>{setMot(l.texte);setDire(l.prononciation);setExemple(l.exemple);setLangue(l.langue);setStatut(l.statut);setConfirme(false);}}>Modifier</button></p>)}</details>
   </>}
  </div>
 </section>;
}

