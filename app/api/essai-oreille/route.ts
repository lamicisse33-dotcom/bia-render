import { readFileSync } from "node:fs";
import { join } from "node:path";
import { NextRequest, NextResponse } from "next/server";
import { verifierCode } from "@/lib/codes";
import { ecouteConfig } from "@/lib/ecoute";
import { voixConfig } from "@/lib/voix";
import { pourScribe } from "@/lib/mots-a-entendre";
import { motsCorriges } from "@/lib/lexique";
import { TOUT, empreintesDesSons, normaliser, sonDe } from "@/lib/repertoire";
import { motsFaux } from "@/lib/mots-faux";
import { noterEssaiOreille } from "@/lib/etapes";

/* ── SIX JOURS DE WOLOF DEVINÉ, QUI SE VOYAIENT EN UNE SECONDE ───────────────

   Lamine, le 18 septembre 2026 au soir : « il faut voir ce que tu peux
   améliorer ou ce que tu dois améliorer. » Puis : « il n'y a rien à attendre
   pour demain. »

   Ce fichier est la réponse. Voici ce qu'il a coûté de ne pas l'avoir :

     — les cent mots corrigés qu'il m'a demandés le 12 septembre étaient
       REFUSÉS À CHAQUE ÉCOUTE pendant six jours. Un seul champ JSON au lieu
       d'un champ répété, et l'API répondait « All keywords must be less than
       50 characters ». Le compteur le disait depuis le premier soir. Personne
       ne l'a lu — pas lui : moi.
     — le même soir, j'ai imposé la langue du fil dès le premier appel. Ça
       rendait du charabia. Il l'a découvert en parlant à BIA, une heure plus
       tard, et c'est lui qui a dû me le dire.

   Les deux se voyaient en un appel. Il n'y avait aucun appel à faire.

   ── POURQUOI UNE ÉPREUVE NE SUFFISAIT PAS ──────────────────────────────────

   Les 74 épreuves de ce projet LISENT DU CODE. Elles ont laissé passer les
   deux fautes, et pire : l'une d'elles EXIGEAIT la première — elle vérifiait
   la présence de `JSON.stringify(mots)`, c'est-à-dire du défaut lui-même.

   Un motif de texte prouve qu'une chaîne existe. Il ne prouve jamais qu'un
   service extérieur l'accepte. Pour ça il faut appeler le service.

   ── CE QU'ON LUI FAIT ÉCOUTER, ET C'EST LÀ L'IDÉE ──────────────────────────

   Pas du silence, pas une phrase de synthèse : LES ENREGISTREMENTS DE KHA.

   Les 84 réponses du répertoire sont de vrais enregistrements de sa voix, en
   wolof de Dakar, dans un seau public qui se lit sans clé. Et surtout : ON
   CONNAÎT LE TEXTE EXACT de chacune, mot pour mot, puisque c'est Lamine qui
   l'a écrit et Kha qui l'a lu.

   C'est la seule matière au monde qui permette de répondre aux trois
   questions à la fois, sans que personne ne parle devant un téléphone :

     1. LES CENT MOTS SONT-ILS ACCEPTÉS ? C'est la panne des six jours. Un
        refus se voit au premier appel, motif compris.
     2. L'OREILLE RECONNAÎT-ELLE LE WOLOF ? Sur ses deux sessions du
        18 septembre, quatre-vingts écoutes, ZÉRO wolof — mais c'était son
        wolof à lui, dans le bruit, au téléphone. Sur un enregistrement propre
        de Kha, si c'est encore zéro, alors le moteur ne connaît pas la
        langue, un point final. Et ça décide du passage à Soynade.
     3. LES CENT MOTS SERVENT-ILS À QUELQUE CHOSE ? Personne ne l'a jamais
        mesuré, moi compris. On transcrit DEUX FOIS chaque son — avec les mots
        et sans — et on compare au texte connu. Si l'écart ne bouge pas, ces
        mots coûtent 20 % de surcoût pour rien et il faut les retirer.

     ── ET LA QUATRIÈME, AJOUTÉE LE 19 SEPTEMBRE AU MATIN ─────────────────

     Le premier essai, le 18 au soir, a répondu à la question 2 sans appel :
     ZÉRO wolof sur vingt écoutes d'enregistrements STUDIO de Kha, et 65 % de
     mots faux avec l'aide des cent mots (92 % sans). ElevenLabs annonce 25 à
     50 % : il ne tient même pas sa propre annonce.

     Lamine a écrit à Soynade. Leur réponse, le 19 à 01 h 48 :

       « ElevenLabs Scribe annonce supporter le Wolof, mais n'est pas au point
         d'après nos tests. Avez-vous essayé l'ASR de Soynade ? Nous proposons
         un modèle qui supporte l'ASR et qui est largement meilleur que
         ElevenLabs Scribe. »

     « Largement meilleur » est une phrase de commerçant jusqu'à ce qu'on la
     mesure — même quand elle vient de gens honnêtes, et ceux-là le sont : ils
     ont commencé par dire du mal d'un concurrent qu'ils auraient pu laisser
     croire bon.

     4. QUELLE OREILLE ENTEND LE MIEUX SON WOLOF ? Les deux, sur les MÊMES
        dix enregistrements, avec le même texte connu et le même calcul. Le
        chiffre décidera, pas l'annonce — ni la leur, ni celle d'ElevenLabs.

     RIEN N'EST BRANCHÉ SUR BIA PAR CET ESSAI. Il mesure deux oreilles ; c'est
     lib/ecoute.ts, et lui seul, qui décide de celle qui écoute vraiment.

   ── CE QUE ÇA NE FAIT PAS ──────────────────────────────────────────────────

   Ce fichier MESURE. Il ne change ni l'oreille, ni le micro, ni un réglage.
   `lib/ecoute.ts` reste seul maître de ce que BIA emploie.

   RÉSERVÉ AU CODE MAÎTRE, et pas par discrétion : ces appels se paient. Dix
   sons, deux appels chacun — c'est quelques secondes d'audio, mais un testeur
   ne doit pas pouvoir ouvrir le robinet en rechargeant une page.

   ── LA RÈGLE QUE CE FICHIER EXISTE POUR TENIR ──────────────────────────────

   Voir AVANT-DE-DIRE-QUE-C-EST-BON.md, règle 1 : ce qui touche l'oreille se
   mesure AVANT que je dise que c'est bon. À partir d'aujourd'hui, « c'est
   réparé » sur l'oreille veut dire « j'ai lu cet essai », et rien d'autre. */

/** Combien de sons on écoute. Dix suffisent à voir un refus et à trancher sur
    la langue ; au-delà on paie pour de la décimale. */
const COMBIEN = 10;

type UneEcoute = {
  texte: string;
  langue: string;
  ms: number;
  refus?: string;
};

/** Un appel réel à l'oreille. On rend le refus au lieu de le lancer : un
    refus EST le résultat qu'on cherche, la moitié du temps. */
async function ecouterVraiment(
  audio: ArrayBuffer, nom: string, mots: string[] | null,
): Promise<UneEcoute> {
  const c = ecouteConfig.elevenlabs;
  const form = new FormData();
  form.append("file", new Blob([audio], { type: "audio/mpeg" }), nom);
  form.append("model_id", c.model);
  /* LA FORME EXACTE DE lib/ecoute.ts, ET C'EST TOUT L'INTÉRÊT : un champ
     RÉPÉTÉ, une ligne par terme. Si quelqu'un remet un jour un seul champ
     JSON, cet essai le dira le jour même au lieu de six jours plus tard. */
  if (mots && mots.length) for (const m of mots) form.append("keyterms", m);
  const parti = Date.now();
  try {
    const r = await fetch("https://api.elevenlabs.io/v1/speech-to-text", {
      method: "POST",
      headers: { "xi-api-key": c.apiKey },
      body: form,
    });
    const ms = Date.now() - parti;
    if (!r.ok) {
      return { texte: "", langue: "", ms, refus: `${r.status} : ${(await r.text().catch(() => "")).slice(0, 200)}` };
    }
    const d = await r.json() as { text?: string; language_code?: string };
    return {
      texte: String(d.text || "").trim(),
      langue: String(d.language_code || "").toLowerCase(),
      ms,
    };
  } catch (err) {
    return { texte: "", langue: "", ms: Date.now() - parti, refus: (err as Error).message.slice(0, 200) };
  }
}

/* ── L'OREILLE DE SOYNADE ──────────────────────────────────────────────────

   Leur documentation, lue le 19 septembre au matin :

       POST https://api.soynade.ai/v1/audio/transcriptions
       Authorization: Bearer $SOYNADE_API_KEY
       -F file=@… -F language=wo -F response_format=json -F temperature=0.1

   Trois choses qui tombent bien, et une à surveiller :

     — le mp3 est accepté, donc les sons du répertoire partent TELS QUELS,
       sans conversion ni ffmpeg à installer sur Render ;
     — `language=wo` est un paramètre normal chez eux, pas un contournement :
       leur modèle EST wolof, il n'a pas à devenir wolof ;
     — la clé est déjà sur le serveur, c'est celle de la voix de Kha.

   CE QU'IL FAUT SURVEILLER : c'est le MÊME compte que la voix, et son crédit
   était épuisé hier soir. Un 402 ici ne voudra donc pas dire « leur oreille
   est mauvaise », mais « le compte est à sec » — et l'essai le dira en clair
   au lieu de laisser croire à un échec du modèle.

   On ne demande PAS de température différente de la leur : 0,1 est ce que
   leur exemple donne, et on mesure ce qu'ils livrent, pas ce que j'aurais
   réglé. */
async function chezSoynade(audio: ArrayBuffer, nom: string): Promise<UneEcoute> {
  const s = voixConfig.soynade;
  const form = new FormData();
  form.append("file", new Blob([audio], { type: "audio/mpeg" }), nom);
  form.append("language", "wo");
  form.append("response_format", "json");
  form.append("temperature", "0.1");
  const parti = Date.now();
  try {
    const r = await fetch(`${s.baseUrl.replace(/\/$/, "")}/v1/audio/transcriptions`, {
      method: "POST",
      headers: { Authorization: `Bearer ${s.apiKey}` },
      body: form,
    });
    const ms = Date.now() - parti;
    if (!r.ok) {
      const brut = (await r.text().catch(() => "")).slice(0, 200);
      return {
        texte: "", langue: "", ms,
        refus: r.status === 402
          ? `402 — le crédit du compte Soynade est épuisé, ce n'est pas l'oreille qui échoue : ${brut}`
          : `${r.status} : ${brut}`,
      };
    }
    /* On ne sait pas encore quel champ porte le texte : leur documentation ne
       le dit pas. On accepte donc les trois noms usuels, et si aucun ne
       répond on garde la réponse brute plutôt que de rendre un vide muet —
       c'est comme ça qu'on voit un format qui a changé. */
    const d = await r.json().catch(() => null) as
      { text?: string; transcription?: string; transcript?: string } | null;
    const texte = String(d?.text ?? d?.transcription ?? d?.transcript ?? "").trim();
    return {
      texte,
      langue: texte ? "wo (demandé)" : "",
      ms,
      ...(texte ? {} : { refus: `réponse sans texte reconnaissable : ${JSON.stringify(d).slice(0, 160)}` }),
    };
  } catch (err) {
    return { texte: "", langue: "", ms: Date.now() - parti, refus: (err as Error).message.slice(0, 200) };
  }
}

/* ── LA QUESTION QUI DÉCIDE DE L'ARCHITECTURE ──────────────────────────────

   Lamine, le 19 septembre au matin : « vas-y, ne m'attends pas, fais ce qu'il
   faut. »

   Ce qu'il faut, c'est arrêter d'attendre une réponse par mail sur une
   question qu'un appel tranche.

   LE PROBLÈME. Le téléphone enregistre en `webm/opus` sur Android et en
   `mp4/aac` sur iPhone. La documentation de Soynade annonce `wav`, `mp3`,
   `flac` — aucun des deux. Si leur API accepte quand même ce que le téléphone
   produit, il n'y a RIEN à convertir et on branche leur oreille aujourd'hui.
   Sinon il faut ffmpeg sur Render : une dépendance de plus, environ 50 ms par
   tour, et un déploiement par image au lieu du build ordinaire.

   Entre les deux, il y a une demi-journée de travail et une décision
   d'architecture. Elle se tranche en quatre appels.

   ── CE QU'ON ENVOIE, ET CE QUE ÇA NE MESURE PAS ───────────────────────────

   Le MÊME son, dans quatre emballages — voir public/essai/LISEZ-MOI.md. C'est
   un « mmm » de Kha, sans un seul mot : il n'y a donc PAS de texte attendu et
   PAS de taux de mots faux ici. On ne lit qu'une chose, et c'est la seule qui
   compte pour cette question : accepté, ou refusé, et le motif.

   La qualité se mesure ailleurs dans le même essai, sur les dix
   enregistrements PARLÉS dont on connaît le texte. Confondre les deux serait
   exactement la faute du 18 au soir — un filet posé sous le mauvais trou.

   ── ET LE POIDS, QUI DÉCIDE DU LIEU DE LA CONVERSION ──────────────────────

       opus 24 kbps    4 ko
       aac 32 kbps     5 ko
       wav 16 kHz     29 ko      ← sept fois plus

   C'est pour ça qu'on ne convertit pas DANS le téléphone : sur une connexion
   mobile à Dakar, ces sept fois se paient en secondes d'attente à chaque
   phrase. Si conversion il faut, elle est sur le serveur. */
const EMBALLAGES = [
  { nom: "webm / opus", fichier: "format-webm-opus.webm", type: "audio/webm", imite: "ce qu'enregistre un Android" },
  { nom: "mp4 / aac", fichier: "format-mp4-aac.m4a", type: "audio/mp4", imite: "ce qu'enregistre un iPhone" },
  { nom: "wav 16 kHz", fichier: "format-wav16.wav", type: "audio/wav", imite: "la conversion proposée" },
  { nom: "mp3", fichier: "format-mp3.mp3", type: "audio/mpeg", imite: "le témoin, on sait qu'il passe" },
];

async function quelsFormats() {
  const lignes = [];
  for (const e of EMBALLAGES) {
    let octets: Buffer | null = null;
    try { octets = readFileSync(join(process.cwd(), "public", "essai", e.fichier)); }
    catch (err) {
      lignes.push({ format: e.nom, imite: e.imite, absent: (err as Error).message.slice(0, 120) });
      continue;
    }
    const brut = octets.buffer.slice(octets.byteOffset, octets.byteOffset + octets.byteLength) as ArrayBuffer;
    const chez = async (qui: "soynade" | "elevenlabs") => {
      const r = qui === "soynade"
        ? await chezSoynade(brut, e.fichier)
        : await ecouterVraiment(brut, e.fichier, null);
      return r.refus ? { accepte: false, motif: r.refus.slice(0, 160) } : { accepte: true, ms: r.ms };
    };
    lignes.push({
      format: e.nom, imite: e.imite, octets: octets.byteLength,
      soynade: voixConfig.soynade.apiKey ? await chez("soynade") : { accepte: false, motif: "clé absente" },
      elevenlabs: await chez("elevenlabs"),
    });
  }
  return lignes;
}

export async function POST(request: NextRequest) {
  const verdict = verifierCode(request.headers.get("x-bia-code"));
  if (!verdict.ok || !verdict.maitre) {
    return NextResponse.json({ erreur: "Réservé au code maître." }, { status: 401 });
  }
  const c = ecouteConfig.elevenlabs;
  if (!c.apiKey) {
    return NextResponse.json({ erreur: "ELEVENLABS_API_KEY absente sur le serveur." }, { status: 503 });
  }

  /* ── ON NE PREND QUE LES SONS QUI EXISTENT VRAIMENT ────────────────────
     `empreintesDesSons()` liste ce qui est déposé dans le seau. Choisir dans
     la liste des entrées sans vérifier le dépôt, c'est mesurer des 404. */
  const deposes = new Set(Object.keys(empreintesDesSons())
    .filter((k) => k.startsWith("wo/")).map((k) => k.slice(3)));
  /* Les phrases les plus courtes d'abord : à texte connu, une phrase courte
     donne un taux de mots faux plus franc — une longue dilue la faute. Et
     l'ordre est déterministe, donc deux essais se comparent. */
  const choisies = TOUT
    .filter((e) => deposes.has(e.cle) && normaliser(e.wolof).split(" ").filter(Boolean).length >= 2)
    .sort((a, b) => a.wolof.length - b.wolof.length || a.cle.localeCompare(b.cle))
    .slice(0, COMBIEN);

  /* Les mêmes cent mots que BIA envoie en vrai. Si Supabase ne répond pas, la
     liste sans les corrections vaut mieux qu'un essai qu'on ne fait pas. */
  let mots: string[] = [];
  try { mots = pourScribe(await motsCorriges(60)); }
  catch { try { mots = pourScribe([]); } catch { mots = []; } }

  const lignes = [];
  for (const e of choisies) {
    const adresse = sonDe(e.cle, "wo", e.wolof);
    let audio: ArrayBuffer | null = null;
    let motifSon = "";
    try {
      const r = await fetch(adresse);
      if (r.ok) audio = await r.arrayBuffer();
      else motifSon = `le son ne se lit pas : ${r.status}`;
    } catch (err) { motifSon = (err as Error).message.slice(0, 120); }
    if (!audio) {
      lignes.push({ cle: e.cle, attendu: e.wolof, absent: true, motif: motifSon });
      continue;
    }

    /* DEUX APPELS, ET C'EST LA COMPARAISON QUI COMPTE. Avec les cent mots,
       puis sans. Personne n'avait jamais mesuré ce qu'ils apportent. */
    const avec = await ecouterVraiment(audio, `${e.cle}.mp3`, mots);
    const sans = await ecouterVraiment(audio, `${e.cle}.mp3`, null);
    /* LA TROISIÈME OREILLE, sur le MÊME son et le même texte connu. C'est la
       seule façon de comparer deux fournisseurs sans se fier à leurs
       annonces. Sautée si la clé n'est pas là — on le dira. */
    const soy = voixConfig.soynade.apiKey
      ? await chezSoynade(audio, `${e.cle}.mp3`)
      : { texte: "", langue: "", ms: 0, refus: "SOYNADE_API_KEY absente sur le serveur" };

    lignes.push({
      cle: e.cle,
      attendu: e.wolof,
      octets: audio.byteLength,
      avec_les_mots: {
        entendu: avec.texte, langue: avec.langue, ms: avec.ms,
        ...(avec.refus ? { refus: avec.refus } : {}),
        ...(avec.texte ? { mots_faux_pour_cent: motsFaux(e.wolof, avec.texte).part } : {}),
      },
      sans_les_mots: {
        entendu: sans.texte, langue: sans.langue, ms: sans.ms,
        ...(sans.refus ? { refus: sans.refus } : {}),
        ...(sans.texte ? { mots_faux_pour_cent: motsFaux(e.wolof, sans.texte).part } : {}),
      },
      soynade: {
        entendu: soy.texte, ms: soy.ms,
        ...(soy.refus ? { refus: soy.refus } : {}),
        ...(soy.texte ? { mots_faux_pour_cent: motsFaux(e.wolof, soy.texte).part } : {}),
      },
    });
  }

  /* ── LES TROIS VERDICTS, ÉCRITS EN CLAIR ───────────────────────────────
     Lamine ne doit pas avoir à lire dix lignes pour savoir si son oreille
     marche. Chaque question posée en haut de ce fichier a sa phrase. */
  const abouties = lignes.filter((l) => !l.absent) as Array<{
    avec_les_mots: { refus?: string; langue: string; mots_faux_pour_cent?: number; ms: number };
    sans_les_mots: { refus?: string; langue: string; mots_faux_pour_cent?: number; ms: number };
    soynade: { refus?: string; mots_faux_pour_cent?: number; ms: number };
  }>;
  const refusAvec = abouties.filter((l) => l.avec_les_mots.refus);
  const moyenne = (v: Array<number | undefined>) => {
    const n = v.filter((x): x is number => typeof x === "number");
    return n.length ? Math.round(n.reduce((a, b) => a + b, 0) / n.length) : null;
  };
  const fauxAvec = moyenne(abouties.map((l) => l.avec_les_mots.mots_faux_pour_cent));
  const fauxSans = moyenne(abouties.map((l) => l.sans_les_mots.mots_faux_pour_cent));
  const langues: Record<string, number> = {};
  for (const l of abouties) {
    for (const s of [l.avec_les_mots.langue, l.sans_les_mots.langue]) {
      if (s) langues[s] = (langues[s] || 0) + 1;
    }
  }
  const wolofReconnu = Object.keys(langues).filter((k) => /^wol?/.test(k))
    .reduce((n, k) => n + langues[k], 0);

  const essai = {
    quand: new Date().toISOString(),
    moteur: c.model,
    sons_ecoutes: abouties.length,
    mots_donnes: mots.length,
    langues_reconnues: langues,

    /* 1. LA PANNE DES SIX JOURS. */
    les_cent_mots: refusAvec.length === 0
      ? `acceptés : ${mots.length} termes passent, aucun refus sur ${abouties.length} sons`
      : `REFUSÉS sur ${refusAvec.length} son(s) sur ${abouties.length} — ${refusAvec[0].avec_les_mots.refus}`,

    /* 2. CE QUI DÉCIDE DU PASSAGE À SOYNADE. */
    le_wolof: !abouties.length
      ? "aucun son n'a pu être écouté"
      : wolofReconnu === 0
        ? `ZÉRO wolof reconnu sur ${abouties.length * 2} écoutes de la voix de Kha, sur des `
          + `enregistrements propres dont on connaît le texte. Ce moteur ne connaît pas la langue : `
          + `ce n'est ni le micro, ni le bruit, ni la prononciation. Il faut changer d'oreille.`
        : `${wolofReconnu} écoute(s) sur ${abouties.length * 2} ont reconnu le wolof`,

    /* 3. CE QUE PERSONNE N'AVAIT MESURÉ. */
    ce_que_les_cent_mots_apportent: fauxAvec === null || fauxSans === null
      ? "pas assez d'appels aboutis pour comparer"
      : fauxSans - fauxAvec >= 5
        ? `${fauxSans - fauxAvec} points de mots faux en moins (${fauxSans} % → ${fauxAvec} %) : `
          + `les cent mots servent, le surcoût de 20 % est payé pour quelque chose`
        : fauxAvec - fauxSans >= 5
          ? `ILS AGGRAVENT : ${fauxSans} % de mots faux sans eux, ${fauxAvec} % avec. `
            + `Ils tirent la transcription vers eux. À retirer.`
          : `aucun effet mesurable (${fauxSans} % sans, ${fauxAvec} % avec) : le surcoût de 20 % `
            + `ne paie rien. À retirer, ou à remplacer par une autre oreille.`,

    mots_faux_avec_les_mots_pour_cent: fauxAvec,
    mots_faux_sans_les_mots_pour_cent: fauxSans,
    /* ElevenLabs annonce le wolof entre 25 et 50 % de mots faux. On dira s'il
       tient son annonce, au lieu de la répéter. */
    son_annonce: "ElevenLabs range le wolof en « moderate » : 25 à 50 % de mots faux annoncés",

    /* ── 4. QUELLE OREILLE ENTEND LE MIEUX SON WOLOF ────────────────────

       Soynade, le 19 septembre à 01 h 48 : « largement meilleur que
       ElevenLabs Scribe ». On ne le répète pas, on le chiffre — sur les mêmes
       dix enregistrements, le même texte connu, le même calcul. */
    soynade: (() => {
      const bons = abouties.filter((l) => typeof l.soynade.mots_faux_pour_cent === "number");
      const refus = abouties.filter((l) => l.soynade.refus);
      if (!bons.length) {
        const motif = refus[0]?.soynade.refus || "aucun appel abouti";
        return /crédit .* épuisé|402/.test(motif)
          ? `PAS MESURÉ : le crédit du compte Soynade est épuisé. Ce n'est pas leur oreille qui `
            + `échoue — recharge le compte et relance cet essai. (${motif.slice(0, 120)})`
          : `PAS MESURÉ : ${motif.slice(0, 180)}`;
      }
      const leur = moyenne(bons.map((l) => l.soynade.mots_faux_pour_cent));
      const nous = fauxAvec;
      const msLeur = moyenne(bons.map((l) => l.soynade.ms));
      const msNous = moyenne(abouties.map((l) => l.avec_les_mots.ms));
      if (leur === null || nous === null) return `Soynade : ${leur} % de mots faux sur ${bons.length} son(s)`;
      const ecart = nous - leur;
      return ecart >= 10
        ? `SOYNADE GAGNE, et largement : ${leur} % de mots faux contre ${nous} % chez ElevenLabs `
          + `(avec les cent mots). ${ecart} points d'écart sur ${bons.length} enregistrements. `
          + `Temps : ${msLeur} ms contre ${msNous} ms. C'est l'oreille qu'il faut brancher.`
        : ecart <= -10
          ? `ElevenLabs reste meilleur : ${nous} % contre ${leur} % chez Soynade. Leur annonce ne `
            + `se vérifie pas sur ce wolof-là — on garde l'oreille actuelle et on cherche ailleurs.`
          : `MATCH NUL à ${Math.abs(ecart)} point(s) près : ${leur} % chez Soynade, ${nous} % chez `
            + `ElevenLabs. Aucun des deux n'est utilisable à ce niveau de fautes ; le gain viendra `
            + `d'ailleurs — du répertoire, qui tolère un quart de mots faux et retrouve quand même.`;
    })(),
    soynade_mots_faux_pour_cent: moyenne(abouties.map((l) => l.soynade.mots_faux_pour_cent)),
    soynade_ms: moyenne(abouties.map((l) => l.soynade.ms)),

    /* ── ET CE QUI DÉCIDE S'IL FAUT FFMPEG SUR RENDER ───────────────────

       Quatre emballages du même son. On ne lit que « accepté » ou « refusé » :
       ce son n'a pas de mots, donc aucune qualité ne se mesure ici. */
    formats: await (async () => {
      const f = await quelsFormats();
      const soyOk = (n: string) => {
        const l = f.find((x) => x.format === n) as { soynade?: { accepte?: boolean } } | undefined;
        return Boolean(l?.soynade?.accepte);
      };
      const duTelephone = soyOk("webm / opus") || soyOk("mp4 / aac");
      return {
        verdict: !voixConfig.soynade.apiKey
          ? "clé Soynade absente : rien à conclure"
          : duTelephone
            ? `SOYNADE ACCEPTE CE QUE LE TÉLÉPHONE ENREGISTRE (webm ${soyOk("webm / opus") ? "oui" : "non"}, `
              + `mp4 ${soyOk("mp4 / aac") ? "oui" : "non"}). Aucune conversion à installer : on peut brancher `
              + `leur oreille directement.`
            : `SOYNADE REFUSE LES DEUX FORMATS DU TÉLÉPHONE. Il faut donc convertir sur le serveur — `
              + `ffmpeg sur Render, wav 16 kHz mono, environ 50 ms par tour. Le wav pèse 29 ko contre `
              + `4 ko pour l'opus : c'est pourquoi la conversion reste au serveur et pas au téléphone.`,
        lignes: f,
        /* Dit une fois, pour qu'on ne cherche pas un taux de mots faux ici. */
        note: "un « mmm » sans mots : on ne lit que « accepté » ou « refusé », aucune qualité",
      };
    })(),

    lignes,
  };
  noterEssaiOreille(essai);
  return NextResponse.json(essai);
}
