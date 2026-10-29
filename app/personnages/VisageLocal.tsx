"use client";
import { useEffect, useRef, useState } from "react";
import { imagesTenueBia } from "@/lib/apparences-bia";
import {
  BOITE_BOUCHE, BOUCHES_LOCALES, FONDU_MS, ORDRE_DE_CHARGEMENT, PAS_BOUCHE_MS,
  SEAU_HORS_LIGNE, TENUE_DU_VISAGE_LOCAL, bouchePourFace, bouclePour, fichierBouche, sourcesBoucle,
  type Boucle, type EtatVisage,
} from "@/lib/visage-local";
import styles from "./personnages.module.css";

/* ── LE DEUXIÈME VISAGE DE BIA, FABRIQUÉ SUR LE TÉLÉPHONE ──────────────────

   Une boucle vidéo bouche fermée en fond, une bouche découpée du portrait
   par-dessus, choisie vingt-cinq fois par seconde sur l'énergie du son.

   ── CE QU'IL FAUT COMPRENDRE AVANT DE LE LIRE ─────────────────────────────

   1. RIEN NE PASSE PAR REACT PENDANT QU'ELLE PARLE. Vingt-cinq rendus par
      seconde pendant une minute de réponse, ce sont mille cinq cents rendus
      d'un arbre qui contient tout l'écran de BIA — sur un téléphone, ça se
      paie en chaleur et en batterie. La bouche est donc posée directement
      sur le nœud, dans une boucle d'animation, et React ne revoit cet arbre
      que lorsque la BOUCLE change : six fois dans une conversation, pas
      mille cinq cents.

   2. LES BOUCLES PEUVENT NE PAS EXISTER, et c'est le cas aujourd'hui. Elles
      demandent une clé Runway que Lamine n'a pas encore posée. Sans elles,
      le fond reste le portrait fixe du 28 octobre et SEULE la bouche bouge :
      le personnage est utilisable, et c'est justement la partie risquée —
      la synchronisation — qui peut être jugée tout de suite. Les boucles se
      posent ensuite sans toucher une ligne d'ici.

   3. LE PERSONNAGE EXISTANT N'EST PAS TOUCHÉ. Ce composant s'affiche à la
      place de PortraitTenue, au-dessus des mêmes couches `.avatar`, et ne
      modifie rien de ce qu'elles font.                                    */

type Props = {
  face: string;
  parle?: boolean;
  etat?: EtatVisage;
  emotion?: string;
  /** Les épreuves s'en servent pour lire ce que le composant a vraiment fait. */
  surMesure?: (m: { bouches: number; boucle: Boucle; videoPrete: boolean }) => void;
};

export default function VisageLocal({ face, parle = false, etat = "ready", emotion = "", surMesure }: Props) {
  const tenue = TENUE_DU_VISAGE_LOCAL;
  const fond = imagesTenueBia(tenue).repos;
  const boucheRef = useRef<HTMLImageElement | null>(null);
  /* Ce que la boucle d'animation doit lire. Des refs, pas des états : la
     boucle tourne en dehors de React et ne doit pas le réveiller. */
  const faceRef = useRef(face);
  const parleRef = useRef(parle);
  faceRef.current = face; parleRef.current = parle;

  const [boucle, setBoucle] = useState<Boucle>("repos");
  const [videoPrete, setVideoPrete] = useState(false);
  const [anime, setAnime] = useState(false);
  const comptes = useRef({ bouches: 0 });

  /* ── LA BOUCHE, VINGT-CINQ FOIS PAR SECONDE ────────────────────────────
     On ne compte pas les images : on regarde l'horloge. Un téléphone qui
     rame rendrait moins de vingt-cinq images par seconde, et une bouche
     cadencée sur les images dériverait du son. Cadencée sur l'horloge, elle
     saute une forme au lieu de prendre du retard. */
  useEffect(() => {
    let vivant = true;
    let dernier = 0;
    let derniereBouche = "";
    let image = 0;
    const pas = () => {
      if (!vivant) return;
      image = requestAnimationFrame(pas);
      const t = performance.now();
      if (t - dernier < PAS_BOUCHE_MS) return;
      dernier = t;
      const voulue = bouchePourFace(faceRef.current, parleRef.current);
      if (voulue === derniereBouche) return;
      derniereBouche = voulue;
      comptes.current.bouches += 1;
      const n = boucheRef.current;
      if (n) n.src = fichierBouche(voulue);
    };
    image = requestAnimationFrame(pas);
    return () => { vivant = false; cancelAnimationFrame(image); };
  }, []);

  /* Le mouvement se coupe quand le téléphone le demande ou quand l'écran
     part en arrière-plan : une vidéo qui tourne sous un écran éteint est de
     la batterie dépensée pour personne. */
  useEffect(() => {
    const media = window.matchMedia("(prefers-reduced-motion: reduce)");
    const regler = () => setAnime(!media.matches && document.visibilityState !== "hidden");
    regler();
    media.addEventListener("change", regler);
    document.addEventListener("visibilitychange", regler);
    return () => { media.removeEventListener("change", regler); document.removeEventListener("visibilitychange", regler); };
  }, []);

  useEffect(() => { setBoucle(bouclePour(etat, emotion)); }, [etat, emotion]);

  /* ── LES HUIT BOUCHES D'ABORD, LES BOUCLES ENSUITE ─────────────────────
     Huit images de soixante-dix kilo-octets : c'est ce qui fait vivre le
     visage, et c'est ce qui doit être là en premier. Une bouche qui arrive
     en retard se voit ; une boucle qui arrive en retard ne se voit pas,
     puisque le portrait fixe tient sa place. */
  useEffect(() => {
    for (const b of BOUCHES_LOCALES) { const i = new Image(); i.src = fichierBouche(b); }
  }, []);

  /* ── LE RANGEMENT HORS LIGNE ───────────────────────────────────────────
     Depuis la page, dans un seau daté, et JAMAIS par le service worker :
     public/sw.js explique pourquoi il ne garde pas l'application. Des
     fichiers dont le nom porte la date ne périment pas, donc les garder ne
     peut pas servir une vieille BIA. Un échec ne casse rien : on redemande
     au réseau comme avant. */
  useEffect(() => {
    if (!("caches" in window)) return;
    let vivant = true;
    (async () => {
      try {
        const seau = await caches.open(SEAU_HORS_LIGNE);
        for (const b of ORDRE_DE_CHARGEMENT) {
          if (!vivant) return;
          for (const s of sourcesBoucle(b)) {
            if (await seau.match(s.src)) continue;
            try { await seau.add(s.src); break; } catch { /* absente : le portrait fixe tient */ }
          }
        }
      } catch { /* seau fermé : rien de grave, tout vient du réseau */ }
    })();
    return () => { vivant = false; };
  }, []);

  useEffect(() => { surMesure?.({ ...comptes.current, boucle, videoPrete }); });

  const sources = sourcesBoucle(boucle);
  return (
    <div className={styles.presence} data-bia-habillage={tenue} data-visage-local="oui"
      data-boucle={boucle} data-parle={parle ? "oui" : "non"} aria-hidden="true">
      <div className={styles.cadre}>
        {/* Le portrait fixe est TOUJOURS là, dessous. Il n'est pas un
            remplaçant : c'est le fond sur lequel la vidéo se pose, et ce qui
            reste visible si la vidéo ne vient jamais. */}
        <div className={styles.repos} style={{ backgroundImage: `url("${fond}")` }} />
        {anime && (
          <video key={boucle} className={styles.boucle} autoPlay loop muted playsInline preload="auto"
            style={{ opacity: videoPrete ? 1 : 0, transition: `opacity ${FONDU_MS}ms linear` }}
            onCanPlay={() => setVideoPrete(true)}
            onError={() => setVideoPrete(false)}>
            {sources.map(s => <source key={s.src} src={s.src} type={s.type} />)}
          </video>
        )}
        {/* La bouche, par-dessus tout. Son `src` change vingt-cinq fois par
            seconde sans que React en sache rien. */}
        <img ref={boucheRef} className={styles.bouche} alt="" src={fichierBouche("repos")}
          style={{
            left: `${BOITE_BOUCHE.gauche}%`, top: `${BOITE_BOUCHE.haut}%`,
            width: `${BOITE_BOUCHE.largeur}%`, height: `${BOITE_BOUCHE.hauteur}%`,
          }} />
      </div>
    </div>
  );
}
