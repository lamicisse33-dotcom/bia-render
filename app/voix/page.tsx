"use client";

import { useState } from "react";
import { REPERTOIRE } from "@/lib/repertoire-textes";
import { NOMBRES } from "@/lib/nombres-textes";
import { NOUVELLES } from "@/lib/base-textes";
import { DOLLAR_PAR_SIGNE, useEcoute, texteDesCorrections } from "./ecoute";

/* ── ÉCOUTER AVANT D'ENREGISTRER — LES 42 PHRASES ───────────────────────────

   Lamine, le 11 septembre 2026 : « il faut me créer une fenêtre de discussion
   pour que je puisse tester les voix avant qu'on enregistre quoi que ce soit,
   pour voir si ça sonne correctement en wolof — une page où je peux coller mes
   corrections pour les écouter. »

   C'est la pièce qui manquait, et il a eu raison de la demander AVANT. On
   s'apprêtait à enregistrer quarante-deux phrases d'un coup sans que personne
   ne les ait jamais entendues. Une faute d'orthographe en wolof ne se voit pas
   — elle s'entend. « Dëgg » et « dégg » se lisent presque pareil et ne se
   disent pas du tout pareil.

   ── UNE PAGE PAR LISTE ────────────────────────────────────────────────────

   Lamine, le même jour, après que les nombres eurent été ajoutés au bas de
   celle-ci : « présente-le en page de correction, comme tu as fait avec les
   quarante réponses. C'est plus simple pour nous. »

   Il a raison, et la raison se mesure : les deux listes ensemble faisaient
   cent dix cases et vingt mille pixels de haut. On corrige des phrases, ou on
   corrige des nombres — jamais les deux dans le même geste. Les nombres ont
   donc leur page, /voix/nombres, et la mécanique commune vit dans ecoute.ts
   pour ne pas être écrite deux fois.

   CHAQUE ÉCOUTE SE PAIE, et c'est écrit en gros. Environ deux centimes par
   phrase. Ce n'est pas cher, mais quelqu'un qui essaie cent fois sans le
   savoir trouve sa facture en fin de mois — alors on compte à voix haute.

   ── CETTE PAGE EST PROVISOIRE ─────────────────────────────────────────────

   Lamine : « elle sera provisoire, le temps que je puisse tester la liste que
   tu m'as donnée. Après, on le supprime. »

   POUR RETIRER LES DEUX PAGES, ET RIEN D'AUTRE N'EN DÉPEND :
     1. effacer le dossier app/voix/ en entier — les deux pages et ecoute.ts ;
     2. effacer les blocs « LA PAGE POUR ÉCOUTER » dans app/globals.css ;
     3. effacer le bloc « LA PAGE D'ÉCOUTE » dans app/page.tsx (les liens dans
        « Moi »), avec l'état estMaitre et son useEffect ;
     4. c'est tout. lib/repertoire-textes.ts et lib/nombres-textes.ts RESTENT :
        ce sont les listes elles-mêmes qui s'en servent, pas ces pages. */

const CLE_CORRECTIONS = "bia-corrections-voix";

export default function PageVoix() {
  const [libre, setLibre] = useState("");
  const [copie, setCopie] = useState("");
  const { code, setCode, corrections, setCorrections, joue, etat, signes, ecouter, taire } =
    useEcoute(CLE_CORRECTIONS);

  const texteDe = (cle: string, defaut: string) =>
    corrections[cle] !== undefined ? corrections[cle] : defaut;

  const changees = REPERTOIRE.filter((e) => texteDe(e.cle, e.wolof).trim() !== e.wolof.trim()).length;

  async function copierLesCorrections() {
    const lignes = REPERTOIRE
      .filter((e) => texteDe(e.cle, e.wolof).trim() !== e.wolof.trim())
      .map((e) => ({ cle: e.cle, avant: e.wolof, apres: texteDe(e.cle, e.wolof).trim() }));
    if (!lignes.length) { setCopie("Rien n'a été changé pour l'instant."); return; }
    try {
      await navigator.clipboard.writeText(texteDesCorrections("CORRECTIONS DE LAMINE — LES PHRASES", lignes));
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
        Page provisoire — le temps d&apos;écouter et de corriger les phrases.
        On la retire une fois l&apos;enregistrement fait.
      </p>
      <h1>Les {REPERTOIRE.length} phrases</h1>
      <p className="voix-intro">
        Colle une phrase, écoute-la, corrige-la. <strong>Rien n&apos;est enregistré
        ici</strong> — on enregistre une seule fois, quand tout sonne juste.
      </p>

      {/* Les deux listes sont deux pages : on passe de l'une à l'autre d'un
          geste, sans repasser par les réglages. */}
      <p className="voix-ailleurs">
        <a href="/voix/nombres" className="voix-pale">Les {NOMBRES.length} nombres</a>
        {" · "}
        <a href="/voix/base" className="voix-pale">Les {NOUVELLES.length} nouvelles</a>
      </p>

      <label className="voix-code">
        Ton code
        <input value={code} onChange={(e) => setCode(e.target.value.toUpperCase())}
          placeholder="KOD" autoCapitalize="characters" autoComplete="off" />
      </label>

      {/* ── LE CHAMP LIBRE, EN HAUT — c'est ce qu'il a demandé ───────────── */}
      <section className="voix-libre">
        <h2>Essayer un texte</h2>
        <textarea value={libre} onChange={(e) => setLibre(e.target.value)} rows={4}
          placeholder="Colle ici ta phrase en wolof, et écoute-la…"
          aria-label="Texte à écouter" />
        <div className="voix-rangee">
          <button type="button" className="voix-ecouter"
            onClick={() => void ecouter(libre, "libre")} disabled={!libre.trim()}>
            {joue === "libre" ? "▌▌ En train de parler" : "▶ Écouter"}
          </button>
          {joue ? <button type="button" className="voix-pale" onClick={taire}>Arrêter</button> : null}
        </div>
      </section>

      {etat ? <p className="voix-etat">{etat}</p> : null}

      <p className="voix-compte">
        Essais de cette page : <b>{signes}</b> signes, soit <b>{dollars} $</b>.
        {" "}Chaque écoute se paie — une phrase courte coûte environ deux centimes.
      </p>

      <section className="voix-liste">
        <h2>Ce qu&apos;elle répond souvent</h2>
        <p className="voix-intro">
          Écoute chacune. Si le wolof ne sonne pas comme à Dakar, réécris-le
          ici — tes corrections restent sur ce téléphone, même si tu fermes la
          page. {changees > 0 ? <b>{changees} déjà corrigée(s).</b> : null}
        </p>

        {REPERTOIRE.map((e, i) => {
          const valeur = texteDe(e.cle, e.wolof);
          const change = valeur.trim() !== e.wolof.trim();
          return (
            <article key={e.cle} className={change ? "voix-item change" : "voix-item"}>
              <p className="voix-quand">
                <span>{i + 1}</span> on lui dit&nbsp;: {e.formes.slice(0, 3).map((f) => `« ${f} »`).join(", ")}
              </p>
              <textarea value={valeur} rows={2}
                aria-label={`Réponse en wolof — ${e.cle}`}
                onChange={(ev) => setCorrections((c) => ({ ...c, [e.cle]: ev.target.value }))} />
              <p className="voix-francais">{e.francais}</p>
              <div className="voix-rangee">
                <button type="button" className="voix-ecouter"
                  onClick={() => void ecouter(valeur, e.cle)}>
                  {joue === e.cle ? "▌▌" : "▶"} Écouter
                </button>
                {change ? (
                  <button type="button" className="voix-pale"
                    onClick={() => setCorrections((c) => { const n = { ...c }; delete n[e.cle]; return n; })}>
                    Remettre la mienne
                  </button>
                ) : null}
              </div>
            </article>
          );
        })}
      </section>

      <div className="voix-fin">
        <button type="button" className="voix-ecouter" onClick={() => void copierLesCorrections()}>
          Copier mes corrections ({changees})
        </button>
        {copie ? <p className="voix-etat">{copie}</p> : null}
        <p className="voix-intro">
          Envoie-les-moi dans la discussion : je les pose dans BIA, et c&apos;est
          seulement après qu&apos;on enregistre — une fois, pour toujours.
        </p>
        <p className="voix-ailleurs">
          <a href="/voix/nombres" className="voix-pale">Passer aux {NOMBRES.length} nombres</a>
          {" · "}
          <a href="/voix/base" className="voix-pale">Passer aux {NOUVELLES.length} nouvelles</a>
        </p>
      </div>
    </main>
  );
}
