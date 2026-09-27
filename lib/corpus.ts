/* ── LE CORPUS : SON WOLOF, GARDÉ PENDANT QU'IL LE PRODUIT ─────────────────

   Lamine, le 15 septembre 2026, après avoir demandé si son wolof pouvait être
   récupéré par les fournisseurs : « comment obtenir cette reconnaissance
   vocale dont tu parles ? »

   ── CE QUI REND LA QUESTION SÉRIEUSE ───────────────────────────────────────

   Le meilleur modèle wolof ouvert d'aujourd'hui (whisper-small-wolof, licence
   MIT) est arrivé à 17 % d'erreur avec CINQUANTE-SEPT HEURES de wolof. Ce
   n'est pas hors de portée : c'est deux mois de ses conversations.

   Et le chiffre d'en face, mesuré sur son serveur le 12 septembre, sur ses
   douze dernières écoutes :

       fra: 8    eng: 1    ita: 1    pam: 1    tur: 1    wol: 0

   Zéro. Il parle wolof à Dakar et l'oreille qu'il paie n'a pas reconnu le
   wolof une seule fois. Un modèle qui ne fait QUE du wolof, même à 17 %,
   pourrait faire mieux — et il tournerait chez lui.

   ── CE QU'ON JETAIT, ET QUI NE SE RATTRAPE PAS ─────────────────────────────

   Pour entraîner une oreille il faut des PAIRES : le son, et les mots qu'il
   contient. Jusqu'à cette heure, BIA transcrivait l'audio puis le laissait
   tomber. On gardait les mots et on jetait le son.

   C'est le même raisonnement que sa mémoire ce matin, et il est aussi
   tranchant : ce qui n'est pas gardé aujourd'hui est perdu pour toujours. Six
   mois d'usage quotidien, c'est son corpus ; six mois sans garder, c'est
   rien.

   ── CE QU'ON GARDE, ET CE QU'ON NE GARDE PAS ───────────────────────────────

   SA VOIX À LUI, SUR LE COMPTE MAÎTRE, ET RIEN D'AUTRE. Pas les testeurs, pas
   les gens qui empruntent son téléphone : garder la voix de quelqu'un le
   concerne, lui, et ça se demande. Il a dit oui pour la sienne le 15
   septembre ; ça s'arrête là, et le code le fait respecter plutôt que la
   bonne volonté.

   ── LA PAIRE VÉRIFIÉE, SANS TRAVAIL EN PLUS ────────────────────────────────

   Ce que l'oreille a écrit n'est pas forcément juste — c'est même tout le
   problème. On garde donc deux textes : `entendu`, ce que le moteur a cru, et
   `verifie`, le texte dont on est sûr. Le second se remplit tout seul quand il
   appuie sur le bouton bleu : à ce moment-là il vient d'entendre BIA répéter
   et il valide. Sa journée de travail fabrique le corpus sans une minute de
   plus.

   ── ET ON NE REMPLIT PAS SON RANGEMENT SANS LE DIRE ────────────────────────

   Son Supabase est au forfait gratuit : un gigaoctet. L'audio du téléphone
   tourne autour de dix mégaoctets l'heure, donc environ trois mois avant que
   ce soit plein. On s'arrête AVANT, et ça se lit dans /api/etat — une panne
   de rangement découverte le jour où c'est plein, c'est une semaine de voix
   perdue sans s'en apercevoir.                                             */

import { lexiqueConfig } from "@/lib/lexique";

const SEAU = process.env.SUPABASE_BUCKET_CORPUS || "corpus";
const TABLE = process.env.SUPABASE_TABLE_CORPUS || "khalam_corpus";

/** Le plafond qu'on se donne, sous le gigaoctet du forfait gratuit. On
    s'arrête avant que Supabase refuse, et on le dit. */
export const OCTETS_AU_PLUS = 700 * 1024 * 1024;

/** Un extrait plus court que ça ne porte pas de parole : un souffle, un
    claquement, un « mm ». Il pèserait dans le rangement sans rien apprendre. */
export const OCTETS_AU_MOINS = 4000;

export const corpusActif = () => Boolean(lexiqueConfig.url && lexiqueConfig.cle);

function entetes(type?: string) {
  return {
    apikey: lexiqueConfig.cle,
    Authorization: `Bearer ${lexiqueConfig.cle}`,
    ...(type ? { "content-type": type } : {}),
  };
}

/* Ce qu'on a déposé depuis le démarrage, pour que ça se voie sans interroger
   Supabase à chaque coup d'œil. Le total d'octets, lui, vient du rangement. */
let compte = { extraits: 0, octets: 0, refuses: 0, dernierRefus: "" };
export function resumeCorpus() {
  return {
    ...compte,
    plafond_octets: OCTETS_AU_PLUS,
    /* La part du plafond déjà prise, en clair. C'est CE chiffre qu'on regarde
       avant de se faire surprendre. */
    part_du_plafond: Math.round((compte.octets / OCTETS_AU_PLUS) * 100),
  };
}

/* ── LE SEAU SE CRÉE TOUT SEUL ──────────────────────────────────────────────

   Une case à cocher de plus dans Supabase, c'est une soirée perdue le jour où
   on oublie de la cocher. Le serveur le crée à la première voix, en PRIVÉ, et
   ne redemande plus. Un seau déjà là rend 409 : ce n'est pas une erreur. */
let seauPret = false;
async function assurerLeSeau(): Promise<void> {
  if (seauPret) return;
  const r = await fetch(`${lexiqueConfig.url}/storage/v1/bucket`, {
    method: "POST",
    headers: entetes("application/json"),
    body: JSON.stringify({ name: SEAU, id: SEAU, public: false }),
  });
  if (r.ok || r.status === 409) { seauPret = true; return; }
  throw new Error(`le seau « ${SEAU} » n'a pas pu être créé (${r.status})`);
}

export type Extrait = {
  /** L'audio tel que le téléphone l'a enregistré. On ne le recode pas : un
      recodage perd de l'information qu'on ne saura pas récupérer plus tard. */
  audio: Blob;
  /** Ce que l'oreille a cru entendre. Pas forcément juste — c'est le sujet. */
  entendu: string;
  langue?: string | null;
  /** « apprentissage » quand il articule exprès pour lui enseigner : ce sont
      les extraits les plus propres du lot. */
  contexte?: string | null;
};

export function ceQuiEmpeche(e: Extrait): string | null {
  if (!e.audio || e.audio.size < OCTETS_AU_MOINS) return "extrait trop court pour porter une parole";
  if (compte.octets >= OCTETS_AU_PLUS) return "le rangement est plein — voir /api/etat";
  return null;
}

function extensionDe(type: string): string {
  const t = String(type || "").toLowerCase();
  if (t.includes("mp4") || t.includes("m4a") || t.includes("aac")) return "mp4";
  if (t.includes("ogg")) return "ogg";
  if (t.includes("wav")) return "wav";
  if (t.includes("mpeg") || t.includes("mp3")) return "mp3";
  return "webm";
}

/**
 * Garder un extrait de SA voix, avec ce que l'oreille en a fait.
 *
 * NE FAIT JAMAIS ATTENDRE LA RÉPONSE : l'appelant lance ceci sans l'attendre.
 * Un extrait perdu coûte un extrait ; une seconde d'attente se paie à chaque
 * phrase de chaque journée.
 *
 * Rend l'identifiant de l'extrait, pour que le bouton bleu puisse venir y
 * accrocher le texte vérifié plus tard.
 */
export async function garderLaVoix(e: Extrait): Promise<string | null> {
  if (!corpusActif()) return null;
  const empeche = ceQuiEmpeche(e);
  if (empeche) {
    compte.refuses++; compte.dernierRefus = empeche;
    return null;
  }
  await assurerLeSeau();
  const quand = new Date();
  /* Rangé par jour : on retrouve une semaine à l'œil, et on peut en effacer
     une sans toucher au reste. */
  const jour = quand.toISOString().slice(0, 10);
  const cle = `${jour}/${quand.getTime().toString(36)}${Math.random().toString(36).slice(2, 8)}`;
  const chemin = `${cle}.${extensionDe(e.audio.type)}`;

  const r = await fetch(`${lexiqueConfig.url}/storage/v1/object/${SEAU}/${chemin}`, {
    method: "POST",
    headers: { ...entetes(e.audio.type || "audio/webm"), "x-upsert": "false" },
    body: e.audio,
  });
  if (!r.ok) throw new Error(`le dépôt de la voix a été refusé (${r.status})`);

  await fetch(`${lexiqueConfig.url}/rest/v1/${TABLE}`, {
    method: "POST",
    headers: { ...entetes("application/json"), Prefer: "return=minimal" },
    body: JSON.stringify([{
      cle,
      chemin,
      application: lexiqueConfig.application,
      entendu: String(e.entendu || "").slice(0, 2000),
      /* Vide au départ. Se remplit au bouton bleu — voir verifierLExtrait(). */
      verifie: null,
      langue: e.langue || null,
      contexte: e.contexte || null,
      octets: e.audio.size,
      type_audio: e.audio.type || "audio/webm",
    }]),
  });

  compte.extraits++;
  compte.octets += e.audio.size;
  return cle;
}

/**
 * Accrocher le texte SÛR à un extrait déjà déposé.
 *
 * C'est ce qui transforme un enregistrement en donnée d'entraînement : sans
 * texte vérifié, on n'a qu'un son. Appelé quand il valide au bouton bleu —
 * à cet instant il vient d'entendre BIA répéter, et il dit que c'est juste.
 */
export async function verifierLExtrait(cle: string, verifie: string): Promise<boolean> {
  if (!corpusActif() || !cle || !String(verifie || "").trim()) return false;
  const r = await fetch(
    `${lexiqueConfig.url}/rest/v1/${TABLE}?cle=eq.${encodeURIComponent(cle)}`,
    {
      method: "PATCH",
      headers: { ...entetes("application/json"), Prefer: "return=minimal" },
      body: JSON.stringify({ verifie: String(verifie).slice(0, 2000) }),
    },
  );
  return r.ok;
}


/* ── LA LECTURE DU CORPUS ─────────────────────────────────────────────── */
export const CHEMIN_CORPUS_VALIDE = /^\d{4}-\d{2}-\d{2}\/[0-9a-z]+\.(mp4|ogg|wav|mp3|webm)$/;

export type ExtraitCorpus = {
  cle: string;
  chemin: string;
  entendu: string;
  verifie: string | null;
  langue: string | null;
  contexte: string | null;
  octets: number;
  type_audio: string;
};

export async function listerCorpus(seulementVerifies = false): Promise<ExtraitCorpus[]> {
  if (!corpusActif()) return [];
  const colonnes = "cle,chemin,entendu,verifie,langue,contexte,octets,type_audio";
  const filtre = seulementVerifies ? "&verifie=not.is.null" : "";
  const r = await fetch(
    `${lexiqueConfig.url}/rest/v1/${TABLE}?select=${colonnes}&order=cle.asc${filtre}`,
    { headers: entetes() },
  );
  if (!r.ok) throw new Error(`la liste du corpus a été refusée (${r.status})`);
  return (await r.json()) as ExtraitCorpus[];
}

export async function lireExtraitAudio(chemin: string): Promise<Response | null> {
  if (!corpusActif()) return null;
  const r = await fetch(`${lexiqueConfig.url}/storage/v1/object/${SEAU}/${chemin}`, { headers: entetes() });
  return r.ok ? r : null;
}
