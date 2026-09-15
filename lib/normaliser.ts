/* ── LA NORMALISATION, TOUTE SEULE, SANS RIEN TRAÎNER DERRIÈRE ──────────────

   Ce fichier existe à cause d'une panne que j'ai mise en ligne le 15 septembre
   2026 et qu'il a vue avant moi : écran noir, et

     « Application error: a client-side exception has occurred while loading
       app.khalam.app »

   Dans la console : `ReferenceError: process is not defined`.

   ── CE QUE J'AVAIS FAIT, ET POURQUOI ÇA PARAISSAIT BIEN ────────────────────

   En écrivant lib/sa-propre-voix.ts, j'ai voulu bien faire : plutôt que
   réécrire une normalisation pour comparer ce qu'elle dit à ce qu'on entend,
   j'ai importé celle du répertoire. « Une seule normalisation, pas deux » —
   c'est un bon principe, et je l'ai même écrit dans le fichier.

   Sauf que sa-propre-voix.ts est importé par app/page.tsx, qui tourne DANS LE
   TÉLÉPHONE. Et lib/repertoire.ts, lui, commence par importer lib/lexique.ts,
   qui fait, à la première ligne de son corps :

     const env = process.env;

   En important une fonction de dix lignes, j'ai fait entrer tout le rangement
   Supabase dans le paquet envoyé au navigateur. Et là, `process` n'existe
   pas : le fichier lève avant d'avoir rendu quoi que ce soit, donc la page
   entière est morte.

   ── POURQUOI NI TSC NI LA COMPILATION NE L'ONT VU ──────────────────────────

   Parce que ce n'est une faute ni de type ni de syntaxe. Le code est
   parfaitement valide — il est simplement exécuté dans un endroit où l'un de
   ses ancêtres ne peut pas vivre. `const env = process.env` n'est pas non
   plus remplaçable par Next : il prend l'objet entier au lieu d'un champ, donc
   rien ne peut être substitué à la compilation, et il ne reste plus qu'une
   variable qui n'existe pas.

   Une épreuve garde maintenant cette frontière — voir
   epreuve-rien-du-serveur-dans-le-telephone.ts. Elle remonte tout ce
   qu'app/page.tsx importe, de proche en proche, et refuse qu'un seul de ces
   fichiers lise process.env. C'était la seule vérification qui manquait.

   ── CE QUE CE FICHIER EST ──────────────────────────────────────────────────

   La normalisation, et rien d'autre. Aucun import, donc rien à traîner.
   lib/repertoire.ts la ré-exporte pour que tous ceux qui la prenaient chez lui
   continuent sans changer une ligne : il n'y a toujours QU'UNE normalisation,
   c'est juste qu'elle ne vit plus dans un fichier de serveur.              */

/* Ce qu'on retire avant de comparer : les politesses et son prénom à elle ne
   distinguent pas deux phrases. */
const CIVILITES = /\b(stp|svp|s il te plait|s il vous plait|bia|please)\b/g;

/**
 * Ce qui reste d'une phrase quand on a enlevé tout ce qui ne la distingue
 * pas : les accents, la ponctuation, les majuscules, les politesses.
 */
export function normaliser(texte: string): string {
  return String(texte || "")
    .toLowerCase()
    .normalize("NFD").replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(CIVILITES, " ")
    .replace(/\s+/g, " ")
    .trim();
}
