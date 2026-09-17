import { NextRequest, NextResponse } from "next/server";
import { verifierCode } from "@/lib/codes";
import { ecouteConfig } from "@/lib/ecoute";
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
    });
  }

  /* ── LES TROIS VERDICTS, ÉCRITS EN CLAIR ───────────────────────────────
     Lamine ne doit pas avoir à lire dix lignes pour savoir si son oreille
     marche. Chaque question posée en haut de ce fichier a sa phrase. */
  const abouties = lignes.filter((l) => !l.absent) as Array<{
    avec_les_mots: { refus?: string; langue: string; mots_faux_pour_cent?: number; ms: number };
    sans_les_mots: { refus?: string; langue: string; mots_faux_pour_cent?: number; ms: number };
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

    lignes,
  };
  noterEssaiOreille(essai);
  return NextResponse.json(essai);
}
