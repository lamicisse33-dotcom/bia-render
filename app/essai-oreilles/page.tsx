'use client';
import Link from 'next/link';
import {useEffect,useRef,useState,type CSSProperties} from 'react';

type Reply={type:string;id?:number;message?:string;percent?:number;text?:string;ms?:number;seconds?:number;revision?:string};
export default function EssaiOreilles(){
 const [code,setCode]=useState(''),[selected,setSelected]=useState(''),[ready,setReady]=useState(false),[busy,setBusy]=useState(false),[recording,setRecording]=useState(false),[status,setStatus]=useState('Choisis une oreille pour commencer.'),[text,setText]=useState(''),[progress,setProgress]=useState<number|null>(null),[audioUrl,setAudioUrl]=useState('');
 const worker=useRef<Worker|null>(null),pending=useRef(new Map<number,{resolve:(v:Reply)=>void;reject:(e:Error)=>void;timer:ReturnType<typeof setTimeout>}>()),nextId=useRef(0),recorder=useRef<MediaRecorder|null>(null),stream=useRef<MediaStream|null>(null),stopTimer=useRef<ReturnType<typeof setTimeout>|null>(null),url=useRef(''),alive=useRef(true);
 useEffect(()=>{alive.current=true;try{setCode(localStorage.getItem('bia-code')||'');}catch{}return()=>{alive.current=false;stopCapture();releaseWorker();if(url.current)URL.revokeObjectURL(url.current);};},[]);
 function stopCapture(){if(stopTimer.current)clearTimeout(stopTimer.current);stopTimer.current=null;if(recorder.current?.state==='recording')recorder.current.stop();stream.current?.getTracks().forEach(t=>t.stop());stream.current=null;}
 function releaseWorker(){worker.current?.terminate();worker.current=null;for(const p of pending.current.values()){clearTimeout(p.timer);p.reject(Error('Essai interrompu.'));}pending.current.clear();}
 async function metric(kind:string,ms=0,revision='moonshine-wolof-best-9137-20261020'){try{await fetch('/api/oreille-essai',{method:'POST',headers:{'content-type':'application/json','x-bia-code':code},body:JSON.stringify({kind,engine:'moonshine',ms,revision})});}catch{}}
 function ask(kind:'prepare'|'transcribe',audio?:ArrayBuffer){return new Promise<Reply>((resolve,reject)=>{
  if(!worker.current){
   const w=new Worker('/oreille-essai/worker.js?v=best-9137-1',{type:'module'});worker.current=w;
   w.onmessage=({data:d}:{data:Reply})=>{
    if(!alive.current)return;
    if(d.type==='progress'){setStatus(d.message||'Préparation…');setProgress(d.percent??null);return;}
    if(d.type==='ready'){setReady(true);setProgress(null);setStatus('Moonshine est prêt pour ton essai.');void metric('pret',0,d.revision);return;}
    const p=d.id===undefined?undefined:pending.current.get(d.id);if(!p)return;clearTimeout(p.timer);pending.current.delete(d.id!);
    if(d.type==='error')p.reject(Error(d.message||'L’essai a échoué.'));else p.resolve(d);
   };
   w.onerror=()=>{for(const p of pending.current.values()){clearTimeout(p.timer);p.reject(Error('L’oreille n’a pas pu démarrer dans ce navigateur. Réessaie ou utilise Chrome.'));}pending.current.clear();worker.current?.terminate();worker.current=null;setReady(false);};
  }
  const id=++nextId.current,timer=setTimeout(()=>{pending.current.delete(id);worker.current?.terminate();worker.current=null;setReady(false);reject(Error('L’essai prend trop de temps. Réessaie.'));},kind==='prepare'?300000:120000);
  pending.current.set(id,{resolve,reject,timer});worker.current!.postMessage({kind,id,code,audio},audio?[audio]:[]);
 });}
 async function prepare(){
  if(selected!=='moonshine')return;
  if(!code.trim()){setStatus('Saisis ton code BIA pour préparer cet essai.');return;}
  setBusy(true);setStatus('Préparation de Moonshine…');setProgress(0);
  try{await ask('prepare');}catch(e){setStatus((e as Error).message);setProgress(null);void metric('erreur');}finally{setBusy(false);}
 }
 async function transcribe(blob:Blob){
  if(!alive.current)return;
  if(blob.size>20*1024*1024){setStatus('Choisis un enregistrement de 30 secondes maximum.');return;}
  setBusy(true);setText('');setStatus('Lecture de ton enregistrement…');
  try{
   if(url.current)URL.revokeObjectURL(url.current);url.current=URL.createObjectURL(blob);setAudioUrl(url.current);
   const decoder=new OfflineAudioContext(1,1,16000);const decoded=await decoder.decodeAudioData(await blob.arrayBuffer());
   if(decoded.duration<=0||decoded.duration>30.1)throw Error('Choisis un enregistrement de 30 secondes maximum.');
   const offline=new OfflineAudioContext(1,Math.ceil(decoded.duration*16000),16000),source=offline.createBufferSource();source.buffer=decoded;source.connect(offline.destination);source.start();
   const audio=(await offline.startRendering()).getChannelData(0).slice();setStatus('Moonshine écoute ton enregistrement…');
   const result=await ask('transcribe',audio.buffer);
   if(!alive.current)return;setText(result.text||'(Aucun texte détecté)');setStatus('Transcription terminée en '+((result.ms||0)/1000).toFixed(2)+' s pour '+(result.seconds||0).toFixed(1)+' s d’audio.');await metric('transcription',result.ms,result.revision);
  }catch(e){if(alive.current)setStatus((e as Error).message);void metric('erreur');}finally{if(alive.current)setBusy(false);}
 }
 async function record(){
  if(recording){stopCapture();return;}
  try{
   const media=await navigator.mediaDevices.getUserMedia({audio:true});stream.current=media;
   const type=['audio/webm;codecs=opus','audio/mp4'].find(t=>MediaRecorder.isTypeSupported(t));
   const rec=new MediaRecorder(media,type?{mimeType:type}:undefined);recorder.current=rec;const chunks:BlobPart[]=[];
   rec.ondataavailable=e=>{if(e.data.size)chunks.push(e.data);};
   rec.onstop=()=>{media.getTracks().forEach(t=>t.stop());recorder.current=null;if(!alive.current)return;setRecording(false);void transcribe(new Blob(chunks,{type:rec.mimeType}));};
   rec.onerror=()=>{stopCapture();setRecording(false);setStatus('L’enregistrement n’a pas abouti.');};
   rec.start();setRecording(true);setText('');setStatus('Je t’écoute. Appuie sur Arrêter quand tu as fini.');stopTimer.current=setTimeout(stopCapture,29000);
  }catch{stopCapture();setRecording(false);setStatus('Autorise le micro pour cet essai, ou choisis un fichier audio.');}
 }
 return <main lang="fr" style={{height:'100dvh',overflowY:'auto',background:'#f5f3ec',color:'#183b32',padding:'32px 22px',fontFamily:'system-ui,sans-serif'}}><div style={{maxWidth:760,margin:'0 auto'}}>
  <Link href="/" style={{color:'#226b51'}}>← Revenir à BIA</Link>
  <p style={{marginTop:30,letterSpacing:'.12em',fontSize:12}}>ESPACE D’ESSAI</p><h1 style={{fontSize:'clamp(30px,6vw,44px)',lineHeight:1.15}}>Essayer une oreille</h1>
  <p style={{lineHeight:1.7}}>Choisis Moonshine, puis enregistre une phrase en wolof ou en français. Tu pourras lire exactement ce qu’il a compris.</p>
  <p style={{lineHeight:1.7,padding:16,border:'1px solid #bfd0c3',borderRadius:12}}>La sélection concerne cet essai uniquement. L’oreille des conversations, la voix et tous les réglages actuels de BIA restent en place.</p>
  <section aria-label="Essais Didi sur le Mac" style={{margin:'24px 0',padding:20,border:'1px solid #bfd0c3',borderRadius:12}}>
   <h2 style={{fontSize:22,marginTop:0}}>Les deux oreilles entraînées sur Didi</h2>
   <p style={{lineHeight:1.7}}>Sur le Mac où les modèles ont été sauvegardés, ouvre un essai séparé. Tu pourras enregistrer une phrase ou choisir un fichier audio. Les deux modèles restent expérimentaux et peuvent faire beaucoup d’erreurs.</p>
   <div style={{display:'flex',flexWrap:'wrap',gap:12}}>
    <a href="http://127.0.0.1:8795/?modele=moonshine" target="_blank" rel="noopener noreferrer" style={{...button,display:'inline-block',textDecoration:'none',margin:0}}>Essayer Moonshine Didi sur ce Mac</a>
    <a href="http://127.0.0.1:8795/?modele=zipformer" target="_blank" rel="noopener noreferrer" style={{...button,display:'inline-block',textDecoration:'none',margin:0}}>Essayer Zipformer Didi sur ce Mac</a>
   </div>
   <p style={{fontSize:14,lineHeight:1.7,marginBottom:0}}>Ces essais locaux nécessitent le Mac et son lanceur « BIA-Essai-Didi-deux-oreilles ». Ils ne changent pas l’oreille utilisée dans tes conversations. L’essai Moonshine ci-dessous conserve le modèle précédent.</p>
  </section>
  <label htmlFor="trial-code" style={{display:'block',margin:'24px 0 8px'}}>Ton code BIA</label>
  <input id="trial-code" type="password" autoComplete="off" value={code} disabled={busy||recording} onChange={e=>{setCode(e.target.value);setReady(false);releaseWorker();}} style={{...input,width:'100%'}}/>
  <label htmlFor="trial-engine" style={{display:'block',margin:'20px 0 8px'}}>Oreille à essayer</label>
  <select id="trial-engine" value={selected} disabled={busy||recording} onChange={e=>{setSelected(e.target.value);setReady(false);releaseWorker();setText('');setStatus('Prépare Moonshine pour commencer.');}} style={{...input,width:'100%'}}>
   <option value="">Choisir une oreille d’essai</option><option value="moonshine">Moonshine — meilleur modèle sauvegardé</option><option value="zipformer" disabled>Zipformer — essai pas encore disponible</option>
  </select>
  {!ready&&<button onClick={()=>void prepare()} disabled={selected!=='moonshine'||busy||recording} style={{...button,opacity:selected==='moonshine'&&!busy?1:.5}}>Préparer Moonshine</button>}
  {progress!==null&&<progress value={progress} max={100} aria-label="Préparation de l’oreille" style={{display:'block',width:'100%',height:12}}/>}
  {ready&&<section data-testid="trial-ready" style={{padding:22,margin:'24px 0',background:'#fff',borderRadius:16}}>
   <button onClick={()=>void record()} disabled={busy} style={{...button,background:recording?'#a13c34':'#195b45'}}>{recording?'Arrêter et transcrire':'Parler à Moonshine'}</button>
   <label htmlFor="trial-audio" style={{display:'block',margin:'12px 0'}}>Ou choisir un enregistrement de 30 secondes maximum</label><input id="trial-audio" type="file" accept="audio/*" disabled={busy||recording} onChange={e=>{const file=e.target.files?.[0];if(file)void transcribe(file);e.target.value='';}} style={{maxWidth:'100%'}}/>
  </section>}
  <p role="status" data-testid="trial-status" style={{lineHeight:1.6,minHeight:28}}>{status}</p>
  {audioUrl&&<audio controls src={audioUrl} style={{width:'100%',margin:'8px 0 20px'}}/>}
  <output data-testid="trial-result" aria-live="polite" style={{display:'block',minHeight:100,padding:22,borderRadius:16,background:'#fff',whiteSpace:'pre-wrap',lineHeight:1.7}}>{text||'La transcription apparaîtra ici.'}</output>
  <p style={{fontSize:14,lineHeight:1.7,margin:'24px 0 40px'}}>Ce modèle reste expérimental : il peut se tromper et produire du texte sur du silence. Cet essai n’entraîne pas le modèle et n’active aucun remplacement automatique.</p>
 </div></main>;
}
const input:CSSProperties={padding:'14px 12px',border:'1px solid #a6bbae',borderRadius:10,background:'#fff',color:'#183b32',fontSize:16};
const button:CSSProperties={padding:'15px 22px',margin:'20px 0 10px',border:0,borderRadius:12,background:'#195b45',color:'#fff',fontSize:17,cursor:'pointer'};
