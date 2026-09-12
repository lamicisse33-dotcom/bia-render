/* ── CE QUE BIA DIT PENDANT QU'ELLE RÉFLÉCHIT ──────────────────────────────

   Deuxième version, et elle vient d'un échec. La première enchaînait des
   phrases courtes tirées au hasard dans une réserve de cinquante-six. Chacune
   se tenait seule ; mises bout à bout elles se contredisaient — elle disait
   « j'ai entendu, laisse-moi réfléchir », puis demandait comment allait la
   journée, puis revenait avec un autre personnage. Lamine l'a montrée à
   quelqu'un dans cet état, le 9 septembre 2026. Coller douze morceaux ne fait
   pas une pensée continue.

   Sa solution, et elle est meilleure : UNE SEULE VOIX, qui pense tout haut
   d'un bout à l'autre, coupée net quand la réponse est prête.

   ET UNE DEUXIÈME FOIS, LE MÊME SOIR : la longue phrase qui remplaçait les
   cinquante-six a tenu deux heures. Répétée à chaque question, elle agaçait
   autant, et faisait paraître l'attente plus longue qu'elle n'est.

   CE QUI RESTE, ET C'EST TOUT.

   1. AU PREMIER ÉCHANGE D'UNE CONVERSATION SEULEMENT — à la seconde où le
      micro se coupe, elle dit qu'elle a entendu, elle se nomme, et elle
      demande le prénom. Si elle le connaît déjà, elle salue par le prénom et
      s'arrête là. Une fois. Jamais plus dans la même conversation.

   2. ENSUITE, LE SILENCE. Une lueur dorée qui respire près de son visage, et
      rien d'autre — comme Siri, comme ChatGPT. Aucune phrase répétée.

   3. Le son de la réponse arrive — s'il reste une parole en cours, elle est
      coupée avec un fondu de quelques centièmes, et le CHAPEAU recouvre la
      couture : « bon, je réponds à ta question ».

   Les textes sont de Lamine, en wolof urbain de Dakar. Le français est la
   même chose dite dans l'autre langue, pas une traduction mot à mot.
   NE LES RÉÉCRIS PAS SANS LUI. */

export type Langue = "wo" | "fr";

export type Parole = {
  /** Le nom du fichier dans public/sons/attente/, sans l'extension. */
  fichier: string;
  wo: string;
  fr: string;
};

/** 1. Première conversation : elle se nomme et demande le prénom. */
export const PARTIE_1: Parole = {
  fichier: "partie1",
  wo: "Waaw, dégg naa la bu baax, man. BIA la tudd. Yaw nak, naka nga tudd ?",
  fr: "Oui, je t'ai bien entendu. Moi, c'est BIA. Et toi, comment tu t'appelles ?",
};

/* 1 bis. Elle connaît déjà la personne : elle la salue par son prénom et
   passe directement à la longue. {nom} est remplacé au moment de le dire —
   c'est la seule phrase qui ne peut pas être un fichier tout prêt, et elle
   est courte exprès. */
export const PARTIE_1_CONNU: Parole = {
  fichier: "partie1-connu",
  wo: "Waaw {nom}, dégg naa la bu baax.",
  fr: "Oui {nom}, je t'ai bien entendu.",
};

/* 2. LA LONGUE — EN RÉSERVE, PLUS JOUÉE.

   Elle a servi une soirée, le 9 septembre 2026, et Lamine a tranché : même
   bien écrite, une phrase que BIA répète à chaque question devient agaçante,
   et elle donne l'impression que l'application est plus lente qu'elle ne
   l'est. Après la présentation du début, l'attente est désormais SILENCIEUSE
   — une lueur dorée qui respire, et rien d'autre.

   Le texte reste ici parce qu'il est de lui, et parce que si le silence
   s'avère trop long à l'usage, le remède sera une phrase COURTE vers la
   septième seconde — pas ce monologue. Aucun code ne l'appelle plus. */
export const PARTIE_2: Parole = {
  fichier: "partie2",
  wo: "May ma rekk quelques secondes, ma dellu xool tranquillement li nga wax "
    + "te réfléchir ci manière bi gëna leer pour tontu la. Bëgguma gaawantu, "
    + "ba jox la réponse bu baaxul, bu incomplète walla bu adaptéwul ak sa "
    + "question. Préféré naa jël sama temps, xool détails yi bu baax, "
    + "organiser sama idées yi te choisir mots yi dina la gëna jariñ. Maa ngi "
    + "fi ak yaw, te maa ngi xool lépp tranquillement. Parfois, réponse bu "
    + "baax dafay laaj tuuti réflexion, surtout su ñu bëggee mu nekk ay tontu "
    + "yu précis, honnête te facile à comprendre. Kon may ma encore tuuti "
    + "rekk, maa ngi xalaat, te sama xarit dinaa la jox réponse bu leer te "
    + "correct.",
  fr: "Oui, je t'ai bien entendu, du début jusqu'à la fin. Donne-moi "
    + "simplement quelques secondes pour reprendre calmement ce que tu viens "
    + "de dire et réfléchir à la manière la plus claire de te répondre. Je ne "
    + "veux pas me précipiter et te donner une réponse trop rapide, "
    + "incomplète ou mal adaptée à ta question. Je préfère prendre le temps "
    + "de bien examiner chaque détail, de mettre mes idées dans le bon ordre "
    + "et de choisir les mots qui pourront réellement t'être utiles. Je suis "
    + "toujours avec toi et je regarde tout cela tranquillement. Parfois, une "
    + "bonne réponse demande un petit moment de réflexion, surtout lorsqu'on "
    + "veut être précis, honnête et facile à comprendre. Laisse-moi donc "
    + "encore un court instant, je termine et je vais te répondre "
    + "correctement.",
};

/** 3. Le chapeau : il recouvre la coupure. */
export const CHAPEAU: Parole = {
  fichier: "chapeau",
  wo: "Bon, noppi naa. Léegi ma la tontu.",
  fr: "Bon, je réponds à ta question.",
};

/** Celles qui sont vraiment dites, et qui peuvent devenir des fichiers. */
export const A_FABRIQUER: Parole[] = [PARTIE_1, CHAPEAU];

/* ── ELLES ENTRENT DANS LE SEAU, COMME LE RESTE ────────────────────────────

   Lamine, le 12 septembre 2026 : « je préfère faire les cartes et tout de
   suite, de tout ce qui est manquant, une bonne fois pour toutes. »

   Il a raison, et il y avait mieux que lui faire déposer des fichiers à la
   main : ces deux paroles-là s'enregistrent exactement comme les 84 réponses
   et les 49 phrases de guidage — par le même bouton, dans le même seau, au
   même tarif d'une seule fois.

   POURQUOI ÇA PRESSAIT. Les fichiers de public/sons/attente/ n'ont jamais été
   déposés — vérifié sur le serveur en ligne le 12 septembre : 404 sur les
   quatre. Donc CHAQUE attente de CHAQUE échange partait chez Soynade : huit
   secondes et quelques signes payés, à chaque question, pour deux phrases qui
   ne changent jamais. C'est le pire cas possible de ce que le répertoire
   existe pour éviter.

   PARTIE_1_CONNU n'y entre pas : elle contient le prénom de la personne, elle
   ne peut donc pas être un fichier. C'est voulu, et elle est courte exprès. */
export const CLE_SEAU = "attente-";

/** La clé du son dans le seau, pour les paroles qui peuvent en avoir une. */
export function cleDe(p: Parole): string {
  return CLE_SEAU + p.fichier;
}

/** Le texte à dire, dans la langue de la conversation. */
export function dire(p: Parole, langue: Langue, nom = ""): string {
  return (langue === "fr" ? p.fr : p.wo).replace("{nom}", nom).replace(/\s+/g, " ").trim();
}

/** L'adresse du fichier tout prêt, quand il en existe un.

    On regarde d'abord dans le seau — c'est là qu'il sera après le prochain
    enregistrement — puis, à défaut, dans public/sons/attente/, où on pourrait
    toujours en déposer un à la main. La base du seau vient du serveur au
    démarrage (/api/etat), parce que le téléphone ne connaît pas l'adresse de
    Supabase et n'a pas à la connaître. */
export function fichiersPossibles(p: Parole, langue: Langue, baseDuSeau = ""): string[] {
  return [
    baseDuSeau ? `${baseDuSeau}${cleDe(p)}.wav` : "",
    `/sons/attente/${p.fichier}-${langue}.mp3`,
  ].filter(Boolean);
}

export function fichierDe(p: Parole, langue: Langue): string {
  return `/sons/attente/${p.fichier}-${langue}.mp3`;
}

/* ── Reconnaître un prénom ──────────────────────────────────────────────────
   La personne répond rarement « Modou » tout court : elle dit « man Modou
   laa tudd », « je m'appelle Modou », « moi c'est Modou ». On enlève les
   amorces et on garde les trois premiers mots. */
const AMORCES = [
  /^\s*(je m'?appelle|moi c'?est|mon nom est|c'?est|je suis)\s+/i,
  /^\s*(man|maa)\s+/i,
  /\s+(laa tudd|la tudd|laa tuddu|la tuddu)\s*$/i,
  /^\s*(maa ngi tudd|maa ngui tudd|tudd naa|sama tur mooy|sama tur)\s+/i,
];

export function extraireNom(dit: string): string {
  let t = String(dit || "").trim().replace(/[.!?,]+$/, "");
  for (const a of AMORCES) t = t.replace(a, "").trim();
  const mots = t.split(/\s+/).filter(Boolean).slice(0, 3);
  if (!mots.length) return "";
  const nom = mots.map((m) => m.charAt(0).toUpperCase() + m.slice(1)).join(" ");
  // Une phrase entière n'est pas un prénom : on préfère ne rien retenir.
  return nom.length <= 40 ? nom : "";
}
