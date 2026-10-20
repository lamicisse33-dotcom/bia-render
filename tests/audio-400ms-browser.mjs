// Real Chromium audio/capture and progressive HTTP playback, with a synthetic
// tone and a delayed local TTS fixture. No microphone permission, account,
// production provider, human listening or Wolof quality claim.
import fs from 'node:fs';
import http from 'node:http';
import assert from 'node:assert/strict';
import ts from 'typescript';
const {chromium}=await import(process.env.PLAYWRIGHT_MODULE||'playwright');
const compiled=path=>ts.transpileModule(fs.readFileSync(path,'utf8'),{compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.CommonJS}}).outputText;
const file=compiled('lib/briques-file.ts'),client=compiled('lib/briques-client.ts');
function wav(){const n=3600,b=Buffer.alloc(44+n*2);b.write('RIFF');b.writeUInt32LE(b.length-8,4);b.write('WAVEfmt ',8);b.writeUInt32LE(16,16);b.writeUInt16LE(1,20);b.writeUInt16LE(1,22);b.writeUInt32LE(24000,24);b.writeUInt32LE(48000,28);b.writeUInt16LE(2,32);b.writeUInt16LE(16,34);b.write('data',36);b.writeUInt32LE(n*2,40);for(let i=0;i<n;i++)b.writeInt16LE(Math.round(Math.sin(i/24000*Math.PI*2*440)*2000),44+i*2);return b.toString('base64');}
const audio=wav(),timers=new Set();
const server=http.createServer(async(req,res)=>{
 if(req.url==='/'){res.setHeader('content-type','text/html');res.end('<!doctype html><title>Audio technique BIA</title>');return;}
 if(req.url==='/anticipation/capture.js'){res.setHeader('content-type','application/javascript');res.end(fs.readFileSync('public/anticipation/capture.js'));return;}
 if(req.url==='/api/anticipation/briques'){
  let text='';for await(const b of req)text+=b;const body=JSON.parse(text);
  if(body.final){res.setHeader('content-type','application/json');res.end(JSON.stringify({preparation:{id:'browser',termine:true}}));return;}
  res.setHeader('content-type','application/x-ndjson');res.setHeader('cache-control','no-store, no-transform');res.flushHeaders();
  const line=d=>res.write(JSON.stringify(d)+'\n');
  line({type:'brique',brique:{numero:0,texte:'Voici une réponse de test.',voice:'female',langue:'fr'}});
  line({type:'morceau',audio,voice:'female',partie:0,parties:2,empreinte:'browser-fixed'});
  const timer=setTimeout(()=>{timers.delete(timer);if(res.destroyed)return;line({type:'morceau',audio,voice:'female',partie:1,parties:2,empreinte:'browser-fixed'});line({type:'resultat',preparation:{id:'browser',termine:false}});res.end();},900);timers.add(timer);return;
 }
 res.statusCode=404;res.end();
});
await new Promise(r=>server.listen(0,'127.0.0.1',r));
let browser;
try{
 browser=await chromium.launch({headless:true,args:['--no-sandbox','--autoplay-policy=no-user-gesture-required','--disable-background-timer-throttling']});
 const page=await browser.newPage();await page.goto(`http://127.0.0.1:${server.address().port}`);
 const result=await page.evaluate(async({file,client})=>{
  function module(code,imports={}){const m={exports:{}};new Function('require','module','exports',code)(id=>imports[id],m,m.exports);return m.exports;}
  const api=module(client,{'./briques-file':module(file)}),ctx=new AudioContext({sampleRate:48000});await ctx.resume();
  await ctx.audioWorklet.addModule('/anticipation/capture.js');
  const node=new AudioWorkletNode(ctx,'bia-anticipation'),osc=ctx.createOscillator(),mute=ctx.createGain();mute.gain.value=0;
  osc.connect(node);node.connect(mute);mute.connect(ctx.destination);
  const chunks=[],startCapture=performance.now();node.port.onmessage=({data})=>{if(data.pcm)chunks.push({length:data.pcm.length,ms:performance.now()-startCapture});};osc.start();
  await new Promise(r=>setTimeout(r,650));osc.stop();node.disconnect();
  const started=performance.now(),p=api.creerProducteurBriques({code:'synthetic',tour:'browser-400ms',history:[],resume:'',voice:'female',persona:'bia',actuel:()=>true});
  p.progresser('Je souhaite vérifier la lecture progressive de ma réponse.');
  await new Promise(r=>setTimeout(r,20));p.arreterEcoute();
  const starts=[];
  const reading=p.commencer({signal:new AbortController().signal,taire(){},attente(){},mesure(){},jouer:async b=>{
   for await(const audio of b.flux){
    const bytes=Uint8Array.from(atob(audio),c=>c.charCodeAt(0)),buffer=await ctx.decodeAudioData(bytes.buffer),source=ctx.createBufferSource();
    source.buffer=buffer;source.connect(ctx.destination);starts.push({ms:performance.now()-started,frames:buffer.length,sampleRate:buffer.sampleRate});
    await new Promise(r=>{source.onended=r;source.start();});
   }return true;
  }},true);
  await p.terminer('Je souhaite vérifier la lecture progressive de ma réponse.');await reading.fin;
  const out={capture:{sampleRate:ctx.sampleRate,chunks},playback:starts};await ctx.close();return out;
 },{file,client});
 assert(result.capture.chunks.length>=4);assert(result.capture.chunks.every(x=>x.length===1600));
 assert.equal(result.playback.length,2);assert(result.playback[0].ms<700,JSON.stringify(result.playback));assert(result.playback[1].ms>=800);
 console.log('BIA_AUDIO_BROWSER_VERIFIED '+JSON.stringify({synthetic:true,physical_microphone:false,human_listening:false,...result}));
}finally{if(browser)await browser.close();for(const t of timers)clearTimeout(t);await new Promise(r=>server.close(r));}
