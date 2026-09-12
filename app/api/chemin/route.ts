import { NextRequest, NextResponse } from "next/server";
import { verifierCode } from "@/lib/codes";
import { lireChemin } from "@/lib/carte";
import { baseDesSons } from "@/lib/repertoire";
import { noterPanne } from "@/lib/panne";

/* ── CALCULER LE CHEMIN ─────────────────────────────────────────────────────

   On envoie deux points, on reçoit des étapes déjà traduites en phrases que
   BIA a enregistrées de sa voix. La traduction est dans lib/carte.ts, et elle
   a son épreuve : une manœuvre qu'on ne sait pas nommer se TAIT plutôt que de
   s'improviser.

   ── LE SERVEUR D'ITINÉRAIRES N'EST PAS ENCORE CHOISI ──────────────────────

   Ce qu'on utilise par défaut ici est le serveur de DÉMONSTRATION du projet
   OSRM. Il calcule très bien Dakar — vérifié le 11 septembre 2026, Sandaga →
   l'université, 3 504 mètres et dix étapes — mais il est fait pour essayer,
   pas pour faire tourner une application.

   Il faudra donc trancher avant d'ouvrir ça au public, et c'est une décision
   qui coûte de l'argent, donc elle est à Lamine :

     — un service payant (OpenRouteService annonce une offre gratuite, mais
       décrite pour « évaluation et projets personnels » : je n'ai pas pu lire
       leur page officielle de tarifs, donc je ne garantis rien) ;
     — ou notre propre serveur : le Sénégal entier tient dans très peu de
       données, et ça ne dépend alors de personne.

   L'adresse se change par variable d'environnement, sans toucher au code :
   CARTE_CHEMIN. Tant qu'elle n'est pas mise, on reste sur la démonstration,
   et la réponse le dit — champ « provisoire » — pour que ça ne s'oublie
   pas en silence. */

const OSRM_DEMO = "https://router.project-osrm.org";
const ROUTEUR = process.env.CARTE_CHEMIN || OSRM_DEMO;
const PROFIL = process.env.CARTE_PROFIL || "driving";

const nombre = (v: string | null) => {
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
};

export async function GET(request: NextRequest) {
  const verdict = verifierCode(request.headers.get("x-bia-code"));
  if (!verdict.ok) return NextResponse.json({ erreur: "code" }, { status: 401 });

  const p = request.nextUrl.searchParams;
  const deLat = nombre(p.get("delat")), deLon = nombre(p.get("delon"));
  const versLat = nombre(p.get("verslat")), versLon = nombre(p.get("verslon"));
  if (deLat === null || deLon === null || versLat === null || versLon === null) {
    return NextResponse.json({ erreur: "il faut deux points" }, { status: 400 });
  }
  /* Une coordonnée aberrante ferait calculer un chemin à travers l'Atlantique.
     On refuse ce qui n'est pas sur Terre. */
  if (Math.abs(deLat) > 90 || Math.abs(versLat) > 90 || Math.abs(deLon) > 180 || Math.abs(versLon) > 180) {
    return NextResponse.json({ erreur: "coordonnées impossibles" }, { status: 400 });
  }

  const adresse = `${ROUTEUR.replace(/\/$/, "")}/route/v1/${PROFIL}/`
    + `${deLon},${deLat};${versLon},${versLat}`
    + `?steps=true&overview=full&geometries=geojson&annotations=false`;

  try {
    const r = await fetch(adresse, { cache: "no-store" });
    if (!r.ok) throw new Error(`itinéraire ${r.status}`);
    const chemin = lireChemin(await r.json());
    if (!chemin) {
      /* Pas de chemin n'est pas une panne : BIA a une phrase pour ça, et elle
         propose de passer autrement. */
      return NextResponse.json({ chemin: null, motif: "aucun chemin" });
    }
    return NextResponse.json({
      chemin,
      provisoire: ROUTEUR === OSRM_DEMO,
      /* Le dossier des sons enregistrés, donné UNE FOIS ici. Ensuite le
         téléphone joue « tourné ci ndeyjoor » sans redemander quoi que ce
         soit : une instruction de guidage ne peut pas attendre un
         aller-retour au serveur. */
      base_sons: { wo: baseDesSons("wo"), fr: baseDesSons("fr") },
      /* OpenStreetMap demande l'attribution, et c'est mérité : sans ses
         contributeurs, il n'y aurait aucune route de Dakar à calculer. */
      merci: "Données de route © les contributeurs d'OpenStreetMap",
    });
  } catch (err) {
    noterPanne("calcul d'itinéraire", (err as Error).message.slice(0, 200), "carte");
    return NextResponse.json({ chemin: null, panne: true });
  }
}
