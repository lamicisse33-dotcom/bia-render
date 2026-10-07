import { timingSafeEqual } from "node:crypto";
import { appelerCerveauLocal, type MessageLocal } from "@/lib/cerveau-local";
export const runtime = "nodejs";
let appels = 0;
// Temporary diagnostic credential grants only this bounded local-model test.
export async function POST(request: Request) {
  const expected = Buffer.from(process.env.LOCAL_LLM_API_KEY || "");
  const received = Buffer.from(request.headers.get("x-brain-key") || "");
  if (!expected.length || received.length !== expected.length || !timingSafeEqual(received, expected)) {
    return Response.json({ erreur: "acces" }, { status: 401 });
  }
  if (Date.now() > Date.parse("2026-10-07T21:00:00Z") ||
      process.env.BIA_LLM_PROVIDER !== "local" || appels >= 12) {
    return Response.json({ erreur: "essai_ferme" }, { status: 410 });
  }
  appels++;
  const body = await request.json().catch(() => null);
  if (typeof body?.message !== "string" || !body.message.trim() || body.message.length > 1800) {
    return Response.json({ erreur: "message" }, { status: 400 });
  }
  const history: MessageLocal[] = Array.isArray(body.history) ? body.history.slice(-4) : [];
  if (history.some(m => !["user", "assistant"].includes(m.role) || typeof m.content !== "string" || m.content.length > 700)) {
    return Response.json({ erreur: "historique" }, { status: 400 });
  }
  const start = Date.now();
  const response = await appelerCerveauLocal([
    { role: "system", content: "Tu es BIA, assistante vocale de KHALAM à Dakar. Réponds dans la langue de la personne, en français ou en wolof urbain simple, en une ou deux phrases. Tiens compte de la conversation précédente." },
    ...history, { role: "user", content: body.message },
  ], 180);
  const data = await response.json();
  return Response.json({ ...data, trajet_ms: Date.now() - start }, {
    status: response.status, headers: { "cache-control": "no-store" },
  });
}
