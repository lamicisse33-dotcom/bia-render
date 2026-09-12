/* ── DEUX BOUTONS POUR JUGER SA PRONONCIATION, EN UN APPUI ──────────────────

   Lamine, le 12 septembre 2026 au soir :

     « Pour pouvoir améliorer notre répertoire, je veux deux boutons sur
       l'écran, un vert à gauche, un rouge à droite. Si elle prononce quelque
       chose correctement et que j'appuie sur le vert, tout ce qu'elle vient de
       dire doit être stocké dans un dossier à part. Quand c'est mal dit,
       j'appuie sur le rouge, et ce qu'elle a dit est gardé ailleurs — pour que
       plus tard je puisse corriger tout ce qui est mal dit et le réinjecter
       dans le répertoire. Ce que le vert a retenu peut être enregistré et
       stocké dans la base. Ces deux boutons ne doivent être actifs qu'avec mon
       code maître : les autres testeurs ne doivent pas les voir. »

   ── POURQUOI ÇA VAUT MIEUX QUE LE BOUTON « MAL DIT » QUI EXISTE ───────────

   « Mal dit » vit SOUS chaque message : il faut ouvrir la fenêtre de
   discussion, retrouver la bulle, appuyer, écrire la correction. C'est bien
   pour corriger UNE phrase, et c'est inutilisable quand on veut juger
   trente phrases d'affilée à l'oreille, en parlant.

   Ces deux boutons-ci sont sur l'écran principal, sous le pouce, et ils ne
   demandent RIEN : un appui, c'est gardé, on continue de parler. Le travail
   d'écriture vient plus tard, sur la page de relecture, quand il en a le
   temps.

   ── CE QU'UN VERDICT GARDE, ET POURQUOI CHAQUE CHAMP EST LÀ ───────────────

   La phrase seule ne suffirait pas. Pour REFAIRE un son, il faut savoir d'où
   il venait ; pour corriger une tournure, il faut savoir à quelle question
   elle répondait. Sans le contexte, un verdict est un post-it sans mur.

   ── ET ÇA RESTE SUR L'APPAREIL ────────────────────────────────────────────

   Rien ne part sur le réseau. Un verdict est un jugement d'oreille, pas une
   donnée d'application : il vit dans le téléphone qui l'a porté, et il en
   sort quand Lamine le copie pour me l'envoyer — exactement comme ses
   corrections des 42 phrases et des nombres. Ça évite une table, une clé, et
   la question de qui peut lire les conversations de qui.                    */

export type Verdict = {
  /** « bien » : c'est à garder et à enregistrer. « mal » : à corriger. */
  avis: "bien" | "mal";
  /** Ce qu'elle a dit, mot pour mot. */
  dit: string;
  /** À quelle question elle répondait — sans ça, on ne sait plus quoi refaire. */
  question: string;
  /** La langue de sa réponse, telle que la page l'a reconnue. */
  langue: string;
  /** Quand, pour retrouver l'échange dans le fil s'il faut. */
  quand: number;
  /** La correction écrite plus tard, sur la page de relecture. */
  corrige?: string;
};

export const BOITE = "bia-verdicts";
/** Au-delà, on jette les plus vieux : le stockage d'un téléphone n'est pas
    infini, et cinq cents verdicts sont déjà plus qu'on n'en relira jamais. */
export const MAX_VERDICTS = 500;

const memeChose = (a: string, b: string) =>
  a.replace(/\s+/g, " ").trim().toLowerCase() === b.replace(/\s+/g, " ").trim().toLowerCase();

export function lireVerdicts(): Verdict[] {
  try {
    const brut = localStorage.getItem(BOITE);
    if (!brut) return [];
    const liste = JSON.parse(brut) as Verdict[];
    return Array.isArray(liste) ? liste.filter((v) => v && typeof v.dit === "string") : [];
  } catch { return []; }
}

function ecrire(liste: Verdict[]): void {
  try { localStorage.setItem(BOITE, JSON.stringify(liste.slice(-MAX_VERDICTS))); } catch { }
}

/**
 * Poser un verdict sur la dernière phrase.
 *
 * LE MÊME BOUTON DEUX FOIS NE FAIT PAS DEUX VERDICTS, et changer d'avis
 * remplace le premier : on juge à l'oreille, en conversation, et un pouce qui
 * ripe ne doit pas salir la liste.
 */
export function poserVerdict(v: Verdict): { liste: Verdict[]; quoi: "posé" | "changé" | "retiré" } {
  const liste = lireVerdicts();
  const deja = liste.findIndex((x) => memeChose(x.dit, v.dit));
  if (deja >= 0) {
    /* Deux fois le même avis sur la même phrase : il se retire. C'est ce que
       fait un pouce qui s'est trompé, et c'est le geste que tout le monde
       essaie. */
    if (liste[deja].avis === v.avis) {
      const sans = liste.filter((_, i) => i !== deja);
      ecrire(sans);
      return { liste: sans, quoi: "retiré" };
    }
    /* L'autre avis : on remplace, en gardant la correction déjà écrite. */
    const suite = liste.map((x, i) => (i === deja ? { ...v, corrige: x.corrige } : x));
    ecrire(suite);
    return { liste: suite, quoi: "changé" };
  }
  const suite = [...liste, v];
  ecrire(suite);
  return { liste: suite, quoi: "posé" };
}

/** La correction écrite plus tard, sur la page de relecture. */
export function corrigerVerdict(dit: string, corrige: string): Verdict[] {
  const suite = lireVerdicts().map((v) => (memeChose(v.dit, dit) ? { ...v, corrige } : v));
  ecrire(suite);
  return suite;
}

export function oublierVerdict(dit: string): Verdict[] {
  const suite = lireVerdicts().filter((v) => !memeChose(v.dit, dit));
  ecrire(suite);
  return suite;
}

export function compterVerdicts(liste = lireVerdicts()) {
  return {
    bien: liste.filter((v) => v.avis === "bien").length,
    mal: liste.filter((v) => v.avis === "mal").length,
    corriges: liste.filter((v) => v.avis === "mal" && v.corrige?.trim()).length,
  };
}

/**
 * Le texte à me copier. Même forme que ses autres fiches de correction —
 * celle des 42 phrases, celle des nombres — parce que c'est la forme qui a
 * marché : il colle, je lis, je pose.
 *
 * LES DEUX LISTES NE SERVENT PAS À LA MÊME CHOSE, et le texte le dit :
 * le vert est à ENREGISTRER (sa voix, une fois, et c'est gratuit pour
 * toujours) ; le rouge est à CORRIGER puis à réinjecter.
 */
export function texteDesVerdicts(liste = lireVerdicts()): string {
  const compte = compterVerdicts(liste);
  const bien = liste.filter((v) => v.avis === "bien");
  const mal = liste.filter((v) => v.avis === "mal");
  const date = new Date().toLocaleDateString("fr-FR");

  const lignes = [
    `VERDICTS DE LAMINE — ${date}`,
    `${compte.bien} bien dit(s) à enregistrer, ${compte.mal} mal dit(s) dont ${compte.corriges} déjà corrigé(s)`,
    "",
  ];
  if (bien.length) {
    lignes.push("═══ BIEN DIT — à enregistrer dans la base ═══", "");
    for (const v of bien) {
      lignes.push(`« ${v.dit} »`);
      if (v.question) lignes.push(`   (à la question : ${v.question})`);
      lignes.push("");
    }
  }
  if (mal.length) {
    lignes.push("═══ MAL DIT — à corriger puis réinjecter ═══", "");
    for (const v of mal) {
      lignes.push(`ELLE A DIT : « ${v.dit} »`);
      if (v.question) lignes.push(`À LA QUESTION : ${v.question}`);
      lignes.push(`IL FAUT DIRE : ${v.corrige?.trim() || "…"}`);
      lignes.push("");
    }
  }
  return lignes.join("\n");
}
