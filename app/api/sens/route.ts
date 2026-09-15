import { NextRequest, NextResponse } from "next/server";
import { verifierCode } from "@/lib/codes";
import { noterPanne } from "@/lib/panne";
import {
  AVEU, CONSIGNE_DU_SENS, type Sens, sensDansSesLecons, traductionUtilisable,
} from "@/lib/sens";

/* ── « ELLE DOIT ME DIRE CE QUE ÇA VEUT DIRE EN FRANÇAIS » ──────────────────

   Lamine, le 15 septembre 2026 : en mode apprentissage, après avoir répété sa
   phrase, BIA doit en donner le sens. Si elle ne le connaît pas, elle le
   demande, et il le lui donne.

   ── POURQUOI UNE ROUTE À PART, ET PAS DANS LA RÉPONSE ──────────────────────

   Parce que la répétition doit rester INSTANTANÉE. C'est elle qu'il écoute
   pour juger la prononciation ; lui faire attendre une traduction avant de
   l'entendre gâcherait le seul geste qui compte.

   Le téléphone reçoit donc la répétition comme aujourd'hui, la fait dire tout
   de suite, et demande le sens ICI pendant qu'elle parle. Une phrase wolof
   prend deux à trois secondes à prononcer — largement de quoi traduire. Quand
   elle a fini de répéter, le français est déjà là.

   C'est le même procédé que sa mémoire dans /api/chat : on lance tôt, on
   récupère tard, et l'attente disparaît dans le travail qu'on faisait de
   toute façon.

   ── RÉSERVÉ AU MAÎTRE ──────────────────────────────────────────────────────

   Le mode apprentissage est à lui seul depuis le premier jour — « moi
   uniquement, avec mon compte maître. Les testeurs n'auront pas accès à cette
   partie. » Cette route suit la même règle.                                 */

export async function POST(request: NextRequest) {
  const verdict = verifierCode(request.headers.get("x-bia-code"));
  if (!verdict.ok || !verdict.maitre) {
    return NextResponse.json({ erreur: "réservé au maître" }, { status: 401 });
  }

  let phrase = "";
  try {
    const corps = await request.json() as { phrase?: string };
    phrase = String(corps.phrase || "").trim().slice(0, 400);
  } catch { phrase = ""; }
  if (phrase.length < 2) return NextResponse.json({ sens: null });

  /* ── D'ABORD CHEZ LUI ────────────────────────────────────────────────────
     Si la phrase est déjà dans ses leçons, on rend SON français. Gratuit,
     instantané, et sûr — c'est sa main, pas une traduction. */
  const sien = sensDansSesLecons(phrase);
  if (sien) {
    const sens: Sens = { francais: sien, sur: true, ou: "leçon" };
    return NextResponse.json({ sens });
  }

  /* ── SINON, LE MODÈLE TRADUIT — ET IL A LE DROIT D'AVOUER ────────────────
     `XAMUMA` est le mot par lequel il dit qu'il ne sait pas. C'est ce mot qui
     fait que Lamine sera QUESTIONNÉ au lieu d'être trompé : un sens inventé
     serait enregistré comme vrai et ne serait jamais rattrapé. */
  const cle = process.env.BIA_LLM_API_KEY || process.env.ANTHROPIC_API_KEY;
  if (!cle) return NextResponse.json({ sens: null });

  try {
    const r = await fetch(`${process.env.ANTHROPIC_BASE_URL || "https://api.anthropic.com"}/v1/messages`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-api-key": cle,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: process.env.BIA_LLM_MODEL || "claude-sonnet-5",
        /* Court exprès : c'est une traduction, pas un commentaire — et le
           plafond est ce qui empêche le modèle de partir en explication. */
        max_tokens: 120,
        thinking: { type: "disabled" },
        system: CONSIGNE_DU_SENS,
        messages: [{ role: "user", content: phrase }],
      }),
    });
    if (!r.ok) {
      const detail = (await r.text()).slice(0, 200);
      noterPanne("le sens a échoué", `${r.status} : ${detail}`, "sens");
      return NextResponse.json({ sens: null });
    }
    const d = await r.json() as { content?: Array<{ type?: string; text?: string }> };
    const brut = (d.content || []).filter((b) => b.type === "text").map((b) => b.text || "").join(" ");
    const propre = traductionUtilisable(brut);
    /* Il a avoué, ou il a rendu n'importe quoi : on ne montre RIEN. Le
       téléphone fera dire à BIA qu'elle ne sait pas, et c'est Lamine qui
       donnera le sens. C'est exactement ce qu'il a demandé. */
    if (!propre) return NextResponse.json({ sens: null, avoue: brut.includes(AVEU) });
    const sens: Sens = { francais: propre, sur: false, ou: "modèle" };
    return NextResponse.json({ sens });
  } catch (err) {
    noterPanne("le sens a échoué", (err as Error).message.slice(0, 200), "sens");
    return NextResponse.json({ sens: null });
  }
}
