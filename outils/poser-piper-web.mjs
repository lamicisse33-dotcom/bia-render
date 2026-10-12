import {copyFile,mkdir} from 'node:fs/promises';
const root=new URL('../',import.meta.url);
await mkdir(new URL('public/piper/runtime/',root),{recursive:true});
for(const name of ['ort.wasm.min.js','ort-wasm-simd-threaded.mjs','ort-wasm-simd-threaded.wasm'])
 await copyFile(new URL('node_modules/onnxruntime-web/dist/'+name,root),new URL('public/piper/runtime/'+name,root));
