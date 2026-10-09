/* ── UN TOUR DE VOIX, MESURÉ BOUT À BOUT ─────────────────────────────────────

   Lamine, le 15 septembre 2026 :

     « On a toujours un problème de vitesse avec BIA. Render est maintenant en
       plan payant et ne dort plus. Mais on veut mesurer précisément où est-ce
       qu'on perd du temps. Il faut ajouter une mesure complète sur un tour de
       voix, SANS CHANGER LE COMPORTEMENT pour l'instant. […] On mesure
       d'abord. Et après, on décidera. Est-ce que c'est la transcription, le
       modèle, la voix ou vraiment le serveur. »

   ── CE QUI SE MESURAIT DÉJÀ, ET CE QUI MANQUAIT ────────────────────────────

   lib/chrono.ts mesure trois morceaux depuis le 9 septembre : transcrire,
   interroger le modèle, fabriquer la voix. Ils servent à choisir la longueur
   de la phrase d'attente, et ils sont justes. Mais ils commencent au micro
   coupé et s'arrêtent quand le son est EN MAIN — et Lamine, lui, n'entend ni
   l'un ni l'autre de ces deux instants.

   IL MANQUAIT DONC LES DEUX BOUTS, et ce sont eux qu'on ressent :

     — LA QUEUE DE SILENCE. Entre le moment où il finit vraiment de parler et
       celui où le micro se ferme, il y a le seuil de silence : 1,5 seconde
       (SILENCE_QUI_FERME, lib/micro.ts), plus jusqu'à 60 ms de ronde de
       veille. Personne ne la comptait. Elle est pourtant présente à CHAQUE
       tour, et elle est ressentie comme de la lenteur de BIA alors que c'est
       un réglage à nous.

     — LE DÉMARRAGE DU SON. Entre « le son est en main » et la première
       syllabe réellement émise, il y a le décodage, le ralentissement WSOLA,
       et le souffle de sécurité de 60 ms du programmateur. Petit, sans doute.
       Mais on ne le sait pas, et c'est justement ce qu'on vient vérifier.

   ── LES CINQ BORNES, DANS L'ORDRE ──────────────────────────────────────────

     parole   il a fini de parler pour de bon (dernier son détecté par le VAD)
     micro    le micro se ferme
     ecoute   la transcription est revenue
     modele   le modèle a fini d'écrire
     enMain   le premier morceau de voix est fabriqué et décodable
     syllabe  le son sort réellement du haut-parleur

   Et les cinq durées qui s'en déduisent, plus le total vécu — de sa dernière
   syllabe à lui jusqu'à la première syllabe d'elle.

   ── DEUX PIÈGES, ET ON LES ÉVITE ICI ───────────────────────────────────────

   1. NE PAS MÉLANGER L'ATTENTE ET LA VRAIE RÉPONSE. BIA meuble pendant
      qu'elle réfléchit. Cette phrase-là sort du haut-parleur AVANT la
      réponse — la compter comme « première syllabe » ferait croire à un tour
      de deux secondes alors qu'il en a duré neuf. La borne `syllabe` n'est
      posée QUE par la vraie réponse. Et on note à part si une attente a
      parlé, parce que ça change ce qu'il a ressenti, pas ce qu'il a attendu.

   2. NE PAS MÉLANGER LES SOURCES. Une réponse du répertoire arrive en 100 ms
      avec son son déjà fabriqué ; une réponse du modèle demande le modèle
      PUIS la voix. Faire la moyenne des deux donnerait un chiffre qui ne
      décrit aucun des deux cas. La source est donc gardée avec chaque tour,
      et le résumé sépare ce qui a coûté du modèle de ce qui n'en a pas
      coûté.

   ── ET RIEN NE CHANGE DE COMPORTEMENT ──────────────────────────────────────

   C'est sa consigne, et elle est sage : on ne touche ni au seuil de silence,
   ni au serveur, ni aux réglages. Ce fichier ne fait que POSER DES DATES et
   soustraire. Si on le retirait, BIA se comporterait exactement pareil.    */

/** Une borne du tour, telle que le téléphone la pose. */
export type Bornes = {
  voie: "parole" | "ecrit";
  parole: number;
  micro: number;
  ecoute: number;
  modele: number;
  enMain: number;
  syllabe: number;
  /** D'où vient la réponse — `source` tel que /api/chat le rend. */
  source: string;
  /** Une phrase d'attente a-t-elle parlé pendant ce tour ? */
  attente: boolean;
  /** A-t-elle parlé sur la TÊTE de la réponse, avant que le modèle ait fini ?
      Sa deuxième question du 15 septembre au soir : « combien de réponses
      partent avant la fin complète du modèle ». C'est la mesure du chantier
      qu'on vient de faire — sans elle, on aurait dix tours et aucune preuve. */
  surLaTete: boolean;
  /** Ce que le SERVEUR dit avoir mis à fabriquer le premier morceau de voix
      (Soynade + encodage), en ms. Posé depuis la réponse de /api/voix. Le
      reste de `voix_ms`, c'est le réseau et le décodage — et c'est ce qu'on
      ne pouvait pas voir avant le 19 septembre. */
  fabrication: number;
  /** Le temps passé DERRIÈRE LA PORTE : la voix était en main, mais il
      parlait encore, et on l'a attendu. Ce n'est ni de la fabrication ni du
      démarrage — c'est lui. Sans cette case, ce temps tombait dans
      « le démarrage du son » et faisait croire à une lenteur. */
  porte: number;
};

export type Tour = {
  voie: "parole" | "ecrit";
  source: string;
  attente: boolean;
  /** Elle a commencé à parler AVANT que le modèle ait fini d'écrire. Sa
      deuxième question du 15 septembre au soir — et la seule preuve que le
      chantier du verrou des 120 signes a servi. */
  surLaTete: boolean;
  /** Il a fini de parler → le micro se ferme. Le seuil de silence. */
  queue_ms: number;
  /** Micro fermé → transcription revenue. */
  transcription_ms: number;
  /** Transcription → le modèle a fini d'écrire. */
  modele_ms: number;
  /** Modèle → premier morceau de voix en main. */
  voix_ms: number;
  /** La part de voix_ms passée CHEZ SOYNADE (et à encoder), dite par le
      serveur. */
  voix_fabrication_ms: number;
  /** Et la part passée sur le réseau et dans le décodage du téléphone.
      C'est celle-là que le passage du wav au mp3 doit faire fondre. */
  voix_transfert_ms: number;
  /** Son en main → première syllabe réellement émise, la porte déduite. */
  demarrage_ms: number;
  /** Le temps qu'elle l'a attendu, voix en main, parce qu'il parlait. */
  attente_porte_ms: number;
  /** Le temps qu'aucune borne n'a couvert. Zéro quand tout est mesuré. */
  ailleurs_ms: number;
  /** Sa dernière syllabe à lui → la première syllabe d'elle. TOUT le tour. */
  vecu_ms: number;
  quand: number;
};

export function tourVide(voie: "parole" | "ecrit" = "parole"): Bornes {
  return { voie, parole: 0, micro: 0, ecoute: 0, modele: 0, enMain: 0, syllabe: 0,
    source: "", attente: false, surLaTete: false, fabrication: 0, porte: 0 };
}

/* Une borne ne se pose qu'UNE FOIS. Un tour peut repasser par le même point —
   une réponse en plusieurs morceaux rappelle le programmateur, une reprise
   redemande la voix — et écraser la date ferait rétrécir la durée mesurée
   jusqu'à la faire disparaître. La première est la bonne : c'est l'instant où
   la chose est arrivée. */
/* ── ET UNE BORNE EN RETARD N'EST PAS UNE BORNE ─────────────────────────────

   Ce que les treize premiers tours ont montré, le 15 septembre 2026 au soir.
   Trois d'entre eux rendaient des durées impossibles : cinq secondes de
   fabrication de voix sur un tour qui n'en avait duré quatre, et zéro pour le
   modèle. La somme des cinq morceaux ne faisait plus le total.

   LA CAUSE. Depuis que le modèle diffuse, BIA parle sur la TÊTE de sa réponse
   — donc le tour se referme AVANT que le bloc complet n'arrive. Les bornes
   posées à l'arrivée de ce bloc tombaient alors dans le tour SUIVANT, qui
   héritait d'une date d'il y a dix secondes.

   On répare des deux côtés : la borne du modèle est posée à la tête (voir
   app/page.tsx), et ici on refuse tout ce qui arrive avant que le micro se
   soit fermé. Aucune de ces trois bornes ne PEUT le précéder — une mesure qui
   accepte l'impossible ne mesure plus rien. */
const APRES_LE_MICRO = new Set(["ecoute", "modele", "enMain"]);

export function poser(b: Bornes, quoi: keyof Bornes & ("parole"|"micro"|"ecoute"|"modele"|"enMain"|"syllabe"),
                      quand = Date.now()): Bornes {
  if (b[quoi]) return b;
  if (APRES_LE_MICRO.has(quoi) && !b.micro) return b;
  b[quoi] = quand;
  return b;
}

const ecart = (a: number, b: number) => (a && b && b >= a) ? b - a : 0;

/* PLUS DE DIX MINUTES N'EST PAS UNE MESURE. C'est un téléphone qu'on a posé,
   un onglet mis en veille, une conversation reprise le lendemain. Une seule
   valeur pareille déplacerait la médiane de tout le reste. */
const TROP_LONG = 600_000;

/** Le tour fini, prêt à être envoyé — ou null s'il est incomplet ou aberrant.

    On exige les DEUX bouts : sans `syllabe`, elle n'a jamais parlé (coupée,
    carte ouverte, erreur) et le tour ne décrit rien. Rendre un tour à moitié
    mesuré serait pire que n'en rendre aucun : il compterait dans la médiane. */
export function finir(b: Bornes, quand = Date.now()): Tour | null {
  if (!b.syllabe) return null;
  const debut = b.parole || b.micro;
  if (!debut) return null;
  const vecu = ecart(debut, b.syllabe);
  if (!vecu || vecu > TROP_LONG) return null;
  /* La porte ne peut pas avoir duré plus que l'écart en main → syllabe où
     elle s'est passée. */
  const porte = Math.min(Math.max(0, Number(b.porte) || 0), ecart(b.enMain, b.syllabe));
  const morceaux = {
    queue_ms: ecart(b.parole, b.micro),
    transcription_ms: ecart(b.micro, b.ecoute),
    modele_ms: ecart(b.ecoute || b.micro, b.modele),
    voix_ms: ecart(b.modele, b.enMain),
    demarrage_ms: ecart(b.enMain, b.syllabe) - porte,
    attente_porte_ms: porte,
  };
  const somme = Object.values(morceaux).reduce((a, n) => a + n, 0);
  /* La fabrication ne peut pas dépasser la voix entière : si le serveur dit
     plus que ce que le téléphone a attendu, c'est une borne d'un autre tour,
     et on ne lui fait pas confiance. */
  const fabrication = Math.min(Math.max(0, Number(b.fabrication) || 0), morceaux.voix_ms);
  /* ── LE CONTRÔLE QUI AURAIT ATTRAPÉ LE DÉFAUT TOUT SEUL ────────────────

     Les morceaux ne peuvent pas dépasser le tour : c'est de l'arithmétique,
     pas une opinion. Quand ça arrive, une borne vient d'ailleurs — d'un tour
     précédent, d'un chemin parallèle — et le tour entier est faux. On le
     jette au lieu de le laisser tirer la médiane.

     Trois tours sur treize étaient dans ce cas le 15 septembre au soir, et
     c'est en additionnant à la main que je l'ai vu. Désormais c'est le code
     qui le voit, à chaque tour, sans que personne ait à y penser. */
  if (somme > vecu) return null;
  return {
    voie: b.voie,
    source: b.source || "inconnue",
    attente: b.attente,
    surLaTete: b.surLaTete,
    ...morceaux,
    voix_fabrication_ms: fabrication,
    voix_transfert_ms: morceaux.voix_ms - fabrication,
    /* Le temps qu'aucune borne n'a couvert. Zéro quand tout est mesuré ;
       non nul quand un chemin ne pose pas toutes ses bornes — la voix du
       navigateur, par exemple. Visible plutôt que réparti en douce sur les
       autres : un morceau qu'on ne sait pas nommer doit se voir. */
    ailleurs_ms: vecu - somme,
    vecu_ms: vecu,
    quand,
  };
}

/* ── LIRE LE RÉSULTAT ────────────────────────────────────────────────────

   La médiane, jamais la moyenne — même raison que dans lib/chrono.ts : un
   réveil de réseau à trente secondes se souviendrait pendant vingt échanges
   et ferait croire BIA lente alors qu'elle ne l'est pas. */
export function mediane(nombres: number[]): number {
  if (!nombres.length) return 0;
  const tri = [...nombres].sort((a, b) => a - b);
  const m = Math.floor(tri.length / 2);
  return tri.length % 2 ? tri[m] : Math.round((tri[m - 1] + tri[m]) / 2);
}

export type Part = { quoi: string; ms: number; part: number };

/** Ce qui prend le temps, du plus gros au plus petit. C'est la réponse à sa
    question — « est-ce que c'est la transcription, le modèle, la voix ou
    vraiment le serveur » — et elle doit se lire sans calcul mental. */
export function ouPasseLeTemps(tours: Tour[]): Part[] {
  if (!tours.length) return [];
  const par = (f: (t: Tour) => number) => mediane(tours.map(f));
  const morceaux: Array<[string, number]> = [
    ["le silence avant la coupure du micro", par((t) => t.queue_ms)],
    ["la transcription", par((t) => t.transcription_ms)],
    ["le modèle", par((t) => t.modele_ms)],
    ["la fabrication de la voix", par((t) => t.voix_fabrication_ms || 0)],
    ["le transport de la voix (réseau + décodage)", par((t) => (t.voix_fabrication_ms ? t.voix_transfert_ms : t.voix_ms) || 0)],
    ["le démarrage du son", par((t) => t.demarrage_ms)],
    ["l'attente qu'il finisse de parler (la porte)", par((t) => t.attente_porte_ms || 0)],
  ];
  const somme = morceaux.reduce((a, [, ms]) => a + ms, 0) || 1;
  return morceaux
    .map(([quoi, ms]) => ({ quoi, ms, part: Math.round((ms / somme) * 100) }))
    .sort((a, b) => b.ms - a.ms);
}

/** Une réponse a-t-elle coûté le modèle ? Le répertoire, les services et les
    ordres répondent sans lui — les mélanger fausserait tout. */
export function aPayeLeModele(source: string): boolean {
  return !/répertoire|service|ordre|blague|correction validée/i.test(source);
}
