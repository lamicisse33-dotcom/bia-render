export type MorceauVoix = {
  parties:number; audio:string|null; type_mime?:string; fabrication_ms?:number;
  speed?:number; flux?:AsyncGenerator<string>; annuler?:()=>void;
};

/** NDJSON is parsed incrementally: return the first audio packet immediately,
 * without waiting for EOS, and retain the reader for the following packets. */
export async function ouvrirFluxVoix(response:Response, annuler:()=>void):Promise<MorceauVoix> {
  if(!response.ok||!response.body)throw new Error(`Voix en streaming indisponible (HTTP ${response.status})`);
  const reader=response.body.getReader();const decoder=new TextDecoder();
  let buffer="",ended=false,metadata:any=null,sequence=0,offset=0;
  async function next():Promise<any|null>{
    for(;;){
      const newline=buffer.indexOf("\n");
      if(newline>=0){const line=buffer.slice(0,newline);buffer=buffer.slice(newline+1);if(line.trim())return JSON.parse(line);continue;}
      const r=await reader.read();
      if(r.done){buffer+=decoder.decode();if(buffer.trim()){const line=buffer;buffer="";return JSON.parse(line);}return null;}
      buffer+=decoder.decode(r.value,{stream:true});
      if(buffer.length>2_000_000)throw new Error("Paquet vocal trop grand");
    }
  }
  async function packet():Promise<string|null>{
    for(;;){
      const frame=await next();
      if(!frame){if(!ended)throw new Error("Le flux vocal a été interrompu avant la fin.");return null;}
      if(frame.type==="error")throw new Error(frame.error||"Voix en streaming interrompue");
      if(frame.type==="meta"){
        if(metadata)throw new Error("Métadonnées vocales répétées");
        if(!Number.isSafeInteger(frame.parties)||frame.parties<1||frame.sample_rate!==24000)throw new Error("Métadonnées vocales invalides");
        metadata=frame;continue;
      }
      if(frame.type==="audio"){
        if(!metadata||frame.sequence!==sequence||frame.offset_samples!==offset||!Number.isSafeInteger(frame.samples)||frame.samples<=0||typeof frame.audio_base64!=="string")throw new Error("Morceau vocal manquant ou désordonné");
        sequence++;offset+=frame.samples;return frame.audio_base64;
      }
      if(frame.type==="end"){
        if(!metadata||frame.packets!==sequence||frame.samples!==offset)throw new Error("Lecture vocale incomplète");
        ended=true;return null;
      }
      throw new Error("Paquet vocal inconnu");
    }
  }
  try {
    const audio=await packet();
    if(!audio)throw new Error("Aucun son dans le flux vocal");
    async function* remaining(){
      try{for(;;){const audio=await packet();if(audio===null)return;yield audio;}}
      finally{void reader.cancel().catch(()=>{});annuler();}
    }
    return {parties:metadata.parties,audio,type_mime:"audio/wav",fabrication_ms:metadata.preparation_ms,
      flux:remaining(),annuler:()=>{void reader.cancel().catch(()=>{});annuler();}};
  } catch(error){void reader.cancel().catch(()=>{});annuler();throw error;}
}
