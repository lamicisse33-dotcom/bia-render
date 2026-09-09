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
