import { NextResponse } from "next/server";
import { noterVue, noterLecture } from "@/lib/attentes-vues";

/* Le téléphone dit combien de temps il a attendu. Rien d'autre.

   Pas de code d'accès exigé : refuser une mesure parce qu'un code a expiré
   nous priverait précisément des mesures des moments où ça se passe mal. Et
   il n'y a rien à voler ici — quatre nombres. */
export async function POST(requete: Request) {
  try {
    const corps = await requete.json();
    // Deux mesures passent par ici : l'attente avant qu'elle parle, et les
    // coutures pendant qu'elle parle.
    if (corps && corps.type === "lecture") noterLecture(corps);
    else noterVue(corps);
  } catch {}
  return NextResponse.json({ ok: true });
}
