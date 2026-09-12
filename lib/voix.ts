/* Texte -> parole, repris de l'Interprète Français ↔ Wolof.
   Même adresse, mêmes réglages, mêmes noms de variables : une seule clé
   Soynade sert donc les deux applications. */

const env = process.env;

export const voixConfig = {
  fournisseur: env.TTS_PROVIDER || (env.SOYNADE_API_KEY ? "soynade" : "navigateur"),
  soynade: {
    apiKey: env.SOYNADE_API_KEY || "",
    baseUrl: env.SOYNADE_BASE_URL || "https://api.soynade.ai",
    model: env.SOYNADE_TTS_MODEL || "oolel-voices-v1",
    /* Voix douce et posée, à la demande de Lamine. Ce ne sont PAS les valeurs
       de l'Interprète : là-bas 0,2 / 0,5 conviennent à de la traduction, qui
       doit être nette. BIA, elle, doit accueillir. Exagération basse = moins
       d'emphase ; poids CFG bas = débit plus lent. Réglable par variable
       d'environnement, et la page /reglage sert à les choisir à l'oreille. */
    exaggeration: Number(env.SOYNADE_EXAGGERATION || 0.10),
    temperature: Number(env.SOYNADE_TEMPERATURE || 0.35),
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
    cfgWeight: Number(env.SOYNADE_CFG_WEIGHT || 0.5),
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
    vitesse: Number(env.SOYNADE_SPEED || 1),
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

async function viaSoynade(texte: string, langue: "wo" | "fr", r?: Reglages): Promise<Parole> {
  const c = voixConfig.soynade;
  if (!c.apiKey) throw new Error("SOYNADE_API_KEY manquante");

  // Une chaîne vide passée explicitement veut dire « sans clonage », pour
  // pouvoir comparer les deux dans la page de réglage.
  const prompt = r?.audioPrompt === "" ? "" : (r?.audioPrompt || c.audioPrompt);

  const vitesse = typeof r?.vitesse === "number" && Number.isFinite(r.vitesse)
    ? Math.min(Math.max(r.vitesse, 0.5), 1.5)
    : c.vitesse;

  const corps = (avecVitesse: boolean) => JSON.stringify({
    text: texte,
    language: langue === "fr" ? "fr" : "wo",
    output_format: "wav",
    model: c.model,
    exaggeration: borne(r?.exaggeration, c.exaggeration),
    temperature: borne(r?.temperature, c.temperature),
    cfg_weight: borne(r?.cfgWeight, c.cfgWeight),
    seed: 0,
    ...(avecVitesse && vitesse !== 1 ? { [c.vitesseField]: vitesse } : {}),
    ...(prompt ? { [c.audioPromptField]: prompt } : {}),
  });

  const appeler = (avecVitesse: boolean) => fetch(`${c.baseUrl.replace(/\/$/, "")}/v1/text-to-speech`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${c.apiKey}`,
      "content-type": "application/json",
      accept: "audio/wav",
    },
    body: corps(avecVitesse),
  });

  let reponse = await appeler(true);
  /* Le champ de vitesse n'est peut-être pas celui-là, ou n'existe peut-être
     pas. Un refus 400 ou 422 ne doit pas rendre BIA muette : on refait
     l'appel sans, et on le note pour qu'on le voie dans les journaux. */
  if (!reponse.ok && vitesse !== 1 && (reponse.status === 400 || reponse.status === 422)) {
    console.error(`BIA — Soynade refuse le champ « ${c.vitesseField} » : on lit sans régler la vitesse.`);
    reponse = await appeler(false);
  }

  if (!reponse.ok) {
    const detail = (await reponse.text().catch(() => "")).slice(0, 400);
    throw new Error(`Soynade ${reponse.status} : ${detail}`);
  }
  return {
    audio: Buffer.from(await reponse.arrayBuffer()),
    typeMime: "audio/wav",
    moteur: prompt ? "soynade-oolel-voices (voix clonée)" : "soynade-oolel-voices",
  };
}

async function viaElevenLabs(texte: string, langue: "wo" | "fr"): Promise<Parole> {
  const c = voixConfig.elevenlabs;
  if (!c.apiKey) throw new Error("ELEVENLABS_API_KEY manquante");
  const voix = langue === "wo" ? c.voiceWo || c.voiceFr : c.voiceFr;
  if (!voix) throw new Error("Aucun identifiant de voix configuré");

  const reponse = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${voix}`, {
    method: "POST",
    headers: { "xi-api-key": c.apiKey, "content-type": "application/json", accept: "audio/mpeg" },
    body: JSON.stringify({ text: texte, model_id: c.model, voice_settings: { stability: 0.4, similarity_boost: 0.7 } }),
  });
  if (!reponse.ok) throw new Error(`ElevenLabs ${reponse.status} : ${(await reponse.text()).slice(0, 400)}`);
  return { audio: Buffer.from(await reponse.arrayBuffer()), typeMime: "audio/mpeg", moteur: "elevenlabs" };
}

export async function synthetiser(texte: string, langue: "wo" | "fr", r?: Reglages): Promise<Parole | null> {
  if (!texte.trim()) return null;
  switch (voixConfig.fournisseur) {
    case "soynade": return viaSoynade(texte, langue, r);
    case "elevenlabs": return viaElevenLabs(texte, langue);
    default: return null; // le téléphone lit lui-même
  }
}
