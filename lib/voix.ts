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
const LIMITE = 480;

export function decouper(texte: string): string[] {
  const propre = String(texte || "").replace(/\s+/g, " ").trim();
  if (!propre) return [];
  if (propre.length <= LIMITE) return [propre];

  const phrases = propre.match(/[^.!?…]+[.!?…]*\s*/g) || [propre];
  const morceaux: string[] = [];
  let courant = "";

  for (const phrase of phrases) {
    if ((courant + phrase).length <= LIMITE) { courant += phrase; continue; }
    if (courant) { morceaux.push(courant.trim()); courant = ""; }
    if (phrase.length <= LIMITE) { courant = phrase; continue; }
    // Phrase à elle seule trop longue : on coupe aux espaces.
    let reste = phrase;
    while (reste.length > LIMITE) {
      let coupe = reste.lastIndexOf(" ", LIMITE);
      if (coupe < LIMITE * 0.5) coupe = LIMITE;
      morceaux.push(reste.slice(0, coupe).trim());
      reste = reste.slice(coupe);
    }
    courant = reste;
  }
  if (courant.trim()) morceaux.push(courant.trim());
  return morceaux.filter(Boolean);
}

export type Reglages = { exaggeration?: number; temperature?: number; cfgWeight?: number };
export type Parole = { audio: Buffer; typeMime: string; moteur: string };

const borne = (v: number | undefined, defaut: number) =>
  typeof v === "number" && Number.isFinite(v) ? Math.min(Math.max(v, 0), 2) : defaut;

async function viaSoynade(texte: string, langue: "wo" | "fr", r?: Reglages): Promise<Parole> {
  const c = voixConfig.soynade;
  if (!c.apiKey) throw new Error("SOYNADE_API_KEY manquante");

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
    }),
  });

  if (!reponse.ok) {
    const detail = (await reponse.text().catch(() => "")).slice(0, 400);
    throw new Error(`Soynade ${reponse.status} : ${detail}`);
  }
  return { audio: Buffer.from(await reponse.arrayBuffer()), typeMime: "audio/wav", moteur: "soynade-oolel-voices" };
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
