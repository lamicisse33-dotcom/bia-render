import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';import vm from 'node:vm';import ts from 'typescript';import crypto from 'node:crypto';
await import('../public/speecht5/core.js');
const manifest=JSON.parse(fs.readFileSync('public/speecht5/manifest.json'));
function load(file,deps={}){const m={exports:{}};new Function('require','module','exports',ts.transpileModule(fs.readFileSync(file,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText)(n=>{assert(n in deps,n);return deps[n];},m,m.exports);return m.exports;}
test('new voice selection preserves every existing route and default',()=>{
 const saved=new Map();const context={exports:{},URLSearchParams,window:{location:{search:''},localStorage:{getItem:k=>saved.get(k),setItem:(k,v)=>saved.set(k,v)}},require:()=>({piperLocaleDisponible:()=>false})};
 vm.runInNewContext(ts.transpileModule(fs.readFileSync('lib/chatterbox-essai.ts','utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText,context);const api=context.exports;
 assert.equal(api.choixVoixBia(),'female');
 for(const [choice,route] of [['female','/api/chatterbox-test/bia'],['male','/api/chatterbox-test/bia'],['piper-web','/api/piper-web/synthese'],['speecht5-web','/api/speecht5-web/synthese']]){assert(api.choisirVoixBia(choice));assert.equal(api.routeVoixBia(),route);}
 assert.equal(api.essaiChatterboxActif(),false);assert(api.choisirVoixBia('female'));assert(api.essaiChatterboxActif());
});
test('SpeechT5 segmentation preserves every word and rejects unsupported characters',()=>{
 const text=('Nanga def ? Maa ngi fi rekk. Bonjour, je suis Bia. ').repeat(40);const parts=globalThis.BiaSpeechT5Core.split(text);assert.equal(parts.join(' '),text.trim());assert(parts.every(x=>x.length<=120));assert.throws(()=>globalThis.BiaSpeechT5Core.encode('🦁',{vocab:{'▁':3},eos:2}),/caractère/);
});
test('GitHub installation tokens require valid signature and exact scoped claims',async()=>{
 const api=load('lib/speecht5-installation.ts',{'node:crypto':crypto});const {privateKey,publicKey}=crypto.generateKeyPairSync('rsa',{modulusLength:2048});const jwk={...publicKey.export({format:'jwk'}),kid:'test'};const now=Date.parse('2026-10-19T22:00:00Z'),sec=now/1000;
 const claims={iss:'https://token.actions.githubusercontent.com',aud:'bia-speecht5-install-20261019',repository:'lamicisse33-dotcom/dydy',repository_id:'1375115286',repository_owner_id:'297633268',workflow_ref:'lamicisse33-dotcom/dydy/.github/workflows/bia-speecht5-install-via-bia-20261019.yml@refs/heads/audit/storage-20261015',ref:'refs/heads/audit/storage-20261015',event_name:'push',iat:sec,nbf:sec,exp:sec+300};
 const token=c=>{const input=Buffer.from(JSON.stringify({alg:'RS256',kid:'test'})).toString('base64url')+'.'+Buffer.from(JSON.stringify(c)).toString('base64url');return input+'.'+crypto.sign('RSA-SHA256',Buffer.from(input),privateKey).toString('base64url');};
 assert(await api.autoriserInstallation(token(claims),now,async()=>[jwk]));
 for(const edit of [{aud:'elsewhere'},{repository:'elsewhere'},{repository_id:'0'},{repository_owner_id:'0'},{workflow_ref:'other'},{ref:'refs/heads/main'},{exp:sec-1},{iat:sec-9999},{nbf:sec+999},{iss:'other'}])assert.equal(await api.autoriserInstallation(token({...claims,...edit}),now,async()=>[jwk]),false,JSON.stringify(edit));
 assert.equal(await api.autoriserInstallation(token(claims),api.FIN_INSTALLATION,async()=>[jwk]),false);
 const t=token(claims);assert.equal(await api.autoriserInstallation(t.slice(0,-5)+'AAAAA',now,async()=>[jwk]),false);
});
test('model chunk API authenticates without consuming quota and rejects paths outside the manifest',async()=>{
 const calls=[];const api=load('app/api/speecht5-web/route.ts',{'@/lib/codes':{verifierCode:(code,count)=>{calls.push(count);return {ok:code==='valid'}}},'@/lib/audio-memoire-stockage':{lireObjetMemoire:async path=>{assert(path.startsWith('modeles/speecht5-wo-fr/'));return new Response('data');}},'@/public/speecht5/manifest.json':{default:manifest}});
 const request=(query,code='valid')=>new Request('https://app.khalam.app/api/speecht5-web?'+query,{headers:{'x-bia-code':code}});
 assert.equal((await api.GET(request('file=encoder.onnx&part=0','bad'))).status,401);
 for(const q of ['file=../../private&part=0','file=encoder.onnx&part=-1','file=encoder.onnx&part=9999','file=encoder.onnx'])assert.equal((await api.GET(request(q))).status,400);
 assert.equal((await api.GET(request('file=encoder.onnx&part=0'))).status,200);assert(calls.every(v=>v===false));
});
test('installer accepts only manifest bytes, never overwrites other objects, and verifies completion',async()=>{
 const bytes=new Uint8Array([1,2,3]),hash=crypto.createHash('sha256').update(bytes).digest('hex');const part={path:'modeles/speecht5-wo-fr/test/0.bin',sha256:hash,bytes:3};const fake={revision:'test',total_bytes:3,files:{'probe.bin':{parts:[part]}}};
 let authorized=true;const objects=new Map(),writes=[];
 const api=load('app/api/speecht5-web/installation/route.ts',{'node:crypto':crypto,'@/lib/speecht5-installation':{autoriserInstallation:async()=>authorized},'@/lib/audio-memoire-stockage':{lireObjetMemoire:async path=>objects.has(path)?new Response(objects.get(path)):null,ecrireObjetMemoire:async(path,data,type,mutable)=>{writes.push({path,mutable});assert(!objects.has(path),'no overwrite');objects.set(path,data);}},'@/public/speecht5/manifest.json':{default:fake}});
 const request=(query,data=bytes)=>new Request('https://app.khalam.app/api/speecht5-web/installation?'+query,{method:'POST',body:data});
 authorized=false;assert.equal((await api.POST(request('file=probe.bin&part=0'))).status,401);assert.equal(writes.length,0);authorized=true;
 assert.equal((await api.POST(request('file=../../private&part=0'))).status,400);
 assert.equal((await api.POST(request('file=probe.bin&part=0',new Uint8Array([9,9,9])))).status,422);assert.equal(writes.length,0);
 assert.equal((await api.POST(request('complete=1'))).status,409);
 assert.equal((await api.POST(request('file=probe.bin&part=0'))).status,200);assert.equal(writes.length,1);assert.equal(writes[0].mutable,false);
 assert.equal((await api.POST(request('file=probe.bin&part=0'))).status,200);assert.equal(writes.length,1);
 assert.equal((await api.POST(request('complete=1'))).status,200);assert.equal((await(await api.GET()).json()).ready,true);
});
test('shared voice adapter delegates existing engines byte for byte',async()=>{
 const calls=[];const result=new Response('original');let active=false;
 const api=load('lib/voix-web.ts',{'./piper-web':{fetchVoixBia:async(...args)=>{calls.push(args);return result;},piperWebActif:()=>false,vitessePiperWeb:()=>.85},'./speecht5-web':{speecht5WebActif:()=>active,lireSpeechT5:async(text,part,code)=>({text,part,code}),mesurerSpeechT5(){}}});
 const init={method:'POST',body:'unchanged'};
 for(const route of ['/api/piper-web/synthese','/api/chatterbox-test/bia','/api/voix']){assert.equal(await api.fetchVoixBia(route,init),result);assert.equal(calls.at(-1)[1],init);}
 assert.equal(api.vitessePiperWeb(),.85);active=true;assert.equal(api.vitessePiperWeb(),1);
 const response=await api.fetchVoixBia('/api/speecht5-web/synthese',{body:JSON.stringify({texte:'Bonjour',partie:2}),headers:{'x-bia-code':'test'}});assert.deepEqual(await response.json(),{text:'Bonjour',part:2,code:'test'});assert.equal(calls.length,3);
});
test('typographic apostrophes retain the word using the supported straight apostrophe',()=>{
 const config={vocab:{'▁':3,d:4,"'":5,a:6},eos:2};assert.deepEqual(globalThis.BiaSpeechT5Core.encode('d’a',config),[3,4,5,6,2]);
});
test('actual onboarding condition reserves phone installation for the native Piper choice',()=>{
 const source=fs.readFileSync('app/page.tsx','utf8'),ast=ts.createSourceFile('page.tsx',source,ts.ScriptTarget.Latest,true,ts.ScriptKind.TSX);let condition;
 function visit(n){if(ts.isIfStatement(n)&&ts.isBlock(n.thenStatement)){const first=n.thenStatement.statements[0];if(first&&ts.isReturnStatement(first)&&first.expression&&ts.isJsxSelfClosingElement(first.expression)&&first.expression.tagName.getText(ast)==='OnboardingVoix')condition=n.expression.getText(ast);}ts.forEachChild(n,visit);}
 visit(ast);assert(condition,'the real onboarding decision must be located');const decide=new Function('choixVoix','essaiChatterbox','onboarding','return '+condition);
 for(const choice of ['piper','piper-web','speecht5-web','male','female'])assert.equal(decide(choice,['male','female'].includes(choice),{besoin:true,verifie:true}),choice==='piper',choice);
 assert.equal(decide('piper',false,{besoin:false,verifie:true}),false);
});
