"use client";
import {useEffect,useRef,useState} from "react";
import {LectureContinue,MAX_EXERCICE,type Progression} from "@/lib/lecture-continue";
import type {Lecon} from "@/lib/lexique-apprentissage-core";
import {lirePiperLocale,piperLocaleDisponible} from "@/lib/voix-piper-locale";
import {ouvrirFluxVoix,type MorceauVoix} from "@/lib/flux-khalam";

export default function LectureApprentissage({code,voice,demande,onStart,onClose,edition=false}:{edition?:boolean;code:string;voice:"piper"|"female"|"male";
 demande:{texte:string;nonce:number;auto:boolean};onStart:()=>void;onClose:()=>void}){
 const [texte,setTexte]=useState(demande.texte);const [langue,setLangue]=useState<"fr"|"wo">("wo");
 const [p,setP]=useState<Progression>({etat:"prêt",index:0,total:0});
 const [lecons,setLecons]=useState<Lecon[]>([]);const [info,setInfo]=useState("");
 const [mot,setMot]=useState("");const [dire,setDire]=useState("");const [exemple,setExemple]=useState("");
 const [statut,setStatut]=useState<Lecon["statut"]>("incertain");const [confirme,setConfirme]=useState(false);const [saving,setSaving]=useState(false);
 const audio=useRef<HTMLAudioElement|null>(null);const player=useRef<LectureContinue|null>(null);
 const enPause=useRef(false);
 const settings=useRef({code,voice,langue,onStart});settings.current={code,voice,langue,onStart};
 const headers=()=>({"content-type":"application/json","x-bia-code":settings.current.code});
 async function charger(){try{const r=await fetch("/api/apprentissage/lexique",{headers:headers()});const d=await r.json();
  if(!r.ok)throw new Error(d.error);setLecons(d.lecons);setInfo("Lexique Supabase chargé.");}catch{setInfo("Lexique inaccessible. Les validations ne sont pas confirmées.");}}
 useEffect(()=>{
  const a=new Audio();audio.current=a;
  let preparation:{original:string;langue:string;texte:string}|null=null;
  const demander=async(text:string,partie:number,signal:AbortSignal)=>{
   if(settings.current.voice==="piper"){
    if(!piperLocaleDisponible())throw Error("Ouvre BIA installée sur le téléphone pour utiliser Piper.");
    if(!preparation||preparation.original!==text||preparation.langue!==settings.current.langue){
     const r=await fetch("/api/apprentissage/preparer",{method:"POST",headers:headers(),signal,body:JSON.stringify({texte:text,langue:settings.current.langue})});
     const d=await r.json();if(!r.ok||typeof d.texte!=="string")throw Error(d.error||"Lexique indisponible");
     preparation={original:text,langue:settings.current.langue,texte:d.texte};
    }
    return lirePiperLocale(preparation.texte,partie,signal);
   }
   const abort=new AbortController();const stop=()=>abort.abort();signal.addEventListener("abort",stop,{once:true});
   const cleanup=()=>{signal.removeEventListener("abort",stop);abort.abort();};
   try{
    const r=await fetch("/api/chatterbox-test/bia/stream",{method:"POST",headers:headers(),signal:abort.signal,
     body:JSON.stringify({texte:text,langue:settings.current.langue,voice:settings.current.voice,partie,lecture:true})});
    return await ouvrirFluxVoix(r,cleanup);
   }catch(error){cleanup();throw error;}
  };
  async function* packets(value:{text:string;first:MorceauVoix},signal:AbortSignal){
   let piece=value.first;
   for(let part=0;part<piece.parties;part++){
    if(part)piece=await demander(value.text,part,signal);
    try{if(!piece.audio)throw Error("Morceau vocal absent");yield piece.audio;
     if(piece.flux)for await(const packet of piece.flux)yield packet;
    }finally{piece.annuler?.();}
   }
  }
  const jouer=async(value:unknown,signal:AbortSignal)=>{
   for await(const base64 of packets(value as {text:string;first:MorceauVoix},signal)){
    while(enPause.current&&!signal.aborted)await new Promise(r=>setTimeout(r,60));
    if(signal.aborted)throw new Error("arrêté");
    const bytes=Uint8Array.from(atob(base64),c=>c.charCodeAt(0));const url=URL.createObjectURL(new Blob([bytes],{type:"audio/wav"}));
    try{await new Promise<void>((resolve,reject)=>{
     const clear=()=>{a.onended=null;a.onerror=null;signal.removeEventListener("abort",abort);};
     const abort=()=>{a.pause();clear();reject(new Error("arrêté"));};
     if(signal.aborted){reject(new Error("arrêté"));return;}
     a.onended=()=>{clear();resolve();};a.onerror=()=>{clear();reject(new Error("Lecture audio impossible"));};
     signal.addEventListener("abort",abort,{once:true});a.src=url;
     a.play().catch(()=>{clear();reject(new Error("Lecture bloquée : appuie sur Reprendre."));});
    });}finally{URL.revokeObjectURL(url);}
   }
  };
  player.current=new LectureContinue(async(text,signal)=>{
   return {text,first:await demander(text,0,signal)};
  },jouer,{pause:()=>{enPause.current=true;a.pause();},reprendre:()=>{enPause.current=false;if(a.src&&a.paused&&!a.ended)void a.play().catch(()=>{});},stop:()=>{enPause.current=true;a.pause();a.removeAttribute("src");}},setP);
  if(edition)void charger();return()=>{player.current?.stop();a.pause();};
 },[code]);
 function lancer(t=texte){settings.current.onStart();try{player.current?.demarrer(t);}catch(e){setInfo((e as Error).message);}}
 useEffect(()=>{setTexte(demande.texte);if(demande.auto)lancer(demande.texte);},[demande.nonce]);
 async function garder(){setSaving(true);try{
  const r=await fetch("/api/apprentissage/lexique",{method:"POST",headers:headers(),body:JSON.stringify({texte:mot,langue,prononciation:dire,exemple,statut,validation_expresse:confirme})});
  const d=await r.json();if(!r.ok)throw new Error(d.error);await charger();setInfo(`Enregistré : ${d.lecon.statut}.`);
 }catch(e){setInfo((e as Error).message);}finally{setSaving(false);}}
 return <section role="dialog" aria-modal="true" aria-label="Apprentissage et lecture continue" style={{position:"fixed",inset:0,zIndex:1000,background:"#101014",color:"#fff",overflowY:"auto",padding:"max(20px, env(safe-area-inset-top)) 20px 40px"}}>
  <div style={{maxWidth:760,margin:"0 auto",display:"grid",gap:14}}>
   <button type="button" onClick={()=>{player.current?.stop();onClose();}}>Fermer et arrêter</button>
   <h2>Apprentissage — lecture continue</h2>
   <p>Colle ton exercice. Il sera lu entièrement, sans résumé ni traduction. La lecture ne valide aucun mot automatiquement.</p>
   <label>Langue <select value={langue} disabled={p.etat==="lecture"||p.etat==="pause"} onChange={e=>setLangue(e.target.value as "fr"|"wo")}><option value="wo">Wolof</option><option value="fr">Français</option></select></label>
   <textarea aria-label="Texte complet de l’exercice" value={texte} maxLength={MAX_EXERCICE} rows={10} onChange={e=>setTexte(e.target.value)} style={{width:"100%",color:"#fff",background:"#222",padding:12}}/>
   <div style={{display:"flex",flexWrap:"wrap",gap:12}}>
    <button type="button" disabled={!texte.trim()||p.etat==="lecture"||p.etat==="pause"} onClick={()=>lancer()}>DÉMARRER APPRENTISSAGE</button>
    <button type="button" disabled={p.etat!=="lecture"} onClick={()=>player.current?.pause()}>PAUSE</button>
    <button type="button" disabled={p.etat!=="pause"&&p.etat!=="erreur"} onClick={()=>player.current?.reprendre()}>REPRENDRE</button>
    <button type="button" onClick={()=>player.current?.stop()}>STOP</button>
   </div>
   <p role="status" aria-live="polite">{p.etat} — {Math.min(p.index+1,p.total)} / {p.total}{p.erreur?` — ${p.erreur}. Le segment est conservé. Reprendre pour réessayer.`:""}</p>
   {edition && <>
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
