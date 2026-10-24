import { NextRequest, NextResponse } from "next/server";
import { SENSIBILITE_DEBUT, SENSIBILITE_FIN, prefixePartMs, silenceFinDeParoleMs } from "@/lib/fin-de-parole";

/* ── POURQUOI GOOGLE FERME LA CONNEXION — LA MESURE, PAS LA DEVINETTE ─────

   Lamine, le 24 octobre 2026 : « Khalam Rapide affiche "Khalam Rapide a
   fermé la connexion" et ne répond plus. Ça arrive juste après ton
   déploiement du silence à 1 200 ms. Trouve la raison exacte. »

   LE DÉFAUT DE MESURE EST LE MIEN, ENCORE. Dans lib/gemini-live-client.ts,
   une fermeture AVANT `setupComplete` faisait :
       if(!established){reject(Error('Khalam Rapide a fermé la connexion.'));return;}
   — sans code, sans motif, sans rien remonter. Le seul cas où Google nous
   DIT pourquoi il refuse était précisément le cas qu'on jetait.

   CETTE ROUTE REJOUE LA POIGNÉE DE MAIN, variante par variante, et rend le
   CODE et le MOTIF de fermeture. Elle n'envoie aucun audio et ne produit
   aucune réponse : elle ouvre, envoie le setup, et note ce qui revient.
   Coût : un jeton éphémère, aucune inférence.

   ── POURQUOI ELLE EST OUVERTE, COMME /api/etat ───────────────────────────

   Même raison qu'au 12 septembre : le jour où plus rien ne marche, il ne
   faut pas d'un code valide pour savoir pourquoi — et aujourd'hui est ce
   jour-là. Elle ne rend que des codes, des motifs et des booléens ; aucune
   consigne, aucune phrase, aucune clé. Et elle est bornée à un essai toutes
   les quinze secondes pour qu'elle ne puisse pas servir à autre chose. */

export const dynamic = "force-dynamic";

const cle = () => process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY || "";
const g = globalThis as typeof globalThis & { biaEssaiLive?: number };

/* Une consigne COURTE : on teste la poignée de main, pas la taille du socle.
   Si la variante « consigne entière » devient nécessaire, elle sera ajoutée
   à part — mélanger deux changements dans un essai, c'est ne rien apprendre. */
const CONSIGNE = "Tu es Bia. Réponds en français ou en wolof.";

type Variante = { nom: string; setup: Record<string, unknown> };

function variantes(): Variante[] {
  const modele = "models/" + (process.env.GEMINI_LIVE_MODEL || "gemini-3.8-live").replace(/^models\//, "");
  const base = () => ({
    model: modele,
    generationConfig: { responseModalities: ["AUDIO"] },
    systemInstruction: { parts: [{ text: CONSIGNE }] },
    inputAudioTranscription: {}, outputAudioTranscription: {},
  });
  const detection = (silence: number, prefixe: number) => ({
    automaticActivityDetection: {
      startOfSpeechSensitivity: SENSIBILITE_DEBUT, endOfSpeechSensitivity: SENSIBILITE_FIN,
      prefixPaddingMs: prefixe, silenceDurationMs: silence,
    },
    activityHandling: "START_OF_ACTIVITY_INTERRUPTS",
  });
  const outil = {
    functionDeclarations: [{ name: "chercher_connaissances", description: "Lire la mémoire.",
      parameters: { type: "OBJECT", properties: { question: { type: "STRING" } }, required: ["question"] } }],
  };
  return [
    /* On change UNE chose à la fois. Deux changements dans un essai, et on
       ne saurait pas lequel a parlé. */
    { nom: "nu", setup: base() },
    { nom: "silence_500", setup: { ...base(), realtimeInputConfig: detection(500, 150) } },
    { nom: "silence_1200", setup: { ...base(), realtimeInputConfig: detection(silenceFinDeParoleMs(), prefixePartMs()) } },
    { nom: "silence_1200_sans_prefixe", setup: { ...base(), realtimeInputConfig: detection(1200, 150) } },
    { nom: "outil_seul", setup: { ...base(), tools: [outil] } },
    { nom: "recherche_seule", setup: { ...base(), tools: [{ googleSearch: {} }] } },
    { nom: "recherche_plus_outil", setup: { ...base(), tools: [{ googleSearch: {} }, outil] } },
    { nom: "compression", setup: { ...base(), contextWindowCompression: { triggerTokens: "60000", slidingWindow: { targetTokens: "30000" } } } },
    { nom: "reprise_et_historique", setup: { ...base(), sessionResumption: {}, historyConfig: { initialHistoryInClientContent: true } } },
  ];
}

const sansCle = (t: string) => (cle() ? String(t).split(cle()).join("[clé masquée]") : String(t)).slice(0, 300);

async function essayer(v: Variante) {
  const debut = Date.now();
  let jeton = "";
  try {
    const r = await fetch("https://generativelanguage.googleapis.com/v1beta/auth_tokens", {
      method: "POST", headers: { "x-goog-api-key": cle(), "Content-Type": "application/json" },
      body: JSON.stringify({
        uses: 1,
        expireTime: new Date(Date.now() + 5 * 60000).toISOString(),
        newSessionExpireTime: new Date(Date.now() + 60000).toISOString(),
        bidiGenerateContentSetup: v.setup,
      }),
      signal: AbortSignal.timeout(15000),
    });
    const d = await r.json().catch(() => ({})) as { name?: string; error?: { message?: string; status?: string } };
    if (!r.ok || typeof d.name !== "string")
      return { variante: v.nom, etape: "jeton", accepte: false, statut_jeton: r.status,
        motif: sansCle(d.error?.message || d.error?.status || "jeton refusé"), ms: Date.now() - debut };
    jeton = d.name;
  } catch (e) {
    return { variante: v.nom, etape: "jeton", accepte: false, motif: sansCle((e as Error).message), ms: Date.now() - debut };
  }

  /* La poignée de main elle-même. On note le code ET le motif : un code 1006
     sans motif veut dire « coupé sans explication », et ce n'est pas la même
     chose qu'un 1007 qui en donne une. */
  return await new Promise<Record<string, unknown>>((fini) => {
    let repondu = false;
    const rendre = (v2: Record<string, unknown>) => { if (!repondu) { repondu = true; fini({ variante: v.nom, ms: Date.now() - debut, ...v2 }); } };
    let ws: WebSocket;
    try {
      ws = new WebSocket("wss://generativelanguage.googleapis.com/ws/google.ai.generativelanguage.v1beta.GenerativeService.BidiGenerateContentConstrained?access_token=" + encodeURIComponent(jeton));
    } catch (e) { rendre({ etape: "websocket", accepte: false, motif: sansCle((e as Error).message) }); return; }
    const minuteur = setTimeout(() => { try { ws.close(); } catch { /* déjà fermé */ } rendre({ etape: "attente", accepte: false, motif: "aucune réponse en 12 s" }); }, 12000);
    ws.onopen = () => ws.send(JSON.stringify({ setup: v.setup }));
    ws.onmessage = async (e: MessageEvent) => {
      try {
        const brut = typeof e.data === "string" ? e.data : await (e.data as Blob).text();
        const d = JSON.parse(brut) as { setupComplete?: unknown; error?: { message?: string; code?: number } };
        if (d.setupComplete) { clearTimeout(minuteur); try { ws.close(); } catch { /* ok */ } rendre({ etape: "setup", accepte: true }); return; }
        if (d.error) { clearTimeout(minuteur); try { ws.close(); } catch { /* ok */ } rendre({ etape: "setup", accepte: false, code_erreur: d.error.code, motif: sansCle(d.error.message || "erreur sans message") }); }
      } catch { /* message illisible : la fermeture dira le reste */ }
    };
    ws.onclose = (e: CloseEvent) => {
      clearTimeout(minuteur);
      rendre({ etape: "fermeture", accepte: false, code: e.code, motif: sansCle(e.reason || "(aucun motif donné par Google)") });
    };
    ws.onerror = () => { /* onclose suit toujours, et lui porte le code */ };
  });
}

export async function GET(request: NextRequest) {
  if (!cle()) return NextResponse.json({ erreur: "aucune clé Gemini sur ce serveur" }, { status: 503 });
  const maintenant = Date.now();
  if (g.biaEssaiLive && maintenant - g.biaEssaiLive < 15000)
    return NextResponse.json({ erreur: "un essai toutes les quinze secondes" }, { status: 429 });
  g.biaEssaiLive = maintenant;

  const demande = new URL(request.url).searchParams.get("variante");
  const liste = demande ? variantes().filter((v) => v.nom === demande) : variantes();
  if (!liste.length) return NextResponse.json({ erreur: "variante inconnue", connues: variantes().map((v) => v.nom) }, { status: 400 });

  /* En série : deux poignées de main simultanées donneraient des refus pour
     cadence, et on les prendrait pour des refus de configuration. */
  const resultats = [];
  for (const v of liste) resultats.push(await essayer(v));

  return NextResponse.json({
    revision: "essai-poignee-de-main-v1",
    reglage_en_service: { silence_ms: silenceFinDeParoleMs(), prefixe_ms: prefixePartMs() },
    modele: process.env.GEMINI_LIVE_MODEL || "gemini-3.8-live",
    resultats,
    refusees: resultats.filter((r) => !r.accepte).map((r) => r.variante),
    limite: "Consigne COURTE : cet essai mesure la poignée de main, pas la taille du socle. Aucun audio, aucune réponse produite.",
  }, { headers: { "cache-control": "no-store" } });
}
