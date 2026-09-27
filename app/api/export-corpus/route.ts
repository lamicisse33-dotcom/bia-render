import { NextRequest, NextResponse } from "next/server";
import { createHash, timingSafeEqual } from "node:crypto";
import { CHEMIN_CORPUS_VALIDE, listerCorpus, lireExtraitAudio } from "@/lib/corpus";
import { toutes } from "@/lib/lexique";

/* Passerelle temporaire d'export vers le Mac runner.
   Elle ne contient aucun secret : la preuve envoyée doit être le SHA-256 du
   code maître déjà présent dans l'environnement Render. Cette route sera
   retirée après l'export. */
function autorise(request: NextRequest) {
  const secret=process.env.BIA_CODE_MAITRE||"";
  const recu=request.nextUrl.searchParams.get("proof")||"";
  if(!secret || !/^[a-f0-9]{64}$/i.test(recu)) return false;
  const attendu=createHash("sha256").update(secret).digest("hex");
  try {
    return timingSafeEqual(Buffer.from(recu,"hex"),Buffer.from(attendu,"hex"));
  } catch { return false; }
}

export async function GET(request: NextRequest) {
  if (!autorise(request)) return NextResponse.json({ erreur: "export" }, { status: 401 });
  const chemin=request.nextUrl.searchParams.get("chemin");
  try {
    if (chemin) {
      if (!CHEMIN_CORPUS_VALIDE.test(chemin)) return NextResponse.json({ erreur:"chemin" },{status:400});
      const r=await lireExtraitAudio(chemin);
      if (!r) return NextResponse.json({ erreur:"absent" },{status:404});
      const type=chemin.endsWith(".mp3")?"audio/mpeg":
        chemin.endsWith(".wav")?"audio/wav":
        chemin.endsWith(".ogg")?"audio/ogg":
        chemin.endsWith(".mp4")?"audio/mp4":"audio/webm";
      return new NextResponse(Buffer.from(await r.arrayBuffer()),{headers:{"content-type":type}});
    }
    const [extraits,lexique]=await Promise.all([listerCorpus(false),toutes()]);
    return NextResponse.json({
      extraits,
      lexique,
      verifies: extraits.filter(e=>Boolean(e.verifie)).length,
      total: extraits.length,
    });
  } catch(err) {
    return NextResponse.json({erreur:(err as Error).message},{status:500});
  }
}
