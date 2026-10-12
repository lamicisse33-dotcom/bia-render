import {lireWav} from './mp3';
/** Join complete generated clips after trimming only their quiet edges. */
export function assemblerSonsCourants(clips:ArrayBuffer[],maximumSecondes=45){
 if(!clips.length)throw Error('audio_absent');
 let hz=0;const morceaux:Int16Array[]=[];
 for(const clip of clips){
  const w=lireWav(clip);if(w.canaux!==1||hz&&hz!==w.hz)throw Error('format_audio');hz=w.hz;
  let a=0,z=w.pcm.length;
  while(a<z&&Math.abs(w.pcm[a])<197)a++;
  while(z>a&&Math.abs(w.pcm[z-1])<197)z--;
  if(z-a<hz*.06)throw Error('audio_silencieux');
  const marge=Math.round(hz*.025);morceaux.push(w.pcm.slice(Math.max(0,a-marge),Math.min(w.pcm.length,z+marge)));
 }
 const n=morceaux.reduce((n,x)=>n+x.length,0);if(n/hz>maximumSecondes)throw Error('audio_trop_long');
 const out=new ArrayBuffer(44+n*2),v=new DataView(out);const mot=(p:number,t:string)=>{for(let i=0;i<t.length;i++)v.setUint8(p+i,t.charCodeAt(i));};
 mot(0,'RIFF');v.setUint32(4,36+n*2,true);mot(8,'WAVE');mot(12,'fmt ');v.setUint32(16,16,true);v.setUint16(20,1,true);v.setUint16(22,1,true);v.setUint32(24,hz,true);v.setUint32(28,hz*2,true);v.setUint16(32,2,true);v.setUint16(34,16,true);mot(36,'data');v.setUint32(40,n*2,true);
 let p=44;for(const m of morceaux)for(const s of m){v.setInt16(p,s,true);p+=2;}
 return {wav:out,secondes:n/hz};
}
