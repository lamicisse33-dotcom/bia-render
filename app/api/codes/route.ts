import { NextRequest, NextResponse } from "next/server";
import { creerCode } from "@/lib/codes";

/* Fabrique des codes de testeur. Réservé au code maître de Lamine. */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json() as { maitre?: string; heures?: number; nombre?: number };
    const maitre = (process.env.BIA_CODE_MAITRE || "").toUpperCase().replace(/[^A-Z0-9]/g, "");
    const donne = String(body.maitre || "").toUpperCase().replace(/[^A-Z0-9]/g, "");
    if (!maitre || donne !== maitre) return NextResponse.json({ erreur: "Code maître refusé." }, { status: 403 });

    const heures = Math.min(Math.max(Number(body.heures) || 2, 0.25), 720);
    const nombre = Math.min(Math.max(Number(body.nombre) || 1, 1), 50);
    const codes = Array.from({ length: nombre }, () => creerCode(heures));
    return NextResponse.json({ codes, heures });
  } catch {
    return NextResponse.json({ erreur: "Requête mal formée." }, { status: 400 });
  }
}
