'use client';
import {useState} from 'react';
import {verifierAcces} from '@/lib/acces-client';
import './style.css';

export default function Codes(){
 const [saisie,setSaisie]=useState(''),[maitre,setMaitre]=useState('');
 const [nom,setNom]=useState(''),[heures,setHeures]=useState('24');
 const [occupe,setOccupe]=useState(false),[erreur,setErreur]=useState('');
 const [resultat,setResultat]=useState<{code:string;expire:string;quota:number;nom:string}|null>(null);
 const [copie,setCopie]=useState(false);
 async function ouvrir(e:React.FormEvent){
  e.preventDefault();if(occupe)return;setOccupe(true);setErreur('');
  try{const v=await verifierAcces(saisie);if(!v.maitre)throw Error('Cet espace est réservé au code maître.');setMaitre(saisie);setSaisie('');}
  catch(e){setErreur(e instanceof Error&&e.name==='Error'?e.message:'Connexion indisponible. Réessaie.');}
  finally{setOccupe(false);}
 }
 async function generer(e:React.FormEvent){
  e.preventDefault();if(occupe)return;setOccupe(true);setErreur('');setResultat(null);setCopie(false);
  try{
   const r=await fetch('/api/codes',{method:'POST',headers:{'content-type':'application/json','x-bia-code':maitre},body:JSON.stringify({nom,heures:Number(heures),nombre:1}),signal:AbortSignal.timeout(8000)});
   const d=await r.json();if(!r.ok){if(r.status===403)setMaitre('');throw Error(d.erreur||'Création impossible.');}setResultat(d);
  }catch(e){setErreur(e instanceof Error&&e.name==='Error'?e.message:'Connexion indisponible. Réessaie.');}
  finally{setOccupe(false);}
 }
 return <main className="codes-page"><div className="codes-carte">
  <a href="/">← Retour à BIA</a><h1>Les codes BIA</h1>
  {!maitre?<form onSubmit={ouvrir}>
   <p>Entre ton code maître pour créer des accès pour d’autres utilisateurs.</p>
   <label htmlFor="code-maitre">Code maître</label>
   <input id="code-maitre" type="password" autoComplete="off" value={saisie} onChange={e=>setSaisie(e.target.value)} required disabled={occupe}/>
   <button disabled={occupe||!saisie.trim()}>{occupe?'Vérification…':'Ouvrir l’espace maître'}</button>
  </form>:<>
   <form onSubmit={generer}>
    <label htmlFor="nom-code">Prénom de l’utilisateur (facultatif)</label>
    <input id="nom-code" value={nom} onChange={e=>setNom(e.target.value)} maxLength={16}/>
    <label htmlFor="duree-code">Durée de validité</label>
    <select id="duree-code" value={heures} onChange={e=>setHeures(e.target.value)}>
     <option value="2">2 heures</option><option value="24">24 heures</option><option value="168">7 jours</option><option value="720">30 jours</option>
    </select>
    <button disabled={occupe}>{occupe?'Création…':'Créer un code utilisateur'}</button>
   </form>
   {resultat&&<section aria-label="Code créé" role="status">
    <h2>Code créé{resultat.nom?' pour '+resultat.nom:''}</h2><output>{resultat.code}</output>
    <p>Valable jusqu’au {new Date(resultat.expire).toLocaleString('fr-FR',{timeZone:'Africa/Dakar'})} (Dakar). Limite : {resultat.quota} questions.</p>
    <p>À saisir sur <a href="/">app.khalam.app</a>.</p>
    <button onClick={async()=>{try{await navigator.clipboard.writeText(resultat.code);setCopie(true);}catch{setErreur('Sélectionne le code pour le copier.');}}}>{copie?'Code copié':'Copier le code'}</button>
   </section>}
   <button className="codes-quitter" onClick={()=>{setMaitre('');setResultat(null);setErreur('');}}>Fermer l’espace maître</button>
  </>}
  {erreur&&<p className="codes-erreur" role="alert">{erreur}</p>}
 </div></main>;
}
