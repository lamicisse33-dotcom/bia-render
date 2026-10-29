import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';import ts from 'typescript';
function charger(path){const m={exports:{}};new Function('module','exports',ts.transpileModule(fs.readFileSync(path,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText)(m,m.exports);return m.exports;}
const aide=charger('lib/gemini-live-secours.ts'),client=charger('lib/gemini-live-client.ts');
test('fallback models are distinct, bounded, and excluded models cannot return',()=>{
 assert.deepEqual(aide.modelesLiveDisponibles(aide.MODELE_LIVE_25),[aide.MODELE_LIVE_25,aide.MODELE_LIVE_38]);
 assert.deepEqual(aide.modelesLiveDisponibles(aide.MODELE_LIVE_25,[aide.MODELE_LIVE_25]),[aide.MODELE_LIVE_38]);
 assert.deepEqual(aide.modelesLiveDisponibles(aide.MODELE_LIVE_25,[aide.MODELE_LIVE_25,aide.MODELE_LIVE_38]),[]);
 for(const [code,msg,ok] of [[1011,'quota exceeded',true],[1000,'RESOURCE_EXHAUSTED',true],[1006,'',true],[503,'',true],[1007,'invalid argument',false],[1000,'',false],[403,'permission denied',false]]){assert.equal(aide.panneLiveRecuperable(code,msg),ok);assert.equal(client.panneLiveRecuperable(code,msg),ok);}
});
async function scenario({before=true,both=false,code=1011,reason='quota exceeded',stop=false}={}){
 const old={fetch:globalThis.fetch,WebSocket:globalThis.WebSocket,localStorage:globalThis.localStorage};
 const sockets=[],requests=[],unavailable=[];let played=0;const historique=[{role:'user',parts:[{text:'Bonjour'}]}];
 class Socket{static OPEN=1;readyState=1;constructor(){this.index=sockets.length;sockets.push(this);queueMicrotask(()=>this.onopen());}send(raw){const d=JSON.parse(raw);if(!d.setup)return;queueMicrotask(()=>{if((this.index===0&&before)||both)this.onclose({code,reason});else this.onmessage({data:JSON.stringify({setupComplete:{}})});});}close(){} }
 try{
  globalThis.WebSocket=Socket;globalThis.localStorage={setItem(){}};
  globalThis.fetch=async(_url,init)=>{if(_url!=='/api/gemini-live/session')return Response.json({ok:true});requests.push(init);const second=requests.length>1;return Response.json({token:'synthetic',modele:second?aide.MODELE_LIVE_38:aide.MODELE_LIVE_25,secours_disponible:!second,setup:{model:second?aide.MODELE_LIVE_38:aide.MODELE_LIVE_25,...(second?{historyConfig:{initialHistoryInClientContent:true}}:{})}});};
  const c=new client.BiaGeminiLive('TEST',{etat(){},transcription(){},parle(){},latence(){},erreur(){},indisponible:m=>unavailable.push(m)});c.stoppe=false;c.history=historique;c.jouer=()=>played++;c.viderSon=()=>{};c.finirTour=()=>{};
  if(before)await c.connecter().catch(()=>{});else{await c.connecter();if(stop)c.stoppe=true;await sockets[0].onclose({code,reason});await new Promise(r=>setImmediate(r));}
  if(sockets.length===2&&!both)await sockets[1].onmessage({data:JSON.stringify({serverContent:{modelTurn:{parts:[{inlineData:{data:'AAAA',mimeType:'audio/pcm;rate=24000'}}]}}})});
  return {requests,played,history:c.history,unavailable};
 }finally{globalThis.fetch=old.fetch;globalThis.WebSocket=old.WebSocket;if(old.localStorage===undefined)delete globalThis.localStorage;else globalThis.localStorage=old.localStorage;}
}
test('quota before setup automatically connects backup and receives audio, retaining history',async()=>{const d=await scenario();assert.equal(d.requests.length,2);assert.equal(d.requests[1].headers['x-bia-live-exclus'],aide.MODELE_LIVE_25);assert.equal(d.played,1);assert.equal(d.history[0].parts[0].text,'Bonjour');assert.equal(d.unavailable.length,0);});
test('quota during established session recovers without restarting the microphone',async()=>{const d=await scenario({before:false});assert.equal(d.requests.length,2);assert.equal(d.played,1);});
test('two refusals stop after backup; invalid arguments and explicit stop never retry',async()=>{assert.equal((await scenario({both:true})).requests.length,2);assert.equal((await scenario({code:1007,reason:'invalid argument'})).requests.length,1);assert.equal((await scenario({before:false,stop:true})).requests.length,1);});
