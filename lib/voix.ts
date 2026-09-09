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
    exaggeration: Number(env.SOYNADE_EXAGGERATION || 0.12),
    temperature: Number(env.SOYNADE_TEMPERATURE || 0.35),
    cfgWeight: Number(env.SOYNADE_CFG_WEIGHT || 0.28),
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

export type Reglages = { exaggeration?: number; temperature?: number; cfgWeight?: number; audioPrompt?: string | null };
export type Parole = { audio: Buffer; typeMime: string; moteur: string };

const borne = (v: number | undefined, defaut: number) =>
  typeof v === "number" && Number.isFinite(v) ? Math.min(Math.max(v, 0), 2) : defaut;

async function viaSoynade(texte: string, langue: "wo" | "fr", r?: Reglages): Promise<Parole> {
  const c = voixConfig.soynade;
  if (!c.apiKey) throw new Error("SOYNADE_API_KEY manquante");

  // Une chaîne vide passée explicitement veut dire « sans clonage », pour
  // pouvoir comparer les deux dans la page de réglage.
  const prompt = r?.audioPrompt === "" ? "" : (r?.audioPrompt || c.audioPrompt);

  const reponse = await fetch(`${c.baseUrl.replace(/\/$/, "")}/v1/text-to-speech`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${c.apiKey}`,
      "content-type": "application/json",
      accept: "audio/wav",
    },
    body: JSON.stringify({
      text: texte,
      language: langue === "fr" ? "fr" : "wo",
      output_format: "wav",
      model: c.model,
      exaggeration: borne(r?.exaggeration, c.exaggeration),
      temperature: borne(r?.temperature, c.temperature),
      cfg_weight: borne(r?.cfgWeight, c.cfgWeight),
      seed: 0,
      ...(prompt ? { [c.audioPromptField]: prompt } : {}),
    }),
  });

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
