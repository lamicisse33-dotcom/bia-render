"use client";

import { useState } from "react";
import { NOUVELLES, GROUPES_BASE } from "@/lib/base-textes";
import { REPERTOIRE } from "@/lib/repertoire-textes";
import { NOMBRES } from "@/lib/nombres-textes";
import { DOLLAR_PAR_SIGNE, useEcoute, texteDesCorrections } from "../ecoute";

/* ── ÉCOUTER AVANT D'ENREGISTRER — LES 69 NOUVELLES ─────────────────────────

   Lamine, le 11 septembre 2026, après avoir validé le document de travail :
   « mets-le dans la page web que tu avais faite pour les corrections, c'est
   beaucoup plus simple pour moi, pour que je puisse bien corriger le wolof
   avant l'enregistrement. »

   Il a raison, et c'est la leçon des 42 premières : une faute de wolof ne se
   voit pas, elle s'entend. On a écrit cinq versions de ce document à l'écrit,
   et il y a corrigé cinquante-quatre fautes que personne n'aurait vues en
   lisant vite. Ce qui reste ne se trouvera qu'à l'oreille.

   CE QU'ON ÉCOUTE ICI : seulement le champ « ELLE RÉPOND ». Les six
   formulations servent à reconnaître la question, elles ne deviennent jamais
   du son — elles sont montrées en petit, pour vérifier qu'elles vont bien avec
   la réponse, pas pour être écoutées.

   LE FRANÇAIS AUSSI. Chaque réponse a deux enregistrements, comme les 42 : on
   a mesuré ce matin que la moitié des questions françaises tombait sur la voix
   wolof. Les deux boutons sont donc là.

   PROVISOIRE, comme ses deux voisines. Le mode d'emploi du retrait est en tête
   de app/voix/page.tsx : effacer le dossier app/voix/ suffit pour les trois. */

const CLE_CORRECTIONS = "bia-corrections-base";

export default function PageBase() {
  const [copie, setCopie] = useState("");
  const [aCopier, setACopier] = useState("");
  const { code, setCode, corrections, setCorrections, joue, etat, signes, ecouter, taire } =
    useEcoute(CLE_CORRECTIONS);

  const texteDe = (cle: string, defaut: string) =>
    corrections[cle] !== undefined ? corrections[cle] : defaut;

  const changes = NOUVELLES.filter((e) =>
    texteDe(`${e.numero}-wo`, e.wolof).trim() !== e.wolof.trim()
    || texteDe(`${e.numero}-fr`, e.francais).trim() !== e.francais.trim()).length;

  async function copierLesCorrections() {
    const lignes: Array<{ cle: string; avant: string; apres: string }> = [];
    for (const e of NOUVELLES) {
      const wo = texteDe(`${e.numero}-wo`, e.wolof).trim();
      if (wo !== e.wolof.trim()) lignes.push({ cle: `${e.numero}. ${e.cle} — wolof`, avant: e.wolof, apres: wo });
      const fr = texteDe(`${e.numero}-fr`, e.francais).trim();
      if (fr !== e.francais.trim()) lignes.push({ cle: `${e.numero}. ${e.cle} — français`, avant: e.francais, apres: fr });
    }
    if (!lignes.length) { setACopier(""); setCopie("Rien n'a été changé pour l'instant."); return; }
    const texte = texteDesCorrections("CORRECTIONS DE LAMINE — LES 69 NOUVELLES", lignes);
    /* Le cadre d'abord : il doit exister même si la copie échoue. */
    setACopier(texte);
    try {
      await navigator.clipboard.writeText(texte);
      setCopie(`${lignes.length} correction(s) copiée(s). Colle-les-moi dans la discussion.`);
    } catch {
      setCopie("Le téléphone a refusé la copie. Le texte est juste en dessous : appuie dessus, « Tout sélectionner », puis « Copier ».");
    }
    setTimeout(() => setCopie(""), 6000);
  }

  const dollars = (signes * DOLLAR_PAR_SIGNE).toFixed(3);

  return (
    <main className="voix">
      {/* ── LE BOUTON RETOUR ──────────────────────────────────────────────

          Lamine, le 12 septembre 2026 : « il faut mettre un bouton retour
          ici. »

          Ces six pages s'ouvrent depuis l'application, mais elles ne savent
          pas y ramener : ce sont de vraies pages web, alors on en sort par la
          flèche du navigateur — qui, dans une application installée sur
          l'écran d'accueil, N'EXISTE PAS. On était donc enfermé dedans, comme
          on l'était dans la fenêtre de discussion avant le bouton « Fermer »
          d'en bas.

          C'est le même défaut que la porte qui manquait pour ENTRER, pris par
          l'autre bout : une page où l'on entre et dont on ne sort pas n'est
          pas finie. */}
      <p className="voix-retour"><a href="/">← Revenir à BIA</a></p>

      <p className="voix-provisoire">
        Page provisoire — le temps d&apos;écouter et de corriger les 69
        nouvelles. On la retire une fois l&apos;enregistrement fait.
      </p>
      <h1>Les {NOUVELLES.length} nouvelles réponses</h1>
      <p className="voix-intro">
        Les textes viennent du document que tu as validé, entrées 43 à 111.
        <strong> Rien n&apos;est enregistré ici</strong> — on enregistre une
        seule fois, quand tout sonne juste. Écoute le wolof d&apos;abord :
        c&apos;est lui qu&apos;on entendra le plus.
      </p>

      <p className="voix-ailleurs">
        <a href="/voix" className="voix-pale">Les {REPERTOIRE.length} phrases</a>
        {" · "}
        <a href="/voix/nombres" className="voix-pale">Les {NOMBRES.length} nombres</a>
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
        {changes > 0 ? <> <b>{changes} réponse(s) déjà corrigée(s).</b></> : null}
        {joue ? <> <button type="button" className="voix-pale" onClick={taire}>Arrêter</button></> : null}
      </p>

      {GROUPES_BASE.map((g) => {
        const dedans = NOUVELLES.filter((e) => e.groupe === g);
        if (!dedans.length) return null;
        return (
          <section className="voix-liste" key={g}>
            <h2>{g}</h2>
            {dedans.map((e) => {
              const wo = texteDe(`${e.numero}-wo`, e.wolof);
              const fr = texteDe(`${e.numero}-fr`, e.francais);
              const change = wo.trim() !== e.wolof.trim() || fr.trim() !== e.francais.trim();
              return (
                <article key={e.numero} className={change ? "voix-item change" : "voix-item"}>
                  <p className="voix-quand">
                    <span>{e.numero}</span> {e.cle} · <i>{e.type}</i>
                  </p>

                  <textarea value={wo} rows={2}
                    aria-label={`En wolof — ${e.cle}`}
                    onChange={(ev) => setCorrections((c) => ({ ...c, [`${e.numero}-wo`]: ev.target.value }))} />
                  <div className="voix-rangee">
                    <button type="button" className="voix-ecouter"
                      onClick={() => void ecouter(wo, `${e.numero}-wo`)}>
                      {joue === `${e.numero}-wo` ? "▌▌" : "▶"} Écouter en wolof
                    </button>
                  </div>

                  <textarea value={fr} rows={2}
                    aria-label={`En français — ${e.cle}`}
                    onChange={(ev) => setCorrections((c) => ({ ...c, [`${e.numero}-fr`]: ev.target.value }))} />
                  <div className="voix-rangee">
                    <button type="button" className="voix-ecouter"
                      onClick={() => void ecouter(fr, `${e.numero}-fr`)}>
                      {joue === `${e.numero}-fr` ? "▌▌" : "▶"} Écouter en français
                    </button>
                    {change ? (
                      <button type="button" className="voix-pale"
                        onClick={() => setCorrections((c) => {
                          const n = { ...c };
                          delete n[`${e.numero}-wo`]; delete n[`${e.numero}-fr`];
                          return n;
                        })}>
                        Remettre les tiennes
                      </button>
                    ) : null}
                  </div>

                  {/* Les formulations ne s'enregistrent pas : elles sont là pour
                      qu'il vérifie qu'elles vont bien avec la réponse. */}
                  <p className="voix-francais">
                    on lui dit&nbsp;: {e.formes.length
                      ? e.formes.map((f) => `« ${f} »`).join(", ")
                      : "rien — c'est le système qui la déclenche"}
                  </p>
                  {e.suite ? <p className="voix-francais"><b>ensuite&nbsp;:</b> {e.suite}</p> : null}
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
        {/* ── QUAND LE TÉLÉPHONE REFUSE LA COPIE ──────────────────────────

            Lamine, le 13 septembre 2026 : « j'ai essayé de copier, mais ça ne
            marche pas, ça n'accepte pas. » Le message de secours lui disait
            « sélectionne le texte à la main » — un texte qui n'était affiché
            NULLE PART. Un secours qui renvoie vers le vide n'est pas un
            secours : ses corrections étaient prisonnières de la page.

            Le texte paraît maintenant ici, que la copie ait réussi ou non, et
            il se sélectionne d'une touche. Safari sur iPhone refuse souvent
            l'accès au presse-papiers ; ce cadre, lui, ne dépend de rien. */}
        {aCopier ? (
          <textarea readOnly rows={8} value={aCopier}
            aria-label="Tes corrections, à copier"
            style={{ width: "100%", marginTop: 10 }}
            onFocus={(ev) => ev.currentTarget.select()}
            onClick={(ev) => ev.currentTarget.select()} />
        ) : null}
        <p className="voix-intro">
          Envoie-les-moi dans la discussion : je les pose, et c&apos;est
          seulement après qu&apos;on enregistre — une fois, pour toujours.
        </p>
      </div>
      <p className="voix-retour voix-retour-bas"><a href="/">← Revenir à BIA</a></p>
    </main>
  );
}
