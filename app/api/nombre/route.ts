import { NextRequest, NextResponse } from "next/server";
import { verifierCode } from "@/lib/codes";
import { demandeDeNombre, repondreAuNombre } from "@/lib/nombre-demande";

/* ── DIRE UN NOMBRE EN WOLOF, SUR LES DEUX MOTEURS ────────────────────────

   Lamine, 24 octobre 2026 : « Nombres et montants en wolof : brancher
   lib/wolof-nombres.ts dans la conversation en direct. »

   ── CE QUE J'AI VÉRIFIÉ AVANT D'ÉCRIRE ───────────────────────────────────

   Sur Khalam, c'est branché depuis septembre : app/api/chat/route.ts appelle
   demandeDeNombre(question) et court-circuite le modèle. Sur Khalam Rapide,
   RIEN — et le socle partagé interdit explicitement à BIA de composer un
   nombre en wolof elle-même (« Pas de ñaar-fukk, pas de juróomi junni »).
   Résultat : sur la connexion rapide, la question n'avait aucune réponse.

   ── POURQUOI UNE ROUTE ET PAS UNE CONSIGNE ───────────────────────────────

   Parce que les nombres en wolof de BIA viennent d'une TABLE que Lamine a
   relue de sa main, et d'une règle de composition éprouvée — pas du modèle.
   Laisser un modèle composer « deux mille cinq cents francs » en wolof, c'est
   exactement ce que le socle refuse : sur un montant, se tromper coûte de
   l'argent à quelqu'un.

   Quand la table ne couvre pas le cas, cette route rend `null` et DIT
   pourquoi : BIA le dira en français au lieu d'inventer.

   LECTURE SEULE. Aucune écriture, aucune mémoire, aucun compteur de dépense :
   tout se calcule ici, sans appeler personne. */

export async function POST(request: NextRequest) {
  if (!verifierCode(request.headers.get("x-bia-code"), false).ok)
    return NextResponse.json({ erreur: "code" }, { status: 401 });

  const corps = await request.json().catch(() => ({})) as { phrase?: string };
  const phrase = String(corps.phrase || "").slice(0, 300);

  /* On passe par le MÊME détecteur que Khalam : si la phrase n'est pas une
     demande de nombre en wolof, on ne compose rien. Deux détecteurs
     différents sur les deux moteurs finiraient par ne pas répondre pareil,
     et « même BIA » serait faux. */
  const demande = demandeDeNombre(phrase);
  if (!demande)
    return NextResponse.json({
      trouve: false,
      raison: "Ce n'est pas une demande de nombre en wolof, ou aucun nombre n'a été dit. Réponds normalement.",
    });

  const reponse = repondreAuNombre(demande);
  if (!reponse)
    return NextResponse.json({
      trouve: false, nombre: demande.nombre, argent: demande.argent,
      raison: "La table de Lamine ne couvre pas encore ce nombre. Dis-le simplement et donne le nombre en français — n'invente AUCUN mot wolof.",
    });

  return NextResponse.json({
    trouve: true,
    nombre: demande.nombre,
    argent: demande.argent,
    /* Ce qu'elle doit dire, MOT POUR MOT. Composé par sa table, jamais par
       un modèle : ne change rien, n'ajoute rien, ne reformule pas. */
    a_dire: reponse.dit,
    relu_par_lamine: reponse.relu,
    consigne: "Dis `a_dire` mot pour mot, sans y ajouter de wolof de ton cru.",
  });
}
