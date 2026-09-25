/**
 * POST /api/tenue — change la tenue de BIA (code maître requis).
 * La valeur elle-même part vers /api/etat, lu par tout le monde : voir
 * lib/tenue.ts.
 */
import { NextRequest, NextResponse } from "next/server";
import { changerTenue } from "@/lib/tenue";
import { verifierCode } from "@/lib/codes";

export async function POST(req: NextRequest) {
  const verdict = verifierCode(req.headers.get("x-bia-code"));
  if (!verdict.ok || !verdict.maitre) return NextResponse.json({ erreur: "code maître" }, { status: 401 });

  let valeur: string;
  try {
    ({ valeur } = await req.json() as { valeur: string });
  } catch {
    return NextResponse.json({ erreur: "JSON invalide" }, { status: 400 });
  }
  if (!valeur || typeof valeur !== "string") {
    return NextResponse.json({ erreur: "valeur manquante" }, { status: 400 });
  }

  try {
    await changerTenue(valeur.slice(0, 40));
    return NextResponse.json({ ok: true, tenue: valeur });
  } catch (e) {
    return NextResponse.json({ erreur: (e as Error).message }, { status: 500 });
  }
}
