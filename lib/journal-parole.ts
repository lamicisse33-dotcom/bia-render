/* ── LE PETIT JOURNAL : EST-CE QU'ELLE ME COUPE ENCORE ? ───────────────────

   Lamine : « Ajoute un petit journal (heure de début de parole, de fin
   détectée, de premier son de la réponse) pour que je voie si elle me coupe
   encore. » Et : « Mesure aussi la lenteur : temps entre la fin de ma phrase
   et le premier son, sur chaque moteur, étape par étape. »

   ── LE CHIFFRE QUI RÉPOND VRAIMENT À LA QUESTION ──────────────────────────

   Trois heures ne disent pas, à elles seules, si elle l'a coupé. Ce qui le
   dit est la comparaison de deux nombres :

     silence_exige_ms    ce qu'on a demandé d'attendre (1 200 ms)
     silence_observe_ms  le silence réellement écoulé avant la fin déclarée

   Si l'observé est NETTEMENT sous l'exigé, le tour s'est fermé avant son
   silence : elle l'a coupé. C'est compté dans `coupures_suspectes`, et ça
   marche aussi comme vérification du réglage — sur Khalam Rapide, c'est
   Google qui décide, et un réglage qu'on n'a pas relu n'est pas un réglage
   (RÈGLE 3). Si on demande 1 200 et qu'on observe 500, le réglage n'a pas
   pris, et on le voit au lieu de le supposer.

   ── LE SECOND INDICE, ET IL EST DÉCLARÉ COMME INDICE ──────────────────────

   `reprise_apres_premier_son_ms` : il s'est remis à parler peu après son
   premier son. Ça ressemble à « elle m'a coupé, je continue ma phrase »,
   mais ça ressemble AUSSI à « je la coupe exprès », qui est son droit et
   qu'il veut garder. Ce champ ne conclut donc rien tout seul — il n'est là
   que pour trier ses tours quand il relira.

   ── CE QUI SORT D'ICI ────────────────────────────────────────────────────

   Des durées, des heures et des comptes. Aucune transcription, aucun mot,
   aucun son, aucun code. Les heures sont celles de son téléphone, parce que
   c'est à sa montre qu'il relira son test. */

type Etape = {
  moteur: "rapide" | "khalam";
  debut_parole: string;
  fin_detectee: string;
  premier_son: string;
  parole_ms: number | null;
  silence_exige_ms: number | null;
  silence_observe_ms: number | null;
  attente_ms: number | null;
  /* Les étapes de l'attente, quand le moteur sait les séparer. */
  texte_ms: number | null;
  son_ms: number | null;
  demarrage_audio_ms: number | null;
  reprise_apres_premier_son_ms: number | null;
  coupure_suspecte: boolean;
  quand: string;
};
type Etat = { tours: Etape[]; refuses: number; par_moteur: Record<string, number>; coupures: Record<string, number> };
const g = globalThis as typeof globalThis & { biaJournalParole?: Etat };
const etat: Etat = (g.biaJournalParole ??= { tours: [], refuses: 0, par_moteur: {}, coupures: {} });

const AU_PLUS = 60;
/* En dessous de 70 % du silence exigé, le tour s'est fermé trop tôt. Une
   marge est nécessaire : la ronde du navigateur tourne toutes les 60 ms et
   Google arrondit, donc exiger l'égalité stricte compterait des coupures qui
   n'en sont pas. */
const PART_SUSPECTE = 0.7;

const borne = (v: unknown, max: number): number | null => {
  const n = Number(v);
  return Number.isFinite(n) && n >= 0 && n <= max ? Math.round(n) : null;
};
/* Une heure déclarée par le téléphone : on n'en garde que la forme, jamais
   un texte libre qui pourrait transporter autre chose. */
const heure = (v: unknown): string => {
  const s = String(v ?? "");
  return /^\d{2}:\d{2}:\d{2}(\.\d{1,3})?$/.test(s) ? s : "";
};

/** Le téléphone déclare un tour terminé. Durées et heures seulement. */
export function noterTourDeParole(d: Record<string, unknown>): void {
  const moteur = d.moteur === "rapide" ? "rapide" : d.moteur === "khalam" ? "khalam" : null;
  if (!moteur) { etat.refuses += 1; return; }
  const exige = borne(d.silence_exige_ms, 10000);
  const observe = borne(d.silence_observe_ms, 60000);
  /* Un tour sans aucune des trois heures n'est pas un tour : c'est un client
     mal branché, et le compter diluerait la médiane. */
  const debut = heure(d.debut_parole), fin = heure(d.fin_detectee), son = heure(d.premier_son);
  if (!debut && !fin && !son) { etat.refuses += 1; return; }

  const suspecte = exige !== null && observe !== null && observe < exige * PART_SUSPECTE;
  const e: Etape = {
    moteur, debut_parole: debut, fin_detectee: fin, premier_son: son,
    parole_ms: borne(d.parole_ms, 300000),
    silence_exige_ms: exige,
    silence_observe_ms: observe,
    attente_ms: borne(d.attente_ms, 60000),
    texte_ms: borne(d.texte_ms, 60000),
    son_ms: borne(d.son_ms, 60000),
    demarrage_audio_ms: borne(d.demarrage_audio_ms, 10000),
    reprise_apres_premier_son_ms: borne(d.reprise_apres_premier_son_ms, 60000),
    coupure_suspecte: suspecte,
    quand: new Date().toISOString(),
  };
  etat.tours = [...etat.tours.slice(-(AU_PLUS - 1)), e];
  etat.par_moteur[moteur] = (etat.par_moteur[moteur] || 0) + 1;
  if (suspecte) etat.coupures[moteur] = (etat.coupures[moteur] || 0) + 1;
}

const mediane = (n: Array<number | null>) => {
  const a = n.filter((x): x is number => x !== null).sort((x, y) => x - y);
  const m = Math.floor(a.length / 2);
  return a.length ? (a[m] + a[(a.length - 1) >> 1]) / 2 : null;
};

function parMoteur(moteur: "rapide" | "khalam") {
  const t = etat.tours.filter((x) => x.moteur === moteur);
  return {
    tours: etat.par_moteur[moteur] || 0,
    tours_gardes: t.length,
    coupures_suspectes: etat.coupures[moteur] || 0,
    silence_observe_median_ms: mediane(t.map((x) => x.silence_observe_ms)),
    /* « La lenteur », étape par étape. attente = de sa fin de parole au
       premier son entendu ; les étapes la découpent quand le moteur sait le
       faire. */
    fin_de_parole_au_premier_son: {
      median_ms: mediane(t.map((x) => x.attente_ms)),
      etapes_medianes_ms: {
        jusqu_au_texte: mediane(t.map((x) => x.texte_ms)),
        jusqu_au_son: mediane(t.map((x) => x.son_ms)),
        demarrage_du_haut_parleur: mediane(t.map((x) => x.demarrage_audio_ms)),
      },
    },
  };
}

export function resumeJournalParole() {
  return {
    revision: "journal-parole-v1",
    tours_refuses: etat.refuses,
    /* Zéro tour ne veut pas dire zéro coupure : ça veut dire que rien n'est
       arrivé. Ne rien conclure d'un compteur jamais écrit. */
    mesure_recue: etat.tours.length > 0,
    khalam_rapide: parMoteur("rapide"),
    khalam: parMoteur("khalam"),
    derniers_tours: etat.tours.slice(-20).map((t) => ({
      moteur: t.moteur,
      debut: t.debut_parole, fin: t.fin_detectee, premier_son: t.premier_son,
      parole_ms: t.parole_ms,
      silence_exige_ms: t.silence_exige_ms, silence_observe_ms: t.silence_observe_ms,
      attente_ms: t.attente_ms,
      /* Jamais un champ nommé « texte » : c'est le genre de nom qui finit par
         recevoir du texte. Ici ce sont des millisecondes. */
      etapes_ms: { jusqu_au_texte: t.texte_ms, jusqu_au_son: t.son_ms, haut_parleur: t.demarrage_audio_ms },
      reprise_apres_premier_son_ms: t.reprise_apres_premier_son_ms,
      coupure_suspecte: t.coupure_suspecte,
    })),
    limite:
      "Heures de son téléphone, durées et comptes. « coupure_suspecte » = le silence réellement écoulé " +
      "avant la fin déclarée est sous 70 % du silence exigé : le tour s'est fermé avant qu'il ait fini. " +
      "« reprise_apres_premier_son_ms » est un INDICE, pas une preuve : il vaut aussi quand il la coupe " +
      "exprès, ce qui est son droit. Aucun texte, aucune transcription, aucun son.",
  };
}
