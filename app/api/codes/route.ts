import { NextRequest, NextResponse } from "next/server";
import { creerCode, verifierCode } from "@/lib/codes";
import { nombreDeLEnvironnement } from "@/lib/nombre-env";

/* ── FABRIQUER DES CODES DE TESTEUR POUR BIA ────────────────────────────────

   Demandé par Lamine le 11 septembre 2026 : « l'application que tu avais créée
   pour générer les codes, il faut qu'elle puisse générer les codes aussi pour
   BIA. »

   Sa page à codes vit sur wolof.khalam.app et fabrique jusqu'ici les codes de
   l'Interprète et de BIBA — deux applications servies par le MÊME serveur
   qu'elle. BIA, elle, est ailleurs : son serveur est app.khalam.app.

   POUR UNE PAGE WEB, « AILLEURS » EST UN MUR. Un navigateur refuse par défaut
   qu'une page de wolof.khalam.app lise la réponse d'app.khalam.app : c'est la
   règle d'origine unique, et elle protège les gens. Sans les en-têtes qui
   suivent, le bouton « Créer le code » ne renverrait RIEN, sans message
   d'erreur utile — la page dirait juste « ça n'a pas marché ».

   ON N'OUVRE PAS À TOUT LE MONDE POUR AUTANT. Cette route fabrique des accès :
   seules les pages de khalam.app peuvent la joindre, et il faut de toute façon
   le code maître. Deux verrous valent mieux qu'un.

   La vraie protection reste le code maître : il ne circule que depuis SON
   téléphone, et il n'est écrit nulle part dans le code.

   ── PARLER LA MÊME LANGUE QUE LES DEUX AUTRES ─────────────────────────────

   Sa page appelle déjà /api/code-testeur pour l'Interprète et BIBA : le code
   maître voyage dans l'en-tête « x-code-acces », le corps porte { nom, heures },
   et la réponse rend { code, expire, quota, nom }.

   On accepte ici EXACTEMENT la même forme. Autrement il aurait fallu deux
   chemins séparés dans sa page — deux endroits à corriger le jour où l'un
   bouge, et un seul des deux corrigé. Une seule différence subsiste, celle
   qu'on ne peut pas effacer : l'adresse du serveur. */

const MAISON = /^https:\/\/([a-z0-9-]+\.)?khalam\.app$/;

/** L'origine a-t-elle le droit de nous parler ? */
function origineAutorisee(origine: string | null): string | null {
  if (!origine) return null;
  if (MAISON.test(origine)) return origine;
  // De quoi essayer depuis un poste de travail, sans rien ouvrir en ligne.
  if (/^http:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(origine)) return origine;
  return null;
}

function entetes(origine: string | null): Record<string, string> {
  const permise = origineAutorisee(origine);
  if (!permise) return {};
  return {
    "access-control-allow-origin": permise,
    // « x-code-acces » doit figurer ici : sa page l'envoie, et un en-tête non
    // annoncé fait échouer la demande de permission, donc l'appel n'est jamais
    // envoyé. C'est le genre de panne qui ne laisse aucune trace utile.
    "access-control-allow-headers": "content-type, x-code-acces",
    "access-control-allow-methods": "GET, POST, OPTIONS",
    "access-control-max-age": "86400",
    vary: "origin",
  };
}

/* « Est-ce que c'est Lamine sur cet appareil ? » — gratuit, et sans rien
   révéler : on ne répond que oui ou non, jamais le code lui-même.

   L'application s'en sert pour ne montrer QU'À LUI les outils qui dépensent,
   comme la page d'écoute des voix. Un testeur qui ouvre les réglages ne doit
   pas tomber sur un bouton qui coûte deux centimes l'appui. */
export async function GET(request: NextRequest) {
  const verdict = verifierCode(request.headers.get("x-bia-code"));
  if (!verdict.ok || !verdict.maitre) {
    return NextResponse.json({ maitre: false }, { status: 401 });
  }
  return NextResponse.json({ maitre: true });
}

/* Le navigateur demande la permission AVANT d'envoyer le vrai appel. Sans
   cette réponse-là, il n'envoie jamais le second. */
export async function OPTIONS(request: NextRequest) {
  return new NextResponse(null, { status: 204, headers: entetes(request.headers.get("origin")) });
}

/* Fabrique des codes de testeur. Réservé au code maître de Lamine. */
export async function POST(request: NextRequest) {
  const origine = request.headers.get("origin");
  const tete = entetes(origine);

  /* Une page d'ailleurs est refusée ici, pas plus loin : le code maître ne
     doit même pas être comparé si la demande ne vient pas de la maison. */
  if (origine && !origineAutorisee(origine)) {
    return NextResponse.json({ erreur: "Origine refusée." }, { status: 403 });
  }

  const propre = (v: unknown) => String(v ?? "").toUpperCase().replace(/[^A-Z0-9]/g, "");

  try {
    const body = await request.json() as {
      maitre?: string; heures?: number; nombre?: number; nom?: string;
    };

    /* Le code maître vient de l'en-tête (comme pour l'Interprète) ou du corps :
       les deux marchent, personne n'a à se souvenir duquel. */
    const maitre = propre(process.env.BIA_CODE_MAITRE);
    const donne = propre(request.headers.get("x-code-acces") || body.maitre);
    if (!maitre || donne !== maitre) {
      return NextResponse.json({ erreur: "Code maître refusé." }, { status: 403, headers: tete });
    }

    const heures = Math.min(Math.max(Number(body.heures) || 2, 0.25), 720);
    const nombre = Math.min(Math.max(Number(body.nombre) || 1, 1), 50);
    const codes = Array.from({ length: nombre }, () => creerCode(heures));
    const questions = nombreDeLEnvironnement(process.env.BIA_MAX_QUESTIONS, 15, "BIA_MAX_QUESTIONS");

    /* Le prénom revient tel qu'il a été tapé, nettoyé de ce qui n'a rien à
       faire dans un prénom : il finira dans le message qu'il enverra. */
    const nom = String(body.nom || "").replace(/[^\p{L}\p{M}' -]/gu, "").trim().slice(0, 16);

    return NextResponse.json({
      // La forme que sa page attend déjà.
      code: codes[0],
      expire: new Date(Date.now() + heures * 3600_000).toISOString(),
      quota: questions,
      nom,
      // Et ce qu'on rendait avant, pour qui appelle cette route directement.
      codes,
      heures,
      questions,
      application: "BIA",
      adresse: "bia.khalam.app",
    }, { headers: tete });
  } catch {
    return NextResponse.json({ erreur: "Requête mal formée." }, { status: 400, headers: tete });
  }
}
