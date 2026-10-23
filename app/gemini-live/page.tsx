'use client';
import {useEffect,useRef,useState} from 'react';
import {BiaGeminiLive} from '@/lib/gemini-live-client';
import {chargerPortrait} from '@/lib/portrait-images';
export default function GeminiLive(){
 const live=useRef<BiaGeminiLive|null>(null),[code,setCode]=useState(''),[etat,setEtat]=useState('Appuie sur Parler pour commencer'),[actif,setActif]=useState(false),[parle,setParle]=useState(false),[muet,setMuet]=useState(false),[erreur,setErreur]=useState(''),[latence,setLatence]=useState<number|null>(null),[user,setUser]=useState(''),[bia,setBia]=useState(''),[configure,setConfigure]=useState<boolean|null>(null);
 useEffect(()=>{try{setCode(localStorage.getItem('bia-code')||'');}catch{}void chargerPortrait('rara','nouvelle').catch(()=>{});void fetch('/api/gemini-live/session',{cache:'no-store'}).then(r=>r.json()).then(d=>setConfigure(d.configure===true)).catch(()=>{});return()=>live.current?.arreter();},[]);
 async function demarrer(){
  const propre=code.toUpperCase().replace(/[^A-Z0-9]/g,'');
  if(!propre){setErreur('Saisis ton code maître.');return;}
  setCode(propre);live.current?.arreter();setErreur('');setActif(true);setMuet(false);
  const moteur=new BiaGeminiLive(propre,{etat:s=>{setEtat(s);if(s.includes('terminée')||s.includes('pause'))setActif(false);},transcription:(role,t)=>role==='user'?setUser(t):setBia(t),parle:setParle,latence:setLatence,erreur:s=>{setErreur(s);setActif(false);}});
  live.current=moteur;await moteur.demarrer();
 }
 function arreter(){live.current?.arreter();setActif(false);setEtat('Conversation arrêtée');}
 return <main className="bia-presence" data-mode={parle?'speaking':'ready'} style={{minHeight:'100dvh',background:'#000'}}>
  <div className="portrait" aria-hidden="true" data-tenue="nouvelle" data-persona="rara"><div className="avatar" data-face="yeux_ouverts"/></div>
  <a href="/" style={{position:'fixed',top:16,left:16,zIndex:20,color:'#e3c576',padding:12,background:'#151515df',borderRadius:20}}>Bia habituelle</a>
  <section style={{position:'fixed',bottom:0,left:0,right:0,zIndex:20,padding:'20px 20px max(24px, env(safe-area-inset-bottom))',background:'linear-gradient(transparent,#000 22%)',color:'white',textAlign:'center',maxHeight:'65dvh',overflowY:'auto'}}>
   <h1 style={{fontSize:24}}>Bia · Conversation rapide</h1>
   <p role="status">{etat}</p>
   {configure===false&&<p>La connexion Google doit encore être activée sur le serveur.</p>}
   {erreur&&<p role="alert" style={{color:'#ffb5ae'}}>{erreur}</p>}
   <form onSubmit={e=>{e.preventDefault();if(!actif)void demarrer();}}>
   {!actif&&<label>Code d’accès <input aria-label="Code d’accès" type="password" autoComplete="off" autoCapitalize="characters" autoCorrect="off" spellCheck={false} value={code} onChange={e=>setCode(e.target.value)} style={{color:'#111',padding:10,borderRadius:10}}/></label>}
   <div style={{display:'flex',gap:12,justifyContent:'center',margin:16}}>
    {!actif?<button type="submit" disabled={!code||configure===false} style={{padding:'16px 28px',borderRadius:30,background:'#d4af37',color:'#111'}}>Parler avec Bia</button>:<><button type="button" onClick={()=>{setMuet(!muet);live.current?.couperMicro(!muet);}} style={{padding:16,borderRadius:24}}>{muet?'Réactiver le micro':'Couper le micro'}</button><button type="button" onClick={arreter} style={{padding:16,borderRadius:24}}>Arrêter</button></>}
   </div>
   </form>
   {user&&<p style={{opacity:.8}}>Toi : {user}</p>}
   {bia&&<p>Bia : {bia}</p>}
   {latence!==null&&<p style={{fontSize:12,opacity:.65}}>Dernier délai estimé avant le son : {(latence/1000).toFixed(2)} s</p>}
  </section>
 </main>;
}
