/* ── L'ADRESSE DU SITE, DITE EN FRANÇAIS ────────────────────────────────────

   Lamine, le 12 septembre 2026 : « elle cite mal l'adresse du site. Il faut
   qu'elle le lise en français clairement. »

   ── CE QUI SE PASSAIT ─────────────────────────────────────────────────────

   Le texte envoyé au moteur de voix contenait l'adresse écrite telle quelle :

       « Tout est sur khalam.app : les jeux, les applications… »

   Un moteur de voix ne sait pas qu'une suite « mot point mot » est une
   adresse. Il fait ce qu'il fait de tout caractère inconnu : il improvise. Le
   point devient un silence, ou un « dot » à l'anglaise, et « app » devient un
   mot anglais. Le résultat n'est ni du français ni du wolof, et surtout il
   n'est pas TAPABLE : quelqu'un qui l'entend ne sait pas quoi écrire dans son
   navigateur.

   C'est le même défaut que les nombres, et il se répare au même endroit et de
   la même façon : ce qui S'AFFICHE garde l'adresse écrite — on peut la lire,
   la copier, cliquer dessus — et ce qui se DIT est mis en mots avant de
   partir chez le moteur. Les deux ne sont pas le même texte, et c'est voulu.

   ── POURQUOI « AP » ET PAS « A-P-P » ─────────────────────────────────────

   Deux façons de dire « .app », et elles ne coûtent pas la même chose :

     — « point ap » : c'est du français ordinaire, ça s'entend d'un coup, et
       c'est ainsi que tout le monde dit « .app » à l'oral. Le risque : une
       oreille distraite tape « .ap ».

     — « point a, pé, pé » : personne ne peut se tromper sur ce qu'il faut
       écrire, mais c'est long, ça casse la phrase, et un moteur de voix lit
       souvent mal les lettres isolées — c'est exactement le genre de chose
       qui ressort en anglais.

   Je pose « point ap » parce que c'est du français et que ça s'entend, et
   parce que la première règle est qu'elle parle comme une personne. Si son
   oreille préfère l'autre, la table ci-dessous est la SEULE chose à changer,
   et une ligne suffit — rien d'autre dans l'application ne connaît les
   adresses.

   ── ET ÇA VAUT AUSSI POUR SES SONS DÉJÀ ENREGISTRÉS ──────────────────────

   Ceux-là sont un cas à part et il faut le dire clairement : un son déjà
   enregistré a été fabriqué AVANT cette règle, avec l'adresse écrite dedans.
   La mauvaise prononciation est gravée dans le fichier. La corriger demande
   de refaire ces enregistrements-là — c'est sa décision et son crédit.      */

/** Les extensions qu'on reconnaît, et comment elles se disent en français.
    Les clés sont sans le point ; tout le reste de l'adresse se lit
    naturellement, mot par mot, séparé par « point ». */
export const EXTENSIONS_DITES: Record<string, string> = {
  app: "ap",
  com: "com",
  sn: "sn",
  org: "org",
  net: "nette",
  fr: "fr",
};

/* ── POURQUOI UNE LISTE D'EXTENSIONS ET PAS « TOUT CE QUI A UN POINT » ─────

   Parce qu'une phrase ordinaire est pleine de points. « C'est fini. Appelle-moi
   demain. » contient « fini.Appelle » pour une expression trop gourmande, et
   on transformerait la ponctuation en adresse.

   On n'accepte donc une suite « mot point mot » que si elle FINIT par une
   extension connue. C'est ce qui rend la règle sûre : au pire elle laisse
   passer une adresse exotique — qui se dira comme avant, pas plus mal — au
   lieu de mutiler une phrase normale.

   Et le dernier mot doit être collé au point : « fini. Appelle » a une espace,
   donc ce n'est pas une adresse. */
const EXTENSIONS = Object.keys(EXTENSIONS_DITES).join("|");

/** Une adresse : au moins un mot, un point, éventuellement d'autres mots et
    points, et une extension connue pour finir. Rien qu'on puisse confondre
    avec de la ponctuation. */
export const ADRESSE = new RegExp(
  `\\b(?:www\\.)?([a-zA-Z0-9-]+(?:\\.[a-zA-Z0-9-]+)*)\\.(${EXTENSIONS})\\b`,
  "g",
);

/**
 * Une adresse telle qu'elle doit être ENTENDUE.
 *
 * @param domaine les mots avant l'extension, points compris (« bia.khalam »)
 * @param extension l'extension sans le point (« app »)
 */
export function adresseDite(domaine: string, extension: string): string {
  const mots = domaine.split(".").filter(Boolean);
  const fin = EXTENSIONS_DITES[extension.toLowerCase()] ?? extension.toLowerCase();
  return [...mots, fin].join(" point ");
}

/**
 * Le texte tel qu'il doit être ENTENDU, pour la seule question des adresses.
 * À n'appliquer qu'avant la voix : ce qui s'affiche garde l'adresse écrite.
 *
 * On ne touche PAS au « www » : personne ne le dit, et l'adresse marche sans.
 */
export function adressesPourLaVoix(texte: string): string {
  const t = String(texte || "");
  if (!t) return t;
  return t.replace(ADRESSE, (_tout, domaine: string, extension: string) =>
    adresseDite(domaine, extension));
}

/**
 * Les adresses écrites dans un texte, telles qu'elles y sont écrites.
 * Sert à savoir QUELS textes déjà enregistrés portent une adresse — donc
 * lesquels ont une prononciation gravée à refaire.
 */
export function adressesDansLeTexte(texte: string): string[] {
  const trouvees = new Set<string>();
  for (const m of String(texte || "").matchAll(ADRESSE)) trouvees.add(m[0]);
  return [...trouvees];
}
