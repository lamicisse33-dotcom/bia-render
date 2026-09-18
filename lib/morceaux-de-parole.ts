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
  } else if (d.morceaux.size === 0) {
    /* Le dépôt a été créé par l'annonce de fin, sans son : c'est le premier
       morceau qui dit le vrai type et le vrai nom. */
    d.type = type;
    d.nom = nom;
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
  if (!Number.isInteger(total) || total <= 0 || total > MORCEAUX_AU_PLUS) {
    return { ok: false, motif: "nombre de morceaux invalide" };
  }
  let d = depots.get(cle);
  /* ── LA FIN PEUT ARRIVER AVANT LE PREMIER MORCEAU ───────────────────────

     Depuis le 19 septembre, le téléphone n'attend plus que le dernier
     morceau soit monté pour demander la transcription : les deux voyagent
     en même temps. Sur une phrase d'un seul morceau, l'annonce de fin peut
     donc précéder le morceau lui-même. Un dépôt vide, avec son total, est
     alors créé ici ; le morceau le remplira, et attendreLesMorceaux() le
     verra. Le type et le nom viendront avec lui. */
  if (!d) {
    balayer();
    d = { morceaux: new Map(), type: "audio/webm", nom: "parole.webm", total: null, touche: Date.now(), octets: 0 };
    depots.set(cle, d);
  }
  d.total = total;
  d.touche = Date.now();
  return { ok: true };
}

/* ── ATTENDRE LES DERNIERS MORCEAUX, AU LIEU DE LES FAIRE ATTENDRE ─────────

   Mesuré le 19 septembre 2026 : Soynade transcrit en 1 246 ms côté serveur,
   mais le téléphone en compte 2 231 entre la fermeture du micro et le texte.
   Une seconde d'écart, et une partie tient dans l'ordre des choses : le
   téléphone attendait que le DERNIER morceau soit monté, PUIS envoyait la
   demande de transcription. Deux allers-retours Dakar–Francfort à la suite,
   là où un seul suffit : le dernier morceau et la demande peuvent voyager
   ensemble, et c'est le serveur qui attend le retardataire — ici, à quelques
   millisecondes de lui.

   On attend au plus ATTENTE_DES_DERNIERS_MORCEAUX. Au-delà, on rend la main
   et la route répond 409 comme avant : le téléphone renvoie le fichier
   entier, et Lamine ne voit rien. Le filet n'a pas bougé. */
export const ATTENTE_DES_DERNIERS_MORCEAUX = 1500;
const PAS_D_ATTENTE = 40;

function complet(d: Depot): boolean {
  if (d.total === null) return false;
  for (let i = 0; i < d.total; i++) if (!d.morceaux.has(i)) return false;
  return true;
}

export async function attendreLesMorceaux(cle: string, auPlusMs = ATTENTE_DES_DERNIERS_MORCEAUX): Promise<{ complet: boolean; attendu_ms: number }> {
  const depart = Date.now();
  for (;;) {
    const d = depots.get(cle);
    if (d && complet(d)) return { complet: true, attendu_ms: Date.now() - depart };
    if (Date.now() - depart >= auPlusMs) return { complet: false, attendu_ms: Date.now() - depart };
    await new Promise((r) => setTimeout(r, PAS_D_ATTENTE));
  }
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

/* ── REGARDER SANS CONSOMMER ────────────────────────────────────────────────

   Pour lui couper la parole sans perdre ses mots, il faut savoir CE QU'IL
   DIT pendant qu'elle parle — donc transcrire un enregistrement qui n'est pas
   fini. `recoudre` ne convient pas : il exige le compte total et il détruit le
   dépôt. Ici on prend une copie de ce qui est arrivé jusqu'à maintenant, et le
   dépôt continue de vivre.

   ON NE REND RIEN S'IL MANQUE UN MORCEAU AU DÉBUT. Un fichier audio qui
   commence au milieu n'est pas un fichier : l'en-tête est dans le premier
   morceau, et sans lui le décodeur rend du silence ou refuse. On s'arrête donc
   au premier trou, et on rend ce qui précède — ce qui est toujours un
   enregistrement valide, simplement plus court. */
export function apercu(cle: string): { ok: true; son: Recousu } | { ok: false; motif: string } {
  const d = depots.get(cle);
  if (!d) return { ok: false, motif: "dépôt inconnu ou expiré" };
  const suite: Uint8Array[] = [];
  for (let i = 0; ; i++) {
    const m = d.morceaux.get(i);
    if (!m) break;
    suite.push(m);
  }
  if (!suite.length) return { ok: false, motif: "rien encore reçu" };
  d.touche = Date.now();
  return {
    ok: true,
    son: {
      blob: new Blob(suite as BlobPart[], { type: d.type }),
      nom: d.nom, morceaux: suite.length,
      octets: suite.reduce((n, m) => n + m.byteLength, 0),
    },
  };
}

export function oublierLeDepot(cle: string) { depots.delete(cle); }

/* Ce que le serveur a attendu le dernier morceau, et combien de fois il a
   attendu pour rien. RÈGLE 1 : si `attendus_en_vain` monte, le pari est
   perdu et on remet l'ancien ordre. */
const attentes = { fois: 0, ms: 0, en_vain: 0, ms_max: 0 };
export function noterAttenteDesMorceaux(ms: number, complet: boolean) {
  attentes.fois += 1;
  attentes.ms += ms;
  if (ms > attentes.ms_max) attentes.ms_max = ms;
  if (!complet) attentes.en_vain += 1;
}
export function resumeAttenteDesMorceaux() {
  if (!attentes.fois) return null;
  return {
    demandes: attentes.fois,
    attendu_ms_moyen: Math.round(attentes.ms / attentes.fois),
    attendu_ms_max: attentes.ms_max,
    attendus_en_vain: attentes.en_vain,
    /* Ce que ça remplace : un aller-retour entier du téléphone, ~300 ms
       depuis Dakar. Si attendu_ms_moyen est bien en dessous, c'est gagné. */
    ce_que_ca_remplace: "un aller-retour téléphone–serveur avant la demande de transcription",
  };
}

/** Ce que /api/etat rend, pour qu'on voie si le chemin rapide sert vraiment. */
export function resumeDepots() {
  balayer();
  return { en_cours: depots.size };
}
