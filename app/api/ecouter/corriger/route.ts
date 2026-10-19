import { verifierCode } from "@/lib/codes";
import { corrigerTranscription } from "@/lib/correction-transcription";
import { detecterLangue } from "@/lib/langue";
export async function POST(request: Request) {
  if (!verifierCode(request.headers.get("x-bia-code"), false).ok) return Response.json({ erreur: "code" }, { status: 401 });
  if (Number(request.headers.get("content-length")) > 16000) return Response.json({ erreur: "taille" }, { status: 413 });
  const body = await request.json().catch(() => null);
  if (!body || typeof body.texte !== "string" || body.texte.length > 1800) return Response.json({ erreur: "texte" }, { status: 400 });
  // Compatibility for tabs opened before the rollback: never re-enter the
  // suspended model gate when an interrupted utterance is submitted here.
  let result = { texte: body.texte, texte_brut: body.texte, corrections_transcription: [] as Array<{entendu:string;corrige:string}> };
  try { result = await corrigerTranscription(body.texte); } catch {}
  return Response.json({ ...result, verification: { statut: "conservee",
    langue: detecterLangue(result.texte, body.indice_langue === "fr" ? "fr" : "wo"),
    source_langue: "lexique", verification_contextuelle: false } },
    { headers: { "cache-control": "no-store" } });
}
