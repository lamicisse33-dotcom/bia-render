import { corrigerTranscription } from "./correction-transcription";
import { contexteTranscription, langueTranscription, lireVerdictTranscription, CONSIGNE_TRANSCRIPTION } from "./transcription-contexte-core";

const g = globalThis as typeof globalThis & { biaCorrectionContexte?: {
  appels: number; avec_contexte: number; corrigees: number; conservees: number; a_confirmer: number;
  echecs: number; ms: number; dernier_ms: number; dernier_refus: string; langues: Record<string, number>;
} };
const compte = g.biaCorrectionContexte ||= { appels: 0, avec_contexte: 0, corrigees: 0, conservees: 0,
  a_confirmer: 0, echecs: 0, ms: 0, dernier_ms: 0, dernier_refus: "", langues: {} };
export function resumeCorrectionContexte() {
  return { ...compte, langues: { ...compte.langues }, ms_moyen: compte.appels ? Math.round(compte.ms / compte.appels) : null,
    avant_reponse: true, historique_max_tours: 6, delai_modele_max_ms: 3500 };
}
// Reuse the selected conversation provider and credentials. No provider switch,
// tools, retries or persistent history in this additional, bounded pass.
async function demanderVerdict(payload: unknown) {
  const provider = (process.env.BIA_LLM_PROVIDER || "anthropic").toLowerCase();
  const messages = [{ role: "system", content: CONSIGNE_TRANSCRIPTION }, { role: "user", content: JSON.stringify(payload) }];
  const signal = AbortSignal.timeout(3500);
  let r: Response;
  if (provider === "cerebras" || provider === "groq" || provider === "local") {
    const local = provider === "local", cerebras = provider === "cerebras";
    const key = local ? process.env.LOCAL_LLM_API_KEY : cerebras ? process.env.CEREBRAS_API_KEY : process.env.GROQ_API_KEY;
    const url = local ? (process.env.LOCAL_LLM_URL || "").replace(/\/$/, "") + "/brain/v1/chat/completions"
      : cerebras ? "https://api.cerebras.ai/v1/chat/completions" : "https://api.groq.com/openai/v1/chat/completions";
    if (!key || (local && !process.env.LOCAL_LLM_URL)) throw Error("configuration_absente");
    const model = local ? process.env.LOCAL_LLM_MODEL || "Oolel-v0.1-Q8_0" : cerebras ? process.env.CEREBRAS_MODEL || "gpt-oss-120b" : process.env.GROQ_MODEL || "openai/gpt-oss-120b";
    r = await fetch(url, { method: "POST", cache: "no-store", signal,
      headers: { "content-type": "application/json", ...(local ? { "X-Brain-Key": key } : { authorization: `Bearer ${key}` }) },
      body: JSON.stringify({ model, messages, temperature: 0, stream: false,
        ...(local ? { max_tokens: 512 } : { max_completion_tokens: 1536,
          ...(/gpt-oss/.test(model) ? { reasoning_effort: "low" } : {}),
          ...(cerebras ? { reasoning_format: "hidden" } : { include_reasoning: false }) }) }) });
  } else {
    // Unsupported providers fail visibly instead of forwarding unchecked speech.
    throw Error("fournisseur_non_pris_en_charge");
  }
  if (!r.ok) throw Error("HTTP_" + r.status);
  const data = await r.json();
  if (data.choices?.[0]?.finish_reason === "length") throw Error("sortie_tronquee");
  const content = String(data.choices?.[0]?.message?.content || "").trim();
  try { return JSON.parse(content.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/, "")); }
  catch { throw Error("format_invalide"); }
}
export async function verifierTranscriptionContextuelle(texte: string, historique: unknown, indice?: unknown) {
  const brut = texte.trim();
  const history = contexteTranscription(historique);
  const indiceDetecte = langueTranscription(brut, history, indice);
  const debut = Date.now();
  compte.appels++; if (history.length) compte.avec_contexte++;
  let base = { texte: brut, texte_brut: brut, corrections_transcription: [] as Array<{ entendu: string; corrige: string }>, suggestions_ecriture: [] as string[] };
  let lexique_disponible = true;
  try {
    if (!brut) return { ...base, verification: { statut: "conservee", langue: indiceDetecte.langue, source_langue: indiceDetecte.source, ms: 0 } };
    if (brut.length > 1800) throw Error("texte_trop_long");
    // Database failure must not prevent the contextual check. Never persist an
    // automatic correction as a human-validated learning or training example.
    try { base = await corrigerTranscription(brut); } catch { lexique_disponible = false; }
    const verdict = lireVerdictTranscription(await demanderVerdict({ transcription: base.texte,
      langue_indice: indiceDetecte, historique: history, suggestions_lexique: base.suggestions_ecriture.slice(0, 3) }), base.texte);
    compte.langues[verdict.langue] = (compte.langues[verdict.langue] || 0) + 1;
    if (verdict.statut === "a_confirmer") compte.a_confirmer++;
    else if (verdict.statut === "corrigee" || base.texte !== brut) compte.corrigees++;
    else compte.conservees++;
    compte.dernier_refus = "";
    return { ...base, texte: verdict.texte, suggestions_ecriture: [], lexique_disponible,
      corrections_transcription: [...base.corrections_transcription,
        ...(verdict.texte !== base.texte ? [{ entendu: base.texte, corrige: verdict.texte }] : [])],
      verification: { ...verdict, texte: undefined, source_langue: "analyse_contextuelle", ms: Date.now() - debut } };
  } catch (error) {
    const e = error as Error;
    const motif = /^(HTTP_\d+|configuration_absente|fournisseur_non_pris_en_charge|texte_trop_long|format_invalide|garder_modifie|sortie_tronquee)$/.test(e.message)
      ? e.message : e.name === "TimeoutError" || e.name === "AbortError" ? "delai_depasse" : "connexion_impossible";
    compte.echecs++; compte.dernier_refus = motif;
    return { ...base, suggestions_ecriture: [], lexique_disponible,
      verification: { statut: "indisponible", langue: indiceDetecte.langue, source_langue: indiceDetecte.source, motif, ms: Date.now() - debut } };
  } finally { compte.dernier_ms = Date.now() - debut; compte.ms += compte.dernier_ms; }
}
