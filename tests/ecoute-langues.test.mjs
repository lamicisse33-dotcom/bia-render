import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import ts from 'typescript';
const compile = source => ts.transpileModule(source,{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText;
function load(path, modules={}, env={}, fetch=()=>{throw Error('unexpected network');}) {
  const module={exports:{}};
  new Function('require','module','exports','process','fetch',compile(fs.readFileSync(path,'utf8')))(
    id => {if (!(id in modules)) throw Error('unexpected import '+id);return modules[id];},module,module.exports,{env},fetch);
  return module.exports;
}
const validation=load('lib/ecriture-transcription.ts');
const {ecritureTranscriptionCompatible}=validation;
function setup(responses, provider='local_wolof') {
  const requests=[];
  const env={STT_PROVIDER:provider,WOLOF_LOCAL_ALL_LANGUAGES:'true',WOLOF_LOCAL_URL:'https://local.test',WOLOF_LOCAL_API_KEY:'test-local',ELEVENLABS_API_KEY:'test-external'};
  const fetch=async(url,init)=>{
    requests.push({url,language:init.body instanceof FormData?init.body.get('language_code'):null});
    assert(responses.length,'no unplanned retries');
    return {ok:true,json:async()=>responses.shift()};
  };
  const locale=load('lib/ecoute-locale.ts',{'./ecriture-transcription':validation},env,fetch);
  const ecoute=load('lib/ecoute.ts',{
    './ecriture-transcription':validation,'./ecoute-locale':locale,
    './etapes':{noterEtape:()=>{}},'./depense':{noterOreille:()=>{}},
    './voix':{voixConfig:{soynade:{apiKey:'test',baseUrl:'https://soynade.test'}}}
  },env,fetch);
  return {transcrire:ecoute.transcrire,requests,locale};
}
const audio=new Blob(['test'],{type:'audio/wav'});
test('Latin French, Wolof, accents and numbers remain valid',()=>{
  for(const s of ['Bonjour, je n’ai pas fini.','Ñu ngi ci kër gi, ŋ, ë, é.','25 000 F CFA',''])assert(ecritureTranscriptionCompatible(s));
  for(const s of ['السلام عليكم','Bonjour مرحبا','Это неверно'])assert.equal(ecritureTranscriptionCompatible(s),false);
});
test('valid local French stays local without a paid fallback',async()=>{
  const {transcrire,requests}=setup([{model:'omniASR_LLM_1B_v2',text:'Je veux finir ma phrase.'}]);
  const r=await transcrire(audio,'test.wav','fr');
  assert.equal(r.texte,'Je veux finir ma phrase.');assert.equal(requests.length,1);
});
test('Arabic from local ASR is retried and only the corrected transcript reaches BIA',async()=>{
  const {transcrire,requests}=setup([
    {model:'omniASR_LLM_1B_v2',text:'السلام عليكم'},
    {text:'Je veux finir ma phrase.',language_code:'fra'}
  ]);
  const r=await transcrire(audio,'test.wav','fr');
  assert.equal(r.langue,'fr');assert.equal(r.texte,'Je veux finir ma phrase.');
  assert.equal(requests.length,2);assert(requests[1].url.includes('elevenlabs'));
  assert.equal(requests[1].language,null); // preserve French/Wolof switching
});
test('a mislabeled Arabic transcript also triggers a language-constrained retry',async()=>{
  const {transcrire,requests}=setup([
    {model:'omniASR_LLM_1B_v2',text:'السلام عليكم'},
    {text:'السلام عليكم',language_code:'fra'},
    {text:'Attends, je parle encore.',language_code:'fra'}
  ]);
  const r=await transcrire(audio,'test.wav','fr');
  assert.equal(r.texte,'Attends, je parle encore.');assert.equal(requests[2].language,'fra');
});
test('if all recognizers return Arabic, no foreign transcript is returned as user speech',async()=>{
  const {transcrire}=setup([
    {model:'omniASR_LLM_1B_v2',text:'السلام عليكم'},
    {text:'السلام عليكم',language_code:'ara'},
    {text:'السلام عليكم',language_code:'fra'}
  ]);
  await assert.rejects(transcrire(audio,'test.wav','wo'),/transcription_hors_langues/);
});
test('Soynade cannot bypass the same script validation',async()=>{
  const {transcrire,requests}=setup([
    {text:'السلام عليكم'},
    {text:'Maa ngi bëgg wax.',language_code:'wol'}
  ],'soynade');
  const r=await transcrire(audio,'test.wav','wo');assert.equal(r.texte,'Maa ngi bëgg wax.');assert.equal(requests.length,2);
});
