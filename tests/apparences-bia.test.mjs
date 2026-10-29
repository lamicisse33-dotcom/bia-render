import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import ts from 'typescript';
import sharp from 'sharp';
const code = fs.readFileSync('lib/apparences-bia.ts', 'utf8');
const js = ts.transpileModule(fs.readFileSync('lib/animation-satin.ts','utf8')+'\n'+code.replace(/^import[^\n]*\n/,''), {compilerOptions:{module:ts.ModuleKind.ESNext,target:ts.ScriptTarget.ES2022}}).outputText;
const a = await import('data:text/javascript;base64,' + Buffer.from(js).toString('base64'));

test('les trois tenues gardent 1024 pixels par portrait et les anciennes restent disponibles', async () => {
  assert.equal(a.TENUES_BIA.length, 3);
  assert.equal(a.estTenueBia('rara'), false);
  assert.equal(a.estTenueBia('../inconnu'), false);
  for (const tenue of a.TENUES_BIA) for (const [type, fichier] of Object.entries(a.imagesTenueBia(tenue.id))) {
    const meta = await sharp('public' + fichier).metadata();
    const taille = {repos:[1024,1536], gestes:[3072,736], visages:[3072,1200]}[type];
    assert.equal(meta.format, 'webp');
    assert.deepEqual([meta.width,meta.height],taille,fichier);
  }
  for (const fichier of ['rara-24.webp', 'bia-24-nouvelle.webp', 'bia-24.webp']) assert(fs.existsSync('public/' + fichier));
});

test('toutes les expressions historiques sont compatibles avec les visages HD', () => {
  const page = fs.readFileSync('app/page.tsx', 'utf8');
  const objets = [...page.matchAll(/const CASES(?:_DES_PLANCHES_SUIVANTES|_DE_LA_TROISIEME_PLANCHE|_DE_LA_QUATRIEME_PLANCHE)? = \{([\s\S]*?)\} as const;/g)];
  assert.equal(objets.length, 4);
  let compte = 0;
  for (const objet of objets) for (const [, face] of objet[1].matchAll(/\b(\w+)\s*:\s*\d+/g)) {
    const i = a.visagePourFace(face, true);
    assert(Number.isInteger(i) && i >= 0 && i < 9, face);
    compte++;
  }
  assert.equal(compte, 104);
  assert.equal(a.visagePourFace('yeux_fermes'), 5);
  assert.equal(a.visagePourFace('bouche_A', false), 0);
  assert.equal(a.visagePourFace('bouche_A', true), 3);
  assert.equal(a.visagePourFace('inconnu'), 0);
});

test('les mains attendent la parole, reviennent au repos et ne reprennent pas après annulation', () => {
  let heure = 0, id = 0;
  const rappels = new Map(); const evenements = [];
  const avancer = t => {
    while (true) {
      const entree = [...rappels].filter(([,v]) => v.heure <= t).sort((a,b) => a[1].heure-b[1].heure)[0];
      if (!entree) break;
      const [i, v] = entree; rappels.delete(i); heure=v.heure; v.suite();
    }
    heure=t;
  };
  const stop = a.programmerGestesBia({alea:()=>0, emettre:pose=>evenements.push([heure,pose]),
    planifier:(suite,delai)=>{rappels.set(++id,{suite,heure:heure+delai});return id;}, annuler:i=>rappels.delete(i)});
  avancer(2499); assert.deepEqual(evenements,[[0,0]]);
  avancer(2500); assert.deepEqual(evenements.at(-1),[2500,1]);
  avancer(3830); assert.deepEqual(evenements.map(v=>v[1]),[0,1,2,1,0]);
  avancer(9329); assert.equal(evenements.length,5); // 5,5 s de repos minimum
  const ancien = [...rappels.values()][0].suite;
  stop(); ancien(); avancer(50000);
  assert.deepEqual(evenements.map(v=>v[1]),[0,1,2,1,0,0]);
  assert.equal(rappels.size,0);
});

test('la préparation attend le décodage des trois images et mutualise les clics', async () => {
  const decodages = [];
  globalThis.Image = class { set src(v) { queueMicrotask(() => this.onload()); } decode() { return new Promise(r => decodages.push(r)); } };
  const p = a.chargerTenueBia('vert-or');
  assert.equal(a.chargerTenueBia('vert-or'), p);
  let fini = false; void p.then(() => { fini = true; });
  await new Promise(r => setImmediate(r));
  assert.equal(decodages.length, 3);
  decodages[0](); await new Promise(r => setImmediate(r)); assert.equal(fini, false);
  decodages[1](); await new Promise(r => setImmediate(r)); assert.equal(fini, false);
  decodages[2](); await p; assert.equal(fini, true);
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
  assert(!/setInterval/.test(composants));
});

test('les anciens choix Runway passent en vidéo locale et les autres personnages sont conservés',()=>{
 assert.equal(a.apparenceLocaleBia('runway-direct'),'satin-anime');
 assert.equal(a.apparenceLocaleBia(null),'satin-anime');
 for(const choix of ['original','vert-or','wax-bleu','ivoire','satin-anime'])assert.equal(a.apparenceLocaleBia(choix),choix);
 assert(a.APPARENCES_BIA.some(v=>v.id==='runway-direct'));
 assert.equal(a.apparenceLocaleBia('runway-direct',true),'runway-direct');
});
