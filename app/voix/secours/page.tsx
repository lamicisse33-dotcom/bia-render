"use client";
import {useEffect,useRef,useState} from 'react';
import {preparerPiperWeb,lirePiperWeb,etatPiperWeb,annulerPiperWeb,mesurerPiperWeb,voixFemininePiper,choisirVoixFemininePiper,type VoixFemininePiper} from '@/lib/piper-web';
import {choisirVoixBia} from '@/lib/chatterbox-essai';
export default function Secours(){
 const [code,setCode]=useState(''),[etat,setEtat]=useState(''),[pret,setPret]=useState(false),[occupe,setOccupe]=useState(false);
 const [speaker,setSpeaker]=useState<VoixFemininePiper>(0),[active,setActive]=useState<VoixFemininePiper>(1),[ecoutee,setEcoutee]=useState<VoixFemininePiper|null>(null);
 const [texte,setTexte]=useState('Bu loolu weesoo, ñu waxtaan ci côté santé.');
 const nom=(id:VoixFemininePiper)=>id===0?'Didi':'Féminine du corpus';
 const ctx=useRef<AudioContext|null>(null),source=useRef<AudioBufferSourceNode|null>(null),tour=useRef(0);
 useEffect(()=>{setActive(voixFemininePiper());setCode(localStorage.getItem('bia-code')||'');const change=()=>setEtat(etatPiperWeb());window.addEventListener('bia-piper-web',change);return()=>{tour.current++;annulerPiperWeb();source.current?.stop();void ctx.current?.close();window.removeEventListener('bia-piper-web',change);};},[]);
 async function preparer(){setOccupe(true);try{await preparerPiperWeb(code);setPret(true);}catch(e){setEtat(String(e instanceof Error?e.message:e));}finally{setOccupe(false);}}
 async function ecouter(texte:string){
  const n=++tour.current;setOccupe(true);
  const debut=performance.now();
  try{
   ctx.current??=new AudioContext();await ctx.current.resume();
   await preparerPiperWeb(code);if(n!==tour.current)return;setPret(true);
   const d=await lirePiperWeb(texte,0,code,undefined,speaker);if(n!==tour.current)return;
   if(!d.audio)throw Error('Aucun son produit.');
   const audio=await ctx.current.decodeAudioData(Uint8Array.from(atob(d.audio),c=>c.charCodeAt(0)).buffer);
   if(n!==tour.current)return;
   const s=ctx.current.createBufferSource();s.buffer=audio;s.connect(ctx.current.destination);source.current=s;
   s.onended=()=>{if(n===tour.current){setOccupe(false);source.current=null;}};s.start();setEcoutee(speaker);
   mesurerPiperWeb('lecture',performance.now()-debut);
   setEtat(`Lecture démarrée en ${((performance.now()-debut)/1000).toFixed(2)} s · synthèse ${d.fabrication_ms} ms.`);
  }catch(e){if(n===tour.current){setEtat(String(e instanceof Error?e.message:e));setOccupe(false);}}
 }
 function arreter(){tour.current++;source.current?.stop();source.current=null;annulerPiperWeb();setOccupe(false);setPret(false);setEtat('Lecture arrêtée.');}
 return <main style={{maxWidth:640,margin:'0 auto',padding:'32px 20px 80px',height:'100dvh',boxSizing:'border-box',overflowY:'auto',color:'#fff7dc'}}>
  <a href="/?reglages=voix">← Retour à BIA</a>
  <h1>Piper — choisir une voix féminine</h1>
  <p>Piper parle directement dans ce navigateur, indépendamment du serveur Khalam Voice. Le premier téléchargement fait 77 Mo. Le modèle est ensuite conservé sur cet appareil si le navigateur le permet.</p>
  <p>Voix enregistrée : <strong>{nom(active)}</strong>. Compare les deux voix sur les mêmes phrases, puis garde celle que tu préfères.</p>
  <label htmlFor="piper-femme">Voix à écouter</label>{' '}
  <select id="piper-femme" value={speaker} disabled={occupe} onChange={e=>{setSpeaker(Number(e.target.value) as VoixFemininePiper);setEcoutee(null);}} style={{padding:12,color:'#111',background:'#fff'}}>
   <option value={0}>Didi — autre voix féminine</option>
   <option value={1}>Féminine du corpus — voix précédente</option>
  </select>
  {!code?<p>Ouvre d’abord <a href="/">BIA avec ton code</a>, puis reviens ici.</p>:null}
  <div style={{display:'flex',flexDirection:'column',gap:16,margin:'24px 0'}}>
   <button className="voix-ecouter" disabled={!code||occupe} onClick={()=>void preparer()}>Préparer Piper</button>
   <button className="voix-ecouter" disabled={!code||occupe} onClick={()=>void ecouter('Bonjour. Je suis prête à discuter avec toi.')}>Écouter en français</button>
   <button className="voix-ecouter" disabled={!code||occupe} onClick={()=>void ecouter('Nanga def? Maa ngi fi rekk. Dama bëgg jàng wolof.')}>Écouter en wolof</button>
   <label htmlFor="piper-texte">Ta phrase de comparaison</label>
   <textarea id="piper-texte" value={texte} maxLength={180} disabled={occupe} onChange={e=>setTexte(e.target.value)} rows={3} style={{padding:12,color:'#111',background:'#fff'}} />
   <button className="voix-ecouter" disabled={!code||occupe||!texte.trim()} onClick={()=>void ecouter(texte)}>Écouter ma phrase avec {nom(speaker)}</button>
   <button className="voix-ecouter" disabled={!occupe} onClick={arreter}>Arrêter</button>
   <button className="voix-ecouter" disabled={!pret||occupe||ecoutee!==speaker} onClick={()=>{if(choisirVoixFemininePiper(speaker)&&choisirVoixBia('piper-web'))window.location.href='/?reglages=voix';else setEtat('Impossible de mémoriser le choix.');}}>Utiliser {nom(speaker)} avec Piper dans BIA</button>
  </div>
  <p role="status" aria-live="polite">{etat}</p>
  <p>Le choix est conservé dans ce navigateur pour les conversations et les lectures Piper.</p>
 </main>;
}
