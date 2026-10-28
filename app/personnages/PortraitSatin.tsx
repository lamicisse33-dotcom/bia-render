"use client";
import {useEffect, useRef, useState} from 'react';
import {SATIN_BASE, SATIN_POSTER, estSequenceSatin, reactionSatin, sequenceSatin, fenetreParoleSatin, type SequenceSatin} from '@/lib/animation-satin';
import styles from './personnages.module.css';

/** Les pistes audio des clips sont retirées à la préparation ET le lecteur
 * est muet. Ce composant ne crée jamais de deuxième voix dans la conversation. */
export function PortraitSatin({face, parle, ecoute = false, emotion = 'neutre'}: {
  face: string; parle: boolean; ecoute?: boolean; emotion?: string;
}) {
  const [anime, setAnime] = useState(false);
  const [clip, setClip] = useState<SequenceSatin>('ecoute');
  const [visible, setVisible] = useState(false);
  const [panne, setPanne] = useState(false);
  const video = useRef<HTMLVideoElement>(null);
  const timer = useRef<number | undefined>(undefined);
  const reactionEnCours = useRef<SequenceSatin | null>(null);
  const dernierSignal = useRef<SequenceSatin | null>(null);
  const etat = useRef({parle, ecoute, emotion, anime});
  etat.current = {parle, ecoute, emotion, anime};
  const signal = reactionSatin(face);
  const demande = sequenceSatin({parle, ecoute, emotion, face, anime});
  const annulerAttente = () => { if (timer.current !== undefined) window.clearTimeout(timer.current); timer.current = undefined; };

  useEffect(() => {
    const m = window.matchMedia('(prefers-reduced-motion: reduce)');
    const regler = () => setAnime(!m.matches && document.visibilityState !== 'hidden');
    regler(); m.addEventListener('change', regler); document.addEventListener('visibilitychange', regler);
    return () => { m.removeEventListener('change', regler); document.removeEventListener('visibilitychange', regler); annulerAttente(); };
  }, []);

  useEffect(() => {
    annulerAttente();
    if (!anime || ecoute) {
      reactionEnCours.current = null; dernierSignal.current = signal;
      setClip('ecoute');
      if (!anime) { video.current?.pause(); setVisible(false); }
      return;
    }
    if (parle) {
      reactionEnCours.current = null; dernierSignal.current = signal;
      setClip(demande || 'ecoute');
      return;
    }
    // Les huit cases d'un geste historique déclenchent une seule prise vidéo.
    if (signal && signal !== dernierSignal.current) {
      reactionEnCours.current = signal; setClip(signal);
    } else if (!reactionEnCours.current) setClip('ecoute');
    dernierSignal.current = signal;
  }, [parle, ecoute, anime, emotion, signal, demande]);

  useEffect(() => {
    const apercu = (event: Event) => {
      const n = (event as CustomEvent).detail;
      const e = etat.current;
      if (!e.anime || e.ecoute || e.parle || !estSequenceSatin(n) || n === 'ecoute') return;
      annulerAttente(); reactionEnCours.current = n;
      setClip(n);
      const v = video.current;
      if (v?.dataset.sequence === n) { v.currentTime = 0; void v.play().catch(() => setVisible(false)); }
    };
    window.addEventListener('bia-apercu-satin', apercu);
    return () => window.removeEventListener('bia-apercu-satin', apercu);
  }, []);

  useEffect(() => {
    const v = video.current;
    setVisible(false); setPanne(false);
    if (!v || !anime) return;
    v.muted = true;
    const lancer = () => {
      if (video.current !== v) return;
      const fenetre = etat.current.parle ? fenetreParoleSatin(clip) : null;
      if (fenetre) v.currentTime = fenetre.debut;
      void v.play().catch(() => { if (video.current === v) setVisible(false); });
    };
    if (v.readyState >= 1) lancer();
    else v.addEventListener('loadedmetadata', lancer, {once:true});
    return () => { v.removeEventListener('loadedmetadata', lancer); v.pause(); annulerAttente(); };
  }, [clip, anime]);

  function terminer() {
    const e = etat.current;
    if (!e.anime) return;
    if (e.parle && !e.ecoute) {
      const v = video.current;
      if (v) { v.currentTime = fenetreParoleSatin(clip)?.debut || 0; void v.play().catch(() => setVisible(false)); }
      return;
    }
    reactionEnCours.current = null;
    if (clip !== 'ecoute') { setClip('ecoute'); return; }
    // Une boucle fermée de clignement/écoute, puis une pause variable.
    // La bouche reste fermée ; les mains ne se lèvent pas pendant l'écoute.
    timer.current = window.setTimeout(() => {
      const v = video.current;
      if (v && etat.current.anime && !etat.current.parle && v.dataset.sequence === 'ecoute') {
        v.currentTime = 0; void v.play().catch(() => setVisible(false));
      }
    }, 2500 + Math.random() * 4500);
  }
  // Ne jamais laisser une dernière image de bisou ou de parole pendant une
  // reprise utilisateur, même avant que l'effet de changement soit exécuté.
  const autorise = anime && !panne && (!ecoute || clip === 'ecoute');
  return <div className={styles.presence} data-bia-habillage="satin-anime" data-parle={parle ? 'oui' : 'non'} data-ecoute={ecoute ? 'oui' : 'non'} aria-hidden="true">
    <div className={styles.cadre}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img className={styles.posterSatin} src={SATIN_POSTER} alt="" />
      <video key={clip} ref={video} className={styles.videoSatin}
        data-sequence={clip} data-video-visible={autorise && visible ? 'oui' : 'non'}
        src={`${SATIN_BASE}/${clip}.mp4`} poster={SATIN_POSTER}
        muted playsInline preload="auto" disablePictureInPicture
        onPlaying={() => setVisible(true)} onEnded={terminer}
        onTimeUpdate={event => {
          const v = event.currentTarget, e = etat.current;
          const fenetre = e.parle && !e.ecoute ? fenetreParoleSatin(clip) : null;
          if (fenetre && v.currentTime >= fenetre.fin) v.currentTime = fenetre.debut;
        }}
        onError={() => { setPanne(true); setVisible(false); }}
        style={{opacity: autorise && visible ? 1 : 0}} />
    </div>
  </div>;
}
