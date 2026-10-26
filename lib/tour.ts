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
  /** A resumed utterance may restart recognition/model work within this measurement. */
  reprises?: number;
  voie: "parole" | "ecrit";
  parole: number;
  /* ── LE PETIT JOURNAL DU 24 OCTOBRE 2026 ─────────────────────────────────
     Lamine : « ajoute un petit journal (heure de début de parole, de fin
     détectée, de premier son) pour que je voie si elle me coupe encore ».
     Ces trois-là voyagent avec les bornes du tour parce que les bornes sont
     déjà présentes partout — y compris dans les décors d'épreuve. Un ref de
     plus aurait été un nom de plus à déclarer dans chacun, donc un nom
     qu'on aurait oublié.
       debut_parole     quand il a commencé à parler
       silence_exige    le silence qu'on demandait avant de clore (ms)
       silence_observe  celui qui s'est réellement écoulé (ms)
     Si l'observé est nettement sous l'exigé, le tour s'est fermé avant qu'il
     ait fini : c'est ÇA, « elle me coupe ». */
  debut_parole?: number;
  silence_exige?: number;
  silence_observe?: number;
  micro: number;
  ecoute: number;
  modele: number;
  /* ── T5, AJOUTÉE LE 26 OCTOBRE 2026 ──────────────────────────────────────
     Lamine : « T5 première phrase prête à être prononcée ». Entre le premier
     mot du cerveau (T4) et le premier son fabriqué (T6), il y avait un seul
     nombre : `voix_ms`. Il mélangeait DEUX choses très différentes — le
     temps qu'on met à décider quoi dire en premier, et le temps que le GPU
     met à le fabriquer. On ne peut pas réduire ce qu'on ne sait pas séparer.
     Cette borne se pose à l'instant où la première phrase est arrêtée et où
     on demande son audio. */
  pretAParler: number;
  enMain: number;
  syllabe: number;
  /* Ce que le SERVEUR dit avoir mis à transcrire, de la même façon que
     `fabrication` pour la voix : T2 et T3 sont des instants de Francfort, pas
     du téléphone, et comparer deux horloges qui ne sont pas réglées ensemble
     fabriquerait des durées négatives. On ne compare donc jamais les deux
     montres — on retranche la part serveur de la durée vécue, et le reste est
     le réseau. C'est exact sans supposer aucune synchronisation. */
  ecouteServeur: number;
  /* ── LE TRAJET DU CERVEAU, MESURÉ ET NON DÉDUIT (26 octobre 2026) ────────
     allerRetourCerveau  notre fetch → le premier octet reçu   (téléphone)
     cerveauServeur      arrivée de la requête → premier mot   (serveur)
     requeteOctets       le poids exact du corps envoyé
     La différence des deux premières est le RÉSEAU, et c'est une différence
     de deux durées — jamais de deux horloges. */
  allerRetourCerveau: number;
  cerveauServeur: number;
  requeteOctets: number;
  /* Pour trier ses dix phrases sans qu'il ait à se souvenir de l'ordre. */
  langue?: "wo" | "fr";
  froid?: boolean;
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
  /** La part de transcription_ms passée DANS le serveur (oreille comprise),
      dite par le serveur lui-même. */
  transcription_serveur_ms: number;
  /** Et la part passée sur le réseau : l'audio qui monte, le texte qui
      redescend, et l'attente d'un tour de file GPU. */
  transcription_reseau_ms: number;
  /** La part de modele_ms tenue PAR LE SERVEUR : sa préparation (mémoire,
      lexique, consignes) plus l'attente du modèle, déclarée par lui. */
  cerveau_serveur_ms: number;
  /** Et la part passée sur le réseau : la requête qui monte à Francfort et
      le premier mot qui redescend. Mesurée, pas déduite. */
  cerveau_reseau_ms: number;
  /** Le poids exact du corps envoyé à /api/chat, en octets. */
  requete_octets: number;
  /** T4 → T5 : le premier mot du cerveau est là, on décide quoi dire en
      premier et on demande son audio. */
  mise_en_voix_ms: number;
  /** T5 → T6 : premier morceau de voix en main. */
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
  langue: "wo" | "fr" | "";
  /** Premier tour, ou plus de cinq minutes sans parler : les moteurs ont pu
      refroidir. Mélanger un tour froid aux chauds déplace toute la médiane,
      et c'est précisément la comparaison qu'il demande. */
  froid: boolean;
  quand: number;
};

export function tourVide(voie: "parole" | "ecrit" = "parole"): Bornes {
  return { voie, parole: 0, micro: 0, ecoute: 0, modele: 0, pretAParler: 0, enMain: 0, syllabe: 0,
    ecouteServeur: 0, allerRetourCerveau: 0, cerveauServeur: 0, requeteOctets: 0,
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
const APRES_LE_MICRO = new Set(["ecoute", "modele", "pretAParler", "enMain"]);

export function poser(b: Bornes, quoi: keyof Bornes & ("parole"|"micro"|"ecoute"|"modele"|"pretAParler"|"enMain"|"syllabe"),
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
  /* La nouvelle case s'INSÈRE : quand `pretAParler` manque — un vieil onglet,
     un chemin qui ne la pose pas — `mise_en_voix_ms` vaut zéro et `voix_ms`
     repart du modèle, exactement comme avant le 26 octobre. La somme reste
     donc le total vécu dans les deux cas, et le contrôle `somme > vecu`
     ci-dessous garde toute sa valeur. */
  const morceaux = {
    queue_ms: ecart(b.parole, b.micro),
    transcription_ms: ecart(b.micro, b.ecoute),
    modele_ms: ecart(b.ecoute || b.micro, b.modele),
    mise_en_voix_ms: ecart(b.modele, b.pretAParler),
    voix_ms: ecart(b.pretAParler || b.modele, b.enMain),
    demarrage_ms: ecart(b.enMain, b.syllabe) - porte,
    attente_porte_ms: porte,
  };
  const somme = Object.values(morceaux).reduce((a, n) => a + n, 0);
  /* La fabrication ne peut pas dépasser la voix entière : si le serveur dit
     plus que ce que le téléphone a attendu, c'est une borne d'un autre tour,
     et on ne lui fait pas confiance. */
  const fabrication = Math.min(Math.max(0, Number(b.fabrication) || 0), morceaux.voix_ms);
  /* Même garde-fou que pour la voix : un serveur ne peut pas avoir transcrit
     plus longtemps que le téléphone n'a attendu sa transcription. */
  const ecouteServeur = Math.min(Math.max(0, Number(b.ecouteServeur) || 0), morceaux.transcription_ms);
  /* L'aller-retour ne peut pas dépasser l'étape qui le contient, et la part
     serveur ne peut pas dépasser l'aller-retour. Deux bornes impossibles
     écartées, de la même façon que pour la voix et pour l'oreille. */
  const allerRetour = Math.min(Math.max(0, Number(b.allerRetourCerveau) || 0), morceaux.modele_ms);
  const cerveauServeur = Math.min(Math.max(0, Number(b.cerveauServeur) || 0), allerRetour);
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
    cerveau_serveur_ms: cerveauServeur,
    cerveau_reseau_ms: allerRetour - cerveauServeur,
    requete_octets: Math.max(0, Math.round(Number(b.requeteOctets) || 0)),
    transcription_serveur_ms: ecouteServeur,
    transcription_reseau_ms: morceaux.transcription_ms - ecouteServeur,
    voix_fabrication_ms: fabrication,
    voix_transfert_ms: morceaux.voix_ms - fabrication,
    /* Le temps qu'aucune borne n'a couvert. Zéro quand tout est mesuré ;
       non nul quand un chemin ne pose pas toutes ses bornes — la voix du
       navigateur, par exemple. Visible plutôt que réparti en douce sur les
       autres : un morceau qu'on ne sait pas nommer doit se voir. */
    ailleurs_ms: vecu - somme,
    vecu_ms: vecu,
    langue: b.langue === "wo" || b.langue === "fr" ? b.langue : "",
    froid: Boolean(b.froid),
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
    ["la mise en voix de la première phrase", par((t) => t.mise_en_voix_ms || 0)],
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

/* ── LE TABLEAU DEMANDÉ LE 26 OCTOBRE 2026 ──────────────────────────────────

   Lamine : « un tableau avec, pour chaque étape, le temps MOYEN et le PIRE
   CAS, classé de la plus longue à la plus courte, avec le total. »

   Pourquoi les trois chiffres et pas un seul. La MÉDIANE dit ce qu'il vit
   d'habitude ; la MOYENNE est celle qu'il demande et elle se laisse tirer par
   un seul mauvais tour ; le PIRE CAS est celui qui l'a fait soupirer. Une
   étape dont la médiane est bonne et le pire cas trois fois pire n'est pas
   une étape lente, c'est une étape INSTABLE — et on ne la répare pas de la
   même façon. Les trois sont donc côte à côte, jamais l'un à la place des
   autres.

   Le classement est fait sur la MOYENNE parce que c'est ce qu'il a demandé.  */
export type Etape = {
  repere: string;
  quoi: string;
  moyen_ms: number;
  pire_ms: number;
  median_ms: number;
  part_du_total: number;
};

const moyenne = (n: number[]) => (n.length ? Math.round(n.reduce((a, x) => a + x, 0) / n.length) : 0);
const pire = (n: number[]) => (n.length ? Math.max(...n) : 0);

/** Les huit bornes de son mandat, étape par étape, du plus long au plus court. */
export function tableauDesEtapes(tours: Tour[]) {
  if (!tours.length) return null;
  const lignes: Array<[string, string, (t: Tour) => number]> = [
    ["T0→T1", "le silence qui ferme le micro", (t) => t.queue_ms],
    ["T1→T3", "la transcription, part SERVEUR (l'oreille elle-même)", (t) => t.transcription_serveur_ms || 0],
    ["T1→T3", "la transcription, part RÉSEAU (l'audio monte, le texte redescend)",
      (t) => (t.transcription_serveur_ms ? t.transcription_reseau_ms : t.transcription_ms) || 0],
    ["T3→T4", "le cerveau, part SERVEUR (préparation + attente du modèle)", (t) => t.cerveau_serveur_ms || 0],
    ["T3→T4", "le cerveau, part RÉSEAU (la requête monte, le premier mot redescend)",
      (t) => t.cerveau_reseau_ms || 0],
    ["T3→T4", "le cerveau, part NON COUVERTE (assemblage de la tête sur le téléphone)",
      (t) => Math.max(0, t.modele_ms - ((t.cerveau_serveur_ms || 0) + (t.cerveau_reseau_ms || 0)))],
    ["T4→T5", "la mise en voix de la première phrase", (t) => t.mise_en_voix_ms || 0],
    ["T5→T6", "la fabrication du premier son, part GPU", (t) => t.voix_fabrication_ms || 0],
    ["T5→T6", "la fabrication du premier son, part réseau et décodage",
      (t) => (t.voix_fabrication_ms ? t.voix_transfert_ms : t.voix_ms) || 0],
    ["T6→T7", "le démarrage du haut-parleur", (t) => t.demarrage_ms],
    ["—", "on l'attend parce qu'il parle encore (la porte)", (t) => t.attente_porte_ms || 0],
    ["—", "ce qu'aucune borne ne couvre", (t) => t.ailleurs_ms || 0],
  ];
  const vecus = tours.map((t) => t.vecu_ms);
  const total = moyenne(vecus) || 1;
  const etapes: Etape[] = lignes
    .map(([repere, quoi, f]) => {
      const v = tours.map(f);
      return { repere, quoi, moyen_ms: moyenne(v), pire_ms: pire(v), median_ms: mediane(v),
        part_du_total: Math.round((moyenne(v) / total) * 100) };
    })
    .filter((e) => e.moyen_ms > 0 || e.pire_ms > 0)
    .sort((a, b) => b.moyen_ms - a.moyen_ms);
  return {
    tours: tours.length,
    etapes,
    total_vecu: { moyen_ms: moyenne(vecus), pire_ms: pire(vecus), median_ms: mediane(vecus) },
    /* Le total vécu est mesuré de bout en bout, PAS additionné : si la somme
       des étapes s'en écarte, une borne manque et il faut le voir. */
    somme_des_etapes_ms: etapes.reduce((a, e) => a + e.moyen_ms, 0),
  };
}

/** Une réponse a-t-elle coûté le modèle ? Le répertoire, les services et les
    ordres répondent sans lui — les mélanger fausserait tout. */
export function aPayeLeModele(source: string): boolean {
  return !/répertoire|service|ordre|blague|correction validée/i.test(source);
}
