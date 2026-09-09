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
