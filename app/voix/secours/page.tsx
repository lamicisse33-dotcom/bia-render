"use client";
import {useEffect,useRef,useState} from 'react';
import {preparerPiperWeb,lirePiperWeb,etatPiperWeb,annulerPiperWeb,mesurerPiperWeb} from '@/lib/piper-web';
import {choisirVoixBia} from '@/lib/chatterbox-essai';

/* ── LE BANC D'ÉCOUTE DE KHALAM GRATUIT ────────────────────────────────────

   Khalam Gratuit fabrique sa voix DANS le navigateur du téléphone : rien ne
   part au serveur, rien ne se paie. Son modèle n'a qu'une seule voix — la
   page ne fait donc plus choisir entre deux femmes, c'est fini depuis le
   25 octobre.

   Cette page sert à deux choses, et à rien d'autre : écouter avant de
   choisir, et MESURER. Le premier son est le seul chiffre qui compte pour
   une conversation, et il est écrit ici en clair, séparé de la préparation
   du modèle qui, elle, n'arrive qu'une fois.                              */

export default function BancKhalamGratuit(){
 const [code,setCode]=useState(''),[etat,setEtat]=useState(''),[pret,setPret]=useState(false),[occupe,setOccupe]=useState(false);
 const [ecoutee,setEcoutee]=useState(false);
 const [mesure,setMesure]=useState<{preparation_ms?:number;synthese_ms?:number;premier_son_ms?:number}>({});
 const [texte,setTexte]=useState('Bu loolu weesoo, ñu waxtaan ci côté santé.');
 const ctx=useRef<AudioContext|null>(null),source=useRef<AudioBufferSourceNode|null>(null),tour=useRef(0);
 useEffect(()=>{setCode(localStorage.getItem('bia-code')||'');const change=()=>setEtat(etatPiperWeb());window.addEventListener('bia-piper-web',change);return()=>{tour.current++;annulerPiperWeb();source.current?.stop();void ctx.current?.close();window.removeEventListener('bia-piper-web',change);};},[]);
 async function preparer(){
  setOccupe(true);const debut=performance.now();
  try{await preparerPiperWeb(code);setPret(true);setMesure(m=>({...m,preparation_ms:Math.round(performance.now()-debut)}));}
  catch(e){setEtat(String(e instanceof Error?e.message:e));}finally{setOccupe(false);}
 }
 async function ecouter(phrase:string){
  const n=++tour.current;setOccupe(true);
  const debut=performance.now();let prepare=0;
  try{
   ctx.current??=new AudioContext();await ctx.current.resume();
   await preparerPiperWeb(code);if(n!==tour.current)return;setPret(true);
   prepare=performance.now();
   const d=await lirePiperWeb(phrase,0,code);if(n!==tour.current)return;
   if(!d.audio)throw Error('Aucun son produit.');
   const audio=await ctx.current.decodeAudioData(Uint8Array.from(atob(d.audio),c=>c.charCodeAt(0)).buffer);
   if(n!==tour.current)return;
   const s=ctx.current.createBufferSource();s.buffer=audio;s.connect(ctx.current.destination);source.current=s;
   s.onended=()=>{if(n===tour.current){setOccupe(false);source.current=null;}};
   /* Le premier son, c'est l'instant où l'oreille l'entend : on le prend
      juste avant start(), pas à la fin de la synthèse. */
   const premierSon=Math.round(performance.now()-prepare);
   s.start();setEcoutee(true);
   mesurerPiperWeb('lecture',performance.now()-debut);
   setMesure(m=>({...m,synthese_ms:d.fabrication_ms,premier_son_ms:premierSon}));
   setEtat(`Elle a parlé. Son wolof est à toi de juger : écoute si les mots sont les tiens.`);
  }catch(e){if(n===tour.current){setEtat(String(e instanceof Error?e.message:e));setOccupe(false);}}
 }
 function arreter(){tour.current++;source.current?.stop();source.current=null;annulerPiperWeb();setOccupe(false);setPret(false);setEtat('Lecture arrêtée.');}
 const ms=(v?:number)=>v===undefined?'—':v<1000?`${v} ms`:`${(v/1000).toFixed(2)} s`;
 return <main style={{maxWidth:640,margin:'0 auto',padding:'32px 20px 80px',height:'100dvh',boxSizing:'border-box',overflowY:'auto',color:'#fff7dc'}}>
  <a href="/?reglages=voix">← Retour à BIA</a>
  <h1>Khalam Gratuit — écouter avant de choisir</h1>
  <p>Cette voix est fabriquée par le téléphone lui-même : aucun aller-retour au serveur, aucun coût. Le modèle de 63,5 Mo est téléchargé <strong>une seule fois</strong>, puis gardé sur cet appareil si le navigateur le permet.</p>
  <p><strong>Elle n’est pas finie, et ça s’entend.</strong> Son entraînement s’est arrêté après 1 200 pas, et la partie du modèle qui décide de la durée de chaque son n’a presque rien appris : sa propre note de qualité s’arrête à 1,8 sur 5. Écoutée le 26 octobre, elle traîne comme une cassette. Elle reste ici pour être réécoutée après un vrai entraînement — pas pour servir aujourd’hui.</p>
  {!code?<p>Ouvre d’abord <a href="/">BIA avec ton code</a>, puis reviens ici.</p>:null}
  <div style={{display:'flex',flexDirection:'column',gap:16,margin:'24px 0'}}>
   <button className="voix-ecouter" disabled={!code||occupe} onClick={()=>void preparer()}>Préparer la voix (une seule fois)</button>
   <button className="voix-ecouter" disabled={!code||occupe} onClick={()=>void ecouter('Nanga def? Maa ngi fi rekk. Dama bëgg jàng wolof.')}>Écouter en wolof</button>
   <button className="voix-ecouter" disabled={!code||occupe} onClick={()=>void ecouter('Bonjour. Je suis prête à discuter avec toi.')}>Écouter en français</button>
   <label htmlFor="gratuit-texte">Ta phrase à toi</label>
   <textarea id="gratuit-texte" value={texte} maxLength={180} disabled={occupe} onChange={e=>setTexte(e.target.value)} rows={3} style={{padding:12,color:'#111',background:'#fff'}} />
   <button className="voix-ecouter" disabled={!code||occupe||!texte.trim()} onClick={()=>void ecouter(texte)}>Écouter ma phrase</button>
   <button className="voix-ecouter" disabled={!occupe} onClick={arreter}>Arrêter</button>
   <button className="voix-ecouter" disabled={!pret||occupe||!ecoutee} onClick={()=>{if(choisirVoixBia('piper-web'))window.location.href='/?reglages=voix';else setEtat('Impossible de mémoriser le choix.');}}>Garder Khalam Gratuit dans BIA</button>
  </div>
  <p role="status" aria-live="polite">{etat}</p>
  <table style={{borderSpacing:'0 6px'}}><tbody>
   <tr><td>Préparation du modèle</td><td><strong data-mesure="preparation">{ms(mesure.preparation_ms)}</strong> <i>(une fois)</i></td></tr>
   <tr><td>Fabrication de la phrase</td><td><strong data-mesure="synthese">{ms(mesure.synthese_ms)}</strong></td></tr>
   <tr><td>Premier son</td><td><strong data-mesure="premier-son">{ms(mesure.premier_son_ms)}</strong></td></tr>
  </tbody></table>
  <p>Le choix est gardé dans ce navigateur, pour les conversations comme pour les lectures.</p>
 </main>;
}
