import { NextRequest, NextResponse } from "next/server";
import { createHash, timingSafeEqual } from "node:crypto";
import { verifierCode } from "@/lib/codes";
import { POST as testSynthesis } from "../route";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const maxDuration = 100;

// Keep the first audio short enough to start playing while later parts render.
// These bounds match the GPU's native segmentation and stay below its 600 limit.
const MAX_CHARS = 140;
const MAX_WORDS = 16;
const inFlight = new Map<string, Promise<{ status: number; data: any }>>();

function authorized(request: NextRequest) {
  const supplied = request.headers.get("x-chatterbox-test-key");
  const expected = process.env.CHATTERBOX_TEST_KEY;
  if (supplied && expected) {
    const actual = Buffer.from(supplied, "utf8");
    const wanted = Buffer.from(expected, "utf8");
    if (actual.length === wanted.length && timingSafeEqual(actual, wanted)) return true;
  }
  return verifierCode(request.headers.get("x-bia-code")).ok;
}

function splitText(text: string) {
  const parts: string[] = [];
  let words: string[] = [];
  const flush = () => {
    if (words.length) parts.push(words.join(" "));
    words = [];
  };
  for (const word of text.trim().split(/\s+/).filter(Boolean)) {
    if (word.length > MAX_CHARS) {
      flush();
      // Split exceptional unbroken tokens without cutting a Unicode surrogate.
      let fragment = "";
      for (const char of word) {
        if ((fragment + char).length > MAX_CHARS) {
          parts.push(fragment);
          fragment = "";
        }
        fragment += char;
      }
      if (fragment) parts.push(fragment);
      continue;
    }
    if (words.length >= MAX_WORDS || [...words, word].join(" ").length > MAX_CHARS) flush();
    words.push(word);
    if (/[.!?;:]$/.test(word)) flush();
  }
  flush();
  return parts;
}

export async function POST(request: NextRequest) {
  if (!authorized(request)) {
    return NextResponse.json({ erreur: "code", error: "Code d’accès BIA refusé." }, { status: 401 });
  }
  const body = await request.json().catch(() => null);
  if (!body || typeof body.texte !== "string" || body.texte.length > 20000) {
    return NextResponse.json({ error: "Texte requis, 20 000 caractères au maximum." }, { status: 400 });
  }
  const partie = body.partie === undefined ? 0 : Number(body.partie);
  if (!Number.isSafeInteger(partie) || partie < 0) {
    return NextResponse.json({ error: "Numéro de partie invalide." }, { status: 400 });
  }
  const parts = splitText(body.texte);
  const headers = { "cache-control": "no-store" };
  const common = {
    parties: parts.length, partie,
    langue: body.langue === "fr" ? "fr" : "wo",
    moteur: "chatterbox-step220-male", engine: "chatterbox-step220", voice: "male",
  };
  // BIA speculatively requests parts 0 and 1 even for a one-part answer.
  if (partie >= parts.length) {
    return NextResponse.json({ ...common, audio: null }, { headers });
  }
  const serverKey = process.env.CHATTERBOX_TEST_KEY;
  if (!serverKey || !process.env.CHATTERBOX_TEST_URL) {
    return NextResponse.json({ ...common, audio: null, error: "Le moteur Chatterbox de test n’est pas configuré." }, { status: 503, headers });
  }
  const started = Date.now();
  const id = createHash("sha256")
    .update(JSON.stringify([process.env.CHATTERBOX_TEST_URL, serverKey, "male", parts[partie]]))
    .digest("hex");
  let pending = inFlight.get(id);
  const shared = Boolean(pending);
  if (!pending) {
    if (inFlight.size >= 32) {
      return NextResponse.json({ ...common, audio: null, error: "Le moteur de test est occupé. Réessaie dans un instant." }, { status: 429, headers });
    }
    pending = (async () => {
      // This is an internal function call. The GPU key is never sent to the phone.
      const response = await testSynthesis(new NextRequest(request.url, {
        method: "POST",
        headers: { "content-type": "application/json", "x-chatterbox-test-key": serverKey },
        body: JSON.stringify({ input: { text: parts[partie], voice: "male" } }),
      }));
      return { status: response.status, data: await response.json() };
    })();
    inFlight.set(id, pending);
  }
  try {
    const { status, data } = await pending;
    if (status !== 200 || data.status !== "COMPLETED" || data.output?.voice !== "male") {
      return NextResponse.json({
        ...common, audio: null,
        error: data.error || "Le moteur n’a pas rendu la voix masculine demandée.",
        ...(status === 401 ? { erreur: "code" } : {}),
      }, { status: status === 200 ? 502 : status, headers });
    }
    const output = data.output;
    return NextResponse.json({
      ...common, audio: output.audio_base64, type_mime: "audio/wav",
      fabrication_ms: Date.now() - started, encodage_ms: 0,
      generation_ms: output.generation_ms, duration_seconds: output.duration_seconds,
      sample_rate: output.sample_rate,
      checkpoint_step: output.checkpoint_step,
      checkpoint_sha256: output.checkpoint_sha256,
      requete_partagee: shared,
    }, { headers });
  } catch {
    return NextResponse.json({ ...common, audio: null, error: "Le moteur Chatterbox de test ne répond pas." }, { status: 502, headers });
  } finally {
    if (inFlight.get(id) === pending) inFlight.delete(id);
  }
}
