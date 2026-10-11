import { timingSafeEqual } from "node:crypto";
import { verifierTranscriptionContextuelle } from "@/lib/transcription-contextuelle";
import { transcrire } from "@/lib/ecoute";
export const runtime = "nodejs";
let appels = 0;
// Bounded deployment probe using only the existing ear service credential.
// Never grants access to chat, corpus, saved conversations or master functions.
export async function POST(request: Request) {
  const attendu = Buffer.from(process.env.WOLOF_LOCAL_API_KEY || "");
  const recu = Buffer.from(request.headers.get("x-wolof-key") || "");
  if (!attendu.length || recu.length !== attendu.length || !timingSafeEqual(recu, attendu)) return Response.json({ erreur: "acces" }, { status: 401 });
  if (Date.now() > Date.parse("2026-10-11T23:59:00Z") || appels >= 40) return Response.json({ erreur: "essai_ferme" }, { status: 410 });
  if (Number(request.headers.get("content-length")) > 1500000) return Response.json({ erreur: "taille" }, { status: 413 });
  const body = await request.json().catch(() => null);
  if (!body || (typeof body.texte !== "string" && typeof body.audio_base64 !== "string")) return Response.json({ erreur: "texte" }, { status: 400 });
  appels++;
  let texte = body.texte;
  if (body.audio_base64) {
    if (body.audio_base64.length > 1400000) return Response.json({ erreur: "taille" }, { status: 413 });
    const audio = new Blob([Buffer.from(body.audio_base64, "base64")], { type: "audio/wav" });
    texte = (await transcrire(audio, "essai.wav", null)).texte;
  }
  return Response.json(await verifierTranscriptionContextuelle(texte, body.historique, body.indice_langue), { headers: { "cache-control": "no-store" } });
}
