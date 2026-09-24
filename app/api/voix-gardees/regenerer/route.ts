/**
 * POST /api/voix-gardees/regenerer
 *
 * Relit le JSON sidecar d'un son existant, applique les règles de
 * prononciation à jour (incluant la correction que l'on vient d'enregistrer),
 * synthétise un nouveau MP3 et l'écrase dans le seau voix-gardees.
 *
 * Aucun coût ne s'ajoute si la voix locale répond ; sinon un appel TTS
 * remplace le fichier — mais c'est un seul appel au lieu de deux (l'ancien
 * son est supprimé ET un nouveau est créé lors de la prochaine demande).
 *
 * Body : { chemin: "wo/abc123...mp3" }
 * Header : x-bia-code (code maître)
 */

import { NextRequest, NextResponse } from "next/server";
import { CHEMIN_VALIDE, SEAU, entetes, lireDansLeSeau } from "@/lib/voix-gardees";
import { synthetiser, decouper } from "@/lib/voix";
import { prononcer, rafraichirMaintenant } from "@/lib/prononciation";
import { pourLaVoix } from "@/lib/nombres";
import { versMp3 } from "@/lib/mp3";
import { lexiqueConfig } from "@/lib/lexique";

const CODE_MAITRE = process.env.BIA_CODE_MAITRE ?? "";
function autoriser(req: NextRequest): boolean {
  const code = req.headers.get("x-bia-code") ?? "";
  return CODE_MAITRE.length > 0 && code === CODE_MAITRE;
}

export async function POST(req: NextRequest) {
  if (!autoriser(req)) return NextResponse.json({ erreur: "Non autorisé" }, { status: 401 });

  let chemin: string;
  try {
    ({ chemin } = await req.json() as { chemin: string });
  } catch {
    return NextResponse.json({ erreur: "JSON invalide" }, { status: 400 });
  }

  if (!chemin || !CHEMIN_VALIDE.test(chemin) || !chemin.endsWith(".mp3")) {
    return NextResponse.json({ erreur: "Chemin invalide" }, { status: 400 });
  }

  // 1. Lire le sidecar JSON pour obtenir texte + langue
  const jsonChemin = chemin.replace(".mp3", ".json");
  const rJson = await lireDansLeSeau(jsonChemin);
  if (!rJson) return NextResponse.json({ erreur: "Sidecar introuvable" }, { status: 404 });

  const meta = await rJson.json() as { texte?: string; langue?: string; voix?: string; moteur?: string };
  const texte = String(meta.texte ?? "").trim();
  const langue = meta.langue === "fr" ? "fr" : "wo";
  if (!texte) return NextResponse.json({ erreur: "Texte vide dans le sidecar" }, { status: 422 });

  // 2. Forcer le rafraîchissement des règles depuis Supabase
  await rafraichirMaintenant();

  // 3. Appliquer prononciation corrigée
  const morceaux = decouper(prononcer(pourLaVoix(texte, langue)));
  const textePrononce = morceaux[0] ?? texte; // un son = un morceau

  // 4. Synthétiser
  const parole = await synthetiser(textePrononce, langue, {}, "regeneration", "mp3");
  if (!parole) return NextResponse.json({ erreur: "Synthèse vocale indisponible" }, { status: 503 });

  // 5. Convertir en MP3 si nécessaire
  let audio = parole.audio;
  if (parole.typeMime === "audio/wav") {
    try {
      const brut = audio.buffer.slice(audio.byteOffset, audio.byteOffset + audio.byteLength) as ArrayBuffer;
      const mp3 = versMp3(brut);
      audio = Buffer.from(mp3.buffer, mp3.byteOffset, mp3.byteLength);
    } catch { /* garder wav si l'encodeur échoue */ }
  }

  // 6. Écraser le MP3 dans Supabase (même chemin)
  const uploadMp3 = await fetch(`${lexiqueConfig.url}/storage/v1/object/${SEAU}/${chemin}`, {
    method: "POST",
    headers: { ...entetes("audio/mpeg"), "x-upsert": "true", "cache-control": "31536000" },
    body: new Uint8Array(audio),
  });
  if (!uploadMp3.ok) {
    const msg = await uploadMp3.text().catch(() => String(uploadMp3.status));
    return NextResponse.json({ erreur: `Dépôt refusé (${uploadMp3.status}): ${msg}` }, { status: 500 });
  }

  // 7. Mettre à jour le sidecar JSON
  void fetch(`${lexiqueConfig.url}/storage/v1/object/${SEAU}/${jsonChemin}`, {
    method: "POST",
    headers: { ...entetes("application/json"), "x-upsert": "true" },
    body: JSON.stringify({ ...meta, moteur: parole.moteur, octets: audio.length, le: new Date().toISOString() }),
  }).catch(() => {});

  return NextResponse.json({ ok: true, chemin, moteur: parole.moteur, octets: audio.length });
}
