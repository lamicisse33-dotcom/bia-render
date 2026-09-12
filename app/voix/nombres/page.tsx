"use client";

import { useState } from "react";
import { NOMBRES, GROUPES } from "@/lib/nombres-textes";
import { REPERTOIRE } from "@/lib/repertoire-textes";
import { NOUVELLES } from "@/lib/base-textes";
import { DOLLAR_PAR_SIGNE, useEcoute, texteDesCorrections } from "../ecoute";

/* ── ÉCOUTER AVANT D'ENREGISTRER — LES NOMBRES ──────────────────────────────

   Lamine, le 11 septembre 2026 : « sors-moi la liste que je t'ai remise hier,
   les chiffres, la liste de calcul. Je veux la corriger. » Puis, quand la
   liste était arrivée au bas de la page des phrases : « présente-le en page de
   correction, comme tu as fait avec les quarante réponses. C'est plus simple
   pour nous. Une page provisoire. »

   Il a raison, et ça se mesure : les deux listes ensemble faisaient cent dix
   cases. On corrige des phrases, ou on corrige des nombres — jamais les deux
   dans le même geste.

   CES TEXTES NE SONT PAS LES MIENS. Ils sortent de SON module de nombres
   wolof, celui qu'il m'a remis le 10 septembre. Deux fois de suite mon wolof
   des nombres avait été faux : les milliers composés, puis l'argent en dërëm.
   On ne recommence pas.

   LES CORRECTIONS SONT GARDÉES À PART de celles des phrases, sous leur propre
   clé — sinon vider l'une effacerait l'autre.

   PROVISOIRE, comme sa voisine. Le mode d'emploi du retrait est en tête de
   app/voix/page.tsx : effacer le dossier app/voix/ suffit pour les deux. */

const CLE_CORRECTIONS = "bia-corrections-nombres";

export default function PageNombres() {
  const [copie, setCopie] = useState("");
  const { code, setCode, corrections, setCorrections, joue, etat, signes, ecouter, taire } =
    useEcoute(CLE_CORRECTIONS);

  const texteDe = (cle: string, defaut: string) =>
    corrections[cle] !== undefined ? corrections[cle] : defaut;

  const changes = NOMBRES.filter((e) => texteDe(e.cle, e.wolof).trim() !== e.wolof.trim()).length;

  async function copierLesCorrections() {
    const lignes = NOMBRES
      .filter((e) => texteDe(e.cle, e.wolof).trim() !== e.wolof.trim())
      .map((e) => ({ cle: e.cle, avant: e.wolof, apres: texteDe(e.cle, e.wolof).trim() }));
    if (!lignes.length) { setCopie("Rien n'a été changé pour l'instant."); return; }
    try {
      await navigator.clipboard.writeText(texteDesCorrections("CORRECTIONS DE LAMINE — LES NOMBRES", lignes));
      setCopie(`${lignes.length} correction(s) copiée(s). Colle-les-moi dans la discussion.`);
    } catch {
      setCopie("La copie a échoué. Sélectionne le texte à la main.");
    }
    setTimeout(() => setCopie(""), 6000);
  }

  const dollars = (signes * DOLLAR_PAR_SIGNE).toFixed(3);

  return (
    <main className="voix">
      <p className="voix-provisoire">
        Page provisoire — le temps d&apos;écouter et de corriger les nombres.
        On la retire une fois l&apos;enregistrement fait.
      </p>
      <h1>Les {NOMBRES.length} nombres</h1>
      <p className="voix-intro">
        Ce ne sont pas mes mots : ils sortent de <strong>ta</strong> règle,
        celle que tu m&apos;as remise. Écoute, et corrige ce qui ne se dit pas
        comme ça à Dakar. <strong>Rien n&apos;est enregistré ici.</strong>
      </p>

      <p className="voix-ailleurs">
        <a href="/voix" className="voix-pale">Les {REPERTOIRE.length} phrases</a>
        {" · "}
        <a href="/voix/base" className="voix-pale">Les {NOUVELLES.length} nouvelles</a>
        {" · "}
        <a href="/voix/services" className="voix-pale">Les services</a>
      </p>

      <label className="voix-code">
        Ton code
        <input value={code} onChange={(e) => setCode(e.target.value.toUpperCase())}
          placeholder="KOD" autoCapitalize="characters" autoComplete="off" />
      </label>

      {etat ? <p className="voix-etat">{etat}</p> : null}

      <p className="voix-compte">
        Essais de cette page : <b>{signes}</b> signes, soit <b>{dollars} $</b>.
        {" "}Chaque écoute se paie — un nombre court coûte moins d&apos;un centime.
        {changes > 0 ? <> <b>{changes} déjà corrigé(s).</b></> : null}
        {joue ? <> <button type="button" className="voix-pale" onClick={taire}>Arrêter</button></> : null}
      </p>

      {GROUPES.map((g) => {
        const dedans = NOMBRES.filter((e) => e.groupe === g.cle);
        if (!dedans.length) return null;
        return (
          <section className="voix-liste" key={g.cle}>
            <h2>{g.titre}</h2>
            {g.note ? <p className="voix-intro">{g.note}</p> : null}
            {dedans.map((e) => {
              const valeur = texteDe(e.cle, e.wolof);
              const change = valeur.trim() !== e.wolof.trim();
              return (
                <article key={e.cle} className={change ? "voix-item change" : "voix-item"}>
                  <p className="voix-quand"><b>{e.etiquette}</b> se dit&nbsp;:</p>
                  <textarea value={valeur} rows={2}
                    aria-label={`En wolof — ${e.etiquette}`}
                    onChange={(ev) => setCorrections((c) => ({ ...c, [e.cle]: ev.target.value }))} />
                  <div className="voix-rangee">
                    <button type="button" className="voix-ecouter"
                      onClick={() => void ecouter(valeur, e.cle)}>
                      {joue === e.cle ? "▌▌" : "▶"} Écouter
                    </button>
                    {change ? (
                      <button type="button" className="voix-pale"
                        onClick={() => setCorrections((c) => { const n = { ...c }; delete n[e.cle]; return n; })}>
                        Remettre la tienne
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
          Copier mes corrections ({changes})
        </button>
        {copie ? <p className="voix-etat">{copie}</p> : null}
        <p className="voix-intro">
          Envoie-les-moi dans la discussion : je les pose dans BIA, et c&apos;est
          seulement après qu&apos;on enregistre — une fois, pour toujours.
        </p>
        <p className="voix-ailleurs">
          <a href="/voix" className="voix-pale">← Revenir aux {REPERTOIRE.length} phrases</a>
        </p>
      </div>
    </main>
  );
}
