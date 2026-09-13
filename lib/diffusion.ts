/* ── QU'ELLE PARLE AVANT D'AVOIR FINI DE PENSER ──────────────────────────────

   Lamine, le 14 septembre 2026 : « la première exigence c'est la rapidité de
   réaction de BIA ; ils disent que si elle est lente, autant utiliser
   ChatGPT. » Des partenaires l'essaient ce soir à vingt heures.

   ── CE QUI SE PASSAIT ───────────────────────────────────────────────────────

   Le modèle écrivait sa réponse ENTIÈRE avant qu'un seul mot ne parte à la
   voix. Trois phrases à dire, c'est trois phrases à écrire d'abord — deux à
   cinq secondes pendant lesquelles BIA n'a rien à dire, alors que sa première
   phrase était prête depuis longtemps.

   Maintenant le texte arrive au fil de l'eau, et la voix part sur la première
   phrase pendant que le modèle écrit la suite.

   ── POURQUOI CENT VINGT SIGNES, ET PAS UNE PHRASE TOUT COURT ────────────────

   C'est la seule chose délicate ici, et elle mérite d'être écrite en clair.

   Le serveur ne se contente pas de transmettre ce que le modèle écrit : dans
   trois cas, il REMPLACE tout le texte par autre chose.

     — une étiquette seule (« #la-famille ») : c'est une réponse enregistrée
       qu'on sert mot pour mot ;
     — un geste accompagné d'une phrase courte : le serveur substitue une
       formulation de service déjà enregistrée — la condition exacte, dans
       app/api/chat/route.ts, est `reply.length <= 120` ;
     — un texte vide : une phrase de secours prend sa place.

   Si on parlait dès la première phrase, BIA pourrait dire une chose et le
   serveur en conclure une autre : elle se contredirait à voix haute.

   LES TROIS CAS EXIGENT UN TEXTE COURT. Au-delà de cent vingt signes, aucune
   substitution n'est possible — il ne reste que des AJOUTS en fin de phrase
   (la vidéo qu'elle a promise et qu'elle n'a pas trouvée). Le début, lui, ne
   bouge plus jamais. C'est donc prouvé, pas espéré : passé ce seuil, ce
   qu'elle commence à dire est ce qu'elle dira.

   Et ce qu'on perd est justement ce qu'on ne cherchait pas : les réponses de
   moins de cent vingt signes sont écrites en une seconde. C'est sur les
   longues que l'attente se sentait.

   ── SI ÇA TOURNE MAL CE SOIR ────────────────────────────────────────────────

   Mettre DIFFUSER_LE_MODELE à false rend exactement le comportement d'hier :
   le téléphone redemande la réponse d'un seul bloc, le serveur la renvoie
   d'un seul bloc, et plus rien de ce fichier ne sert. Une ligne, un envoi,
   deux minutes. C'est la même sortie de secours que ECARTER_LES_BRUITS.   */

/** Le grand interrupteur. false = le comportement d'avant, entièrement. */
export const DIFFUSER_LE_MODELE = true;

/** En dessous, le serveur peut encore remplacer toute la réponse. Voir plus
    haut : ce n'est pas une marge de confort, c'est la condition exacte. */
export const SIGNES_AVANT_DE_PARLER = 120;

/** Les fins de phrase où l'on peut couper sans que ça s'entende. Le
    deux-points et le point-virgule en font partie : dans une énumération, la
    voix marque la pause de toute façon. */
const FIN_DE_PHRASE = /[.!?…:;](?=\s|$)|\n/g;

/** Les balises que le modèle sème et qui ne doivent JAMAIS être prononcées.
    Elles arrivent en première ligne (l'émotion) ou en dernière (le geste) ;
    on les retire au passage, y compris à moitié écrites en fin de flux. */
const BALISES = /\[{1,2}[^\]]*\]{0,2}/g;

/** Le texte débarrassé de ses balises, tel qu'il pourrait être dit. */
export function sansBalises(texte: string): string {
  return texte.replace(BALISES, " ").replace(/\s+/g, " ").trim();
}

/** Le plus court morceau qui vaille un aller-retour chez la voix. En dessous,
    on attend la phrase suivante et on les dira ensemble. */
const MORCEAU_MINIMAL = 40;

/**
 * LA TÊTE DE LA RÉPONSE : ce qu'elle peut commencer à dire pendant que le
 * modèle écrit encore, sans risquer de se dédire.
 *
 * On n'en prend qu'UNE, et une seule fois par réponse — la suite passe par le
 * chemin d'avant, qui sait enchaîner les morceaux sans couture. Deux appels
 * en tout : la tête, puis le reste.
 *
 * @param recu  tout ce que le modèle a écrit jusqu'ici, balises comprises
 * @returns     la tête à dire, ou "" s'il faut encore attendre
 */
export function teteDeLaReponse(recu: string): string {
  const propre = sansBalises(recu);
  /* Sous le seuil, le serveur a encore le droit de tout remplacer. */
  if (propre.length <= SIGNES_AVANT_DE_PARLER) return "";

  /* On coupe à la DERNIÈRE fin de phrase complète — jamais sur celle qui
     s'écrit encore, parce qu'une phrase dite à moitié s'entend. */
  const coupes: number[] = [];
  for (const m of propre.matchAll(FIN_DE_PHRASE)) coupes.push(m.index + m[0].length);
  if (!coupes.length) return "";
  const tete = propre.slice(0, coupes[coupes.length - 1]).trim();
  return tete.length >= MORCEAU_MINIMAL ? tete : "";
}

/**
 * CE QU'IL RESTE À DIRE, une fois que le serveur a tranché.
 *
 * `reponse` fait foi : c'est elle qui part à l'écran et dans l'historique. On
 * en retire ce qui est déjà sorti de sa bouche, en comparant sur le texte
 * nettoyé pour qu'une espace ou une balise ne fasse pas tout répéter.
 *
 * Si les deux textes divergent — ça ne devrait jamais arriver au-dessus du
 * seuil, mais « ne devrait jamais » n'est pas une garantie — on repart du
 * point où ils cessent de se ressembler : rien n'est répété, rien n'est perdu.
 */
export function resteADire(reponse: string, dejaDit: string): string {
  const propre = sansBalises(reponse);
  const dit = sansBalises(dejaDit);
  if (!dit) return propre;
  if (propre.startsWith(dit)) return propre.slice(dit.length).trim();
  let i = 0;
  while (i < propre.length && i < dit.length && propre[i] === dit[i]) i++;
  return propre.slice(i).trim();
}
