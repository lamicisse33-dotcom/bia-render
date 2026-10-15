// Exercise the real learning component and Web Audio scheduler with a local
// deterministic WAV transport. This does not claim to validate GPU speech.
import {build} from 'esbuild';import {chromium} from '@playwright/test';
import assert from 'node:assert/strict';import {createServer} from 'node:http';import fs from 'node:fs';import path from 'node:path';
const real=new Set(['lecteur-audio-continu','bords-audio','routage-apprentissage','lecture-continue','flux-khalam','lecture-morceaux']);
const stubs={
 'piper-web':'export const mesurerPiperWeb=()=>{};export const lirePiperWeb=()=>{throw Error("not used")}',
 'langue':'export const ambiguitiesWolof=()=>[];',
 'voix-piper-locale':'export const piperLocaleDisponible=()=>false;export const lirePiperLocale=()=>{throw Error("not used")}',
 'reveil-du-son':'export async function reveiller(ctx){await ctx.resume();return ctx.state==="running";}',
};
const bundle=await build({stdin:{contents:`import React from 'react';import {createRoot} from 'react-dom/client';import Lecture from './app/LectureApprentissage.tsx';const ctx=new AudioContext();window.testContext=ctx;const demande={texte:'Première phrase. Deuxième phrase corrigée. Dernière phrase.',nonce:1,auto:false};createRoot(document.getElementById('root')).render(<Lecture code="test" voice="female" demande={demande} edition={true} obtenirAudio={()=>ctx} onStart={()=>{}} onClose={()=>{}}/>);`,resolveDir:process.cwd(),loader:'tsx'},bundle:true,write:false,format:'iife',jsx:'automatic',plugins:[{name:'test-dependencies',setup(b){b.onResolve({filter:/^@\/lib\//},a=>{const name=a.path.split('/').at(-1);return real.has(name)?{path:path.resolve('lib',name+'.ts')}:{path:name,namespace:'stub'};});b.onLoad({filter:/.*/,namespace:'stub'},a=>({contents:stubs[a.path]||'export {};',loader:'ts'}));}}]});
const server=createServer((req,res)=>{res.setHeader('Content-Type',req.url==='/bundle.js'?'text/javascript':'text/html');res.end(req.url==='/bundle.js'?bundle.outputFiles[0].text:'<!doctype html><meta charset="utf-8"><div id="root"></div><script src="/bundle.js"></script>');});await new Promise(r=>server.listen(0,'127.0.0.1',r));
const browser=await chromium.launch({headless:true,args:['--autoplay-policy=no-user-gesture-required','--no-sandbox']});
try{
 const page=await browser.newPage();const errors=[];page.on('pageerror',e=>errors.push(e.message));const requests=[];
 const rate=24000,n=rate*1,bytes=Buffer.alloc(44+n*2);bytes.write('RIFF');bytes.writeUInt32LE(36+n*2,4);bytes.write('WAVEfmt ',8);bytes.writeUInt32LE(16,16);bytes.writeUInt16LE(1,20);bytes.writeUInt16LE(1,22);bytes.writeUInt32LE(rate,24);bytes.writeUInt32LE(rate*2,28);bytes.writeUInt16LE(2,32);bytes.writeUInt16LE(16,34);bytes.write('data',36);bytes.writeUInt32LE(n*2,40);for(let i=0;i<n;i++)bytes.writeInt16LE(Math.round(Math.sin(i/rate*440*Math.PI*2)*1200),44+i*2);
 await page.route('**/api/**',async route=>{
  const url=route.request().url(),body=route.request().postDataJSON();let data={};
  if(url.includes('/lexique'))data={lecons:[]};
  if(url.includes('/corriger'))data={texte:body.texte,passages:[]};
  if(url.includes('/chatterbox-test/bia')){requests.push(body.texte);await new Promise(r=>setTimeout(r,100));data={parties:1,partie:0,empreinte:'test',audio:bytes.toString('base64')};}
  await route.fulfill({json:data});
 });
 await page.goto('http://127.0.0.1:'+server.address().port);await page.getByText('Aucune correction certaine trouvée dans le lexique validé.').waitFor();
 const editor=page.getByRole('textbox',{name:'Texte complet de l’exercice'});
 await editor.focus();await editor.evaluate(a=>{a.setSelectionRange(a.value.indexOf('Deuxième')+3,a.value.indexOf('Deuxième')+3);a.dispatchEvent(new Event('select',{bubbles:true}));});
 await page.getByRole('button',{name:'LIRE À PARTIR DU CURSEUR',exact:true}).click();
 await page.waitForFunction(()=>document.querySelector('[data-lu="true"]')?.textContent==='Deuxième');assert.equal(requests[0],'Deuxième phrase corrigée. ');
 await page.getByRole('button',{name:'PAUSE',exact:true}).click();const before=requests.length;await page.waitForTimeout(1100);assert.equal(requests.length,before);
 await page.getByRole('button',{name:'Lire à partir de : Dernière',exact:true}).click();
 await page.waitForFunction(()=>document.querySelector('[data-lu="true"]')?.textContent==='Dernière');assert.equal(requests.at(-1),'Dernière phrase.');
 await page.getByRole('button',{name:'STOP',exact:true}).click();await page.waitForFunction(()=>!document.querySelector('[data-lu="true"]'));
 await editor.fill('Texte nouveau. Correction toute fraîche.');
 await page.getByRole('button',{name:'Lire à partir de : Correction',exact:true}).click();
 await page.waitForFunction(()=>document.querySelector('[data-lu="true"]')?.textContent==='Correction');assert.equal(requests.at(-1),'Correction toute fraîche.');
 await editor.fill('INSTRUCTION: Ne lis pas cette commande.');assert.equal(await page.getByRole('button',{name:'LIRE À PARTIR DU CURSEUR',exact:true}).count(),0);assert.equal(await page.locator('[data-lu="true"]').count(),0);
 assert.deepEqual(errors,[]);console.log('BROWSER_PASS: caret, audio-clock highlight, pause, phrase click, stop, edited text, command guard; synthetic audio only');
}finally{await browser.close();server.close();}
