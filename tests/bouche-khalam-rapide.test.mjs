/* ── LA BOUCHE DE KHALAM RAPIDE, SUR LE SON ────────────────────────────────

   Lamine, le 27 octobre 2026 : « synchronise davantage la bouche de BIA,
   elle est sur la voix Khalam Rapide ».

   Ce que ces épreuves tiennent : le client rend bien l'enveloppe du son avec
   l'instant où il SORTIRA du haut-parleur, elle est rendue AVANT d'annoncer
   qu'elle parle (sinon la page n'aurait rien à lire au premier morceau), un
   silence y vaut un silence, et l'horloge est reculée du retard du
   haut-parleur — parce que ce qu'il entend a été calculé un instant plus tôt.

   Le reste — qu'une bouche fermée reste fermée à l'écran — se prouve dans un
   vrai navigateur : tests/bouche-khalam-rapide-browser.cjs. */
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import ts from 'typescript';

const compile = (p) => ts.transpileModule(fs.readFileSync(p, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText;
function charger() {
  const m = { exports: {} };
  /* Aucun import relatif dans ce fichier : c'est la règle qui l'a déjà fait
     partir neuf fois en rouge. On la vérifie en lui refusant `require`. */
  new Function('require', 'module', 'exports', compile('lib/gemini-live-client.ts'))((id) => assert.fail('import interdit : ' + id), m, m.exports);
  return m.exports.BiaGeminiLive;
}

const RATE = 24000;
/** Un PCM 16 bits : `parts` est une suite de [secondes, amplitude]. */
function pcm(parts) {
  const total = parts.reduce((n, [s]) => n + Math.round(s * RATE), 0);
  const buf = Buffer.alloc(total * 2);
  let k = 0;
  for (const [secondes, amplitude] of parts) {
    const n = Math.round(secondes * RATE);
    for (let i = 0; i < n; i++, k++) buf.writeInt16LE(Math.round(amplitude * Math.sin((2 * Math.PI * 220 * k) / RATE) * 32767), k * 2);
  }
  return buf.toString('base64');
}

function decor({ currentTime = 10, outputLatency, baseLatency = 0.01 } = {}) {
  const ctx = {
    currentTime, baseLatency, state: 'running', destination: {},
    createBuffer: (canaux, longueur, rate) => {
      const donnees = new Float32Array(longueur);
      return { numberOfChannels: canaux, length: longueur, sampleRate: rate, duration: longueur / rate, getChannelData: () => donnees };
    },
    createBufferSource: () => ({ buffer: null, onended: null, connect() {}, disconnect() {}, start() {}, stop() {} }),
  };
  if (outputLatency !== undefined) ctx.outputLatency = outputLatency;
  const vus = [];
  const events = {
    etat: () => {}, transcription: () => {}, latence: () => {}, erreur: () => {},
    bouche: (seg) => vus.push({ quoi: 'bouche', seg }),
    parle: (v) => vus.push({ quoi: 'parle', v }),
  };
  const moteur = new (charger())('CODE', events);
  moteur.output = ctx;
  moteur.stoppe = false;
  return { moteur, ctx, vus, segments: () => vus.filter((v) => v.quoi === 'bouche').map((v) => v.seg) };
}

test("l'enveloppe du son est rendue, et elle l'est avant d'annoncer qu'elle parle", () => {
  const { moteur, vus } = decor();
  moteur.jouer(pcm([[0.2, 0.5]]), 'audio/pcm;rate=24000');
  /* L'ordre compte : si `parle(true)` arrivait d'abord, la page n'aurait
     encore aucun morceau à lire et retomberait sur la minuterie aveugle. */
  assert.deepEqual(vus.map((v) => v.quoi), ['bouche', 'parle']);
  assert.equal(vus[1].v, true);
});

test('un silence vaut un silence : la bouche aura de quoi se fermer', () => {
  const { moteur, segments } = decor();
  moteur.jouer(pcm([[0.2, 0.5], [0.2, 0]]), 'audio/pcm;rate=24000');
  const [seg] = segments();
  assert.equal(seg.pas, 0.04);
  assert.equal(seg.valeurs.length, Math.ceil((0.4 * RATE) / (0.04 * RATE)));
  const part = (i) => seg.valeurs[i] / seg.pic;
  /* La moitié forte ouvre franchement, la moitié muette passe sous 0,05 —
     le seuil de `formeBouche` sous lequel les lèvres se ferment. */
  for (let i = 0; i < 5; i++) assert(part(i) > 0.5, 'tranche ' + i + ' : ' + part(i));
  for (let i = 5; i < 10; i++) assert(part(i) < 0.05, 'tranche ' + i + ' : ' + part(i));
});

test("le morceau porte l'instant où il sortira, et le suivant s'enchaîne sans trou", () => {
  const { moteur, ctx, segments } = decor({ currentTime: 10 });
  moteur.jouer(pcm([[0.2, 0.5]]), 'audio/pcm;rate=24000');
  moteur.jouer(pcm([[0.2, 0.5]]), 'audio/pcm;rate=24000');
  const [un, deux] = segments();
  assert(un.debut >= ctx.currentTime, 'un morceau ne sort jamais dans le passé');
  assert.equal(Math.round((un.fin - un.debut) * 1000), 200);
  /* Les morceaux s'empilent sur la même horloge : c'est précisément ce que
     la minuterie aveugle ignorait, et d'où venait le décalage. */
  assert.equal(deux.debut, un.fin);
});

test("l'horloge recule du retard du haut-parleur, et ce retard est borné", () => {
  const a = decor({ currentTime: 10, outputLatency: 0.04 });
  assert.equal(Math.round(a.moteur.retardDuHautParleur() * 1000), 40);
  assert.equal(Math.round(a.moteur.horlogeDuSon() * 1000), 9960);
  /* Pas d'outputLatency (Safari) : baseLatency prend le relais. */
  const b = decor({ currentTime: 10, baseLatency: 0.012 });
  assert.equal(Math.round(b.moteur.retardDuHautParleur() * 1000), 12);
  /* Un chiffre fantaisiste ne doit pas pouvoir fermer la bouche avant la fin
     de la phrase : on plafonne à 150 ms. */
  const c = decor({ currentTime: 10, outputLatency: 3 });
  assert.equal(Math.round(c.moteur.retardDuHautParleur() * 1000), 150);
  /* Et un contexte mort ne rend pas une heure inventée. */
  c.ctx.state = 'closed';
  assert.equal(c.moteur.horlogeDuSon(), null);
});

test('le son lui-même est intact : on ne fait que le mesurer', () => {
  const { moteur, ctx } = decor();
  let joue = null;
  const vrai = ctx.createBufferSource;
  ctx.createBufferSource = () => { const n = vrai(); const s = n.start.bind(n); n.start = (t) => { joue = { quand: t, duree: n.buffer.duration }; s(t); }; return n; };
  moteur.jouer(pcm([[0.2, 0.5]]), 'audio/pcm;rate=24000');
  assert(joue, 'le morceau doit toujours partir au haut-parleur');
  assert.equal(Math.round(joue.duree * 1000), 200);
});
