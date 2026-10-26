import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import ts from 'typescript';

/* ── « JE DIS OUI TOUT COURT, RIEN N'EST ENTENDU » ─────────────────────────

   Lamine, le 26 octobre 2026. Le défaut n'était pas un réglage trop sévère :
   c'était TROIS choses qui s'additionnent, et aucune épreuve ne couvrait le
   verdict `vraimentUneVoix`. C'est pour ça que le défaut a pu vivre.

   Compté en trames de 60 ms, pour un mot qui dure D millisecondes :

     1. `creerFiltreDeclenchement` exige 2 trames sur les 4 dernières. La
        première trame audible AMORCE le filtre et n'est pas une trame de
        parole : 60 ms perdus, toujours ;
     2. la page accumulait `Date.now() - dernierSon` à partir de la DEUXIÈME
        trame reconnue — donc un écart, où la trame elle-même ne compte pas :
        60 ms perdus encore, et une trame seule mesurait ZÉRO ;
     3. le plancher valait 350 ms pour tout.

   Résultat : il fallait environ huit trames, presque une demi-seconde de
   son, pour qu'un mot existe. « oui », « waaw », « ok » n'y arrivent pas.

   CE QUE CES ÉPREUVES TIENNENT : la chaîne entière, simulée trame par trame
   comme la page la parcourt — pas seulement le verdict final. Si l'une des
   trois fautes revient, le compte de millisecondes change et ça casse ici. */

const compile = (s) => ts.transpileModule(s, {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
}).outputText;
function charger(chemin) {
  const m = { exports: {} };
  new Function('require', 'module', 'exports', compile(fs.readFileSync(chemin, 'utf8')))(
    (id) => assert.fail(id), m, m.exports);
  return m.exports;
}
const micro = charger('lib/micro.ts');
const { creerFiltreDeclenchement, vraimentUneVoix, vautLaPeine,
        TOUR_DE_VEILLE, PAROLE_MINIMALE, PAROLE_MINIMALE_VOIX,
        PART_VOCALE_MINIMALE, HAUTEUR_MINIMALE } = micro;

/**
 * La boucle de veille de app/page.tsx, trame par trame.
 * @param dureeMs  durée réelle du son
 * @param bande    part de l'énergie dans la bande de la voix (0 à 1)
 * @param hauteur  périodicité mesurée (0 à 1) — une voix en a, un choc non
 * @param compterLesTrames  false = l'ancienne accumulation (un simple écart)
 */
function entendre(dureeMs, bande, hauteur, compterLesTrames = true) {
  const filtre = creerFiltreDeclenchement();
  /* Une veille toutes les 60 ms : un son de D millisecondes est audible sur
     les trames situées à 0, 60, 120… tant qu'elles tombent dedans. */
  const trames = Math.max(1, Math.ceil(dureeMs / TOUR_DE_VEILLE));
  let aParle = false, debutParole = 0, dernierSon = 0, dureeParlee = 0;
  let amorceAudible = 0, bandeTotale = 0, hauteurTotale = 0, mesures = 0, reconnues = 0;
  for (let i = 0; i < trames; i++) {
    /* Une base de temps non nulle, comme `Date.now()` : à zéro, l'instant
       d'amorce serait indistinguable de « pas d'amorce ». */
    const maintenant = 100000 + i * TOUR_DE_VEILLE;
    const candidate = filtre(true, bande);
    if (!candidate) { amorceAudible = maintenant; continue; }
    reconnues++;
    const periodique = hauteur >= HAUTEUR_MINIMALE;
    bandeTotale += bande; hauteurTotale += periodique ? hauteur : hauteur; mesures++;
    if (!aParle) {
      if (compterLesTrames) {
        debutParole = amorceAudible && maintenant - amorceAudible <= 2 * TOUR_DE_VEILLE
          ? amorceAudible : maintenant;
        dureeParlee += maintenant - debutParole + TOUR_DE_VEILLE;
      } else { debutParole = maintenant; }
      aParle = true;
    } else dureeParlee += maintenant - dernierSon;
    dernierSon = maintenant;
  }
  const bandeMoyenne = mesures ? bandeTotale / mesures : null;
  const hauteurMoyenne = mesures ? hauteurTotale / mesures : null;
  return {
    aParle, dureeParlee, trames, reconnues,
    retenu: aParle && vraimentUneVoix(dureeParlee, bandeMoyenne, hauteurMoyenne),
  };
}

const VOIX = { bande: 0.6, hauteur: 0.5 };   // au-dessus des deux seuils
const CHOC = { bande: 0.6, hauteur: 0.1 };   // fort, dans la bande, mais sans fondamentale

test('le défaut, reproduit : « oui » mesurait 180 ms et était jeté', () => {
  /* L'ancienne accumulation, sur un « oui » de 250 ms : quatre trames
     reconnues sur cinq audibles, et un écart de (4 − 1) × 60 = 180 ms.
     C'est EXACTEMENT ce que /api/etat gardait le 26 octobre :
     micro_capture.derniers → { vocales: 4, parole_ms: 180 }. */
  const avant = entendre(250, VOIX.bande, VOIX.hauteur, false);
  assert.equal(avant.dureeParlee, 180, 'le chiffre même de ses mesures');
  /* Et la règle d'alors — un seul plancher, 350 ms pour tout — le refusait.
     `vautLaPeine` sans second argument EST cette règle d'alors : c'est
     pourquoi l'appeler ici reproduit le défaut sans le deviner. */
  assert.equal(vautLaPeine(avant.dureeParlee), false, '180 ms sous le plancher de 350');
  /* IL FALLAIT LES DEUX CORRECTIONS. Avec le nouveau plancher seul, « oui »
     passait déjà — mais de 30 ms, donc un mot un peu plus bref retombait
     dedans. Avec les trames recomptées, il mesure 300 ms : le double de la
     marge. On ne garde pas une réparation qui tient à 30 ms. */
  const apres = entendre(250, VOIX.bande, VOIX.hauteur);
  assert.equal(apres.dureeParlee, 300);
  assert(apres.dureeParlee >= 2 * PAROLE_MINIMALE_VOIX, 'au moins le double du plancher');
  assert(apres.retenu);
});

test('« oui », « waaw », « ok » sont maintenant entendus', () => {
  for (const ms of [200, 250, 300, 350]) {
    const r = entendre(ms, VOIX.bande, VOIX.hauteur);
    assert(r.aParle, `${ms} ms : le micro doit entendre`);
    assert(r.retenu, `${ms} ms : mot retenu, mesuré ${r.dureeParlee} ms`);
  }
});

test('une porte qui claque est toujours écartée, même à la même durée', () => {
  for (const ms of [200, 250, 300, 350]) {
    const r = entendre(ms, CHOC.bande, CHOC.hauteur);
    assert.equal(r.retenu, false,
      `${ms} ms sans périodicité doit rester un bruit (mesuré ${r.dureeParlee} ms)`);
  }
  /* Et le plancher long tient : il faut toujours 350 ms à un son qui ne
     prouve pas qu'il est une voix. */
  assert.equal(vautLaPeine(300, false), false);
  assert.equal(vautLaPeine(350, false), true);
});

test('un moteur qui dure trois secondes reste un bruit (13 septembre)', () => {
  const r = entendre(3000, 0.6, 0.1);
  assert.equal(r.retenu, false, 'la durée ne rachète pas l’absence de voix');
  const horsBande = entendre(3000, 0.1, 0.5);
  assert.equal(horsBande.retenu, false, 'hors de la bande de la voix non plus');
});

test('quand on n’a rien pu mesurer, le plancher court ne s’applique pas', () => {
  /* Le doute profite à l'envoi partout ailleurs — mais ici il profiterait
     aux portes : sans spectre, on ne PROUVE pas une voix. */
  assert.equal(vraimentUneVoix(200, null, null), false);
  assert.equal(vraimentUneVoix(400, null, null), true);
});

test('les deux planchers, et l’écart entre eux, sont ceux qu’on annonce', () => {
  assert.equal(PAROLE_MINIMALE, 350);
  assert.equal(PAROLE_MINIMALE_VOIX, 150);
  assert(PAROLE_MINIMALE_VOIX < PAROLE_MINIMALE, 'le court doit être plus court');
  assert(PAROLE_MINIMALE_VOIX > TOUR_DE_VEILLE * 2,
    'au-dessus de deux trames, sinon un claquement périodique par accident passerait');
  assert.equal(PART_VOCALE_MINIMALE, 0.3);
  assert.equal(HAUTEUR_MINIMALE, 0.35);
});

test('l’anti-scintillement coûte toujours une trame, et c’est elle qu’on reprend', () => {
  const filtre = creerFiltreDeclenchement();
  assert.equal(filtre(true, 0.6), false, 'la première trame amorce et ne compte pas');
  assert.equal(filtre(true, 0.6), true, 'la deuxième déclenche');
  /* Donc un mot de 250 ms donne cinq trames audibles et quatre reconnues ;
     la trame d'amorce et la trame courante valent chacune un tour de veille,
     et c'est ce que la page recompte maintenant. */
  const r = entendre(250, VOIX.bande, VOIX.hauteur);
  assert.equal(r.trames, 5, 'cinq trames audibles');
  assert.equal(r.reconnues, 4, 'quatre reconnues — le chiffre de ses mesures');
  assert.equal(r.dureeParlee, 300, '180 ms d’écart + l’amorce + la trame courante');
});
