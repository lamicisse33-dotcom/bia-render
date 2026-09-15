/* ── LA PAROLE QUI MONTE PENDANT QU'IL PARLE ────────────────────────────────

   Lamine, le 15 septembre 2026 : « il faut envoyer la voix comme tu dis,
   partie par partie. »

   ── CE QU'ON A MESURÉ, ET QUI COMMANDE CE FICHIER ──────────────────────────

   Sur trente-sept tours, le 14 septembre au soir :

     tours.transcription_ms   2 235 ms   ce que Lamine attend
     etapes.ecoute            741 ms     l'appel réel à ElevenLabs
     ──────────────────────────────────────────────────────────
     différence               ~1 500 ms  qui ne transcrit rien

   Une seconde et demie à monter un fichier de Dakar à Francfort, APRÈS qu'il
   a fini de parler. Pendant ce temps, la ligne ne fait rien d'autre. C'est le
   plus gros morceau de temps mort de toute la chaîne, et le seul qu'on puisse
   reprendre sans changer un seul fournisseur.

   ── L'IDÉE, ET ELLE TIENT EN UNE PHRASE ────────────────────────────────────

   On n'attend plus la fin pour commencer à monter. L'enregistreur rend un
   morceau toutes les 400 ms, chaque morceau part aussitôt, et quand Lamine se
   tait il ne reste à monter que le dernier — quelques dixièmes au lieu d'une
   seconde et demie.

   ── POURQUOI DES MORCEAUX POSTÉS, ET PAS UN CORPS QUI COULE ────────────────

   La façon élégante serait d'ouvrir UNE requête dont le corps coule au fur et
   à mesure (`fetch` avec un ReadableStream et `duplex: "half"`). Safari ne
   sait pas le faire — ni sur Mac ni sur iPhone. Or c'est sur iPhone que
   Lamine essaie. Une élégance qui ne marche pas chez lui n'est pas une
   élégance.

   On poste donc des morceaux numérotés, et le serveur les recoud. C'est plus
   bavard, et ça marche partout.

   ── CE QUI EST GARDÉ, ET PENDANT COMBIEN DE TEMPS ──────────────────────────

   En mémoire vive, comme les compteurs : un dépôt par tour de parole, effacé
   dès qu'il est consommé. Un dépôt oublié — le téléphone a coupé, l'onglet
   s'est fermé — meurt au bout d'une minute. On ne garde jamais la voix de
   quelqu'un plus longtemps qu'il ne faut pour l'entendre.

   ── ET SI ÇA CASSE ─────────────────────────────────────────────────────────

   C'est le chemin le plus critique de toute l'application : si l'envoi
   échoue, BIA devient sourde. Donc rien ici ne REMPLACE l'envoi complet — il
   s'y ajoute. Au moindre morceau perdu, le téléphone renvoie le fichier
   entier par l'ancien chemin, qui n'a pas bougé d'une ligne. On gagne une
   seconde et demie quand tout va bien, et on ne perd rien quand ça va mal. */

type Depot = {
  /** Les morceaux reçus, rangés par leur numéro d'ordre. */
  morceaux: Map<number, Uint8Array>;
  /** Le type que le téléphone a annoncé (audio/webm, audio/mp4…). */
  type: string;
  /** Le nom du fichier, extension comprise — ElevenLabs le lit. */
  nom: string;
  /** Combien de morceaux au total, connu seulement à la fin. */
  total: number | null;
  /** Pour l'expiration. */
  touche: number;
  /** Somme des octets reçus, pour refuser un dépôt qui enfle. */
  octets: number;
};

const depots = new Map<string, Depot>();

/** Une minute : bien plus qu'un tour de parole, bien moins qu'une fuite. */
const DUREE_DE_VIE = 60_000;
/** Le même plafond que l'ancien chemin : vingt mégaoctets. */
const OCTETS_AU_PLUS = 20 * 1024 * 1024;
/** Au-delà, ce n'est plus une phrase, c'est une inondation. */
const MORCEAUX_AU_PLUS = 400;
const DEPOTS_AU_PLUS = 40;

function balayer() {
  const maintenant = Date.now();
  for (const [cle, d] of depots) {
    if (maintenant - d.touche > DUREE_DE_VIE) depots.delete(cle);
  }
  /* Une garde de plus, au cas où quelque chose déposerait sans jamais finir :
     on jette les plus anciens plutôt que de grandir sans fin. */
  while (depots.size > DEPOTS_AU_PLUS) {
    let plusVieux = "", quand = Infinity;
    for (const [cle, d] of depots) if (d.touche < quand) { quand = d.touche; plusVieux = cle; }
    if (!plusVieux) break;
    depots.delete(plusVieux);
  }
}

/** Un identifiant de tour acceptable : ni vide, ni un chemin déguisé. */
export function cleValide(brut: unknown): string {
  const c = String(brut || "").trim();
  return /^[A-Za-z0-9_-]{8,64}$/.test(c) ? c : "";
}

export type Resultat = { ok: true } | { ok: false; motif: string };

/** Range un morceau. Le premier crée le dépôt et fixe le type et le nom. */
export function poserMorceau(
  cle: string, indice: number, octets: Uint8Array, type: string, nom: string,
): Resultat {
  balayer();
  if (!cle) return { ok: false, motif: "identifiant de tour invalide" };
  if (!Number.isInteger(indice) || indice < 0 || indice >= MORCEAUX_AU_PLUS) {
    return { ok: false, motif: "numéro de morceau hors limites" };
  }
  let d = depots.get(cle);
  if (!d) {
    d = { morceaux: new Map(), type, nom, total: null, touche: Date.now(), octets: 0 };
    depots.set(cle, d);
  }
  /* Un morceau qui arrive deux fois ne compte qu'une fois : le téléphone a le
     droit de réessayer sans fabriquer un doublon dans le son. */
  if (!d.morceaux.has(indice)) {
    d.octets += octets.byteLength;
    if (d.octets > OCTETS_AU_PLUS) {
      depots.delete(cle);
      return { ok: false, motif: "enregistrement trop long" };
    }
    d.morceaux.set(indice, octets);
  }
  d.touche = Date.now();
  return { ok: true };
}

/** Dit combien de morceaux il y aura en tout. Envoyé avec le dernier. */
export function annoncerLaFin(cle: string, total: number): Resultat {
  const d = depots.get(cle);
  if (!d) return { ok: false, motif: "dépôt inconnu ou expiré" };
  if (!Number.isInteger(total) || total <= 0 || total > MORCEAUX_AU_PLUS) {
    return { ok: false, motif: "nombre de morceaux invalide" };
  }
  d.total = total;
  d.touche = Date.now();
  return { ok: true };
}

export type Recousu = { blob: Blob; nom: string; morceaux: number; octets: number };

/* ── RECOUDRE, ET REFUSER DE RECOUDRE UN TROU ───────────────────────────────

   Un enregistrement auquel il manque un morceau n'est pas un enregistrement
   un peu abîmé : c'est un fichier que le décodeur refusera, ou pire, qu'il
   lira en avalant des mots. On ne rend donc rien tant que la suite n'est pas
   COMPLÈTE de zéro à total-1 — et le téléphone repart alors sur l'envoi
   entier, qui n'a jamais cessé de marcher. Mieux vaut une seconde et demie
   qu'une phrase mangée. */
export function recoudre(cle: string): { ok: true; son: Recousu } | { ok: false; motif: string } {
  const d = depots.get(cle);
  if (!d) return { ok: false, motif: "dépôt inconnu ou expiré" };
  if (d.total === null) return { ok: false, motif: "fin non annoncée" };
  const manquants: number[] = [];
  for (let i = 0; i < d.total; i++) if (!d.morceaux.has(i)) manquants.push(i);
  if (manquants.length) {
    return { ok: false, motif: `morceaux manquants : ${manquants.slice(0, 8).join(", ")}` };
  }
  const suite: Uint8Array[] = [];
  for (let i = 0; i < d.total; i++) suite.push(d.morceaux.get(i)!);
  const octets = suite.reduce((n, m) => n + m.byteLength, 0);
  /* Le dépôt meurt ici, consommé. La voix de quelqu'un ne traîne pas. */
  depots.delete(cle);
  return {
    ok: true,
    son: {
      blob: new Blob(suite as BlobPart[], { type: d.type }),
      nom: d.nom, morceaux: suite.length, octets,
    },
  };
}

export function oublierLeDepot(cle: string) { depots.delete(cle); }

/** Ce que /api/etat rend, pour qu'on voie si le chemin rapide sert vraiment. */
export function resumeDepots() {
  balayer();
  return { en_cours: depots.size };
}
