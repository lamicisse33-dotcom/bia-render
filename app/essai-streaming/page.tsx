'use client';
import {useEffect,useRef,useState} from 'react';
import {ouvrirFluxVoix} from '@/lib/flux-khalam';
const exemples=[{langue:'wo',texte:'Dañu bëgg ma def lu ma bëggul.'},{langue:'wo',texte:'Mu dem ci marse bi, jënd soble ak tamaate, te dellusi ci kër ga.'},{langue:'fr',texte:'Le budget doit rester accessible à tous.'}];
export default function EssaiStreaming(){
 const [code,setCode]=useState(''),[phrase,setPhrase]=useState(exemples[0].texte),[langue,setLangue]=useState('wo'),[occupe,setOccupe]=useState(false),[message,setMessage]=useState(''),[resultats,setResultats]=useState<any[]>([]),[rapport,setRapport]=useState<any>(null);
 const actif=useRef<{abort:AbortController;context:AudioContext}|null>(null);
 useEffect(()=>()=>{actif.current?.abort.abort();void actif.current?.context.close();},[]);
 function arreter(){actif.current?.abort.abort();void actif.current?.context.close();setMessage('Essai arrêté.');}
 async function lancer(mode:'complet'|'stream'){
  if(actif.current)return;
  const context=new AudioContext(),abort=new AbortController();actif.current={context,abort};setOccupe(true);setMessage('Vérification du code…');
  let timer:ReturnType<typeof setTimeout>|undefined;
  try{
   await context.resume();const headers={'content-type':'application/json','x-bia-code':code};
   const auth=await fetch('/api/essai-streaming',{headers,signal:abort.signal});if(!auth.ok)throw Error('Saisis ton code maître.');setRapport(await auth.json());
   const debut=performance.now();let prochaine=context.currentTime,dernier:AudioBufferSourceNode|undefined,premierAudio:number|null=null,premierSon:number|null=null,trou=0,paquets=0,parties=1,cache=false;
   const toucher=()=>{clearTimeout(timer);timer=setTimeout(()=>abort.abort(),30000);};toucher();
   async function programmer(b64:string){
    toucher();premierAudio??=performance.now()-debut;
    const bytes=Uint8Array.from(atob(b64),c=>c.charCodeAt(0));const audio=await context.decodeAudioData(bytes.buffer);
    if(abort.signal.aborted)throw Error('Essai arrêté.');
    const now=context.currentTime,debutSon=Math.max(prochaine,now+.06);
    if(paquets)trou=Math.max(trou,Math.max(0,debutSon-prochaine)*1000);
    premierSon??=performance.now()-debut+(debutSon-now)*1000;
    const node=context.createBufferSource();node.buffer=audio;node.connect(context.destination);node.start(debutSon);prochaine=debutSon+audio.duration;dernier=node;paquets++;
    setMessage(`${mode==='stream'?'Streaming':'Clip complet'} : ${paquets} morceau(s) reçu(s), lecture en cours…`);
   }
   for(let partie=0;partie<parties;partie++){
    const r=await fetch('/api/chatterbox-test/bia'+(mode==='stream'?'/stream':''),{method:'POST',headers,signal:abort.signal,body:JSON.stringify({texte:phrase,langue,voice:'female',partie})});
    if(!r.ok)throw Error(`La voix n’a pas répondu (HTTP ${r.status}).`);
    if(mode==='stream'){
     // Observe cache metadata without buffering the stream or duplicating requests.
     const lecteur=r.body!.getReader(),decoder=new TextDecoder();let prefix='';let metaVue=false;
     const suivi=new ReadableStream<Uint8Array>({async pull(c){try{const v=await lecteur.read();if(v.done){c.close();return;}if(!metaVue){prefix+=decoder.decode(v.value,{stream:true});const n=prefix.indexOf('\n');if(n>=0){const d=JSON.parse(prefix.slice(0,n));cache||=d.audio_en_cache===true;metaVue=true;prefix='';}}c.enqueue(v.value);}catch(e){c.error(e);}},cancel(){return lecteur.cancel();}});
     const first=await ouvrirFluxVoix(new Response(suivi,{status:r.status}),()=>{void lecteur.cancel().catch(()=>{});},toucher);parties=first.parties;
     if(!first.audio)throw Error('Audio vide.');await programmer(first.audio);for await(const b64 of first.flux!)await programmer(b64);
    }else{
     const d=await r.json();if(!d.audio)throw Error('Audio vide.');parties=d.parties;cache||=d.audio_en_cache===true;await programmer(d.audio);
    }
   }
   clearTimeout(timer);
   const mesure={mode,langue,premier_audio_ms:Math.round(premierAudio!),demarrage_programme_ms:Math.round(premierSon!),reception_complete_ms:Math.round(performance.now()-debut),trou_max_ms:Math.round(trou),paquets,parties,audio_en_cache:cache,integrite:true};
   setResultats(x=>[...x,mesure]);
   await fetch('/api/essai-streaming',{method:'POST',headers,body:JSON.stringify(mesure),signal:abort.signal}).catch(()=>{});
   // Wait for scheduled playback, but cancellation must release the UI immediately.
   if(dernier&&prochaine>context.currentTime)await new Promise<void>(resolve=>{dernier!.onended=()=>resolve();abort.signal.addEventListener('abort',()=>resolve(),{once:true});if(abort.signal.aborted)resolve();});
   if(!abort.signal.aborted)setMessage('Lecture terminée. Vérifie surtout les mots manquants, la fin et les blancs entre morceaux.');
  }catch(e){setMessage(abort.signal.aborted?'Essai arrêté ou délai dépassé.':(e as Error).message);}
  finally{clearTimeout(timer);abort.abort();await context.close().catch(()=>{});actif.current=null;setOccupe(false);}
 }
 const champ={width:'100%',padding:12,borderRadius:8,border:'1px solid #555',background:'#171c26',color:'#fff',margin:'8px 0'};
 return <main style={{maxWidth:850,margin:'auto',padding:24,color:'#eee',background:'#0b1018',minHeight:'100vh',fontFamily:'system-ui'}}>
  <a href="/" style={{color:'#8cd8c0'}}>← Revenir à Bia</a><h1>Comparer l’écoute en streaming</h1>
  <p>Essai de la voix Khalam, séparé de ta conversation habituelle. Écoute la même phrase dans les deux modes, puis compare la clarté et le délai.</p>
  <label>Code maître<input type="password" autoComplete="off" value={code} onChange={e=>setCode(e.target.value)} disabled={occupe} style={champ}/></label>
  <label>Exemple<select disabled={occupe} style={champ} onChange={e=>{const x=exemples[Number(e.target.value)];setPhrase(x.texte);setLangue(x.langue);}}>{exemples.map((x,i)=><option key={i} value={i}>{x.langue.toUpperCase()} — {x.texte}</option>)}</select></label>
  <label>Phrase<textarea value={phrase} maxLength={400} disabled={occupe} onChange={e=>setPhrase(e.target.value)} rows={3} style={champ}/></label>
  <label>Langue<select value={langue} disabled={occupe} onChange={e=>setLangue(e.target.value)} style={champ}><option value="wo">Wolof</option><option value="fr">Français</option></select></label>
  <div style={{display:'flex',gap:12,flexWrap:'wrap'}}>{(['complet','stream'] as const).map(mode=><button key={mode} disabled={occupe||!code||!phrase.trim()} onClick={()=>void lancer(mode)} style={{padding:14,borderRadius:8}}>{mode==='complet'?'Écouter la version actuelle':'Écouter en streaming'}</button>)}<button disabled={!occupe} onClick={arreter} style={{padding:14,borderRadius:8}}>Arrêter</button></div>
  <p role="status" aria-live="polite">{message}</p>
  <p>Mesure à partir de l’envoi du texte : elle exclut le micro et le cerveau. Le démarrage affiché est celui programmé par le navigateur ; confirme à l’oreille ce que tu entends réellement.</p>
  <div style={{overflowX:'auto'}}><table style={{width:'100%',textAlign:'left'}}><thead><tr><th>Mode</th><th>Premier audio</th><th>Démarrage</th><th>Blanc max.</th><th>Cache</th></tr></thead><tbody>{resultats.map((r,i)=><tr key={i}><td>{r.mode}</td><td>{r.premier_audio_ms} ms</td><td>{r.demarrage_programme_ms} ms</td><td>{r.trou_max_ms} ms</td><td>{r.audio_en_cache?'oui':'non'}</td></tr>)}</tbody></table></div>
  <p>Une lecture depuis le cache est à comparer avec une autre lecture depuis le cache. Un flux complet ne garantit pas que tous les mots ont été bien prononcés.</p>
  {rapport&&<details><summary>Mesures automatiques du serveur</summary><pre style={{whiteSpace:'pre-wrap',fontSize:12}}>{JSON.stringify(rapport.serveur,null,2)}</pre></details>}
 </main>;
}
