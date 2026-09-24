/* ── « ELLE S'EST MISE À ÉCRIRE UN MAIL. JE LUI DIS D'ARRÊTER. ELLE DIT
      QU'ELLE N'ÉCRIT RIEN. » ────────────────────────────────────────────────

   Lamine, le 16 septembre 2026 :

     « C'est elle qui doit avoir le contrôle total de tout ce qui est là-bas.
       Je n'ai pas besoin d'un clown. Ou d'une marionnette manipulée par
       n'importe quelle application. »

   Il a raison sur le mot, et le mot est exact. Voici pourquoi.

   ── CE QUI SE PASSE, EXACTEMENT ────────────────────────────────────────────

   BIA agit en posant des BALISES dans sa phrase : [[papier:mail]] pour
   fabriquer un mail, [[voir:…]] pour ouvrir l'écran, [[micro:coupe]] pour se
   taire, [[carte:…]], [[retiens:…]], et six autres. Le serveur les DÉTACHE —
   il le faut, sinon elle prononcerait « crochet crochet papier deux points »
   à voix haute.

   Puis le téléphone range dans le fil ce qui RESTE, c'est-à-dire la phrase
   sans les balises. Et c'est ce fil-là qu'on lui renvoie au tour suivant.

   DONC : elle agit, on efface la trace, et au tour d'après elle relit ses
   propres mots SANS aucune trace de ce qu'elle a fait. Quand il lui dit
   « arrête d'écrire », elle regarde ce qu'elle a dit, n'y voit aucun mail, et
   répond en toute bonne foi qu'elle n'écrit rien.

   ELLE NE MENT PAS. ELLE EST AVEUGLE. Et une chose qui agit sans voir ses
   propres actes, c'est exactement ce qu'il décrit : une marionnette.

   ── CE QUE CE FICHIER FAIT ─────────────────────────────────────────────────

   Il lui rend ses gestes. Chaque balise qui a VRAIMENT pris effet est notée,
   rangée avec la phrase dans le fil, et relue au tour suivant sous ses yeux.
   Elle peut alors dire « oui, je t'ai ouvert un mail », et l'arrêter.

   ── ET CE QU'IL NE FAIT PAS ────────────────────────────────────────────────

   Il ne note que ce qui a EU LIEU. Une balise posée mais refusée — un papier
   qu'on n'a pas pu fabriquer, une image qu'on n'a pas trouvée — ne s'écrit
   pas ici : lui faire croire qu'elle a agi serait le même défaut retourné.  */

/* Un geste tient en deux mots : ce qu'elle a fait, et sur quoi. On garde
   court exprès — ça voyage dans le fil à chaque question, et un fil qui
   grossit se paie à chaque tour. */
export type Geste = string;

/* Les libellés sont en français et lisibles : c'est un modèle qui les relit,
   pas une machine à états. « papier:mail » ne lui dirait pas qu'elle a
   OUVERT quelque chose qui est encore à l'écran. */
const DITS: Record<string, (quoi: string) => string> = {
  papier: (q) => `tu as fabriqué un ${q || "papier"} et il est affiché à l'écran`,
  voir: (q) => `tu as ouvert l'écran sur « ${q} »`,
  regarde: (q) => `tu as lancé une vidéo en plein écran sur « ${q} »`,
  cherche: (q) => `tu es allée chercher ${q} sur Internet`,
  carte: (q) => `tu as ouvert la carte vers « ${q} »`,
  appel: (q) => `tu as proposé d'appeler ${q}`,
  micro: (q) => (q === "coupe" ? "tu as coupé le micro" : `tu as agi sur le micro (${q})`),
  retiens: (q) => `tu as rangé dans ta mémoire : « ${q} »`,
  oublie: (q) => `tu as retiré de ta mémoire : « ${q} »`,
  /* Le 18 septembre : une phrase de la liste « mal dit » qu'ils viennent de
     finir ensemble. Elle doit le VOIR au tour suivant, sinon elle repart sur
     la même — il la corrigerait deux fois sans comprendre pourquoi. */
  corrigee: (q) => `tu as rayé une phrase de la liste « mal dit » : la bonne version est « ${q} »`,
  ferme: () => "tu as fermé le papier qui était à l'écran",
};

const COUPE_QUOI = 60;

/** Note un geste qui a eu lieu. Rend "" si la sorte est inconnue. */
export function geste(sorte: string, quoi = ""): Geste {
  const faire = DITS[sorte];
  if (!faire) return "";
  const sur = String(quoi || "").trim().slice(0, COUPE_QUOI);
  /* UN GESTE SANS OBJET N'A PAS EU LIEU. Trouvé le 24 septembre 2026 : la
     route du chat passe TOUTES les sortes à chaque tour, avec "" pour celles
     qui n'ont pas eu lieu — et chacune s'écrivait quand même (« tu as
     fabriqué un papier et il est affiché à l'écran », « tu as proposé
     d'appeler »…). Elle relisait donc, à chaque tour, des gestes qu'elle
     n'avait jamais faits. Seul « ferme » n'a pas besoin d'objet. */
  if (!sur && sorte !== "ferme") return "";
  return faire(sur);
}

/** Les gestes d'un tour, dans l'ordre où ils ont pris effet, sans les vides. */
export function gestesDe(paires: Array<[string, string]>): Geste[] {
  return paires.map(([sorte, quoi]) => geste(sorte, quoi)).filter(Boolean);
}

/* ── CE QU'ELLE RELIT AU TOUR SUIVANT ──────────────────────────────────────

   Placé dans la partie VARIABLE de la consigne, jamais dans le socle mis en
   cache : ça change à chaque question.

   L'ORDRE COMPTE : le dernier geste en dernier, parce que « arrête ça » ne
   parle jamais de l'avant-dernier. */
const TOURS_GARDES = 6;

export function consigneDeSesGestes(parTour: Geste[][]): string {
  const recents = parTour.filter((g) => g.length).slice(-TOURS_GARDES);
  if (!recents.length) return "";
  const lignes = recents.map((g, i) => {
    const rang = i === recents.length - 1 ? "à ton dernier tour" : `il y a ${recents.length - i} tours`;
    return `  — ${rang} : ${g.join(", puis ")}`;
  });
  return `

CE QUE TU AS FAIT TOI-MÊME DANS CETTE CONVERSATION
Tes gestes ne restent pas dans tes phrases — on les en retire avant de te
faire parler, sinon tu les prononcerais à voix haute. Les voici donc, pour
que tu saches ce que tu as fait :

${lignes.join("\n")}

C'EST TOI QUI AS FAIT ÇA, ET TU L'ASSUMES. Si on te demande d'arrêter, de
fermer, ou ce que tu es en train de faire, tu réponds à partir de cette liste
— jamais « je ne fais rien » alors qu'elle n'est pas vide. Ne dis pas non plus
que tu as fait quelque chose qui n'y est PAS : cette liste est complète.

POUR FERMER LE PAPIER qui est à l'écran, tu poses  [[papier:ferme]]  et tu le
dis en une phrase. C'est le seul moyen : sans la balise, tu aurais beau
promettre d'arrêter, rien ne se fermerait.`;
}
