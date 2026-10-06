import { NextRequest, NextResponse } from "next/server";
import { timingSafeEqual } from "node:crypto";
import { verifierCode } from "@/lib/codes";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const maxDuration = 100;
const CHECKPOINT_SHA = "c1a0245aeca8a3b94a7986f83cf6a84033900ed8fce5788750fba479ffba0507";

function configuration() {
  const url = (process.env.CHATTERBOX_TEST_URL || "").replace(/\/$/, "");
  const key = process.env.CHATTERBOX_TEST_KEY || "";
  if (!url || !key) return null;
  return { url, key };
}

export async function GET() {
  const c = configuration();
  if (!c) return NextResponse.json({ ok: false, error: "Le serveur de test est arrêté ou n’est pas encore configuré." }, { status: 503 });
  try {
    const response = await fetch(`${c.url}/health`, { cache: "no-store", signal: AbortSignal.timeout(10000) });
    if (!response.ok) return NextResponse.json({ ok: false, error: "Le serveur de test ne répond pas." }, { status: 503 });
    const data = await response.json();
    if (!data.ok || data.checkpoint_sha256 !== CHECKPOINT_SHA) {
      return NextResponse.json({ ok: false, error: "Le modèle entraîné n’est pas encore prêt." }, { status: 503 });
    }
    return NextResponse.json(data, { headers: { "cache-control": "no-store" } });
  } catch {
    return NextResponse.json({ ok: false, error: "Le serveur de test ne répond pas." }, { status: 503 });
  }
}

// Dedicated server checks use the existing GPU key only on this test route.
// The browser continues to use its BIA code; the GPU key never enters the page.
function hasTestKey(request: NextRequest) {
  const provided = request.headers.get("x-chatterbox-test-key");
  const expected = process.env.CHATTERBOX_TEST_KEY;
  if (!provided || !expected) return false;
  const actual = Buffer.from(provided, "utf8");
  const wanted = Buffer.from(expected, "utf8");
  return actual.length === wanted.length && timingSafeEqual(actual, wanted);
}

export async function POST(request: NextRequest) {
  if (!hasTestKey(request) && !verifierCode(request.headers.get("x-bia-code")).ok) {
    return NextResponse.json({ error: "Saisis ton code d’accès BIA pour lancer l’essai." }, { status: 401 });
  }
  const c = configuration();
  if (!c) return NextResponse.json({ error: "Le serveur de test est arrêté ou n’est pas encore configuré." }, { status: 503 });
  const body = await request.json().catch(() => null);
  if (!body || typeof body?.input?.text !== "string") {
    return NextResponse.json({ error: "Écris une phrase à prononcer." }, { status: 400 });
  }
  try {
    const text = body.input.text.trim();
    if (!text || text.length > 600) return NextResponse.json({ error: "Écris une phrase de 600 caractères au maximum." }, { status: 400 });
    const voice = body?.input?.voice === "male" ? "male" : "female";
    const response = await fetch(`${c.url}/tts`, {
      method: "POST", cache: "no-store",
      headers: { "content-type": "application/json", "X-Khalam-Key": c.key },
      body: JSON.stringify({ input: { text, voice, temperature: .4 } }),
      signal: AbortSignal.timeout(90000),
    });
    if (!response.ok) return NextResponse.json({ error: `Le moteur de test a refusé la synthèse (HTTP ${response.status}).` }, { status: 502 });
    const data = await response.json();
    if (data.status !== "COMPLETED" || !data.output?.audio_base64 ||
        typeof data.output.audio_base64 !== "string" ||
        data.output.checkpoint_sha256 !== CHECKPOINT_SHA ||
        !Number.isFinite(data.output.generation_ms) ||
        !Number.isFinite(data.output.duration_seconds)) {
      return NextResponse.json({ error: "Le moteur de test n’a pas produit d’audio." }, { status: 502 });
    }
    return NextResponse.json(data, { headers: { "cache-control": "no-store" } });
  } catch {
    return NextResponse.json({ error: "La synthèse de test n’a pas terminé dans le délai prévu." }, { status: 502 });
  }
}
