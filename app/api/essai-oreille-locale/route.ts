import { timingSafeEqual } from "node:crypto";
import { transcrire } from "@/lib/ecoute";

export const runtime = "nodejs";
let appels = 0;
// Temporary deployment probe, scoped to the new ASR credential. Never accepts
// a voice-test credential or changes the authentication of /api/ecouter.
export async function POST(request: Request) {
  const expected = Buffer.from(process.env.WOLOF_LOCAL_API_KEY || "");
  const received = Buffer.from(request.headers.get("x-wolof-key") || "");
  if (!expected.length || received.length !== expected.length ||
      !timingSafeEqual(received, expected)) {
    return Response.json({ erreur: "acces" }, { status: 401 });
  }
  if (Date.now() > Date.parse("2026-10-07T20:30:00Z") ||
      process.env.STT_PROVIDER !== "local_wolof" || appels >= 12) {
    return Response.json({ erreur: "essai_ferme" }, { status: 410 });
  }
  appels++;
  if (Number(request.headers.get("content-length")) > 12 * 1024 * 1024) {
    return Response.json({ erreur: "taille" }, { status: 413 });
  }
  const audio = await request.blob();
  if (!audio.size || audio.size > 12 * 1024 * 1024) {
    return Response.json({ erreur: "taille" }, { status: 413 });
  }
  try {
    const parti = Date.now();
    const result = await transcrire(audio, "essai.wav", "wo");
    return Response.json({ ...result, trajet_ms: Date.now() - parti }, {
      headers: { "cache-control": "no-store" },
    });
  } catch {
    return Response.json({ erreur: "ecoute" }, { status: 502 });
  }
}
