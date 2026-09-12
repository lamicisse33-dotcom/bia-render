"use client";

import { useEffect, useState } from "react";
import type { Verdict } from "@/lib/verdicts";
import {
  compterVerdicts, corrigerVerdict, lireVerdicts, oublierVerdict, texteDesVerdicts,
} from "@/lib/verdicts";

/* ── RELIRE CE QU'ON A JUGÉ À L'OREILLE ─────────────────────────────────────

   Lamine, le 12 septembre 2026 au soir : « pour que plus tard je puisse
   corriger tout ce qui est mal dit, pour le réinjecter dans le répertoire.
   Tout ce que le bouton vert a retenu peut être enregistré et stocké dans la
   base. »

   Les deux boutons de l'écran principal ne demandent rien : un appui, c'est
   gardé, on continue de parler. Cette page-ci est le « plus tard ».

   ── DEUX LISTES, DEUX TRAVAUX DIFFÉRENTS ─────────────────────────────────

   Le VERT est déjà fini : la phrase est bonne, il n'y a rien à écrire. Elle
   attend seulement d'être enregistrée une fois avec la voix de Kha — et
   ensuite elle est gratuite et instantanée pour toujours.

   Le ROUGE demande une main : il faut écrire ce qu'il FAUT dire. C'est ça
   qui se réinjecte, et c'est ça qui devient prioritaire — un mot corrigé
   passe devant, dans l'oreille comme dans ses réponses.

   ── ET TOUT RESTE SUR L'APPAREIL ─────────────────────────────────────────

   Rien ne part sur le réseau. Le bouton « Copier » rend le même texte que
   ses autres fiches de correction : il colle, je lis, je pose. C'est la forme
   qui a marché pour les 42 phrases et pour les nombres. */

export default function PageVerdicts() {
  const [liste, setListe] = useState<Verdict[]>([]);
  const [copie, setCopie] = useState("");
  const [prets, setPrets] = useState(false);

  /* On lit APRÈS le montage : le localStorage n'existe pas au rendu serveur,
     et un rendu qui diffère du client fait clignoter la page. */
  useEffect(() => { setListe(lireVerdicts()); setPrets(true); }, []);

  const compte = compterVerdicts(liste);
  const bien = liste.filter((v) => v.avis === "bien").reverse();
  const mal = liste.filter((v) => v.avis === "mal").reverse();

  async function copier() {
    try {
      await navigator.clipboard.writeText(texteDesVerdicts(liste));
      setCopie("Copié — colle-le dans la discussion avec Claude.");
    } catch {
      setCopie("La copie a échoué. Sélectionne le texte à la main.");
    }
    setTimeout(() => setCopie(""), 4000);
  }

  if (!prets) return <main className="voix"><p>Un instant…</p></main>;

  return (
    <main className="voix">
      <p className="voix-provisoire">
        Page provisoire, comme ses voisines. Tout ce qui est ici vit sur CET appareil.
      </p>

      <h1>Ce que tu as jugé</h1>
      <p className="voix-note">
        {compte.bien} bien dit{compte.bien > 1 ? "s" : ""} · {compte.mal} mal dit{compte.mal > 1 ? "s" : ""}
        {compte.mal ? ` dont ${compte.corriges} corrigé${compte.corriges > 1 ? "s" : ""}` : ""}
      </p>

      {liste.length === 0 ? (
        <p className="voix-note">
          Rien encore. Les deux boutons vert et rouge sont sur l&apos;écran principal,
          sous la présence de BIA — ils ne paraissent qu&apos;avec ton code maître, et
          seulement quand elle vient de dire quelque chose.
        </p>
      ) : (
        <p className="voix-note">
          <button type="button" className="voix-copier" onClick={() => void copier()}>
            Copier les {liste.length} verdicts
          </button>
          {copie ? <span className="voix-dit"> {copie}</span> : null}
        </p>
      )}

      {mal.length ? (
        <>
          <h2>Mal dit — écris ce qu&apos;il faut dire</h2>
          <p className="voix-note">
            C&apos;est cette colonne qui se réinjecte. Un mot corrigé ici passe devant
            tout le reste : dans l&apos;oreille, et dans ses réponses.
          </p>
          {mal.map((v) => (
            <div key={v.quand + v.dit} className="voix-item voix-neuf">
              <p className="voix-cle">{new Date(v.quand).toLocaleString("fr-FR")} · {v.langue}</p>
              {v.question ? <p className="voix-note">à la question : {v.question}</p> : null}
              <p><b>Elle a dit :</b> {v.dit}</p>
              <textarea
                rows={2}
                placeholder="Il faut dire…"
                defaultValue={v.corrige || ""}
                onBlur={(e) => setListe(corrigerVerdict(v.dit, e.target.value))}
              />
              <p>
                <button type="button" className="voix-pale"
                  onClick={() => setListe(oublierVerdict(v.dit))}>Retirer</button>
              </p>
            </div>
          ))}
        </>
      ) : null}

      {bien.length ? (
        <>
          <h2>Bien dit — à enregistrer</h2>
          <p className="voix-note">
            Rien à écrire ici : ces phrases sont bonnes. Elles attendent d&apos;être
            enregistrées une fois avec la voix de Kha, et elles deviennent gratuites
            et instantanées pour toujours.
          </p>
          {bien.map((v) => (
            <div key={v.quand + v.dit} className="voix-item">
              <p className="voix-cle">{new Date(v.quand).toLocaleString("fr-FR")} · {v.langue}</p>
              {v.question ? <p className="voix-note">à la question : {v.question}</p> : null}
              <p>{v.dit}</p>
              <p>
                <button type="button" className="voix-pale"
                  onClick={() => setListe(oublierVerdict(v.dit))}>Retirer</button>
              </p>
            </div>
          ))}
        </>
      ) : null}

      <p className="voix-note">
        <a href="/voix" className="voix-pale">Les 42 phrases</a>{" "}
        <a href="/voix/base" className="voix-pale">La base</a>{" "}
        <a href="/voix/nombres" className="voix-pale">Les nombres</a>{" "}
        <a href="/voix/services" className="voix-pale">Les services</a>
      </p>
    </main>
  );
}
