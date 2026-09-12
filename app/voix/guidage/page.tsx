"use client";

import { useState } from "react";
import { GUIDAGE, GROUPES_GUIDAGE, A_REGARDER_DABORD } from "@/lib/guidage-textes";
import { REPERTOIRE } from "@/lib/repertoire-textes";
import { NOMBRES } from "@/lib/nombres-textes";
import { NOUVELLES } from "@/lib/base-textes";
import { DOLLAR_PAR_SIGNE, useEcoute, texteDesCorrections } from "../ecoute";

/* ── ÉCOUTER AVANT D'ENREGISTRER — LE GUIDAGE ───────────────────────────────

   Lamine, le 11 septembre 2026 : « BIA doit pouvoir guider une personne pour
   qu'elle se retrouve, comme Google Maps… elle se retire pour laisser la
   carte, mais on peut continuer à parler avec elle. »

   CES PHRASES-LÀ SE JUGENT AUTREMENT QUE LES AUTRES. Une salutation qui sonne
   un peu livresque fait sourire. « Tourné ci ndeyjoor » mal dit fait manquer
   un carrefour à 50 km/h. C'est pour ça qu'elles ont leur page, et que le
   verrou reste fermé jusqu'à ce qu'il les ait toutes entendues.

   CELLES QUI SONT SIGNALÉES sont celles dont mon wolof me paraît le plus
   fragile — le verbe des virages surtout. Ce n'est pas pour qu'il relise
   moins, c'est pour qu'il commence par là s'il n'a que dix minutes.

   PROVISOIRE, comme ses voisines. Le mode d'emploi du retrait est en tête de
   app/voix/page.tsx : effacer le dossier app/voix/ suffit pour les quatre. */

const CLE_CORRECTIONS = "bia-corrections-guidage";

export default function PageGuidage() {
  const [copie, setCopie] = useState("");
  const [dabord, setDabord] = useState(false);
  const { code, setCode, corrections, setCorrections, joue, etat, signes, ecouter, taire } =
    useEcoute(CLE_CORRECTIONS);

  const texteDe = (cle: string, defaut: string) =>
    corrections[cle] !== undefined ? corrections[cle] : defaut;

  const changees = GUIDAGE.filter((p) => texteDe(p.cle, p.wolof).trim() !== p.wolof.trim()).length;
  const signesEnTout = GUIDAGE.reduce((n, p) => n + p.wolof.length + p.francais.length, 0);
  const prixUneFois = (signesEnTout * DOLLAR_PAR_SIGNE).toFixed(2);

  async function copierLesCorrections() {
    const lignes = GUIDAGE
      .filter((p) => texteDe(p.cle, p.wolof).trim() !== p.wolof.trim())
      .map((p) => ({ cle: p.cle, avant: p.wolof, apres: texteDe(p.cle, p.wolof).trim() }));
    if (!lignes.length) { setCopie("Rien n'a été changé pour l'instant."); return; }
    try {
      await navigator.clipboard.writeText(texteDesCorrections("CORRECTIONS DE LAMINE — LE GUIDAGE", lignes));
      setCopie(`${lignes.length} correction(s) copiée(s). Colle-les-moi dans la discussion.`);
    } catch {
      setCopie("La copie a échoué. Sélectionne le texte à la main.");
    }
    setTimeout(() => setCopie(""), 6000);
  }

  const dollars = (signes * DOLLAR_PAR_SIGNE).toFixed(3);
  const montrees = dabord ? GUIDAGE.filter((p) => p.douteux) : GUIDAGE;

  return (
    <main className="voix">
      <p className="voix-provisoire">
        Page provisoire — le temps d&apos;écouter et de corriger le guidage.
        On la retire une fois l&apos;enregistrement fait.
      </p>
      <h1>Les {GUIDAGE.length} phrases du guidage</h1>
      <p className="voix-intro">
        Ce sont les phrases qu&apos;elle dira en te guidant. Elles doivent être
        enregistrées d&apos;avance : fabriquer « tourné ci ndeyjoor » prend près
        de trois secondes, et à 50 km/h trois secondes font quarante mètres — le
        carrefour est déjà passé. <strong>Une instruction arrive maintenant, ou
        elle ne sert à rien.</strong>
      </p>
      <p className="voix-intro">
        Les quarante-cinq ensemble coûtent <strong>{prixUneFois} $ une seule
        fois</strong>, en wolof et en français. Après ça, elle guide sans
        réseau de voix, sans attente et sans clé.
      </p>

      <p className="voix-ailleurs">
        <a href="/voix" className="voix-pale">Les {REPERTOIRE.length} phrases</a>
        {" · "}
        <a href="/voix/nombres" className="voix-pale">Les {NOMBRES.length} nombres</a>
        {" · "}
        <a href="/voix/base" className="voix-pale">Les {NOUVELLES.length} nouvelles</a>
      </p>

      <label className="voix-code">
        Ton code
        <input value={code} onChange={(e) => setCode(e.target.value.toUpperCase())}
          placeholder="KOD" autoCapitalize="characters" autoComplete="off" />
      </label>

      {etat ? <p className="voix-etat">{etat}</p> : null}

      <p className="voix-compte">
        Essais de cette page : <b>{signes}</b> signes, soit <b>{dollars} $</b>.
        {" "}Une phrase de guidage est courte — moins d&apos;un centime l&apos;écoute.
        {changees > 0 ? <> <b>{changees} déjà corrigée(s).</b></> : null}
        {joue ? <> <button type="button" className="voix-pale" onClick={taire}>Arrêter</button></> : null}
      </p>

      {/* ── SI TU N'AS QUE DIX MINUTES ─────────────────────────────────────
          Mon wolof est le plus fragile sur le verbe des virages. Ce bouton
          ne montre que celles-là. */}
      <p className="voix-compte">
        <button type="button" className="voix-pale" onClick={() => setDabord((v) => !v)}>
          {dabord
            ? `← Revenir aux ${GUIDAGE.length} phrases`
            : `Me montrer d'abord les ${A_REGARDER_DABORD.length} dont je doute →`}
        </button>
        {dabord ? <> Celles-là d&apos;abord : c&apos;est là que mon wolof risque le plus d&apos;être faux.</> : null}
      </p>

      {GROUPES_GUIDAGE.map((g) => {
        const dedans = montrees.filter((p) => p.groupe === g.cle);
        if (!dedans.length) return null;
        return (
          <section className="voix-liste" key={g.cle}>
            <h2>{g.titre}</h2>
            {g.note ? <p className="voix-intro">{g.note}</p> : null}
            {dedans.map((p) => {
              const valeur = texteDe(p.cle, p.wolof);
              const change = valeur.trim() !== p.wolof.trim();
              return (
                <article key={p.cle} className={change ? "voix-item change" : "voix-item"}>
                  <p className="voix-quand">
                    {p.douteux ? <b>⚠ </b> : null}
                    <b>{p.francais}</b>
                    {p.quand ? <> — {p.quand}</> : null}
                  </p>
                  <textarea value={valeur} rows={2}
                    aria-label={`En wolof — ${p.francais}`}
                    onChange={(ev) => setCorrections((c) => ({ ...c, [p.cle]: ev.target.value }))} />
                  <div className="voix-rangee">
                    <button type="button" className="voix-ecouter"
                      onClick={() => void ecouter(valeur, p.cle)}>
                      {joue === p.cle ? "▌▌" : "▶"} Écouter
                    </button>
                    {change ? (
                      <button type="button" className="voix-pale"
                        onClick={() => setCorrections((c) => { const n = { ...c }; delete n[p.cle]; return n; })}>
                        Remettre la mienne
                      </button>
                    ) : null}
                  </div>
                </article>
              );
            })}
          </section>
        );
      })}

      <div className="voix-fin">
        <button type="button" className="voix-ecouter" onClick={() => void copierLesCorrections()}>
          Copier mes corrections ({changees})
        </button>
        {copie ? <p className="voix-etat">{copie}</p> : null}
        <p className="voix-intro">
          Envoie-les-moi dans la discussion : je les pose dans BIA, je lève le
          verrou, et c&apos;est seulement après qu&apos;on enregistre — une fois,
          pour toujours.
        </p>
        <p className="voix-ailleurs">
          <a href="/voix" className="voix-pale">← Revenir aux {REPERTOIRE.length} phrases</a>
        </p>
      </div>
    </main>
  );
}
