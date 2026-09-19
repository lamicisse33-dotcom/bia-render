import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MOTEUR = "http://127.0.0.1:8765";

export async function GET() {
  try {
    const r = await fetch(`${MOTEUR}/health`, {
      cache: "no-store"
    });

    if (!r.ok) throw new Error();

    return NextResponse.json(
      await r.json()
    );
  } catch {
    return NextResponse.json(
      {
        ok: false,
        erreur: "Moteur wolof local non lancé"
      },
      { status: 503 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const corps = await req.json();

    const texte =
      String(corps.texte || "").trim();

    const voice =
      corps.voice === "clb"
        ? "clb"
        : "slt";

    if (!texte) {
      return NextResponse.json(
        { erreur: "texte vide" },
        { status: 400 }
      );
    }

    const r = await fetch(
      `${MOTEUR}/speak`,
      {
        method: "POST",
        headers: {
          "content-type":
            "application/json"
        },
        body: JSON.stringify({
          text: texte,
          voice
        }),
        cache: "no-store"
      }
    );

    if (!r.ok) {
      throw new Error(
        await r.text()
      );
    }

    const audio =
      await r.arrayBuffer();

    return new NextResponse(
      audio,
      {
        headers: {
          "content-type":
            "audio/wav",
          "cache-control":
            "no-store"
        }
      }
    );

  } catch (e) {

    return NextResponse.json(
      {
        erreur:
          e instanceof Error
            ? e.message
            : "Erreur voix locale"
      },
      { status: 500 }
    );
  }
}
