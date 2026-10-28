import { NextRequest, NextResponse } from "next/server";
import { createHash } from "node:crypto";
import { enregistrerDemande, lienWhatsApp, listerDemandes, changerStatut, MESSAGES_DEMANDE } from "@/lib/demandes-code";
import { verifierCode } from "@/lib/codes";
import { normaliserNumero } from "@/lib/acces-numero";

/* ── « DEMANDER UN CODE À KHALAM » ─────────────────────────────────────────

   Demandé par Lamine le 28 octobre 2026, pour la rubrique du même nom sur
   khalam.app/bia.html.

   POURQUOI CETTE ROUTE VIT ICI, ET PAS SUR LE SITE. khalam.app est une page
   servie par GitHub Pages : il n'y a pas de serveur dessous, donc rien pour
   garder un secret ni parler à Supabase. La page appelle donc CETTE route,
   qui tourne sur Render — d'où le CORS ci-dessous, et d'où le fait que la
   clé de service ne quitte jamais le serveur.

   CETTE ROUTE N'A PAS BESOIN DE CODE D'ACCÈS, et c'est tout son objet : elle
   est faite pour ceux qui n'en ont pas encore. C'est donc la seule porte
   ouverte de BIA, et elle est tenue par trois choses : un champ piège, deux
   freins (par visiteur et par numéro) et la validation du numéro.

   AUCUN NUMÉRO N'EST ÉCRIT DANS UN JOURNAL. Pas de console.log ici. */

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/* Le site public et rien d'autre. Une étoile ici ouvrirait le formulaire à
   n'importe quelle page du monde, qui s'en servirait pour remplir la table
   de Lamine depuis chez elle. */
const SITES = ["https://khalam.app", "https://www.khalam.app", "https://app.khalam.app"];

function cors(origine: string | null) {
  const permis = origine && SITES.includes(origine) ? origine : SITES[0];
  return {
    "access-control-allow-origin": permis,
    "access-control-allow-headers": "content-type",
    "access-control-allow-methods": "POST, OPTIONS",
    "access-control-max-age": "86400",
    "cache-control": "no-store",
    vary: "origin",
  };
}

/* ── LA LISTE DES DEMANDES, RÉSERVÉE AU CODE MAÎTRE ───────────────────────
   Lamine : « donne-moi un moyen simple de voir la liste des demandes ». La
   table Supabase en est un, mais elle se lit mal sur un téléphone, et il lit
   tout depuis le sien. Cette porte-ci rend la même liste en JSON, et elle
   n'ouvre QU'avec le code maître — un code utilisateur n'y entre pas.
   `?statut=` marque une ligne « code envoyé » sans ouvrir Supabase. */
export async function GET(request: NextRequest) {
  const verdict = verifierCode(request.headers.get("x-bia-code"), false);
  if (!verdict.ok || !verdict.maitre)
    return NextResponse.json({ erreur: "Réservé au code maître." }, { status: 403, headers: { "cache-control": "no-store" } });
  const marquer = request.nextUrl.searchParams.get("marquer");
  const statut = request.nextUrl.searchParams.get("statut");
  if (marquer && statut) {
    const fait = await changerStatut(marquer, statut);
    return NextResponse.json({ ok: fait }, { status: fait ? 200 : 400, headers: { "cache-control": "no-store" } });
  }
  try {
    const demandes = await listerDemandes();
    return NextResponse.json({ ok: true, total: demandes.length, demandes },
      { headers: { "cache-control": "no-store" } });
  } catch {
    return NextResponse.json({ erreur: "Liste indisponible." }, { status: 503, headers: { "cache-control": "no-store" } });
  }
}

export async function OPTIONS(request: NextRequest) {
  return new Response(null, { status: 204, headers: cors(request.headers.get("origin")) });
}

export async function POST(request: NextRequest) {
  const entetes = cors(request.headers.get("origin"));

  /* L'origine est vérifiée POUR DE BON, pas seulement annoncée : un en-tête
     CORS ne protège que les navigateurs, et un robot n'est pas un navigateur.
     Une origine absente passe (une application native n'en envoie pas), une
     origine étrangère non. */
  const origine = request.headers.get("origin");
  if (origine && !SITES.includes(origine))
    return NextResponse.json({ ok: false, message: "Demande refusée." }, { status: 403, headers: entetes });

  const corps = await request.json().catch(() => null) as
    { numero?: string; prenom?: string; accord?: boolean; societe?: string } | null;
  if (!corps) return NextResponse.json({ ok: false, message: MESSAGES_DEMANDE.numero_absent }, { status: 400, headers: entetes });

  /* L'empreinte du visiteur sert au frein et ne sort pas d'ici : elle n'est
     ni rangée, ni renvoyée, ni journalisée. L'adresse IP brute, elle, n'est
     jamais gardée nulle part. */
  const source = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "inconnu";
  const visiteur = createHash("sha256").update("visiteur:" + source).digest("hex").slice(0, 16);

  const resultat = await enregistrerDemande({
    numero: String(corps.numero || ""),
    prenom: corps.prenom,
    accord: corps.accord === true,
    piege: corps.societe,
    visiteur,
  });

  if (!resultat.ok)
    return NextResponse.json({ ok: false, message: resultat.message }, { status: 400, headers: entetes });

  /* Le code n'est JAMAIS envoyé d'ici : « c'est moi qui réponds », a dit
     Lamine. On rend seulement le lien qui ouvre WhatsApp chez lui. */
  const numero = normaliserNumero(corps.numero) || "";
  const whatsapp = lienWhatsApp(numero);
  return NextResponse.json({
    ok: true,
    etat: resultat.etat,
    whatsapp,
    message: whatsapp
      ? "Ta demande est enregistrée. WhatsApp s’ouvre pour l’envoyer à KHALAM."
      : "Ta demande est enregistrée. KHALAM te répondra avec ton code.",
  }, { status: 200, headers: entetes });
}
