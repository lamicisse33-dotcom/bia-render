import { detecterLangue } from "@/lib/langue";
import { NextRequest, NextResponse } from "next/server";
import { timingSafeEqual } from "node:crypto";
import { verifierCode } from "@/lib/codes";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const maxDuration = 100;
const CHECKPOINTS = new Set(["b1237586127ce98e7800a68e49938eb5092846862aabcb6e17b2fda7889a6c75", "c1a0245aeca8a3b94a7986f83cf6a84033900ed8fce5788750fba479ffba0507", "8320e6788427029dcaf7aeea8e54124f172dd7cdd12d7fcf658cf616c0c21e9f"]);

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
    if (!data.ok || !CHECKPOINTS.has(data.checkpoint_sha256)) {
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
    const language = body.input.language === "fr" || body.input.language === "wo" ? body.input.language : detecterLangue(text);
    const francais = language === "fr";
    const response = await fetch(`${c.url}/tts`, {
      method: "POST", cache: "no-store",
      headers: { "content-type": "application/json", "X-Khalam-Key": c.key },
      body: JSON.stringify({ input: { text, voice, language, language_id: "fr", temperature: francais ? .3 : .4,
        ...(francais ? { exaggeration: .25, cfg_weight: .7 } : {}),
        preserve_segment: body.input.preserve_segment === true } }),
      signal: AbortSignal.timeout(90000),
    });
    if (!response.ok) {
      const code = response.status === 429 ? "GPU_OCCUPE" : `GPU_HTTP_${response.status}`;
      console.error("BIA_VOICE_FAILURE", JSON.stringify({ code, status: response.status }));
      return NextResponse.json({
        error: response.status === 429 ? "La voix prépare déjà d’autres morceaux. Elle va réessayer." : `Le moteur vocal a refusé la synthèse (HTTP ${response.status}).`,
        code,
      }, { status: response.status === 429 ? 429 : 502, headers: response.status === 429 ? { "retry-after": "2" } : {} });
    }
    const data = await response.json();
    if (data.status !== "COMPLETED" || !data.output?.audio_base64 ||
        typeof data.output.audio_base64 !== "string" ||
        !CHECKPOINTS.has(data.output.checkpoint_sha256) ||
        !Number.isFinite(data.output.generation_ms) ||
        !Number.isFinite(data.output.duration_seconds)) {
      console.error("BIA_VOICE_FAILURE", JSON.stringify({ code: "AUDIO_INVALIDE" }));
      return NextResponse.json({ error: "Le moteur vocal n’a pas produit d’audio.", code: "AUDIO_INVALIDE" }, { status: 502 });
    }
    return NextResponse.json(data, { headers: { "cache-control": "no-store" } });
  } catch (error) {
    const code = (error as Error)?.name === "TimeoutError" ? "DELAI_DEPASSE" : "CONNEXION_GPU";
    console.error("BIA_VOICE_FAILURE", JSON.stringify({ code }));
    return NextResponse.json({ error: code === "DELAI_DEPASSE" ? "La voix a mis trop de temps à se préparer." : "La connexion au moteur vocal a été interrompue.", code }, { status: 502 });
  }
}

