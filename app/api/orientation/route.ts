/* ── OÙ EST LA PERSONNE, ET PAR OÙ ELLE DOIT ALLER ─────────────────────────

   Lamine, le 24 octobre 2026 : « un touriste ou un étranger perdu demande son
   chemin, BIA sait où il est et lui donne la meilleure voie. »

   ── CE QUI N'EST JAMAIS ÉCRIT, ET C'EST LA RÈGLE DE CETTE ROUTE ──────────

   « la position n'est jamais écrite en mémoire ni dans Supabase, elle sert au
   tour en cours. »

   Cette route ne garde RIEN. Pas de souvenir, pas de Supabase, pas de
   compteur dans /api/etat, pas de journal. Les coordonnées entrent, une
   phrase sort, et il n'en reste aucune trace nulle part. Une épreuve vérifie
   qu'aucune écriture n'est seulement POSSIBLE depuis ce fichier : il
   n'importe ni souvenirs, ni lexique, ni quoi que ce soit qui sache écrire.

   Ce qui est compté dans /api/etat, c'est le NOMBRE de demandes et leur
   durée — jamais un endroit, jamais une coordonnée.

   ── POURQUOI PAS LA DURÉE DU ROUTEUR ─────────────────────────────────────

   Mesuré le 24 octobre sur le routeur public : les cinq profils — foot,
   walking, bike, cycling, driving — rendent EXACTEMENT la même durée. Le
   serveur de démonstration ignore le profil et calcule toujours en voiture.
   On prend donc sa DISTANCE par les rues, qui est juste, et on calcule le
   temps de marche nous-mêmes. Voir lib/orientation.ts.

   ── ET SI LE ROUTEUR NE RÉPOND PAS ───────────────────────────────────────

   On répond quand même : la direction et la distance à vol d'oiseau valent
   mieux que rien pour quelqu'un qui est perdu. Le champ `par_les_rues` dit
   laquelle des deux on a donnée — on ne fait pas passer l'une pour l'autre. */

import { NextRequest, NextResponse } from "next/server";
import { verifierCode } from "@/lib/codes";
import { distanceM, direction, minutesDeMarche, phraseOrientation } from "@/lib/orientation";
import { noterOrientation } from "@/lib/orientation-etat";

export const runtime = "nodejs";
const headers = { "cache-control": "no-store" };

const OSRM_DEMO = "https://router.project-osrm.org";
const ROUTEUR = process.env.CARTE_CHEMIN || OSRM_DEMO;
const PROFIL = process.env.CARTE_PROFIL || "driving";

const coord = (v: unknown, max: number) => {
  const n = Number(v);
  return Number.isFinite(n) && Math.abs(n) <= max ? n : null;
};

export async function POST(req: NextRequest) {
  const acces = verifierCode(req.headers.get("x-bia-code"), false);
  if (!acces.ok) return NextResponse.json({ erreur: "Accès refusé." }, { status: 401, headers });

  const debut = Date.now();
  try {
    const body = await req.json();
    const deLat = coord(body?.de?.lat, 90), deLon = coord(body?.de?.lon, 180);
    const versLat = coord(body?.vers?.lat, 90), versLon = coord(body?.vers?.lon, 180);
    if (deLat === null || deLon === null || versLat === null || versLon === null) {
      noterOrientation({ ok: false, motif: "coordonnees" });
      return NextResponse.json({ erreur: "Il faut deux points." }, { status: 400, headers });
    }
    const de = { lat: deLat, lon: deLon }, vers = { lat: versLat, lon: versLon };
    const nom = String(body?.vers?.nom || "").trim().slice(0, 120) || "cet endroit";
    const langue = body?.langue === "wo" ? "wo" as const : "fr" as const;

    /* La distance par les rues, quand le routeur répond. Bornée : quelqu'un
       qui attend son chemin ne doit pas attendre dix secondes. */
    let metres: number | null = null, parLesRues = false;
    try {
      const adresse = `${ROUTEUR.replace(/\/$/, "")}/route/v1/${PROFIL}/`
        + `${deLon},${deLat};${versLon},${versLat}?overview=false&steps=false&annotations=false`;
      const r = await fetch(adresse, { cache: "no-store", signal: AbortSignal.timeout(6000) });
      if (r.ok) {
        const d = await r.json() as { code?: string; routes?: Array<{ distance?: number }> };
        const brut = d?.code === "Ok" ? Number(d.routes?.[0]?.distance) : NaN;
        if (Number.isFinite(brut) && brut > 0) { metres = Math.round(brut); parLesRues = true; }
      }
    } catch { /* Le routeur muet ne doit pas laisser quelqu'un sans réponse. */ }

    const aVolDOiseau = distanceM(de, vers);
    const retenu = metres ?? aVolDOiseau;
    noterOrientation({ ok: true, ms: Date.now() - debut, parLesRues });

    return NextResponse.json({
      phrase: phraseOrientation({ de, vers, nom, metres, langue }),
      direction: direction(de, vers, langue),
      distance_m: retenu,
      distance_vol_oiseau_m: aVolDOiseau,
      /* On dit LAQUELLE des deux on a donnée. Faire passer un vol d'oiseau
         pour un trajet par les rues tromperait sur la distance à marcher. */
      par_les_rues: parLesRues,
      marche_minutes: minutesDeMarche(retenu),
      /* Le routeur public n'a aucune garantie de service, et il calcule en
         voiture quel que soit le profil demandé. */
      routeur_provisoire: ROUTEUR === OSRM_DEMO,
      merci: "Données de route © les contributeurs d'OpenStreetMap",
    }, { headers });
  } catch {
    noterOrientation({ ok: false, motif: "erreur" });
    return NextResponse.json({ erreur: "Orientation indisponible." }, { status: 503, headers });
  }
}
