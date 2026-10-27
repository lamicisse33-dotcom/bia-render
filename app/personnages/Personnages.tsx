"use client";
import { useEffect, useRef, useState, type CSSProperties } from "react";
import { TENUES_BIA, CLE_APPARENCE_BIA, estTenueBia, imagesTenueBia, imagePourFace,
  positionCase, GESTES_PAROLE, chargerTenueBia, type TenueBia } from "@/lib/apparences-bia";
import styles from "./personnages.module.css";

export function useHabillageBia() {
  const [habillage, setHabillage] = useState<TenueBia | "">("");
  const [chargement, setChargement] = useState(false);
  const [erreur, setErreur] = useState("");
  const demande = useRef(0);
  useEffect(() => {
    const id = ++demande.current;
    try {
      const garde = localStorage.getItem(CLE_APPARENCE_BIA);
      if (estTenueBia(garde)) {
        void chargerTenueBia(garde).then(() => {
          if (id === demande.current) setHabillage(garde);
        }).catch(() => { if (id === demande.current) setErreur("La tenue n’a pas pu être chargée. Tu peux réessayer."); });
      }
    } catch { /* Le personnage existant reste affiché si le stockage est fermé. */ }
    return () => { demande.current++; };
  }, []);
  async function choisir(valeur: TenueBia | "", original?: () => void) {
    const id = ++demande.current;
    setErreur(""); setChargement(true);
    try {
      if (valeur) await chargerTenueBia(valeur);
      if (id !== demande.current) return;
      original?.();
      setHabillage(valeur);
      try {
        if (valeur) localStorage.setItem(CLE_APPARENCE_BIA, valeur);
        else localStorage.removeItem(CLE_APPARENCE_BIA);
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
        {TENUES_BIA.map(t => <button key={t.id} type="button" aria-pressed={habillage === t.id}
          onClick={() => void choisir(t.id)}>
          <span className={styles.vignette} aria-hidden="true" style={{ backgroundImage: `url("${imagesTenueBia(t.id).expressions}")`, backgroundPosition: positionCase(7) }} />
          <span>{t.nom}</span>
        </button>)}
      </div>
      <p className={styles.note} role="status">{chargement ? "Préparation du personnage…" : "Ton choix est mémorisé sur cet appareil."}</p>
      {erreur && <p role="alert">{erreur}</p>}
      <button type="button" onClick={() => setOuvert(false)}>Fermer le choix</button>
    </fieldset>}
  </div>;
}

export function PortraitTenue({ tenue, face, parle = false }: { tenue: TenueBia; face: string; parle?: boolean }) {
  const [mouvement, setMouvement] = useState({ actuel: 0, avant: 0, numero: 0 });
  const [anime, setAnime] = useState(false);
  useEffect(() => {
    const media = window.matchMedia("(prefers-reduced-motion: reduce)");
    const regler = () => setAnime(!media.matches && document.visibilityState !== "hidden");
    regler(); media.addEventListener("change", regler); document.addEventListener("visibilitychange", regler);
    return () => { media.removeEventListener("change", regler); document.removeEventListener("visibilitychange", regler); };
  }, []);
  useEffect(() => {
    setMouvement({ actuel: 0, avant: 0, numero: 0 });
    if (!parle || !anime) return;
    let i = 0;
    const timer = window.setInterval(() => {
      i = (i + 1) % GESTES_PAROLE.length;
      setMouvement(m => ({ actuel: GESTES_PAROLE[i], avant: m.actuel, numero: m.numero + 1 }));
    }, 780);
    return () => window.clearInterval(timer);
  }, [parle, anime, tenue]);
  const sources = imagesTenueBia(tenue);
  const image = imagePourFace(face);
  const style = (planche: "expressions" | "gestes", n: number): CSSProperties => ({
    backgroundImage: `url("${sources[planche]}")`, backgroundPosition: positionCase(n),
  });
  return <div className={styles.presence} data-bia-habillage={tenue} data-parle={parle ? "oui" : "non"} aria-hidden="true">
    <div className={styles.cadre}>
      {parle ? <>
        <div className={styles.image} style={style("gestes", mouvement.actuel)} data-geste={mouvement.actuel} />
        {anime && mouvement.numero > 0 && <div key={mouvement.numero} className={`${styles.image} ${styles.avant}`} style={style("gestes", mouvement.avant)} />}
        {/* Seuls le visage et le haut du buste suivent les lèvres. Les bras
            ont leur propre cadence lente et ne sautent pas toutes les 100 ms. */}
        <div className={`${styles.image} ${styles.visage}`} style={style("expressions", image.planche === "expressions" ? image.case : 7)} data-expression={face} />
      </> : <div className={styles.image} style={style(image.planche, image.case)} data-expression={face} />}
    </div>
  </div>;
}
