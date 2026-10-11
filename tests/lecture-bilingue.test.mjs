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

function route() {
  let parts = [{texte: 'Bul jël', langue: 'wo'}, {texte: 'suspicion', langue: 'fr'}];
  let calls = 0;
  const {POST} = load('app/api/chatterbox-test/bia/route.ts', {
    '@/lib/passages-khalam': {preparerPassagesKhalam: async () => parts},
    '@/lib/langue': {detecterLangue: () => 'wo'},
    'next/server': {NextRequest: Request, NextResponse: {json: (data, init) => Response.json(data, init)}},
    'node:crypto': crypto,
    '@/lib/codes': {verifierCode: () => ({ok: true})},
    '../route': {POST: async () => {
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
    change: value => {parts = value;}, calls: () => calls,
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
