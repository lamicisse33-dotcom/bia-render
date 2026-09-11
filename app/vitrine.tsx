"use client";

import { useEffect, useState } from "react";
import type { PieceEcran } from "./ecran";

/* ── LA VITRINE : CE QUE LAMINE A DÉPOSÉ ────────────────────────────────────

   Les images ne s'affichent plus dans le fil : elles vont sur L'ÉCRAN qui
   s'ouvre sous son menton (app/ecran.tsx). Lamine, le 11 septembre 2026 :
   « ça doit s'afficher à partir de son menton jusqu'en bas ».

   Ce qui reste ici est donc double :
   — de quoi ALLER CHERCHER un sujet, avec sa mémoire, pour que la page
     l'envoie à l'écran ;
   — une petite carte gardée dans le fil, à sa place dans la conversation,
     pour rouvrir l'écran plus tard. Le fil est ce qu'on remonte ; l'écran est
     ce qu'on regarde. */

type Piece = { cle: string; sorte: "photo" | "video"; nom: string; url: string; attente?: string };
type Sujet = { cle: string; nom: string; pieces: Piece[] };

export type SujetVu = { titre: string; pieces: PieceEcran[]; credit?: string };

/* Deux demandes du même sujet dans la même conversation ne repartent pas au
   serveur. Le catalogue est déjà gardé côté serveur ; ceci évite même
   l'aller-retour. */
const connus = new Map<string, SujetVu | null>();

function convertir(s: Sujet): SujetVu {
  return {
    titre: s.nom,
    pieces: s.pieces.map((p) => ({
      id: `${s.cle}/${p.cle}`,
      sorte: p.sorte === "video" ? "video" : "image",
      titre: p.nom,
      apercu: p.sorte === "video" ? (p.attente || "") : p.url,
      grande: p.sorte === "video" ? undefined : p.url,
      ...(p.sorte === "video" ? { fichier: p.url, attente: p.attente } : {}),
    })),
  };
}

/** Va chercher un sujet de la vitrine. Rend null si la vitrine ne le connaît
    pas — auquel cas rien ne s'affiche, et la réponse de BIA reste entière. */
export async function chargerSujet(cle: string): Promise<SujetVu | null> {
  if (connus.has(cle)) return connus.get(cle) as SujetVu | null;
  try {
    const r = await fetch(`/api/vitrine?voir=${encodeURIComponent(cle)}`);
    const d = (await r.json()) as { sujet?: Sujet | null };
    const vu = d.sujet && d.sujet.pieces?.length ? convertir(d.sujet) : null;
    connus.set(cle, vu);
    return vu;
  } catch {
    // Pas de réseau : on n'enregistre rien, pour réessayer plus tard.
    return null;
  }
}

/** La carte laissée dans le fil : elle rouvre l'écran, elle ne montre rien. */
export default function CarteVitrine({ cle, ouvrir }: { cle: string; ouvrir: (v: SujetVu) => void }) {
  const [vu, setVu] = useState<SujetVu | null>(null);

  useEffect(() => {
    let vivant = true;
    void chargerSujet(cle).then((v) => { if (vivant) setVu(v); });
    return () => { vivant = false; };
  }, [cle]);

  if (!vu) return null;

  return (
    <button type="button" className="carte-ecran" onClick={() => ouvrir(vu)}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={vu.pieces[0].apercu} alt="" loading="lazy" decoding="async" />
      <span>
        <b>{vu.titre}</b>
        <i>{vu.pieces.length} {vu.pieces.length > 1 ? "images" : "image"} — revoir</i>
      </span>
    </button>
  );
}
