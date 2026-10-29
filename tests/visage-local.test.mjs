import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import ts from 'typescript';

/* ── LE DEUXIÈME VISAGE DE BIA ─────────────────────────────────────────────

   Lamine, le 29 octobre 2026 : un deuxième personnage BIA — même personnage,
   même nom, même voix, mêmes consignes — dont le visage est fabriqué SUR LE
   TÉLÉPHONE : une boucle vidéo bouche fermée en fond, une bouche découpée du
   portrait du 28 octobre par-dessus, choisie vingt-cinq fois par seconde sur
   l'enveloppe du son.

   Tout ce qui se décide dans lib/visage-local.ts s'éprouve ici sans
   navigateur et sans un seul octet de vidéo — c'est exactement pourquoi ce
   fichier existe : les boucles n'existent pas encore (il manque la clé
   Runway), et la logique doit être verte avant elles. */

function charger(chemin) {
  const m = { exports: {} };
  const js = ts.transpileModule(fs.readFileSync(chemin, 'utf8'),
    { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText;
  new Function('require', 'module', 'exports', js)(
    (id) => { throw new Error(chemin + ' ne doit rien importer : ' + id); }, m, m.exports);
  return m.exports;
}
const V = charger('lib/visage-local.ts');

/* ── LES HUIT BOUCHES EXISTENT VRAIMENT ──────────────────────────────────── */
test('les huit bouches sont découpées, présentes sur le disque et non vides', () => {
  assert.equal(V.BOUCHES_LOCALES.length, 8);
  assert.equal(new Set(V.BOUCHES_LOCALES).size, 8, 'aucun doublon de nom');
  for (const b of V.BOUCHES_LOCALES) {
    const chemin = 'public' + V.fichierBouche(b);
    assert(fs.existsSync(chemin), 'manque : ' + chemin);
    assert(fs.statSync(chemin).size > 5000, b + ' est trop petite pour être une vraie bouche');
  }
});

/* ── MACOS NE DISTINGUE PAS a.png DE A.png ────────────────────────────────
   Trouvé en les écrivant : la huitième écrasait la sixième sans un mot, et
   il ne restait que sept fichiers. Le filet est ici pour que personne ne
   réintroduise une paire qui ne diffère que par la casse. */
test('deux bouches ne peuvent pas différer seulement par la casse', () => {
  const bas = V.BOUCHES_LOCALES.map(b => b.toLowerCase());
  assert.equal(new Set(bas).size, 8, 'sur un disque insensible à la casse, deux fichiers s’écraseraient');
});

/* ── LA BOÎTE DE LA BOUCHE EST EN POUR CENT, DONC JUSTE À TOUTE TAILLE ──── */
test('la boîte de la bouche tombe au bon endroit du portrait, en pour cent', () => {
  const b = V.BOITE_BOUCHE;
  /* 392/1024 et 240/1536 : le découpage réel de outils/couper-bouches.cjs. */
  assert(Math.abs(b.gauche - 38.28125) < 1e-6);
  assert(Math.abs(b.haut - 15.625) < 1e-6);
  assert(Math.abs(b.largeur - 23.4375) < 1e-6);
  assert(Math.abs(b.hauteur - 7.8125) < 1e-6);
  /* Elle reste entièrement dans le cadre : une bouche qui déborde ferait un
     rectangle contre le bord. */
  assert(b.gauche + b.largeur < 100);
  assert(b.haut + b.hauteur < 100);
});

/* ── LA BOUCHE SUIT LE SON, ET SE TAIT QUAND ELLE SE TAIT ────────────────── */
test('chaque forme posée par l’enveloppe sonore a sa bouche', () => {
  /* Ce sont exactement les sept noms que `formeBouche` peut rendre dans
     app/page.tsx. Si quelqu'un en ajoute un huitième là-bas sans l'ajouter
     ici, la bouche resterait entrouverte sur cette forme — ce filet le dit. */
  const formes = ['bouche_fermee', 'bouche_entr', 'bouche_o', 'bouche_ou', 'bouche_a', 'bouche_A', 'bouche_i'];
  for (const f of formes) {
    const b = V.bouchePourFace(f, true);
    assert(V.BOUCHES_LOCALES.includes(b), f + ' ne donne pas une bouche connue : ' + b);
    assert.notEqual(b, 'repos', f + ' est une parole : elle ne peut pas rendre la bouche de repos');
  }
  /* Sept formes distinctes doivent donner sept bouches distinctes : si deux
     formes rendaient la même image, la bouche paraîtrait bloquée. */
  assert.equal(new Set(formes.map(f => V.bouchePourFace(f, true))).size, 7);
});

test('quand elle ne parle pas, la bouche se ferme — jamais une bouche restée ouverte', () => {
  for (const f of ['bouche_a', 'bouche_A', 'bouche_i', 'yeux_ouverts', 'pensive', 'concernee']) {
    const b = V.bouchePourFace(f, false);
    assert(['repos', 'fermee'].includes(b), f + ' au silence donne ' + b);
  }
});

test('une émotion pendant la parole garde la bouche entrouverte, pas fermée', () => {
  /* Refermer la bouche en pleine phrase ferait un trou dans la parole. */
  assert.equal(V.bouchePourFace('joie', true), 'entr');
  assert.equal(V.bouchePourFace('etonnement', true), 'entr');
});

/* ── QUELLE BOUCLE, POUR QUEL INSTANT ────────────────────────────────────── */
test('l’état commande la boucle, et l’émotion ne départage que la parole', () => {
  assert.equal(V.bouclePour('ready'), 'repos');
  assert.equal(V.bouclePour('listening'), 'ecoute');
  assert.equal(V.bouclePour('thinking'), 'reflexion');
  assert.equal(V.bouclePour('speaking'), 'parole');
  assert.equal(V.bouclePour('speaking', 'joie'), 'parole-joyeuse');
  assert.equal(V.bouclePour('speaking', 'rire'), 'parole-joyeuse');
  /* L'INTERDIT : une émotion joyeuse pendant qu'elle ÉCOUTE ne doit pas
     lancer la parole joyeuse — elle n'a pas encore ouvert la bouche. */
  assert.equal(V.bouclePour('listening', 'joie'), 'ecoute');
  assert.equal(V.bouclePour('thinking', 'joie'), 'reflexion');
  /* Au repos, un rire peut finir de s'entendre : il a sa boucle. */
  assert.equal(V.bouclePour('ready', 'rire'), 'rire');
  assert.equal(V.bouclePour('ready', 'joie'), 'repos');
  /* Une panne n'a pas de boucle à elle : elle retombe au repos. */
  assert.equal(V.bouclePour('error'), 'repos');
});

test('toutes les boucles nommées sont des boucles connues', () => {
  const etats = ['ready', 'listening', 'thinking', 'speaking', 'error'];
  const emotions = ['', 'joie', 'rire', 'concernee', 'pensive', 'malice', 'fourire'];
  for (const e of etats) for (const em of emotions) {
    assert(V.BOUCLES.includes(V.bouclePour(e, em)), e + '/' + em);
  }
  /* Et les six sont toutes atteignables : une boucle qu'aucun état n'appelle
     serait une vidéo payée pour rien. */
  const vues = new Set();
  for (const e of etats) for (const em of emotions) vues.add(V.bouclePour(e, em));
  assert.equal(vues.size, 6, 'boucles jamais servies : '
    + V.BOUCLES.filter(b => !vues.has(b)).join(', '));
});

/* ── L'ORDRE DE CHARGEMENT ───────────────────────────────────────────────── */
test('le repos est chargé d’abord, et les six exactement une fois', () => {
  assert.equal(V.ORDRE_DE_CHARGEMENT[0], 'repos');
  assert.equal(V.ORDRE_DE_CHARGEMENT.length, 6);
  assert.deepEqual([...V.ORDRE_DE_CHARGEMENT].sort(), [...V.BOUCLES].sort());
});

test('chaque boucle est offerte en H.264 puis en WebM, dans cet ordre', () => {
  for (const b of V.BOUCLES) {
    const s = V.sourcesBoucle(b);
    assert.equal(s.length, 2);
    assert.equal(s[0].type, 'video/mp4');
    assert.equal(s[1].type, 'video/webm');
    assert(s[0].src.endsWith('/' + b + '.mp4'));
    assert(s[1].src.endsWith('/' + b + '.webm'));
  }
});

/* ── LES RÉGLAGES QU'IL A DEMANDÉS, AU CHIFFRE PRÈS ──────────────────────── */
test('vingt-cinq images par seconde et deux cents millisecondes de fondu', () => {
  assert.equal(V.PAS_BOUCHE_MS, 40, '25 images par seconde = une bouche toutes les 40 ms');
  assert.equal(V.FONDU_MS, 200);
});

/* ── CE QUE LE RANGEMENT HORS LIGNE NE DOIT PAS ÊTRE ─────────────────────── */
test('le seau hors ligne est daté, et distinct de celui du service worker', () => {
  const sw = fs.readFileSync('public/sw.js', 'utf8');
  const nom = sw.match(/const CACHE\s*=\s*"([^"]+)"/);
  assert(nom, 'public/sw.js ne déclare plus de cache nommé');
  assert.notEqual(V.SEAU_HORS_LIGNE, nom[1],
    'les boucles ne doivent pas partager le seau du service worker : `activate` l’efface');
  assert(/20261029/.test(V.SEAU_HORS_LIGNE), 'un seau daté ne peut pas servir une vieille BIA');
});

test('la liste des fichiers à garder hors ligne contient tout, et rien d’autre', () => {
  const f = V.fichiersDuVisageLocal();
  assert.equal(f.length, 8 + 6 * 2);
  assert.equal(new Set(f).size, f.length, 'aucun doublon');
  for (const c of f) assert(c.startsWith('/personnages/'), c);
});

/* ── LES DEUX LITTÉRAUX RECOPIÉS NE DOIVENT JAMAIS DIVERGER ──────────────
   lib/apparences-bia.ts les recopie au lieu de les importer : son épreuve le
   transpile seul et ne sait pas suivre un import relatif. Une copie non
   gardée finit toujours par dériver ; celle-ci est gardée. */
test('l’identifiant et la tenue sont les mêmes des deux côtés', () => {
  const source = fs.readFileSync('lib/apparences-bia.ts', 'utf8');
  const id = source.match(/const ID_VISAGE_LOCAL = "([^"]+)"/);
  const tenue = source.match(/const TENUE_DU_VISAGE_LOCAL = "([^"]+)"/);
  assert(id && tenue, 'lib/apparences-bia.ts ne déclare plus les deux copies');
  assert.equal(id[1], V.ID_VISAGE_LOCAL);
  assert.equal(tenue[1], V.TENUE_DU_VISAGE_LOCAL);
  /* Et la tenue existe vraiment, sinon le fond serait une image absente. */
  assert(fs.existsSync('public/personnages/tenues-hd-20261028/' + tenue[1] + '-repos.webp'));
});

/* ── CE QUE CES ÉPREUVES NE DISENT PAS ─────────────────────────────────────

   Les six boucles n'existent pas encore : il manque la clé RUNWAY_API_KEY,
   et la route que Lamine avait nommée (/v1/avatar_videos) ne sait pas les
   faire — voir outils/boucles-visage-local.cjs. Ce fichier éprouve donc le
   CHOIX des boucles, jamais leur contenu. Qu'une boucle revienne vraiment à
   sa première image, et que ses lèvres restent vraiment fermées, ne se voit
   qu'à l'œil, sur les vraies vidéos.

   La synchronisation bouche-son ne se mesure pas ici non plus : elle se
   mesure dans le navigateur, et c'est tests/visage-local-browser.cjs. */
