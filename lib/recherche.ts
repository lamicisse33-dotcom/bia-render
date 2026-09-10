/* ── QUAND BIA A BESOIN D'INTERNET ─────────────────────────────────────────

   Demandé par Lamine le 10 septembre 2026 : « est-ce que c'est possible que
   BIA puisse faire des recherches sur Internet ? »

   Oui — le moteur sait chercher lui-même : on lui donne l'outil, il décide de
   s'en servir, et la recherche se fait chez Anthropic, pas ici. Rien à
   installer, aucun autre fournisseur à payer.

   MAIS ÇA SE PAIE DEUX FOIS, et c'est pour ça que ce fichier existe.
   En argent : dix dollars pour mille recherches, soit environ six francs par
   recherche, PLUS les jetons du contenu rapporté — qui pèse souvent plus que
   la réponse elle-même. Et en temps : deux à six secondes ajoutées à une
   attente déjà de onze à seize.

   Donner l'outil à CHAQUE question serait donc payer six francs et quatre
   secondes pour « naka nga def ? ». On ne le donne que lorsque la question le
   demande vraiment : quelque chose d'aujourd'hui, un prix, un résultat, une
   nouvelle — ou quand la personne le réclame en toutes lettres.

   Et même alors, c'est le modèle qui tranche : recevoir l'outil ne l'oblige
   pas à s'en servir. On lui ouvre la porte, on ne le pousse pas dehors. */

const sansAccent = (t: string) =>
  String(t || "").toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "");

/* Ce qui appelle Internet. En français et en wolof, parce qu'on lui parle
   dans les deux — souvent dans la même phrase. */
const MAINTENANT = [
  // le temps présent
  "aujourd hui", "aujourdhui", "ce matin", "ce soir", "cette semaine",
  "en ce moment", "maintenant", "actuellement", "recemment", "derniere heure",
  "tey", "leegi", "ci suba si", "ayubes bi",
  // ce qui change tout le temps
  "actualite", "actualites", "nouvelle", "nouvelles", "info", "infos",
  "journal", "presse", "xibaar", "xibaar yi",
  "meteo", "il fera", "il fait chaud", "pluie", "taw",
  "prix", "coute", "combien coute", "tarif", "cours", "taux", "njeg",
  "resultat", "resultats", "score", "match", "elections", "election",
  "classement", "gagne", "vainqueur",
  "bourse", "dollar", "euro", "fcfa aujourd",
  // la demande explicite
  "cherche sur internet", "va voir sur internet", "regarde sur internet",
  "recherche sur internet", "sur google", "gestul", "seetal ci internet",
  "verifie sur internet", "cherche en ligne",
];

/* Ce qui n'a PAS besoin d'internet même si un mot ressemble : une question de
   grammaire, une explication, un calcul. Sans ce garde-fou, « quel est le
   prix d'une addition » partirait chercher en ligne. */
const JAMAIS = [
  "explique", "firil", "traduis", "tekki", "calcule", "combien font",
  "comment on dit", "corrige", "ecris moi", "bindal ma",
];

/** La question demande-t-elle quelque chose que seul Internet peut donner ? */
export function besoinDInternet(question: string, fil: string[] = []): boolean {
  const q = sansAccent(question);
  if (!q.trim()) return false;
  if (JAMAIS.some((m) => q.includes(m))) {
    // Sauf si la personne l'a demandé en toutes lettres : sa parole passe
    // avant notre devinette.
    if (!q.includes("internet") && !q.includes("google")) return false;
  }
  if (MAINTENANT.some((m) => q.includes(m))) return true;

  /* « Qui est le président ? », « qui est le ministre de… » : une fonction
     change, et ce que le modèle a en tête peut dater. */
  if (/\bqui est (le |la |l )?(president|presidente|ministre|maire|pape|entraineur|selectionneur)/.test(q)) return true;

  // La question précédente portait déjà sur l'actualité : « et hier ? »
  const avant = sansAccent(fil.slice(-2).join(" "));
  if (q.length < 40 && MAINTENANT.some((m) => avant.includes(m))) return true;

  return false;
}

/** Vrai si la recherche est autorisée sur ce serveur. Éteinte par défaut. */
export const rechercheActive = () =>
  ["1", "true", "oui"].includes(String(process.env.BIA_RECHERCHE || "").toLowerCase());

/* L'outil, tel que l'API l'attend. La recherche est exécutée chez Anthropic
   pendant la même requête : rien à boucler ici, la réponse revient déjà
   écrite. Deux recherches au maximum — au-delà, on paie sans rien gagner sur
   une question de tous les jours. Et le lieu est donné, sinon les résultats
   arrivent d'ailleurs : un prix « du marché » n'a aucun sens s'il vient de
   Paris. */
export const OUTIL_RECHERCHE = {
  type: "web_search_20250305",
  name: "web_search",
  max_uses: Number(process.env.BIA_RECHERCHE_MAX || 2),
  user_location: {
    type: "approximate",
    country: "SN",
    city: "Dakar",
    timezone: "Africa/Dakar",
  },
};

/* Ce qu'on lui dit quand elle a le droit de chercher. Court exprès : cette
   consigne ne part qu'avec les questions qui le méritent. */
export const CONSIGNE_RECHERCHE = `

TU PEUX ALLER VOIR SUR INTERNET
Cette question porte sur quelque chose qui change — l'actualité, un prix, un
résultat, une date récente. Tu as le droit de chercher en ligne avant de
répondre. Sers-t'en si ta réponse serait autrement une devinette ; ne t'en
sers pas si tu sais déjà, ou si la question n'en a pas besoin.

Quand tu as cherché, DIS-LE en une poignée de mots — « gis naa ko ci internet »
— et donne la DATE de ce que tu rapportes quand elle compte : « bi ci 8
septembre ». Une nouvelle sans date fait croire qu'elle est d'aujourd'hui.

NE LIS JAMAIS UNE ADRESSE INTERNET À VOIX HAUTE. On t'écoute parler : « h t t p
deux points barre barre » est insupportable, et personne ne peut le retenir.
Nomme la source — « ci Seneweb », « ci site bu RTS » — et c'est tout. Si la
personne veut le lien, elle le demandera, et alors seulement tu l'écriras.

Si tu ne trouves rien de sûr, dis-le franchement plutôt que de rapporter
n'importe quoi : sur l'actualité, une bêtise dite avec assurance se répète.`;
