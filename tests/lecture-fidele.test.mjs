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
test('compact EMP-042 punctuation separates French problème from Wolof Lan before speech',async()=>{
 const texte='Waaw,amul problème.Lan nga bëgg nu wax léegi?';
 const plan=await preparerPassagesKhalam(texte,'wo',false,true);
 assert.deepEqual(plan.map(p=>[p.texte.trim(),p.langue]),[['Waaw,amul','wo'],['problème.','fr'],['Lan nga bëgg','wo'],['nu wax léegi?','wo']]);
 assert.equal(plan.map(p=>p.texte).join('').replace(/\s/gu,''),texte.replace(/\s/gu,''));
 for(const text of ['12,5 3.14 09:05','https://Exemple.fr/Test.Lan','nom@Exemple.fr','/chemin/Note.Lan','M.Dupont','Déédéét,dama ragal ñu mer.']){
  assert.equal(preparation.espacerPonctuationLecture(text),text);
 }
});
test('the measured lool take is limited to the exact spoken excerpt and voice',async()=>{
 const plan=await preparerPassagesKhalam('Dama stressé lool.','wo',false,true);
 assert.deepEqual(plan,[{texte:'Dama stressé lool.',langue:'wo',prise:{female:914}}]);
 for(const text of ['Dama stressé lool?','Dama stressé lool, léegi.','Lool.'])assert((await preparerPassagesKhalam(text,'wo',false,true)).every(p=>!p.prise));
});
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

test('MAR-013 keeps ak with its preceding clause without altering source spelling',async()=>{
 const texte='Dañu bëgg ma séy ak ku ñu xam.';
 assert.deepEqual(lecture.segmentsLectureWolof(texte),[texte]);
 const plan=await preparerPassagesKhalam(texte,'wo',false,true);
 assert.deepEqual(plan,[{texte,langue:'wo'}]);
 const labelled=await preparerPassagesKhalam('Wolof : '+texte,'wo',false,true);
 assert.deepEqual(labelled.map(p=>p.texte.trim()),['Wolof :',texte]);
 // Do not merge across sentences, colon separators or language switches.
 assert.deepEqual(lecture.segmentsLectureWolof('Dañu bëgg ma séy. Ak ku ñu xam.'),['Dañu bëgg ma séy. ','Ak ku ñu xam.']);
 const mixed='Dañu bëgg ma séy ak décision bi.';
 const parts=await preparerPassagesKhalam(mixed,'wo',false,true);
 assert.equal(parts.map(p=>p.texte).join('').replace(/\s/g,''),mixed.replace(/\s/g,''));
 assert(parts.some(p=>p.langue==='fr'&&p.texte.includes('décision')));
});

test('an isolated final bi joins its French noun without consuming other Wolof speech',()=>{
 const original=[{texte:'Kon',langue:'wo'},{texte:'mariage',langue:'fr'},{texte:'bi.',langue:'wo'}];
 assert.deepEqual(preparation.lierBiFinal(original),[{texte:'Kon',langue:'wo'},{texte:'mariage bi.',langue:'fr'}]);
 assert.equal(original[1].texte,'mariage');
 for(const texte of ['bi,','bi ci kër ga.','xam.','bii.']){
  const p=[{texte:'mariage',langue:'fr'},{texte,langue:'wo'},{texte:'suite',langue:'wo'}];
  assert.deepEqual(preparation.lierBiFinal(p),p);
 }
 const p=[{texte:'mariage.',langue:'fr'},{texte:'bi.',langue:'wo'}];assert.deepEqual(preparation.lierBiFinal(p),p);
 const wo=[{texte:'kër',langue:'wo'},{texte:'bi.',langue:'wo'}];assert.deepEqual(preparation.lierBiFinal(wo),wo);
});

test('default faithful and conversational preparation eliminate the isolated final bi clip',async()=>{
 for(const fidele of [false,true])for(const mot of ['mariage','message','prix']){
  const plan=await preparerPassagesKhalam('Dama bëgg '+mot+' bi.','wo',false,fidele);
  assert.equal(plan.at(-1).texte,mot+' bi.');assert.equal(plan.at(-1).langue,'fr');
  assert(!plan.some(p=>p.texte.trim()==='bi.'));
 }
 const plan=await preparerPassagesKhalam('Dama xam prix la.','wo',false,true);
 assert.equal(plan.at(-1).langue,'wo');assert.equal(plan.at(-1).texte.trim(),'la.');
});
