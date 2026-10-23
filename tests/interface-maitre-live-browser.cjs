const {spawn}=require('child_process');
const {chromium}=require(process.env.PLAYWRIGHT_MODULE||'playwright');
const assert=require('assert/strict');
const server=spawn(process.execPath,['./node_modules/next/dist/bin/next','start','-H','127.0.0.1','-p','3112'],{stdio:['ignore','pipe','pipe']});
let browser;
(async()=>{try{
 for(let n=0;n<40;n++){try{await fetch('http://127.0.0.1:3112/api/acces');break;}catch{await new Promise(r=>setTimeout(r,300));}}
 browser=await chromium.launch({headless:true,args:['--no-sandbox','--use-fake-device-for-media-stream','--use-fake-ui-for-media-stream','--autoplay-policy=no-user-gesture-required']});
 const page=await browser.newPage();const errors=[];page.on('pageerror',e=>{errors.push(e.message);console.error('pageerror:',e.message);});
 await page.route('**/api/**',async route=>{
  const path=new URL(route.request().url()).pathname;
  let data={};
  if(path==='/api/acces')data={ok:true,maitre:true};
  if(path==='/api/etat')data={ecoute:'runpod',voix:'runpod',version:'local-synthetic'};
  if(path==='/api/gemini-live/session')data={token:'auth_tokens/synthetic',setup:{model:'synthetic'}};
  if(path==='/api/voix-gardees')data={ok:true};
  await route.fulfill({status:200,contentType:'application/json',body:JSON.stringify(data)});
 });
 await page.addInitScript(()=>{
  localStorage.setItem('bia-code','SYNTHETICMASTER');
  window.__liveConnections=0;
  class FakeSocket{
   static OPEN=1;readyState=1;
   constructor(){window.__liveConnections++;setTimeout(()=>this.onopen?.({}),20);}
   send(raw){const d=JSON.parse(raw);
    if(d.setup)setTimeout(()=>this.onmessage?.({data:JSON.stringify({setupComplete:{}})}),20);
    if(d.clientContent)setTimeout(()=>{
     this.onmessage?.({data:JSON.stringify({serverContent:{inputTranscription:{text:'Bonjour Bia'},outputTranscription:{text:'Bonjour papa, comment vas-tu ?'},modelTurn:{parts:[{inlineData:{data:btoa('\0'.repeat(4800)),mimeType:'audio/pcm;rate=24000'}}]}}})});
     setTimeout(()=>this.onmessage?.({data:JSON.stringify({serverContent:{turnComplete:true}})}),180);
    },200);
   }
   close(){this.readyState=3;setTimeout(()=>this.onclose?.({code:1000}),0);}
  }
  window.WebSocket=FakeSocket;
 });
 await page.goto('http://127.0.0.1:3112/');
 await page.getByRole('button',{name:'Ouvrir le clavier et la conversation écrite'}).waitFor();
 await page.locator('button.microphone').click();
 try{await page.getByRole('button',{name:"Elle l'a bien dit — à garder et à enregistrer"}).waitFor({timeout:15000});}catch(e){console.log('État après clic',await page.locator('body').innerText(),await page.evaluate(()=>window.__liveConnections));throw e;}
 assert.equal(await page.evaluate(()=>window.__liveConnections),1);
 await page.getByRole('button',{name:"Elle l'a bien dit — à garder et à enregistrer"}).click();
 assert.equal(await page.locator('.verdict-bien i').innerText(),'1');
 await page.getByRole('button',{name:"Elle l'a mal dit — à corriger plus tard"}).click();
 assert.equal(await page.locator('.verdict-mal i').innerText(),'1');
 await page.getByRole('button',{name:'Ouvrir le clavier et la conversation écrite'}).click();
 await page.getByText('Bonjour papa, comment vas-tu ?', {exact:true}).waitFor();
 await page.locator('.mal-dit').first().click();
 assert(await page.locator('textarea').count()>0);
 assert.equal(errors.length,0,errors.join('\n'));
 console.log(JSON.stringify({live:true,interface_maitre:true,bien_dit:1,mal_dit:1,fil:true,correction:true,erreurs:errors}));
 }catch(e){console.error(e);process.exitCode=1;}finally{await browser?.close();server.kill();}})();
