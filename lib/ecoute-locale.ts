import type { Ecoute } from "./ecoute";

// Only aggregate diagnostics leave this module. No audio, transcript or key.
const g = globalThis as typeof globalThis & { biaOreilleLocale?: {
  appels: number; reussites: number; replis: number; silences: number;
  ms: number; audioSecondes: number; dernierRefus: string;
} };
const compte = g.biaOreilleLocale ||= {
  appels: 0, reussites: 0, replis: 0, silences: 0,
  ms: 0, audioSecondes: 0, dernierRefus: "",
};

export function resumeOreilleLocale() {
  return {
    modele: "omniASR_LLM_1B_v2",
    ecoutes: compte.appels, reussites: compte.reussites,
    replis: compte.replis, silences: compte.silences,
    ms_moyen: compte.appels ? Math.round(compte.ms / compte.appels) : null,
    audio_secondes: Math.round(compte.audioSecondes * 10) / 10,
    dernier_refus: compte.dernierRefus,
  };
}

export async function chezOreilleLocale(audio: Blob): Promise<Ecoute | null> {
  const url = (process.env.WOLOF_LOCAL_URL || "").replace(/\/$/, "");
  const key = process.env.WOLOF_LOCAL_API_KEY || "";
  const parti = Date.now();
  compte.appels++;
  try {
    if (!url || !key) throw new Error("configuration_absente");
    if (audio.size > 12 * 1024 * 1024) throw new Error("audio_trop_volumineux");
    const r = await fetch(url + "/asr/transcribe", {
      method: "POST",
      headers: { "X-Wolof-Key": key, "Content-Type": audio.type || "application/octet-stream" },
      body: audio,
      signal: AbortSignal.timeout(12_000),
      cache: "no-store",
    });
    if (!r.ok) throw new Error("HTTP_" + r.status);
    const d = await r.json() as { text?: unknown; model?: unknown; silence?: boolean; audio_seconds?: number };
    if (d.model !== "omniASR_LLM_1B_v2" || typeof d.text !== "string") {
      throw new Error("reponse_invalide");
    }
    const texte = d.text.trim();
    if (!texte && !d.silence) throw new Error("texte_vide");
    compte.reussites++;
    if (d.silence) compte.silences++;
    if (typeof d.audio_seconds === "number" && Number.isFinite(d.audio_seconds)) {
      compte.audioSecondes += d.audio_seconds;
    }
    compte.dernierRefus = "";
    // This model does not report detected language. Do not invent a detection.
    return { texte, langue: null, moteur: "local-omniASR_LLM_1B_v2" };
  } catch (err) {
    const e = err as Error;
    const reason = /^(configuration_absente|audio_trop_volumineux|HTTP_\d+|reponse_invalide|texte_vide)$/.test(e.message)
      ? e.message : e.name === "TimeoutError" ? "delai_depasse" : "connexion_impossible";
    compte.dernierRefus = reason;
    compte.replis++;
    return null; // Existing Soynade, then ElevenLabs fallback remains responsible.
  } finally {
    compte.ms += Date.now() - parti;
  }
}
