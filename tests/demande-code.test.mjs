import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import ts from 'typescript';
import crypto from 'node:crypto';

/* ── « DEMANDER UN CODE À KHALAM » ─────────────────────────────────────────

   Lamine, le 28 octobre 2026. Les six scènes qu'il a demandées sont nommées
   comme il les a écrites : numéro vide, numéro invalide, case non cochée,
   demande valide, même numéro plusieurs fois. La sixième — le formulaire sur
   un écran de 375 px — est dans tests/demande-code-browser.cjs, parce qu'elle
   ne se prouve que dans un vrai navigateur.

   Le vrai Supabase n'est pas touché : la table est remplacée par une mémoire
   qui répond comme PostgREST (201 à l'insertion, 409 sur un doublon, 204 sur
   un PATCH). Ce que ça ne prouve pas est écrit à la fin. */

process.env.BIA_SECRET = 'secret-d-epreuve';

const compiler = (f) => ts.transpileModule(fs.readFileSync(f, 'utf8'),
  { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText;

function charger(chemin, modules = {}) {
  const m = { exports: {} };
  new Function('require', 'module', 'exports', 'process', compiler(chemin))(
    (id) => { if (id in modules) return modules[id]; throw new Error(chemin + ' ne doit pas importer : ' + id); },
    m, m.exports, process);
  return m.exports;
}

const format = charger('lib/numero-format.ts', {});
const numeros = { ...format, ...charger('lib/acces-numero.ts',
  { 'node:crypto': crypto, './numero-format': format }) };

function montrerLaTable({ actif = true, enPanne = false } = {}) {
  const lignes = new Map();
  const journal = [];
  globalThis.fetch = async (url, options = {}) => {
    const adresse = String(url);
    journal.push(adresse + ' ' + (options.method || 'GET'));
    if (enPanne) throw new Error('Supabase injoignable');
    const corps = options.body ? JSON.parse(String(options.body)) : null;
    if (options.method === 'POST') {
      if (lignes.has(corps.numero)) return new Response(null, { status: 409 });
      lignes.set(corps.numero, { ...corps, demande_le: new Date().toISOString(), derniere: new Date().toISOString() });
      return new Response(null, { status: 201 });
    }
    if (options.method === 'PATCH') {
      const numero = decodeURIComponent(adresse.split('numero=eq.')[1] || '');
      if (!lignes.has(numero)) return new Response(null, { status: 404 });
      lignes.set(numero, { ...lignes.get(numero), ...corps });
      return new Response(null, { status: 204 });
    }
    return Response.json([...lignes.values()]);
  };
  const demandes = charger('lib/demandes-code.ts', {
    './lexique': { lexiqueConfig: { url: 'https://rangement.epreuve', cle: 'cle-de-service', actif } },
    './acces-numero': numeros,
  });
  return { demandes, lignes, journal };
}

const BON = { numero: '+221 77 123 45 67', prenom: 'Awa', accord: true, visiteur: 'v1' };

/* ── LES SCÈNES DEMANDÉES ─────────────────────────────────────────────── */

test('numéro vide : refusé, en français clair', async () => {
  const { demandes, lignes } = montrerLaTable();
  for (const vide of ['', '   ', undefined]) {
    const r = await demandes.enregistrerDemande({ ...BON, numero: vide });
    assert.equal(r.ok, false);
    assert.equal(r.message, 'Saisis ton numéro de téléphone.');
  }
  assert.equal(lignes.size, 0, 'rien ne doit être rangé');
});

test('numéro invalide : refusé, avec un exemple', async () => {
  const { demandes, lignes } = montrerLaTable();
  for (const faux of ['bonjour', '12', '06 12 34 56 78', '+0123456789']) {
    const r = await demandes.enregistrerDemande({ ...BON, numero: faux });
    assert.equal(r.ok, false, 'accepté à tort : ' + faux);
    assert.equal(r.message, 'Ce numéro n’est pas valide. Exemple : +221 77 123 45 67.');
  }
  assert.equal(lignes.size, 0);
});

test('case non cochée : refusé, même avec un bon numéro', async () => {
  const { demandes, lignes } = montrerLaTable();
  const r = await demandes.enregistrerDemande({ ...BON, accord: false });
  assert.equal(r.ok, false);
  assert.equal(r.message, 'Coche la case pour que KHALAM puisse t’envoyer ton code.');
  assert.equal(lignes.size, 0, 'sans son accord, rien ne doit être gardé');
});

test('demande valide : rangée en clair, avec son prénom et sa date', async () => {
  const { demandes, lignes } = montrerLaTable();
  assert.deepEqual(await demandes.enregistrerDemande(BON), { ok: true, etat: 'nouvelle' });
  assert.equal(lignes.size, 1);
  const ligne = lignes.get('+221771234567');
  /* EN CLAIR, et c'est voulu : Lamine doit pouvoir rappeler ces gens. Ce qui
     protège, c'est la porte de la table, pas un chiffrement. */
  assert.equal(ligne.numero, '+221771234567');
  assert.equal(ligne.prenom, 'Awa');
  assert.equal(ligne.statut, 'en attente');
  assert.ok(ligne.demande_le, 'la date doit être posée');
});

test('le lien WhatsApp porte le numéro du demandeur et le message qu’il a dicté', () => {
  const { demandes } = montrerLaTable();
  const lien = demandes.lienWhatsApp('+221771234567');
  assert.ok(lien.startsWith('https://wa.me/221773728383?text='), lien);
  const texte = decodeURIComponent(lien.split('text=')[1]);
  assert.equal(texte, 'Bonjour KHALAM, je voudrais un code pour BIA. Mon numéro : +221771234567');
  /* Et il se change sans toucher au code. */
  process.env.KHALAM_WHATSAPP = '+33 6 12 34 56 78';
  assert.ok(demandes.lienWhatsApp('+221771234567').startsWith('https://wa.me/33612345678?'));
  delete process.env.KHALAM_WHATSAPP;
});

test('même numéro plusieurs fois : une seule ligne, dont la date remonte', async () => {
  const { demandes, lignes } = montrerLaTable();
  assert.deepEqual(await demandes.enregistrerDemande(BON), { ok: true, etat: 'nouvelle' });
  const premiere = lignes.get('+221771234567').derniere;
  /* Écrit autrement, c'est le même téléphone. */
  const second = await demandes.enregistrerDemande({ ...BON, numero: '00221771234567', prenom: 'Awa Diop', visiteur: 'v2' });
  assert.deepEqual(second, { ok: true, etat: 'deja_connue' });
  assert.equal(lignes.size, 1, 'une seule ligne par numéro : la liste doit se lire à l’œil');
  assert.equal(lignes.get('+221771234567').prenom, 'Awa Diop', 'un prénom donné plus tard complète la ligne');
  assert.ok(lignes.get('+221771234567').derniere >= premiere);
});

/* ── LE FREIN ET LE PIÈGE ─────────────────────────────────────────────── */

test('trois demandes pour le même numéro, et la quatrième attend', async () => {
  const { demandes } = montrerLaTable();
  for (let i = 0; i < 3; i++)
    assert.equal((await demandes.enregistrerDemande({ ...BON, visiteur: 'v' + i })).ok, true, 'demande ' + (i + 1));
  const quatrieme = await demandes.enregistrerDemande({ ...BON, visiteur: 'v9' });
  assert.equal(quatrieme.ok, false);
  assert.equal(quatrieme.message, 'Tu as déjà envoyé plusieurs demandes. Attends un peu, KHALAM va te répondre.');
});

test('le même visiteur ne peut pas verser cent numéros inventés', async () => {
  const { demandes, lignes } = montrerLaTable();
  for (let i = 0; i < 5; i++)
    assert.equal((await demandes.enregistrerDemande({ ...BON, numero: '+22177123456' + i, visiteur: 'robot' })).ok, true);
  const stop = await demandes.enregistrerDemande({ ...BON, numero: '+221771234599', visiteur: 'robot' });
  assert.equal(stop.ok, false);
  assert.equal(lignes.size, 5, 'le sixième ne doit pas être rangé');
});

test('le champ piège rempli : rien n’est rangé, et le robot ne l’apprend pas', async () => {
  const { demandes, lignes } = montrerLaTable();
  const r = await demandes.enregistrerDemande({ ...BON, piege: 'KHALAM SARL' });
  /* On lui répond comme à tout le monde : lui dire « tu es un robot » lui
     apprendrait à éviter le champ la prochaine fois. */
  assert.equal(r.ok, true);
  assert.equal(lignes.size, 0, 'la table ne doit pas avoir bougé');
  assert.ok(demandes.resumeDemandesCode().robots > 0, '/api/etat doit pouvoir le compter');
});

/* ── QUAND LE RANGEMENT NE RÉPOND PAS ─────────────────────────────────── */

test('rangement en panne : on le dit, on ne fait pas croire que c’est parti', async () => {
  const { demandes } = montrerLaTable({ enPanne: true });
  const r = await demandes.enregistrerDemande(BON);
  assert.equal(r.ok, false);
  assert.equal(r.message, 'La demande n’a pas pu être enregistrée. Réessaie dans un instant.');
  /* Et le motif exact ne part PAS au téléphone : il dirait le nom de la table
     et l'état du serveur à quiconque sonde la route. */
  assert.ok(!/Supabase|rest\/v1|injoignable/i.test(r.message), r.message);
});

/* ── LA LISTE, POUR LUI ───────────────────────────────────────────────── */

test('la liste se lit et une ligne se marque « code envoyé »', async () => {
  const { demandes, lignes } = montrerLaTable();
  await demandes.enregistrerDemande(BON);
  const liste = await demandes.listerDemandes();
  assert.equal(liste.length, 1);
  assert.equal(liste[0].statut, 'en attente');
  assert.equal(await demandes.changerStatut('77 123 45 67', 'code envoyé'), true);
  assert.equal(lignes.get('+221771234567').statut, 'code envoyé');
  /* Un statut inventé n'entre pas : la colonne doit rester lisible. */
  assert.equal(await demandes.changerStatut('+221771234567', 'peut-être'), false);
});

/* ── LES ORIGINES QUI ONT LE DROIT DE DEMANDER UN CODE ────────────────────

   La page officielle de BIA est bia.khalam.app, servie par GitHub Pages : il
   n'y a pas de serveur dessous, donc son formulaire appelle cette route-ci,
   sur Render. Sans son origine dans la liste, le navigateur refuse la réponse
   et le bouton ne rend RIEN — sans message utile.

   Une étoile ici ouvrirait le formulaire à n'importe quelle page du monde,
   qui s'en servirait pour remplir la table de Lamine depuis chez elle. */
test('la route accepte les quatre adresses de la maison, et rien d’autre', () => {
  const route = fs.readFileSync('app/api/demande-code/route.ts', 'utf8');
  const liste = route.match(/const SITES = \[([^\]]+)\]/);
  assert.ok(liste, 'la liste des origines doit être une constante');
  const sites = [...liste[1].matchAll(/"([^"]+)"/g)].map((m) => m[1]);
  for (const maison of ['https://bia.khalam.app', 'https://khalam.app',
                        'https://www.khalam.app', 'https://app.khalam.app'])
    assert.ok(sites.includes(maison), maison + ' doit pouvoir demander un code : ' + sites.join(', '));
  assert.ok(!sites.some((s) => s.includes('*')), 'aucune étoile : ' + sites.join(', '));
  for (const s of sites) assert.match(s, /^https:\/\/([a-z-]+\.)?khalam\.app$/, 'origine étrangère : ' + s);
});

/* ── CE QUE CES ÉPREUVES NE DISENT PAS ─────────────────────────────────────

   La vraie table n'est pas touchée : PostgREST est remplacé par une mémoire
   qui répond comme lui. Que la table soit bien PRIVÉE en production dépend du
   SQL que Lamine colle dans Supabase (RLS activé, aucune policy) — cela ne
   s'éprouve pas d'ici, et c'est écrit dans le rapport.

   Les deux freins vivent en mémoire : ils repartent à zéro quand Render
   redémarre. Ils arrêtent une main et un robot naïf, pas une machine patiente
   qui attendrait un redémarrage.

   Et personne ne vérifie que le numéro existe : il n'y a pas de SMS. Quelqu'un
   peut demander un code pour un numéro qui n'est pas le sien — c'est Lamine
   qui répond, à la main, et c'est là que ça se voit. */
