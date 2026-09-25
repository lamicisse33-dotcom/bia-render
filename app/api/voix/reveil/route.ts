import { reveillerNotreMoteur } from "@/lib/voix";

/* ── LE RÉVEIL, À PART, POUR NE RIEN FAIRE ATTENDRE ─────────────────────────

   Demandé le 25 septembre 2026 : que notre moteur (RunPod) réponde aussi
   vite que Soynade. Mesuré ce jour-là : une fois chaude, la machine tient
   déjà la comparaison (2,3-2,7 s contre 3,9 s pour Soynade) — tout l'écart
   vient du réveil (~90 s la première fois). Cette route ne fait qu'une
   chose : lancer ce réveil tout de suite, sans attendre sa fin, pour que la
   page puisse l'appeler dès l'ouverture du micro — bien avant d'avoir une
   réponse à dire. */
export async function POST() {
  reveillerNotreMoteur();
  return new Response(null, { status: 202 });
}
