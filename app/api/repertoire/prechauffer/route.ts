import { NextResponse } from "next/server";
import { adressesAPrechauffer } from "@/lib/repertoire";

export const runtime = "nodejs";
export const dynamic = "force-static";
export const revalidate = 3600;

/* ── LA LISTE DES SONS À AVOIR EN MAIN AVANT LE PREMIER MOT ─────────────────

   Le téléphone la demande une fois, après le code, et va chercher en
   arrière-plan ce qui lui manque (voir prechaufferLesSons dans app/page.tsx).
   Les adresses sont publiques (le seau l'est) ; pas de code exigé. L'empreinte
   « ?v= » est calculée ici, sur le texte du répertoire : le téléphone ne
   pourrait pas la deviner. Voir CLES_A_PRECHAUFFER dans lib/repertoire.ts. */
export async function GET() {
  return NextResponse.json({ sons: adressesAPrechauffer() }, {
    headers: { "cache-control": "public, max-age=3600" },
  });
}
