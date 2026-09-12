"use client";

import { useEffect, useRef, useState } from "react";

/* ── LA VIDÉO PLEIN ÉCRAN, ET LE VISAGE QUI SE RETIRE ───────────────────────

   Lamine, le 12 septembre 2026, à une heure du matin :

     « Il faut qu'elle puisse afficher des vidéos prises sur YouTube ou
       directement sur ton téléphone, avec le même écran qu'elle affiche la
       carte. Elle se tire au petit coin, carrément elle te laisse la partie
       de l'écran, ou bien elle se retire définitivement comme elle fait sur
       la carte. C'est important. »

   Les deux existaient déjà à moitié, et il a raison de les distinguer :

     SOUS SON MENTON — app/ecran.tsx, écrit hier. Elle reste visible et
     continue de commenter. C'est pour ILLUSTRER : une photo de chaussures
     pendant qu'on parle de chaussures.

     PLEIN ÉCRAN — ce fichier-ci. Elle se retire entièrement, comme sur la
     carte. C'est pour REGARDER : une explication, un tutoriel, un match. On
     ne commente pas par-dessus, on regarde.

   Ce qui ne change pas, et qui est tout l'intérêt : LA CONVERSATION CONTINUE
   DESSOUS. Le micro reste ouvert, on lui parle sans la voir, et la pastille
   bat quand elle répond. Exactement comme la carte — c'est le geste qu'il a
   décrit, et il vaut mieux qu'il soit le même partout.

   ── DEUX SOURCES ─────────────────────────────────────────────────────────

   YOUTUBE, par youtube-nocookie : la version qui ne dépose rien tant qu'on
   n'a pas lancé la lecture. C'est déjà le choix fait dans app/ecran.tsx, on
   ne le défait pas.

   LE TÉLÉPHONE. Une application web ne fouille pas la galerie de quelqu'un —
   et c'est heureux. Elle ouvre le sélecteur du téléphone, la personne choisit,
   et le fichier est lu SUR PLACE : rien n'est envoyé nulle part, rien ne
   monte sur un serveur, rien ne se paie. La vidéo ne quitte pas l'appareil.

   ── CE QUE ÇA NE FAIT PAS ────────────────────────────────────────────────

   BIA ne parle pas PENDANT la vidéo : elle se tairait par-dessus le son, et
   deux voix en même temps ne s'écoutent pas. Elle attend la fin, ou qu'on la
   rappelle. */

export type Film =
  | { sorte: "youtube"; video: string; titre: string; source?: string }
  | { sorte: "fichier"; url: string; titre: string };

export default function Video({
  film, onFermer, onAuMenton, parle,
}: {
  film: Film;
  onFermer: () => void;
  /** Renvoyer la vidéo sous son menton, pour qu'elle reste visible. */
  onAuMenton?: () => void;
  parle: boolean;
}) {
  const [pret, setPret] = useState(false);
  const video = useRef<HTMLVideoElement | null>(null);

  /* On monte noir, puis on ouvre : sans ce temps mort le navigateur pose
     l'image déjà là, et le geste ne se voit pas. C'est le « paf » qu'il
     décrivait pour l'écran sous le menton — même geste, plein cadre. */
  useEffect(() => {
    const t = setTimeout(() => setPret(true), 30);
    return () => clearTimeout(t);
  }, []);

  /* Quand BIA se met à parler, la vidéo du téléphone se met en pause : deux
     voix en même temps ne s'écoutent pas. On ne peut pas le faire pour
     YouTube — son lecteur ne nous appartient pas — et c'est une raison de
     plus de préférer les fichiers du téléphone quand on les a. */
  useEffect(() => {
    if (parle) video.current?.pause();
  }, [parle]);

  return (
    <div className={pret ? "film ouvert" : "film"}>
      <div className="film-cadre">
        {film.sorte === "youtube" ? (
          <iframe
            src={`https://www.youtube-nocookie.com/embed/${encodeURIComponent(film.video)}?autoplay=1&rel=0&playsinline=1`}
            title={film.titre}
            allow="accelerometer; autoplay; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
          />
        ) : (
          <video ref={video} src={film.url} controls autoPlay playsInline />
        )}
      </div>

      {/* ── ELLE S'EST RETIRÉE, MAIS ELLE EST LÀ ─────────────────────────
          Même pastille que sur la carte. Un seul geste à apprendre. */}
      <button type="button" className={parle ? "carte-pastille parle" : "carte-pastille"}
        onClick={onFermer} aria-label="Revenir à BIA">
        <span className="carte-rond" />
        <span className="carte-mot">BIA</span>
      </button>

      <div className="film-bas">
        <p className="film-titre">
          {film.titre}
          {film.sorte === "youtube" && film.source ? <em> · {film.source}</em> : null}
          {film.sorte === "fichier" ? <em> · sur ton téléphone, rien n&apos;est envoyé</em> : null}
        </p>
        <div className="film-boutons">
          {onAuMenton ? (
            <button type="button" className="carte-revenir" onClick={onAuMenton}>
              Mets-la en petit
            </button>
          ) : null}
          <button type="button" className="carte-revenir" onClick={onFermer}>
            Ramène-moi BIA
          </button>
        </div>
      </div>
    </div>
  );
}
