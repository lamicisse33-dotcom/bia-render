import { ecritureTranscriptionCompatible } from "./ecriture-transcription";
import { chezOreilleLocale } from "./ecoute-locale";
import { noterEtape } from "./etapes";
import { voixConfig } from "./voix";
import { noterOreille } from "./depense";
/* Parole -> texte.

   ── CE QUI ÉTAIT ÉCRIT ICI, ET QUI ÉTAIT FAUX ──────────────────────────────

   « Soynade exige un wav 16 kHz — c'est pourquoi il n'est pas proposé ici. »
   Je l'avais lu dans leur documentation et jamais vérifié. Le 19 septembre
   2026, l'essai leur a envoyé le même son dans quatre emballages : les quatre
   sont passés, le webm d'Android et le mp4 d'iPhone compris.

   Cette phrase a écarté pendant une semaine le seul moteur qui entend le
   wolof. Elle a coûté plus cher que n'importe quel bogue de ce dépôt : c'est
   une page lue à la place d'un appel fait.

   DEPUIS : le fil en français va chez ElevenLabs, tout le reste chez Soynade,
   qui gagne de trente et un points sur le wolof. Aucune conversion, le
   téléphone n'est pas touché. Voir transcrire(), plus bas. */

const env = process.env;

export const ecouteConfig = {
  fournisseur: env.STT_PROVIDER || (env.ELEVENLABS_API_KEY ? "elevenlabs" : "navigateur"),
  elevenlabs: {
    apiKey: env.ELEVENLABS_API_KEY || "",
    /* ── SCRIBE V2, PARCE QUE LUI ACCEPTE QU'ON LUI DONNE LES MOTS ─────────

       Mesuré sur son serveur le 12 septembre 2026 : sur douze écoutes, le
       moteur a cru entendre du français huit fois, puis de l'anglais, de
       l'italien, du pampangan, du turc. Zéro fois le wolof. ElevenLabs range
       le wolof dans son palier « moyen » — 25 à 50 % de mots faux — et aucun
       réglage ne répare ça.

       Mais `scribe_v2` accepte des `keyterms` : une liste de mots à
       s'attendre à entendre. On arrête de lui demander de devenir le wolof,
       on lui donne le vocabulaire de Lamine. Voir lib/mots-a-entendre.ts.

       ELEVENLABS_STT_MODEL le remplace sans toucher au code, et si v2 est
       refusé on retombe SEUL sur v1 (voir transcrire). */
    model: env.ELEVENLABS_STT_MODEL || "scribe_v2",
    /* Le moteur de repli, celui qui marchait hier : on ne reste jamais sourd
       parce qu'un modèle neuf n'est pas ouvert sur son compte. */
    modeleDeRepli: env.ELEVENLABS_STT_MODEL_REPLI || "scribe_v1",
  },
};

export type Ecoute = {
  texte: string;
  langue: "wo" | "fr" | null;
  moteur: string;
  /** La langue que le moteur a cru entendre, telle qu'il la nomme. */
  entendue?: string;
  /** Rempli quand il a fallu reprendre l'écoute en imposant la langue :
      contient la langue qu'il avait choisie de travers. */
  repris?: string;
};

const CARTE: Record<string, "wo" | "fr"> = {
  fra: "fr", fre: "fr", fr: "fr", fra_latn: "fr",
  wol: "wo", wo: "wo", wol_latn: "wo",
};

/* ── LES DEUX SEULES LANGUES DE BIA ────────────────────────────────────────

   Lamine, le 12 septembre 2026, capture d'écran à l'appui :

     « Regarde, quand je parle avec elle, parfois mes paroles sont écrites en
       arabe, parfois avec d'autres langues. »

   Sur sa capture, deux phrases de lui :

       « سلام »                              — il avait dit « Salaam »
       « Tɛgɛnon miminuku Vivian YouTube »   — il demandait une vidéo

   La première est en écriture arabe. La seconde n'est pas du wolof : c'est du
   bambara, avec son ɛ et son ɔ. Ce ne sont pas des fautes de transcription,
   ce sont des LANGUES DIFFÉRENTES — le moteur a bien entendu les sons, et il
   a choisi le mauvais alphabet pour les écrire.

   ── POURQUOI ────────────────────────────────────────────────────────────

   Scribe devine la langue quand on ne la lui donne pas. Et le wolof, il le
   connaît mal : les sons de Dakar ressemblent assez au bambara, à l'arabe,
   au peul, pour qu'il s'y trompe une fois sur deux.

   Or ce fichier SAVAIT recevoir un indice de langue — `indice` existe depuis
   le premier jour, et /api/ecouter le lit. Mais le téléphone ne l'a JAMAIS
   envoyé. Vérifié le 12 septembre : `indice_langue` n'apparaît nulle part
   dans app/page.tsx. La devinette tournait donc à chaque phrase.

   ── CE QU'ON NE FAIT TOUJOURS PAS ───────────────────────────────────────

   ON NE FORCE PAS LE WOLOF À TOUS LES COUPS. Ce serait réparer un défaut en
   en créant un autre : BIA parle aussi français, et du français transcrit
   de force en wolof ne ressort pas mieux que du wolof transcrit en arabe.
   Cette règle tient, et elle tient encore aujourd'hui.

   ── MAIS ON A CESSÉ DE LE LAISSER DEVINER, LE 18 SEPTEMBRE AU SOIR ──────

   Ce qui était écrit ici, et qui était FAUX : « la devinette de Scribe est
   juste une bonne partie du temps ». Je l'avais supposé. Mesuré, sur deux
   sessions et quatre-vingts écoutes :

       18 sept., 55 écoutes   fra 18 · eng 23 · por 4 · war 2 · ind 2 · …
       18 sept., 25 écoutes   fra 10 · eng 3 · fin 2 · ita 2 · nld 2 · …
       WOLOF, LES DEUX FOIS : ZÉRO

   Il ne se trompe pas « une bonne partie du temps » sur le wolof : il se
   trompe TOUJOURS. Laisser deviner un moteur qui échoue à cent pour cent
   n'est pas de la prudence, c'est un aller-retour offert.

   ── J'AI ALORS IMPOSÉ LA LANGUE DU FIL, ET C'ÉTAIT UNE FAUTE ────────────

   ⚠ CE QUI SUIT A ÉTÉ TENTÉ LE 18 SEPTEMBRE À 20 H ET RETIRÉ À 21 H 20.
   Ça rendait du charabia et BIA ne comprenait plus rien. Le pourquoi, chiffré,
   est à IMPOSER_LA_LANGUE_DES_LE_PREMIER_APPEL, plus bas dans ce fichier —
   à lire AVANT d'y revenir. Le raisonnement ci-dessous est conservé parce
   qu'il explique la tentative, pas parce qu'il est juste.

   La langue de la conversation — pas le wolof d'office : la règle du dessus
   est intacte, un fil en français impose « fra ». Le téléphone la connaît et
   l'envoie déjà (`indice_langue`).

   La reprise disparaît alors d'elle-même : elle existait pour corriger un
   dérapage de détection, et il n'y a plus de détection à corriger. Quinze
   reprises sur vingt-cinq écoutes, c'est une seconde et un appel repris sur
   soixante pour cent des tours.

   ── LES DEUX GARDES, ET ELLES SE MESURENT ───────────────────────────────

     1. ON N'IMPOSE QUE SI ON SAIT. Sans langue de fil — la toute première
        phrase d'une conversation — on laisse deviner comme avant. C'est
        aussi ce qui garde le compteur `langues_entendues` honnête.
        ⚠ CETTE GARDE N'EN ÉTAIT PAS UNE : `langueDuFil` est un useRef
        initialisé à "wo". Il n'est JAMAIS vide. Douze écoutes sur douze ont
        donc été imposées, wolof compris quand il parlait français.
     2. SI LE TEXTE REVIENT VIDE, on relaisse deviner. Un vide ne coûte qu'un
        appel, et c'est exactement le cas où il fallait douter.
        ⚠ FILET POSÉ SOUS LE MAUVAIS TROU : imposer une langue ne rend pas du
        silence, ça rend des mots — les mauvais. `imposees_sans_texte` est
        resté à 0 pendant que rien ne marchait.

   `imposees_sans_texte` dans /api/etat dit si cette manœuvre abîme quelque
   chose. Si ce nombre monte, on revient en arrière — et il le dira avant que
   Lamine ne le sente.

   ── ET CE QUE ÇA NE RÉPARE PAS ──────────────────────────────────────────

   Rien de tout ça n'apprend le wolof à cette oreille. On lui épargne une
   erreur qu'elle commet systématiquement ; on ne la rend pas meilleure. Le
   vrai chantier est de changer d'oreille — Soynade, déjà fournisseur de la
   voix, publie un modèle de reconnaissance wolof. Ceci fait gagner une
   seconde en attendant, pas une transcription juste.

   ── ET SI SCRIBE NE CONNAÎT PAS LE WOLOF ────────────────────────────────

   Je ne peux pas le vérifier d'ici : la clé est sur le serveur et je n'y
   touche pas. Le code est donc écrit pour survivre aux deux réponses — si
   « wol » est refusé, on garde le premier résultat plutôt que de rendre le
   silence. Et `repris` remonte jusqu'à /api/etat pour qu'on VOIE, à l'usage,
   si la reprise sert ou si elle échoue. Une correction dont on ne peut pas
   mesurer l'effet n'est pas une correction. */
const ACCEPTEES = new Set(Object.keys(CARTE));

/* ── DE QUOI VOIR SI LA REPRISE SERT ──────────────────────────────────────

   Une correction dont on ne peut pas mesurer l'effet n'est pas une
   correction. Ces trois nombres partent dans /api/etat : combien d'écoutes,
   combien ont dérapé, et vers quelles langues. Si « reprises » reste à zéro,
   c'est que Scribe ne se trompe plus — ou que la reprise ne part pas. Si
   « perdues » monte, c'est que « wol » est refusé et il faudra une autre
   voie. Remis à zéro à chaque redémarrage, comme tous les compteurs. */
const compte = { ecoutes: 0, reprises: 0, perdues: 0, repliModele: 0, repliSansMots: 0, mots: 0, dernierRefus: "", langues: {} as Record<string, number>, imposees: 0, imposeesVides: 0, imposeesRattrapees: 0 };

export function resumeEcoutes() {
  if (!compte.ecoutes) return null;
  return {
    ecoutes: compte.ecoutes,
    reprises: compte.reprises,
    reprises_ratees: compte.perdues,
    /* ── CE COMPTEUR NE DIT QUE CE QU'ON A LAISSÉ DEVINER ────────────────

       Tant que IMPOSER_LA_LANGUE_DES_LE_PREMIER_APPEL vaut `false` — son
       état depuis le 18 septembre 21 h 20 — ce compteur voit TOUTES les
       écoutes, et c'est ce qu'on veut. La règle ci-dessous ne sert que si on
       remet l'imposition un jour : la langue du fil serait alors imposée dès
       le premier appel, le moteur ne devinerait plus, donc il ne pourrait
       plus se
       tromper, donc ce compteur ne mesurerait plus rien s'il comptait aussi
       les écoutes imposées. Il ne compte QUE les écoutes laissées libres —
       la première d'une conversation, quand on ne sait pas encore.

       C'est ce qui permet de continuer à répondre à la seule question qui
       compte : est-ce que cette oreille reconnaît le wolof, oui ou non ? */
    langues_entendues: compte.langues,
    /* ── ET CE QU'ON A IMPOSÉ, SÉPARÉMENT ───────────────────────────────

       `imposees` : combien d'écoutes sont parties avec la langue déjà dite.
       `imposees_sans_texte` : combien sont revenues vides — le seul risque
       de cette manœuvre, imposer une langue à quelqu'un qui en parle une
       autre. `imposees_rattrapees` : combien de ces vides ont été sauvées en
       relaissant deviner. Si `imposees_sans_texte` monte, il faudra revenir
       en arrière, et ce chiffre-là le dira avant que Lamine ne le sente. */
    imposees: compte.imposees,
    imposees_sans_texte: compte.imposeesVides,
    imposees_rattrapees: compte.imposeesRattrapees,
    /* Deux chiffres pour savoir si les mots donnés d'avance servent, sans
       avoir à parler devant un téléphone : combien de mots on envoie, et
       combien de fois le modèle neuf a été refusé. */
    mots_donnes: compte.mots,
    repli_sur_ancien_modele: compte.repliModele,
    /* Le modèle neuf a marché, mais sans les mots : c'est alors les mots
       qu'il refuse, pas le modèle — et ça ne se répare pas au même endroit. */
    repli_sans_les_mots: compte.repliSansMots,
    /* CE QUE LE MOTEUR A RÉPONDU, en clair. Sans cette ligne, on en est
       réduit à deviner pourquoi il refuse — et on a déjà perdu deux soirées
       à ça. */
    dernier_refus: compte.dernierRefus,
  };
}

async function unEssai(
  audio: Blob, nomFichier: string, imposer: string | null,
  modele?: string, mots?: string[],
): Promise<{ texte: string; brute: string }> {
  const c = ecouteConfig.elevenlabs;
  const form = new FormData();
  form.append("file", audio, nomFichier || "parole.webm");
  form.append("model_id", modele || c.model);
  if (imposer) form.append("language_code", imposer);
  /* ── LES MOTS QU'ON LUI DONNE D'AVANCE, ET COMMENT ON LES ENVOIE ──────

     Cent au plus — au-delà, chaque écoute est facturée vingt secondes, et une
     phrase en dure trois. Le surcoût annoncé est de 20 % sur la
     transcription, qui est la plus petite part de la facture : la voix coûte
     vingt fois plus.

     ── SIX JOURS À NE JAMAIS AVOIR SERVI, ET C'ÉTAIT UNE LIGNE ──────────

     Lamine, le 12 septembre au soir : « attaque ça » — les mots corrigés
     devaient être donnés d'avance au moteur d'écoute. Je l'ai fait, j'ai
     écrit l'épreuve, et ça n'a JAMAIS marché une seule fois. Relevé sur son
     serveur le 18 septembre, sur 55 écoutes :

         mots_donnes            100
         repli_sans_les_mots     55      ← toutes, sans exception
         reprises                36
         reprises_ratees         36      ← toutes, sans exception
         dernier_refus   « All keywords must be less than 50 characters »

     Cent pour cent d'échec, et le compteur le disait depuis le début. Je ne
     l'avais pas lu.

     LA CAUSE. J'empaquetais la liste entière en JSON dans UN SEUL champ
     « keyterms » — un champ dont la valeur était `["salaam","dërëm",…]`.
     L'API mesure alors la longueur de ce champ, huit cents signes, et refuse.
     Ce n'est pas le contenu qui était mauvais : vérifié, les cent termes font
     douze signes au plus, aucun doublon, cinq mots au maximum. C'était
     l'emballage, et corriger la liste à la source n'y aurait rien changé.

     C'est un piège connu, et pas seulement de moi : la bibliothèque Python
     officielle d'ElevenLabs a introduit exactement la même faute dans sa
     version 2.59.0, avec exactement ce message d'erreur.

     LA FORME QUI MARCHE : un champ RÉPÉTÉ, une ligne par terme.

         keyterms=salaam
         keyterms=dërëm

     ── ET LE PRIX DE LA RÉPARATION, DIT D'AVANCE ────────────────────────

     Tant que les mots étaient refusés, il ne payait pas le surcoût de 20 %.
     À partir de maintenant, il le paie — sur la transcription, qui fait 18 %
     du temps et une petite part de la facture. En échange, le moteur cesse de
     deviner : il entendait de l'anglais 23 fois contre 18 fois du français,
     sur du wolof. C'est ce que ces cent mots étaient censés corriger depuis
     six jours. */
  if (mots && mots.length) {
    for (const m of mots) form.append("keyterms", m);
    compte.mots = mots.length;
  }

  /* ── LES TROIS INSTANTS DE L'ÉCOUTE ─────────────────────────────────
     Le troisième appel extérieur, et il manquait à la mesure d'hier soir.
     1,9 seconde pour transcrire quelques mots, c'est le PLANCHER du tour :
     même une réponse déjà enregistrée le paie. Voir lib/etapes.ts. */
  const partiEcoute = Date.now();
  const reponse = await fetch("https://api.elevenlabs.io/v1/speech-to-text", {
    method: "POST",
    headers: { "xi-api-key": c.apiKey },
    body: form,
  });
  if (!reponse.ok) {
    throw new Error(`ElevenLabs ${reponse.status} : ${(await reponse.text()).slice(0, 400)}`);
  }
  const premierOctetEcoute = Date.now();
  const data = await reponse.json() as { text?: string; language_code?: string };
  noterEtape("ecoute", partiEcoute, premierOctetEcoute, Date.now(), String(data.text || "").length);
  return {
    texte: (data.text || "").trim(),
    brute: String(data.language_code || "").toLowerCase(),
  };
}


/* ── ET C'ÉTAIT FAUX. REMIS À FALSE UNE HEURE PLUS TARD ────────────────

   Lamine, le 18 septembre à 21 h 20, après avoir essayé : « tout ce que je
   lui demande, elle dit qu'elle ne connaît pas, elle ne comprend pas. »

   Il avait raison, et le compteur le dit sans discussion :

       ecoutes            12
       imposees           12      ← TOUTES, sans une seule exception
       langues_entendues  {}      ← plus rien n'est mesuré
       imposees_sans_texte 0      ← ma garde n'a jamais servi

   Et dans sa bouche à elle, trois fois de suite : « déggutuma li nga wax »,
   « wax yi ñaxasoo ci bruit bi, xamuma », « xamuma "lan ngi bind mën" ».
   Elle citait la transcription qu'on lui avait donnée. C'était du charabia.

   ── LES DEUX FAUTES, ET ELLES SONT DE MOI ────────────────────────────

   1. MA GARDE N'EN ÉTAIT PAS UNE. J'avais écrit « on n'impose que si on
      SAIT », en croyant que la langue du fil serait vide au premier tour.
      Elle ne l'est JAMAIS : `langueDuFil` est un useRef initialisé à "wo"
      — le téléphone dit toujours qu'il sait, et par défaut il dit wolof.
      Donc on imposait le wolof à cent pour cent des écoutes, dès le premier
      mot, y compris quand il parlait français. Douze sur douze.

   2. MON FILET ATTRAPAIT LE MAUVAIS DÉFAUT. Je guettais le texte VIDE.
      Le texte n'était pas vide : il était FAUX. Imposer une langue ne rend
      pas du silence, ça rend des mots — les mauvais. Un filet posé sous le
      mauvais trou ne rattrape rien.

   Et j'avais en plus éteint le seul compteur qui l'aurait montré :
   `langues_entendues` ne compte que les écoutes laissées libres, et il n'y
   en avait plus aucune. J'ai aveuglé l'instrument dans le même commit que
   la faute qu'il aurait vue.

   ── DONC ON REVIENT, ET ON NE GARDE QUE LA LEÇON ─────────────────────

   On laisse à nouveau le moteur deviner, et on reprend quand il dérape :
   le comportement d'avant, qui n'était pas bon — zéro wolof reconnu sur
   quatre-vingts écoutes — mais avec lequel il POUVAIT parler.

   Ce qui restait vrai de mon raisonnement : reprendre coûte une seconde sur
   soixante pour cent des tours. Ce qui était faux : croire qu'on pouvait
   l'économiser en devinant à la place du moteur. La bonne réponse n'est pas
   d'imposer une langue, c'est de changer d'oreille — Soynade.

   CE QU'IL FAUDRAIT AVANT DE RÉESSAYER, si on y revient un jour :
     — n'imposer que sur une langue VRAIMENT ENTENDUE dans ce fil, jamais
       sur la valeur de départ ;
     — et un filet qui juge le TEXTE, pas son absence. */

/** Dire au moteur la langue du fil dès le premier appel, au lieu de le
  laisser deviner. Posé le 18 septembre au soir, RETIRÉ une heure plus tard :
  la langue du fil n'est jamais vide (elle démarre à "wo"), donc ça imposait
  le wolof à toutes les écoutes et rendait du charabia. Voir le bloc
  ci-dessus avant de le remettre à `true`. */
export const IMPOSER_LA_LANGUE_DES_LE_PREMIER_APPEL = false;

/* ── L'OREILLE CHANGE DE MAISON, LE 19 SEPTEMBRE 2026 ──────────────────────

   Mesuré deux fois, sur les dix enregistrements STUDIO de Kha dont on connaît
   le texte mot pour mot — voir /api/essai-oreille :

       Soynade       36 % de mots faux      917 ms
       ElevenLabs    55 puis 67 %           583 ms
       et chez ElevenLabs : ZÉRO wolof reconnu sur vingt écoutes, deux fois.

   Trente et un points d'écart. Soynade est 334 ms plus lent : pour trente et
   un points, c'est donné.

   ── CE QUI REND ÇA POSSIBLE SANS RIEN CONVERTIR ───────────────────────────

   Leur documentation annonce `wav, mp3, flac`. Elle est INCOMPLÈTE : l'essai
   du 19 leur a envoyé le même son dans quatre emballages, et les quatre sont
   passés — webm/opus d'Android compris, mp4/aac d'iPhone compris. C'est
   exactement pour ça qu'on appelle au lieu de lire une page.

   Donc : pas de ffmpeg, pas de conversion, le téléphone n'est pas touché.

   ── CHAQUE MOTEUR LÀ OÙ IL EST MESURÉ LE MEILLEUR ─────────────────────────

   On ne remplace pas une oreille par l'autre : on les répartit.

     — le fil est en FRANÇAIS  → ElevenLabs. C'est là qu'il est le moins
       mauvais, et c'est la seule raison de l'y garder.
       ⚠ J'AVAIS ÉCRIT « il ne s'est jamais trompé sur le français ». C'EST
       FAUX, et ce sont les chiffres du 19 septembre au soir qui le disent :
       sur SIX écoutes d'un fil français, DEUX ont dérapé — indonésien et
       soundanais. Les reprises les ont rattrapées, donc rien n'a cassé ;
       mais l'affirmation était trop forte et je l'ai donnée pour acquise.
       Le jour où Soynade saura le français, la question se repose.
     — le fil est en WOLOF (le défaut, BIA est wolof d'abord) → Soynade. Leur
       modèle EST wolof ; `language=wo` y est un paramètre normal, pas le
       contournement qui a rendu du charabia le 18 au soir sur un moteur qui
       ne connaît pas la langue.

   LA DIFFÉRENCE AVEC LA FAUTE D'HIER, ET ELLE EST ENTIÈRE : hier j'imposais
   le wolof à un moteur incapable de le transcrire. Aujourd'hui je l'envoie à
   un moteur entraîné pour ça. Le geste se ressemble ; ce qu'il produit, non.

   ── ET ON N'EST JAMAIS SOURD ──────────────────────────────────────────────

   Si Soynade refuse, tombe en panne, ou rend un texte VIDE, l'ancienne
   oreille reprend le tour entier — la même échelle qu'avant, intacte. Une
   panne chez eux coûte de la qualité, jamais le silence.

   Et les deux se comptent séparément dans /api/etat : combien d'écoutes
   chacun, combien de replis, en combien de temps. Si le repli monte, ça se
   verra avant que Lamine ne le sente.

   ── L'INTERRUPTEUR ────────────────────────────────────────────────────────

   `false` ici, ou STT_PROVIDER=elevenlabs dans Render, et tout revient comme
   avant sans toucher une autre ligne. C'est la leçon du 18 au soir : un
   changement d'oreille doit se défaire en un geste.

   ── ET CE QUE ÇA A DONNÉ, LE JOUR MÊME ────────────────────────────────────

   Les compteurs, après vingt-et-un tours de vraie conversation :

       écoutes chez Soynade        17
       replis sur ElevenLabs        0
       textes vides                 0
       refus                        0

   Pas une fois le filet n'a servi. Et le temps total n'a pas bougé — 8 865 ms
   contre 8 872 la veille — alors que chaque écoute prend 519 ms de plus :
   le reste s'est resserré et l'absorbe.

   MAIS AUCUN DE CES CHIFFRES NE DIT SI ELLE COMPREND MIEUX. Ça, seule son
   oreille à lui pouvait le mesurer. Lamine, le 19 septembre au soir :

     « Je remarque qu'elle me comprend mieux et qu'elle s'exprime mieux en
       wolof maintenant. »

   LES DEUX MOITIÉS DE CETTE PHRASE TIENNENT ENSEMBLE, et c'est la leçon à
   garder : le modèle ne recevait que du charabia, donc il devait deviner la
   question AVANT d'y répondre — et il répondait dans une langue reconstruite
   sur une ruine. Il reçoit maintenant du wolof propre. Réparer l'oreille a
   amélioré la bouche, sans qu'on touche à un seul mot de sa consigne. */
export const OREILLE_DE_SOYNADE = (process.env.STT_PROVIDER || "soynade") !== "elevenlabs";

const compteSoynade = { appels: 0, replis: 0, vides: 0, ms: 0, dernierRefus: "" };

export function resumeOreilleSoynade() {
  if (!compteSoynade.appels) return null;
  return {
    ecoutes: compteSoynade.appels,
    /* Les deux chiffres qui disent s'il faut revenir en arrière. */
    replis_sur_elevenlabs: compteSoynade.replis,
    dont_texte_vide: compteSoynade.vides,
    ms_moyen: Math.round(compteSoynade.ms / compteSoynade.appels),
    dernier_refus: compteSoynade.dernierRefus,
  };
}

/** Un appel à l'oreille de Soynade. Le webm du téléphone part TEL QUEL :
    mesuré accepté le 19 septembre, contrairement à leur documentation. */
async function chezSoynade(audio: Blob, nomFichier: string, langue: "wo" | "fr"): Promise<Ecoute | null> {
  const s = voixConfig.soynade;
  if (!s.apiKey) return null;
  const form = new FormData();
  form.append("file", audio, nomFichier || "parole.webm");
  form.append("language", langue);
  form.append("response_format", "json");
  form.append("temperature", "0.1");
  const parti = Date.now();
  compteSoynade.appels++;
  /* La transcription n'avait jamais figuré sur la facture, alors qu'elle
     prend 22 % de l'attente. Voir lib/depense.ts : on compte les octets, le
     prix viendra de Soynade. */
  noterOreille(audio.size, "soynade");
  try {
    const r = await fetch(`${s.baseUrl.replace(/\/$/, "")}/v1/audio/transcriptions`, {
      method: "POST",
      headers: { Authorization: `Bearer ${s.apiKey}` },
      body: form,
    });
    compteSoynade.ms += Date.now() - parti;
    if (!r.ok) {
      compteSoynade.dernierRefus = `${r.status} : ${(await r.text().catch(() => "")).slice(0, 160)}`;
      compteSoynade.replis++;
      return null;
    }
    const d = await r.json().catch(() => null) as
      { text?: string; transcription?: string; transcript?: string } | null;
    const texte = String(d?.text ?? d?.transcription ?? d?.transcript ?? "").trim();
    if (!texte) {
      /* VIDE N'EST PAS FAUX, ET LES DEUX SE COMPTENT À PART. Un vide se
         rattrape chez l'autre ; un texte faux, non — c'est la leçon du filet
         posé sous le mauvais trou, le 18 au soir. */
      compteSoynade.vides++;
      compteSoynade.replis++;
      return null;
    }
    if (!ecritureTranscriptionCompatible(texte)) {
      compteSoynade.dernierRefus = "ecriture_inattendue";
      compteSoynade.replis++;
      return null;
    }
    noterEtape("ecoute", parti, Date.now(), Date.now(), texte.length);
    return { texte, langue, moteur: "soynade-oolel", entendue: langue };
  } catch (err) {
    compteSoynade.ms += Date.now() - parti;
    compteSoynade.dernierRefus = (err as Error).message.slice(0, 160);
    compteSoynade.replis++;
    return null;
  }
}

export async function transcrire(
  audio: Blob, nomFichier: string, indice?: string | null, mots?: string[],
): Promise<Ecoute> {
  const localeDemandee = process.env.STT_PROVIDER === "local_wolof"
    && (indice !== "fr" || process.env.WOLOF_LOCAL_ALL_LANGUAGES === "true");
  if (localeDemandee) {
    const parti = Date.now();
    const locale = await chezOreilleLocale(audio);
    if (locale) {
      noterEtape("ecoute", parti, Date.now(), Date.now(), locale.texte.length);
      return locale;
    }
    if (process.env.KHALAM_LOCAL_STRICT === "true") throw new Error("KHALAM Oreille indisponible pour cet essai ; aucun repli externe.");
  }
  const c = ecouteConfig.elevenlabs;
  if (!c.apiKey) throw new Error("ELEVENLABS_API_KEY manquante");

  /* Le fil en français reste chez ElevenLabs : c'est le seul terrain où il
     n'a jamais échoué. Tout le reste — et le défaut est le wolof — part chez
     Soynade, qui gagne de trente et un points dessus. */
  // Après un échec local, le secours doit pouvoir reconnaître français ET wolof.
  if (!localeDemandee && OREILLE_DE_SOYNADE && indice !== "fr") {
    const chezEux = await chezSoynade(audio, nomFichier, "wo");
    if (chezEux) return chezEux;
    /* Refus, panne ou texte vide : l'ancienne oreille reprend le tour entier,
       échelle intacte. On perd de la qualité, jamais le son. */
  }

  /* ── ON N'EST JAMAIS SOURD PARCE QU'UN MODÈLE EST FERMÉ ────────────────

     `scribe_v2` et les `keyterms` peuvent être refusés : modèle non ouvert
     sur le compte, paramètre inconnu, offre qui ne le porte pas. Un refus ne
     doit pas coûter l'écoute — on refait l'essai avec le modèle d'hier, sans
     les mots, et on le NOTE pour que ça se voie au lieu de se deviner. */
  /* ── ON DESCEND UNE MARCHE À LA FOIS, ET ON DIT LAQUELLE ───────────────

     Le 15 septembre 2026, le compteur posé trois jours plus tôt a rendu un
     chiffre sans appel : `repli_sur_ancien_modele: 19` sur 19 écoutes. Le
     modèle neuf était refusé À CHAQUE FOIS, et BIA retombait en silence sur
     l'ancien — donc les cent mots corrigés de Lamine, préparés à chaque
     écoute, n'ont JAMAIS servi. Et le wolof continuait d'être entendu comme
     du français, du turc ou de l'estonien.

     ── POURQUOI ON NE TOMBE PLUS DE DEUX MARCHES D'UN COUP ────────────────

     L'ancien code abandonnait le modèle ET les mots ensemble. On ne pouvait
     donc pas savoir lequel des deux était refusé — or ce n'est pas la même
     panne, et ça ne se répare pas au même endroit. On descend maintenant une
     marche à la fois :

       1. le modèle neuf AVEC ses mots  — ce qu'on veut
       2. le modèle neuf SANS ses mots  — si ce sont les mots qui gênent
       3. l'ancien modèle               — pour ne jamais être sourd

     Si la marche 2 passe, on a gagné le meilleur modèle tout de suite, et on
     sait que le problème vient des mots.

     ── ET ON GARDE LE MOTIF, AU LIEU DE LE PERDRE DANS UN JOURNAL ─────────

     L'ancien code écrivait la raison du refus dans un console.error que
     personne ne lit. C'est exactement l'aveuglement qui nous a déjà coûté
     deux soirées. Le motif remonte maintenant dans /api/etat. */
  /* ── ON N'ATTEND PLUS QU'IL SE TROMPE POUR LUI DIRE LA LANGUE ──────────

     Lamine, le 18 septembre 2026 au soir, après sa session : « elle est trop
     nulle en wolof. »

     Le compteur lui donne raison, et durement. Sur ses 25 écoutes de la
     session, voici ce que le moteur a cru entendre :

         fra 10 · eng 3 · fin 2 · ita 2 · nld 2
         cat 1 · hun 1 · ilo 1 · por 1 · sh 1 · war 1
         WOLOF : 0

     Du hongrois, de l'ilocano, du waray — jamais la langue qu'il parle. Et
     ce n'était pas un mauvais jour : la veille, sur 55 écoutes, zéro aussi.

     ── POURQUOI LES CENT MOTS N'Y CHANGENT RIEN ─────────────────────────

     Ils étaient refusés jusqu'à ce matin, et ils passent maintenant — mais
     ils corrigent L'ORTHOGRAPHE des mots, pas la RECONNAISSANCE de la
     langue. Le moteur entend du wolof et décide que c'est du finnois ; on
     lui a juste appris à mieux écrire le finnois.

     ── CE QU'ON FAISAIT, ET CE QUE ÇA COÛTAIT ───────────────────────────

     On le laissait deviner, il se trompait, et ALORS on reprenait en
     imposant la langue. Quinze reprises sur vingt-cinq écoutes : un
     aller-retour de plus sur soixante pour cent des tours, et une seconde
     perdue à chaque fois, pour un texte faux entre-temps.

     Laisser deviner un moteur qui se trompe DANS CENT POUR CENT DES CAS
     n'est pas de la prudence, c'est du gaspillage. On lui dit donc la langue
     TOUT DE SUITE — celle du fil, que le téléphone connaît et envoie déjà.

     ── LE SEUL RISQUE, ET SA GARDE ──────────────────────────────────────

     Imposer une langue à quelqu'un qui en parle une autre rend un texte
     mauvais, voire vide. D'où deux précautions :

       1. ON N'IMPOSE QUE SI ON SAIT. Sans langue de fil — la toute première
          phrase d'une conversation — on laisse deviner comme avant.
       2. SI LE TEXTE REVIENT VIDE, on relaisse deviner. Un vide ne coûte
          qu'un appel de plus, et c'est exactement le cas où il faut douter.

     Et les deux se mesurent : `imposees_sans_texte` et
     `imposees_rattrapees` dans /api/etat. Si le premier monte, on revient
     en arrière — et ce chiffre le dira avant que Lamine ne le sente. */
  const imposeeDesLePremier = IMPOSER_LA_LANGUE_DES_LE_PREMIER_APPEL && indice
    ? (indice === "fr" ? "fra" : "wol")
    : null;
  if (imposeeDesLePremier) compte.imposees++;

  let premier: { texte: string; brute: string };
  const estUnRefus = (motif: string) => /\b(400|404|422)\b/.test(motif);
  try {
    premier = await unEssai(audio, nomFichier, imposeeDesLePremier, c.model, mots);
  } catch (err) {
    const motif = (err as Error).message;
    if (!estUnRefus(motif) || c.model === c.modeleDeRepli) throw err;
    compte.dernierRefus = motif.slice(0, 160);
    /* Marche 2 : le même modèle, sans les mots. */
    let sansLesMots: { texte: string; brute: string } | null = null;
    if (mots && mots.length) {
      try {
        sansLesMots = await unEssai(audio, nomFichier, imposeeDesLePremier, c.model);
        compte.repliSansMots++;
        console.error(`BIA — « ${c.model} » refuse les mots donnés d'avance (${compte.dernierRefus}) ; il écoute quand même.`);
      } catch (err2) {
        if (!estUnRefus((err2 as Error).message)) throw err2;
        compte.dernierRefus = (err2 as Error).message.slice(0, 160);
      }
    }
    if (sansLesMots) {
      premier = sansLesMots;
    } else {
      /* Marche 3 : l'ancien modèle. On n'est jamais sourd. */
      console.error(`BIA — « ${c.model} » refusé (${compte.dernierRefus}) : on écoute avec « ${c.modeleDeRepli} ».`);
      compte.repliModele++;
      premier = await unEssai(audio, nomFichier, imposeeDesLePremier, c.modeleDeRepli);
    }
  }
  compte.ecoutes++;
  /* On ne note la langue que quand on l'a laissée DEVINER : une langue
     imposée et retrouvée ne prouve rien, et polluerait le seul compteur qui
     répond à « cette oreille reconnaît-elle le wolof ? ». */
  if (!imposeeDesLePremier && premier.brute) {
    compte.langues[premier.brute] = (compte.langues[premier.brute] || 0) + 1;
  }

  /* ── LA GARDE DU TEXTE VIDE ────────────────────────────────────────────

     Le seul vrai risque d'imposer : il parlait une autre langue, et le
     moteur rend du vide ou du charabia. Le vide, on le rattrape — on
     relaisse deviner, ça ne coûte qu'un appel, et c'est précisément le cas
     où il fallait douter. */
  if (imposeeDesLePremier && !premier.texte) {
    compte.imposeesVides++;
    try {
      const libre = await unEssai(audio, nomFichier, null, c.model, mots);
      if (libre.texte) {
        compte.imposeesRattrapees++;
        if (libre.brute) compte.langues[libre.brute] = (compte.langues[libre.brute] || 0) + 1;
        premier = libre;
      }
    } catch { /* on garde le vide : mieux vaut muet que faux */ }
  }

  /* ── LANGUE IMPOSÉE ET TEXTE OBTENU : IL N'Y A RIEN À RATTRAPER ────────

     On sait quelle langue on a demandée, donc on la rend telle quelle sans
     passer par ce que le moteur en dit. Et surtout on NE REPREND PAS : la
     reprise existait pour corriger un dérapage de détection, et il n'y a
     plus de détection à corriger. C'est là qu'est la seconde gagnée. */
  if (imposeeDesLePremier && premier.texte && ecritureTranscriptionCompatible(premier.texte)) {
    return {
      texte: premier.texte,
      langue: CARTE[imposeeDesLePremier] || (indice === "fr" ? "fr" : "wo"),
      moteur: "elevenlabs-scribe",
      entendue: imposeeDesLePremier,
    };
  }

  /* Il a entendu du français ou du wolof : c'est bon, on s'arrête là. Et
     s'il n'a RIEN entendu, reprendre ne servirait à rien — le silence ne
     change pas d'alphabet. */
  if (!premier.texte || (ACCEPTEES.has(premier.brute) && ecritureTranscriptionCompatible(premier.texte))) {
    return {
      texte: premier.texte,
      langue: CARTE[premier.brute] || null,
      moteur: "elevenlabs-scribe",
      entendue: premier.brute,
    };
  }

  /* Il a dérapé. On impose la langue attendue — celle de la conversation, le
     wolof par défaut. */
  const impose = indice === "fr" ? "fra" : "wol";
  compte.reprises++;
  try {
    const second = await unEssai(audio, nomFichier, impose, c.model, mots);
    if (second.texte && ecritureTranscriptionCompatible(second.texte) && (!second.brute || ACCEPTEES.has(second.brute))) {
      return {
        texte: second.texte,
        langue: CARTE[impose] || (indice === "fr" ? "fr" : "wo"),
        moteur: "elevenlabs-scribe",
        entendue: second.brute || impose,
        repris: premier.brute,
      };
    }
  } catch (err) {
    /* « wol » refusé, quota, réseau : on garde ce qu'on a. Mal écrit vaut
       mieux que muet — et le motif est journalisé, donc visible. */
    console.error("BIA — la reprise d'écoute a échoué :", (err as Error).message);
    compte.perdues++;
  }

  // Ne jamais présenter une langue étrangère comme les mots de la personne.
  compte.dernierRefus = "transcription_hors_langues";
  throw new Error("transcription_hors_langues : l’oreille n’a pas reconnu de français ou de wolof fiable");
}
