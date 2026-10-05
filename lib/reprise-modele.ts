/* GPT-OSS shares its completion budget with reasoning. 170 tokens can leave
   no spoken answer even on a successful HTTP response. */
export function budgetGroq(plafond: number, model: string): number {
  return /^openai\/gpt-oss-/.test(model) ? Math.max(1536, plafond) : plafond;
}

export function delaiModele(reponse: Response, detail: string, essai: number, maintenant = Date.now()): number {
  const header = reponse.headers.get("retry-after");
  let demande = 0;
  if (header) {
    const secondes = Number(header);
    demande = Number.isFinite(secondes) ? secondes * 1000 : Math.max(0, Date.parse(header) - maintenant);
  }
  // Groq sometimes supplies the wait only in its JSON error message.
  const message = detail.match(/try again in\s+(?:(\d+(?:\.\d+)?)m)?\s*(?:(\d+(?:\.\d+)?)s)?/i);
  if (message) demande = Math.max(demande || 0, (Number(message[1] || 0) * 60 + Number(message[2] || 0)) * 1000);
  return Math.max(500 * 2 ** essai, (Number.isFinite(demande) ? demande : 0) + 250);
}

export async function fetchModeleAvecReprise(url: string, init: RequestInit, limite = Date.now() + 45_000): Promise<Response> {
  let reponse: Response | undefined;
  for (let essai = 0; essai < 3; essai++) {
    const restant = limite - Date.now();
    if (restant <= 0) break;
    try {
      reponse = await fetch(url, { ...init, signal: AbortSignal.timeout(Math.max(1, Math.min(15_000, restant))) });
    } catch {
      reponse = new Response(JSON.stringify({ error: "Connexion au moteur interrompue." }), { status: 503 });
    }
    if (reponse.ok || ![429, 500, 502, 503, 504, 529].includes(reponse.status) || essai === 2) return reponse;
    const detail = await reponse.clone().text().catch(() => "");
    const attente = delaiModele(reponse, detail, essai);
    // Never retry before the provider's stated reset, or wait without a bound.
    if (attente > 30_000 || Date.now() + attente + 1000 >= limite) return reponse;
    console.warn("BIA_MODEL_RETRY", JSON.stringify({ status: reponse.status, attempt: essai + 1, wait_ms: attente }));
    await new Promise<void>((resolve) => setTimeout(resolve, attente));
  }
  return reponse || new Response(JSON.stringify({ error: "Délai du moteur dépassé." }), { status: 503 });
}
