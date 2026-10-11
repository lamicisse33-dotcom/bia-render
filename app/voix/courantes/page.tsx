"use client";
import {useEffect,useRef,useState} from 'react';
import type {PhraseEditable} from '@/lib/corrections-sons-courants';
const CLE_BROUILLONS='bia-courantes-brouillons-v1';
type Brouillon={texte:string;revision:number};
const identifiant=(p:PhraseEditable)=>p.cle+'-'+p.langue;
export default function Courantes(){
 const [phrases,setPhrases]=useState<PhraseEditable[]>([]),[code,setCode]=useState(''),[erreur,setErreur]=useState('');
 const [brouillons,setBrouillons]=useState<Record<string,Brouillon>>({}),[charges,setCharges]=useState(false);
 const [occupe,setOccupe]=useState(''),[messages,setMessages]=useState<Record<string,string>>({});
 const verrou=useRef(false);
 useEffect(()=>{
  try{setCode(localStorage.getItem('bia-code')||'');const b=JSON.parse(localStorage.getItem(CLE_BROUILLONS)||'{}');if(b&&typeof b==='object'&&!Array.isArray(b))setBrouillons(b);}catch{}
  setCharges(true);
  void fetch('/api/sons-courants',{cache:'no-store'}).then(r=>{if(!r.ok)throw Error();return r.json();}).then(d=>setPhrases(d.phrases)).catch(()=>setErreur('Les phrases ne sont pas disponibles pour le moment. Recharge la page.'));
 },[]);
 useEffect(()=>{if(charges)try{localStorage.setItem(CLE_BROUILLONS,JSON.stringify(brouillons));}catch{}},[brouillons,charges]);
 async function agir(p:PhraseEditable,action:'corriger'|'regenerer'){
  if(verrou.current)return;verrou.current=true;
  const id=identifiant(p),b=brouillons[id];setOccupe(id);setMessages(m=>({...m,[id]:action==='corriger'?'Enregistrement…':'Régénération en cours…'}));
  try{
   const r=await fetch('/api/sons-courants',{method:'POST',headers:{'content-type':'application/json','x-bia-code':code},body:JSON.stringify({action,cle:p.cle,langue:p.langue,revision:b?.revision??p.revision,...(action==='corriger'?{texte:b?.texte??p.texte}:{})})});
   const d=await r.json();if(!r.ok)throw Error(d.error||'La demande a échoué. Réessaie.');
   setPhrases(l=>l.map(x=>identifiant(x)===id?d.phrase:x));
   setBrouillons(l=>{const n={...l};delete n[id];return n;});
   setMessages(m=>({...m,[id]:action==='corriger'?'Texte enregistré sur Supabase. Tu peux maintenant régénérer l’audio.':'Nouvel audio prêt. Écoute-le pour vérifier la prononciation.'}));
   try{localStorage.setItem('bia-sons-courants-modifies',String(Date.now()));}catch{}
  }catch(e){setMessages(m=>({...m,[id]:e instanceof Error?e.message:'Réessaie.'}));}
  finally{verrou.current=false;setOccupe('');}
 }
 return <main className="voix" tabIndex={0} aria-label="Écoute des paroles de BIA" style={{background:'#090909',color:'#fff',height:'100dvh',boxSizing:'border-box',padding:'32px 20px calc(60px + env(safe-area-inset-bottom))',maxWidth:850,margin:'auto'}}>
  <p className="voix-retour"><a href="/">← BIA</a></p><h1>Écouter et corriger BIA</h1>
  <p>{erreur||`${phrases.filter(p=>p.audio).length} audios prêts sur ${phrases.length} phrases. Français et wolof, avec la voix de BIA.`}</p>
  <p>Corrige le texte, enregistre-le, puis régénère l’audio de cette phrase. Tu peux aussi refaire un audio sans changer le texte si des mots ont été sautés.</p>
  <label className="voix-code">Ton code maître<input type="password" value={code} onChange={e=>setCode(e.target.value)} autoComplete="off" placeholder="Code maître" /></label>
  {(['wo','fr'] as const).map(langue=><section key={langue}><h2>{langue==='wo'?'Wolof':'Français'}</h2>{phrases.filter(p=>p.langue===langue).map((p,index)=>{
   const id=identifiant(p),b=brouillons[id],texte=b?.texte??p.texte,modifie=texte.trim()!==p.texte,conflit=b&&b.revision!==p.revision;
   const audio=p.audio||p.ancienAudio;
   return <article key={id} className={modifie?'voix-item change':'voix-item'}>
    <p className="voix-quand">{index+1}. {p.cle}</p>
    <label htmlFor={id}>Texte en {langue==='wo'?'wolof':'français'}</label>
    <textarea id={id} value={texte} rows={3} maxLength={600} disabled={!!occupe} onChange={e=>setBrouillons(l=>({...l,[id]:{texte:e.target.value,revision:b?.revision??p.revision}}))}/>
    {conflit?<p>Cette phrase a été modifiée ailleurs. Ton brouillon est conservé ; recharge le texte enregistré avant de le remplacer.</p>:null}
    {!p.audio?<p>Audio à régénérer pour le texte enregistré.</p>:null}
    {audio?<><p>{p.audio?'Audio du texte enregistré':'Ancien audio — avant correction'}</p><audio key={audio.adresse} controls style={{maxWidth:'100%'}} preload="none" src={audio.adresse} aria-label={`${p.cle} — ${langue}`} /></>:null}
    <div className="voix-rangee">
     <button className="voix-ecouter" disabled={!!occupe||!code||!modifie||!texte.trim()||!!conflit} onClick={()=>void agir(p,'corriger')}>Enregistrer le texte</button>
     <button className="voix-ecouter" disabled={!!occupe||!code||modifie||!!conflit} onClick={()=>void agir(p,'regenerer')}>{occupe===id?'Patiente…':'Régénérer l’audio'}</button>
     {b?<button className="voix-pale" disabled={!!occupe} onClick={()=>setBrouillons(l=>{const n={...l};delete n[id];return n;})}>Reprendre le texte enregistré</button>:null}
    </div>
    {modifie?<p>Brouillon sur cet appareil — pas encore enregistré sur Supabase.</p>:null}
    <p role="status" aria-live="polite">{messages[id]||''}</p>
   </article>;
  })}</section>)}
 </main>;
}
