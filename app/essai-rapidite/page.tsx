'use client';
import {useEffect,useState} from 'react';
const profils=[{id:'sonnet',nom:'1. Sonnet actuel',detail:'Référence : mêmes réglages que la conversation habituelle.'},{id:'haiku',nom:'2. Haiku 5.5 seul',detail:'Même voix et même découpage ; seul le cerveau de réponse change.'},{id:'haiku-optimise',nom:'3. Haiku 5.5 + optimisations',detail:'Premier segment après 2,5 s de parole continue, données préchargées pendant l’écoute et première phrase plus courte. Les formulations apprises restent entières.'},{id:'sonnet-segment-1500',nom:'4. Sonnet + préparation à 1,5 s',detail:'Même cerveau Sonnet, même voix et mêmes règles. Seul changement : BIA prépare plus tôt une réponse silencieuse sur les phrases longues. Elle ne parle qu’après la fin du micro ; si la reconnaissance échoue, le chemin habituel reprend.'}];
export default function EssaiRapidite(){
 const [etat,setEtat]=useState<any>(null),[erreur,setErreur]=useState('');
 const actualiser=async()=>{try{const r=await fetch('/api/etat',{cache:'no-store'});if(!r.ok)throw Error('État indisponible');const d=await r.json();setEtat(d.essai_rapidite);}catch{setErreur('Les mesures ne sont pas disponibles pour le moment.');}};
 useEffect(()=>{void actualiser();},[]);
 return <main tabIndex={0} style={{maxWidth:760,margin:'0 auto',padding:'30px 22px 70px',color:'#f5f8f6',background:'#101614',height:'100dvh',overflowY:'auto',WebkitOverflowScrolling:'touch',fontFamily:'system-ui'}}>
  <a href='/' style={{color:'#a7dbc2'}}>← BIA habituelle</a><h1 style={{fontSize:30}}>Comparer la rapidité de BIA</h1>
  <p>Utilise ton code maître. Chaque bouton ouvre la vraie conversation, avec son microphone, sa mémoire et sa voix habituelle. Le mode d’essai reste limité à cette adresse ; quitter l’essai rétablit la référence.</p>
  <p>Compare les mêmes questions dans des conversations neuves et sur le même téléphone : une courte en français, une en wolof, puis un récit de 15 à 20 secondes. Vérifie aussi la compréhension, les mots prononcés et les reprises.</p>
  {profils.map(p=>{const mesure=etat?.profils?.find((x:any)=>x.profil===p.id);return <section key={p.id} style={{padding:20,margin:'18px 0',border:'1px solid #365046',borderRadius:16,background:'#18241f'}}>
   <h2 style={{fontSize:21,marginTop:0}}>{p.nom}</h2><p>{p.detail}</p>
   <a href={'/?essai-rapidite='+p.id} style={{display:'inline-block',padding:'12px 18px',borderRadius:9,background:'#bbf0d5',color:'#102119',fontWeight:700,textDecoration:'none'}}>Parler avec ce mode</a>
   <p style={{fontSize:14,color:'#b5cbbf',marginBottom:0}}>{mesure?.tours?\`${mesure.tours} échange(s) mesuré(s). Médiane sans reprise : ${mesure.mediane_sans_reprise_ms===null?'pas encore de mesure':(mesure.mediane_sans_reprise_ms/1000).toFixed(2)+' s'}. Reprises : ${mesure.tours_avec_reprise}.\`:'Aucun échange mesuré dans ce mode pour le moment.'}</p>
  </section>;})}
  <button onClick={actualiser} style={{padding:'12px 16px',borderRadius:8,cursor:'pointer'}}>Actualiser les mesures</button><p>{erreur}</p>
  <p style={{fontSize:13,color:'#a7beb1'}}>La mesure va de la fin de parole détectée au premier son programmé par le navigateur. Les échanges avec reprise sont comptés séparément. Une petite série ne suffit pas à garantir le même délai à chaque fois. Les mesures repartent à zéro au redémarrage du serveur.</p>
 </main>;
}