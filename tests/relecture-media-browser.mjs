import fs from 'node:fs';import http from 'node:http';import assert from 'node:assert/strict';import ts from 'typescript';
const {chromium}=await import(process.env.PLAYWRIGHT_MODULE||'playwright');
const js=p=>ts.transpileModule(fs.readFileSync(p,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText;
const batch=JSON.parse(fs.readFileSync('public/reponses-courtes-khalam-v2.json','utf8'));const clip=batch.sons.find(s=>s.son.cle==='salut'&&s.son.langue==='fr').audio;
const server=http.createServer((_,r)=>r.end('<button id="play">Réécouter</button>'));await new Promise(r=>server.listen(0,'127.0.0.1',r));let browser;
try{
 browser=await chromium.launch({headless:true,args:['--no-sandbox']});const page=await browser.newPage();await page.goto(`http://127.0.0.1:${server.address().port}`);
 await page.evaluate(({moduleCode,silenceCode,clip})=>{
  function read(code){const m={exports:{}};new Function('module','exports',code)(m,m.exports);return m.exports;}
  const api=read(moduleCode),{SILENCE_MEDIA}=read(silenceCode);
  document.getElementById('play').onclick=()=>{
   window.result=(async()=>{
    const ctx=new AudioContext();await ctx.resume();const audio=new Audio(),abort=new AbortController();
    const source=ctx.createMediaElementSource(audio),analyse=ctx.createAnalyser();source.connect(analyse);analyse.connect(ctx.destination);
    const lecteur=api.creerRelectureMedia(audio,abort.signal,SILENCE_MEDIA);let starts=0,peak=0;
    const timer=setInterval(()=>{const b=new Float32Array(analyse.fftSize);analyse.getFloatTimeDomainData(b);for(const n of b)peak=Math.max(peak,Math.abs(n));},10);
    try{
     await new Promise(r=>setTimeout(r,2400));
     const bytes=Uint8Array.from(atob(clip),c=>c.charCodeAt(0)).buffer;
     await lecteur.jouer(bytes,1,()=>starts++);
     return {starts,peak,muted:audio.muted,volume:audio.volume,native_media:true,delayed_after_click_ms:2400};
    }finally{clearInterval(timer);lecteur.fermer();await ctx.close();}
   })();
  };
 },{moduleCode:js('lib/relecture-media.ts'),silenceCode:js('lib/silence-media.ts'),clip});
 await page.click('#play');const result=await page.evaluate(()=>window.result);
 assert(result.starts>=1);assert(result.peak>.005,JSON.stringify(result));assert.equal(result.muted,false);assert.equal(result.volume,1);
 console.log('BIA_RELECTURE_MEDIA_BROWSER_VERIFIED '+JSON.stringify({...result,physical_iphone:false,human_listening:false}));
}finally{if(browser)await browser.close();await new Promise(r=>server.close(r));}
