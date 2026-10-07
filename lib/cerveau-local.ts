export type MessageLocal = { role: "system" | "user" | "assistant"; content: string };
const g = globalThis as typeof globalThis & { biaCerveauLocal?: {
  appels: number; reussites: number; echecs: number; ms: number;
  entree: number; sortie: number; dernierRefus: string;
} };
const compte = g.biaCerveauLocal ||= {
  appels: 0, reussites: 0, echecs: 0, ms: 0, entree: 0, sortie: 0, dernierRefus: "",
};
export function resumeCerveauLocal() {
  return {
    modele: process.env.LOCAL_LLM_MODEL || "Oolel-v0.1-Q8_0",
    ...compte,
    ms_moyen: compte.appels ? Math.round(compte.ms / compte.appels) : null,
    repli_cloud: false,
  };
}
export async function appelerCerveauLocal(messages: MessageLocal[], plafond = 220): Promise<Response> {
  const url = (process.env.LOCAL_LLM_URL || "").replace(/\/$/, "");
  const key = process.env.LOCAL_LLM_API_KEY || "";
  const parti = Date.now();
  compte.appels++;
  try {
    if (!url || !key) throw new Error("configuration_absente");
    const r = await fetch(url + "/brain/v1/chat/completions", {
      method: "POST", cache: "no-store",
      headers: { "Content-Type": "application/json", "X-Brain-Key": key },
      body: JSON.stringify({
        model: process.env.LOCAL_LLM_MODEL || "Oolel-v0.1-Q8_0",
        messages, max_tokens: Math.max(1, Math.min(512, plafond)),
        temperature: 0.25, stream: false,
      }),
      signal: AbortSignal.timeout(45_000),
    });
    if (!r.ok) throw new Error("HTTP_" + r.status);
    const data = await r.json();
    if (!String(data?.choices?.[0]?.message?.content || "").trim()) throw new Error("reponse_vide");
    if (data.model !== (process.env.LOCAL_LLM_MODEL || "Oolel-v0.1-Q8_0")) throw new Error("modele_inattendu");
    compte.reussites++;
    compte.entree += Math.max(0, Number(data.usage?.prompt_tokens) || 0);
    compte.sortie += Math.max(0, Number(data.usage?.completion_tokens) || 0);
    compte.dernierRefus = "";
    return Response.json(data);
  } catch (err) {
    const e = err as Error;
    const reason = /^(configuration_absente|HTTP_\d+|reponse_vide|modele_inattendu)$/.test(e.message)
      ? e.message : e.name === "TimeoutError" ? "delai_depasse" : "connexion_impossible";
    compte.echecs++;
    compte.dernierRefus = reason;
    // An explicit local test must never silently run on Groq.
    return Response.json({ error: "Cerveau local indisponible", motif: reason }, { status: 503 });
  } finally { compte.ms += Date.now() - parti; }
}
