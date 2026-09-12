/* ── QUAND QUELQU'UN RIT, ELLE RIT ──────────────────────────────────────────

   Lamine, le 12 septembre 2026 à trois heures du matin : « quand la personne
   rit, elle doit rire carrément, automatiquement. »

   AUTOMATIQUEMENT, donc SANS LE MODÈLE. Un rire qui arrive cinq secondes
   après celui de l'autre n'est pas un rire partagé : c'est un commentaire.
   On reconnaît donc le rire dans ce que le micro a transcrit, et elle rit
   tout de suite — avec ses vrais enregistrements, ceux de la voix de Kha.
   Aucun jeton, aucun signe envoyé à la voix, aucune attente.

   CE QUE LE MICRO ÉCRIT QUAND QUELQU'UN RIT. Un moteur de transcription ne
   rend jamais un rire de la même façon : il écrit « hahaha », « héhé »,
   « ah ah ah », ou il pose une annotation entre parenthèses — « (laughs) »,
   « (rire) ». On accepte les deux familles.

   ET ON SE MÉFIE DES FAUX. « Ah » tout seul n'est pas un rire, c'est une
   respiration ; « aha » non plus. On exige une RÉPÉTITION — deux syllabes de
   rire au moins — ou une annotation explicite. Une machine qui rit quand on
   ne rit pas est plus gênante qu'une machine qui ne rit jamais. */

export type Rire = {
  /** Y a-t-il un rire là-dedans ? */
  rit: boolean;
  /** N'y a-t-il QUE ça ? Alors elle rit et ne répond rien : on ne répond pas
      à un rire par une phrase, on rit avec. Gratuit, instantané. */
  seulement: boolean;
  /** Un rire long emporte le grand rire plutôt que le petit. */
  emotion: "rire" | "fourire" | null;
  /** Ce qui reste à dire une fois le rire retiré. */
  reste: string;
};

/* Les annotations que posent les moteurs de transcription. */
const ANNOTATIONS = /[([\[]\s*(laugh(s|ing|ter)?|rire|rires|rit|chuckles?|giggles?)\s*[)\]]/gi;

/* ── LE RIRE ÉCRIT EN LETTRES ──────────────────────────────────────────────

   Une SYLLABE de rire, c'est « ha », « hé », « hi », « ho », ou « ah ». Une
   seule n'est rien : « ah » est une respiration, « ah bon » une hésitation.
   Il en faut DEUX qui se suivent — c'est ça, un rire.

   Les voyelles longues passent (« haaa haaa ») et les séparateurs aussi,
   parce que les moteurs de transcription découpent souvent « ha ha ha ».

   Et la répétition est ce qui protège des faux : « Bahamas », « Hollande »,
   « Ahamada », « ahurissant » contiennent une syllabe, jamais deux de suite.
   L'épreuve les garde tous. */
const SYLLABE = "(?:h[aàâ]+|h[éèe]+|h[iî]+|h[oô]+|[aàâ]h+)";

/* ON N'UTILISE PAS \b ICI, ET C'EST L'ÉPREUVE QUI ME L'A APPRIS.

   « héhé » n'était pas reconnu alors que « hihihi » l'était. La raison :
   en JavaScript, \b ne connaît que l'alphabet anglais. « é » n'est pas une
   lettre pour lui, donc « héhé\b » ne trouve aucune frontière à la fin et la
   règle tombe — sur le rire le plus courant en français.

   On encadre donc par « tout sauf une lettre », au sens Unicode. Et sans
   regarder-derrière : Safari ne le connaît que depuis 2023, et un téléphone
   de Dakar peut être plus vieux que ça. */
const EN_LETTRES = new RegExp(
  `(^|[^\\p{L}])((?:${SYLLABE}[\\s-]?){2,})(?![\\p{L}])`, "giu");
const RACCOURCIS = /\b(mdr+|ptdr+|lol)\b/gi;

/* Combien de syllabes de rire dans ce morceau — c'est ce qui sépare le petit
   rire du fou rire. On compte les syllabes, pas les lettres : « hahahahahaha »
   en fait six, et six, ça ne se retient plus. */
const UNE_SYLLABE = new RegExp(SYLLABE, "gi");
function syllabes(morceau: string): number {
  if (/^(mdr|ptdr|lol)/i.test(morceau.trim())) return 2;
  return (morceau.match(UNE_SYLLABE) || []).length;
}

export function lireLeRire(texte: string): Rire {
  const brut = String(texte || "").trim();
  if (!brut) return { rit: false, seulement: false, emotion: null, reste: "" };

  let compte = 0;
  let annote = false;

  let sansRire = brut.replace(ANNOTATIONS, () => { annote = true; compte += 3; return " "; });
  sansRire = sansRire.replace(EN_LETTRES, (_m, avant: string, rire: string) => {
    compte += syllabes(rire);
    return `${avant} `;
  });
  sansRire = sansRire.replace(RACCOURCIS, () => { compte += 2; return " "; });

  const rit = annote || compte >= 2;
  if (!rit) return { rit: false, seulement: false, emotion: null, reste: brut };

  /* Ce qui reste, une fois le rire et la ponctuation retirés. S'il ne reste
     rien de parlant, c'était un rire et rien d'autre. */
  const reste = sansRire.replace(/[.,!?;:…«»"'’\-\s]+/g, " ").trim();

  return {
    rit: true,
    seulement: reste.length < 2,
    /* ── SIX SYLLABES, C'ÉTAIT INATTEIGNABLE ─────────────────────────────

       Lamine, le 12 septembre 2026 au soir : « je n'entends pas le grand
       rire. Ça ne se déclenche jamais. »

       Il ne se déclenchait pas parce qu'il fallait SIX syllabes de rire dans
       le texte transcrit — « hahahahahaha ». Or un moteur d'écoute ne rend
       jamais ça : quand on rit devant un micro, il écrit « haha », parfois
       « ahah », souvent rien. Six était un seuil écrit pour du texte TAPÉ,
       appliqué à de la parole. Le grand rire était donc mort-né.

       TROIS suffisent maintenant — « hahaha », c'est-à-dire quelqu'un qui
       rit vraiment — et une annotation du modèle suffit toujours. Deux
       syllabes (« haha », « héhé ») gardent le rire moyen : on ne sort pas
       six secondes de fou rire pour une politesse. */
    emotion: annote || compte >= 3 ? "fourire" : "rire",
    reste,
  };
}
