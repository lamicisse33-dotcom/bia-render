import { NextRequest, NextResponse } from "next/server";
import { verifierCode } from "@/lib/codes";
import { chercherWeb, contexteWeb, webConfigure } from "@/lib/actions-internet";

/* ── CHERCHER SUR INTERNET, AVEC BRAVE — PAS AVEC LE GOOGLE PAYANT ────────

   Lamine, le 24 octobre 2026 : « Recherche vocale : branche celle de Khalam
   (Brave) comme outil sur Khalam Rapide, pas de Google payant. »

   POURQUOI PAS CELLE DE GOOGLE : mesurée le soir même par
   /api/gemini-live/essai, elle faisait refuser CHAQUE session avec le code
   1011 — « You exceeded your current quota ». Posée dans chaque ouverture,
   elle empêchait toute conversation de commencer. Elle reste éteinte
   derrière BIA_LIVE_RECHERCHE.

   CELLE-CI EST CELLE DE KHALAM, À L'IDENTIQUE : lib/actions-internet.ts,
   la même clé Brave, le même nombre de résultats, le même pays. Rien n'est
   dupliqué, donc rien ne peut diverger entre les deux moteurs.

   ET ELLE NE PART PAS À CHAQUE PHRASE. C'est le modèle qui décide d'appeler
   l'outil, exactement comme sur Khalam où l'outil n'est ouvert que lorsque
   la question le demande. Une recherche se paie : six francs environ, plus
   les jetons du contenu rapporté, plus deux à six secondes d'attente.

   LECTURE SEULE : rien n'est écrit, rien n'est gardé. */

export async function POST(request: NextRequest) {
  if (!verifierCode(request.headers.get("x-bia-code"), false).ok)
    return NextResponse.json({ erreur: "code" }, { status: 401 });

  const corps = await request.json().catch(() => ({})) as { question?: string };
  const question = String(corps.question || "").trim().slice(0, 300);
  if (!question)
    return NextResponse.json({ trouve: false, raison: "Dis-moi d'abord ce qu'elle cherche." });

  /* Sans clé Brave, on le DIT. Rendre une liste vide ferait croire que la
     recherche a tourné et n'a rien trouvé — et on chercherait la panne du
     mauvais côté pendant une semaine. */
  if (!webConfigure(question))
    return NextResponse.json({
      trouve: false,
      raison: "La recherche internet n'est pas branchée sur ce serveur. Dis-le simplement, et ne fais pas semblant d'avoir cherché.",
    });

  try {
    const resultats = await chercherWeb(question);
    if (!resultats.length)
      return NextResponse.json({ trouve: false, raison: `Rien trouvé sur « ${question} ». Dis-le, et propose de chercher autrement.` });
    return NextResponse.json({
      trouve: true,
      /* Le même contexte que celui donné au modèle de Khalam : titres, liens
         et extraits, mis en forme par la même fonction. */
      resultats: contexteWeb(resultats).slice(0, 6000),
      sources: resultats.slice(0, 5).map((r) => r.titre),
      consigne: "Réponds en UNE ou deux phrases avec ce que disent ces résultats. N'invente rien au-delà, et n'énumère pas les liens à voix haute.",
    });
  } catch {
    return NextResponse.json({ trouve: false, raison: "La recherche n'a pas répondu. Dis-le et propose de réessayer." });
  }
}
