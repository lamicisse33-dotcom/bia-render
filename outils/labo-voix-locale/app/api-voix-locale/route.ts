import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const LOCAL_TTS_URL =
  process.env.WOLOF_LOCAL_TTS_URL || "http://127.0.0.1:8765";

export async function GET() {
  try {
    const r = await fetch(`${LOCAL_TTS_URL}/health`, {
      cache: "no-store",
      signal: AbortSignal.timeout(2500),
    });

    if (!r.ok) {
      return NextResponse.json(
        { ok: false, erreur: "moteur local indisponible" },
        { status: 503 }
      );
    }

    const info = await r.json();
    return NextResponse.json({ ok: true, local: true, ...info });
  } catch {
    return NextResponse.json(
      {
        ok: false,
        local: true,
        erreur:
          "Le moteur wolof local n'est pas lancé. Démarre python3 outils/wolof_local_server.py",
      },
      { status: 503 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as {
      texte?: string;
      voice?: "slt" | "clb";
    };

    const texte = String(body.texte || "").trim();
    const voice = body.voice === "clb" ? "clb" : "slt";

    if (!texte) {
      return NextResponse.json(
        { erreur: "texte vide" },
        { status: 400 }
      );
    }

    const r = await fetch(`${LOCAL_TTS_URL}/speak`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ text: texte, voice }),
      signal: AbortSignal.timeout(120000),
      cache: "no-store",
    });

    if (!r.ok) {
      const detail = await r.text().catch(() => "");
      return NextResponse.json(
        {
          erreur: "échec du moteur wolof local",
          detail: detail.slice(0, 500),
        },
        { status: 502 }
      );
    }

    const audio = await r.arrayBuffer();

    return new NextResponse(audio, {
      status: 200,
      headers: {
        "content-type": "audio/wav",
        "content-length": String(audio.byteLength),
        "cache-control": "no-store",
        "x-voix": "wolof-local",
      },
    });
  } catch (e) {
    return NextResponse.json(
      {
        erreur: "moteur wolof local indisponible",
        detail: e instanceof Error ? e.message : String(e),
      },
      { status: 503 }
    );
  }
}
