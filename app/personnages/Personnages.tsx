"use client";
import { useEffect, useRef, useState } from "react";
import { APPARENCES_BIA, CLE_APPARENCE_BIA, estApparenceBia, imagesTenueBia, visagePourFace,
  positionVisage, programmerGestesBia, chargerApparenceBia, type ApparenceBia, type TenueBia } from "@/lib/apparences-bia";
import {SATIN_ID, SATIN_POSTER} from '@/lib/animation-satin';
import {PortraitSatin} from './PortraitSatin';
import {PortraitRunway} from './PortraitRunway';
import styles from "./personnages.module.css";

export function useHabillageBia() {
  const [habillage, setHabillage] = useState<ApparenceBia | "">("");
  const [chargement, setChargement] = useState(false);
  const [erreur, setErreur] = useState("");
  const demande = useRef(0);
  useEffect(() => {
    const id = ++demande.current;
    try {
      const ancien = localStorage.getItem(CLE_APPARENCE_BIA);
      const premiereMigration = !localStorage.getItem('bia-avatar-buste-restaure-20261029');
      const garde = premiereMigration && (!ancien || ancien === SATIN_ID || ancien === 'original') ? 'runway-direct' : ancien;
      localStorage.setItem('bia-avatar-buste-restaure-20261029','1');
      if(garde&&garde!==ancien)localStorage.setItem(CLE_APPARENCE_BIA,garde);
      if (estApparenceBia(garde)) {
        void chargerApparenceBia(garde).then(() => {
          if (id === demande.current) setHabillage(garde);
        }).catch(() => { if (id === demande.current) setErreur("La tenue n’a pas pu être chargée. Tu peux réessayer."); });
      }
    } catch { /* Le personnage existant reste affiché si le stockage est fermé. */ }
    return () => { demande.current++; };
  }, []);
  async function choisir(valeur: ApparenceBia | "", original?: () => void) {
    const id = ++demande.current;
    setErreur(""); setChargement(true);
    try {
      if (valeur) await chargerApparenceBia(valeur);
      if (id !== demande.current) return;
      original?.();
      setHabillage(valeur);
      try {
        if (valeur) localStorage.setItem(CLE_APPARENCE_BIA, valeur);
        else localStorage.setItem(CLE_APPARENCE_BIA,'original');
      } catch { /* Le changement reste utilisable pour cette visite. */ }
    } catch {
      if (id === demande.current) setErreur("La tenue n’a pas pu être chargée. Ton personnage est conservé ; réessaie.");
    } finally { if (id === demande.current) setChargement(false); }
  }
  return { habillage, choisir, chargement, erreur };
}

export function ChoixPersonnage({ habillage, choisir, chargement, erreur, persona, choisirPersona }: ReturnType<typeof useHabillageBia> & {
  persona: string; choisirPersona: (persona: string) => void;
}) {
  const [ouvert, setOuvert] = useState(false);
  return <div className={styles.choix}>
    <button type="button" aria-expanded={ouvert} aria-controls="bia-choix-personnage" onClick={() => setOuvert(v => !v)}>Changer de personnage</button>
    {ouvert && <fieldset id="bia-choix-personnage" className={styles.options} aria-busy={chargement}>
      <legend>Le personnage de Bia</legend>
      <div className={styles.grille}>
        {([['rara', 'Bia actuelle'], ['bia', 'Autre personnage existant']] as const).map(([id, nom]) =>
          <button key={id} type="button" aria-pressed={!habillage && persona === id}
            onClick={() => void choisir("", () => choisirPersona(id))}>{nom}</button>)}
        {APPARENCES_BIA.map(t => <button key={t.id} type="button" aria-pressed={habillage === t.id}
          onClick={() => void choisir(t.id)}>
          <span className={styles.vignette} aria-hidden="true" style={{ backgroundImage: `url("${t.id === SATIN_ID || t.id === 'runway-direct' ? SATIN_POSTER : imagesTenueBia(t.id).repos}")` }} />
          <span>{t.nom}</span>
        </button>)}
      </div>
      {habillage === SATIN_ID && <div className={styles.apercusSatin}>
        <span>Voir ses gestes</span>
        {([['parole','Parole'], ['joie','Joie'], ['rire','Rire'], ['coeurs','Cœur'], ['bisou','Bisou']] as const).map(([id, nom]) =>
          <button key={id} type="button" onClick={() => window.dispatchEvent(new CustomEvent('bia-apercu-satin', {detail:id}))}>{nom}</button>)}
      </div>}
      <p className={styles.note} role="status">{chargement ? "Préparation du personnage…" : "Ton choix est mémorisé sur cet appareil."}</p>
      {erreur && <p role="alert">{erreur}</p>}
      <button type="button" onClick={() => setOuvert(false)}>Fermer le choix</button>
    </fieldset>}
  </div>;
}

export function PortraitTenue({tenue, face, parle = false, ecoute = false, emotion = 'neutre'}: {
  tenue: ApparenceBia; face: string; parle?: boolean; ecoute?: boolean; emotion?: string;
}) {
  return tenue === 'runway-direct' ? <PortraitRunway face={face} parle={parle} ecoute={ecoute} emotion={emotion}/> : tenue === SATIN_ID ? <PortraitSatin face={face} parle={parle} ecoute={ecoute} emotion={emotion} />
    : <PortraitTenueFixe tenue={tenue} face={face} parle={parle} />;
}
function PortraitTenueFixe({ tenue, face, parle = false }: { tenue: TenueBia; face: string; parle?: boolean }) {
  const [mouvement, setMouvement] = useState({ tenue, pose: 0 });
  const [anime, setAnime] = useState(false);
  useEffect(() => {
    const media = window.matchMedia("(prefers-reduced-motion: reduce)");
    const regler = () => setAnime(!media.matches && document.visibilityState !== "hidden");
    regler(); media.addEventListener("change", regler); document.addEventListener("visibilitychange", regler);
    return () => { media.removeEventListener("change", regler); document.removeEventListener("visibilitychange", regler); };
  }, []);
  useEffect(() => {
    setMouvement({ tenue, pose: 0 });
    if (!parle || !anime) return;
    return programmerGestesBia({
      emettre: pose => setMouvement({ tenue, pose }),
      planifier: (suite, delai) => window.setTimeout(suite, delai),
      annuler: timer => window.clearTimeout(timer),
    });
  }, [parle, anime, tenue]);
  const sources = imagesTenueBia(tenue);
  const pose = parle && anime && mouvement.tenue === tenue ? mouvement.pose : 0;
  const visage = visagePourFace(face, parle);
  return <div className={styles.presence} data-bia-habillage={tenue} data-parle={parle ? "oui" : "non"} data-geste={pose} aria-hidden="true">
    <div className={styles.cadre}>
      <div className={styles.repos} style={{ backgroundImage: `url("${sources.repos}")` }} />
      {/* La tête et le buste restent fixes. Seul le bas du portrait change
          lors d'un geste ; chaque case garde la définition de la source. */}
      {[1, 2].map(n => <div key={n} className={styles.mains} style={{
        backgroundImage: `url("${sources.gestes}")`, backgroundPosition: `${n * 50}% 0`,
        opacity: pose >= n ? 1 : 0,
      }} />)}
      <div className={styles.visage} style={{
        backgroundImage: `url("${sources.visages}")`, backgroundPosition: positionVisage(visage),
      }} data-expression={face} data-visage={visage} />
    </div>
  </div>;
}
