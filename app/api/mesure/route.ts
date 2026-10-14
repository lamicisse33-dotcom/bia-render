import {noterFocusLocuteur} from "@/lib/focus-locuteur-etat";
import {noterPiperWeb} from "@/lib/piper-web-etat";
import {noterLectureAudioMemoire} from "@/lib/audio-memoire";
import {noterSonCourant} from "@/lib/sons-courants-etat";
import {noterLectureDevoirs} from "@/lib/lecture-devoirs-etat";
import { NextResponse } from "next/server";
import { noterCoupure, noterGuet, noterVue, noterLecture, noterTour, noterVeille, noterPrechauffage } from "@/lib/attentes-vues";

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
    if (corps && corps.type === "route_voix") {
      const etapes = ["ouverture", "demande", "telephone", "repli_bloque", "audio_absent", "erreur", "lecture"];
      const motifs = ["", "caractere", "requete", "annulation", "synthese"];
      if (etapes.includes(corps.etape) && motifs.includes(corps.motif)) {
        console.info("BIA_VOICE_ROUTE", JSON.stringify({
          etape: corps.etape, locale: corps.locale === true,
          epoch: corps.locale === true && corps.epoch === 6800 ? 6800 : 0,
          revision: corps.revision === "bia-voix-route-v2" ? corps.revision : "inconnue", motif: corps.motif,
        }));
      }
    }
    else if (corps && corps.type === "focus_locuteur") noterFocusLocuteur(corps);
    else if (corps && corps.type === "piper_web") noterPiperWeb(corps);
    else if (corps && corps.type === "audio_memoire") noterLectureAudioMemoire(corps);
    else if (corps && corps.type === "sons_courants") noterSonCourant(corps);
    else if (corps && corps.type === "lecture_devoirs") noterLectureDevoirs(corps);
    else if (corps && corps.type === "lecture") noterLecture(corps);
    else if (corps && corps.type === "tour") noterTour(corps);
    else if (corps && corps.type === "coupure") noterCoupure(corps);
    else if (corps && corps.type === "guet") noterGuet(corps);
    else if (corps && corps.type === "veille") noterVeille(corps);
    else if (corps && corps.type === "prechauffage") noterPrechauffage(corps);
    else noterVue(corps);
  } catch {}
  return NextResponse.json({ ok: true });
}
