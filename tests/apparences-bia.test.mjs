import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import ts from 'typescript';
import sharp from 'sharp';
const code = fs.readFileSync('lib/apparences-bia.ts', 'utf8');
const js = ts.transpileModule(code, {compilerOptions:{module:ts.ModuleKind.ESNext,target:ts.ScriptTarget.ES2022}}).outputText;
const a = await import('data:text/javascript;base64,' + Buffer.from(js).toString('base64'));

test('les trois tenues ont leurs deux vraies planches carrées, sans remplacer les anciennes', async () => {
  assert.equal(a.TENUES_BIA.length, 3);
  assert.equal(a.estTenueBia('rara'), false);
  assert.equal(a.estTenueBia('../inconnu'), false);
  for (const tenue of a.TENUES_BIA) for (const fichier of Object.values(a.imagesTenueBia(tenue.id))) {
    const meta = await sharp('public' + fichier).metadata();
    assert.equal(meta.format, 'webp'); assert.equal(meta.width, meta.height);
    assert(meta.width >= 1200, fichier);
  }
  for (const fichier of ['rara-24.webp', 'bia-24-nouvelle.webp', 'bia-24.webp']) assert(fs.existsSync('public/' + fichier));
});

test('toutes les expressions historiques ont une case valide dans la nouvelle garde-robe', () => {
  const page = fs.readFileSync('app/page.tsx', 'utf8');
  const objets = [...page.matchAll(/const CASES(?:_DES_PLANCHES_SUIVANTES|_DE_LA_TROISIEME_PLANCHE|_DE_LA_QUATRIEME_PLANCHE)? = \{([\s\S]*?)\} as const;/g)];
  assert.equal(objets.length, 4);
  let compte = 0;
  for (const objet of objets) for (const [, face] of objet[1].matchAll(/\b(\w+)\s*:\s*\d+/g)) {
    const image = a.imagePourFace(face);
    assert(image.case >= 0 && image.case < 24, face);
    assert(['expressions','gestes'].includes(image.planche), face);
    compte++;
  }
  assert.equal(compte, 104);
  assert.deepEqual(a.imagePourFace('compter_4'), {planche:'gestes',case:11});
  assert.deepEqual(a.imagePourFace('yeux_fermes'), {planche:'expressions',case:9});
  assert.deepEqual(a.imagePourFace('inconnu'), {planche:'expressions',case:7});
});

test('la préparation attend le décodage des deux images et mutualise les clics', async () => {
  const decodages = [];
  globalThis.Image = class { set src(v) { queueMicrotask(() => this.onload()); } decode() { return new Promise(r => decodages.push(r)); } };
  const p = a.chargerTenueBia('vert-or');
  assert.equal(a.chargerTenueBia('vert-or'), p);
  let fini = false; void p.then(() => { fini = true; });
  await new Promise(r => setImmediate(r));
  assert.equal(decodages.length, 2);
  decodages[0](); await new Promise(r => setImmediate(r)); assert.equal(fini, false);
  decodages[1](); await p; assert.equal(fini, true);
});

test('une image en échec peut être chargée de nouveau', async () => {
  globalThis.Image = class { set src(v) { queueMicrotask(() => this.onerror()); } };
  await assert.rejects(a.chargerTenueBia('ivoire'), /indisponible/);
  globalThis.Image = class { set src(v) { queueMicrotask(() => this.onload()); } decode() { return Promise.resolve(); } };
  await a.chargerTenueBia('ivoire');
});

test('la sélection de tenue ne touche pas aux identités, moteurs ni accès', () => {
  const composants = fs.readFileSync('app/personnages/Personnages.tsx', 'utf8');
  assert(!/fetch\(|speechSynthesis|AudioContext|setMode|setPersona|bia-persona/.test(composants));
  assert(!/fetch\(|speechSynthesis|AudioContext|bia-persona/.test(code));
  assert(a.GESTES_PAROLE.every(i => i >= 0 && i <= 8));
});
