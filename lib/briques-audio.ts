/** Collect one immutable complete brick from the existing continuous voice
 * route. One pronunciation snapshot serves every part; EOS is mandatory. */
export async function lireAudioBrique(response:Response,voice:'female'|'male',signal:AbortSignal,morceau?:(d:{audio:string;partie:number;parties:number;empreinte:string;voice:string})=>void){
 if(!response.ok||!response.body)throw Error('Audio incomplet');
 const reader=response.body.getReader(),decoder=new TextDecoder(),clips:ArrayBuffer[]=[];
 let buffer='',total=0,empreinte='',fin=false,preparation_ms=0,generation_ms=0,fabrication_ms=0,cache_parties=0;
 const annuler=()=>{void reader.cancel().catch(()=>{});};signal.addEventListener('abort',annuler,{once:true});
 const traiter=(line:string)=>{
  signal.throwIfAborted();const d=JSON.parse(line);
  if(fin)throw Error('Audio incomplet');
  if(d.type==='fin'){if(!total||clips.length!==total)throw Error('Audio incomplet');fin=true;return;}
  if(d.type!=='morceau'||d.voice!==voice||d.partie!==clips.length||!d.audio||!Number.isInteger(d.parties)||d.parties<1||d.parties>8||typeof d.empreinte!=='string'||!d.empreinte)throw Error('Audio incomplet');
  if(!clips.length){total=d.parties;empreinte=d.empreinte;preparation_ms=Number(d.preparation_ms)||0;}
  if(total!==d.parties||empreinte!==d.empreinte||clips.length>=total)throw Error('Audio incomplet');
  if(d.audio_en_cache)cache_parties++;else generation_ms+=Number(d.generation_ms)||0;fabrication_ms+=Number(d.fabrication_ms)||0;
  clips.push(Uint8Array.from(Buffer.from(d.audio,'base64')).buffer);
  morceau?.({audio:d.audio,partie:d.partie,parties:d.parties,empreinte:d.empreinte,voice:d.voice});
 };
 try{
  signal.throwIfAborted();
  for(;;){const r=await reader.read();signal.throwIfAborted();if(r.done)break;buffer+=decoder.decode(r.value,{stream:true});if(buffer.length>8_000_000)throw Error('Audio incomplet');let n;while((n=buffer.indexOf('\n'))>=0){const line=buffer.slice(0,n);buffer=buffer.slice(n+1);if(line.trim())traiter(line);}}
  buffer+=decoder.decode();if(buffer.trim())traiter(buffer);if(!fin)throw Error('Audio incomplet');
  return {clips,parties:total,preparation_ms,generation_ms,fabrication_ms,cache_parties};
 }finally{signal.removeEventListener('abort',annuler);void reader.cancel().catch(()=>{});}
}

