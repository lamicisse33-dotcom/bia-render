importScripts('/piper/runtime/ort.wasm.min.js','/piper/core.js','/speecht5/core.js');
ort.env.wasm.wasmPaths='/piper/runtime/';ort.env.wasm.numThreads=1;
let preparation=null,sessions=null,config=null,speaker=null,queue=Promise.resolve();
const progress=message=>postMessage({progress:message});
const hash=async b=>Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',b)),x=>x.toString(16).padStart(2,'0')).join('');
async function prepare(code){
 if(preparation)return preparation;
 preparation=(async()=>{
  progress('Préparation de SpeechT5…');
  const access=await fetch('/api/acces',{headers:{'x-bia-code':code},cache:'no-store'});if(!access.ok)throw Error('Ouvre Bia avec un code valide pour préparer SpeechT5.');
  const r=await fetch('/speecht5/manifest.json');if(!r.ok)throw Error('Les fichiers SpeechT5 sont indisponibles.');const manifest=await r.json();
  let cache=null;try{cache=await caches.open('bia-speecht5-model-v1');}catch{}
  const buffers={};let loaded=0;
  for(const [name,file] of Object.entries(manifest.files)){
   const key='/__bia_speecht5__/'+file.sha256;
   let bytes=null;try{const saved=await cache?.match(key);if(saved)bytes=await saved.arrayBuffer();}catch{}
   if(bytes&&(bytes.byteLength!==file.bytes||await hash(bytes)!==file.sha256)){bytes=null;try{await cache?.delete(key);}catch{}}
   if(!bytes){const data=new Uint8Array(file.bytes);let offset=0;
    for(let index=0;index<file.parts.length;index++){
     progress('Téléchargement SpeechT5 : '+Math.round((loaded+offset)/manifest.total_bytes*100)+' % · une première fois');
     const response=await fetch('/api/speecht5-web?file='+encodeURIComponent(name)+'&part='+index,{headers:{'x-bia-code':code},signal:AbortSignal.timeout(90000)});
     if(!response.ok)throw Error(response.status===401?'Ton code n’est plus valide.':'Téléchargement SpeechT5 indisponible. Réessaie.');
     const chunk=await response.arrayBuffer();if(chunk.byteLength!==file.parts[index].bytes||await hash(chunk)!==file.parts[index].sha256)throw Error('Téléchargement SpeechT5 incomplet. Réessaie.');data.set(new Uint8Array(chunk),offset);offset+=chunk.byteLength;
    }
    bytes=data.buffer;if(await hash(bytes)!==file.sha256)throw Error('Le modèle SpeechT5 reçu est incomplet.');
    try{await cache?.put(key,new Response(bytes));}catch{}
   }buffers[name]=bytes;loaded+=file.bytes;
  }
  config=JSON.parse(new TextDecoder().decode(buffers['tokenizer.json']));
  for(const fixture of config.fixtures){if(fixture.ids.includes(config.unk))continue;if(JSON.stringify(BiaSpeechT5Core.encode(fixture.text,config))!==JSON.stringify(fixture.ids))throw Error('Le tokenizer SpeechT5 du navigateur ne correspond pas au modèle.');}
  const vector=new Float32Array(buffers['speaker.bin']);if(vector.length!==512||!vector.every(Number.isFinite))throw Error('Profil SpeechT5 invalide.');speaker=new ort.Tensor('float32',vector,[1,512]);
  sessions={};for(const key of ['encoder','decoder','past','vocoder']){progress('Chargement SpeechT5 : '+key+'…');sessions[key]=await ort.InferenceSession.create(buffers[key+'.onnx'],{executionProviders:['wasm'],graphOptimizationLevel:'all'});delete buffers[key+'.onnx'];}
  progress('SpeechT5 prêt · voix expérimentale.');
 })().catch(async e=>{preparation=null;const loaded=sessions;sessions=null;if(loaded)for(const session of Object.values(loaded))await session.release().catch(()=>{});speaker?.dispose();speaker=null;throw e;});return preparation;
}
async function synthesize(text){
 const ids=BiaSpeechT5Core.encode(text,config);if(!ids.length)throw Error('Le texte à lire est vide.');
 const input=new ort.Tensor('int64',BigInt64Array.from(ids,BigInt),[1,ids.length]);let encoded,sequence=new ort.Tensor('float32',new Float32Array(80),[1,1,80]),past={},pieces=[],stopped=false;
 try{
  encoded=await sessions.encoder.run({input_ids:input});
  const max=Math.floor(ids.length/config.reduction*20);
  for(let index=0;index<max;index++){
   const feeds={speaker_embeddings:speaker,output_sequence:sequence,encoder_attention_mask:encoded.encoder_attention_mask};
   if(index===0)feeds.encoder_hidden_states=encoded.encoder_outputs;else Object.assign(feeds,past);
   const result=await (index===0?sessions.decoder:sessions.past).run(feeds);
   pieces.push(new Float32Array(result.spectrum.data));stopped=Array.from(result.prob.data).some(p=>p>=.5);
   sequence.dispose();sequence=result.output_sequence_out;
   for(const [name,tensor] of Object.entries(result)){
    if(name.startsWith('present.')){const key=name.replace('present.','past_key_values.');past[key]?.dispose();past[key]=tensor;}
    else if(name!=='output_sequence_out')tensor.dispose();
   }
   if(stopped)break;
  }
  if(!stopped)throw Error('SpeechT5 n’a pas produit une fin de phrase fiable pour ce texte. Essaie une phrase plus courte ou reprends Khalam Voice.');
  const length=pieces.reduce((n,p)=>n+p.length,0),data=new Float32Array(length);let offset=0;for(const p of pieces){data.set(p,offset);offset+=p.length;}
  const spec=new ort.Tensor('float32',data,[length/config.melBins,config.melBins]);
  try{const result=await sessions.vocoder.run({spectrogram:spec});try{return KhalamPiperCore.wav(result.waveform.data,config.sampleRate);}finally{result.waveform.dispose();}}finally{spec.dispose();}
 }finally{input.dispose();sequence.dispose();Object.values(past).forEach(t=>t.dispose());if(encoded)Object.values(encoded).forEach(t=>t.dispose());}
}
onmessage=({data:d})=>{const job=async()=>{try{
 await prepare(d.code);if(d.kind==='prepare'){postMessage({id:d.id,ready:true});return;}
 const parts=BiaSpeechT5Core.split(d.text),text=parts[d.part];if(text===undefined){postMessage({id:d.id,parts:parts.length,part:d.part,empty:true});return;}
 const start=performance.now(),wav=await synthesize(text);postMessage({id:d.id,parts:parts.length,part:d.part,wav,ms:Math.round(performance.now()-start),speed:1},[wav]);
 }catch(e){postMessage({id:d.id,error:e.message||String(e)});}};queue=queue.then(job,job);};
