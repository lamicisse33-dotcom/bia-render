"use client";

import { useState } from "react";

/* ── CE QU'ELLE EST ALLÉE CHERCHER ──────────────────────────────────────────

   Lamine, le 11 septembre 2026 : « tu as besoin de chaussures, elle peut aller
   te proposer les chaussures que tu veux ».

   Ce sont des résultats de recherche, et ils doivent EN AVOIR L'AIR. Chaque
   image porte le nom du site d'où elle vient et mène à ce site : on montre où
   c'est, on ne s'attribue rien, et quelqu'un qui veut acheter sait où aller.

   POURQUOI LA VIGNETTE ET PAS L'IMAGE. Beaucoup de boutiques refusent que
   leurs images s'affichent depuis un autre site. La vignette, elle, est servie
   par le moteur et charge toujours. On garde l'image d'origine pour le grand
   format, avec la vignette en filet en dessous : si le site refuse, on voit
   quand même quelque chose.

   LA VIDÉO NE PART QU'AU DOIGT. Tant qu'on n'a pas touché, il n'y a qu'une
   image et un triangle — aucun octet de vidéo, aucun mouchard. Le lecteur
   n'est fabriqué qu'au moment où on le demande. */

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

export default function Trouve({ trouve }: { trouve: Resultat }) {
  const [grande, setGrande] = useState<Piece | null>(null);
  const [joue, setJoue] = useState<string | null>(null);

  if (!trouve?.pieces?.length) return null;

  return (
    <>
      <div className="vitrine" role="group" aria-label={`Trouvé sur Internet — ${trouve.requete}`}>
        {trouve.pieces.map((p, i) => (
          p.sorte === "video" && p.video ? (
            <div key={p.video || i} className="vitrine-piece trouve-piece">
              {joue === p.video ? (
                /* youtube-nocookie : la version qui ne dépose rien tant que la
                   vidéo n'a pas démarré. C'est le moins qu'on doive à
                   quelqu'un qui voulait juste voir des chaussures. */
                <iframe
                  src={`https://www.youtube-nocookie.com/embed/${p.video}?autoplay=1&rel=0`}
                  title={p.titre} allow="autoplay; encrypted-media; picture-in-picture"
                  allowFullScreen loading="lazy" />
              ) : (
                <button type="button" className="trouve-lancer"
                  onClick={() => setJoue(p.video as string)}
                  aria-label={`Lire la vidéo : ${p.titre}`}>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={p.vignette} alt="" loading="lazy" decoding="async" />
                  <span className="trouve-triangle" aria-hidden="true" />
                </button>
              )}
              <span className="trouve-mot">
                <b>{p.titre}</b>
                <em>{p.source}</em>
              </span>
            </div>
          ) : (
            <div key={p.page + i} className="vitrine-piece trouve-piece">
              <button type="button" className="trouve-photo" onClick={() => setGrande(p)}
                aria-label={`Agrandir : ${p.titre}`}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={p.vignette} alt={p.titre} loading="lazy" decoding="async"
                  referrerPolicy="no-referrer" />
              </button>
              <span className="trouve-mot">
                <b>{p.titre}</b>
                {/* Le lien s'ouvre à côté : personne ne doit perdre sa
                    conversation en allant regarder une paire de chaussures. */}
                <a href={p.page} target="_blank" rel="noopener noreferrer nofollow">{p.source}</a>
              </span>
            </div>
          )
        ))}
      </div>

      {grande ? (
        <div className="vitrine-grand" role="dialog" aria-label={grande.titre}
          onClick={() => setGrande(null)}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={grande.grande || grande.vignette} alt={grande.titre}
            referrerPolicy="no-referrer"
            onError={(e) => {
              // Le site refuse qu'on affiche son image : la vignette reprend
              // sa place, et on ne montre jamais un carré cassé.
              const img = e.currentTarget;
              if (img.src !== grande.vignette) img.src = grande.vignette;
            }} />
          <p>{grande.titre}</p>
          <a className="trouve-aller" href={grande.page} target="_blank"
            rel="noopener noreferrer nofollow" onClick={(e) => e.stopPropagation()}>
            Ouvrir sur {grande.source}
          </a>
        </div>
      ) : null}
    </>
  );
}
