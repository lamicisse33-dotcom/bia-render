/* ── LA CORRECTION DU MAÎTRE, ÉCRITE LÀ OÙ KHALAM L'ÉCRIT ──────────────────

   Lamine, le 24 octobre 2026 : « Correction par code maître sur Khalam
   Rapide, comme sur Khalam… la correction validée est écrite là où Khalam
   l'écrit (lexique, correction exacte, devoir source avec provenance et
   historique) et relue par les deux moteurs au tour suivant. Réutiliser les
   mêmes écritures Supabase, PAS une copie. »

   C'est la règle de ce fichier : il n'écrit rien lui-même. Il appelle
   exactement les deux fonctions que app/api/chat/route.ts appelle —
   `enregistrerPhraseMaitre` et `corrigerDevoir` — et rien d'autre. Une copie
   de leur logique dériverait le jour où l'une des deux change ; une épreuve
   vérifie donc que ce fichier n'importe que celles-là.

   `enregistrerPhraseMaitre` écrit la phrase comme correction exacte
   (source = corrigée, auteur « maitre-vocal »), avec sa provenance tirée du
   fil, PUIS relit Supabase pour confirmer. Si la relecture ne confirme pas,
   elle lève — et on le dit au lieu d'annoncer une mémorisation qui n'a pas eu
   lieu. AGENTS.md : « ne pas annoncer une correction du devoir après un
   simple ajout au lexique séparé. »

   CODE MAÎTRE EXIGÉ. Une correction change ce que BIA dira à tout le monde :
   elle ne peut venir que de lui. */

import { NextRequest, NextResponse } from "next/server";
import { verifierCode } from "@/lib/codes";
import { enregistrerPhraseMaitre } from "@/lib/memoire-maitre";
import { corrigerDevoir } from "@/lib/correction-devoir";
import { noterTentative } from "@/lib/lecons-vues";

export const runtime = "nodejs";
const headers = { "cache-control": "no-store" };

export async function POST(req: NextRequest) {
  const acces = verifierCode(req.headers.get("x-bia-code"), false);
  if (!acces.ok || !acces.maitre) {
    return NextResponse.json({ erreur: "Seul le code maître corrige." }, { status: 403, headers });
  }
  let phrase = "";
  try {
    const body = await req.json();
    phrase = String(body?.phrase || "").trim().slice(0, 4000);
    const langue = body?.langue === "fr" ? "fr" : "wo";
    const histoire = Array.isArray(body?.history) ? body.history.slice(-12) : [];
    const origine = body?.origine_devoir;
    if (!phrase) {
      return NextResponse.json({ erreur: "Dis-moi la phrase exacte à garder." }, { status: 400, headers });
    }

    /* 1. Le lexique et la correction exacte — la même écriture que Khalam,
          provenance comprise, avec sa relecture de confirmation. */
    await enregistrerPhraseMaitre(phrase, langue, histoire);

    /* 2. Le devoir source, quand la phrase en vient. `corrigerDevoir` garde la
          provenance exacte et l'historique : c'est lui qui sait le faire, et
          on ne refait pas son travail ici. */
    let devoir: unknown = null;
    if (origine) {
      try { devoir = await corrigerDevoir(origine, phrase); }
      catch (e) {
        noterTentative({ dit: "correction live", maitre: true, ordre: "retiens", en_main: true,
          signes_en_main: phrase.length, ecrit: true,
          motif: "lexique écrit, devoir source refusé : " + (e as Error).message.slice(0, 120) });
        /* On ne ment pas sur ce qui a été fait : le lexique est écrit, le
           devoir ne l'est pas, et BIA doit le dire. */
        return NextResponse.json({
          ecrit: true, devoir_corrige: false,
          a_dire: "J'ai gardé ta phrase, mais je n'ai pas pu corriger le devoir d'origine. Dis-le-moi et on réessaiera.",
        }, { headers });
      }
    }

    noterTentative({ dit: "correction live", maitre: true, ordre: "retiens", en_main: true,
      signes_en_main: phrase.length, ecrit: true, motif: "rangée" });
    return NextResponse.json({
      ecrit: true,
      devoir_corrige: Boolean(devoir),
      origine_devoir: devoir ?? null,
      a_dire: "C'est gardé, papa.",
      instruction: "Dis `a_dire` en une phrase courte, sans te justifier et sans expliquer pourquoi tu avais dit autrement. Puis reprends la conversation.",
    }, { headers });
  } catch (e) {
    noterTentative({ dit: "correction live", maitre: true, ordre: "retiens", en_main: Boolean(phrase),
      signes_en_main: phrase.length, ecrit: false,
      motif: ("écriture ou relecture non confirmée : " + (e as Error).message).slice(0, 200) });
    return NextResponse.json({
      ecrit: false,
      erreur: "Je n'ai pas pu le garder : le rangement n'a pas confirmé. Dis-le-lui au lieu d'annoncer une mémorisation.",
    }, { status: 503, headers });
  }
}
