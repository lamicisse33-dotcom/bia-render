import { createHash } from "node:crypto";
import { noterEtape } from "./etapes";
/* Texte -> parole, repris de l'Interprète Français ↔ Wolof.
   Même adresse, mêmes réglages, mêmes noms de variables : une seule clé
   Soynade sert donc les deux applications. */

import { nombreDeLEnvironnement } from "./nombre-env";

const env = process.env;

export const voixConfig = {
  /* Notre moteur d'abord, dès que son adresse est posée ; sinon Soynade si
     sa clé est là ; sinon le téléphone lit lui-même. TTS_PROVIDER force. */
  fournisseur: env.TTS_PROVIDER
    || (env.VOIX_RUNPOD_URL ? "runpod" : env.SOYNADE_API_KEY ? "soynade" : "navigateur"),
  /* ── LA VOIX LOCALE, GRATUITE, POUR LE WOLOF ────────────────────────────

     19 septembre 2026. Un petit serveur à nous (voix-locale/), modèle
     bilalfaye/speecht5_tts-wolof (MIT), empreinte de voix de femme. Lamine,
     après écoute : « c'est merveilleux, c'est parfait ». Zéro par phrase.

     Elle ne sert QUE le wolof : le modèle ne sait pas le français. Elle
     s'active en posant VOIX_LOCALE_URL ; sans l'adresse, rien ne change.
     Si elle ne répond pas (endormie, en panne, trop lente), Soynade reprend
     la phrase — et ça se compte, voir hoquetsDeLaVoixLocale(). */
  /* ── LA VOIX DE KHA, SUR NOTRE PROPRE MOTEUR ────────────────────────────

     24 septembre 2026. Le moteur Chatterbox multilingue affiné sur la voix
     de Kha tourne chez RunPod (serverless, région EU-RO-1, zéro machine au
     repos), modèle tiré du dépôt privé Hugging Face khalam-app/bia-voice-engine.
     Première phrase entendue par Lamine : « très clair, on dirait
     l'enregistrement naturel ».

     Il parle wolof ET français avec la même voix (le wolof passe par
     l'identifiant de langue « fr », décision prise à l'entraînement).
     Réglages validés sur le Mac : exaggeration 0,5, cfg_weight 0,5.

     Il s'active en posant VOIX_RUNPOD_URL (https://api.runpod.ai/v2/<id>)
     et RUNPOD_API_KEY. S'il rate, Soynade reprend la phrase si sa clé est
     là — et le raté se compte, voir hoquetsDeLaVoixRunPod().

     CE QU'IL FAUT SAVOIR SUR L'ATTENTE : une machine qui dort met 60 à 90 s
     à se réveiller (elle recharge la voix), puis chaque phrase prend 2 à 3 s.
     Elle se rendort après 60 s sans demande (idle_timeout dans main.py du
     dossier bia-voice-endpoint). Le premier appel d'une conversation après
     une pause paie donc ce réveil : attenteMs est large exprès. */
  runpod: {
    url: (env.VOIX_RUNPOD_URL || "").replace(/\/$/, ""),
    cle: env.RUNPOD_API_KEY || "",
    langue: env.VOIX_RUNPOD_LANGUE || "fr",
    exaggeration: nombreDeLEnvironnement(env.VOIX_RUNPOD_EXAGGERATION, 0.5, "VOIX_RUNPOD_EXAGGERATION"),
    cfgWeight: nombreDeLEnvironnement(env.VOIX_RUNPOD_CFG_WEIGHT, 0.5, "VOIX_RUNPOD_CFG_WEIGHT"),
    /* température basse = modèle déterministe, ne continue pas après le texte */
    temperature: nombreDeLEnvironnement(env.VOIX_RUNPOD_TEMPERATURE, 0.4, "VOIX_RUNPOD_TEMPERATURE"),
    attenteMs: nombreDeLEnvironnement(env.VOIX_RUNPOD_ATTENTE_MS, 150_000, "VOIX_RUNPOD_ATTENTE_MS"),
  },
  locale: {
    url: (env.VOIX_LOCALE_URL || "").replace(/\/$/, ""),
    cle: env.VOIX_LOCALE_CLE || "",
    voix: env.VOIX_LOCALE_VOIX === "clb" ? "clb" : "slt",
    /* Au-delà, on n'attend plus : Soynade est plus sûr qu'une voix locale qui
       traîne. Sur le Space gratuit, une phrase courte prend 1 à 3 s ; un
       réveil après sommeil dure une minute, et cette minute-là part chez
       Soynade. */
    attenteMs: nombreDeLEnvironnement(env.VOIX_LOCALE_ATTENTE_MS, 8000, "VOIX_LOCALE_ATTENTE_MS"),
  },
  soynade: {
    apiKey: env.SOYNADE_API_KEY || "",
    baseUrl: env.SOYNADE_BASE_URL || "https://api.soynade.ai",
    model: env.SOYNADE_TTS_MODEL || "oolel-voices-v1",
    /* Voix douce et posée, à la demande de Lamine. Ce ne sont PAS les valeurs
       de l'Interprète : là-bas 0,2 / 0,5 conviennent à de la traduction, qui
       doit être nette. BIA, elle, doit accueillir. Exagération basse = moins
       d'emphase ; poids CFG bas = débit plus lent. Réglable par variable
       d'environnement, et la page /reglage sert à les choisir à l'oreille.

       25 septembre 2026 : Lamine, à l'oreille, la trouve « sèche, comme une
       voix d'homme ». La voix elle-même est bien celle d'une femme (clonée
       depuis public/voix-bia.wav, mesurée à ~205 Hz, en plein dans le
       registre féminin) — c'est l'ancienne exagération, 0,10, la deuxième plus plate
       des quatre valeurs comparées sur /reglage, qui aplatissait le ton
       jusqu'à le rendre dur à l'oreille. On monte au préréglage « Douce ».
       Si Render porte encore un SOYNADE_EXAGGERATION à 0,08 ou 0,10, c'est
       LUI qui gagne — il faut l'enlever là-bas pour que cette valeur-ci
       s'applique. */
    exaggeration: nombreDeLEnvironnement(env.SOYNADE_EXAGGERATION, 0.12, "SOYNADE_EXAGGERATION"),
    temperature: nombreDeLEnvironnement(env.SOYNADE_TEMPERATURE, 0.35, "SOYNADE_TEMPERATURE"),
    /* ── LE RÉGLAGE QUI LA FAISAIT DIRE AUTRE CHOSE QUE SON TEXTE ──────────

       Lamine, le 12 septembre 2026 au soir, capture à l'appui : « la voix que
       j'ai entendue n'était pas une voix de robot, c'était bien la voix de
       Kha. Mais ce qu'elle disait ne correspondait pas avec le texte écrit
       dans la discussion. »

       Sa voix, et pas son texte. C'est CE réglage-ci, et il ne fait pas ce
       que son nom laisse croire.

       « cfg_weight » n'est pas un réglage de débit : c'est le POIDS DU GUIDAGE
       (classifier-free guidance). C'est lui qui décide à quel point le modèle
       reste ACCROCHÉ au texte qu'on lui donne. Plus il est bas, plus le
       modèle est libre — et un modèle libre, dans une voix clonée, se met à
       dire des syllabes qui ne sont plus le texte. Dans la voix de Kha, avec
       son intonation, dans une langue qui ne ressemble plus à rien de
       connaissable. Exactement ce qu'il décrit.

       Le débit baisse aussi quand on le baisse — c'est un EFFET DE BORD, et
       c'est pour ça que je l'avais descendu de 0,28 à 0,22 le 10 septembre
       quand il a demandé une voix plus posée. Je réglais la vitesse avec le
       bouton de la fidélité au texte.

       ET ON N'EN A PLUS BESOIN. Depuis le 11 septembre, le ralentissement
       demandé se fait SUR LE TÉLÉPHONE — lib/ralentir.ts, WSOLA, sans toucher
       à la hauteur de sa voix, réglable par le curseur « Débit » du panneau
       « Moi ». La lenteur ne dépend donc plus de ce réglage-ci du tout.

       On le remet à 0,5, la valeur documentée du modèle : elle dit son texte,
       et elle le dit posément parce que c'est le téléphone qui la pose.

       À JUGER À L'OREILLE, et c'est à lui : la page /reglage permet de dire
       la même phrase à 0,22 et à 0,5 pour comparer. Et si Render porte encore
       un SOYNADE_CFG_WEIGHT à 0,22, c'est LUI qui gagne — il faut l'enlever
       là-bas pour que cette valeur-ci s'applique. */
    cfgWeight: nombreDeLEnvironnement(env.SOYNADE_CFG_WEIGHT, 0.5, "SOYNADE_CFG_WEIGHT"),
    /* LA VITESSE — ET CE QU'ON EN SAIT MAINTENANT.

       J'avais ajouté ce champ « au cas où », sans documentation. Le 11
       septembre 2026 je suis allé lire celle du modèle dont Oolel Voices est
       dérivé, et elle est nette : aucun réglage de vitesse n'existe, ni chez
       lui ni chez Chatterbox — le débit ne se règle qu'indirectement, par
       `exaggeration` et `cfg_weight`.

       Le champ reste donc là, mais ÉTEINT (vitesse = 1, donc jamais envoyé),
       et plus rien ne compte dessus : si un jour l'API hébergée en propose un,
       SOYNADE_SPEED et SOYNADE_SPEED_FIELD l'allument sans toucher au code.
       Le ralentissement réel se fait sur le téléphone — lib/ralentir.ts. */
    vitesse: nombreDeLEnvironnement(env.SOYNADE_SPEED, 1, "SOYNADE_SPEED"),
    vitesseField: env.SOYNADE_SPEED_FIELD || "speed",
    /* Le clonage de voix. Oolel-Voices accepte un extrait de référence et
       imite la voix qu'il y entend. L'extrait doit être joignable par une
       adresse publique : le nôtre est servi par BIA elle-même, depuis
       public/voix-bia.wav.

       Le NOM du champ est réglable parce que je n'ai pas la documentation de
       l'API hébergée de Soynade — seulement celle du modèle ouvert, où il
       s'appelle audio_prompt_path. Si l'API le nomme autrement, il suffit de
       changer SOYNADE_AUDIO_PROMPT_FIELD sans toucher au code. */
    audioPrompt: env.SOYNADE_AUDIO_PROMPT || "",
    audioPromptField: env.SOYNADE_AUDIO_PROMPT_FIELD || "audio_prompt_path",
  },
  elevenlabs: {
    apiKey: env.ELEVENLABS_API_KEY || "",
    model: env.ELEVENLABS_TTS_MODEL || "eleven_multilingual_v2",
    voiceFr: env.ELEVENLABS_VOICE_FR || "",
    voiceWo: env.ELEVENLABS_VOICE_WO || "",
  },
};

/* Soynade n'accepte que 500 caractères par lecture, or BIA peut expliquer
   longuement. On découpe donc aux frontières de phrase, jamais au milieu d'un
   mot, et le téléphone enchaîne les morceaux. Le découpage est déterministe :
   le même texte donne toujours les mêmes morceaux, donc le client peut
   demander le morceau n sans que le serveur ait rien à mémoriser. */
/* LE DÉCOUPAGE, ET POURQUOI IL EST EN ESCALIER.

   Mesuré sur le vrai serveur, depuis Dakar : fabriquer la voix coûte environ
   deux secondes fixes plus 36 millisecondes par signe. Et BIA parle à peu
   près quinze signes par seconde.

   Le téléphone joue un morceau pendant que le suivant se fabrique. Pour qu'il
   n'y ait pas de blanc, il faut donc que la LECTURE d'un morceau dure plus
   longtemps que la FABRICATION du suivant :

       N / 15  ≥  2 + 0,036 × M

   Un premier morceau court fait donc démarrer BIA vite — c'est ce qu'on a
   corrigé ce matin — mais il ne laisse que sept secondes pour fabriquer le
   suivant. Si ce suivant fait 480 signes, sa fabrication en demande dix-neuf :
   douze secondes de silence au milieu de sa phrase. C'est exactement le blanc
   que Lamine entend.

   D'où l'escalier : chaque palier est calculé pour tenir dans la lecture du
   précédent. On finit à 480 signes, la limite de Soynade, où le régime est
   largement stable — à ce rythme la lecture dure trente-deux secondes pour
   dix-neuf de fabrication. */
const LIMITE = 480;
const PALIERS = [110, 150, 220, 340];
const tailleDu = (rang: number) => PALIERS[rang] ?? LIMITE;

export function decouper(texte: string): string[] {
  const propre = String(texte || "").replace(/\s+/g, " ").trim();
  if (!propre) return [];
  if (propre.length <= tailleDu(0)) return [propre];

  const phrases = propre.match(/[^.!?…]+[.!?…]*\s*/g) || [propre];
  const morceaux: string[] = [];
  let courant = "";

  const poser = () => {
    if (courant.trim()) morceaux.push(courant.trim());
    courant = "";
  };

  for (const phrase of phrases) {
    const taille = tailleDu(morceaux.length);
    if ((courant + phrase).length <= taille) { courant += phrase; continue; }
    poser();

    /* Une phrase à elle seule plus longue que le palier : on la coupe à un
       espace. Mieux vaut une respiration au mauvais endroit qu'un silence de
       dix secondes au milieu. */
    let reste = phrase;
    for (;;) {
      const t = tailleDu(morceaux.length);
      if (reste.length <= t) break;
      let coupe = reste.lastIndexOf(" ", t);
      if (coupe < t * 0.5) coupe = t;
      morceaux.push(reste.slice(0, coupe).trim());
      reste = reste.slice(coupe);
    }
    courant = reste;
  }
  poser();
  return morceaux.filter(Boolean);
}

export type Reglages = { exaggeration?: number; temperature?: number; cfgWeight?: number; vitesse?: number; audioPrompt?: string | null };
export type Parole = { audio: Buffer; typeMime: string; moteur: string };

const borne = (v: number | undefined, defaut: number) =>
  typeof v === "number" && Number.isFinite(v) ? Math.min(Math.max(v, 0), 2) : defaut;

/* ── QUAND LE CRÉDIT DE SA VOIX EST ÉPUISÉ ──────────────────────────────────

   Lamine, le 15 septembre 2026 : « bien, ne parle plus, il faut vérifier le
   crédit ». Le tableau disait vingt-trois fois la même chose :

     Soynade 402 : « Prepaid credits are exhausted. Add credits to continue
     using the API. »

   UN 402 N'EST PAS UNE PANNE PASSAGÈRE. Un 429 se calme, un 502 se répare
   tout seul — un 402 veut dire « il faut payer », et il dira la même chose à
   la seconde suivante. Or BIA le traitait comme n'importe quel échec : elle
   rappelait Soynade à CHAQUE morceau de CHAQUE phrase, attendait le refus,
   et repartait sur la voix du téléphone. Cent six appels en vingt-trois
   minutes, tous refusés, chacun payé en attente.

   ON S'EN SOUVIENT DONC, et on arrête de frapper à une porte fermée. Pendant
   la pause, la voix du téléphone prend le relais tout de suite, sans le
   détour. La pause est courte exprès : dès qu'il aura rechargé, BIA doit
   retrouver sa vraie voix sans qu'on ait à redéployer quoi que ce soit.

   ET ÇA SE VOIT DANS /api/etat, sur une ligne à soi. Vingt-trois pannes
   identiques noyées dans une liste, ça se cherche ; « crédit de voix épuisé
   depuis 04:27 », ça se lit.                                              */

/** Une minute : assez pour ne pas marteler, assez court pour qu'un
    rechargement soit pris en compte presque tout de suite. */
const PAUSE_SANS_CREDIT = 60_000;
let sansCreditDepuis = 0;
let dernierMotifDeCredit = "";

/** Y a-t-il eu un refus de paiement récemment ? */
/* ── LES HOQUETS RATTRAPÉS, POUR QU'ILS SE VOIENT ──────────────────────────
   Une reprise réussie ne laisse aucune trace ailleurs : sans ce compteur, on
   croirait que tout va bien alors que Soynade tombe une fois sur dix. C'est
   le genre d'aveuglement qui a déjà coûté deux soirées à ce projet. */
let reprisesDeVoix = 0;
let dernierHoquet = "";
function noterRepriseDeVoix(motif: string) {
  reprisesDeVoix++;
  dernierHoquet = motif;
}
export function hoquetsDeLaVoix() {
  return { reprises: reprisesDeVoix, dernier: dernierHoquet };
}

export function voixSansCredit(): { sans_credit: boolean; depuis: string | null; motif: string } {
  const encore = sansCreditDepuis && Date.now() - sansCreditDepuis < PAUSE_SANS_CREDIT;
  return {
    sans_credit: Boolean(encore),
    depuis: sansCreditDepuis ? new Date(sansCreditDepuis).toISOString() : null,
    motif: dernierMotifDeCredit,
  };
}

/* Elle se remet à essayer d'elle-même : pas de bouton, pas de redéploiement.
   Il recharge, et au bout d'une minute au plus, sa voix revient. */
function noterLeRefusDePaiement(statut: number, detail: string) {
  sansCreditDepuis = Date.now();
  dernierMotifDeCredit = `Soynade ${statut} : ${detail.slice(0, 200)}`;
}

/* Le format qu'on demande à Soynade. « mp3 » depuis le 19 septembre 2026 :
   leur courrier du matin — « il suffit de remplacer wav par mp3 dans le
   paramètre output_format ; la réponse contient directement l'audio MP3,
   avec le type audio/mpeg ». C'est l'encodage sur Render (569 ms mesurés)
   qui disparaît. Le répertoire, lui, demande toujours du wav : il fabrique
   son propre mp3 pour le seau, et son chemin n'a pas changé. */
export type FormatDeVoix = "wav" | "mp3";

/* Ce que Soynade a VRAIMENT rendu, lu dans les octets — pas dans ce qu'on a
   demandé, ni dans l'en-tête. Un wav commence par « RIFF » ; un mp3 par une
   étiquette « ID3 » ou par un octet de synchronisation 0xFF 0xEx. Tout le
   reste est inconnu et sera traité comme du wav (l'encodeur dira non). */
export function typeMimeDesOctets(o: Buffer): "audio/wav" | "audio/mpeg" | "" {
  if (o.length < 4) return "";
  if (o[0] === 0x52 && o[1] === 0x49 && o[2] === 0x46 && o[3] === 0x46) return "audio/wav";
  if (o[0] === 0x49 && o[1] === 0x44 && o[2] === 0x33) return "audio/mpeg";
  if (o[0] === 0xff && (o[1] & 0xe0) === 0xe0) return "audio/mpeg";
  return "";
}

async function viaSoynade(texte: string, langue: "wo" | "fr", r?: Reglages, etiquette = "voix",
                          format: FormatDeVoix = "wav"): Promise<Parole> {
  const c = voixConfig.soynade;
  if (!c.apiKey) throw new Error("SOYNADE_API_KEY manquante");

  // Une chaîne vide passée explicitement veut dire « sans clonage », pour
  // pouvoir comparer les deux dans la page de réglage.
  const prompt = r?.audioPrompt === "" ? "" : (r?.audioPrompt || c.audioPrompt);

  const vitesse = typeof r?.vitesse === "number" && Number.isFinite(r.vitesse)
    ? Math.min(Math.max(r.vitesse, 0.5), 1.5)
    : c.vitesse;

  const corps = (avecVitesse: boolean, formatDemande: FormatDeVoix) => JSON.stringify({
    text: texte,
    language: langue === "fr" ? "fr" : "wo",
    output_format: formatDemande,
    model: c.model,
    exaggeration: borne(r?.exaggeration, c.exaggeration),
    temperature: borne(r?.temperature, c.temperature),
    cfg_weight: borne(r?.cfgWeight, c.cfgWeight),
    seed: 0,
    ...(avecVitesse && vitesse !== 1 ? { [c.vitesseField]: vitesse } : {}),
    ...(prompt ? { [c.audioPromptField]: prompt } : {}),
  });

  const appeler = (avecVitesse: boolean, formatDemande: FormatDeVoix = format) => fetch(`${c.baseUrl.replace(/\/$/, "")}/v1/text-to-speech`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${c.apiKey}`,
      "content-type": "application/json",
      accept: formatDemande === "mp3" ? "audio/mpeg" : "audio/wav",
    },
    body: corps(avecVitesse, formatDemande),
  });

  /* ── LES TROIS INSTANTS DE LA VOIX ───────────────────────────────────
     Sa demande du 15 septembre 2026 : « requête TTS envoyée / premier octet
     audio reçu / audio complet reçu. C'est essentiel. » Il a raison : quatre
     secondes avant le premier octet et quatre secondes à couler après ne se
     réparent pas de la même façon. Voir lib/etapes.ts. */
  /* On ne frappe pas à une porte qu'on sait fermée. Le message est explicite
     pour qu'il se lise dans /api/etat sans avoir à le décoder. */
  if (voixSansCredit().sans_credit) {
    throw new Error(`le crédit de sa voix est épuisé — ${dernierMotifDeCredit}`);
  }

  /* ── UN HOQUET DE SOYNADE NE DOIT PAS LUI COÛTER LA VOIX DE KHA ────────

     Lamine, le 15 septembre 2026 : « pendant les leçons, parfois la voix
     saute. Elle amène la voix de la machine. »

     Le tableau a donné les deux causes, et ce sont deux accidents de réseau :

       « Soynade 502 : <!DOCTYPE html>… »   — une page d'erreur Cloudflare
       « terminated »                        — la connexion coupée en route

     Aucune des deux n'était rattrapée. Un seul hoquet et la phrase entière
     partait dans la voix synthétique du téléphone.

     ── POURQUOI C'EST PIRE PENDANT UNE LEÇON QU'AILLEURS ──────────────────

     Il apprend à BIA à prononcer. Une voix française synthétique qui lit du
     wolof transcrit à l'oreille — « djarignou » pour « jariñu » — ne
     ressemble à rien de connaissable, et surtout pas à ce qu'il essaie de lui
     enseigner. Ce n'est pas un repli dégradé : c'est un contresens.

     ── CE QU'ON REPREND, ET CE QU'ON NE REPREND PAS ───────────────────────

     On reprend ce qui est PASSAGER : 5xx, 429, et les coupures de réseau.
     On ne reprend PAS ce qui dira la même chose dans dix secondes — 402, 401,
     403 : c'est le crédit ou la clé, et insister ne ferait qu'ajouter de
     l'attente au silence.

     Deux reprises au plus, et courtes : au-delà, on aurait échangé une voix
     synthétique contre une éternité d'attente, ce qui n'est pas mieux. */
  const REPRISES = 2;
  const PAUSE_ENTRE_REPRISES = 250;
  const passager = (statut: number) => statut === 429 || statut >= 500;

  const partiVoix = Date.now();
  let reponse: Response;
  let dernierEnnui = "";
  let essai = 0;
  for (;;) {
    try {
      reponse = await appeler(true);
      if (reponse.ok || !passager(reponse.status) || essai >= REPRISES) break;
      dernierEnnui = `Soynade ${reponse.status}`;
    } catch (err) {
      /* « terminated », « fetch failed », un délai dépassé : le réseau, pas
         Soynade. C'est exactement ce qui s'est passé à 18 h 05. */
      dernierEnnui = String((err as Error).message || err).slice(0, 80);
      if (essai >= REPRISES) throw err;
    }
    essai++;
    console.error(`BIA — sa voix a hoqueté (${dernierEnnui}) : reprise ${essai}/${REPRISES}.`);
    noterRepriseDeVoix(dernierEnnui);
    await new Promise((r) => setTimeout(r, PAUSE_ENTRE_REPRISES * essai));
  }
  /* fetch() rend la main quand les en-têtes sont là — donc au premier octet
     du corps. C'est exactement ce qu'il veut savoir. */
  const premierOctetVoix = Date.now();
  /* Le champ de vitesse n'est peut-être pas celui-là, ou n'existe peut-être
     pas. Un refus 400 ou 422 ne doit pas rendre BIA muette : on refait
     l'appel sans, et on le note pour qu'on le voie dans les journaux. */
  if (!reponse.ok && vitesse !== 1 && (reponse.status === 400 || reponse.status === 422)) {
    console.error(`BIA — Soynade refuse le champ « ${c.vitesseField} » : on lit sans régler la vitesse.`);
    reponse = await appeler(false);
  }
  /* Le mp3 est neuf chez eux (19 septembre). S'ils le refusent un jour —
     400 ou 422 — on redemande du wav : l'encodeur de Render reprend, comme
     avant, et ça se lira sur `encodage_ms_moyen`. */
  if (!reponse.ok && format === "mp3" && (reponse.status === 400 || reponse.status === 422)) {
    console.error("BIA — Soynade refuse output_format mp3 : on redemande du wav.");
    noterRepriseDeVoix("mp3 refusé");
    reponse = await appeler(vitesse !== 1, "wav");
  }

  if (!reponse.ok) {
    const detail = (await reponse.text().catch(() => "")).slice(0, 400);
    /* 402 : il faut payer. 401 et 403 : la clé. Les trois diront la même
       chose dans dix secondes — on cesse d'appeler et la voix du téléphone
       prend le relais sans attendre le refus à chaque morceau. */
    if (reponse.status === 402 || reponse.status === 401 || reponse.status === 403) {
      noterLeRefusDePaiement(reponse.status, detail);
      throw new Error(`le crédit de sa voix est épuisé — Soynade ${reponse.status} : ${detail}`);
    }
    throw new Error(`Soynade ${reponse.status} : ${detail}`);
  }
  /* Elle a répondu : s'il y avait une pause, elle n'a plus lieu d'être. */
  if (sansCreditDepuis) { sansCreditDepuis = 0; dernierMotifDeCredit = ""; }
  const octets = Buffer.from(await reponse.arrayBuffer());
  noterEtape(etiquette, partiVoix, premierOctetVoix, Date.now(), texte.length);
  return {
    audio: octets,
    /* Ce qu'ils ont rendu, pas ce qu'on a demandé. */
    typeMime: typeMimeDesOctets(octets) || "audio/wav",
    moteur: prompt ? "soynade-oolel-voices (voix clonée)" : "soynade-oolel-voices",
  };
}

/** Corrige la prononciation des phonèmes Wolof avant envoi à ElevenLabs.
 *  "x" wolof = fricative vélaire (son du fond de la gorge), pas "ks" français.
 *  On le remplace par "kh" que le modèle multilingual prononce correctement. */
function normaliserWolof(texte: string): string {
  return texte
    .replace(/x/g, "kh")   // fricative vélaire : waax → waakh, xam → kham
    .replace(/ñ/g, "ny")   // nasale palatale  : ñaan → nyaan
    .replace(/ŋ/g, "ng");  // nasale vélaire   : rare en wolof standard
}

async function viaElevenLabs(texte: string, langue: "wo" | "fr"): Promise<Parole> {
  const c = voixConfig.elevenlabs;
  if (!c.apiKey) throw new Error("ELEVENLABS_API_KEY manquante");
  const voix = langue === "wo" ? c.voiceWo || c.voiceFr : c.voiceFr;
  if (!voix) throw new Error("Aucun identifiant de voix configuré");

  /* Normalisation phonétique Wolof uniquement */
  const texteEnvoye = langue === "wo" ? normaliserWolof(texte) : texte;

  const reponse = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${voix}`, {
    method: "POST",
    headers: { "xi-api-key": c.apiKey, "content-type": "application/json", accept: "audio/mpeg" },
    body: JSON.stringify({ text: texteEnvoye, model_id: c.model, voice_settings: { stability: 0.4, similarity_boost: 0.7 } }),
  });
  if (!reponse.ok) throw new Error(`ElevenLabs ${reponse.status} : ${(await reponse.text()).slice(0, 400)}`);
  return { audio: Buffer.from(await reponse.arrayBuffer()), typeMime: "audio/mpeg", moteur: "elevenlabs" };
}

/* ── DEUX APPELS DE VOIX QUI N'ONT RIEN A VOIR ─────────────────────────────

   Les dix tours du 15 septembre au soir ont rendu un chiffre impossible : la
   voix mesuree a 4,6 s de moyenne, alors que l'essai dit qu'une premiere
   phrase de trente-trois signes coute 1,9 s.

   LES DEUX NE PARLENT PAS DE LA MEME CHOSE. Sur cinq tours, il y a eu SEIZE
   appels a la voix : la PREMIERE PHRASE, celle qu'on attend pour ouvrir la
   bouche — et TOUT LE RESTE de la reponse, fabrique pendant qu'elle parle et
   que personne n'attend. Mediane sur les seize : un chiffre qui ne decrit ni
   l'un ni l'autre, et qui laisse croire que le decoupage n'a rien donne.

   L'etiquette les separe. Seule la premiere phrase est une attente ; le reste
   est du travail de fond, et il peut durer sans que ca se sente. */
/* ── CE QUE LA VOIX LOCALE A FAIT, ET CE QU'ELLE A RATÉ ─────────────────────
   RÈGLE : un réglage qu'on ne compte pas est un réglage qu'on croit. */
const voixLocale = { servies: 0, ratees: 0, dernier_rate: "", fabrication_ms: 0 };
export function hoquetsDeLaVoixLocale() {
  return {
    branchee: Boolean(voixConfig.locale.url),
    voix: voixConfig.locale.voix,
    servies: voixLocale.servies,
    ratees: voixLocale.ratees,
    dernier_rate: voixLocale.dernier_rate,
    fabrication_ms_moyen: voixLocale.servies ? Math.round(voixLocale.fabrication_ms / voixLocale.servies) : null,
  };
}

/** Un appel à la voix locale. Rend null quand elle ne peut pas — c'est
    alors à Soynade de prendre la phrase, et le raté est compté.
    26 septembre 2026 : sert aussi le français, avec voice="fr" — le serveur
    bascule alors sur Piper (voir voix-locale/moteur.py) au lieu du wolof. */
async function viaLocale(texte: string, langue: "wo" | "fr", etiquette: string): Promise<Parole | null> {
  const c = voixConfig.locale;
  const voix = langue === "fr" ? "fr" : c.voix;
  const partiVoix = Date.now();
  const arret = new AbortController();
  const minuterie = setTimeout(() => arret.abort(), c.attenteMs);
  try {
    const reponse = await fetch(`${c.url}/speak`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        accept: "audio/wav",
        ...(c.cle ? { Authorization: `Bearer ${c.cle}` } : {}),
      },
      body: JSON.stringify({ text: texte, voice: voix }),
      signal: arret.signal,
    });
    const premierOctetVoix = Date.now();
    if (!reponse.ok) {
      const detail = (await reponse.text().catch(() => "")).slice(0, 120);
      throw new Error(`voix locale ${reponse.status} : ${detail}`);
    }
    const octets = Buffer.from(await reponse.arrayBuffer());
    if (typeMimeDesOctets(octets) !== "audio/wav") throw new Error("la voix locale n'a pas rendu un wav");
    noterEtape(etiquette, partiVoix, premierOctetVoix, Date.now(), texte.length);
    voixLocale.servies += 1;
    voixLocale.fabrication_ms += Number(reponse.headers.get("x-fabrication-ms")) || 0;
    return { audio: octets, typeMime: "audio/wav", moteur: langue === "fr" ? "francais-local" : `wolof-local (${c.voix})` };
  } catch (err) {
    voixLocale.ratees += 1;
    voixLocale.dernier_rate = String((err as Error).name === "AbortError"
      ? `pas de réponse en ${c.attenteMs} ms`
      : (err as Error).message || err).slice(0, 120);
    console.error(`BIA — la voix locale a raté (${voixLocale.dernier_rate}) : Soynade reprend.`);
    return null;
  } finally {
    clearTimeout(minuterie);
  }
}

/* ── NOTRE MOTEUR : LES CHIFFRES QUI DISENT S'IL TIENT ─────────────────────
   Les mêmes que pour la voix locale, plus le RÉVEIL : c'est lui que Lamine
   entend comme une lenteur, et c'est lui qu'il faudra régler (machine gardée
   chaude, ou pas) quand BIA aura des utilisateurs. */
const voixRunPod = { servies: 0, ratees: 0, dernier_rate: "", fabrication_ms: 0, reveils: 0, dernier_reveil_ms: 0, reveils_demandes: 0, dernier_reveil_statut: "" };
export function hoquetsDeLaVoixRunPod() {
  return {
    branchee: Boolean(voixConfig.runpod.url && voixConfig.runpod.cle),
    servies: voixRunPod.servies,
    ratees: voixRunPod.ratees,
    dernier_rate: voixRunPod.dernier_rate,
    fabrication_ms_moyen: voixRunPod.servies ? Math.round(voixRunPod.fabrication_ms / voixRunPod.servies) : null,
    reveils: voixRunPod.reveils,
    dernier_reveil_ms: voixRunPod.dernier_reveil_ms,
    reveils_demandes: voixRunPod.reveils_demandes,
    dernier_reveil_statut: voixRunPod.dernier_reveil_statut,
  };
}

type ReponseRunPod = {
  id?: string; status?: string; error?: string;
  delayTime?: number; executionTime?: number;
  output?: { audio_base64?: string; sample_rate?: number; error?: string };
};

/** Une phrase dite par notre moteur. Rend null quand il ne peut pas — la
    suite (Soynade ou le téléphone) est alors inchangée, et le raté est compté.

    /runsync rend la main au bout d'une minute et demie environ même si la
    machine se réveille encore : on interroge alors /status/<id> jusqu'à la
    fin, dans la limite d'attenteMs. */
/* ── RÉVEILLER LA MACHINE AVANT D'AVOIR BESOIN D'ELLE ───────────────────────

   Lamine, le 25 septembre 2026 : « il faut qu'on ait une vitesse aussi
   rapide que Soynade en wolof ». Mesuré ce jour-là sur le Mac, phrase par
   phrase, avec test-voix.sh : la machine CHAUDE répond en 2,3 à 2,7 s —
   déjà dans la même fourchette que Soynade (3,9 s en moyenne, mesuré le
   15 septembre). Le seul écart vient du RÉVEIL : ~24 s de file d'attente
   + ~69 s de chargement des deux modèles, la première fois. Rien à
   optimiser dans la génération elle-même : tout est dans le réveil.

   Donc plutôt que de changer la fabrication du son, on la réveille PLUS
   TÔT — dès que le micro s'ouvre, avant même que la personne ait fini de
   parler, pendant qu'on ne lui doit encore rien. `/run` (et non
   `/runsync`) rend la main tout de suite : on n'attend jamais sa réponse,
   on se contente de l'avoir lancée. Un appel de plus sur une machine déjà
   chaude ne coûte presque rien (elle exécute une phrase vide, vite
   ignorée) ; sur une machine froide, il évite qu'elle commence à se
   réveiller seulement quand le texte de la réponse est prêt. */
/* Le proxy Pod réserve Authorization à sa propre authentification.
   Une clé dérivée permet de joindre notre serveur sans lui transmettre
   la clé de contrôle RunPod. L'API serverless garde son Bearer habituel. */
function estUnPodRunPod(url: string): boolean {
  try { return new URL(url).hostname.endsWith(".proxy.runpod.net"); }
  catch { return false; }
}

function entetesRunPod(): Record<string, string> {
  const c = voixConfig.runpod;
  const pod = estUnPodRunPod(c.url);
  return {
    "content-type": "application/json",
    ...(pod
      ? { "X-Khalam-Key": createHash("sha256").update("khalam-tts-v1:" + c.cle).digest("hex") }
      : { Authorization: `Bearer ${c.cle}` }),
  };
}

export function reveillerNotreMoteur(): void {
  const c = voixConfig.runpod;
  /* Trouvé le 25 septembre 2026, en mesurant en conversation réelle : ce
     réveil tirait un appel RunPod à CHAQUE ouverture de micro, même
     quand Soynade est le fournisseur actif -- synthetiser() ne retombe
     JAMAIS sur RunPod depuis Soynade (voir le switch plus bas), donc ce
     réveil-là ne servait à rien et n'a fait qu'ajouter du travail inutile
     sur nos trois machines. Bilan mesuré ce jour-là : la voix a mis 17 s
     en moyenne au lieu de 2,3-2,7 s -- très probablement notre propre
     réveil qui se disputait les machines avec les vraies phrases. On ne
     réveille donc plus que si RunPod est VRAIMENT le moteur qui va servir. */
  if (voixConfig.fournisseur !== "runpod") return;
  if (!c.url || !c.cle) return;
  voixRunPod.reveils_demandes += 1;
  fetch(`${c.url}/${estUnPodRunPod(c.url) ? "warmup" : "run"}`, {
    method: "POST",
    headers: entetesRunPod(),
    body: JSON.stringify({ input: { text: ".", voix: "wolof", language_id: c.langue } }),
  }).then(async (reponse) => {
    if (!reponse.ok) { voixRunPod.dernier_reveil_statut = `HTTP ${reponse.status}`; return; }
    const etat = await reponse.json() as { status?: string };
    voixRunPod.dernier_reveil_statut = String(etat.status || "ACCEPTE");
  }).catch(() => { voixRunPod.dernier_reveil_statut = "ECHEC_RESEAU"; });
}

export async function viaRunPod(texte: string, langue: "wo" | "fr", r?: Reglages, etiquette = "voix"): Promise<Parole | null> {
  const c = voixConfig.runpod;
  if (!c.url || !c.cle) return null;
  const partiVoix = Date.now();
  const arret = new AbortController();
  const minuterie = setTimeout(() => arret.abort(), c.attenteMs);
  const entetes = entetesRunPod();
  try {
    const reponse = await fetch(`${c.url}/${estUnPodRunPod(c.url) ? "tts" : "runsync"}`, {
      method: "POST",
      headers: entetes,
      body: JSON.stringify({ input: {
        text: texte,
        /* Deux moteurs derrière la même voix (main.py) : le modèle affiné
           pour le wolof, le modèle d'origine (voix de Kha clonée) pour le
           français — l'affinage lui avait abîmé son français. */
        voix: langue === "fr" ? "francais" : "wolof",
        language_id: c.langue,
        exaggeration: borne(r?.exaggeration, c.exaggeration),
        cfg_weight: borne(r?.cfgWeight, c.cfgWeight),
        /* réduit les charabias de fin : le modèle ne prolonge plus après le texte */
        temperature: borne(r?.temperature, c.temperature),
      } }),
      signal: arret.signal,
    });
    if (!reponse.ok) throw new Error(`RunPod ${reponse.status} : ${(await reponse.text().catch(() => "")).slice(0, 120)}`);
    let etat = (await reponse.json()) as ReponseRunPod;
    while (etat.status && etat.status !== "COMPLETED" && etat.status !== "FAILED" && etat.status !== "CANCELLED") {
      if (!etat.id) throw new Error("RunPod : réponse sans identifiant");
      await new Promise((ok) => setTimeout(ok, 1000));
      const suite = await fetch(`${c.url}/status/${etat.id}`, { headers: entetes, signal: arret.signal });
      if (!suite.ok) throw new Error(`RunPod status ${suite.status}`);
      etat = (await suite.json()) as ReponseRunPod;
    }
    if (etat.status !== "COMPLETED") throw new Error(`RunPod ${etat.status || "?"} : ${String(etat.error || "").slice(0, 120)}`);
    const b64 = etat.output?.audio_base64;
    if (!b64) throw new Error(`RunPod : pas d'audio (${String(etat.output?.error || "").slice(0, 120)})`);
    const octets = Buffer.from(b64, "base64");
    if (typeMimeDesOctets(octets) !== "audio/wav") throw new Error("notre moteur n'a pas rendu un wav");
    const fin = Date.now();
    noterEtape(etiquette, partiVoix, fin, fin, texte.length);
    voixRunPod.servies += 1;
    voixRunPod.fabrication_ms += Number(etat.executionTime) || 0;
    /* Un délai de plus de dix secondes avant l'exécution, c'est une machine
       qui se réveillait : on le note à part, c'est ça la vraie lenteur. */
    if ((Number(etat.delayTime) || 0) > 10_000) {
      voixRunPod.reveils += 1;
      voixRunPod.dernier_reveil_ms = Number(etat.delayTime) || 0;
    }
    return { audio: octets, typeMime: "audio/wav", moteur: estUnPodRunPod(c.url)
      ? "khalam-voix (Chatterbox 220, voix de Didi)" : "khalam-voix (RunPod, voix de Kha)" };
  } catch (err) {
    voixRunPod.ratees += 1;
    voixRunPod.dernier_rate = String((err as Error).name === "AbortError"
      ? `pas de réponse en ${c.attenteMs} ms`
      : (err as Error).message || err).slice(0, 160);
    console.error(`BIA — notre moteur vocal a raté (${voixRunPod.dernier_rate}) : la suite reprend.`);
    return null;
  } finally {
    clearTimeout(minuterie);
  }
}

export async function synthetiser(texte: string, langue: "wo" | "fr", r?: Reglages,
                                  etiquette = "voix", format: FormatDeVoix = "wav"): Promise<Parole | null> {
  if (!texte.trim()) return null;
  /* Le wolof ET le français passent d'abord par la voix locale (wolof :
     SpeechT5 ; français : Piper, ajouté le 26 septembre 2026 — voir
     voix-locale/moteur.py), quand elle est branchée et qu'on ne demande pas
     des réglages Soynade exprès (page de réglage, clonage). Elle rend null
     si elle ne peut pas : la suite est inchangée. */
  const reglagesExpres = r && (r.audioPrompt !== undefined || r.exaggeration !== undefined
    || r.temperature !== undefined || r.cfgWeight !== undefined || r.vitesse !== undefined);
  if (voixConfig.locale.url && !reglagesExpres) {
    const locale = await viaLocale(texte, langue, etiquette);
    if (locale) return locale;
  }
  switch (voixConfig.fournisseur) {
    case "runpod": {
      const notre = await viaRunPod(texte, langue, r, etiquette);
      if (notre) return notre;
      /* Il a raté : Soynade reprend si sa clé est là, sinon le téléphone. */
      return voixConfig.soynade.apiKey ? viaSoynade(texte, langue, r, etiquette, format) : null;
    }
    case "soynade": {
      /* SoYNAD principal — ElevenLabs en secours si SoYNAD échoue.
         viaSoynade LÈVE une erreur quand il rate (crédit, panne) : sans ce
         try, le secours n'était jamais atteint. Trouvé le 24 septembre 2026. */
      try {
        const soy = await viaSoynade(texte, langue, r, etiquette, format);
        if (soy) return soy;
      } catch (e) {
        if (!voixConfig.elevenlabs.apiKey) throw e;
        console.error("BIA — Soynade a raté, ElevenLabs prend la phrase :", (e as Error).message);
      }
      return voixConfig.elevenlabs.apiKey ? viaElevenLabs(texte, langue) : null;
    }
    case "elevenlabs":
      /* Wolof → SoYNAD (accent natif), Français → ElevenLabs (rapidité) */
      if (langue === "wo" && voixConfig.soynade.apiKey)
        return viaSoynade(texte, langue, r, etiquette, format);
      return viaElevenLabs(texte, langue);
    default: return null; // le téléphone lit lui-même
  }
}
