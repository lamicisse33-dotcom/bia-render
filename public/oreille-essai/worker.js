/* The trial owns this worker. It never intercepts BIA requests or changes storage/settings. */
import {pipeline,env,Tensor} from 'https://cdn.jsdelivr.net/npm/@huggingface/transformers@3.8.1/dist/transformers.min.js';
env.allowRemoteModels=false;
env.allowLocalModels=true;
env.useBrowserCache=false;
env.useFSCache=false;
env.useCustomCache=true;
env.backends.onnx.wasm.numThreads=1;
env.backends.onnx.wasm.proxy=false;
env.backends.onnx.wasm.wasmPaths='https://cdn.jsdelivr.net/npm/@huggingface/transformers@3.8.1/dist/';
let model=null,code='',manifest=null,loading=null,busy=false;
const base=self.location.origin+'/oreille-essai-modele/';
const hex=bytes=>[...new Uint8Array(bytes)].map(v=>v.toString(16).padStart(2,'0')).join('');
const hash=async bytes=>hex(await crypto.subtle.digest('SHA-256',bytes));
const post=(type,data={})=>self.postMessage({type,...data});
async function readAsset(url){
 for(let attempt=0;attempt<4;attempt++){
  try{
   const r=await fetch(url,{headers:{'x-bia-code':code},signal:AbortSignal.timeout(60000)});
   if(r.status===429||r.status>=500)throw Error('Réseau momentanément indisponible.');
   const bytes=await r.arrayBuffer();return new Response(bytes,{status:r.status,headers:r.headers});
  }catch(e){if(attempt===3)throw Error('Le téléchargement a été interrompu. Vérifie la connexion et réessaie.');await new Promise(r=>setTimeout(r,1000*(attempt+1)));}
 }
}
const buffers=new Map();
const progressByFile=new Map();
env.customCache={
 async match(url){
  const value=String(url);if(!value.startsWith(base))return undefined;
  const name=value.slice(base.length),file=manifest?.files[name];
  if(!file)return new Response(null,{status:404});
  if(buffers.has(name))return new Response(buffers.get(name));
  const whole=new Uint8Array(file.bytes);let offset=0;
  for(let i=0;i<file.parts.length;i++){
   const part=file.parts[i];const r=await readAsset('/api/oreille-essai?file='+encodeURIComponent(name)+'&part='+i);
   if(!r.ok)throw Error('Téléchargement de l’oreille impossible ('+r.status+').');
   const bytes=new Uint8Array(await r.arrayBuffer());
   if(bytes.length!==part.bytes||await hash(bytes)!==part.sha256)throw Error('Le fichier reçu est incomplet. Réessaie.');
   whole.set(bytes,offset);offset+=bytes.length;
   progressByFile.set(name,offset);post('progress',{message:'Préparation de l’oreille…',percent:Math.round(100*[...progressByFile.values()].reduce((a,b)=>a+b,0)/manifest.total_bytes)});
  }
  if(await hash(whole)!==file.sha256)throw Error('Vérification de l’oreille impossible.');
  buffers.set(name,whole);return new Response(whole);
 },async put(){}
};
async function prepare(credential){
 if(model)return;
 code=credential;
 const r=await readAsset('/api/oreille-essai');
 if(r.status===401)throw Error('Ton code BIA est nécessaire pour préparer cet essai.');
 if(!r.ok)throw Error('L’oreille est momentanément indisponible.');
 const data=await r.json();if(!data.ready)throw Error('L’installation de l’oreille est encore en cours.');manifest=data.manifest;
 model=await pipeline('automatic-speech-recognition',base,{device:'wasm',dtype:'fp32',local_files_only:true});
 // Optimum's verified encoder requires the audio mask; this single-clip trial has no padding.
 if(model.model.sessions.model.inputNames.includes('attention_mask'))model.model.forward_params=[...new Set([...model.model.forward_params,'attention_mask'])];
 buffers.clear();post('ready',{revision:manifest.revision});
}
self.onmessage=async({data:d})=>{
 if(busy){post('error',{id:d.id,message:'Un essai est déjà en cours.'});return;}
 busy=true;
 try{
  loading??=prepare(d.code).catch(e=>{loading=null;throw e;});await loading;
  if(d.kind==='prepare'){post('prepared',{id:d.id});return;}
  if(d.kind!=='transcribe')throw Error('Demande inconnue.');
  const audio=new Float32Array(d.audio);if(!audio.length||audio.length>30*16000||!audio.every(Number.isFinite))throw Error('Choisis un audio de 30 secondes maximum.');
  const start=performance.now();const inputs=await model.processor(audio);
  if(model.model.sessions.model.inputNames.includes('attention_mask'))inputs.attention_mask=new Tensor('int64',new BigInt64Array(audio.length).fill(1n),[1,audio.length]);
  const tokens=await model.model.generate({...inputs,max_new_tokens:128,do_sample:false});
  const result={text:model.processor.batch_decode(tokens,{skip_special_tokens:true})[0]};
  post('result',{id:d.id,text:result.text,ms:performance.now()-start,seconds:audio.length/16000,revision:manifest.revision});
 }catch(e){post('error',{id:d.id,message:e?.message||'L’essai n’a pas abouti.'});}
 finally{busy=false;}
};
