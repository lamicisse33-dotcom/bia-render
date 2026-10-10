import { detecterLangue } from "@/lib/langue";
import { NextRequest, NextResponse } from "next/server";
import { createHash, timingSafeEqual } from "node:crypto";
import { verifierCode } from "@/lib/codes";
import { POST as testSynthesis } from "../route";
import { noterChatterboxTest } from "@/lib/chatterbox-test-etat";
import { decouperVoixKhalam } from "@/lib/decoupage-voix-khalam";
import { texteKhalamVoix } from "@/lib/texte-khalam-voix";
import { CacheAccusesLecon } from "@/lib/cache-accuses-lecon";
import { prononciationsApprises } from "@/lib/lexique-apprentissage";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const maxDuration = 100;

const inFlight = new Map<string, Promise<{ status: number; data: any }>>();
const accuses = new CacheAccusesLecon<{status:number; data:any}>();

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

export async function POST(request: NextRequest) {
  if (!authorized(request)) {
    return NextResponse.json({ erreur: "code", error: "Code d’accès BIA refusé." }, { status: 401 });
  }
  const body = await request.json().catch(() => null);
  if (!body || typeof body.texte !== "string" || body.texte.length > 20000) {
    return NextResponse.json({ error: "Texte requis, 20 000 caractères au maximum." }, { status: 400 });
  }
  if (body.voice !== undefined && body.voice !== "male" && body.voice !== "female") {
    return NextResponse.json({ error: "Choisis la voix homme ou femme." }, { status: 400 });
  }
  const voice: "male" | "female" = body.voice ?? "male";
  const partie = body.partie === undefined ? 0 : Number(body.partie);
  if (!Number.isSafeInteger(partie) || partie < 0) {
    return NextResponse.json({ error: "Numéro de partie invalide." }, { status: 400 });
  }
  const langue = body.langue === "fr" || body.langue === "wo" ? body.langue : detecterLangue(body.texte);
  let textePrononce: string;
  try { textePrononce = await prononciationsApprises(texteKhalamVoix(body.texte), langue); }
  catch { return NextResponse.json({error:"Le lexique n'a pas répondu. Réessaie."},{status:503}); }
  const parts = decouperVoixKhalam(textePrononce);
  const headers = { "cache-control": "no-store" };
  const common = {
    parties: parts.length, partie,
    langue: langue,
    moteur: `khalam-voice-${voice}`, engine: "KHALAM Voice", voice,
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
    .update(JSON.stringify([process.env.CHATTERBOX_TEST_URL, serverKey, voice, common.langue, "language-profiles-v2", parts[partie]]))
    .digest("hex");
  const cached = accuses.get(id, parts[partie]);
  let pending = cached ? Promise.resolve(cached) : inFlight.get(id);
  const shared = Boolean(pending);
  if (!pending) {
    if (inFlight.size >= 32) {
      return NextResponse.json({ ...common, audio: null, error: "Le moteur de test est occupé. Réessaie dans un instant." }, { status: 429, headers });
    }
    pending = (async () => {
      try {
        // This is an internal function call. The GPU key is never sent to the phone.
        const response = await testSynthesis(new NextRequest(request.url, {
          method: "POST",
          headers: { "content-type": "application/json", "x-chatterbox-test-key": serverKey },
          body: JSON.stringify({ input: { text: parts[partie], voice, language: common.langue } }),
        }));
        const data = await response.json();
        // Count one real generation, even when multiple requests share it.
        const ok = response.status === 200 && data.status === "COMPLETED" && data.output?.voice === voice;
        noterChatterboxTest(voice, ok ? { ok: true, generationMs: data.output.generation_ms } : { ok: false, code: data.code, status: response.status });
        return { status: response.status, data };
      } catch (error) {
        noterChatterboxTest(voice, { ok: false, code: "ERREUR_INTERNE" });
        throw error;
      }
    })();
    inFlight.set(id, pending);
  }
  try {
    const { status, data } = await pending;
    if (status !== 200 || data.status !== "COMPLETED" || data.output?.voice !== voice) {
      return NextResponse.json({
        ...common, audio: null,
        error: data.error || "Le moteur n’a pas rendu la voix demandée.",
        code: data.code || "AUDIO_INVALIDE",
        ...(status === 401 ? { erreur: "code" } : {}),
      }, { status: status === 200 ? 502 : status, headers: { ...headers, ...(status === 429 ? { "retry-after": "2" } : {}) } });
    }
    const output = data.output;
    // Cache only successfully validated audio from the active trained model.
    if (!cached && output.checkpoint_sha256 === "8320e6788427029dcaf7aeea8e54124f172dd7cdd12d7fcf658cf616c0c21e9f") {
      accuses.set(id, parts[partie], {status, data});
    }
    return NextResponse.json({
      ...common, audio: output.audio_base64, type_mime: "audio/wav",
      fabrication_ms: Date.now() - started, encodage_ms: 0,
      generation_ms: output.generation_ms, duration_seconds: output.duration_seconds,
      sample_rate: output.sample_rate,
      checkpoint_step: output.checkpoint_step,
      checkpoint_sha256: output.checkpoint_sha256,
      requete_partagee: shared,
      audio_en_cache: Boolean(cached),
    }, { headers });
  } catch {
    return NextResponse.json({ ...common, audio: null, error: "Le moteur Chatterbox de test ne répond pas." }, { status: 502, headers });
  } finally {
    if (inFlight.get(id) === pending) inFlight.delete(id);
  }
}


