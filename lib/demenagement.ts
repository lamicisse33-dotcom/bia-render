/* ── EMPORTER SON TRAVAIL DE SAFARI VERS L'APPLICATION ──────────────────────

   Lamine, le 18 septembre 2026, une heure après avoir installé BIA sur son
   iPhone :

     « Depuis que je l'ai installé, je ne vois plus les questions mal dites.
       Et bien dites. Ils ont tous disparu. Il n'y a que les boutons. »

   ── RIEN N'EST PERDU, ET PERSONNE N'AURAIT PU LE DEVINER ───────────────────

   Tout ce que BIA garde sur le téléphone — les verdicts du bouton « Mal dit »,
   le fil de la conversation, les profils, les papiers, la vitesse de sa voix —
   vit dans le rangement du navigateur, sous des clés qui commencent toutes par
   « bia- ».

   Ce rangement appartient à l'APPLICATION QUI AFFICHE LA PAGE, pas à
   l'adresse. Safari a le sien. Le raccourci posé sur l'écran d'accueil a le
   sien. Et l'application native, depuis ce soir, a le sien. Même adresse,
   même page, même code : trois armoires séparées, et aucune ne voit les
   autres.

   Vu de Lamine : il ouvre son application toute neuve et son travail a
   disparu. Il est toujours là, dans Safari, à quelques centimètres — mais
   rien à l'écran ne le dit.

   ── CE QU'ON FAIT, ET POURQUOI C'EST UN TEXTE ──────────────────────────────

   Une armoire ne peut pas lire l'autre : c'est la règle du téléphone, et elle
   est là pour de bonnes raisons. Le seul passage est celui qu'il fait
   lui-même — il copie d'un côté, il colle de l'autre.

   ON PREND TOUT CE QUI COMMENCE PAR « bia- », sans lister les clés une à une.
   Le jour où j'en ajoute une, elle déménagera sans que personne y pense. Une
   liste écrite à la main aurait manqué la prochaine, et le défaut serait
   revenu — plus petit, donc plus difficile à voir.

   ── SAUF LE CODE MAÎTRE, ET C'EST VOLONTAIRE ───────────────────────────────

   Son code ne part PAS dans le texte. Un presse-papier se lit par d'autres
   applications, et ce code ouvre tout ce qu'elle sait de lui. Il le retape en
   quatre secondes. Ce n'est pas un oubli : c'est la seule chose ici qui vaut
   qu'on lui demande un geste de plus.

   ── ET ON N'ÉCRASE PAS CE QUI EST DÉJÀ LÀ ──────────────────────────────────

   Si le déménagement se fait deux fois, ou dans le mauvais sens, il ne doit
   rien coûter. Donc : les verdicts se MÉLANGENT — les deux listes, sans
   doublon — et tout le reste n'est pris que si la place est vide. Un
   déménagement ne détruit jamais.

   Ce fichier n'a aucun import : il part dans le code du téléphone.         */

/** Toutes les affaires de BIA commencent par là. */
export const PREFIXE = "bia-";

/** Ce qui ne voyage pas par le presse-papier. Voir plus haut : c'est son code. */
export const RESTE_SUR_PLACE = new Set(["bia-code"]);

export type Valise = { v: number; quand: number; boites: Record<string, string> };

/** L'étiquette qui permet de reconnaître un texte de déménagement d'un coup. */
export const MARQUE = "BIA-DEMENAGEMENT";

/* ── FAIRE SES VALISES ──────────────────────────────────────────────────────

   Rend un texte, et rien d'autre. Pas de réseau, pas de serveur : ce qui est
   sur son téléphone reste sur son téléphone, il le déplace lui-même. */
export function faireSesValises(): string {
  const boites: Record<string, string> = {};
  try {
    for (let i = 0; i < localStorage.length; i++) {
      const cle = localStorage.key(i);
      if (!cle || !cle.startsWith(PREFIXE) || RESTE_SUR_PLACE.has(cle)) continue;
      const valeur = localStorage.getItem(cle);
      if (valeur !== null) boites[cle] = valeur;
    }
  } catch { /* rangement fermé : on rend une valise vide, pas une erreur */ }
  const valise: Valise = { v: 1, quand: Date.now(), boites };
  return `${MARQUE}\n${JSON.stringify(valise)}`;
}

/** Combien d'affaires il y a dans le rangement de cet appareil-ci. */
export function combienDAffaires(): number {
  let n = 0;
  try {
    for (let i = 0; i < localStorage.length; i++) {
      const cle = localStorage.key(i);
      if (cle && cle.startsWith(PREFIXE) && !RESTE_SUR_PLACE.has(cle)) n++;
    }
  } catch { return 0; }
  return n;
}

const memeChose = (a: string, b: string) =>
  String(a).replace(/\s+/g, " ").trim().toLowerCase()
  === String(b).replace(/\s+/g, " ").trim().toLowerCase();

/* ── MÉLANGER LES DEUX LISTES DE VERDICTS ───────────────────────────────────

   C'est la seule boîte où le mélange vaut mieux que le choix. Les verdicts
   s'accumulent — quelques-uns dans Safari, quelques-uns dans l'application —
   et jeter une moitié ferait refaire le travail. On les met bout à bout, sans
   dire deux fois la même phrase.

   LA PLUS RENSEIGNÉE GAGNE. Si la même phrase existe des deux côtés et qu'un
   seul des deux porte une correction écrite, c'est celle-là qu'on garde : une
   correction est du travail, un verdict nu n'est qu'un appui. */
function melangerVerdicts(ici: string, ailleurs: string): string {
  let a: Array<Record<string, unknown>> = [];
  let b: Array<Record<string, unknown>> = [];
  try { a = JSON.parse(ici); } catch { a = []; }
  try { b = JSON.parse(ailleurs); } catch { b = []; }
  if (!Array.isArray(a)) a = [];
  if (!Array.isArray(b)) b = [];
  const suite = [...a];
  for (const v of b) {
    const dit = String((v as { dit?: unknown }).dit || "");
    if (!dit) continue;
    const deja = suite.findIndex((x) => memeChose(String((x as { dit?: unknown }).dit || ""), dit));
    if (deja < 0) { suite.push(v); continue; }
    const corrigeIci = String((suite[deja] as { corrige?: unknown }).corrige || "").trim();
    const corrigeLa = String((v as { corrige?: unknown }).corrige || "").trim();
    if (!corrigeIci && corrigeLa) suite[deja] = v;
  }
  return JSON.stringify(suite);
}

export type Arrivee = {
  /** Combien de boîtes ont été prises. */
  repris: number;
  /** Celles qu'on a laissées parce qu'il y avait déjà quelque chose ici. */
  laissees: string[];
  /** En clair, si le texte n'était pas un déménagement. */
  erreur?: string;
};

/* ── DÉFAIRE LES VALISES ────────────────────────────────────────────────────

   N'ÉCRASE RIEN. Les verdicts se mélangent ; le reste n'est pris que si la
   place est libre. Fait deux fois, ou dans le mauvais sens, ça ne coûte rien —
   et c'est exactement ce qu'il faut à minuit passé. */
export function defaireLesValises(texte: string): Arrivee {
  const brut = String(texte || "").trim();
  if (!brut) return { repris: 0, laissees: [], erreur: "Il n'y a rien à coller." };
  const debut = brut.indexOf("{");
  if (!brut.includes(MARQUE) || debut < 0) {
    return { repris: 0, laissees: [],
      erreur: "Ce texte ne vient pas de BIA. Recopie tout, depuis la première ligne." };
  }
  let valise: Valise;
  try { valise = JSON.parse(brut.slice(debut)) as Valise; }
  catch { return { repris: 0, laissees: [], erreur: "Le texte est incomplet — il en manque un morceau à la fin." }; }
  const boites = valise?.boites;
  if (!boites || typeof boites !== "object") {
    return { repris: 0, laissees: [], erreur: "Le texte est vide de tout contenu." };
  }

  let repris = 0;
  const laissees: string[] = [];
  for (const [cle, valeur] of Object.entries(boites)) {
    if (!cle.startsWith(PREFIXE) || RESTE_SUR_PLACE.has(cle)) continue;
    if (typeof valeur !== "string") continue;
    let ici = "";
    try { ici = localStorage.getItem(cle) || ""; } catch { /* on essaiera d'écrire quand même */ }
    try {
      if (cle === "bia-verdicts" && ici) {
        localStorage.setItem(cle, melangerVerdicts(ici, valeur));
        repris++;
      } else if (!ici) {
        localStorage.setItem(cle, valeur);
        repris++;
      } else {
        laissees.push(cle);
      }
    } catch { laissees.push(cle); }
  }
  return { repris, laissees };
}
