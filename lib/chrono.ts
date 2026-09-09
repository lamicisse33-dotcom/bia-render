/* Combien de temps BIA fait attendre — et combien de temps dure ce qu'elle
   dit pendant ce temps.

   L'idée est de Lamine, le 9 septembre 2026, et elle renverse la précédente.
   Jusqu'ici BIA meublait à l'aveugle : une phrase, puis une autre, jusqu'à ce
   que la réponse arrive. Elle parlait trop, ou pas assez. Maintenant elle
   mesure l'attente, mesure ses phrases, et sert celle dont la longueur
   remplit le trou.

   Deux mesures, donc, et rien d'inventé :

   1. L'ATTENTE. Du moment où le micro se coupe à celui où le SON de la
      réponse est en main — pas son texte : c'est la voix qu'on attend. Trois
      morceaux qui s'additionnent : transcrire, interroger le modèle,
      fabriquer la voix.

   2. LA DURÉE PARLÉE de chaque phrase d'attente. Là on ne devine pas non
      plus : le son revient de Soynade, et un son connaît sa propre durée à la
      milliseconde. BIA la note la première fois, et s'en souvient.

   Tout est gardé sur l'appareil. Rien ne part au serveur : ce sont des
   mesures locales, qui dépendent du téléphone et du réseau de la personne. */

export type Voie = "parole" | "ecrit";

export type Mesure = {
  voie: Voie;
  /** Transcrire ce qui a été dit. Zéro quand la question a été tapée. */
  transcription: number;
  /** Le modèle qui écrit la réponse. */
  modele: number;
  /** Soynade qui fabrique le premier morceau de voix. */
  voix: number;
  /** Le total ressenti : c'est celui-là qu'il faut meubler. */
  total: number;
  quand: number;
};

const CLE_MESURES = "bia-attentes";
const CLE_DUREES = "bia-durees";
/** Vingt-quatre échanges : de quoi lisser sans traîner un souvenir périmé. */
const GARDEES = 24;

/* ── Ce qu'on garde sur l'appareil ──────────────────────────────────────── */

export function lireMesures(): Mesure[] {
  try {
    const brut = localStorage.getItem(CLE_MESURES);
    const liste = brut ? JSON.parse(brut) : [];
    return Array.isArray(liste) ? liste : [];
  } catch { return []; }
}

export function noterMesure(m: Mesure, connues: Mesure[] = lireMesures()): Mesure[] {
  const liste = [...connues, m].slice(-GARDEES);
  try { localStorage.setItem(CLE_MESURES, JSON.stringify(liste)); } catch {}
  return liste;
}

export function lireDurees(): Record<string, number> {
  try {
    const brut = localStorage.getItem(CLE_DUREES);
    const objet = brut ? JSON.parse(brut) : {};
    return objet && typeof objet === "object" ? objet as Record<string, number> : {};
  } catch { return {}; }
}

export function noterDuree(texte: string, ms: number, connues: Record<string, number>): void {
  if (!texte || !(ms > 0)) return;
  connues[texte] = Math.round(ms);
  try { localStorage.setItem(CLE_DUREES, JSON.stringify(connues)); } catch {}
}

/* ── Estimer l'attente ──────────────────────────────────────────────────── */

/* La médiane, pas la moyenne. Un réveil de serveur endormi coûte cinquante
   secondes une fois de temps en temps ; la moyenne s'en souviendrait pendant
   vingt échanges et ferait croire que BIA est lente. La médiane l'ignore. */
export function mediane(nombres: number[]): number {
  if (!nombres.length) return 0;
  const tri = [...nombres].sort((a, b) => a - b);
  const milieu = Math.floor(tri.length / 2);
  return tri.length % 2 ? tri[milieu] : Math.round((tri[milieu - 1] + tri[milieu]) / 2);
}

/* Avant la première mesure, il faut bien partir de quelque chose. Ces deux
   valeurs viennent des essais faits à Dakar sur le vrai serveur ; elles sont
   remplacées par du mesuré dès le premier échange. */
export const ATTENTE_PAR_DEFAUT: Record<Voie, number> = { parole: 9000, ecrit: 6000 };

export function attenteEstimee(mesures: Mesure[], voie: Voie): number {
  const memeVoie = mesures.filter((m) => m.voie === voie).map((m) => m.total);
  if (memeVoie.length >= 3) return mediane(memeVoie);
  // Trop peu de mesures pour cette voie : on prend tout, en corrigeant la
  // transcription qui n'existe pas quand on tape.
  const toutes = mesures.map((m) => (voie === "ecrit" ? m.total - m.transcription : m.total));
  if (toutes.length >= 3) return mediane(toutes);
  return ATTENTE_PAR_DEFAUT[voie];
}

/* ── Estimer la durée d'une phrase ──────────────────────────────────────── */

/* Tant qu'une phrase n'a jamais été dite, on ne connaît pas sa durée. On la
   déduit alors de sa longueur, avec le rapport appris sur les phrases déjà
   mesurées — donc sur cette voix-là, à cette vitesse-là. Les deux valeurs de
   départ sont des ordres de grandeur, et ne servent qu'au tout premier tour. */
const MS_PAR_CARACTERE = 65;
const MS_FIXES = 350;

export function msParCaractere(durees: Record<string, number>): number {
  const textes = Object.keys(durees).filter((t) => t.length > 8);
  if (textes.length < 3) return MS_PAR_CARACTERE;
  const rapports = textes.map((t) => Math.max(0, durees[t] - MS_FIXES) / t.length);
  return mediane(rapports.map((r) => Math.round(r * 1000))) / 1000;
}

/** La durée parlée d'une phrase : mesurée si on la connaît, estimée sinon. */
export function msDe(texte: string, durees: Record<string, number>): number {
  const connue = durees[texte];
  if (connue > 0) return connue;
  return Math.round(MS_FIXES + texte.length * msParCaractere(durees));
}

/* ── Choisir la phrase qui remplit ──────────────────────────────────────── */

/* On cherche celle qui tombe le plus juste : ni un silence à la fin, ni une
   phrase qui déborde sur la réponse. Dépasser un peu est moins grave que
   laisser un trou — une phrase qu'on finit de dire pendant que le son de la
   réponse arrive s'entend bien, un blanc s'entend mal. D'où la tolérance. */
export const DEBORDEMENT_TOLERE = 1500;

export function pourRemplir<T>(
  candidats: T[],
  texteDe: (c: T) => string,
  restantMs: number,
  durees: Record<string, number>,
): T | null {
  if (!candidats.length) return null;
  const cible = Math.max(0, restantMs);
  let meilleur: T | null = null;
  let ecartMin = Infinity;
  for (const c of candidats) {
    const ms = msDe(texteDe(c), durees);
    if (ms > cible + DEBORDEMENT_TOLERE) continue;
    const ecart = Math.abs(cible - ms);
    if (ecart < ecartMin) { ecartMin = ecart; meilleur = c; }
  }
  if (meilleur) return meilleur;
  // Tout est trop long pour ce qui reste : on prend la plus courte, car se
  // taire n'est pas une option tant que la réponse n'est pas là.
  return candidats.reduce((a, b) =>
    msDe(texteDe(a), durees) <= msDe(texteDe(b), durees) ? a : b);
}
