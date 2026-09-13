"use client";

import { useState } from "react";
import {
  SERVICES, GROUPES_SERVICES, DOLLARS_SERVICES, RELU_SERVICES, familleDe,
} from "@/lib/services-textes";
import { GUIDAGE } from "@/lib/guidage-textes";
import { REPERTOIRE } from "@/lib/repertoire-textes";
import { NOMBRES } from "@/lib/nombres-textes";
import { NOUVELLES } from "@/lib/base-textes";
import { DOLLAR_PAR_SIGNE, useEcoute, texteDesCorrections } from "../ecoute";

/* ── ÉCOUTER AVANT D'ENREGISTRER — LES SERVICES ET LES PANNES ───────────────

   Lamine, le 11 septembre 2026 : « présente-le en page de correction, comme
   tu as fait avec les quarante réponses — c'est plus simple pour nous. »

   C'est la quatrième page de ce genre, et elle sert deux familles très
   différentes.

   LES SERVICES sont des accusés de réception : « d'accord, je t'emmène ».
   Elles se jugent COURTES. Une phrase de deux secondes ici arrive après que
   la carte s'est ouverte — elle ne sert plus à rien, elle encombre.

   LES PANNES se jugent autrement, et plus sévèrement. Ce sont les phrases
   qu'on entend le jour où tout va mal : un code expiré, une oreille cassée,
   un moteur muet. Elles doivent dire QUOI FAIRE, pas seulement que ça ne
   marche pas. Et elles ne doivent pas accuser la personne : « ce n'est pas
   toi » est dans le texte pour cette raison exacte.

   Aujourd'hui, ces phrases-là sont dites par la voix de robot du navigateur —
   ou ne sont pas dites du tout. Les quatre messages de code ne peuvent PAS
   être prononcés aujourd'hui : fabriquer une voix demande un code valide, et
   c'est le code qui manque. Enregistrées, elles se lisent depuis le seau
   public, sans clé.

   PROVISOIRE, comme ses trois voisines. Le mode d'emploi du retrait est en
   tête de app/voix/page.tsx : effacer le dossier app/voix/ suffit. */

const CLE_CORRECTIONS = "bia-corrections-services";

export default function PageServices() {
  const [copie, setCopie] = useState("");
  const [aCopier, setACopier] = useState("");
  const { code, setCode, corrections, setCorrections, joue, etat, signes, ecouter, taire } =
    useEcoute(CLE_CORRECTIONS);

  const texteDe = (cle: string, defaut: string) =>
    corrections[cle] !== undefined ? corrections[cle] : defaut;

  const changees = SERVICES.filter((s) => texteDe(s.cle, s.wolof).trim() !== s.wolof.trim()).length;

  async function copierLesCorrections() {
    const lignes = SERVICES
      .filter((s) => texteDe(s.cle, s.wolof).trim() !== s.wolof.trim())
      .map((s) => ({ cle: s.cle, avant: s.wolof, apres: texteDe(s.cle, s.wolof).trim() }));
    if (!lignes.length) { setACopier(""); setCopie("Rien n'a été changé pour l'instant."); return; }
    const texte = texteDesCorrections("CORRECTIONS DE LAMINE — LES SERVICES ET LES PANNES", lignes);
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
        Page provisoire — le temps d&apos;écouter et de corriger. On la retire
        une fois l&apos;enregistrement fait.
      </p>
      <h1>Les {SERVICES.length} phrases de ses services</h1>

      {RELU_SERVICES ? (
        <p className="voix-etat">
          Tu les as relues — le verrou est levé, elles peuvent être enregistrées.
        </p>
      ) : (
        <p className="voix-etat">
          Le verrou est <b>fermé</b> : rien n&apos;est compté, rien n&apos;est
          fabriqué, rien n&apos;est payé tant que tu ne me renvoies pas tes
          corrections.
        </p>
      )}

      <p className="voix-intro">
        Ce sont les phrases qu&apos;elle dit <strong>en exécutant</strong> —
        « d&apos;accord, je t&apos;emmène » — et celles qu&apos;elle dit
        <strong> quand ça casse</strong>. Elles doivent arriver tout de suite :
        fabriquer « Waaw, maa ngi la yóbbu » prend deux secondes fixes plus 36
        millisecondes par signe, et pendant ce temps-là la carte est déjà
        ouverte. <strong>Une phrase qui arrive après l&apos;action ne sert plus
        à rien.</strong>
      </p>
      <p className="voix-intro">
        Les {SERVICES.length} ensemble coûtent <strong>{DOLLARS_SERVICES.toFixed(2)} $
        une seule fois</strong>, en wolof et en français. Après ça, elle
        accuse réception sans attente, sans réseau de voix et sans clé.
      </p>

      <p className="voix-ailleurs">
        <a href="/voix" className="voix-pale">Les {REPERTOIRE.length} phrases</a>
        {" · "}
        <a href="/voix/base" className="voix-pale">Les {NOUVELLES.length} nouvelles</a>
        {" · "}
        <a href="/voix/guidage" className="voix-pale">Les {GUIDAGE.length} du guidage</a>
        {" · "}
        <a href="/voix/nombres" className="voix-pale">Les {NOMBRES.length} nombres</a>
      </p>

      <label className="voix-code">
        Ton code
        <input value={code} onChange={(e) => setCode(e.target.value.toUpperCase())}
          placeholder="KOD" autoCapitalize="characters" autoComplete="off" />
      </label>

      {etat ? <p className="voix-etat">{etat}</p> : null}

      <p className="voix-compte">
        Essais de cette page : <b>{signes}</b> signes, soit <b>{dollars} $</b>.
        {changees > 0 ? <> <b>{changees} déjà corrigée(s).</b></> : null}
        {joue ? <> <button type="button" className="voix-pale" onClick={taire}>Arrêter</button></> : null}
      </p>

      {GROUPES_SERVICES.map((g) => {
        const dedans = SERVICES.filter((s) => s.groupe === g.cle);
        if (!dedans.length) return null;
        return (
          <section className="voix-liste" key={g.cle}>
            <h2>{g.titre}</h2>
            <p className="voix-intro">{g.note}</p>
            {dedans.map((s, i) => {
              const valeur = texteDe(s.cle, s.wolof);
              const change = valeur.trim() !== s.wolof.trim();
              /* Un filet entre deux services : sans lui, vingt-et-une lignes
                 se lisent comme une seule liste et on ne voit plus qu'il y a
                 trois formulations par service. */
              const nouveauService = g.cle === "services" && i > 0
                && familleDe(s.cle) !== familleDe(dedans[i - 1].cle);
              return (
                <article key={s.cle}
                  className={`voix-item${change ? " change" : ""}${nouveauService ? " voix-neuf" : ""}`}>
                  <p className="voix-quand">
                    <b>{s.francais}</b> — {s.quand}
                  </p>
                  <textarea value={valeur} rows={2}
                    aria-label={`En wolof — ${s.francais}`}
                    onChange={(ev) => setCorrections((c) => ({ ...c, [s.cle]: ev.target.value }))} />
                  <div className="voix-rangee">
                    <button type="button" className="voix-ecouter"
                      onClick={() => void ecouter(valeur, s.cle)}>
                      {joue === s.cle ? "▌▌" : "▶"} Écouter
                    </button>
                    {change ? (
                      <button type="button" className="voix-pale"
                        onClick={() => setCorrections((c) => { const n = { ...c }; delete n[s.cle]; return n; })}>
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
          Envoie-les-moi dans la discussion : je les pose dans BIA, je lève le
          verrou, et c&apos;est seulement après qu&apos;on enregistre — une
          fois, pour toujours.
        </p>
        <p className="voix-ailleurs">
          <a href="/voix" className="voix-pale">← Revenir aux {REPERTOIRE.length} phrases</a>
        </p>
      </div>
      <p className="voix-retour voix-retour-bas"><a href="/">← Revenir à BIA</a></p>
    </main>
  );
}
