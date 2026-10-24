import { NextRequest, NextResponse } from "next/server";
import { verifierCode } from "@/lib/codes";
import { lire, ecrire } from "@/lib/rappels-depot";
import { clePubliquePush } from "@/lib/push-web";
import { armerHorloge } from "@/lib/rappels-horloge";

/* ── L'ABONNEMENT DU TÉLÉPHONE AUX NOTIFICATIONS ───────────────────────────

   GET rend la clé publique à donner à pushManager.subscribe(). Elle est
   DÉRIVÉE de BIA_SECRET (voir lib/push-web.ts) : pas de variable Render de
   plus à poser, et la même paire sur chaque instance.

   POST garde l'abonnement du téléphone dans le document de la personne —
   jamais ailleurs, jamais dans la mémoire commune.

   CE QU'UN ABONNEMENT CONTIENT : une adresse chez Google ou Apple, et deux
   clés publiques. Aucune donnée personnelle, et il ne permet pas de LIRE
   quoi que ce soit — seulement d'envoyer une notification à ce téléphone. */

/* Le même rangement que app/api/rappels/route.ts — un abonnement rangé
   ailleurs que les rappels ne ferait sonner personne. */
function quiParle(request: NextRequest) {
  const verdict = verifierCode(request.headers.get("x-bia-code"));
  if (!verdict.ok) return "";
  const propre = (v: string | null, max = 60) => String(v || "").trim().replace(/[^A-Za-z0-9_-]/g, "").slice(0, max);
  const profil = propre(request.headers.get("x-bia-personne"));
  const appareil = propre(request.headers.get("x-bia-appareil"), 40);
  return verdict.maitre ? "maitre" : profil ? "profil-" + profil : appareil ? "appareil-" + appareil : "";
}

export async function GET(request: NextRequest) {
  if (!quiParle(request)) return NextResponse.json({ erreur: "code" }, { status: 401 });
  const cle = clePubliquePush();
  return NextResponse.json({
    cle_publique: cle,
    /* Sans BIA_SECRET il n'y a pas de clé, et un abonnement est impossible.
       On le dit au lieu de laisser le téléphone échouer sans raison. */
    possible: Boolean(cle),
    pourquoi_pas: cle ? null : "BIA_SECRET n'est pas posé sur le serveur : aucune notification ne peut partir.",
  }, { headers: { "cache-control": "no-store" } });
}

export async function POST(request: NextRequest) {
  const personne = quiParle(request);
  if (!personne) return NextResponse.json({ erreur: "code" }, { status: 401 });
  const corps = await request.json().catch(() => ({})) as {
    endpoint?: string; cles?: { p256dh?: string; auth?: string }; retirer?: boolean;
  };
  const endpoint = String(corps.endpoint || "").slice(0, 600);
  /* Une adresse de push est une URL https chez le fabricant du navigateur.
     On refuse tout le reste : ce champ fait faire une requête au serveur, et
     un champ qui fait faire une requête est un champ qu'on vérifie. */
  let hote = "";
  try { const u = new URL(endpoint); if (u.protocol !== "https:") throw 0; hote = u.hostname; }
  catch { return NextResponse.json({ erreur: "adresse de notification illisible" }, { status: 400 }); }

  const d = await lire(personne);
  if (corps.retirer) {
    d.abonnements = (d.abonnements || []).filter((a) => a.endpoint !== endpoint);
    await ecrire(personne, d);
    return NextResponse.json({ abonne: false, telephones: d.abonnements.length });
  }

  const p256dh = String(corps.cles?.p256dh || ""), auth = String(corps.cles?.auth || "");
  if (p256dh.length < 20 || auth.length < 10)
    return NextResponse.json({ erreur: "clés de notification incomplètes" }, { status: 400 });

  const autres = (d.abonnements || []).filter((a) => a.endpoint !== endpoint);
  d.abonnements = [...autres, { endpoint, cles: { p256dh, auth }, ajoute: new Date().toISOString() }];
  const ecrit = await ecrire(personne, d);
  armerHorloge();
  return NextResponse.json({ abonne: ecrit, telephones: d.abonnements.length, service: hote });
}
