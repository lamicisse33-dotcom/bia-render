/* ── BIA SAIT OÙ EST LA PERSONNE, ET LUI DONNE LA MEILLEURE VOIE ───────────

   Lamine, le 24 octobre 2026 : « un touriste ou un étranger perdu demande son
   chemin, BIA sait où il est et lui donne la meilleure voie. »

   CE QUI EXISTAIT ET CE QUI MANQUAIT. La carte se géolocalise déjà et suit la
   personne (app/carte/Carte.tsx). Mais cette position ne quittait JAMAIS le
   composant : BIA pouvait ouvrir une carte, elle ne pouvait pas DIRE « c'est
   à six cents mètres vers le nord-ouest ». Pour quelqu'un qui marche en
   regardant autour de lui, la phrase vaut plus que l'écran.

   ── LA DURÉE D'OSRM NE DOIT PAS ÊTRE DITE À UN PIÉTON ────────────────────

   Mesuré le 24 octobre sur le routeur public, Médina → Ouakam : les cinq
   profils — foot, walking, bike, cycling, driving — rendent EXACTEMENT la
   même durée, 8,5 minutes. Le serveur de démonstration ignore le profil et
   calcule toujours en voiture. Annoncer « huit minutes » à quelqu'un qui
   marche serait faux de bout en bout : 6,7 km à pied font près d'une heure.

   On ne dit donc JAMAIS la durée d'OSRM. On dit la DIRECTION et la DISTANCE —
   indépendantes du profil, et c'est exactement ce que Lamine a demandé — et
   un temps de marche calculé ici, à une vitesse qu'on assume.

   ── CE QUI N'EST JAMAIS ÉCRIT ────────────────────────────────────────────

   La position sert au TOUR EN COURS et disparaît avec lui. Rien dans
   khalam_souvenirs, rien dans Supabase, rien dans le fil, rien dans un
   compteur de /api/etat. Ce module ne sait pas écrire : il n'a aucun import,
   aucun accès réseau, et ne rend que des nombres et des phrases.

   MODULE SANS AUCUN IMPORT, exprès — même leçon que lib/premier-segment.ts,
   lib/diffusion.ts et lib/conversation-groq.ts, apprise trois fois le même
   jour : des épreuves chargent ces fichiers comme modules `data:`, où un
   import relatif est irrésoluble. */

export type Point = { lat: number; lon: number };

/* ── QUAND DEMANDER LA POSITION, ET SEULEMENT ALORS ────────────────────────

   « demandée seulement quand la personne parle de chemin, lieu ou "je suis
   perdu", avec son accord explicite à l'écran, jamais en silence. »

   Les mots sont en français ET en wolof : un touriste demande en français, un
   Dakarois dit « fi laa nekk » ou « yoon wi ». Et on exige un mot de LIEU ou
   de CHEMIN — « je suis perdu dans mes comptes » ne doit pas ouvrir un GPS. */
/* ── LE PIÈGE DU `\b` APRÈS UN ACCENT ──────────────────────────────────────
   `/\bmarch[ée]\b/` ne reconnaît PAS « marché » : `é` n'est pas un caractère
   de mot pour `\b`, donc la frontière de fin échoue entre deux non-mots. La
   moitié des lieux de Dakar s'écrit avec un accent. On borne donc à droite
   par une anticipation sur les lettres Unicode, avec le drapeau `u`. Pas de
   rétro-anticipation : tous ces mots commencent par une lettre ASCII, et
   `\b` suffit à gauche. */
const FIN = "(?![\\p{L}\\p{N}])";
/* Et le même piège à GAUCHE : `\b` devant « église » échoue aussi, puisque
   `é` n'est pas un caractère de mot. On consomme donc un caractère qui n'est
   ni lettre ni chiffre, ou le début du texte. Pas de rétro-anticipation :
   elle n'arrive qu'avec Safari 16.4, et ce module doit tourner partout. */
const DEBUT = "(^|[^\\p{L}\\p{N}])";
/* Les verbes se conjuguent : « emmener », « emmenez », « guidera ». On
   tolère jusqu'à trois lettres de terminaison, puis on borne. */
const SUITE = "[\\p{L}]{0,3}";
const CHEMIN = new RegExp(DEBUT + "(chemin|route|itin[ée]raire|direction|aller|emm[eè]ne|conduis|guide|orienter|trajet|yoon|jox ma yoon|demal)" + SUITE + FIN, "iu");
/* « perdu » tout court ne suffit pas — « j'ai perdu mes clés » n'est pas une
   demande de chemin. Ce sont les phrases de quelqu'un qui ne sait plus où il
   est. Un faux positif coûte UNE question refusable à l'écran ; un faux
   négatif laisse quelqu'un perdu dans une ville inconnue. Le doute penche
   donc du côté de l'aide. */
const PERDU = new RegExp(DEBUT + "(je suis perdue?|suis perdue?|perdu mon chemin|je ne sais pas o[uù]|o[uù] suis[- ]je|o[uù] je suis|fi laa nekk|fi lan la)" + FIN, "iu");
const LIEU = new RegExp(DEBUT + "(o[uù]|lieu|endroit|adresse|quartier|rue|avenue|march[ée]|h[oô]pital|pharmacie|gare|a[ée]roport|plage|mosqu[ée]e|[ée]glise|banque|station|h[oô]tel|restaurant|ambassade|fan|bopp)" + SUITE + FIN, "iu");

/** La personne demande-t-elle son chemin ? Sinon, on ne touche pas au GPS. */
export function demandeDOrientation(texte: string): boolean {
  const t = String(texte || "");
  if (!t.trim()) return false;
  /* « je suis perdu » suffit : c'est la phrase de quelqu'un qui a besoin
     d'aide tout de suite, et lui redemander de préciser serait cruel. */
  if (PERDU.test(t)) return true;
  return CHEMIN.test(t) && LIEU.test(t);
}

/* ── LA DISTANCE, À VOL D'OISEAU ───────────────────────────────────────────
   Haversine. Elle ne remplace pas la route : elle sert quand le routeur ne
   répond pas, et à savoir si la destination est à deux pas ou à l'autre bout
   de la ville avant même de calculer. */
const R = 6371000;
const rad = (d: number) => (d * Math.PI) / 180;

export function distanceM(de: Point, vers: Point): number {
  const dLat = rad(vers.lat - de.lat), dLon = rad(vers.lon - de.lon);
  const a = Math.sin(dLat / 2) ** 2
    + Math.cos(rad(de.lat)) * Math.cos(rad(vers.lat)) * Math.sin(dLon / 2) ** 2;
  return Math.round(2 * R * Math.asin(Math.min(1, Math.sqrt(a))));
}

/** Le cap en degrés depuis le nord, dans le sens des aiguilles. */
export function capDegres(de: Point, vers: Point): number {
  const dLon = rad(vers.lon - de.lon);
  const y = Math.sin(dLon) * Math.cos(rad(vers.lat));
  const x = Math.cos(rad(de.lat)) * Math.sin(rad(vers.lat))
    - Math.sin(rad(de.lat)) * Math.cos(rad(vers.lat)) * Math.cos(dLon);
  return (Math.atan2(y, x) * 180 / Math.PI + 360) % 360;
}

/* Huit directions, pas seize : « est-nord-est » ne se retient pas quand on
   marche. En wolof, les points cardinaux usuels de Dakar. */
const DIRECTIONS = [
  { fr: "le nord", wo: "bëj-gànnaar" },
  { fr: "le nord-est", wo: "bëj-gànnaar ak penku" },
  { fr: "l’est", wo: "penku" },
  { fr: "le sud-est", wo: "bëj-saalum ak penku" },
  { fr: "le sud", wo: "bëj-saalum" },
  { fr: "le sud-ouest", wo: "bëj-saalum ak sowu" },
  { fr: "l’ouest", wo: "sowu-jant" },
  { fr: "le nord-ouest", wo: "bëj-gànnaar ak sowu" },
];

export function direction(de: Point, vers: Point, langue: "fr" | "wo" = "fr"): string {
  const i = Math.round(capDegres(de, vers) / 45) % 8;
  return DIRECTIONS[i][langue];
}

/* ── LE TEMPS DE MARCHE, CALCULÉ ICI ET ASSUMÉ ─────────────────────────────
   4,5 km/h : une marche ordinaire, pas une promenade et pas une course. On
   arrondit vers le haut — arriver avant l'heure annoncée vaut mieux que
   l'inverse quand on cherche son chemin dans une ville inconnue. */
export const VITESSE_MARCHE_KMH = 4.5;
export function minutesDeMarche(metres: number): number {
  return Math.max(1, Math.ceil(metres / (VITESSE_MARCHE_KMH * 1000 / 60)));
}

/** Une distance qui se dit à voix haute, pas un nombre de géomètre. */
export function distanceDite(metres: number, langue: "fr" | "wo" = "fr"): string {
  if (metres < 100) return langue === "wo" ? "lu tollu ci téeméer meetar" : "moins de cent mètres";
  if (metres < 1000) {
    const cent = Math.round(metres / 100) * 100;
    return langue === "wo" ? `${cent} meetar` : `${cent} mètres`;
  }
  const km = metres < 10000 ? Math.round(metres / 100) / 10 : Math.round(metres / 1000);
  const texte = String(km).replace(".", ",");
  return langue === "wo" ? `${texte} kilomeetar` : `${texte} kilomètres`;
}

/* ── LA PHRASE : COURTE, LA DIRECTION ET LA DISTANCE ───────────────────────
   « réponse orale courte avec la direction et la distance, carte affichée en
   plus ». Une phrase, pas un itinéraire récité : l'écran porte le détail. */
export function phraseOrientation(o: {
  de: Point; vers: Point; nom: string; metres?: number | null; langue?: "fr" | "wo";
}): string {
  const langue = o.langue === "wo" ? "wo" : "fr";
  const nom = String(o.nom || "").trim();
  /* La distance du routeur quand on l'a — c'est la vraie, par les rues — et
     celle à vol d'oiseau sinon. Jamais la DURÉE du routeur : voir en tête. */
  const metres = typeof o.metres === "number" && o.metres > 0 ? Math.round(o.metres) : distanceM(o.de, o.vers);
  const vers = direction(o.de, o.vers, langue);
  const loin = distanceDite(metres, langue);
  const minutes = minutesDeMarche(metres);
  if (langue === "wo") {
    return `${nom} mu ngi ci ${vers}, ${loin}. Ci tànk, lu tollu ci ${minutes} simili.`;
  }
  return `${nom}, c’est vers ${vers}, à ${loin}. À pied, environ ${minutes} minutes.`;
}
