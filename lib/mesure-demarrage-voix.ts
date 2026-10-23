export type PhaseDemarrageVoix='reveil'|'decodage'|'prise_parole';
/** Observe playback setup without retaining the audio, text or response. */
export async function mesurerDemarrageVoix<T>(phase:PhaseDemarrageVoix,action:()=>Promise<T>):Promise<T>{
 const debut=Date.now();let ok=false;
 try{const r=await action();ok=true;return r;}
 finally{void fetch('/api/mesure',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({type:'demarrage_voix',phase,ms:Date.now()-debut,ok}),keepalive:true}).catch(()=>{});}
}
