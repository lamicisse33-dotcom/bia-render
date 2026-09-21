/* Ce que le serveur retient des attentes mesurées par les téléphones.

   Les mesures vivent d'abord sur l'appareil : c'est là qu'elles servent, à
   choisir la phrase de la bonne longueur. Mais elles y sont invisibles pour
   qui ne tient pas le téléphone — et il faut bien pouvoir les lire pour
   savoir quelles phrases écrire.

   Alors chaque appareil en envoie une copie ici, et /api/etat en donne le
   résumé. Même idée que lib/panne.ts, et pour la même raison : ce qu'on ne
   peut pas voir, on ne peut pas le corriger.

   Rien de personnel n'y passe — ni question, ni réponse, ni identifiant.
   Trois durées et une voie. La mémoire du serveur suffit : au réveil de
   Render tout repart à zéro, et ce n'est pas grave, les téléphones gardent
   les leurs. */

export type Vue = {
  voie: "parole" | "ecrit";
  transcription: number;
  modele: number;
  voix: number;
  total: number;
  quand: string;
};

const GARDEES = 40;
let vues: Vue[] = [];

export function noterVue(v: Omit<Vue, "quand">) {
  const entier = (n: unknown) => {
    const x = Math.round(Number(n));
    return Number.isFinite(x) && x >= 0 && x < 600000 ? x : 0;
  };
  const entree: Vue = {
    voie: v.voie === "parole" ? "parole" : "ecrit",
    transcription: entier(v.transcription),
    modele: entier(v.modele),
    voix: entier(v.voix),
    total: entier(v.total),
    quand: new Date().toISOString(),
  };
  vues = [...vues, entree].slice(-GARDEES);
}

function mediane(nombres: number[]): number {
  if (!nombres.length) return 0;
  const tri = [...nombres].sort((a, b) => a - b);
  const m = Math.floor(tri.length / 2);
  return tri.length % 2 ? tri[m] : Math.round((tri[m - 1] + tri[m]) / 2);
}

/** Le résumé lisible : combien d'échanges, et la médiane de chaque morceau. */
export function resumeAttentes() {
  if (!vues.length) return null;
  const par = (voie: Vue["voie"]) => {
    const l = vues.filter((v) => v.voie === voie);
    if (!l.length) return null;
    return {
      echanges: l.length,
      total_ms: mediane(l.map((v) => v.total)),
      transcription_ms: mediane(l.map((v) => v.transcription)),
      modele_ms: mediane(l.map((v) => v.modele)),
      voix_ms: mediane(l.map((v) => v.voix)),
    };
  };
  return {
    apres_le_micro: par("parole"),
    question_tapee: par("ecrit"),
    derniere: vues[vues.length - 1],
  };
}

/* ── Les coutures de la lecture ─────────────────────────────────────────

   Une réponse longue est dite en plusieurs morceaux. Depuis qu'ils sont
   programmés sur l'horloge du son, le trou entre deux devrait être de zéro
   milliseconde — mais « devrait » ne suffit pas : c'est précisément ce qu'on
   croyait déjà avant. Le téléphone mesure donc le trou réel et l'envoie ici.

   Un chiffre au-dessus de quelques dizaines de millisecondes veut dire que le
   décodage n'a pas suivi et qu'on entend une couture. */

export type Lecture = {
  morceaux: number;
  couture_max_ms: number;
  couture_totale_ms: number;
  duree_ms: number;
  quand: string;
};

let lectures: Lecture[] = [];

export function noterLecture(l: Partial<Lecture>) {
  const entier = (n: unknown) => {
    const x = Math.round(Number(n));
    return Number.isFinite(x) && x >= 0 && x < 600000 ? x : 0;
  };
  lectures = [...lectures, {
    morceaux: entier(l.morceaux),
    couture_max_ms: entier(l.couture_max_ms),
    couture_totale_ms: entier(l.couture_totale_ms),
    duree_ms: entier(l.duree_ms),
    quand: new Date().toISOString(),
  }].slice(-GARDEES);
}

export function resumeLectures() {
  if (!lectures.length) return null;
  const aPlusieurs = lectures.filter((l) => l.morceaux > 1);
  return {
    reponses: lectures.length,
    en_plusieurs_morceaux: aPlusieurs.length,
    couture_max_ms: Math.max(0, ...lectures.map((l) => l.couture_max_ms)),
    couture_mediane_ms: mediane(aPlusieurs.map((l) => l.couture_max_ms)),
    dernieres: lectures.slice(-5),
  };
}

/* ── LE TOUR COMPLET, BOUT À BOUT ───────────────────────────────────────────

   Lamine, le 15 septembre 2026 : « on veut mesurer précisément où est-ce
   qu'on perd du temps […] On mesure d'abord. Et après, on décidera. »

   Les `Vue` ci-dessus commencent au micro coupé et s'arrêtent quand le son
   est en main. Les deux bouts qu'il RESSENT — la queue de silence avant que
   le micro se ferme, et le démarrage réel du son — n'y étaient pas. Voir
   lib/tour.ts pour les cinq bornes et les deux pièges (l'attente qui parle
   avant la réponse, et les sources qui ne coûtent pas la même chose).

   ON GARDE PLUS LONG QUE LES AUTRES : soixante tours. Il en fera dix d'un
   coup pour voir, puis d'autres plus tard ; quarante effaceraient les
   premiers avant qu'on ait comparé. */
import type { Tour } from "./tour";
import { ouPasseLeTemps, aPayeLeModele } from "./tour";

const TOURS_GARDES = 60;
let tours: Tour[] = [];

export function noterTour(t: Partial<Tour>) {
  const entier = (n: unknown) => {
    const x = Math.round(Number(n));
    return Number.isFinite(x) && x >= 0 && x < 600000 ? x : 0;
  };
  const vecu = entier(t.vecu_ms);
  /* Un tour sans total vécu ne décrit rien : on ne le range pas. Mieux vaut
     neuf tours justes que dix dont un fantôme tire la médiane. */
  if (!vecu) return;
  tours = [...tours, {
    voie: (t.voie === "ecrit" ? "ecrit" : "parole") as Tour["voie"],
    source: String(t.source || "inconnue").slice(0, 60),
    attente: Boolean(t.attente),
    surLaTete: Boolean(t.surLaTete),
    queue_ms: entier(t.queue_ms),
    transcription_ms: entier(t.transcription_ms),
    modele_ms: entier(t.modele_ms),
    voix_ms: entier(t.voix_ms),
    /* Bornés par voix_ms : un serveur ne peut pas avoir fabriqué plus
       longtemps que le téléphone n'a attendu. */
    voix_fabrication_ms: Math.min(entier(t.voix_fabrication_ms), entier(t.voix_ms)),
    voix_transfert_ms: entier(t.voix_ms) - Math.min(entier(t.voix_fabrication_ms), entier(t.voix_ms)),
    demarrage_ms: entier(t.demarrage_ms),
    attente_porte_ms: entier(t.attente_porte_ms),
    ailleurs_ms: entier(t.ailleurs_ms),
    vecu_ms: vecu,
    quand: Date.now(),
  }].slice(-TOURS_GARDES);
}

/** Ce que /api/etat rend — et ce qu'on lira pour répondre à sa question. */
export function resumeTours() {
  if (!tours.length) return null;
  const parole = tours.filter((t) => t.voie === "parole");
  /* SÉPARÉS, JAMAIS MÉLANGÉS. Une réponse enregistrée arrive en cent
     millisecondes ; une réponse du modèle demande le modèle puis la voix. La
     moyenne des deux ne décrirait aucun des deux cas. */
  const avecModele = parole.filter((t) => aPayeLeModele(t.source));
  const sansModele = parole.filter((t) => !aPayeLeModele(t.source));
  const groupe = (l: Tour[]) => l.length ? {
    tours: l.length,
    vecu_ms: mediane(l.map((t) => t.vecu_ms)),
    queue_ms: mediane(l.map((t) => t.queue_ms)),
    transcription_ms: mediane(l.map((t) => t.transcription_ms)),
    modele_ms: mediane(l.map((t) => t.modele_ms)),
    voix_ms: mediane(l.map((t) => t.voix_ms)),
    demarrage_ms: mediane(l.map((t) => t.demarrage_ms)),
    ailleurs_ms: mediane(l.map((t) => t.ailleurs_ms)),
  } : null;
  return {
    tours: tours.length,
    /* La réponse à sa question, en clair, sans calcul mental à faire. */
    ou_passe_le_temps: ouPasseLeTemps(avecModele.length ? avecModele : parole),
    reponse_du_modele: groupe(avecModele),
    reponse_enregistree: groupe(sansModele),
    avec_phrase_dattente: parole.filter((t) => t.attente).length,
    /* SA DEUXIÈME QUESTION : « combien de réponses partent avant la fin
       complète du modèle ». C'est la seule preuve que le chantier du
       15 septembre a servi. */
    partis_avant_la_fin: parole.filter((t) => t.surLaTete).length,
    sources: parole.reduce((c: Record<string, number>, t) => {
      c[t.source] = (c[t.source] || 0) + 1; return c;
    }, {}),
    derniers: tours.slice(-10),
  };
}

export function oublierTours() { tours = []; }

/* ── QUAND IL LUI COUPE LA PAROLE — OU LA RÉFLEXION ────────────────────────

   Le 19 septembre 2026. Le guetteur écoute maintenant aussi pendant qu'elle
   réfléchit, pour qu'une phrase reprise après une respiration ne tombe plus
   dans le vide. RÈGLE 1 : ce qui touche le micro se mesure avant de dire que
   c'est bon, et c'est ce champ-là qu'on lira.

   `pendant` : « parole » (elle parlait, comme avant) ou « reflexion » (le
   nouveau cas). `recolle` : a-t-on eu à la fois un début et une suite — donc
   une phrase reconstituée — ou seulement l'un des deux. `sans_mots` : le
   volume a coupé, mais l'oreille n'a rien reconnu — un bruit, ou son écho.
   Un `sans_mots` élevé pendant la réflexion dirait que la barre est trop
   basse, et qu'on tue des tours pour des portes qui claquent. */
/* ── ET POURQUOI ELLE N'A PAS RECOLLÉ ───────────────────────────────────────

   Lamine, le 21 septembre 2026 : « quand je parle, elle me coupe très
   souvent. Si elle me coupe, elle n'entend pas ce que j'ai dit. » La veille
   au matin, le compteur disait : 6 coupures pendant qu'elle réfléchissait,
   2 recollées. Quatre phrases perdues sur six — et le compteur ne disait
   pas POURQUOI. Trois causes possibles, trois réparations différentes :
     — `sans_mots`        : l'oreille n'a rien reconnu (bruit, écho) ;
     — `pas_de_debut`     : rien à recoller devant (le tour n'avait pas de
                            question en vol) ;
     — `reprise_tardive`  : il a repris plus de REPRISE_QUI_CONTINUE ms
                            après la fermeture du micro — la frontière du
                            19 septembre a tranché « autre phrase ».
   On note le motif, et la reprise en millisecondes : c'est le chiffre qui
   dira si la frontière (2,5 s) est au bon endroit. */
export type MotifDeCoupure = "recollee" | "sans_mots" | "pas_de_debut" | "reprise_tardive" | "pendant_parole";
type Coupure = { pendant: "parole" | "reflexion"; recolle: boolean; sans_mots: boolean; motif: MotifDeCoupure; reprise_ms: number | null; quand: number };
let coupures: Coupure[] = [];

const MOTIFS = new Set<MotifDeCoupure>(["recollee", "sans_mots", "pas_de_debut", "reprise_tardive", "pendant_parole"]);

export function noterCoupure(c: Partial<Coupure>) {
  const pendant = (c.pendant === "reflexion" ? "reflexion" : "parole") as Coupure["pendant"];
  const recolle = Boolean(c.recolle);
  const sansMots = Boolean(c.sans_mots);
  /* Un téléphone d'avant cette version n'envoie pas de motif : on le déduit
     de ce qu'il envoie, pour que les vieilles pages comptent encore. */
  const motif: MotifDeCoupure = MOTIFS.has(c.motif as MotifDeCoupure) ? (c.motif as MotifDeCoupure)
    : recolle ? "recollee" : sansMots ? "sans_mots" : pendant === "parole" ? "pendant_parole" : "pas_de_debut";
  const reprise = Number(c.reprise_ms);
  coupures = [...coupures, {
    pendant, recolle, sans_mots: sansMots, motif,
    reprise_ms: Number.isFinite(reprise) && reprise >= 0 ? Math.round(reprise) : null,
    quand: Date.now(),
  }].slice(-TOURS_GARDES);
}

export function resumeCoupures() {
  if (!coupures.length) return null;
  const par = (f: (c: Coupure) => boolean) => coupures.filter(f).length;
  const motifs: Record<string, number> = {};
  for (const c of coupures) motifs[c.motif] = (motifs[c.motif] || 0) + 1;
  const reprises = coupures.map((c) => c.reprise_ms).filter((r): r is number => r !== null).sort((a, b) => a - b);
  return {
    coupures: coupures.length,
    pendant_quelle_parlait: par((c) => c.pendant === "parole"),
    pendant_quelle_reflechissait: par((c) => c.pendant === "reflexion"),
    phrases_recollees: par((c) => c.recolle),
    sans_mots_reconnus: par((c) => c.sans_mots),
    /* Le 21 septembre : le POURQUOI. `reprise_tardive` qui monte = la
       frontière de 2,5 s est trop courte pour lui. */
    motifs,
    reprise_ms_mediane: reprises.length ? reprises[Math.floor((reprises.length - 1) / 2)] : null,
    reprise_ms_max: reprises.length ? reprises[reprises.length - 1] : null,
    derniere: coupures[coupures.length - 1],
  };
}

/* ── CE QUE LE GUETTEUR A VU, PHASE PAR PHASE ───────────────────────────────

   Le 19 septembre 2026, sur « elle ne va pas se taire ». Le compteur des
   coupures dit quand il a coupé ; il ne dit rien des fois où il AURAIT DÛ.
   Pour ça il faut voir ce que le micro entendait pendant qu'elle parlait :
   le plus fort entendu, la barre à franchir, combien de tours de veille
   l'ont franchie. Si `creux_max` reste sous `barre_max` pendant qu'il
   essaie de la couper, la barre est trop haute — et c'est écrit ici, pas
   dans sa bouche. */
type Guet = {
  pendant: "parole" | "reflexion";
  arme: boolean;
  tours: number;
  creux_max: number;
  echo_moyen: number;
  barre_max: number;
  tours_au_dessus: number;
  a_coupe: boolean;
  quand: number;
};
let guets: Guet[] = [];

export function noterGuet(g: Partial<Guet>) {
  const n = (x: unknown) => { const v = Math.round(Number(x)); return Number.isFinite(v) && v >= 0 ? v : 0; };
  guets = [...guets, {
    pendant: (g.pendant === "reflexion" ? "reflexion" : "parole") as Guet["pendant"],
    arme: Boolean(g.arme),
    tours: n(g.tours),
    creux_max: n(g.creux_max),
    echo_moyen: n(g.echo_moyen),
    barre_max: n(g.barre_max),
    tours_au_dessus: n(g.tours_au_dessus),
    a_coupe: Boolean(g.a_coupe),
    quand: Date.now(),
  }].slice(-30);
}

export function resumeGuets() {
  if (!guets.length) return null;
  const parole = guets.filter((g) => g.pendant === "parole");
  return {
    phases: guets.length,
    non_armes: guets.filter((g) => !g.arme).length,
    pendant_quelle_parlait: parole.length,
    /* Le verdict tient dans ces trois-là : s'il essaie de la couper et que
       creux_max reste sous barre_max, la barre est trop haute. */
    creux_max_median: mediane(parole.map((g) => g.creux_max)),
    barre_max_median: mediane(parole.map((g) => g.barre_max)),
    echo_moyen_median: mediane(parole.map((g) => g.echo_moyen)),
    dernieres: guets.slice(-8),
  };
}

/* ── LE VERROU D'ÉCRAN : CE QUI LUI ARRIVE ─────────────────────────────────
   Depuis le 20 septembre 2026. Tant que `tenu` ne monte pas et que `refuse`
   ou `api_absente` montent, l'écran s'éteint chez lui malgré le code. */
type Veille = { quoi: string; detail: string; quand: number };
let veilles: Veille[] = [];
export function noterVeille(v: { quoi?: unknown; detail?: unknown }) {
  const quoi = String(v.quoi || "").slice(0, 20);
  if (!quoi) return;
  veilles = [...veilles, { quoi, detail: String(v.detail || "").slice(0, 80), quand: Date.now() }].slice(-60);
}
export function resumeVeilles() {
  if (!veilles.length) return null;
  const compte: Record<string, number> = {};
  for (const v of veilles) compte[v.quoi] = (compte[v.quoi] || 0) + 1;
  const refus = veilles.filter((v) => v.quoi === "refuse" || v.quoi === "secours_refuse").map((v) => v.detail).filter(Boolean);
  return {
    ...compte,
    derniers_motifs_de_refus: [...new Set(refus)].slice(-4),
    dernier: veilles[veilles.length - 1],
  };
}

/* ── LE PRÉCHAUFFAGE DES SONS DU RÉPERTOIRE ─────────────────────────────────
   Depuis le 20 septembre 2026. `deja_la` qui domine = le cache tient d'une
   ouverture à l'autre, comme prévu ; `chargees` = premières ouvertures ;
   `ratees` qui monte = un son manque dans le seau (à enregistrer). */
type Prechauffage = { demandes: number; deja_la: number; chargees: number; ratees: number; ms: number; octets: number; quand: number };
let prechauffages: Prechauffage[] = [];
export function noterPrechauffage(p: Partial<Prechauffage>) {
  const n = (x: unknown) => { const v = Math.round(Number(x)); return Number.isFinite(v) && v >= 0 ? v : 0; };
  prechauffages = [...prechauffages, {
    demandes: n(p.demandes), deja_la: n(p.deja_la), chargees: n(p.chargees), ratees: n(p.ratees), ms: n(p.ms), octets: n(p.octets), quand: Date.now(),
  }].slice(-40);
}
export function resumePrechauffages() {
  if (!prechauffages.length) return null;
  const somme = (k: keyof Prechauffage) => prechauffages.reduce((a, p) => a + (p[k] as number), 0);
  return {
    ouvertures: prechauffages.length,
    demandes: somme("demandes"), deja_la: somme("deja_la"), chargees: somme("chargees"), ratees: somme("ratees"),
    ko_charges: Math.round(somme("octets") / 1024),
    ms_moyen: Math.round(somme("ms") / prechauffages.length),
    dernier: prechauffages[prechauffages.length - 1],
  };
}
