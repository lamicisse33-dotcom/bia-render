import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import ts from 'typescript';
async function load(path) {
  const js=ts.transpileModule(fs.readFileSync(path,'utf8'),{compilerOptions:{module:ts.ModuleKind.ESNext,target:ts.ScriptTarget.ES2022}}).outputText;
  return import('data:text/javascript;base64,'+Buffer.from(js).toString('base64'));
}
const {executerLecon}=await load('lib/mode-apprentissage.ts');
const {CacheAccusesLecon}=await load('lib/cache-accuses-lecon.ts');
test('master can enter, repeat exact Wolof, save, repeat saved phrase and exit',async()=>{
  let state={maitre:true,actif:false,phrase:''}; const saved=[];
  const turn=async texte=>{
    const r=await executerLecon({...state,texte},async p=>{saved.push(p)});
    assert(r); state={...state,actif:r.apprend,phrase:r.aRepeter}; return r;
  };
  assert.equal((await turn('Bia, mets-toi en mode apprentissage !')).apprend,true);
  const wolof='Ñu ngi fi — jërëjëf.';
  assert.equal((await turn('Répète avec moi : '+wolof)).reply,wolof);
  assert.equal((await turn('Mémorise')).retenu,wolof);
  assert.deepEqual(saved,[wolof]);
  assert.equal((await turn('Répète')).reply,wolof);
  assert.equal((await turn('On a fini d’apprendre.')).apprend,false);
  assert.equal(state.phrase,'');
  assert.equal(await executerLecon({...state,texte:'Bonjour'},async()=>{}),null);
});
test('no master, negated, quoted and descriptive commands cannot enable or save',async()=>{
  let calls=0; const save=async()=>{calls++};
  for(const texte of ['Mets-toi en mode apprentissage','Mémorise ceci : secret'])
    assert.equal(await executerLecon({texte,maitre:false,actif:true,phrase:'secret'},save),null);
  for(const texte of ['Ne te mets pas en mode apprentissage','Je lui ai dit mets-toi en mode apprentissage','« Mets-toi en mode apprentissage »','Ne mémorise pas ça','Mémorise'])
    assert.equal(await executerLecon({texte,maitre:true,actif:false,phrase:'secret'},save),null);
  assert.equal(calls,0);
});
test('save acknowledgement waits for durable write and preserves phrase on failure',async()=>{
  let release; const pending=new Promise(r=>{release=r}); let done=false;
  const input={texte:'Mémorise',maitre:true,actif:true,phrase:'Jërëjëf.'};
  const response=executerLecon(input,async()=>{await pending}).then(r=>{done=true;return r});
  await Promise.resolve(); assert.equal(done,false); release();
  assert.equal((await response).retenu,input.phrase);
  const failed=await executerLecon(input,async()=>{throw new Error('offline')});
  assert.equal(failed.retenu,undefined); assert.equal(failed.aRepeter,input.phrase);
  assert.equal(failed.apprend,true); assert.match(failed.reply,/pas pu/);
  let writes=0;
  await executerLecon({...input,phrase:''},async()=>{writes++});
  assert.equal(writes,0);
});
test('inline saving preserves spelling; exit and entry have no write side effects',async()=>{
  const saved=[]; const save=async p=>{saved.push(p)};
  const r=await executerLecon({texte:'Mémorise ceci : Ñu ngi fi.',maitre:true,actif:true,phrase:'old'},save);
  assert.equal(r.retenu,'Ñu ngi fi.');
  for(const texte of ['Je veux que tu te mettes en mode apprentissage','Reviens en mode normal'])
    assert(await executerLecon({texte,maitre:true,actif:true,phrase:'unsaved'},save));
  assert.deepEqual(saved,['Ñu ngi fi.']);
});
test('audio cache isolates keys, excludes private phrases and expires',()=>{
  let now=0; const cache=new CacheAccusesLecon(()=>now); const phrase="C'est mémorisé, papa.";
  cache.set('female-model-a',phrase,'audio');
  assert.equal(cache.get('female-model-a',phrase),'audio');
  assert.equal(cache.get('male-model-a',phrase),undefined);
  cache.set('private','my private lesson','audio');
  assert.equal(cache.get('private','my private lesson'),undefined);
  now=300001; assert.equal(cache.get('female-model-a',phrase),undefined);
});
