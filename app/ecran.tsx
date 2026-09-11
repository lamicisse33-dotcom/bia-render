"use client";

import { useEffect, useRef, useState } from "react";

/* ── L'ÉCRAN QUI S'OUVRE SOUS SON MENTON ────────────────────────────────────

   Lamine, le 11 septembre 2026, après m'avoir repris deux fois :

     « Ça doit s'afficher sur une partie de l'écran, c'est-à-dire à partir de
       son menton jusqu'en bas. Il faut faire comme magie : paf, il y a un
       écran de télévision ou un écran d'ordinateur qui s'ouvre pour te
       montrer cette image. »

   Je les avais mises dans le fil, en petit, sous la bulle de texte — et il
   avait raison de ne pas s'en contenter. Une vignette perdue entre deux
   messages, ce n'est pas BIA qui te montre quelque chose : c'est une page web.
   Ce qu'il veut, c'est un GESTE. Elle parle, et un écran s'ouvre devant elle.

   OÙ EXACTEMENT. Le menton est à 52 % de la hauteur, mesuré sur une capture
   au lieu d'être deviné — son visage occupe le haut, ses épaules le milieu.
   L'écran part de là et descend jusqu'en bas. Il passe SOUS la barre du micro
   (qui reste au-dessus de lui) : sans ça, on ouvrirait un écran qu'on ne
   pourrait plus fermer sans le micro, et on emprisonnerait la personne dans
   des photos de chaussures.

   L'OUVERTURE. Une ligne de lumière qui se déplie, comme une télévision
   qu'on allume — c'est le « paf » qu'il décrit, et c'est aussi ce qui donne le
   temps aux images d'arriver du réseau avant qu'on les voie. Trois dixièmes
   de seconde. Assez pour se voir, trop court pour attendre. */

export type PieceEcran = {
  id: string;
  sorte: "image" | "video";
  titre: string;
  /** Ce qui s'affiche tout de suite : une vignette qui ne casse jamais. */
  apercu: string;
  /** La version pleine, quand elle existe. Un site peut la refuser : on
      retombe alors sur l'aperçu, jamais sur un carré cassé. */
  grande?: string;
  /** La page d'où ça vient, et le nom qu'on écrit dessous. */
  page?: string;
  source?: string;
  /** Vidéo YouTube : l'identifiant. */
  video?: string;
  /** Vidéo déposée par Lamine dans la vitrine : le fichier. */
  fichier?: string;
  /** Vidéo de la vitrine : l'image d'attente. */
  attente?: string;
};

export default function Ecran({
  titre, pieces, credit, onFermer,
}: { titre: string; pieces: PieceEcran[]; credit?: string; onFermer: () => void }) {
  const [ouvert, setOuvert] = useState(false);
  const [joue, setJoue] = useState<string | null>(null);
  const [grande, setGrande] = useState<PieceEcran | null>(null);
  const rail = useRef<HTMLDivElement | null>(null);

  /* On monte fermé, puis on ouvre à la frame suivante : sans ce temps mort,
     le navigateur pose l'écran déjà ouvert et l'animation ne se voit pas. */
  useEffect(() => {
    const t = setTimeout(() => setOuvert(true), 20);
    return () => clearTimeout(t);
  }, []);

  // Une nouvelle recherche : on revient au début et on coupe la vidéo d'avant.
  useEffect(() => {
    setJoue(null);
    setGrande(null);
    if (rail.current) rail.current.scrollLeft = 0;
  }, [titre, pieces]);

  // Échap referme, comme partout ailleurs dans l'application.
  useEffect(() => {
    const touche = (e: KeyboardEvent) => { if (e.key === "Escape") onFermer(); };
    window.addEventListener("keydown", touche);
    return () => window.removeEventListener("keydown", touche);
  }, [onFermer]);

  if (!pieces.length) return null;

  return (
    <>
      <section className={ouvert ? "ecran ouvert" : "ecran"} aria-label={`BIA te montre : ${titre}`}>
        {/* La ligne de lumière de l'allumage. Elle vit devant le contenu le
            temps de l'ouverture, puis s'efface. */}
        <span className="ecran-eclair" aria-hidden="true" />

        <div className="ecran-tete">
          <p className="ecran-titre">
            {titre}
            {/* D'OÙ ÇA VIENT. Brave exige d'être cité par qui se sert de son
                moteur — c'est écrit dans ses conditions, et c'est la
                contrepartie du crédit mensuel. Mais ce n'est pas seulement une
                obligation : quelqu'un a le droit de savoir qui a choisi les
                images qu'on lui montre. */}
            {credit ? <em className="ecran-credit">{credit}</em> : null}
          </p>
          <button type="button" className="ecran-fermer" onClick={onFermer} aria-label="Fermer l'écran">
            <svg viewBox="0 0 24 24" aria-hidden="true">
              <path d="M18.3 7.1 16.9 5.7 12 10.6 7.1 5.7 5.7 7.1l4.9 4.9-4.9 4.9 1.4 1.4 4.9-4.9 4.9 4.9 1.4-1.4-4.9-4.9Z" />
            </svg>
          </button>
        </div>

        <div className="ecran-rail" ref={rail}>
          {pieces.map((p) => (
            <article key={p.id} className="ecran-piece">
              {p.sorte === "video" ? (
                joue === p.id ? (
                  p.fichier ? (
                    <video src={p.fichier} controls autoPlay playsInline poster={p.attente} />
                  ) : (
                    /* youtube-nocookie : la version qui ne dépose rien tant
                       que la vidéo n'a pas démarré. */
                    <iframe
                      src={`https://www.youtube-nocookie.com/embed/${p.video}?autoplay=1&rel=0`}
                      title={p.titre} allow="autoplay; encrypted-media; picture-in-picture"
                      allowFullScreen loading="lazy" />
                  )
                ) : (
                  <button type="button" className="ecran-lancer" onClick={() => setJoue(p.id)}
                    aria-label={`Lire : ${p.titre}`}>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={p.apercu} alt="" loading="lazy" decoding="async" referrerPolicy="no-referrer" />
                    <span className="ecran-triangle" aria-hidden="true" />
                  </button>
                )
              ) : (
                <button type="button" className="ecran-voir" onClick={() => setGrande(p)}
                  aria-label={`Agrandir : ${p.titre}`}>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={p.apercu} alt={p.titre} loading="lazy" decoding="async" referrerPolicy="no-referrer" />
                </button>
              )}

              <div className="ecran-mot">
                <b>{p.titre}</b>
                {/* Le nom du site, et le lien vers lui. C'est ce qui fait de
                    ces images des résultats et non une boutique : on montre
                    où c'est, on ne s'attribue rien. */}
                {p.page && p.source ? (
                  <a href={p.page} target="_blank" rel="noopener noreferrer nofollow">{p.source}</a>
                ) : p.source ? <em>{p.source}</em> : null}
              </div>
            </article>
          ))}
        </div>
      </section>

      {grande ? (
        <div className="ecran-grand" role="dialog" aria-label={grande.titre}
          onClick={() => setGrande(null)}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={grande.grande || grande.apercu} alt={grande.titre} referrerPolicy="no-referrer"
            onError={(e) => {
              const img = e.currentTarget;
              if (img.src !== grande.apercu) img.src = grande.apercu;
            }} />
          <p>{grande.titre}</p>
          {grande.page && grande.source ? (
            <a className="ecran-aller" href={grande.page} target="_blank"
              rel="noopener noreferrer nofollow" onClick={(e) => e.stopPropagation()}>
              Ouvrir sur {grande.source}
            </a>
          ) : null}
        </div>
      ) : null}
    </>
  );
}
