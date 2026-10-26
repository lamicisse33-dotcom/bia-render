/* ── LES HUIT BORNES DU MANDAT LATENCE, ET LE PIÈGE QU'ELLES ÉVITENT ────────

   Lamine, le 26 octobre 2026 : « Pose des chronomètres à chaque étape […]
   T0 … T7 […] un tableau avec, pour chaque étape, le temps moyen et le pire
   cas. »

   CE QUE CETTE ÉPREUVE PROTÈGE, ET C'EST LE VRAI DANGER D'UNE MESURE :

   1. QUE LA DÉCOUPE RESTE UNE PARTITION. Ajouter une borne au milieu d'un
      segment déjà mesuré peut compter le même temps DEUX FOIS — et un
      tableau dont les morceaux font 120 % du total ferait réduire la
      mauvaise étape. La somme doit faire exactement le vécu, à la
      milliseconde.

   2. QUE L'ANCIEN CHEMIN NE BOUGE PAS. Un onglet déjà ouvert ne pose pas la
      borne neuve. Sans repli, son tour rendrait une fabrication de voix nulle
      et un total faux. Avec repli, il rend exactement ce qu'il rendait avant
      le 26 octobre.

   3. QU'ON NE COMPARE JAMAIS DEUX HORLOGES. Le serveur déclare SA durée ; si
      elle dépasse ce que le téléphone a attendu, c'est une mesure d'un autre
      tour et on ne la croit pas.                                           */
import assert from 'node:assert/strict';
import test from 'node:test';
import fs from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';

const contexte = { exports: {} };
vm.runInNewContext(ts.transpileModule(fs.readFileSync('lib/tour.ts', 'utf8'),
  { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText, contexte);
const { tourVide, poser, finir, tableauDesEtapes } = contexte.exports;

/** Un tour complet aux huit instants voulus, en millisecondes depuis T0. */
function tourAux({ t1, t3, t4, t5, t6, t7, serveur = 0, fabrication = 0, porte = 0, langue, froid,
                   allerRetour = 0, cerveauServeur = 0, octets = 0, avantEnvoi = 0 }) {
  const b = tourVide();
  const T0 = 1_000_000;
  poser(b, 'parole', T0);
  poser(b, 'micro', T0 + t1);
  poser(b, 'ecoute', T0 + t3);
  poser(b, 'modele', T0 + t4);
  if (t5 !== undefined) poser(b, 'pretAParler', T0 + t5);
  poser(b, 'enMain', T0 + t6);
  poser(b, 'syllabe', T0 + t7);
  b.ecouteServeur = serveur; b.fabrication = fabrication; b.porte = porte;
  b.allerRetourCerveau = allerRetour; b.cerveauServeur = cerveauServeur; b.requeteOctets = octets;
  b.avantEnvoiCerveau = avantEnvoi;
  if (langue) b.langue = langue;
  if (froid !== undefined) b.froid = froid;
  return finir(b);
}

test('les huit bornes découpent le tour sans en perdre ni en compter deux fois', () => {
  const t = tourAux({ t1: 1200, t3: 3500, t4: 5400, t5: 5600, t6: 6100, t7: 6200,
    serveur: 850, fabrication: 400, langue: 'wo' });
  assert.equal(t.queue_ms, 1200);            // T0 → T1
  assert.equal(t.transcription_ms, 2300);    // T1 → T3
  assert.equal(t.modele_ms, 1900);           // T3 → T4
  assert.equal(t.mise_en_voix_ms, 200);      // T4 → T5  ← la borne neuve
  assert.equal(t.voix_ms, 500);              // T5 → T6
  assert.equal(t.demarrage_ms, 100);         // T6 → T7
  assert.equal(t.vecu_ms, 6200);

  /* LA PARTITION. C'est l'assertion qui compte : si une borne future
     chevauche une autre, ce total casse avant que le tableau ne mente. */
  const somme = t.queue_ms + t.transcription_ms + t.modele_ms + t.mise_en_voix_ms
    + t.voix_ms + t.demarrage_ms + t.attente_porte_ms;
  assert.equal(somme, t.vecu_ms);
  assert.equal(t.ailleurs_ms, 0);

  // Les deux parts déclarées par le serveur, et leurs compléments réseau.
  assert.equal(t.transcription_serveur_ms, 850);
  assert.equal(t.transcription_reseau_ms, 2300 - 850);
  assert.equal(t.voix_fabrication_ms, 400);
  assert.equal(t.voix_transfert_ms, 100);
  assert.equal(t.langue, 'wo');
});

test('un onglet qui ne pose pas la borne neuve mesure exactement comme avant', () => {
  const avant = tourAux({ t1: 1200, t3: 3500, t4: 5400, t6: 6100, t7: 6200, fabrication: 400 });
  assert.equal(avant.mise_en_voix_ms, 0);
  // voix_ms repart du modèle : 6100 − 5400, la valeur d'avant le 26 octobre.
  assert.equal(avant.voix_ms, 700);
  assert.equal(avant.voix_fabrication_ms, 400);
  assert.equal(avant.voix_transfert_ms, 300);
  const somme = avant.queue_ms + avant.transcription_ms + avant.modele_ms
    + avant.mise_en_voix_ms + avant.voix_ms + avant.demarrage_ms + avant.attente_porte_ms;
  assert.equal(somme, avant.vecu_ms);
});

test('une durée serveur plus longue que l’attente du téléphone n’est pas crue', () => {
  // Deux horloges mal réglées, ou une mesure venue d'un autre tour.
  const t = tourAux({ t1: 1200, t3: 2000, t4: 3000, t5: 3100, t6: 3200, t7: 3300, serveur: 99999 });
  assert.equal(t.transcription_serveur_ms, t.transcription_ms);
  assert.equal(t.transcription_reseau_ms, 0);
});

test('le tableau classe sur la moyenne et donne le pire cas, sans jamais l’écraser', () => {
  const rapide = tourAux({ t1: 1200, t3: 2200, t4: 3200, t5: 3300, t6: 3600, t7: 3650, serveur: 600, fabrication: 250 });
  const lent = tourAux({ t1: 1200, t3: 6200, t4: 7200, t5: 7300, t6: 7600, t7: 7650, serveur: 900, fabrication: 250 });
  const tableau = tableauDesEtapes([rapide, lent]);
  assert.equal(tableau.tours, 2);

  /* Classé de la plus longue à la plus courte, sur la moyenne. Les deux
     côtés sont recopiés ici : `etapes` vient de l'autre contexte V8, et
     deepEqual refuse deux tableaux dont le prototype diffère — ce qui
     n'aurait rien dit sur l'ordre, la seule chose qu'on vérifie. */
  const moyennes = [...tableau.etapes.map((e) => e.moyen_ms)];
  assert.deepEqual(moyennes, [...moyennes].sort((a, b) => b - a));

  /* Le réseau de la transcription : 400 ms sur le tour rapide, 4 100 ms sur le
     lent. La moyenne seule dirait « 2 250 ms » et cacherait l'instabilité ;
     c'est précisément pour ça qu'il demande le pire cas. */
  const reseau = tableau.etapes.find((e) => e.quoi.includes('RÉSEAU'));
  assert.equal(reseau.moyen_ms, 2250);
  assert.equal(reseau.pire_ms, 4100);
  assert(reseau.pire_ms > reseau.moyen_ms, 'le pire cas doit survivre à la moyenne');

  // Le total est MESURÉ de bout en bout, et la somme des étapes doit le rejoindre.
  assert.equal(tableau.total_vecu.moyen_ms, Math.round((3650 + 7650) / 2));
  assert.equal(tableau.total_vecu.pire_ms, 7650);
  assert.equal(tableau.somme_des_etapes_ms, tableau.total_vecu.moyen_ms);

  // Aucune étape vide n'encombre le tableau.
  assert(tableau.etapes.every((e) => e.moyen_ms > 0 || e.pire_ms > 0));
  assert.equal(tableauDesEtapes([]), null);
});

test('froid et chaud se trient séparément, et la langue suit le tour', () => {
  const froid = tourAux({ t1: 1200, t3: 5000, t4: 6000, t5: 6100, t6: 6400, t7: 6450, langue: 'fr', froid: true });
  const chaud = tourAux({ t1: 1200, t3: 2200, t4: 3200, t5: 3300, t6: 3600, t7: 3650, langue: 'wo', froid: false });
  assert.equal(froid.froid, true);
  assert.equal(chaud.froid, false);
  assert.equal(froid.langue, 'fr');
  assert.equal(chaud.langue, 'wo');
  // Et le froid est bien plus lent : c'est la comparaison qu'il veut lire.
  assert(tableauDesEtapes([froid]).total_vecu.moyen_ms > tableauDesEtapes([chaud]).total_vecu.moyen_ms);
});

/* ── LE TRAJET DU CERVEAU, MESURÉ ET NON DÉDUIT ─────────────────────────────

   Lamine : « mesure les ~1 120 ms entre le téléphone et le serveur par un
   VRAI chronomètre, pas par soustraction ». Le danger d'une mesure en trois
   parts est qu'elles ne refassent plus le tout : le temps disparaîtrait dans
   une part qu'on ne regarde pas, et on irait réduire la mauvaise.          */
test('les trois parts du cerveau refont exactement le cerveau', () => {
  const t = tourAux({ t1: 1200, t3: 2500, t4: 4800, t5: 4900, t6: 5400, t7: 5500,
    allerRetour: 2050, cerveauServeur: 1180, octets: 2552 });
  assert.equal(t.modele_ms, 2300);              // T3 → T4, mesuré par le téléphone
  assert.equal(t.cerveau_serveur_ms, 1180);     // déclaré par le serveur
  assert.equal(t.cerveau_reseau_ms, 870);       // l'aller-retour moins le serveur
  assert.equal(t.requete_octets, 2552);
  // La part non couverte : l'assemblage de la tête sur le téléphone.
  const nonCouverte = t.modele_ms - (t.cerveau_serveur_ms + t.cerveau_reseau_ms);
  assert.equal(nonCouverte, 250);
  assert.equal(t.cerveau_serveur_ms + t.cerveau_reseau_ms + nonCouverte, t.modele_ms);
});

test('un serveur qui déclare plus que l’aller-retour, ou un aller-retour plus long que l’étape, ne sont pas crus', () => {
  // Deux horloges mal réglées, ou une mesure venue d'un autre tour.
  const menteur = tourAux({ t1: 1200, t3: 2500, t4: 4800, t5: 4900, t6: 5400, t7: 5500,
    allerRetour: 99999, cerveauServeur: 99999 });
  assert.equal(menteur.cerveau_serveur_ms, menteur.modele_ms);
  assert.equal(menteur.cerveau_reseau_ms, 0);
  const tropServeur = tourAux({ t1: 1200, t3: 2500, t4: 4800, t5: 4900, t6: 5400, t7: 5500,
    allerRetour: 1000, cerveauServeur: 5000 });
  assert.equal(tropServeur.cerveau_serveur_ms, 1000);
  assert.equal(tropServeur.cerveau_reseau_ms, 0);
});

test('un onglet qui ne dit rien du trajet laisse tout le cerveau dans la part non couverte', () => {
  const vieux = tourAux({ t1: 1200, t3: 2500, t4: 4800, t5: 4900, t6: 5400, t7: 5500 });
  assert.equal(vieux.cerveau_serveur_ms, 0);
  assert.equal(vieux.cerveau_reseau_ms, 0);
  assert.equal(vieux.requete_octets, 0);
  assert.equal(vieux.modele_ms, 2300);   // et le total ne change pas
});

test('le tableau sépare les trois parts du cerveau sans dépasser le total', () => {
  const a = tourAux({ t1: 1200, t3: 2500, t4: 4800, t5: 4900, t6: 5400, t7: 5500,
    allerRetour: 2050, cerveauServeur: 1180, octets: 154 });
  const b = tourAux({ t1: 1200, t3: 2500, t4: 6000, t5: 6100, t6: 6600, t7: 6700,
    allerRetour: 3400, cerveauServeur: 1400, octets: 2552 });
  const tableau = tableauDesEtapes([a, b]);
  const part = (mot) => tableau.etapes.find((e) => e.quoi.includes(mot));
  assert(part('part SERVEUR (préparation'), 'la part serveur du cerveau doit être listée');
  assert(part('part RÉSEAU (la requête monte'), 'la part réseau du cerveau doit être listée');
  assert.equal(part('part SERVEUR (préparation').moyen_ms, 1290);
  assert.equal(part('part RÉSEAU (la requête monte').moyen_ms, (870 + 2000) / 2);
  /* Et le contrôle qui compte : la somme des étapes rejoint le total vécu,
     mesuré de bout en bout. Si une part du cerveau était comptée deux fois,
     ce total exploserait. */
  assert.equal(tableau.somme_des_etapes_ms, tableau.total_vecu.moyen_ms);
});

/* ── LA PART QUE PERSONNE NE MESURAIT, ET QUI SORTAIT PREMIÈRE ─────────────

   Manche du 26 octobre : « le cerveau, part NON COUVERTE » était la plus
   longue ligne du tableau — 4 972 ms, 39 % de son attente — alors que le
   serveur n'en déclarait que 2 161 et le réseau 110. Une étape qu'on ne sait
   pas nommer ne se répare pas ; ce filet exige qu'elle soit nommée, et que
   les QUATRE parts refassent le tout à la milliseconde.                   */
test('les quatre parts du cerveau refont exactement le cerveau', () => {
  const t = tourAux({ t1: 1200, t3: 2500, t4: 10000, t5: 10100, t6: 10600, t7: 10700,
    avantEnvoi: 5000, allerRetour: 2343, cerveauServeur: 2247, octets: 8489 });
  assert.equal(t.modele_ms, 7500);
  assert.equal(t.cerveau_telephone_ms, 5000);   // mesuré sur la montre du téléphone
  assert.equal(t.cerveau_serveur_ms, 2247);
  assert.equal(t.cerveau_reseau_ms, 96);
  const nonCouverte = t.modele_ms
    - (t.cerveau_telephone_ms + t.cerveau_serveur_ms + t.cerveau_reseau_ms);
  assert.equal(nonCouverte, 157);
  assert.equal(t.cerveau_telephone_ms + t.cerveau_serveur_ms + t.cerveau_reseau_ms + nonCouverte,
    t.modele_ms);
});

test('la part téléphone ne peut pas recouvrir l’aller-retour déjà mesuré', () => {
  /* Un téléphone qui déclare avoir tenu toute l'étape alors que le serveur a
     répondu dedans : la place restante est la seule vérité, sinon la même
     milliseconde serait comptée deux fois et le tour entier serait jeté. */
  const t = tourAux({ t1: 1200, t3: 2500, t4: 4800, t5: 4900, t6: 5400, t7: 5500,
    avantEnvoi: 99999, allerRetour: 2050, cerveauServeur: 1180 });
  assert.equal(t.cerveau_telephone_ms, t.modele_ms - 2050);
  assert.equal(t.cerveau_telephone_ms + t.cerveau_serveur_ms + t.cerveau_reseau_ms, t.modele_ms);
});

test('le tableau nomme la part téléphone au lieu de la laisser non couverte', () => {
  const a = tourAux({ t1: 1200, t3: 2500, t4: 10000, t5: 10100, t6: 10600, t7: 10700,
    avantEnvoi: 5000, allerRetour: 2343, cerveauServeur: 2247 });
  const b = tourAux({ t1: 1200, t3: 2500, t4: 9000, t5: 9100, t6: 9600, t7: 9700,
    avantEnvoi: 4000, allerRetour: 2343, cerveauServeur: 2247 });
  const tableau = tableauDesEtapes([a, b]);
  const part = (mot) => tableau.etapes.find((e) => e.quoi.includes(mot));
  const telephone = part('part TÉLÉPHONE');
  assert(telephone, 'la part téléphone du cerveau doit être listée');
  assert.equal(telephone.moyen_ms, 4500);
  /* Et elle sort bien devant : c'est tout l'objet de la mesure. */
  assert.equal(tableau.etapes[0].quoi, telephone.quoi);
  const nonCouverte = part('part NON COUVERTE');
  assert(!nonCouverte || nonCouverte.moyen_ms < telephone.moyen_ms,
    'ce qui reste non couvert doit être plus petit que ce qu’on vient de nommer');
  assert.equal(tableau.somme_des_etapes_ms, tableau.total_vecu.moyen_ms);
});
