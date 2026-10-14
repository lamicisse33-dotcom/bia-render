import {mkdir,readFile,writeFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
const destination=new URL('../public/locuteur/model.onnx',import.meta.url);
const sha='a7586b34c8db1bbf32c64efc2b269be54f66787e50320c4472614bbe95218a81';
const valide=b=>b.length===22193734&&createHash('sha256').update(b).digest('hex')===sha;
let bytes;try{bytes=await readFile(destination);}catch{}
if(!bytes||!valide(bytes)){
 const r=await fetch('https://huggingface.co/OpenVoiceOS/redimnet-b2-vox2-onnx/resolve/5127cc45350579cafea037f82634c2be04ca712d/redimnet_b2_vox2.onnx',{signal:AbortSignal.timeout(90000)});
 if(!r.ok)throw Error('Speaker model download HTTP '+r.status);
 bytes=Buffer.from(await r.arrayBuffer());if(!valide(bytes))throw Error('Speaker model checksum mismatch');
 await mkdir(new URL('../public/locuteur/',import.meta.url),{recursive:true});await writeFile(destination,bytes);
}
