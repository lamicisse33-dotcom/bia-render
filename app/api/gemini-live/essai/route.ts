import { NextRequest, NextResponse } from "next/server";
import { SENSIBILITE_DEBUT, SENSIBILITE_FIN, prefixePartMs, silenceFinDeParoleMs } from "@/lib/fin-de-parole";
import { noterSessionLive, resumeSessionsLive } from "@/lib/sessions-live-etat";

/** Combien de poignées de main d'essai ont déjà été faites aujourd'hui. */
const sessionsDEssaiAujourdhui = () =>
  Number(resumeSessionsLive().depuis_minuit.par_origine.essai || 0);

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

/* ── CETTE ROUTE ÉTAIT UN TROU, ET IL ÉTAIT DE MOI ───────────────────────

   Écrite hier soir pour trouver pourquoi Google refusait, elle ouvrait NEUF
   sessions quand on l'appelait sans préciser de variante — et elle était
   ouverte à tout internet, bornée à un appel toutes les quinze secondes.
   Pour qui la trouve : plus de deux mille sessions par heure, sur un quota
   gratuit qui en tolère quelques-unes.

   Je ne sais pas si quelqu'un l'a trouvée. Je sais que je l'avais laissée
   ouverte, et qu'elle a de toute façon consommé une douzaine de sessions de
   ma main. Trois bornes, maintenant :

     — UNE variante par appel par défaut, jamais les neuf ;
     — un plafond de vingt poignées de main par jour, tout compris ;
     — chaque ouverture comptée dans /api/etat, origine « essai », pour
       qu'on ne soit plus jamais réduit à supposer.

   Elle reste SANS CODE, et c'est la même raison qu'au 12 septembre pour
   /api/etat : le jour où plus rien ne marche, il ne faut pas d'un code
   valide pour savoir pourquoi. Mais elle ne peut plus coûter cher. */
const PLAFOND_JOUR = 20;

const cle = () => process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY || "";
const g = globalThis as typeof globalThis & { biaEssaiLive?: number; biaEssaisComplets?: number };

/* Une consigne COURTE : on teste la poignée de main, pas la taille du socle.
   Si la variante « consigne entière » devient nécessaire, elle sera ajoutée
   à part — mélanger deux changements dans un essai, c'est ne rien apprendre. */
const CONSIGNE = "Tu es Bia. Réponds en français ou en wolof.";

type Variante = { nom: string; setup: Record<string, unknown>; token?: string; verifierAudio?: boolean; historiqueEssai?: boolean; ecouter?: boolean };

/* ── ESSAYER UN AUTRE MODÈLE, SANS TOUCHER À LA PRODUCTION ────────────────
   Lamine : « vérifie si un autre modèle Live a un quota gratuit plus large
   — propose-le si la qualité wolof tient ». La page de quota de Google est
   derrière une connexion : impossible à lire d'ici. On MESURE donc à la
   place — une poignée de main par modèle dit s'il répond ou s'il refuse,
   et c'est une réponse, pas une citation. */
function variantes(modeleDemande = ""): Variante[] {
  const propre = String(modeleDemande || "").replace(/[^A-Za-z0-9._-]/g, "").slice(0, 60);
  const modele = "models/" + (propre || process.env.GEMINI_LIVE_MODEL || "gemini-3.8-live").replace(/^models\//, "");
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
    ...[false,true].map(historiqueEssai=>({nom:historiqueEssai?"client_historique":"client_vide",historiqueEssai,verifierAudio:true,setup:{...base(),sessionResumption:{},historyConfig:{initialHistoryInClientContent:true},realtimeInputConfig:detection(silenceFinDeParoleMs(),prefixePartMs())}})),
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
  /* Comptée AVANT la demande : un refus consomme le quota autant qu'une
     réussite. Ne compter que les réussites ferait croire à un essai gratuit. */
  if (!v.token) noterSessionLive("essai");
  let jeton = v.token || "";
  if (!jeton) try {
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
    let setupAccepte = false;
    const morceaux: Buffer[]=[]; let premierAudioMs=0;
    ws.onmessage = async (e: MessageEvent) => {
      try {
        const brut = typeof e.data === "string" ? e.data : await (e.data as Blob).text();
        const d = JSON.parse(brut) as { setupComplete?: unknown; error?: { message?: string; code?: number }; serverContent?: {turnComplete?:boolean; modelTurn?: {parts?: {inlineData?: {data?: string}}[]}} };
        if (d.setupComplete) {
          setupAccepte = true;
          if (v.verifierAudio) {
            if(v.historiqueEssai!==undefined){
              ws.send(JSON.stringify({clientContent:{turns:v.historiqueEssai?[{role:"user",parts:[{text:"Bonjour."}]},{role:"model",parts:[{text:"Bonjour, comment vas-tu ?"}]}]:[],turnComplete:true}}));
              ws.send(JSON.stringify({realtimeInput:{text:"Bonjour Bia. Dis simplement bonjour en français."}}));
            }else ws.send(JSON.stringify({clientContent:{turns:[{role:"user",parts:[{text:"Bonjour Bia. Réponds simplement bonjour en français pour cet essai technique."}]}],turnComplete:true}}));
          } else { clearTimeout(minuteur); try { ws.close(); } catch { /* ok */ } rendre({ etape: "setup", accepte: true }); }
          return;
        }
        if(v.verifierAudio){
          for(const p of d.serverContent?.modelTurn?.parts||[]){if(p.inlineData?.data){
            if(!premierAudioMs)premierAudioMs=Date.now()-debut;
            morceaux.push(Buffer.from(p.inlineData.data,'base64'));
          }}
          if(morceaux.length&&(!v.ecouter||d.serverContent?.turnComplete||morceaux.reduce((s,b)=>s+b.length,0)>=24000*2*6)){
            clearTimeout(minuteur);
            const pcm=Buffer.concat(morceaux);
            rendre({etape:"premier_audio",accepte:true,setup_accepte:setupAccepte,premier_audio_ms:premierAudioMs,...(v.ecouter?{pcm_base64:pcm.toString('base64'),frequence:24000,duree_s:pcm.length/48000}: {})});
            try{ws.close();}catch{}return;
          }
        }
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

  const url = new URL(request.url);
  const demande = url.searchParams.get("variante");
  const modele = url.searchParams.get("modele") || "";
  const toutes = url.searchParams.get("toutes") === "1";
  const audioCourt = url.searchParams.get("audio") === "1" && demande !== "session_complete";
  // Deux essais complets au maximum par démarrage, inclus dans le plafond
  // global. La configuration et le jeton ne quittent jamais le serveur.
  if (demande === "session_complete") {
    if ((g.biaEssaisComplets || 0) >= 2 || sessionsDEssaiAujourdhui() + (g.biaEssaisComplets || 0) >= PLAFOND_JOUR)
      return NextResponse.json({erreur:"plafond des essais complets atteint"},{status:429,headers:{"cache-control":"no-store"}});
    g.biaEssaiLive = maintenant; g.biaEssaisComplets = (g.biaEssaisComplets || 0) + 1;
    const {POST} = await import("../session/route");
    const response = await POST(new NextRequest("https://app.khalam.app/api/gemini-live/session",{method:"POST",headers:{"x-bia-code":process.env.BIA_CODE_MAITRE || "",origin:"https://app.khalam.app"}}));
    const data = await response.json();
    if (!response.ok) return NextResponse.json({variante:demande,etape:"session",accepte:false,http:response.status,fournisseur_http:data.statut_fournisseur,motif:sansCle(data.motif || data.erreur || "refus_session")},{headers:{"cache-control":"no-store"}});
    const resultat = await essayer({nom:demande,setup:data.setup,token:data.token,verifierAudio:true});
    return NextResponse.json({...resultat,consigne_signes:data.consigne_signes,connaissances:data.connaissances,limite:"Configuration de production et salutation technique depuis Render. Hors historique, microphone et réseau du téléphone. Aucun son ni contenu privé renvoyé."},{headers:{"cache-control":"no-store"}});
  }
  /* Par DÉFAUT une seule variante. Les neuf ne partent que si on le demande
     explicitement, et elles comptent dans le plafond comme les autres. */
  const liste = demande
    ? variantes(modele).filter((v) => v.nom === demande)
    : toutes ? variantes(modele) : variantes(modele).filter((v) => v.nom === "nu");

  const reste = PLAFOND_JOUR - sessionsDEssaiAujourdhui();
  if (liste.length > reste)
    return NextResponse.json({
      erreur: `plafond de ${PLAFOND_JOUR} poignées de main par jour atteint`,
      reste: Math.max(0, reste),
      pourquoi: "Chaque essai ouvre une session chez Google et consomme le quota comme une vraie conversation.",
    }, { status: 429 });
  g.biaEssaiLive = maintenant;
  if (!liste.length) return NextResponse.json({ erreur: "variante inconnue", connues: variantes().map((v) => v.nom) }, { status: 400 });

  /* En série : deux poignées de main simultanées donneraient des refus pour
     cadence, et on les prendrait pour des refus de configuration. */
  const resultats = [];
  for (const v of liste) resultats.push(await essayer(audioCourt ? {
    ...v,verifierAudio:true,ecouter:url.searchParams.get("ecouter")==="1",setup:{...v.setup,generationConfig:{
      ...(v.setup.generationConfig as Record<string,unknown>),maxOutputTokens:512,
      speechConfig:{voiceConfig:{prebuiltVoiceConfig:{voiceName:"Kore"}}},
    }},
  } : v));

  return NextResponse.json({
    revision: "essai-poignee-de-main-v1",
    reglage_en_service: { silence_ms: silenceFinDeParoleMs(), prefixe_ms: prefixePartMs() },
    modele: modele || process.env.GEMINI_LIVE_MODEL || "gemini-3.8-live",
    modele_en_service: process.env.GEMINI_LIVE_MODEL || "gemini-3.8-live",
    sessions: resumeSessionsLive(),
    resultats,
    refusees: resultats.filter((r) => !r.accepte).map((r) => r.variante),
    limite: audioCourt ? "Salutation synthétique courte uniquement. Aucun historique, devoir, lexique ou instruction privée. Premier paquet audio mesuré côté serveur, pas la lecture sur téléphone." : "Consigne COURTE : cet essai mesure la poignée de main, pas la taille du socle. Aucun audio, aucune réponse produite.",
  }, { headers: { "cache-control": "no-store" } });
}
