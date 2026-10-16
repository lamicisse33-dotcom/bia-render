import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import ts from 'typescript';
const source = fs.readFileSync('lib/decoupage-voix-khalam.ts', 'utf8');
const js = ts.transpileModule(source, {compilerOptions: {module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022}}).outputText;
const {decouperVoixKhalam: split} = await import('data:text/javascript;base64,' + Buffer.from(js).toString('base64'));
test('short first audio preserves all words, punctuation and Wolof accents', () => {
  const text = 'Je peux vous aider à préparer votre message et vérifier avec vous les informations nécessaires avant son envoi. Ñëwal fi, baal ma.';
  const parts = split(text);
  assert.equal(parts.join(' '), text);
  assert.equal(parts[0].split(/\s+/).length, 10);
  assert(parts.every(p => p.length <= 140 && p.split(/\s+/).length <= 16));
  assert.deepEqual(split('Nanga def ?'), ['Nanga def ?']);
  assert.deepEqual(split('  '), []);
});
test('exceptional tokens stay bounded without breaking Unicode', () => {
  const text = '😀'.repeat(180);
  const parts = split(text);
  assert.equal(parts.join(''), text);
  assert(parts.every(p => p.length <= 140 && !/[\uD800-\uDBFF]$/.test(p)));
});
test('GPU lookahead starts the following synthesis as soon as its predecessor completes and respects cancellation', async () => {
  const page = fs.readFileSync('app/page.tsx','utf8');
  const start = page.indexOf('      const lancer = (i: number) => {');
  const end = page.indexOf('\n      };', start) + 9;
  assert(start > 0 && end > start);
  const compiled = ts.transpileModule(page.slice(start,end), {compilerOptions:{target:ts.ScriptTarget.ES2022}}).outputText;
  let finish, active = true; const calls = [];
  const enVol = new Map([[1,new Promise(r => {finish=r;})]]);
  const lancer = new Function('actuel','total','enVol','essaiChatterboxActif','demander', compiled + '; return lancer;')(
    ()=>active, 5, enVol, ()=>true, async i=>{calls.push(i);return {audio:'ok'};});
  lancer(2); lancer(2);
  assert.deepEqual(calls, []);
  finish({audio:'ok'}); await enVol.get(2);
  assert.deepEqual(calls, [2]);
  active=false; lancer(3);
  assert.equal(enVol.has(3), false);
});


test('forced short heads keep conjunctions with their following clause without adding or dropping words',()=>{
 for(const text of ['Mu dem ci marse bi, jënd soble ak tamaate, te dellusi ci kër ga.','Elle est allée au marché, a acheté des oignons et des tomates, puis elle est rentrée à la maison.']){
  const p=split(text);assert.equal(p.join(' '),text);
  assert(p.every(x=>x.length<=140&&x.split(/\s+/).length<=16));
  assert(!p.slice(0,-1).some(x=>/\b(?:te|ak|et)\s*$/u.test(x)));
 }
 assert.deepEqual(split('Mu dem ci marse bi, jënd soble ak tamaate, te dellusi ci kër ga.'),['Mu dem ci marse bi, jënd soble ak tamaate,','te dellusi ci kër ga.']);
});


test('complete short Wolof sentence can stay whole within existing synthesis limits',()=>{
 const t='Mu dem ci marse bi, jënd soble ak tamaate, te dellusi ci kër ga.';
 assert.deepEqual(split(t,true),[t]);
 assert.equal(split(t).length,2);
 const many='mot '.repeat(20)+'fin.';assert(split(many,true).length>1);
 assert.deepEqual(split('Première phrase. Deuxième phrase.',true),['Première phrase.','Deuxième phrase.']);
});
