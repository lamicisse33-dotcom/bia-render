importScripts('/piper/runtime/ort.wasm.min.js','/piper/core.js');
ort.env.wasm.wasmPaths='/piper/runtime/';
// One thread works on Safari without changing the application's isolation headers.
ort.env.wasm.numThreads=1;
let prepared=null,session=null,config=null,queue=Promise.resolve();
const progress=(message)=>postMessage({progress:message});
const hash=async(bytes)=>Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',bytes)),b=>b.toString(16).padStart(2,'0')).join('');
async function prepare(code){
 if(prepared)return prepared;
 prepared=(async()=>{
  progress('Préparation de Khalam V2…');
  const [mr,cr]=await Promise.all([fetch('/piper/manifest.json'),fetch('/piper/khalam-v2.json')]);
  if(!mr.ok||!cr.ok)throw Error('Les fichiers de Khalam V2 sont indisponibles.');
  const manifest=await mr.json();config=await cr.json();
  let cache=null,bytes=null;
  const key='/__khalam_v2_model__/'+manifest.sha256;
  try{cache=await caches.open('bia-piper-model-v1');const saved=await cache.match(key);if(saved)bytes=await saved.arrayBuffer();}catch{}
  if(bytes&&(bytes.byteLength!==manifest.bytes||await hash(bytes)!==manifest.sha256)){bytes=null;await cache?.delete(key);}
  if(!bytes){
   const model=new Uint8Array(manifest.bytes);
   for(let part=0;part<manifest.parts.length;part++){
    progress('Téléchargement de Khalam V2 : '+Math.round(part/manifest.parts.length*100)+' % (77 Mo, une première fois)');
    const r=await fetch('/api/piper-web?part='+part,{headers:{'x-bia-code':code},signal:AbortSignal.timeout(60000)});
    if(!r.ok)throw Error(r.status===401?'Ouvre BIA avec ton code pour préparer cette voix.':'Le modèle de secours est indisponible. Réessaie.');
    const chunk=await r.arrayBuffer();
    if(await hash(chunk)!==manifest.parts[part])throw Error('Téléchargement incomplet. Réessaie la préparation.');
    model.set(new Uint8Array(chunk),part*manifest.partSize);
   }
   bytes=model.buffer;
   if(await hash(bytes)!==manifest.sha256)throw Error('Le modèle Khalam V2 reçu ne correspond pas à la version installée.');
   try{await cache?.put(key,new Response(bytes));}catch{progress('Mémoire locale pleine : la voix reste utilisable dans cette fenêtre.');}
  }
  progress('Chargement du moteur de secours…');
  session=await ort.InferenceSession.create(bytes,{executionProviders:['wasm'],graphOptimizationLevel:'all'});
  progress('Khalam V2 prêt dans ce navigateur.');
 })().catch(e=>{prepared=null;throw e;});
 return prepared;
}
onmessage=({data:d})=>{
 const job=async()=>{
  try{
   await prepare(d.code);
   if(d.kind==='prepare'){postMessage({id:d.id,ready:true});return;}
   const parts=KhalamPiperCore.split(d.text),text=parts[d.part];
   if(text===undefined){postMessage({id:d.id,parts:parts.length,empty:true});return;}
   const speaker=d.speaker??config.default_speaker_id;
   if(!Number.isInteger(speaker)||![config.speaker_id_map.didi,config.speaker_id_map.wolof_tts_female].includes(speaker)||speaker<0||speaker>=config.num_speakers)throw Error('Cette voix féminine Piper est indisponible.');
   const ids=KhalamPiperCore.encode(text,config),inf=config.inference;
   const start=performance.now(),speed=Math.max(.7,Math.min(1.2,Number(d.speed)||1));
   const inputs={input:new ort.Tensor('int64',BigInt64Array.from(ids,BigInt),[1,ids.length]),
    input_lengths:new ort.Tensor('int64',BigInt64Array.from([BigInt(ids.length)]),[1]),
    scales:new ort.Tensor('float32',new Float32Array([inf.noise_scale,inf.length_scale/speed,inf.noise_w]),[3]),
    sid:new ort.Tensor('int64',BigInt64Array.from([BigInt(speaker)]),[1])};
   const result=await session.run(inputs);
   try{
    const wav=KhalamPiperCore.wav(result.output.data,config.audio.sample_rate);
    postMessage({id:d.id,parts:parts.length,part:d.part,wav,ms:Math.round(performance.now()-start),speed},[wav]);
   }finally{Object.values(inputs).forEach(t=>t.dispose());Object.values(result).forEach(t=>t.dispose());}
  }catch(e){postMessage({id:d.id,error:e.message||String(e)});}
 };
 queue=queue.then(job,job);
};
