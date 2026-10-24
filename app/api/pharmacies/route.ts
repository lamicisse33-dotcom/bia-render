import { NextRequest, NextResponse } from "next/server";
import { verifierCode } from "@/lib/codes";
import { pharmaciesAutour, gardeConnue, POURQUOI_PAS_DE_GARDE, SOURCE } from "@/lib/pharmacies";
import { URGENCES_NATIONALES } from "@/lib/urgences";

/* ── LA PHARMACIE LA PLUS PROCHE, ET CE QU'ON NE SAIT PAS ─────────────────

   Plan de Lamine, 24 octobre 2026, point (1). Cette route rend ce qu'elle
   sait — les pharmacies les plus proches, nommées, avec leur distance — et
   dit ce qu'elle ne sait pas : laquelle est de garde.

   LA POSITION NE QUITTE PAS LA REQUÊTE. Elle n'est ni gardée, ni comptée, ni
   écrite nulle part : c'est la règle posée le 24 octobre pour l'orientation,
   et une pharmacie n'est pas une raison de la lever. */

export async function POST(request: NextRequest) {
  if (!verifierCode(request.headers.get("x-bia-code"), false).ok)
    return NextResponse.json({ erreur: "code" }, { status: 401 });

  const corps = await request.json().catch(() => ({})) as { lat?: number; lon?: number };
  const lat = Number(corps.lat), lon = Number(corps.lon);
  if (!Number.isFinite(lat) || !Number.isFinite(lon) || Math.abs(lat) > 90 || Math.abs(lon) > 180)
    return NextResponse.json({ trouve: false, raison: "Sa position n'est pas arrivée. Propose de réessayer dehors." });

  /* Le numéro à donner quand on ne sait pas : le SAMU répond toujours, et
     c'est lui qui sait quelle pharmacie est ouverte cette nuit. On le prend
     dans la liste vérifiée, jamais de mémoire. */
  const samu = URGENCES_NATIONALES.find((u) => /samu/i.test(u.quoi))?.numero || "1515";

  try {
    const liste = await pharmaciesAutour({ lat, lon });
    if (!liste.length)
      return NextResponse.json({
        trouve: false,
        raison: `Aucune pharmacie trouvée autour d'elle sur la carte. Propose d'appeler le ${samu}.`,
        samu,
      });
    return NextResponse.json({
      trouve: true,
      pharmacies: liste,
      plus_proche: liste[0],
      source: SOURCE,
      /* ── CE CHAMP EST LE PLUS IMPORTANT DE LA ROUTE ────────────────────
         `garde_connue` est faux tant qu'aucune source de tour de garde ne
         répond. Dire qu'une pharmacie est de garde sans le savoir envoie
         quelqu'un, la nuit, devant un rideau baissé — avec un enfant qui a
         de la fièvre et une demi-heure perdue. */
      garde_connue: gardeConnue(),
      samu,
      consigne: gardeConnue()
        ? "Dis laquelle est de garde, sa distance, et cite la source."
        : POURQUOI_PAS_DE_GARDE
          + " Donne le nom de la plus proche et sa distance ; la carte montre le chemin.",
    });
  } catch (e) {
    return NextResponse.json({
      trouve: false,
      raison: `La carte des pharmacies n'a pas répondu. Dis-le, et propose d'appeler le ${samu}.`,
      samu,
      motif: (e as Error).message.slice(0, 120),
    });
  }
}
