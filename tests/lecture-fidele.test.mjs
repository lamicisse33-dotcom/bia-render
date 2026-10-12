import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import ts from 'typescript';
function load(file, modules={}) {
  const code=ts.transpileModule(fs.readFileSync(file,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText;
  const module={exports:{}};
  new Function('require','module','exports',code)(id=>{assert(id in modules,id);return modules[id];},module,module.exports);
  return module.exports;
}
const lecture=load('lib/lecture-continue.ts');
const {morceauxLecture}=load('lib/lecture-morceaux.ts');
const preparation=load('lib/passages-khalam-core.ts',{
  './lexique-apprentissage-core':load('lib/lexique-apprentissage-core.ts'),
  './langue':load('lib/langue.ts'),
  './texte-khalam-voix':{texteKhalamVoix:t=>t.trim()},
  './lexique-apprentissage':{lireLecons:async()=>[],prononciationsApprises:async t=>t},
  './decoupage-voix-khalam':load('lib/decoupage-voix-khalam.ts'),
  './lecture-continue':lecture,
});
const {preparerPassagesKhalam}=load('lib/passages-khalam.ts',{'./passages-khalam-core':preparation,'./lexique-apprentissage':{lireLecons:async()=>[]},'./prononciation':{reglesPrononciation:async()=>[]}});
test('reported omission is split as in the successful live comparison',async()=>{
  const text='Dañu bëgg ma def lu ma bëggul.';
  assert.deepEqual(lecture.segmentsLectureWolof(text).map(t=>t.trim()),['Dañu bëgg ma def','lu ma bëggul.']);
  const normal=await preparerPassagesKhalam(text,'wo');
  const lesson=await preparerPassagesKhalam(text,'wo',false,true);
  assert.equal(normal.length,1);assert.equal(lesson.length,2);
  assert.equal(lesson.map(p=>p.texte).join(''),text);
  assert(lesson.every(p=>p.langue==='wo'));
  const labelled=await preparerPassagesKhalam('Wolof : '+text,'wo',false,true);
  assert.deepEqual(labelled.map(p=>p.texte.trim()),['Wolof :','Dañu bëgg ma def','lu ma bëggul.']);
  const french='Je veux lire tous les mots de cette phrase française.';
  assert.deepEqual(await preparerPassagesKhalam(french,'fr',false,true),await preparerPassagesKhalam(french,'fr'));
});
test('short groups preserve repeated words, accents, spacing and long lesson order',()=>{
  for(const text of ['  Ñoom ñi ngi jàng ci néeg bi.\n','Xale yi ñi ngi ci kër ga.',
    ('Dañu bëgg ma def lu ma bëggul.\n').repeat(100),'ñ'.repeat(400)]){
    const parts=lecture.segmentsLectureWolof(text);
    assert.equal(parts.join(''),text);
    assert(parts.every(p=>p.trim().split(/\s+/).length<=4&&p.length<=140));
  }
});
const part=(i,total=3)=>({partie:i,parties:total,empreinte:'plan',audio:'audio'+i});
test('one next piece is prepared during playback; all pieces stay ordered',async()=>{
  const requested=[];const c=new AbortController();
  const iterator=morceauxLecture(part(0),async(i,hash)=>{requested.push(i);assert.equal(hash,'plan');return part(i);},c.signal,true);
  assert.equal((await iterator.next()).value,'audio0');assert.deepEqual(requested,[1]);
  assert.equal((await iterator.next()).value,'audio1');assert.deepEqual(requested,[1,2]);
  assert.equal((await iterator.next()).value,'audio2');assert((await iterator.next()).done);
});
test('failed lookahead cannot skip to the next audio',async()=>{
  const c=new AbortController();const requested=[];
  const iterator=morceauxLecture(part(0),async i=>{requested.push(i);throw Error('GPU_OFFLINE');},c.signal,true);
  assert.equal((await iterator.next()).value,'audio0');
  await assert.rejects(iterator.next(),/GPU_OFFLINE/);assert.deepEqual(requested,[1]);
});
test('stop cancels progress while a lookahead is pending',async()=>{
  const c=new AbortController();let resolve;
  const iterator=morceauxLecture(part(0),()=>new Promise(r=>resolve=r),c.signal,true);
  await iterator.next();c.abort();resolve(part(1));
  await assert.rejects(iterator.next(),/arrêté/);
});
test('changed fingerprint or out-of-order response cannot play',async()=>{
  for(const wrong of [{...part(1),empreinte:'changed'},part(2)]){
    const iterator=morceauxLecture(part(0),async()=>wrong,new AbortController().signal,true);
    await iterator.next();await assert.rejects(iterator.next(),/découpage/);
  }
});
test('native parts without fingerprints keep the sequential reading contract',async()=>{
  let calls=0;const iterator=morceauxLecture({parties:2,audio:'native0'},async()=>{calls++;return {parties:2,audio:'native1'};},new AbortController().signal);
  assert.equal((await iterator.next()).value,'native0');assert.equal(calls,0);
  assert.equal((await iterator.next()).value,'native1');assert.equal(calls,1);
  assert((await iterator.next()).done);
});
