import assert from 'node:assert/strict';
import {test} from 'node:test';
import {readFileSync} from 'node:fs';
import {createRequire} from 'node:module';
import vm from 'node:vm';
import {generateKeyPairSync,sign} from 'node:crypto';
import ts from 'typescript';
const require=createRequire(import.meta.url),calls=[];
const source=readFileSync(new URL('../lib/oreille-essai-auth.ts',import.meta.url),'utf8');
const js=ts.transpileModule(source,{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText;
const module={exports:{}};
const wrap=vm.runInThisContext('(function(require,module,exports){'+js+'\n})');
wrap(name=>name==='./codes'?{verifierCode:(value,count)=>{calls.push([value,count]);return {ok:value==='TEST-CODE'};}}:require(name),module,module.exports);
const {identiteOreille,autoriserEssaiOreille}=module.exports;
const {publicKey,privateKey}=generateKeyPairSync('rsa',{modulusLength:2048});
const now=Date.parse('2026-10-20T04:00:00Z'),seconds=now/1000;
const key={...publicKey.export({format:'jwk'}),kid:'test'};
const base={iss:'https://token.actions.githubusercontent.com',aud:'bia-moonshine-browser-install-20261020',repository:'lamicisse33-dotcom/dydy',repository_id:'1375115286',repository_owner_id:'297633268',workflow_ref:'lamicisse33-dotcom/dydy/.github/workflows/bia-moonshine-browser-install-20261020.yml@refs/heads/audit/storage-20261015',ref:'refs/heads/audit/storage-20261015',event_name:'push',iat:seconds,nbf:seconds,exp:seconds+300};
function token(claims={},header={}){const a=Buffer.from(JSON.stringify({alg:'RS256',kid:'test',...header})).toString('base64url'),b=Buffer.from(JSON.stringify({...base,...claims})).toString('base64url'),body=a+'.'+b;return body+'.'+sign('RSA-SHA256',Buffer.from(body),privateKey).toString('base64url');}
test('installation accepts the exact signed workflow and scope',async()=>{assert.equal(await identiteOreille(token(),'install',now,async()=>[key]),true);});
test('read-only test credentials cannot install files',async()=>{assert.equal(await identiteOreille(token(),'test',now,async()=>[key]),false);});
test('rejects another repository, branch, workflow, audience and expired identity',async()=>{
 for(const change of [{repository:'attacker/repo'},{repository_id:'1'},{repository_owner_id:'1'},{ref:'refs/heads/main'},{workflow_ref:base.workflow_ref.replace('install','test')},{aud:'other'},{event_name:'pull_request'},{exp:seconds-1},{iat:seconds-1000}])assert.equal(await identiteOreille(token(change),'install',now,async()=>[key]),false,JSON.stringify(change));
});
test('signature and bounded installation window are mandatory',async()=>{assert.equal(await identiteOreille(token({}, {alg:'none'}),'install',now,async()=>[key]),false);assert.equal(await identiteOreille(token().replace(/.$/,'!'),'install',now,async()=>[key]),false);assert.equal(await identiteOreille(token(),'install',Date.parse('2026-10-21T00:00:00Z'),async()=>[key]),false);});
test('an ordinary BIA code authenticates without consuming a question',async()=>{assert.equal(await autoriserEssaiOreille(new Request('https://app.khalam.app/api/oreille-essai',{headers:{'x-bia-code':'TEST-CODE'}})),true);assert.deepEqual(calls.at(-1),['TEST-CODE',false]);});
