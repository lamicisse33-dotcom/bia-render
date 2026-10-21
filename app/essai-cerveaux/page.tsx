'use client';
import Link from 'next/link';
import {useEffect,useState,type CSSProperties} from 'react';
import {MODELES_GPT} from '@/lib/essai-gpt-core';
export default function EssaiCerveaux(){
 const [code,setCode]=useState(''),[rapport,setRapport]=useState<any>(null),[erreur,setErreur]=useState(''),[effort,setEffort]=useState('low'),[passage,setPassage]=useState(1),[charge,setCharge]=useState(false);
 useEffect(()=>{try{setCode(localStorage.getItem('bia-code')||'');}catch{}},[]);
 async function demander(action?:string){
  if(!code.trim()){setErreur('Saisis ton code maître BIA.');return;}
  setCharge(true);setErreur('');
  try{
   const r=await fetch('/api/essai-cerveaux',{method:action?'POST':'GET',headers:{'x-bia-code':code,...(action?{'content-type':'application/json'}:{})},...(action?{body:JSON.stringify({action,effort})}:{}),cache:'no-store',signal:AbortSignal.timeout(15000)});
   const d=await r.json();if(!r.ok)throw Error(d.erreur||'Le serveur ne répond pas.');setRapport(d);
  }catch(e){setErreur(e instanceof Error?e.message:'Lecture impossible.');}finally{setCharge(false);}
 }
 useEffect(()=>{if(!code||rapport?.statut!=='en_cours')return;const id=setInterval(()=>void demander(),3000);return()=>clearInterval(id);},[code,rapport?.statut]);
 const busy=rapport?.statut==='en_cours';
 const secondes=(ms:number|null|undefined)=>ms===null||ms===undefined?'—':(ms/1000).toFixed(2)+' s';
 const nomEtat:Record<string,string>={non_lance:'Prêt à vérifier les accès',configuration_manquante:'Accès à compléter',en_cours:'Comparaison en cours',termine:'Comparaison terminée',termine_avec_echecs:'Comparaison terminée avec des échecs',annule:'Essai arrêté',indisponible:'Essai indisponible'};
 return <main lang="fr" style={{height:'100dvh',overflowY:'auto',background:'#f5f3ec',color:'#183b32',padding:'28px 20px',fontFamily:'system-ui,sans-serif'}}><div style={{maxWidth:1120,margin:'0 auto',paddingBottom:60}}>
  <Link href="/" style={{color:'#226b51'}}>← Revenir à BIA</Link>
  <p style={{fontSize:12,letterSpacing:'.12em',marginTop:30}}>ESPACE D’ESSAI</p><h1 style={{fontSize:'clamp(30px,6vw,44px)',margin:'12px 0'}}>Comparer les cerveaux</h1>
  <p style={paragraph}>Lis les réponses de GPT‑6 Astra, GPT‑5.6 Sol et du Sonnet actuel aux mêmes six situations. Chaque situation est répétée deux fois, en changeant l’ordre des modèles.</p>
  <p style={{...paragraph,background:'#e6eee4',borderRadius:12,padding:16}}>Cet essai concerne les réponses écrites. Les conversations habituelles de BIA gardent leur cerveau, leur oreille, leur voix et leurs réglages.</p>
  <label htmlFor="code-cerveaux" style={{display:'block',margin:'24px 0 8px'}}>Ton code maître BIA</label>
  <input id="code-cerveaux" type="password" autoComplete="off" value={code} onChange={e=>{setCode(e.target.value);setRapport(null);}} style={{...input,maxWidth:400,width:'100%'}}/>
  <div style={{display:'flex',gap:12,flexWrap:'wrap',alignItems:'end',margin:'18px 0'}}>
   <button onClick={()=>void demander()} disabled={charge} style={button}>Vérifier les accès et voir les résultats</button>
   <label>Réflexion des GPT<select value={effort} disabled={busy} onChange={e=>setEffort(e.target.value)} style={{...input,display:'block',marginTop:6}}><option value="low">Rapide</option><option value="medium">Moyen, comme dans ta fenêtre</option></select></label>
   <button onClick={()=>void demander('lancer')} disabled={busy||charge||!rapport?.configuration?.pret||rapport?.lancements_restants===0} style={{...button,background:'#195b45',color:'#fff',opacity:busy||!rapport?.configuration?.pret||rapport?.lancements_restants===0?0.5:1}}>Lancer la comparaison</button>
   {busy&&<button onClick={()=>void demander('arreter')} style={button}>Arrêter</button>}
  </div>
  {erreur&&<p role="alert" style={{color:'#9b3028'}}>{erreur}</p>}
  {rapport&&<section style={panel}>
   <h2 style={{marginTop:0}}>{nomEtat[rapport.statut]||rapport.statut}</h2>
   <p>OpenAI : <strong>{rapport.configuration.openai?'accès configuré':'accès absent sur le serveur'}</strong> · Sonnet : <strong>{rapport.configuration.anthropic?'accès configuré':'accès absent'}</strong></p>
   {!rapport.configuration.openai&&<p style={paragraph}>Pour lancer l’essai, l’accès API OpenAI doit être configuré dans le service BIA. <a href="https://dashboard.render.com/web/srv-dafpehon74is73b2iatg" target="_blank" rel="noreferrer">Ouvrir le service BIA sur Render</a>. Aucune clé n’est à saisir sur cette page.</p>}
   {rapport.total>0&&<p role="status">{rapport.realises} réponses reçues sur {rapport.total}. {busy?'Les résultats apparaissent progressivement ; cela peut prendre plusieurs minutes.':''}</p>}
   {busy&&<progress value={rapport.realises} max={rapport.total} style={{width:'100%'}}/>}
   <p style={{...paragraph,fontSize:14}}>« Premier texte » mesure l’arrivée des premiers mots. « Première phrase » mesure une phrase complète détectée par BIA. Ces délais ne comprennent ni l’oreille ni la fabrication de la voix.</p>
   <div style={{overflowX:'auto'}}><table style={{width:'100%',borderCollapse:'collapse',textAlign:'left'}}><thead><tr>{['Modèle','Réponses réussies','Premier texte, médiane','Première phrase, médiane'].map(t=><th key={t} style={cell}>{t}</th>)}</tr></thead><tbody>{rapport.bilans.map((b:any)=><tr key={b.id}><td style={cell}>{b.nom}</td><td style={cell}>{b.reussites}</td><td style={cell}>{secondes(b.premier_texte_ms)}</td><td style={cell}>{secondes(b.premiere_phrase_ms)}</td></tr>)}</tbody></table></div>
   <p style={{...paragraph,fontSize:14}}>GPT‑6 Astra est le candidat API choisi pour cet essai. La variante exacte derrière « GPT‑6 » dans ta fenêtre ChatGPT reste non confirmée. Sonnet conserve son réglage de production.</p>
  </section>}
  {rapport?.cas&&<><h2 style={{marginTop:32}}>Comparer la compréhension</h2><p style={paragraph}>Juge le sens, le naturel du wolof et le respect de tes corrections. Un contrôle exact réussi sur deux phrases ne suffit pas à établir la qualité générale du wolof.</p><label>Passage à afficher <select value={passage} onChange={e=>setPassage(Number(e.target.value))} style={input}><option value={1}>Premier passage</option><option value={2}>Deuxième passage</option></select></label>
   {rapport.cas.map((c:any)=><section key={c.id} style={{marginTop:28}}><h3>{c.nom}</h3><p style={paragraph}>{c.history.map((h:any,i:number)=><span key={i} style={{display:'block',color:'#52675c'}}>{h.role==='user'?'Personne':'BIA'} : {h.content}</span>)}<strong>{c.question}</strong></p><p style={{...paragraph,fontSize:14}}>À vérifier : {c.critere}</p><div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(min(100%,260px),1fr))',gap:14}}>{MODELES_GPT.map(m=>{const d=rapport.mesures.find((x:any)=>x.cas===c.id&&x.modele===m.id&&x.passage===passage);return <article key={m.id} style={panel}><h4 style={{marginTop:0}}>{m.nom}</h4><p style={{lineHeight:1.7,whiteSpace:'pre-wrap',minHeight:70}}>{d?.reponse||(d?.erreur?'Essai non abouti : '+d.erreur:'En attente de ce résultat.')}</p>{d&&<p style={{fontSize:13}}>Premier texte : {secondes(d.premier_texte_ms)}<br/>Première phrase : {secondes(d.premiere_phrase_ms)}<br/>Réponse complète : {secondes(d.complet_ms)}{d.controle_exact!==null&&d.controle_exact!==undefined&&<><br/>Contrôle exact : {d.controle_exact?'réussi':'non réussi'}</>}</p>}</article>;})}</div></section>)}
  </>}
 </div></main>;
}
const paragraph:CSSProperties={lineHeight:1.7};
const panel:CSSProperties={padding:20,background:'#fff',border:'1px solid #d4ded1',borderRadius:14};
const input:CSSProperties={padding:'12px 14px',border:'1px solid #a6bbae',borderRadius:10,background:'#fff',color:'#183b32',fontSize:16};
const button:CSSProperties={padding:'13px 18px',border:'1px solid #aac1ae',borderRadius:10,background:'#fff',color:'#183b32',fontSize:15,cursor:'pointer'};
const cell:CSSProperties={padding:'12px 8px',borderBottom:'1px solid #d4ded1',fontSize:14};
