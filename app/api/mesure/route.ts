import { NextResponse } from "next/server";
import { noterCoupure, noterGuet, noterVue, noterLecture, noterTour, noterVeille } from "@/lib/attentes-vues";

/* Le téléphone dit combien de temps il a attendu. Rien d'autre.

   Pas de code d'accès exigé : refuser une mesure parce qu'un code a expiré
   nous priverait précisément des mesures des moments où ça se passe mal. Et
   il n'y a rien à voler ici — quatre nombres. */
export async function POST(requete: Request) {
  try {
    const corps = await requete.json();
    /* TROIS mesures passent par ici : l'attente avant qu'elle parle, les
       coutures pendant qu'elle parle, et — depuis le 15 septembre 2026 — le
       tour complet bout à bout, des deux bouts qu'il ressent. Voir
       lib/tour.ts. */
    if (corps && corps.type === "lecture") noterLecture(corps);
    else if (corps && corps.type === "tour") noterTour(corps);
    else if (corps && corps.type === "coupure") noterCoupure(corps);
    else if (corps && corps.type === "guet") noterGuet(corps);
    else if (corps && corps.type === "veille") noterVeille(corps);
    else noterVue(corps);
  } catch {}
  return NextResponse.json({ ok: true });
}
