import { NextRequest, NextResponse } from "next/server";
import { creerCode } from "@/lib/codes";

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
   téléphone, et il n'est écrit nulle part dans le code. */

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
    "access-control-allow-headers": "content-type",
    "access-control-allow-methods": "POST, OPTIONS",
    "access-control-max-age": "86400",
    vary: "origin",
  };
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

  try {
    const body = await request.json() as { maitre?: string; heures?: number; nombre?: number };
    const maitre = (process.env.BIA_CODE_MAITRE || "").toUpperCase().replace(/[^A-Z0-9]/g, "");
    const donne = String(body.maitre || "").toUpperCase().replace(/[^A-Z0-9]/g, "");
    if (!maitre || donne !== maitre) {
      return NextResponse.json({ erreur: "Code maître refusé." }, { status: 403, headers: tete });
    }

    const heures = Math.min(Math.max(Number(body.heures) || 2, 0.25), 720);
    const nombre = Math.min(Math.max(Number(body.nombre) || 1, 1), 50);
    const codes = Array.from({ length: nombre }, () => creerCode(heures));

    /* On renvoie aussi le nom de l'application et l'adresse où le code
       s'emploie : la page qui les fabrique en sert trois, et un code sans son
       adresse ne vaut rien pour celui qui le reçoit. */
    return NextResponse.json({
      codes,
      heures,
      application: "BIA",
      adresse: "bia.khalam.app",
      questions: Number(process.env.BIA_MAX_QUESTIONS || 15),
    }, { headers: tete });
  } catch {
    return NextResponse.json({ erreur: "Requête mal formée." }, { status: 400, headers: tete });
  }
}
