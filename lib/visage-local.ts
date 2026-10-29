/* ── LE VISAGE LOCAL : UNE BOUCLE DERRIÈRE, UNE BOUCHE PAR-DESSUS ──────────

   Lamine, le 29 octobre 2026 : « Ajoute un DEUXIÈME personnage BIA (même
   personnage, même nom, même voix, même consignes), construit sur les images
   du 28 octobre […] boucle en fond, bouche composée par-dessus choisie
   25 fois par seconde avec l'analyse d'enveloppe sonore existante. »

   ── POURQUOI CE FICHIER NE CONTIENT NI DOM NI VIDÉO ───────────────────────

   Tout ce qui se décide ici — quelle boucle pour quel état, quelle bouche
   pour quelle énergie, dans quel ordre charger — s'éprouve sans navigateur
   et sans un seul octet de vidéo. Le composant, lui, ne fait qu'obéir. C'est
   la seule façon d'avoir des épreuves vertes AVANT que les boucles existent.

   ── CE QUI N'EST PAS ICI, ET C'EST VOULU ──────────────────────────────────

   L'enveloppe sonore. Elle existe déjà dans app/page.tsx — l'énergie moyenne
   par tranche de 75 ms, `enveloppeDe`, qui alimente `formeBouche` et pose
   `face`. On ne la refait pas et on n'y touche pas : le visage local reçoit
   le MÊME `face` que le personnage existant, et se contente de le traduire
   en l'une de ses huit bouches. Une seule bouche sur les deux moteurs, un
   seul endroit où le son commande les lèvres.

   ── LE PERSONNAGE EXISTANT N'EST PAS CONCERNÉ ─────────────────────────────

   Le personnage animé (les couches `.avatar` et `PortraitTenue`) reste la
   référence et n'est touché par rien de ce fichier. Les deux coexistent, et
   c'est le but : on les compare.                                          */

/** La tenue du 28 octobre sur laquelle ce visage est construit. Une seule :
 *  chaque tenue de plus multiplierait par trois le coût des boucles. */
export const TENUE_DU_VISAGE_LOCAL = "vert-or";

/** L'identifiant de cette apparence, dans la même liste que les autres.
 *  Le 29 octobre 2026 au soir, l'architecture des personnages est devenue une
 *  liste d'apparences qui se choisissent toutes pareil (satin, Runway direct,
 *  les trois tenues). Ce visage y entre comme une sixième : il n'a donc ni
 *  drapeau à part, ni clé de rangement à lui, et app/page.tsx n'a pas une
 *  ligne à changer pour lui. */
export const ID_VISAGE_LOCAL = "visage-local";

/* ── LES HUIT BOUCHES ──────────────────────────────────────────────────────

   Découpées du portrait HD du 28 octobre, dans la boîte ci-dessous, bords
   adoucis sur seize pixels pour qu'aucun rectangle ne se voie par-dessus la
   vidéo. Voir outils/couper-bouches.cjs.

   SEPT SONT DES DÉCOUPES RÉELLES, la huitième est dérivée : le portrait
   approuvé ne contient pas de lèvres plus ouvertes que sa tuile la plus
   ouverte, et dessiner une bouche sur une photographie se voit. `grand-a`
   est donc cette tuile ouverte de 8 %. C'est écrit ici pour que personne
   n'aille chercher une neuvième pose qui n'existe pas. */
export const BOUCHES_LOCALES = ["repos", "fermee", "entr", "ou", "o", "a", "i", "grand-a"] as const;
export type BoucheLocale = typeof BOUCHES_LOCALES[number];

export const DOSSIER_BOUCHES = "/personnages/bouches-20261029";
export const fichierBouche = (b: BoucheLocale) => `${DOSSIER_BOUCHES}/${b}.png`;

/** La boîte de la bouche dans le portrait natif (1024 × 1536), en pour cent.
 *  Le composant ne connaît que ces quatre nombres : il n'a aucune idée de la
 *  taille à laquelle le portrait est affiché, et c'est ce qui le rend juste
 *  à 375 px comme à 1024. */
export const BOITE_BOUCHE = {
  gauche: (392 / 1024) * 100,
  haut: (240 / 1536) * 100,
  largeur: (240 / 1024) * 100,
  hauteur: (120 / 1536) * 100,
} as const;

/* ── DU VISAGE DU PERSONNAGE EXISTANT À L'UNE DES HUIT ─────────────────────

   `face` vient du même endroit pour les deux personnages. Les noms
   `bouche_*` sont posés par `formeBouche` depuis l'énergie du son ; tout le
   reste (émotions, regards, gestes) n'est pas une bouche et retombe sur une
   bouche fermée — avec la même règle que `visagePourFace` : une bouche
   restée affichée après l'arrêt de la parole est un défaut, pas une pose. */
const DES_FACES: Record<string, BoucheLocale> = {
  bouche_fermee: "fermee", bouche_entr: "entr", bouche_ou: "ou",
  bouche_o: "o", bouche_a: "a", bouche_i: "i", bouche_A: "grand-a",
};

export function bouchePourFace(face: string, parle = false): BoucheLocale {
  if (!parle) return face === "joie" || face === "rire" || face === "malice" ? "fermee" : "repos";
  const trouvee = DES_FACES[face];
  if (trouvee) return trouvee;
  /* Elle parle, mais ce tour-ci porte une émotion et non une bouche : on
     garde une bouche entrouverte plutôt que de la refermer en pleine
     phrase, ce qui ferait un trou dans la parole. */
  return "entr";
}

/* ── LES SIX BOUCLES ───────────────────────────────────────────────────────

   Trois à quatre secondes, bouche FERMÉE, qui reviennent exactement à leur
   première image. La bouche fermée n'est pas un détail d'économie : c'est la
   condition pour qu'une bouche composée par-dessus ne se batte pas avec une
   bouche filmée dessous. */
export const BOUCLES = ["repos", "ecoute", "parole", "parole-joyeuse", "reflexion", "rire"] as const;
export type Boucle = typeof BOUCLES[number];

export const DOSSIER_BOUCLES = "/personnages/boucles-20261029";
/** Les deux encodages, dans l'ordre où le téléphone doit les essayer. */
export function sourcesBoucle(b: Boucle) {
  return [
    { src: `${DOSSIER_BOUCLES}/${b}.mp4`, type: "video/mp4" },
    { src: `${DOSSIER_BOUCLES}/${b}.webm`, type: "video/webm" },
  ];
}

/** Le fondu d'une boucle à la suivante, en millisecondes. */
export const FONDU_MS = 200;
/** Vingt-cinq images par seconde : une bouche toutes les 40 ms. */
export const PAS_BOUCHE_MS = 40;

export type EtatVisage = "ready" | "listening" | "thinking" | "speaking" | "error";

/** Ce que le portrait reçoit — `parle` et `ecoute` — traduit en état.
 *  « thinking » n'est pas atteignable par ce chemin : le portrait ne le reçoit
 *  pas. La boucle de réflexion existe quand même, prête pour le jour où il
 *  sera transmis, et c'est dit plutôt que caché. */
export function etatDuPortrait(parle: boolean, ecoute: boolean): EtatVisage {
  return parle ? "speaking" : ecoute ? "listening" : "ready";
}

/* ── QUELLE BOUCLE, POUR QUEL INSTANT ──────────────────────────────────────

   L'état passe avant l'émotion, et c'est volontaire : une émotion joyeuse
   pendant qu'elle ÉCOUTE ne doit pas lancer la boucle de parole joyeuse —
   elle n'a pas encore ouvert la bouche. L'émotion ne départage que les
   boucles de parole. */
export function bouclePour(etat: EtatVisage, emotion = ""): Boucle {
  const gaie = /^(joie|rire|malice|fourire|rire_tete|rire_retenu|rire_apaise)$/.test(emotion);
  if (etat === "speaking") return gaie ? "parole-joyeuse" : "parole";
  if (etat === "thinking") return "reflexion";
  if (etat === "listening") return "ecoute";
  /* Au repos, un rire peut encore finir de s'entendre : on le laisse vivre
     une boucle, sinon le rire se coupe net à la fin de la phrase. */
  if (etat === "ready" && /^(rire|fourire|rire_tete)$/.test(emotion)) return "rire";
  return "repos";
}

/* ── L'ORDRE DE CHARGEMENT ─────────────────────────────────────────────────

   « repos chargé d'abord, le reste en arrière-plan ». Sur un téléphone à
   Dakar, demander six vidéos à l'ouverture, c'est six vidéos qui se gênent
   et un personnage qui n'apparaît pas. Le repos seul, puis les autres dans
   l'ordre où elles ont le plus de chances de servir. */
export const ORDRE_DE_CHARGEMENT: Boucle[] = ["repos", "parole", "ecoute", "reflexion", "parole-joyeuse", "rire"];

/** Le seau du navigateur où les boucles sont gardées hors ligne.
 *
 *  PAS LE SERVICE WORKER, et la raison est écrite dans public/sw.js : il ne
 *  garde délibérément PAS l'application, parce qu'une version gardée a déjà
 *  servi une vieille BIA à tout le monde sans que personne comprenne. Des
 *  vidéos datées, elles, ne périment jamais : leur nom porte leur date. On
 *  les range donc depuis la page, dans un seau à part, et le service worker
 *  garde sa règle intacte. */
export const SEAU_HORS_LIGNE = "bia-visage-local-20261029";

/** Tous les fichiers du visage local, pour le rangement hors ligne et pour
 *  la mesure du poids téléchargé. */
export function fichiersDuVisageLocal(): string[] {
  return [
    ...BOUCHES_LOCALES.map(fichierBouche),
    ...ORDRE_DE_CHARGEMENT.flatMap(b => sourcesBoucle(b).map(s => s.src)),
  ];
}
