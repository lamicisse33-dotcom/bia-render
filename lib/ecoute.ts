import { noterEtape } from "./etapes";
/* Parole -> texte, repris de l'Interprète.
   ElevenLabs Scribe accepte directement le webm du navigateur : pas de
   conversion, donc pas de ffmpeg à installer sur Render. Soynade, lui,
   exige un wav 16 kHz — c'est pourquoi il n'est pas proposé ici. */

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

   ── CE QU'ON NE FAIT PAS, ET POURQUOI ───────────────────────────────────

   ON NE FORCE PAS LE WOLOF À TOUS LES COUPS. Ce serait réparer un défaut en
   en créant un autre : BIA parle aussi français, et du français transcrit
   de force en wolof ne ressort pas mieux que du wolof transcrit en arabe.
   Et la devinette de Scribe est JUSTE une bonne partie du temps — sur le
   français, elle ne se trompe jamais.

   ── ALORS ON LA LAISSE DEVINER, ET ON RATTRAPE QUAND ELLE DÉRAPE ─────────

   Premier essai : sans consigne, comme aujourd'hui. Si le moteur rend du
   français ou du wolof, c'est fini — on ne paie rien de plus.

   Mais s'il rend de l'arabe, du bambara, du peul ou du wolof de Gambie, on
   REPREND en imposant la langue attendue : celle de la conversation en
   cours, et le wolof par défaut — BIA est wolof d'abord.

   Ça coûte une seconde transcription, et seulement dans le cas cassé. C'est
   très en dessous du prix de l'autre solution : une phrase illisible fait
   répondre BIA à côté, la personne répète, et on paie DEUX fois de toute
   façon — plus le modèle, plus la voix.

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
const compte = { ecoutes: 0, reprises: 0, perdues: 0, repliModele: 0, repliSansMots: 0, mots: 0, dernierRefus: "", langues: {} as Record<string, number> };

export function resumeEcoutes() {
  if (!compte.ecoutes) return null;
  return {
    ecoutes: compte.ecoutes,
    reprises: compte.reprises,
    reprises_ratees: compte.perdues,
    langues_entendues: compte.langues,
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
  /* LES MOTS QU'ON LUI DONNE D'AVANCE. Cent au plus — au-delà, chaque écoute
     est facturée vingt secondes, et une phrase en dure trois. Le surcoût
     annoncé est de 20 % sur la transcription, qui est la plus petite part de
     la facture : la voix coûte vingt fois plus. */
  if (mots && mots.length) { form.append("keyterms", JSON.stringify(mots)); compte.mots = mots.length; }

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

export async function transcrire(
  audio: Blob, nomFichier: string, indice?: string | null, mots?: string[],
): Promise<Ecoute> {
  const c = ecouteConfig.elevenlabs;
  if (!c.apiKey) throw new Error("ELEVENLABS_API_KEY manquante");

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
  let premier: { texte: string; brute: string };
  const estUnRefus = (motif: string) => /\b(400|404|422)\b/.test(motif);
  try {
    premier = await unEssai(audio, nomFichier, null, c.model, mots);
  } catch (err) {
    const motif = (err as Error).message;
    if (!estUnRefus(motif) || c.model === c.modeleDeRepli) throw err;
    compte.dernierRefus = motif.slice(0, 160);
    /* Marche 2 : le même modèle, sans les mots. */
    let sansLesMots: { texte: string; brute: string } | null = null;
    if (mots && mots.length) {
      try {
        sansLesMots = await unEssai(audio, nomFichier, null, c.model);
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
      premier = await unEssai(audio, nomFichier, null, c.modeleDeRepli);
    }
  }
  compte.ecoutes++;
  if (premier.brute) compte.langues[premier.brute] = (compte.langues[premier.brute] || 0) + 1;

  /* Il a entendu du français ou du wolof : c'est bon, on s'arrête là. Et
     s'il n'a RIEN entendu, reprendre ne servirait à rien — le silence ne
     change pas d'alphabet. */
  if (!premier.texte || ACCEPTEES.has(premier.brute)) {
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
    if (second.texte) {
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

  return {
    texte: premier.texte,
    langue: null,
    moteur: "elevenlabs-scribe",
    entendue: premier.brute,
    repris: `${premier.brute} (reprise impossible)`,
  };
}
