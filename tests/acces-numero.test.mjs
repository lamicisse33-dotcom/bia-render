import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import ts from 'typescript';

/* ── ENTRER DANS BIA DEMANDE UN NUMÉRO ET UN CODE ──────────────────────────

   Lamine, le 28 octobre 2026 : « pour entrer dans BIA, l'utilisateur saisit
   son NUMÉRO DE TÉLÉPHONE et son CODE UTILISATEUR. Les deux sont
   obligatoires. […] Le code est lié au numéro à la première utilisation :
   ensuite il ne marche que sur ce numéro. »

   Les cinq scènes qu'il a demandées sont au bas de ce fichier, nommées comme
   il les a écrites : bon code + bon numéro, mauvais code, bon code + autre
   numéro, code maître, utilisateur actuel.

   RIEN N'EST ÉPROUVÉ CONTRE LE VRAI SUPABASE : le rangement est remplacé par
   un seau en mémoire qui répond comme lui (200, 404 sur un objet absent, 409
   sur une écriture qui arrive deuxième). Ce que ça ne prouve pas est écrit à
   la fin du fichier. */

process.env.BIA_SECRET = 'secret-d-epreuve';

const compiler = (f) => ts.transpileModule(fs.readFileSync(f, 'utf8'),
  { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText;

function charger(chemin, modules = {}) {
  const m = { exports: {} };
  new Function('require', 'module', 'exports', 'process', compiler(chemin))(
    (id) => {
      if (id in modules) return modules[id];
      throw new Error(chemin + ' ne doit pas importer : ' + id);
    }, m, m.exports, process);
  return m.exports;
}

/* `normaliserNumero` vit désormais dans son propre fichier, sans dépendance :
   l'écran d'entrée de BIA l'emploie aussi, et il ne peut pas embarquer
   `node:crypto`. On charge les deux et on les réunit, comme le fait le
   serveur. */
const format = charger('lib/numero-format.ts', {});
const numero = { ...format, ...charger('lib/acces-numero.ts',
  { 'node:crypto': await import('node:crypto'), './numero-format': format }) };

/* ── LA MISE EN FORME ─────────────────────────────────────────────────────
   Le même homme ne doit pas être refusé parce qu'il a tapé un espace de plus
   que la veille. */
test('toutes les façons d’écrire un numéro sénégalais donnent le même', () => {
  const attendu = '+221771234567';
  for (const ecriture of ['771234567', '77 123 45 67', '+221 77 123 45 67', '+221771234567',
                          '00221771234567', '221771234567', '77-123-45-67', '(77) 123 45 67'])
    assert.equal(numero.normaliserNumero(ecriture), attendu, 'refusé : ' + ecriture);
});

test('les numéros internationaux passent, les bouillies non', () => {
  assert.equal(numero.normaliserNumero('+33 6 12 34 56 78'), '+33612345678');
  assert.equal(numero.normaliserNumero('+1 202 555 0147'), '+12025550147');
  assert.equal(numero.normaliserNumero('+39 320 123 4567'), '+393201234567');
  assert.equal(numero.normaliserNumero('+221 77 123 45 67'), '+221771234567');
  for (const faux of ['', '   ', 'bonjour', '12', '0612345678', '+0123456789',
                      '+1234567890123456', null, undefined])
    assert.equal(numero.normaliserNumero(faux), null, 'accepté à tort : ' + JSON.stringify(faux));
});

/* ── L'EMPREINTE ──────────────────────────────────────────────────────────
   Ce qui est rangé ne doit rendre aucun numéro à celui qui le vole. */
test('l’empreinte est stable, signée, et ne contient pas le numéro', () => {
  const e = numero.empreinteNumero('+221771234567');
  assert.equal(e, numero.empreinteNumero('+221771234567'), 'la même entrée doit donner la même empreinte');
  assert.notEqual(e, numero.empreinteNumero('+221771234568'), 'deux numéros ne doivent pas se confondre');
  assert.match(e, /^[0-9a-f]{32}$/);
  assert.ok(!e.includes('771234567'), 'le numéro ne doit pas être lisible dans son empreinte');
  /* Signée : sans le secret du serveur, on ne peut pas la recalculer. Il y a
     moins de dix millions de numéros sénégalais — un sha256 nu se casserait
     sur un ordinateur portable. */
  const avant = process.env.BIA_SECRET;
  process.env.BIA_SECRET = 'un-autre-secret';
  assert.notEqual(numero.empreinteNumero('+221771234567'), e,
    'changer le secret doit changer l’empreinte, sinon elle n’est pas signée');
  process.env.BIA_SECRET = avant;
});

/* ── LE RANGEMENT, REMPLACÉ PAR UNE TABLE EN MÉMOIRE ──────────────────────

   Depuis le soir du 28 octobre 2026, la liaison vit dans une table Supabase
   (`khalam_codes`) avec le numéro EN CLAIR, et non plus en empreintes dans un
   seau. On remplace donc PostgREST par une mémoire qui répond comme lui :
   200 avec un tableau sur un SELECT, 201 sur une insertion, 409 sur un
   doublon, 204 sur une suppression.

   L'ancien seau est encore lu, jamais écrit : `seau` ci-dessous permet d'y
   poser une vieille liaison et de vérifier que son propriétaire entre
   toujours. */
function montrerLeRangement({ actif = true, seau = null } = {}) {
  const lignes = new Map();
  const appels = { lectures: 0, ecritures: 0, seau: 0 };
  globalThis.fetch = async (url, options = {}) => {
    const adresse = String(url);
    const methode = options.method || 'GET';
    if (adresse.includes('/storage/v1/')) {
      appels.seau += 1;
      const nom = adresse.split('/').pop().replace('.json', '');
      return seau && seau.cle === nom
        ? Response.json({ numero: seau.empreinte })
        : new Response(null, { status: 404 });
    }
    const corps = options.body ? JSON.parse(String(options.body)) : null;
    const cle = decodeURIComponent((adresse.split('code_empreinte=eq.')[1] || '').split('&')[0]);
    if (methode === 'GET') { appels.lectures += 1; const l = lignes.get(cle); return Response.json(l ? [l] : []); }
    if (methode === 'POST') {
      appels.ecritures += 1;
      if (lignes.has(corps.code_empreinte)) return new Response(null, { status: 409 });
      lignes.set(corps.code_empreinte, { ...corps, cree_le: new Date().toISOString() });
      return new Response(null, { status: 201 });
    }
    if (methode === 'DELETE') { lignes.delete(cle); return new Response(null, { status: 204 }); }
    return new Response(null, { status: 400 });
  };
  const lien = charger('lib/acces-lien.ts', {
    './lexique': { lexiqueConfig: { url: 'https://rangement.epreuve', cle: 'cle-de-service', actif } },
    './acces-numero': numero,
  });
  return { lien, lignes, appels };
}

const CODE = 'ABCD23EFGH';
const AUTRE = 'ZZZZ99YYYY';
const LUI = '+221771234567';
const ELLE = '77 765 43 21';

/* ── LES CINQ SCÈNES DEMANDÉES ────────────────────────────────────────── */

test('bon code + bon numéro : il entre, et le code se lie à ce téléphone', async () => {
  const { lien, lignes } = montrerLeRangement();
  const premier = await lien.verifierNumero(CODE, LUI, false);
  assert.deepEqual(premier, { ok: true, lie: 'nouveau' });
  assert.equal(lignes.size, 1, 'une liaison, et une seule, doit être rangée');
  /* Et ce qui est rangé ne contient NI le code NI le numéro en clair. */
  const [cle, ligne] = [...lignes.entries()][0];
  /* LE CODE reste une empreinte — voler la table ne donne le code de personne. */
  assert.match(cle, /^[0-9a-f]{32}$/);
  assert.ok(!cle.includes(CODE), 'le code ne doit pas être lisible : ' + cle);
  /* LE NUMÉRO, lui, est EN CLAIR, et c'est sa décision du 28 octobre au soir :
     il fabrique les codes un par un et doit savoir à qui il a donné quoi. */
  assert.equal(ligne.numero, '+221771234567');
  assert.equal(ligne.origine, 'premiere_utilisation');
  /* Le lendemain, le même téléphone repasse. */
  const second = await lien.verifierNumero(CODE, LUI, false);
  assert.deepEqual(second, { ok: true, lie: 'deja' });
  /* Et il repasse même écrit autrement. */
  assert.deepEqual(await lien.verifierNumero(CODE, '00221 77 123 45 67', false), { ok: true, lie: 'deja' });
});

test('mauvais numéro, ou pas de numéro : refusé, en français clair', async () => {
  const { lien } = montrerLeRangement();
  for (const [saisi, attendu] of [[null, 'Saisis ton numéro de téléphone.'],
                                  ['', 'Saisis ton numéro de téléphone.'],
                                  ['  ', 'Saisis ton numéro de téléphone.'],
                                  ['bonjour', 'Ce numéro n’est pas valide. Exemple : +221 77 123 45 67.'],
                                  ['12', 'Ce numéro n’est pas valide. Exemple : +221 77 123 45 67.']]) {
    const v = await lien.verifierNumero(CODE, saisi, false);
    assert.equal(v.ok, false);
    assert.equal(v.message, attendu);
    assert.ok(!/HTTP|Supabase|undefined|null/.test(v.message), 'aucun mot technique : ' + v.message);
  }
});

test('bon code + AUTRE numéro : refusé, et la liaison d’origine ne bouge pas', async () => {
  const { lien, lignes } = montrerLeRangement();
  await lien.verifierNumero(CODE, LUI, false);
  const vole = await lien.verifierNumero(CODE, ELLE, false);
  assert.equal(vole.ok, false);
  assert.equal(vole.message, 'Ce code est déjà utilisé avec un autre numéro.');
  assert.equal(lignes.size, 1, 'un code prêté ne doit pas créer une deuxième liaison');
  /* Le propriétaire, lui, entre toujours. */
  assert.deepEqual(await lien.verifierNumero(CODE, LUI, false), { ok: true, lie: 'deja' });
});

test('code maître : il entre depuis n’importe quel téléphone, et n’est jamais lié', async () => {
  const { lien, lignes } = montrerLeRangement();
  assert.deepEqual(await lien.verifierNumero('MAITRE', LUI, true), { ok: true, lie: 'maitre' });
  assert.deepEqual(await lien.verifierNumero('MAITRE', ELLE, true), { ok: true, lie: 'maitre' });
  assert.equal(lignes.size, 0, 'le code maître ne doit RIEN ranger : Lamine ouvre BIA de plusieurs téléphones');
  /* Mais son numéro reste obligatoire : les deux champs le sont pour tous. */
  const sans = await lien.verifierNumero('MAITRE', '', true);
  assert.equal(sans.ok, false);
  assert.equal(sans.message, 'Saisis ton numéro de téléphone.');
});

test('utilisateur actuel : son code marchait avant les numéros, il se lie au premier qu’il donne', async () => {
  const { lien, lignes } = montrerLeRangement();
  /* Rien n'est rangé pour lui : son code existe, sa liaison non. Il ne doit
     pas être mis dehors — il donne son numéro une fois, et c'est tout. */
  assert.equal(lignes.size, 0);
  assert.deepEqual(await lien.verifierNumero(CODE, LUI, false), { ok: true, lie: 'nouveau' });
  assert.deepEqual(await lien.verifierNumero(CODE, LUI, false), { ok: true, lie: 'deja' });
});

/* ── LE FREIN CONTRE CELUI QUI DEVINE ─────────────────────────────────── */
test('cinq refus et la porte se ferme quelques minutes', async () => {
  const { lien } = montrerLeRangement();
  await lien.verifierNumero(CODE, LUI, false);
  for (let i = 0; i < 5; i++) {
    const v = await lien.verifierNumero(CODE, ELLE, false);
    assert.equal(v.message, 'Ce code est déjà utilisé avec un autre numéro.', 'essai ' + (i + 1));
  }
  const sixieme = await lien.verifierNumero(CODE, ELLE, false);
  assert.equal(sixieme.message, 'Trop d’essais. Attends quelques minutes avant de réessayer.');
  /* Et le propriétaire est freiné lui aussi, puisque c'est SON code qu'on
     attaque : c'est le prix du frein, et il dure quelques minutes. */
  const proprietaire = await lien.verifierNumero(CODE, LUI, false);
  assert.equal(proprietaire.ok, false);
});

/* ── ON N'ENFERME PERSONNE DEHORS QUAND LE RANGEMENT TOMBE ────────────── */
test('rangement absent ou muet : on laisse entrer sans lier, et on le dit', async () => {
  const { lien } = montrerLeRangement({ actif: false });
  assert.deepEqual(await lien.verifierNumero(CODE, LUI, false), { ok: true, lie: 'sans_memoire' });
  assert.ok(lien.resumeAccesNumero().sans_memoire > 0, '/api/etat doit pouvoir le montrer');

  const { lien: muet } = montrerLeRangement();
  globalThis.fetch = async () => { throw new Error('réseau coupé'); };
  const v = await muet.verifierNumero(CODE, LUI, false);
  assert.deepEqual(v, { ok: true, lie: 'sans_memoire' },
    'une panne de Supabase ne doit pas mettre tous les utilisateurs dehors');
});

/* ── DEUX TÉLÉPHONES À LA MÊME SECONDE ────────────────────────────────── */
test('course : le premier arrivé garde le code, le second est refusé', async () => {
  const { lien, lignes } = montrerLeRangement();
  const [a, b] = await Promise.all([
    lien.verifierNumero(CODE, LUI, false),
    lien.verifierNumero(CODE, ELLE, false),
  ]);
  assert.equal(lignes.size, 1, 'une seule liaison doit survivre à la course');
  assert.equal([a, b].filter((v) => v.ok).length, 1, 'un seul des deux doit entrer : ' + JSON.stringify([a, b]));
});

/* ── DEUX CODES NE SE MARCHENT PAS DESSUS ─────────────────────────────── */
test('un autre code sur le même téléphone reste possible', async () => {
  const { lien, lignes } = montrerLeRangement();
  await lien.verifierNumero(CODE, LUI, false);
  /* Un même téléphone peut recevoir un deuxième code — une famille, un
     renouvellement. Ce qui est interdit, c'est un code sur deux téléphones,
     pas deux codes sur un téléphone. */
  assert.deepEqual(await lien.verifierNumero(AUTRE, LUI, false), { ok: true, lie: 'nouveau' });
  assert.equal(lignes.size, 2);
});

/* ── LE CODE NAÎT DÉJÀ ATTRIBUÉ ───────────────────────────────────────────

   Lamine, le 28 octobre 2026 au soir : « il doit demander le numéro et lier
   le code à CE numéro dès la création. Ce code ne marche ensuite que pour ce
   numéro. »

   Avant ce jour, un code naissait anonyme et se liait au premier téléphone
   qui l'employait : celui qui interceptait le code sur WhatsApp pouvait le
   prendre avant son destinataire. */
test('code créé pour le numéro A : il marche avec A, il est refusé avec B', async () => {
  const { lien, lignes } = montrerLeRangement();
  const A = '+221771234567', B = '+221776543210';
  assert.deepEqual(await lien.creerLien(CODE, A, 'Awa'), { ok: true });
  assert.equal(lignes.size, 1);
  assert.equal([...lignes.values()][0].origine, 'genere');
  assert.equal([...lignes.values()][0].prenom, 'Awa');
  /* A entre. */
  assert.deepEqual(await lien.verifierNumero(CODE, A, false), { ok: true, lie: 'deja' });
  assert.deepEqual(await lien.verifierNumero(CODE, '77 123 45 67', false), { ok: true, lie: 'deja' });
  /* B est refusé, et la liaison d'origine ne bouge pas. */
  const vole = await lien.verifierNumero(CODE, B, false);
  assert.equal(vole.ok, false);
  assert.equal(vole.message, 'Ce code est déjà utilisé avec un autre numéro.');
  assert.equal(lignes.size, 1);
  assert.equal([...lignes.values()][0].numero, A);
});

test('créer un lien sans numéro, ou avec un numéro invalide, est refusé', async () => {
  const { lien, lignes } = montrerLeRangement();
  for (const [saisi, attendu] of [['', 'Saisis ton numéro de téléphone.'],
                                  ['   ', 'Saisis ton numéro de téléphone.'],
                                  ['bonjour', 'Ce numéro n’est pas valide. Exemple : +221 77 123 45 67.']]) {
    const r = await lien.creerLien(CODE, saisi);
    assert.equal(r.ok, false, 'accepté à tort : ' + JSON.stringify(saisi));
    assert.equal(r.message, attendu);
  }
  assert.equal(lignes.size, 0, 'aucun code ne doit être lié à rien');
});

/* ── CHANGEMENT DE TÉLÉPHONE ──────────────────────────────────────────────
   « Un moyen de délier ou de régénérer un code. » */
test('délier rend le code libre ; relier le déplace d’un coup', async () => {
  const { lien, lignes } = montrerLeRangement();
  const A = '+221771234567', B = '+221776543210';
  await lien.creerLien(CODE, A);
  assert.equal(await lien.delierCode(CODE), true);
  assert.equal(lignes.size, 0);
  /* Délié, il se relie au prochain téléphone qui l'emploie — y compris un
     nouveau, ce qui est tout l'objet du geste. */
  assert.deepEqual(await lien.verifierNumero(CODE, B, false), { ok: true, lie: 'nouveau' });

  const { lien: deux } = montrerLeRangement();
  await deux.creerLien(CODE, A);
  assert.deepEqual(await deux.relierCode(CODE, B), { ok: true });
  assert.deepEqual(await deux.verifierNumero(CODE, B, false), { ok: true, lie: 'deja' });
  const ancien = await deux.verifierNumero(CODE, A, false);
  assert.equal(ancien.ok, false, 'l’ancien téléphone ne doit plus entrer');
});

/* ── LES LIAISONS DU MATIN NE SONT PAS PERDUES ────────────────────────────
   Elles vivaient dans un seau, en empreintes. On les lit encore, on n'y
   écrit plus : leurs propriétaires ne doivent pas être mis dehors. */
test('une liaison posée dans l’ancien seau laisse toujours entrer son propriétaire', async () => {
  const A = '+221771234567', B = '+221776543210';
  const { lien } = montrerLeRangement({
    seau: { cle: numero.empreinteCode(CODE), empreinte: numero.empreinteNumero(A) },
  });
  assert.deepEqual(await lien.verifierNumero(CODE, A, false), { ok: true, lie: 'deja' });
  const autre = await lien.verifierNumero(CODE, B, false);
  assert.equal(autre.ok, false, 'et un autre téléphone reste refusé');
});

/* ── CE QUE CES ÉPREUVES NE DISENT PAS ─────────────────────────────────────

   Le vrai Supabase n'est pas touché : le seau est remplacé par une mémoire
   qui répond comme lui. Qu'il soit bien PRIVÉ en production se lit dans
   `assurerLeSeau`, qui refuse de travailler sur un seau public, mais cela ne
   s'éprouve pas ici.

   Le frein à cinq essais vit en mémoire : il repart à zéro quand Render
   redémarre. Il freine une main, pas une machine patiente.

   Et personne ne vérifie que le numéro EXISTE : il n'y a pas de SMS, Lamine
   n'en veut pas pour l'instant. Quelqu'un peut donc lier son code à un numéro
   inventé — ce qu'on empêche, c'est qu'un code serve sur deux téléphones. */
