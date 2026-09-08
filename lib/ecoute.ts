/* Parole -> texte, repris de l'Interprète.
   ElevenLabs Scribe accepte directement le webm du navigateur : pas de
   conversion, donc pas de ffmpeg à installer sur Render. Soynade, lui,
   exige un wav 16 kHz — c'est pourquoi il n'est pas proposé ici. */

const env = process.env;

export const ecouteConfig = {
  fournisseur: env.STT_PROVIDER || (env.ELEVENLABS_API_KEY ? "elevenlabs" : "navigateur"),
  elevenlabs: {
    apiKey: env.ELEVENLABS_API_KEY || "",
    model: env.ELEVENLABS_STT_MODEL || "scribe_v1",
  },
};

export type Ecoute = { texte: string; langue: "wo" | "fr" | null; moteur: string };

export async function transcrire(audio: Blob, nomFichier: string, indice?: string | null): Promise<Ecoute> {
  const c = ecouteConfig.elevenlabs;
  if (!c.apiKey) throw new Error("ELEVENLABS_API_KEY manquante");

  const form = new FormData();
  form.append("file", audio, nomFichier || "parole.webm");
  form.append("model_id", c.model);
  if (indice) form.append("language_code", indice === "wo" ? "wol" : "fra");

  const reponse = await fetch("https://api.elevenlabs.io/v1/speech-to-text", {
    method: "POST",
    headers: { "xi-api-key": c.apiKey },
    body: form,
  });
  if (!reponse.ok) throw new Error(`ElevenLabs ${reponse.status} : ${(await reponse.text()).slice(0, 400)}`);

  const data = await reponse.json() as { text?: string; language_code?: string };
  const carte: Record<string, "wo" | "fr"> = { fra: "fr", fre: "fr", fr: "fr", wol: "wo", wo: "wo" };
  return {
    texte: (data.text || "").trim(),
    langue: (data.language_code && carte[data.language_code]) || null,
    moteur: "elevenlabs-scribe",
  };
}
