import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import ts from 'typescript';
function fixture(refus=false){
 const setup={model:'models/test',systemInstruction:{parts:[{text:'private lesson'}]}};
 let time=100000,opened=0,tokens=0,sent=[];
 const state={};
 class Clock extends Date{static now(){return time;}}
 class Socket{
  constructor(){opened++;queueMicrotask(()=>this.onopen?.());}
  send(raw){const d=JSON.parse(raw);sent.push(d);queueMicrotask(()=>{
   if(d.setup&&refus)this.onclose?.({code:1011,reason:'quota provider'});
   else this.onmessage?.({data:JSON.stringify(d.setup?{setupComplete:{}}:{serverContent:{modelTurn:{parts:[{inlineData:{data:'AAAA'}}]}}})});
  });}
  close(){}
 }
 const deps={
  'next/server':{NextRequest:Request,NextResponse:Response},
  '@/lib/fin-de-parole':{silenceFinDeParoleMs:()=>1200,prefixePartMs:()=>300},
  '@/lib/sessions-live-etat':{resumeSessionsLive:()=>({depuis_minuit:{par_origine:{essai:0}}}),noterSessionLive:()=>{}},
  '../session/route':{POST:async req=>{tokens++;assert.equal(req.headers.get('x-bia-code'),'server-only');return Response.json({token:'private-token',setup,consigne_signes:14,connaissances:{devoirs:3}});}},
 };
 const js=ts.transpileModule(fs.readFileSync('app/api/gemini-live/essai/route.ts','utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText;
 const m={exports:{}};
 new Function('require','module','exports','globalThis','process','WebSocket','Date',js)(id=>{assert(id in deps,id);return deps[id];},m,m.exports,state,{env:{GEMINI_API_KEY:'test',BIA_CODE_MAITRE:'server-only'}},Socket,Clock);
 return {run:()=>m.exports.GET(new Request('https://bia.test/api/gemini-live/essai?variante=session_complete')),advance:()=>time+=16000,stats:()=>({opened,tokens,sent})};
}
test('full production setup reaches provider and audio without exposing credentials or lessons; bounded at two probes',async()=>{
 const f=fixture();const response=await f.run();assert.equal(response.status,200);
 const body=await response.json();assert.equal(body.etape,'premier_audio');assert.equal(body.accepte,true);
 assert.equal(f.stats().sent[0].setup.systemInstruction.parts[0].text,'private lesson');
 assert(!JSON.stringify(body).includes('private'));assert(!JSON.stringify(body).includes('server-only'));
 assert.equal((await f.run()).status,429);f.advance();assert.equal((await f.run()).status,200);
 f.advance();assert.equal((await f.run()).status,429);assert.equal(f.stats().tokens,2);assert.equal(f.stats().opened,2);
});
test('full setup refusal retains provider code and reason instead of reporting audio success',async()=>{
 const f=fixture(true);const body=await (await f.run()).json();assert.equal(body.accepte,false);assert.equal(body.code,1011);assert.equal(body.motif,'quota provider');assert.equal(f.stats().sent.length,1);
});
