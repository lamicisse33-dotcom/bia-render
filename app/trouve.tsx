"use client";

import type { PieceEcran } from "./ecran";

/* ── CE QU'ELLE EST ALLÉE CHERCHER SUR INTERNET ──────────────────────────────

   Lamine, le 11 septembre 2026 : « propose-moi des lunettes, propose-moi des
   chaussures — et ça doit s'afficher à partir de son menton jusqu'en bas ».

   Les résultats vont donc sur L'ÉCRAN (app/ecran.tsx). Ce fichier ne garde que
   la petite carte laissée dans le fil, pour rouvrir plus tard ce qu'elle a
   trouvé : une recherche se paie, et on ne rachète pas deux fois les mêmes
   chaussures pour remonter la conversation. */

type Piece = {
  sorte: "image" | "video";
  titre: string;
  vignette: string;
  grande?: string;
  page: string;
  source: string;
  video?: string;
};

export type Resultat = { sorte: "image" | "video"; requete: string; pieces: Piece[] };

/* Les deux moteurs, nommés. Brave l'exige ; pour YouTube c'est simplement
   honnête — on ne laisse pas croire que BIA a filmé la vidéo. */
const CREDIT = { image: "Brave Search", video: "YouTube" } as const;

/** Ce que l'écran attend, à partir de ce que le serveur a rapporté. */
export function versEcran(t: Resultat): { titre: string; pieces: PieceEcran[]; credit: string } {
  return {
    titre: t.requete,
    credit: CREDIT[t.sorte] || "",
    pieces: t.pieces.map((p, i) => ({
      id: `${p.page || p.video || "p"}-${i}`,
      sorte: p.sorte,
      titre: p.titre,
      apercu: p.vignette,
      grande: p.grande,
      page: p.page,
      source: p.source,
      video: p.video,
    })),
  };
}

export default function CarteTrouve({
  trouve, ouvrir,
}: { trouve: Resultat; ouvrir: (v: { titre: string; pieces: PieceEcran[] }) => void }) {
  if (!trouve?.pieces?.length) return null;
  const combien = trouve.pieces.length;

  return (
    <button type="button" className="carte-ecran" onClick={() => ouvrir(versEcran(trouve))}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={trouve.pieces[0].vignette} alt="" loading="lazy" decoding="async"
        referrerPolicy="no-referrer" />
      <span>
        <b>{trouve.requete}</b>
        <i>
          {combien} {trouve.sorte === "video"
            ? (combien > 1 ? "vidéos" : "vidéo")
            : (combien > 1 ? "images" : "image")} — revoir
        </i>
      </span>
    </button>
  );
}
