'use client';
import {useEffect,useState} from 'react';
import {profilRapiditeNavigateur,type ProfilRapidite} from '@/lib/rapidite-core';
export default function EssaiRapiditeBadge({actif}:{actif:boolean}) {
 const [profil,setProfil]=useState<ProfilRapidite|null>(null);
 useEffect(()=>{setProfil(profilRapiditeNavigateur());},[]);
 if(!actif||!profil)return null;
 const nom=profil==='sonnet'?'Sonnet — référence':profil==='haiku'?'Haiku 5.5':'Haiku 5.5 + optimisations';
 return <aside style={{position:'fixed',top:8,left:'5%',right:'5%',zIndex:85,padding:'9px 12px',borderRadius:12,background:'#162b28',color:'#fff',fontSize:13,display:'flex',gap:12,alignItems:'center',justifyContent:'space-between'}}>
  <span>Essai : {nom}</span><a href='/essai-rapidite' style={{color:'#a9f5d9'}}>Comparer</a><a href='/' style={{color:'#fff'}}>Quitter l’essai</a>
 </aside>;
}
