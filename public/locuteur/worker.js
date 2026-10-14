importScripts('/piper/runtime/ort.wasm.min.js');
ort.env.wasm.wasmPaths='/piper/runtime/';ort.env.wasm.numThreads=1;
let session=null,reference=null,epoch=0,frames=[],samples=0,busy=false,last=0;
const hash=async b=>Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',b)),x=>x.toString(16).padStart(2,'0')).join('');
async function prepare(){
 const r=await fetch('/locuteur/model.onnx');if(!r.ok)throw Error('model_HTTP_'+r.status);
 const bytes=await r.arrayBuffer();
 if(bytes.byteLength!==22193734||await hash(bytes)!=='a7586b34c8db1bbf32c64efc2b269be54f66787e50320c4472614bbe95218a81')throw Error('model_checksum');
 session=await ort.InferenceSession.create(bytes,{executionProviders:['wasm']});postMessage({type:'pret'});
}
function cosine(a,b){let ab=0,aa=0,bb=0;for(let i=0;i<192;i++){ab+=a[i]*b[i];aa+=a[i]*a[i];bb+=b[i]*b[i];}return ab/Math.sqrt(aa*bb);}
async function infer(fiable){
 if((!reference&&!fiable)||!session||busy||samples<19200||Date.now()-last<600)return;
 busy=true;last=Date.now();const generation=epoch;
 const pcm=new Float32Array(samples);let n=0;for(const f of frames){pcm.set(f,n);n+=f.length;}
 try{
  const begin=performance.now();const out=await session.run({audio:new ort.Tensor('float32',pcm,[1,1,pcm.length])});
  const e=Float32Array.from(out.embs.data);if(e.length!==192||!e.every(Number.isFinite))throw Error('embedding_invalid');
  if(generation!==epoch)return;
  let score=null;if(!reference){reference=e;}else score=cosine(reference,e);
  postMessage({type:'voix',epoch:generation,score,reference:true,ms:Math.round(performance.now()-begin)});
 }catch{postMessage({type:'erreur',epoch:generation});}finally{busy=false;}
}
onmessage=({data:d})=>{
 if(d.type==='reset'){epoch=d.epoch;reference=null;frames=[];samples=0;return;}
 if(d.type==='nouvelle'){epoch=d.epoch;frames=[];samples=0;return;}
 if(d.type==='pcm'&&d.epoch===epoch){frames.push(d.pcm);samples+=d.pcm.length;while(samples>32000){samples-=frames.shift().length;}void infer(d.fiable);}
};
void prepare().catch(()=>postMessage({type:'erreur'}));
