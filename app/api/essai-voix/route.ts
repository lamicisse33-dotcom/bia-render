import { NextRequest, NextResponse } from "next/server";
import { verifierCode } from "@/lib/codes";
import { voixConfig, viaRunPod, hoquetsDeLaVoixRunPod } from "@/lib/voix";
import { noterEssaiVoix } from "@/lib/etapes";

/* ── LE TEST QUI DÉCIDE DU RESTE ─────────────────────────────────────────────

   Lamine, le 15 septembre 2026 :

     « Il faut maintenant tester la durée de fabrication en fonction de la
       longueur du texte. C'est capital. […] Si 20–50 caractères mettent encore
       environ 3 à 4 secondes, alors je considérerais le verdict comme clair :
       il faut tester un autre moteur vocal pour BIA. […] Le critère n°1 doit
       être : temps avant le premier audio — pas seulement le temps total. »

   IL A RAISON SUR LE CRITÈRE, et c'est lui qui a dicté la forme de ce
   fichier. Un moteur qui met quatre secondes à tout rendre d'un coup et un
   moteur qui commence à rendre de l'audio au bout de huit cents millisecondes
   peuvent avoir le MÊME temps total et ne pas se ressembler du tout à
   l'oreille. On mesure donc les deux, et c'est le premier qui classe.

   ── DEUX QUESTIONS, ET ELLES SE POSENT ENSEMBLE ────────────────────────────

   1. EST-CE QUE LA DURÉE SUIT LA LONGUEUR ? Si oui, on garde le moteur et on
      découpe : la première phrase part seule, BIA la dit pendant qu'on
      fabrique la suivante. Si non, la latence est fixe et découper ne rendra
      rien.

   2. UN AUTRE MOTEUR FERAIT-IL MIEUX ? Sa liste : Soynade, OpenAI, et Oolel
      auto-hébergé. On ne peut pas répondre à la première sans pouvoir
      répondre à la seconde le même jour — sinon on décide à l'aveugle.

   Cette route interroge donc TOUS les moteurs dont la clé est présente sur le
   serveur, aux mêmes cinq longueurs, et les met côte à côte. Le jour où
   Lamine pose une clé OpenAI dans Render, le même bouton compare les deux
   sans qu'une ligne ne change.

   RIEN N'EST BRANCHÉ SUR BIA. Ce fichier MESURE ; il ne change pas le moteur
   qui parle. lib/voix.ts reste seul maître de ce que BIA emploie, et il ne
   bouge que sur sa décision à lui.

   ── POURQUOI UNE ROUTE, ET PAS UN SCRIPT ───────────────────────────────────

   Les clés vivent sur le serveur et doivent y rester : elles ne passent ni
   par la conversation, ni par une ligne de commande, ni par moi. Le seul
   endroit d'où l'on peut mesurer le vrai appel est donc le serveur lui-même.
   Lamine appuie sur un bouton dans /vitesse, et les chiffres reviennent.

   ── CE QU'ON ENVOIE ────────────────────────────────────────────────────────

   Du français, de ma main. Pas du wolof : je n'en écris pas, et pour une
   mesure de LATENCE la langue ne change rien d'utile — c'est la longueur
   qu'on fait varier, et elle seule. La comparaison de QUALITÉ wolof, elle,
   se fera sur ses dix phrases à lui, et c'est un autre travail.

   RÉSERVÉ AU CODE MAÎTRE, et pas par discrétion : ces appels se paient. Un
   testeur ne doit pas pouvoir ouvrir le robinet en rechargeant une page.   */

const PHRASE = "Je regarde ce que tu me demandes et je te réponds tout de suite, "
  + "sans attendre, parce que c'est exactement ce qu'il faut faire quand quelqu'un "
  + "pose une question simple et qu'il attend la réponse en face de toi, dans la rue, "
  + "un matin ordinaire, alors que le marché commence à peine à se remplir de monde "
  + "et que chacun a mieux à faire que d'attendre une machine qui réfléchit trop.";

const LONGUEURS = [20, 50, 100, 200, 400];

/* Une voix ElevenLabs publique, celle de leur documentation. Ce n'est pas un
   secret et ce n'est pas la voix de BIA : elle ne sert qu'à mesurer un délai,
   le temps que Lamine en choisisse une pour de bon. Voir le moteur
   « elevenlabs » plus bas. */
const VOIX_PAR_DEFAUT = "21m00Tcm4TlvDq8ikWAM";

/* ── TROIS FOIS CHAQUE LONGUEUR ─────────────────────────────────────────────

   Le premier essai, le 15 septembre 2026, a rendu ceci :
     20 signes → 3,4 s      50 signes → 2,6 s      100 signes → 3,5 s
   Cinquante signes plus RAPIDES que vingt : c'est du bruit, pas une mesure.
   Un appel isolé porte la gigue du réseau, l'état de la file d'attente chez
   le fournisseur, et le hasard. Sur ces chiffres-là on allait décider s'il
   faut changer de moteur de voix — et une décision pareille ne se prend pas
   sur un seul tirage.

   Trois fois chaque longueur, et on garde la MÉDIANE. Quinze appels au lieu
   de cinq : ça se paie, mais bien moins cher qu'une semaine passée sur le
   mauvais chantier. */
const REPRISES = 3;

type Mesure = { signes: number; premier_ms: number; fin_ms: number; octets: number;
  ms_par_signe: number; prises?: number; motif?: string };

/** Un appel, chronométré aux trois instants qu'il a nommés.

    `fetch` rend la main quand les EN-TÊTES sont là — donc au premier octet du
    corps. C'est ça, FIRST_AUDIO_BYTE, et c'est le seul moment où la
    différence entre un moteur qui coule et un moteur qui bufférise se voit. */
async function chronometrer(appel: () => Promise<Response>): Promise<{ premier: number; fin: number; octets: number }> {
  const parti = Date.now();
  const r = await appel();
  const premier = Date.now();
  if (!r.ok) throw new Error(`${r.status} : ${(await r.text().catch(() => "")).slice(0, 120)}`);
  const octets = (await r.arrayBuffer()).byteLength;
  return { premier: premier - parti, fin: Date.now() - parti, octets };
}

/* ── LES MOTEURS, ET LEURS CLÉS ─────────────────────────────────────────────
   Chacun n'est essayé que si sa clé existe. Un moteur absent n'est pas une
   panne : c'est une comparaison qu'on ne peut pas encore faire, et on le dit
   au lieu de le taire. */
type Moteur = { nom: string; pret: boolean; motif?: string; appeler: (texte: string) => Promise<Response> };

function lesMoteurs(): Moteur[] {
  const s = voixConfig.soynade;
  const e = voixConfig.elevenlabs;
  const cleOpenAI = process.env.OPENAI_API_KEY || process.env.OPENAI_CLE || "";
  const rp = voixConfig.runpod;
  return [
    {
      /* Notre moteur (voix de Kha, RunPod) : pas de flux, la réponse arrive
         entière — le premier octet est donc la fin. C'est le réveil de la
         machine qui fait la différence ici, pas la longueur du texte. */
      nom: "runpod",
      pret: Boolean(rp.url && rp.cle),
      motif: rp.url && rp.cle ? "" : "VOIX_RUNPOD_URL ou RUNPOD_API_KEY absente",
      appeler: async (texte) => {
        const p = await viaRunPod(texte, "wo", undefined, "essai");
        if (!p) throw new Error(hoquetsDeLaVoixRunPod().dernier_rate || "notre moteur n'a pas répondu");
        return new Response(new Uint8Array(p.audio), { headers: { "content-type": p.typeMime } });
      },
    },
    {
      nom: "soynade",
      pret: Boolean(s.apiKey),
      motif: s.apiKey ? "" : "SOYNADE_API_KEY absente",
      appeler: (texte) => fetch(`${s.baseUrl.replace(/\/$/, "")}/v1/text-to-speech`, {
        method: "POST",
        headers: { Authorization: `Bearer ${s.apiKey}`, "content-type": "application/json", accept: "audio/wav" },
        body: JSON.stringify({ text: texte, language: "fr", output_format: "wav", model: s.model, seed: 0 }),
      }),
    },
    {
      /* ── LE MOTEUR QU'ON PEUT ESSAYER SANS RIEN DEMANDER À PERSONNE ────

         Lamine, le 15 septembre 2026 : « est-ce que ça nécessite forcément
         une clé pour le test ? »

         Pour OpenAI, oui : on ne peut pas appeler un service payant sans
         s'identifier auprès de lui. Mais pour celui-ci, LA CLÉ EST DÉJÀ LÀ —
         c'est ElevenLabs qui transcrit ce que Lamine dit, tous les jours,
         depuis des semaines. Il ne manquait qu'un identifiant de VOIX, et un
         identifiant de voix n'est pas un secret : c'est une référence
         publique, la même pour tout le monde.

         On en met donc une par défaut, et la comparaison peut se faire
         AUJOURD'HUI, sans qu'il ait à ouvrir Render ni à créer un compte.

         CETTE VOIX NE SERT QU'À MESURER UN DÉLAI. Elle ne parle pas wolof et
         n'a rien à voir avec celle de BIA ; on ne l'emploie nulle part
         ailleurs. Le jour où Lamine choisira une vraie voix, il posera
         ELEVENLABS_VOICE_FR et c'est celle-là qui sera mesurée. */
      nom: "elevenlabs",
      pret: Boolean(e.apiKey),
      motif: e.apiKey ? "" : "ELEVENLABS_API_KEY absente",
      appeler: (texte) => fetch(
        `https://api.elevenlabs.io/v1/text-to-speech/${e.voiceFr || e.voiceWo || VOIX_PAR_DEFAUT}/stream`
        + "?optimize_streaming_latency=3", {
        method: "POST",
        headers: { "xi-api-key": e.apiKey, "content-type": "application/json", accept: "audio/mpeg" },
        /* Le modèle RAPIDE pour la mesure, pas celui de la lecture soignée :
           la question posée est « est-ce qu'un moteur peut rendre de l'audio
           en moins d'une seconde », et c'est ce modèle-là qui y répond. */
        body: JSON.stringify({ text: texte, model_id: process.env.ELEVENLABS_TTS_RAPIDE || "eleven_flash_v2_5" }),
      }),
    },
    {
      /* Sa liste du 15 septembre : « OpenAI gpt-4o-mini-tts ». Il n'y a
         aucune clé sur le serveur aujourd'hui — le moteur apparaîtra ici,
         marqué « pas de clé », jusqu'au jour où il en posera une dans Render.
         Alors le même bouton comparera les deux, sans qu'une ligne change. */
      nom: "openai",
      pret: Boolean(cleOpenAI),
      motif: cleOpenAI ? "" : "OPENAI_API_KEY absente — à poser dans Render pour comparer",
      appeler: (texte) => fetch("https://api.openai.com/v1/audio/speech", {
        method: "POST",
        headers: { Authorization: `Bearer ${cleOpenAI}`, "content-type": "application/json" },
        body: JSON.stringify({
          model: process.env.OPENAI_TTS_MODEL || "gpt-4o-mini-tts",
          voice: process.env.OPENAI_TTS_VOIX || "alloy",
          input: texte,
          /* Le format qui COULE. En wav, le service doit connaître la taille
             avant d'écrire l'en-tête et bufférise tout : on mesurerait un
             faux « tout d'un coup » qui ne serait qu'un choix de format. */
          response_format: "mp3",
        }),
      }),
    },
  ];
}

/** Ce que deux points suffisent à dire : la latence fixe, et le prix du signe. */
/* Ce qu'on juge conversationnel. Au-delà, il n'y a pas de découpage qui
   sauve : même « waaw » coûterait ce prix-là, et Lamine l'a dit avant la
   mesure — « si 20–50 caractères demandent environ 3 à 4 secondes, Soynade
   a une latence fixe trop élevée pour une conversation temps réel ». */
const PLANCHER_TENABLE = 1500;

function lire(mesures: Mesure[]) {
  const bons = mesures.filter((m) => m.fin_ms > 0);
  if (bons.length < 2) {
    /* ── DIRE POURQUOI, PAS SEULEMENT QUE ─────────────────────────────────
       Le 15 septembre 2026, ElevenLabs a rendu cinq fois « 401 : the API key
       you used is missing the permission » — et la page affichait dessous
       « pas assez d'appels aboutis pour conclure », en vert, comme si de
       rien n'était. La cause était pourtant écrite en toutes lettres dans
       la réponse : cette clé sert à TRANSCRIRE, et n'a pas le droit de
       fabriquer de la voix. Ça ne se répare pas dans le code, ça se coche
       dans le compte — encore faut-il le dire. */
    const premier = mesures.find((m) => m.motif)?.motif || "";
    const refuse = /401|403|unauthorized|missing the permission/i.test(premier);
    return { plancher_ms: 0, ms_par_signe: 0, premier_octet_ms: 0, une_phrase_ms: 0, coule: false,
      verdict: refuse
        ? "la clé existe mais n'a pas le droit de fabriquer de la voix — c'est une permission "
          + "à cocher dans le compte du fournisseur, pas une ligne à changer ici"
        : premier
          ? `le moteur a refusé : ${premier.slice(0, 120)}`
          : "pas assez d'appels aboutis pour conclure" };
  }
  const petit = bons[0], grand = bons[bons.length - 1];
  /* ── LA DROITE PAR MOINDRES CARRÉS, PAS PAR LES DEUX BOUTS ──────────────
     Prendre le plus court et le plus long laissait TOUTE la mesure dépendre
     de deux appels — dont le plus court, qui est justement le plus bruité.
     Sur les chiffres du 15 septembre, les deux méthodes donnaient 3,0 s et
     2,1 s de plancher : un écart d'une seconde sur le nombre qui décide. */
  const n = bons.length;
  const sx = bons.reduce((a, m) => a + m.signes, 0);
  const sy = bons.reduce((a, m) => a + m.fin_ms, 0);
  const sxx = bons.reduce((a, m) => a + m.signes * m.signes, 0);
  const sxy = bons.reduce((a, m) => a + m.signes * m.fin_ms, 0);
  const denom = n * sxx - sx * sx;
  const parSigne = denom ? (n * sxy - sx * sy) / denom : 0;
  const plancher = Math.max(0, Math.round((sy - parSigne * sx) / n));
  /* LE CRITÈRE N°1, SES MOTS : « temps avant le premier audio, pas seulement
     le temps total ». On prend celui du texte le plus COURT — c'est celui
     d'une première phrase, donc celui qu'on entendrait vraiment. */
  const premier = petit.premier_ms || petit.fin_ms;
  const coule = grand.fin_ms - grand.premier_ms > Math.max(300, grand.fin_ms * 0.25);
  /* Une première phrase fait une quarantaine de signes. C'est CE prix-là que
     BIA paierait si on découpait — pas la pente, pas le plancher : la somme
     des deux, dite en une fois. */
  const unePhrase = Math.round(plancher + parSigne * 40);

  /* ── LE VERDICT, ET CE QU'IL AVAIT DE FAUX ──────────────────────────────

     La première version ne regardait que la PENTE : « la durée suit la
     longueur, donc découper fera parler BIA plus tôt ». C'était vrai, et
     c'était trompeur. Sur les chiffres du 15 septembre la pente est bien
     réelle — 21 ms par signe — mais le PLANCHER est de deux secondes, et
     aucun découpage ne descend sous un plancher. On aurait découpé, gagné
     une seconde et demie sur les longues réponses, et conclu qu'on avait
     réglé la lenteur alors que « waaw » coûterait encore trois secondes.

     C'est le plancher qui décide, et le seuil est le sien. */
  const verdict = plancher > PLANCHER_TENABLE
    ? `PLANCHER de ${(plancher / 1000).toFixed(1)} s : même une phrase minuscule le paie, et aucun `
      + `découpage ne passe dessous. Une première phrase coûterait ${(unePhrase / 1000).toFixed(1)} s. `
      + `Découper reste utile sur les longues réponses (${Math.round(parSigne)} ms par signe), mais pour `
      + `une vraie conversation il faut un autre moteur.`
    : parSigne * 100 < 400
      ? `latence fixe basse (${(plancher / 1000).toFixed(1)} s) et peu sensible à la longueur : `
        + "rien à gagner à découper, et rien à réparer ici"
      : `plancher tenable (${(plancher / 1000).toFixed(1)} s) et la durée suit la longueur `
        + `(${Math.round(parSigne)} ms par signe) : découper par phrase fera parler BIA plus tôt, `
        + `une première phrase à ${(unePhrase / 1000).toFixed(1)} s`;

  return {
    plancher_ms: plancher,
    ms_par_signe: Math.round(parSigne * 10) / 10,
    premier_octet_ms: premier,
    une_phrase_ms: unePhrase,
    coule,
    verdict,
  };
}

export async function POST(request: NextRequest) {
  const verdict = verifierCode(request.headers.get("x-bia-code"));
  if (!verdict.ok || !verdict.maitre) {
    return NextResponse.json({ erreur: "Réservé au code maître." }, { status: 401 });
  }

  const moteurs = [];
  for (const m of lesMoteurs()) {
    if (!m.pret) { moteurs.push({ nom: m.nom, absent: true, motif: m.motif }); continue; }
    const mesures: Mesure[] = [];
    for (const n of LONGUEURS) {
      const texte = PHRASE.slice(0, n);
      const prises: Array<{ premier: number; fin: number; octets: number }> = [];
      let motif = "";
      for (let i = 0; i < REPRISES; i++) {
        try { prises.push(await chronometrer(() => m.appeler(texte))); }
        catch (err) { motif = (err as Error).message.slice(0, 160); }
      }
      if (!prises.length) {
        mesures.push({ signes: n, premier_ms: 0, fin_ms: 0, octets: 0, ms_par_signe: 0, motif });
        continue;
      }
      /* La médiane des trois — voir REPRISES. Un appel malchanceux ne doit
         pas décider s'il faut changer de moteur de voix. */
      const med = (v: number[]) => { const t = [...v].sort((a, b) => a - b); return t[Math.floor(t.length / 2)]; };
      const fin = med(prises.map((p) => p.fin));
      mesures.push({ signes: n, premier_ms: med(prises.map((p) => p.premier)), fin_ms: fin,
        octets: med(prises.map((p) => p.octets)), ms_par_signe: Math.round(fin / n),
        prises: prises.length, ...(motif ? { motif } : {}) });
    }
    moteurs.push({ nom: m.nom, absent: false, resultats: mesures, ...lire(mesures) });
  }

  /* Le moteur le plus rapide AVANT LE PREMIER AUDIO — son critère n°1, pas le
     temps total. Nommé ici pour qu'il n'ait pas à comparer cinq colonnes. */
  const presents = moteurs.filter((m) => !m.absent && (m as { premier_octet_ms?: number }).premier_octet_ms);
  const meilleur = presents.length > 1
    ? presents.slice().sort((a, b) =>
      ((a as { premier_octet_ms: number }).premier_octet_ms) - ((b as { premier_octet_ms: number }).premier_octet_ms))[0].nom
    : "";

  const essai = {
    quand: new Date().toISOString(),
    moteurs,
    meilleur_avant_le_premier_audio: meilleur,
    /* Les champs d'avant, gardés tels quels : la page les lit déjà, et un
       essai qui casse l'affichage ne se lirait pas. Ils portent le moteur
       qui parle aujourd'hui. */
    ...(() => {
      const a = moteurs.find((m) => m.nom === voixConfig.fournisseur && !m.absent) as
        (typeof moteurs[number] & { resultats?: Mesure[]; plancher_ms?: number;
          ms_par_signe?: number; verdict?: string }) | undefined;
      return {
        resultats: a?.resultats || [],
        plancher_ms: a?.plancher_ms || 0,
        ms_par_signe: a?.ms_par_signe || 0,
        verdict: a?.verdict || "le moteur qui parle aujourd'hui n'a pas répondu",
      };
    })(),
  };
  noterEssaiVoix(essai);
  return NextResponse.json(essai);
}
