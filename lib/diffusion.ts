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
/* ── ÉTEINT LE 14 SEPTEMBRE 2026 À 19h15, AVANT LA DÉMONSTRATION ────────────

   Lamine : « je lui ai demandé en français, elle m'a affiché les Almadies,
   mais elle s'est mise à parler d'une manière incohérente, d'autres choses
   même. »

   La diffusion est la chose la plus récente du chemin de la parole, et c'est
   la seule qui peut faire dire à BIA un début qui ne va pas avec sa fin :
   elle commence une phrase sur ce que le modèle écrit, et le serveur peut
   ensuite trancher autrement. J'ai posé une règle pour que ce soit
   impossible — cent vingt signes avant de parler — et elle tient sur le
   papier comme à l'épreuve. Mais quelque chose lui échappe, et je ne le
   trouverai pas en quarante minutes.

   CE QU'ON PERD : une seconde et demie sur les réponses longues.
   CE QU'ON GARDE : qu'elle ne dise jamais une chose pour une autre devant
   des gens qui découvrent BIA ce soir.

   Le choix ne se discute pas. On rallumera quand on aura mesuré, à tête
   reposée, avec une épreuve qui reproduit ce qu'il a entendu. Tout le code
   de la diffusion reste en place et repasse ses épreuves : il n'y a qu'à
   remettre `true` ici. */
/* ── RALLUMÉ LE 14 SEPTEMBRE 2026, APRÈS AVOIR TROUVÉ LE TROU ───────────────

   Lamine : « allume le streaming, bien sûr. »

   Il était éteint depuis le 13 au soir, une heure avant sa démonstration,
   parce qu'elle avait parlé de travers. Je ne rallume pas en espérant : le
   trou est trouvé, écrit, et bouché au-dessus — les réponses qui portent un
   geste ne se diffusent plus, parce que ce sont exactement celles que le
   serveur remplace.

   ET UNE HONNÊTETÉ SUR CE QUE ÇA GAGNE. Mesuré le 9 septembre sur son
   téléphone : transcription 1,1 s, modèle 4,8 s, VOIX 8,0 s. C'est la voix le
   gros morceau. La diffusion fait gagner une seconde et demie sur les
   réponses longues — c'est réel, ce n'est pas la moitié du problème. Ce qui
   va vraiment vite reste ce qui est ENREGISTRÉ : zéro seconde. */
export const DIFFUSER_LE_MODELE = true;

/* ── LE VERROU DES CENT VINGT SIGNES, ET POURQUOI IL TOMBE ─────────────────

   Lamine, le 15 septembre 2026 : « actuellement la priorité c'est la
   vitesse. »

   CE QUE CE NOMBRE COÛTAIT, mesuré et non supposé. Ses réponses font 48 à 137
   signes, médiane 78. Le seuil en exigeait 120 AVANT de laisser dire un mot :
   la diffusion ne se déclenchait donc presque jamais — une réponse sur treize
   a été dite en plusieurs morceaux. Le streaming était allumé depuis deux
   jours et ne servait à rien.

   POURQUOI IL EXISTAIT. Quand la réponse porte un geste — carte, papier,
   appel, vidéo — le serveur REMPLACE le texte du modèle par une phrase de
   service enregistrée. Si BIA avait commencé à dire le texte du modèle, elle
   disait une chose puis une autre, sans rapport. C'est ce que Lamine a
   entendu le 13 septembre.

   CE QUI A CHANGÉ DEPUIS, ET QUI REND LE SEUIL INUTILE. Deux gardes, et la
   seconde est celle qui tient vraiment :

     1. UN_GESTE. Toutes les balises de geste sont demandées sur la PREMIÈRE
        ligne (voir app/api/chat/route.ts : « tu poses sur la PREMIÈRE
        ligne »). Dès qu'une apparaît, on se tait et on attend la fin. Le
        commentaire de BALISES plus haut disait « en dernière (le geste) » —
        c'était vrai d'une version antérieure du socle, ça ne l'est plus.

     2. ET SURTOUT : LE SERVEUR PERD SON DROIT DE REMPLACER dès qu'il a laissé
        partir une tête. C'est écrit dans app/api/chat/route.ts, autour de
        `dejaParle`. Le modèle peut donc oublier de poser sa balise en tête :
        au pire BIA dit sa propre phrase et le geste s'y ajoute — jamais une
        phrase contredite par une autre.

   La première garde est une politesse qu'on demande au modèle. La seconde est
   une garantie qu'on s'impose à nous-mêmes, et elle tient quoi qu'il écrive.

   ZÉRO, DONC, et c'est MORCEAU_MINIMAL qui décide seul : une tête doit être
   une phrase COMPLÈTE d'au moins quarante signes. En dessous, l'aller-retour
   chez la voix coûte plus que ce qu'il fait gagner. */
export const SIGNES_AVANT_DE_PARLER = 0;

/** Les fins de phrase où l'on peut couper sans que ça s'entende. Le
    deux-points et le point-virgule en font partie : dans une énumération, la
    voix marque la pause de toute façon. */
const FIN_DE_PHRASE = /[.!?…:;](?=\s|$)|\n/g;

/** Les balises que le modèle sème et qui ne doivent JAMAIS être prononcées.
    Elles sont toutes demandées en PREMIÈRE ligne — l'émotion comme les gestes
    (voir le socle dans app/api/chat/route.ts) ; on les retire au passage, y
    compris à moitié écrites en fin de flux. */
const BALISES = /\[{1,2}[^\]]*\]{0,2}/g;

/** Le texte débarrassé de ses balises, tel qu'il pourrait être dit. */
export function sansBalises(texte: string): string {
  return texte.replace(BALISES, " ").replace(/\s+/g, " ").trim();
}

/* ── LE PLUS COURT MORCEAU QUI TIENNE, ET IL SE CALCULE ────────────────────

   Ce nombre n'est pas un goût, c'est une soustraction. Un morceau doit durer
   assez longtemps, une fois dit, pour couvrir la fabrication du SUIVANT.
   Sinon BIA se tait au milieu de sa réponse, et une couture s'entend.

   LES DEUX CÔTÉS DE LA SOUSTRACTION, mesurés le 15 septembre 2026 :
     — fabriquer N signes chez Soynade : 1,22 s de plancher + 22 ms par signe
       (essai à trois prises, /api/essai-voix) ;
     — dire N signes : environ 13,5 signes par seconde, et davantage encore
       puisque BIA parle ralentie de 30 % (voir lib/ralentir.ts).

       N     audio     fabrication du suivant     marge
      20     1,5 s          1,7 s                 −0,2 s   ← elle se coupe
      25     1,9 s          1,8 s                 +0,1 s   ← trop juste
      30     2,2 s          1,9 s                 +0,3 s
      40     3,0 s          2,1 s                 +0,9 s

   QUARANTE ÉTAIT CONFORTABLE, ET C'ÉTAIT LE PROBLÈME. Ses premières phrases
   sont courtes — « Waaw, maa ngi fi te jamm rekk la. » en fait trente-trois.
   À quarante, elle attendait la phrase suivante et parlait à la fin : sur sa
   réponse médiane, la diffusion ne gagnait RIEN.

   TRENTE, donc. Trois dixièmes de marge, et le ralentissement de la voix en
   ajoute par-dessus. En dessous, la marge devient négative et on échange une
   seconde gagnée contre un silence au milieu d'une phrase — un mauvais
   marché, et l'un des deux s'entend. */
const MORCEAU_MINIMAL = 30;

/** Une balise de GESTE, c'est-à-dire tout sauf l'émotion. C'est elle qui
    annonce que le serveur va remplacer la réponse — voir teteDeLaReponse. */
const UN_GESTE = /\[{1,2}\s*(?!\s*[ée]motion\b)[a-zà-ÿ-]{3,}\s*[:\-—]/i;

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
  /* ── LE TROU QUI LA FAISAIT PARLER DE TRAVERS ──────────────────────────

     Lamine, le 13 septembre 2026 : « je lui ai demandé en français, elle m'a
     affiché les Almadies, mais elle s'est mise à parler d'une manière
     incohérente, d'autres choses même. » J'avais éteint la diffusion sans
     trouver pourquoi. En la rallumant le 14, j'ai cherché d'abord.

     LE VOICI. Quand la réponse porte un GESTE — une carte, un papier, un
     appel, une vidéo — le serveur ne transmet pas le texte du modèle : il le
     REMPLACE par une phrase de service déjà enregistrée (« d'accord, je
     t'emmène »). La règle des cent vingt signes devait l'empêcher, et elle
     couvre le cas où la phrase du modèle est courte.

     ELLE NE COUVRE PAS LE CAS OÙ ELLE EST LONGUE. Le modèle écrit
     « [[carte:les Almadies]] C'est au bout de la corniche, il faut compter
     vingt minutes à cette heure-ci… » — bien plus de cent vingt signes une
     fois la balise retirée. Elle commençait donc à le dire. Puis le serveur
     tranchait, et le reste à dire devenait la phrase de service. Elle disait
     une chose, puis une autre, sans rapport. Exactement ce qu'il a entendu.

     LA BALISE EST SUR LA PREMIÈRE LIGNE, donc on la voit tout de suite : dès
     qu'un geste apparaît, on se tait et on attend la fin. On perd une seconde
     et demie sur les réponses qui ouvrent une carte — celles où elle dit trois
     mots de toute façon.

     L'ÉMOTION NE COMPTE PAS : elle est sur la même première ligne, elle est
     toujours là, et elle ne déclenche aucun remplacement. La confondre avec
     un geste reviendrait à ne jamais diffuser. */
  if (UN_GESTE.test(recu)) return "";
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
