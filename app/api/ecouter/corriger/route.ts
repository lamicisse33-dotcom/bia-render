import { verifierCode } from "@/lib/codes";
import { verifierTranscriptionContextuelle } from "@/lib/transcription-contextuelle";
export async function POST(request: Request) {
  if (!verifierCode(request.headers.get("x-bia-code")).ok) return Response.json({ erreur: "code" }, { status: 401 });
  if (Number(request.headers.get("content-length")) > 16000) return Response.json({ erreur: "taille" }, { status: 413 });
  const body = await request.json().catch(() => null);
  if (!body || typeof body.texte !== "string" || body.texte.length > 1800) return Response.json({ erreur: "texte" }, { status: 400 });
  return Response.json(await verifierTranscriptionContextuelle(body.texte, body.historique, body.indice_langue),
    { headers: { "cache-control": "no-store" } });
}
