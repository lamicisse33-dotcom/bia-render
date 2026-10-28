// Banc visuel local : monte les vrais composants sans compte, micro ni API.
import React,{useEffect,useState} from 'react';
import {createRoot} from 'react-dom/client';
import {useHabillageBia,ChoixPersonnage,PortraitTenue} from '../app/personnages/Personnages';
import '../app/globals.css';
function Atelier(){
 const h=useHabillageBia();const [persona,setPersona]=useState('rara');const [parle,setParle]=useState(false);const [face,setFace]=useState('yeux_ouverts');
 useEffect(()=>{if(!parle)return;let i=0;const timer=setInterval(()=>setFace(['bouche_a','bouche_o','bouche_entr','bouche_fermee'][i++%4]),180);return()=>clearInterval(timer)},[parle]);
 return <main style={{height:'100svh',overflow:'auto',padding:20,color:'white',display:'flex',flexWrap:'wrap',gap:20}}>
  <section style={{width:460,height:800,position:'relative',background:'#000',flexShrink:0}}>
   <div className="portrait" data-persona={persona} data-tenue="nouvelle"><div className="avatar" data-face="yeux_ouverts"/>
   {h.habillage&&<PortraitTenue tenue={h.habillage} face={face} parle={parle}/>}</div>
  </section>
  <section style={{width:375}}><h1>Vérification des personnages</h1><ChoixPersonnage {...h} persona={persona} choisirPersona={setPersona}/>
   <button onClick={()=>setParle(v=>!v)}>{parle?'Arrêter la parole simulée':'Simuler la parole'}</button>
   <label>Expression<select value={face} onChange={e=>{setParle(false);setFace(e.target.value)}}>{['yeux_ouverts','yeux_fermes','joie','surprise','pensive','triste','salut_2','coeur_double_4','priere_2','compter_4','rire_main_4'].map(f=><option key={f}>{f}</option>)}</select></label>
   <p>Identité vocale conservée : {persona}</p>
  </section>
 </main>
}
createRoot(document.getElementById('root')!).render(<Atelier/>);
