/** Complete-recording fallback for long turns. No concurrent ASR or speculative actions. */
export type SonLong={sampleRate:number;length:number;numberOfChannels:number;getChannelData:(n:number)=>Float32Array};
export function decoupesLongues(son:SonLong){
 const rate=son.sampleRate,out:Array<[number,number]>=[];let start=0;
 if(!Number.isFinite(rate)||rate<8000||rate>96000||son.length>rate*300)throw Error('Durée audio invalide');
 const data=son.getChannelData(0);
 while(start<son.length){
  let end=Math.min(son.length,start+Math.floor(rate*25));
  if(end<son.length){
   const window=Math.floor(rate*.04);let chosen=end,best=Infinity;
   // Prefer a quiet boundary; every decoded sample still belongs to one segment.
   for(let i=end-Math.floor(rate*3);i<=end-window;i+=window){let energy=0;for(let j=i;j<i+window;j++)energy+=data[j]*data[j];if(energy<best){best=energy;chosen=i+Math.floor(window/2);}}
   end=chosen;
  }
  out.push([start,end]);start=end;
 }return out;
}
export function wavLong(son:SonLong,start:number,end:number){
 const out=new ArrayBuffer(44+(end-start)*2),v=new DataView(out),text=(p:number,s:string)=>{for(let i=0;i<s.length;i++)v.setUint8(p+i,s.charCodeAt(i));};
 text(0,'RIFF');v.setUint32(4,out.byteLength-8,true);text(8,'WAVEfmt ');v.setUint32(16,16,true);v.setUint16(20,1,true);v.setUint16(22,1,true);v.setUint32(24,son.sampleRate,true);v.setUint32(28,son.sampleRate*2,true);v.setUint16(32,2,true);v.setUint16(34,16,true);text(36,'data');v.setUint32(40,out.byteLength-44,true);
 const channels=Array.from({length:son.numberOfChannels},(_,i)=>son.getChannelData(i));
 for(let i=start;i<end;i++){let x=0;for(const c of channels)x+=c[i];x=Math.max(-1,Math.min(1,x/channels.length));v.setInt16(44+(i-start)*2,Math.round(x*(x<0?32768:32767)),true);}return new Blob([out],{type:'audio/wav'});
}
export async function ecouterLongue(son:SonLong,indice:string,envoyer:(f:FormData)=>Promise<Response>,actuel:()=>boolean){
 const debut=Date.now(),textes:string[]=[],bruts:string[]=[],suggestions:string[]=[],coupes=decoupesLongues(son);
 for(const [start,end] of coupes){
  if(!actuel())throw Error('Écoute annulée');
  const f=new FormData();f.set('audio',wavLong(son,start,end),'parole.wav');f.set('indice_langue',indice);
  const r=await envoyer(f),d=await r.json();
  if(!actuel())throw Error('Écoute annulée');
  if(!r.ok||d.panne||d.transcription_rejetee||typeof d.texte!=='string')throw Error('Un passage de la longue intervention n’a pas pu être transcrit. Aucune réponse partielle envoyée.');
  textes.push(d.texte.trim());bruts.push(String(d.texte_brut??d.texte).trim());if(Array.isArray(d.suggestions_ecriture))suggestions.push(...d.suggestions_ecriture.filter((x:unknown)=>typeof x==='string'));
 }
 return {texte:textes.filter(Boolean).join(' '),texte_brut:bruts.filter(Boolean).join(' '),suggestions_ecriture:[...new Set(suggestions)],extrait:null,au_fil_de_leau:false,longue:{secondes:son.length/son.sampleRate,segments:coupes.length,ms:Date.now()-debut}};
}
