import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import ts from 'typescript';
function load(file,deps={}){const m={exports:{}};new Function('require','module','exports',ts.transpileModule(fs.readFileSync(file,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText)(n=>{assert(n in deps,n);return deps[n];},m,m.exports);return m.exports;}
const bounds=load('lib/bords-audio.ts');
const mp3=load('lib/mp3.ts',{'@breezystack/lamejs':{}});
const {assemblerSonsCourants}=load('lib/assembler-sons-courants.ts',{'./mp3':mp3,'./bords-audio':bounds});
function pcm(){const p=new Int16Array(24000);p.fill(50,2400,7200);p.fill(10000,7200,16800);p.fill(-30,16800,21600);return p;}
function wav(p){const b=new ArrayBuffer(44+p.length*2),v=new DataView(b);for(const [n,s]of [[0,'RIFF'],[8,'WAVE'],[12,'fmt '],[36,'data']])for(let i=0;i<s.length;i++)v.setUint8(n+i,s.charCodeAt(i));v.setUint32(4,b.byteLength-8,true);v.setUint32(16,16,true);v.setUint16(20,1,true);v.setUint16(22,1,true);v.setUint32(24,24000,true);v.setUint32(28,48000,true);v.setUint16(32,2,true);v.setUint16(34,16,true);v.setUint32(40,p.length*2,true);p.forEach((x,i)=>v.setInt16(44+i*2,x,true));return b;}
test('quiet beginning and ending survive; only digital zero is removed',()=>{
 const p=pcm(),b=bounds.bordsAudio([p],24000);assert.deepEqual(b,{debut:1800,fin:22200,silencieux:false});
 let a=0,z=p.length;while(a<z&&Math.abs(p[a])<197)a++;while(z>a&&Math.abs(p[z-1])<197)z--;a-=600;z+=600;
 assert.equal([...p].filter((s,i)=>s!==0&&(i<a||i>=z)).length,8400);
 assert([...p].every((s,i)=>s===0||(i>=b.debut&&i<b.fin)));
});
test('quiet-only clips are preserved and silent clips are explicit',()=>{
 const p=new Int16Array(5000).fill(1);assert.deepEqual(bounds.bordsAudio([p],24000),{debut:0,fin:5000,silencieux:false});
 assert.equal(mp3.lireWav(assemblerSonsCourants([wav(p)]).wav).pcm.length,5000);
 assert.throws(()=>assemblerSonsCourants([wav(new Int16Array(5000))]),/silencieux/);
});
test('all channels, source order and inner pauses are preserved by the web player',()=>{
 const left=new Float32Array(24000),right=Float32Array.from(pcm(),x=>x/32768);
 const source={length:24000,numberOfChannels:2,sampleRate:24000,getChannelData:c=>[left,right][c]};
 const ctx={createBuffer:(count,length,hz)=>{const channels=Array.from({length:count},()=>new Float32Array(length));return {length,sampleRate:hz,numberOfChannels:count,copyToChannel:(x,c)=>channels[c].set(x),getChannelData:c=>channels[c]};}};
 const out=bounds.sansSilence(ctx,source);assert.equal(out.length,20400);assert.deepEqual(out.getChannelData(1),right.slice(1800,22200));assert.equal(left.length,24000);
 const full={...source,getChannelData:()=>new Float32Array(24000).fill(.00001)};assert.equal(bounds.sansSilence(ctx,full),full);
});
test('stored audio assembly preserves every nonzero sample in order across clips',()=>{
 const p=pcm(),q=pcm().reverse();q.fill(0,10000,12000);
 const output=mp3.lireWav(assemblerSonsCourants([wav(p),wav(q)]).wav).pcm;
 assert.deepEqual(output,Int16Array.from([...p.slice(1800,22200),...q.slice(1800,22200)]));
 assert.deepEqual([...output].filter(Boolean),[...p,...q].filter(Boolean));
});
