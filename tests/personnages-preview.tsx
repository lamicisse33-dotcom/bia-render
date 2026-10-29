// Banc visuel local : monte les vrais composants sans compte, micro ni API.
import React,{useEffect,useState} from 'react';
import {publierBoucheAudio,brancherBoucheAudio,arreterBoucheAudio} from '../lib/bouche-audio-satin';
import {createRoot} from 'react-dom/client';
import {useHabillageBia,ChoixPersonnage,PortraitTenue} from '../app/personnages/Personnages';
import '../app/globals.css';
function Atelier(){
 const [ecoute,setEcoute]=useState(false);
 const [mesure,setMesure]=useState('');
 async function testerSon(){
  const ctx=new AudioContext();await ctx.resume();
  const b=await ctx.decodeAudioData(await (await fetch('/essai-levres.wav')).arrayBuffer());
  const source=ctx.createBufferSource();source.buffer=b;source.connect(ctx.destination);
  const debut=ctx.currentTime+.1,donnees=b.getChannelData(0);let raf=0;const traces:number[]=[];
  const lire=()=>{
   const t=ctx.currentTime-(ctx.outputLatency||ctx.baseLatency||0)-debut;
   const index=Math.floor(t*b.sampleRate);if(index<0)return 0;
   let somme=0,n=0;for(let j=index;j<Math.min(donnees.length,index+Math.floor(b.sampleRate*.015));j++){somme+=donnees[j]**2;n++;}
   return Math.min(1,Math.sqrt(somme/(n||1))*6);
  };
  brancherBoucheAudio(lire);setParle(true);setEcoute(false);
  const suivre=()=>{
   const retard=ctx.outputLatency||ctx.baseLatency||0;const t=ctx.currentTime-retard-debut;
   const index=Math.floor(t*b.sampleRate);let somme=0,n=0;
   for(let j=Math.max(0,index);j<Math.min(donnees.length,index+Math.floor(b.sampleRate*.015));j++){somme+=donnees[j]**2;n++;}
   const niveau=index<0?0:Math.min(1,Math.sqrt(somme/(n||1))*6);publierBoucheAudio(niveau);
   const c=document.querySelector<HTMLCanvasElement>('[data-bia-bouche-audio]');
   if(niveau>.15&&c?.style.opacity==='1'&&Number(c.dataset.ouverture)>.1)traces.push(performance.now());
   raf=requestAnimationFrame(suivre);
  };
  source.onended=()=>{cancelAnimationFrame(raf);arreterBoucheAudio();setMesure('Lecture terminée — '+traces.length+' images de bouche mesurées sur le son');setParle(false);void ctx.close();};
  source.start(debut);suivre();
 }

 const [commande,setCommande]=useState('Aucune commande activée');
 const h=useHabillageBia();const [persona,setPersona]=useState('rara');const [parle,setParle]=useState(false);const [face,setFace]=useState('yeux_ouverts');
 useEffect(()=>{if(!parle)return;let i=0;const timer=setInterval(()=>setFace(['bouche_a','bouche_o','bouche_entr','bouche_fermee'][i++%4]),180);return()=>clearInterval(timer)},[parle]);
 return <main style={{height:'100svh',overflow:'auto',padding:20,color:'white',display:'flex',flexWrap:'wrap',gap:20}}>
  <section style={{width:375,height:812,position:'relative',background:'#000',flexShrink:0}}>
   <div className="portrait" style={{bottom:52}} data-persona={persona} data-tenue="nouvelle"><div className="avatar" data-face="yeux_ouverts"/>
   {h.habillage&&<PortraitTenue tenue={h.habillage} face={face} parle={parle} ecoute={ecoute}/>}</div>
   <div className="barre">
    <div className="barre-gauche">
     <button className="discussion-ouvrir" aria-label="Ouvrir la discussion écrite" onClick={()=>setCommande('Discussion activée')}>✉</button>
     <button className="clavier-ouvrir" aria-label="Ouvrir le clavier" onClick={()=>setCommande('Clavier activé')}>⌨</button>
    </div>
    <div className="micro-et-mode"><span className="mode-actuel">Khalam</span>
     <button className="microphone" aria-label="Activer le micro simulé" onClick={()=>setCommande('Micro activé')}>
      <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 14.5a3.5 3.5 0 0 0 3.5-3.5V5a3.5 3.5 0 0 0-7 0v6a3.5 3.5 0 0 0 3.5 3.5Zm-6-4a1 1 0 0 1 2 0V11a4 4 0 0 0 8 0v-.5a1 1 0 1 1 2 0V11a6 6 0 0 1-5 5.92V19h3a1 1 0 1 1 0 2H8a1 1 0 1 1 0-2h3v-2.08A6 6 0 0 1 6 11v-.5Z"/></svg>
     </button>
    </div>
    <button className="papier-ouvrir" aria-label="Moi — réglages et services" onClick={()=>setCommande('Moi activé')}>Moi</button>
   </div>
  </section>
  <section style={{width:375}}><h1>Vérification des personnages</h1><ChoixPersonnage {...h} persona={persona} choisirPersona={setPersona}/>
   <button onClick={()=>setParle(v=>!v)}>{parle?'Arrêter la parole simulée':'Simuler la parole'}</button>
   <button onClick={()=>setEcoute(v=>!v)}>{ecoute?'Terminer la reprise utilisateur':'Simuler la reprise utilisateur'}</button>
   <label>Expression<select value={face} onChange={e=>{setParle(false);setFace(e.target.value)}}>{['yeux_ouverts','yeux_fermes','joie','surprise','pensive','triste','salut_2','coeur_double_4','priere_2','compter_4','rire_main_4'].map(f=><option key={f}>{f}</option>)}</select></label>
   <button onClick={()=>void testerSon()}>Tester la synchronisation audio</button><p role="status">{mesure}</p>
   <p>Identité vocale conservée : {persona}</p><p role="status">{commande}</p>
  </section>
 </main>
}
createRoot(document.getElementById('root')!).render(<Atelier/>);
