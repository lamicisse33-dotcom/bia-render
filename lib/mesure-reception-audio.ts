/** Observe delivery without changing packets, buffering the full audio, or
 * confusing metadata/HTTP bytes with playable sound. Generation overlap needs
 * producer-side timing; these measurements alone never claim to prove it. */
export function mesurerReceptionAudio(response:Response,debut=performance.now(),horloge=()=>performance.now()){
 if(!response.body)throw Error('Flux audio absent');
 const reader=response.body.getReader(),decoder=new TextDecoder();let buffer='';
 const mesure={premier_octet_ms:null as number|null,metadonnees_ms:null as number|null,
  premier_audio_ms:null as number|null,dernier_audio_ms:null as number|null,
  fin_flux_ms:null as number|null,fermeture_http_ms:null as number|null,
  generation_ms:null as number|null,lectures_http:0,lectures_avec_audio:0,
  paquets_audio:0,octets_recus:0,audio_en_cache:false,arrivees_audio_ms:[] as number[]};
 function ligne(raw:string,ms:number){
  if(!raw.trim())return false;
  let d:any;try{d=JSON.parse(raw);}catch{return false;}
  if(d.type==='meta'){mesure.metadonnees_ms??=ms;mesure.audio_en_cache||=d.audio_en_cache===true;}
  if(d.type==='audio'&&typeof d.audio_base64==='string'&&d.audio_base64.length>0&&Number.isSafeInteger(d.samples)&&d.samples>0){
   mesure.premier_audio_ms??=ms;mesure.dernier_audio_ms=ms;mesure.paquets_audio++;
   if(mesure.arrivees_audio_ms.length<16)mesure.arrivees_audio_ms.push(ms);
   return true;
  }
  if(d.type==='end'){
   mesure.fin_flux_ms??=ms;
   if(typeof d.generation_ms==='number'&&Number.isFinite(d.generation_ms)&&d.generation_ms>=0&&d.generation_ms<=300000)mesure.generation_ms=d.generation_ms;
  }
  return false;
 }
 const suivi=new ReadableStream<Uint8Array>({
  async pull(controller){
   try{
    const r=await reader.read(),ms=Math.max(0,Math.round(horloge()-debut));
    if(r.done){buffer+=decoder.decode();if(buffer.trim())ligne(buffer,ms);buffer='';mesure.fermeture_http_ms=ms;reader.releaseLock();controller.close();return;}
    if(r.value.byteLength){mesure.premier_octet_ms??=ms;mesure.lectures_http++;mesure.octets_recus+=r.value.byteLength;}
    buffer+=decoder.decode(r.value,{stream:true});
    // The normal audio consumer validates the protocol. A malformed/oversized
    // line must not make this optional observer retain unbounded text.
    if(buffer.length>2_000_000)buffer='';
    let n,audio=false;
    while((n=buffer.indexOf('\n'))>=0){audio=ligne(buffer.slice(0,n),ms)||audio;buffer=buffer.slice(n+1);}
    if(audio)mesure.lectures_avec_audio++;
    controller.enqueue(r.value);
   }catch(error){void reader.cancel().catch(()=>{});controller.error(error);}
  },
  cancel(reason){return reader.cancel(reason);},
 },{highWaterMark:0});
 return {response:new Response(suivi,{status:response.status,statusText:response.statusText,headers:response.headers}),
  bilan:()=>({...mesure,arrivees_audio_ms:[...mesure.arrivees_audio_ms],
   ecart_premier_dernier_audio_ms:mesure.premier_audio_ms===null||mesure.dernier_audio_ms===null?null:mesure.dernier_audio_ms-mesure.premier_audio_ms,
   generation_progressive_confirmee:false})};
}
export type MesureReceptionAudio=ReturnType<ReturnType<typeof mesurerReceptionAudio>['bilan']>;
