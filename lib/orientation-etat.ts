/* ── CE QU'ON COMPTE, ET CE QU'ON NE COMPTE SURTOUT PAS ────────────────────

   « la position n'est jamais écrite en mémoire ni dans Supabase, elle sert au
   tour en cours » — Lamine, 24 octobre 2026.

   Ce compteur existe pour qu'on sache si l'orientation sert et si elle tient
   ses délais. Il ne reçoit donc QUE : un nombre de demandes, un succès ou un
   échec, une durée, et si la distance venait des rues ou du vol d'oiseau.

   AUCUNE COORDONNÉE, AUCUN NOM DE LIEU, AUCUNE PHRASE. Ni ici, ni ailleurs.
   Savoir que quelqu'un a demandé son chemin trois fois est une mesure ; savoir
   OÙ il était est un suivi, et ce n'est pas ce qui a été demandé. */

type Etat = { demandes: number; reussies: number; par_les_rues: number; a_vol_oiseau: number; refusees: Record<string, number>; derniers_ms: number[] };
const g = globalThis as typeof globalThis & { biaOrientation?: Etat };
const etat: Etat = (g.biaOrientation ??= { demandes: 0, reussies: 0, par_les_rues: 0, a_vol_oiseau: 0, refusees: {}, derniers_ms: [] });

export function noterOrientation(d: { ok: boolean; ms?: number; parLesRues?: boolean; motif?: string }) {
  etat.demandes += 1;
  if (!d.ok) { const m = String(d.motif || "inconnu").slice(0, 30); etat.refusees[m] = (etat.refusees[m] || 0) + 1; return; }
  etat.reussies += 1;
  if (d.parLesRues) etat.par_les_rues += 1; else etat.a_vol_oiseau += 1;
  const ms = Number(d.ms);
  if (Number.isFinite(ms) && ms >= 0 && ms <= 60000) etat.derniers_ms = [...etat.derniers_ms.slice(-29), Math.round(ms)];
}

const mediane = (v: number[]) => { const a = [...v].sort((x, y) => x - y), m = Math.floor(a.length / 2); return a.length ? (a[m] + a[(a.length - 1) >> 1]) / 2 : null; };

export const resumeOrientation = () => ({
  revision: "orientation-sans-trace-v1",
  demandes: etat.demandes,
  reussies: etat.reussies,
  distances_par_les_rues: etat.par_les_rues,
  distances_a_vol_oiseau: etat.a_vol_oiseau,
  refusees: { ...etat.refusees },
  ms_median: mediane(etat.derniers_ms),
  limite: "Comptes et durées seulement. Aucune coordonnée, aucun nom de lieu, aucune phrase — la position sert au tour en cours et n'est écrite nulle part.",
});
