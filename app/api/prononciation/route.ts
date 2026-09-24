/**
 * app/api/prononciation/route.ts
 *
 * GET    /api/prononciation         → liste toutes les corrections (code maître requis)
 * POST   /api/prononciation         → ajouter / modifier une correction
 * DELETE /api/prononciation?mot=X   → supprimer une correction
 */

import { NextRequest, NextResponse } from "next/server";
import { ajouterCorrection, resumePrononciation, supprimerCorrection } from "@/lib/prononciation";

const CODE_MAITRE = process.env.BIA_CODE_MAITRE ?? "";

function autoriser(req: NextRequest): boolean {
  const code = req.headers.get("x-bia-code") ?? "";
  return CODE_MAITRE.length > 0 && code === CODE_MAITRE;
}

export async function GET(req: NextRequest) {
  if (!autoriser(req)) return NextResponse.json({ erreur: "Non autorisé" }, { status: 401 });

  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.SUPABASE_SERVICE_KEY ?? process.env.SUPABASE_ANON_KEY;
  if (!url || !key) return NextResponse.json({ corrections: [], resume: resumePrononciation() });

  try {
    const r = await fetch(
      `${url}/rest/v1/prononciation?select=mot,dire,actif,created_at&order=created_at.desc`,
      { headers: { apikey: key, Authorization: `Bearer ${key}` }, signal: AbortSignal.timeout(3000) }
    );
    const corrections = r.ok ? await r.json() : [];
    return NextResponse.json({ corrections, resume: resumePrononciation() });
  } catch {
    return NextResponse.json({ corrections: [], resume: resumePrononciation() });
  }
}

export async function POST(req: NextRequest) {
  if (!autoriser(req)) return NextResponse.json({ erreur: "Non autorisé" }, { status: 401 });

  let body: { mot?: string; dire?: string };
  try { body = await req.json(); } catch { return NextResponse.json({ erreur: "JSON invalide" }, { status: 400 }); }

  const { mot, dire } = body;
  if (!mot?.trim() || !dire?.trim()) {
    return NextResponse.json({ erreur: "mot et dire sont obligatoires" }, { status: 400 });
  }

  try {
    await ajouterCorrection(mot, dire);
    return NextResponse.json({ ok: true, mot: mot.trim(), dire: dire.trim() });
  } catch (e) {
    return NextResponse.json({ erreur: String(e) }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  if (!autoriser(req)) return NextResponse.json({ erreur: "Non autorisé" }, { status: 401 });

  const mot = req.nextUrl.searchParams.get("mot");
  if (!mot) return NextResponse.json({ erreur: "mot manquant" }, { status: 400 });

  await supprimerCorrection(mot);
  return NextResponse.json({ ok: true });
}
