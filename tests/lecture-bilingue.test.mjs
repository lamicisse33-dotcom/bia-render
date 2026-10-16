import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import crypto from 'node:crypto';
import ts from 'typescript';

function load(file, modules = {}, env = {}) {
  const code = ts.transpileModule(fs.readFileSync(file, 'utf8'), {
    compilerOptions: {module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022},
  }).outputText;
  const module = {exports: {}};
  new Function('require', 'module', 'exports', 'process', code)(name => {
    assert(name in modules, `Unexpected import: ${name}`);
    return modules[name];
  }, module, module.exports, {env});
  return module.exports;
}
const {passagesLanguesVoix} = load('lib/langue.ts');
test('compact commas preserve source text while exposing the following language',()=>{
 const text='Déedéet,livraison bi à part la.';
 const plan=passagesLanguesVoix(text,'wo');
 assert.equal(plan.map(p=>p.texte).join(''),text);
 assert.deepEqual(plan,[{texte:'Déedéet,',langue:'wo'},{texte:'livraison bi à part la.',langue:'fr'}]);
 for(const text of ['12,5 euros','https://exemple.fr/a,b','nom,prenom@example.fr','Déédéét,dama ragal ñu mer.'])assert.equal(passagesLanguesVoix(text).map(p=>p.texte).join(''),text);
});

test('soxla and known compact Wolof forms retain their profile beside a French payment phrase',()=>{
 for(const prefix of ['Damasoxla','Dama soxla','Dafasoxla','Damaxam','Dama xam']){
  const texte=prefix+' preuve de paiement.';
  const plan=passagesLanguesVoix(texte,'wo');
  assert.equal(plan.map(p=>p.texte).join(''),texte);
  assert.deepEqual(plan.map(p=>[p.texte.trim(),p.langue]),[[prefix,'wo'],['preuve de paiement.','fr']]);
 }
 const texte='Damasoxla preuve de paiement.';
 assert.equal(passagesLanguesVoix(texte,'wo',['Damasoxla'])[0].langue,'wo');
 for(const mot of ['prix','examen','explication','exemple','taxi','exactement']){
  assert(passagesLanguesVoix('Damasoxla '+mot+'.','wo').some(p=>p.langue==='fr'&&p.texte.trim()===mot+'.'));
 }
 const fr='J’ai besoin d’une preuve de paiement.';
 assert.deepEqual(passagesLanguesVoix(fr,'fr'),[{texte:fr,langue:'fr'}]);
});

test('reported suspicion sentence preserves every character and routes both French words', () => {
  const text = 'Bul jël décision ci suspicion rekk.';
  const parts = passagesLanguesVoix(text);
  assert.equal(parts.map(p => p.texte).join(''), text);
  assert.deepEqual(parts.map(p => [p.texte.trim(), p.langue]), [
    ['Bul jël', 'wo'], ['décision', 'fr'], ['ci', 'wo'], ['suspicion', 'fr'], ['rekk.', 'wo'],
  ]);
});

test('French borrowings from validated money lessons keep French pronunciation', () => {
  for (const [text, word] of [
    ['Dama wara xam ban prix lañu may jox.', 'prix'],
    ['Ma ngii def transfert bi léegi.', 'transfert'],
    ['Dinaay fay cash.', 'cash'],
    ['Ndax mën naa fay ak Wave ?', 'Wave'],
  ]) {
    // Runtime supplies its own validated expressions; defaults still apply.
    const parts = passagesLanguesVoix(text, 'wo', ['carte bancaire']);
    assert.equal(parts.map(p => p.texte).join(''), text);
    assert(parts.some(p => p.langue === 'fr' && p.texte.includes(word)));
  }
  const text = 'Ndax mën naa fay ak carte bancaire bi ?';
  const parts = passagesLanguesVoix(text, 'wo', ['carte bancaire']);
  assert.equal(parts.map(p => p.texte).join(''), text);
  assert(parts.some(p => p.langue === 'fr' && p.texte.trim() === 'carte bancaire'));
  assert.equal(parts.at(-1).langue, 'wo');
});

test('lesson 21 keeps the underlined Wolof words between French borrowings', () => {
  const text = 'Bia, sama famille dafa may ték pression.';
  const parts = passagesLanguesVoix(text, 'wo', ['carte bancaire']);
  assert.equal(parts.map(p => p.texte).join(''), text);
  assert.deepEqual(parts.map(p => [p.texte.trim(), p.langue]), [
    ['Bia, sama', 'wo'], ['famille', 'fr'], ['dafa may ték', 'wo'], ['pression.', 'fr'],
  ]);
  const french = 'Bia, ma famille me met trop de pression.';
  assert.deepEqual(passagesLanguesVoix(french, 'wo'), [{texte: french, langue: 'fr'}]);
  const lesson = 'DEVOIR 21 – Famille, pression et choix personnels\nWolof : ' + text + '\nFrançais : ' + french;
  assert.equal(passagesLanguesVoix(lesson).map(p => p.texte).join(''), lesson);
});

function route() {
  let parts = [{texte: 'Bul jël', langue: 'wo'}, {texte: 'suspicion', langue: 'fr'}];
  let calls = 0;const inputs=[];
  const {POST} = load('app/api/chatterbox-test/bia/route.ts', {'@/lib/prise-voix':load('lib/prise-voix.ts',{'node:crypto':crypto}),
    '@/lib/cache-voix-dialogue':load('lib/cache-voix-dialogue.ts'),'@/lib/continuite-voix-etat':{continuiteVoix:{}},
    '@/lib/passages-khalam': {preparerPassagesKhalam: async () => parts},
    '@/lib/langue': {detecterLangue: () => 'wo'},
    'next/server': {NextRequest: Request, NextResponse: {json: (data, init) => Response.json(data, init)}},
    'node:crypto': crypto,
    '@/lib/codes': {verifierCode: () => ({ok: true})},
    '../route': {POST: async request => {
      inputs.push((await request.json()).input);
      calls++;
      return Response.json({status: 'COMPLETED', output: {voice: 'female', audio_base64: 'test', generation_ms: 1}});
    }},
    '@/lib/chatterbox-test-etat': {noterChatterboxTest() {}},
    '@/lib/cache-accuses-lecon': {CacheAccusesLecon: class {get() {} set() {}}},
  }, {CHATTERBOX_TEST_KEY: 'test-only', CHATTERBOX_TEST_URL: 'https://gpu.invalid'});
  return {
    request: (extra = {}) => POST(new Request('https://bia.invalid/api/chatterbox-test/bia', {
      method: 'POST', headers: {'content-type': 'application/json'},
      body: JSON.stringify({texte: 'Bul jël suspicion', voice: 'female', ...extra}),
    })),
    change: value => {parts = value;}, calls: () => calls, inputs,
  };
}

test('unchanged reading plan plays the next part with the same fingerprint', async () => {
  const r = route();
  const first = await (await r.request()).json();
  assert.match(first.empreinte, /^[a-f0-9]{64}$/);
  const next = await r.request({partie: 1, empreinte: first.empreinte});
  assert.equal(next.status, 200);
  assert.equal((await next.json()).partie, 1);
  assert.equal(r.calls(), 2);
});

test('changed words, order or language with the same part count stop before synthesis', async () => {
  for (const changed of [
    [{texte: 'Bul jël', langue: 'wo'}, {texte: 'décision', langue: 'fr'}],
    [{texte: 'suspicion', langue: 'fr'}, {texte: 'Bul jël', langue: 'wo'}],
    [{texte: 'Bul jël', langue: 'wo'}, {texte: 'suspicion', langue: 'wo'}],
  ]) {
    const r = route();
    const first = await (await r.request()).json();
    r.change(changed);
    const response = await r.request({partie: 1, empreinte: first.empreinte});
    assert.equal(response.status, 409);
    assert.equal((await response.json()).code, 'DECOUPAGE_MODIFIE');
    assert.equal(r.calls(), 1);
    // Restarting the segment deliberately obtains the new plan.
    const retry = await r.request();
    assert.equal(retry.status, 200);
    assert.notEqual((await retry.json()).empreinte, first.empreinte);
  }
});

test('French borrowings cannot carry Wolof x-words or neutral grammar into the French engine',()=>{
 for(const text of ['Dama bëgg explication, xalaatal ci.','Dama xam prix la.','Message bi xale yi bind.','Ndax message bi leer na ci li mu signifier, wala dafa am bennene explication.']){
  const p=passagesLanguesVoix(text,'wo');assert.equal(p.map(x=>x.texte).join(''),text);
  for(const x of p){if(/\b(?:xalaatal|xam|xale)\b/u.test(x.texte))assert.equal(x.langue,'wo');if(/\b(?:explication|message|Message|prix|signifier)\b/u.test(x.texte))assert.equal(x.langue,'fr');}
 }
 assert.equal(passagesLanguesVoix('Dama xam prix la.','wo').at(-1).langue,'wo');
 assert.deepEqual(passagesLanguesVoix('Explique exactement cet exercice avec un exemple.','wo'),[{texte:'Explique exactement cet exercice avec un exemple.',langue:'fr'}]);
});

test('validated French expression vocabulary is recognized without forcing shared Wolof words into French',()=>{
 const text='Dama bëgg assurance bi.';const p=passagesLanguesVoix(text,'wo',['une assurance automobile'],['Dama bëgg']);
 assert.equal(p.map(x=>x.texte).join(''),text);assert(p.some(x=>x.langue==='fr'&&x.texte.trim()==='assurance'));
 assert.equal(p.at(-1).langue,'wo');
});
test('an isolated learned French homograph does not override Wolof grammar',()=>{
 const p=passagesLanguesVoix('Dama xam prix la.','wo',['la','ma']);
 assert.deepEqual(p.map(x=>[x.texte.trim(),x.langue]),[['Dama xam','wo'],['prix','fr'],['la.','wo']]);
});

test('a new take reaches the GPU with a different seed while normal reading and replay keep their cache',async()=>{
 const r=route();
 await r.request({lecture_fidele:true});
 await r.request({lecture_fidele:true,nouvelle_prise:'retake-one'});
 await r.request({lecture_fidele:true,nouvelle_prise:'retake-one'});
 await r.request({lecture_fidele:true,nouvelle_prise:'retake-two'});
 assert.equal(r.calls(),3);
 assert.equal(r.inputs[0].seed,913);
 assert.notEqual(r.inputs[1].seed,r.inputs[0].seed);
 assert.notEqual(r.inputs[1].seed,r.inputs[2].seed);
 assert(r.inputs.every(i=>i.text==='Bul jël'&&i.language==='wo'&&Number.isSafeInteger(i.seed)));
});

test('a measured take changes synthesis and fingerprint; another voice and explicit retakes stay independent',async()=>{
 const r=route();r.change([{texte:'Dama stressé lool.',langue:'wo'}]);
 const before=await (await r.request({lecture_fidele:true})).json();
 r.change([{texte:'Dama stressé lool.',langue:'wo',prise:{female:914}}]);
 assert.equal((await r.request({empreinte:before.empreinte})).status,409);
 await r.request({lecture_fidele:true});await r.request({lecture_fidele:true});
 await r.request({lecture_fidele:true,voice:'male'});
 await r.request({lecture_fidele:true,nouvelle_prise:'new-owner-take'});
 assert.deepEqual(r.inputs.slice(0,3).map(p=>p.seed),[913,914,913]);
 assert.notEqual(r.inputs[3].seed,914);
 assert.equal(r.calls(),4);
});


test('spaced punctuation follows its spoken neighbour without creating a new voice fragment',()=>{
 for(const texte of ['Dama xam problème ?','Dama xam problème !','Dama xam problème :','Dama xam problème …','« problème »']){
  const p=passagesLanguesVoix(texte,'wo');assert.equal(p.map(p=>p.texte).join(''),texte);
  assert(!p.some(p=>/^[\s\p{P}]+$/u.test(p.texte)));
  assert.equal(p.at(-1).langue,'fr');
 }
 const texte='Naka sa famille ?';assert.deepEqual(passagesLanguesVoix(texte,'wo'),[{texte,langue:'wo'}]);
 assert(passagesLanguesVoix('Dama bëgg famille bi.','wo').some(p=>p.langue==='fr'&&p.texte.includes('famille')));
});


test('gérer and its French forms keep French delivery inside the actual urban Wolof sentence',()=>{
 const screenshot='Waaw papa, dégg naa la. Ma jël couture : dafa yomb a gérer, ndax xaalis bu ndaw rekk lay soxla, te sa xam-xam ak sa kër mëna doy.';
 const plan=passagesLanguesVoix(screenshot,'wo');
 assert.equal(plan.map(p=>p.texte).join(''),screenshot);
 for(const mot of ['gérer','couture'])assert(plan.some(p=>p.langue==='fr'&&p.texte.includes(mot)));
 for(const mot of ['dégg','xaalis','soxla','kër'])assert(plan.some(p=>p.langue==='wo'&&p.texte.includes(mot)));
 for(const mot of ['gérer','gère','gérons','gérez','gèrent','géré','gérée','gérerai','gérerait','gerer','ge\u0301rer']){
  const text='Dama bëgg '+mot+' sama business.';const ps=passagesLanguesVoix(text,'wo');
  assert.equal(ps.map(p=>p.texte).join(''),text);
  assert(ps.some(p=>p.langue==='fr'&&p.texte.includes(mot)),mot);
 }
});


test('Wolof possessive sa never becomes an isolated French clip in the reported sentence',()=>{
 const screenshot='Baax na papa, Waxoon nga ma ni xamoo ba léegi. kan nga mën a jaay sa yéré yi. Kon nanu tàmbali ndànk, ak nit ñi nga xam déjà ci sa quartier. Ci sa entourage, kan moo mëna soxla ay tenue pour une fête ?';
 const plan=passagesLanguesVoix(screenshot,'wo');assert.equal(plan.map(p=>p.texte).join(''),screenshot);
 assert.equal(plan.filter(p=>p.langue==='fr'&&p.texte.trim()==='sa').length,0);
 assert(plan.some(p=>p.langue==='wo'&&p.texte.includes('jaay sa yéré')));
 assert(plan.some(p=>p.langue==='wo'&&p.texte.includes('ci sa quartier')));
 assert(plan.some(p=>p.langue==='wo'&&p.texte.includes('Ci sa entourage')));
 for(const t of ['Il parle de sa famille.','Sa voiture est dans sa rue.'])assert.deepEqual(passagesLanguesVoix(t,'fr'),[{texte:t,langue:'fr'}]);
});


test('reported market story keeps je continue in French and every Wolof word intact',()=>{
 const text='Waaw papa, je continue. Mu dem ci marse bi, jënd soble ak tamaate, te dellusi ci kër ga. Elle est allée au marché, a acheté des oignons et des tomates, puis elle est rentrée à la maison. Là, elle prépare le repas pour toute la famille, et ça sent déjà bon !';
 const plan=passagesLanguesVoix(text,'wo');
 assert.equal(plan.map(p=>p.texte).join(''),text);
 assert(plan.some(p=>p.langue==='fr'&&p.texte.trim()==='je continue.'));
 assert(!plan.some(p=>p.langue==='wo'&&/continue/i.test(p.texte)));
 assert(plan.some(p=>p.langue==='wo'&&p.texte.includes('Mu dem ci marse bi, jënd soble ak tamaate, te dellusi ci kër ga.')));
});
