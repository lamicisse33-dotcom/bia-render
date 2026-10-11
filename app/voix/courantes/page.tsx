"use client";
import {useEffect,useState} from 'react';
import type {SonCourant} from '@/lib/sons-courants-core';
export default function Courantes(){
 const [sons,setSons]=useState<SonCourant[]>([]),[total,setTotal]=useState(0),[erreur,setErreur]=useState('');
 useEffect(()=>{void fetch('/api/sons-courants',{cache:'no-store'}).then(r=>{if(!r.ok)throw Error();return r.json();}).then(d=>{setSons(d.sons);setTotal(d.attendus);}).catch(()=>setErreur('Les sons ne sont pas disponibles pour le moment.'));},[]);
 return <main style={{background:'#090909',color:'#fff',minHeight:'100vh',padding:'32px 20px',maxWidth:850,margin:'auto'}}><a href="/" style={{color:'#d4af37'}}>← BIA</a><h1>Les paroles prêtes de BIA</h1><p>{erreur||`${sons.length} enregistrements prêts sur ${total}. Français et wolof, avec la voix de BIA.`}</p><p>Écoute les salutations et les réactions. Les phrases de vérification accompagnent une vérification réelle.</p>{(['wo','fr'] as const).map(langue=><section key={langue}><h2>{langue==='wo'?'Wolof':'Français'}</h2>{sons.filter(s=>s.langue===langue).map(s=><div key={s.cle} style={{borderTop:'1px solid #333',padding:'16px 0'}}><p>{s.texte}</p><audio controls preload="none" src={s.adresse} aria-label={s.texte}/></div>)}</section>)}</main>;
}
