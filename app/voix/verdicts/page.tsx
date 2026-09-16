"use client";

import { useEffect, useState } from "react";
import type { Verdict } from "@/lib/verdicts";
import {
  compterVerdicts, corrigerVerdict, lireVerdicts, oublierVerdict, texteDesVerdicts,
} from "@/lib/verdicts";
import { combienDAffaires, defaireLesValises, faireSesValises } from "@/lib/demenagement";

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
  /* ── LE DÉMÉNAGEMENT ────────────────────────────────────────────────────
     Lamine, le 18 septembre 2026, une heure après avoir installé BIA sur son
     iPhone : « je ne vois plus les questions mal dites et bien dites, ils ont
     tous disparu ». Voir lib/demenagement.ts : trois armoires séparées,
     Safari, le raccourci et l'application, et aucune ne voit les autres. */
  const [valises, setValises] = useState("");
  const [ditDemenagement, setDitDemenagement] = useState("");
  const [affaires, setAffaires] = useState(0);
  const [prets, setPrets] = useState(false);

  /* On lit APRÈS le montage : le localStorage n'existe pas au rendu serveur,
     et un rendu qui diffère du client fait clignoter la page. */
  useEffect(() => {
    setListe(lireVerdicts());
    setAffaires(combienDAffaires());
    setPrets(true);
  }, []);

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

  async function emporter() {
    const texte = faireSesValises();
    try {
      await navigator.clipboard.writeText(texte);
      setDitDemenagement(`Copié — ${affaires} affaire(s). Colle-le dans l'autre BIA.`);
    } catch {
      /* Le presse-papier refuse parfois : on met le texte à l'écran, il le
         sélectionne à la main. Un refus ne doit pas arrêter le déménagement. */
      setValises(texte);
      setDitDemenagement("La copie automatique a échoué — sélectionne le texte ci-dessous.");
    }
  }

  function reprendre(texte: string) {
    const r = defaireLesValises(texte);
    if (r.erreur) { setDitDemenagement(r.erreur); return; }
    setListe(lireVerdicts());
    setAffaires(combienDAffaires());
    setValises("");
    setDitDemenagement(
      r.repris
        ? `${r.repris} affaire(s) reprise(s).${r.laissees.length
          ? ` ${r.laissees.length} laissée(s) : il y avait déjà quelque chose ici, et on n'écrase jamais.`
          : ""}`
        : "Rien à reprendre : tout était déjà là.");
  }

  if (!prets) return <main className="voix"><p>Un instant…</p></main>;

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
        Page provisoire, comme ses voisines. Tout ce qui est ici vit sur CET appareil.
      </p>

      <h1>Ce que tu as jugé</h1>
      <p className="voix-note">
        {compte.bien} bien dit{compte.bien > 1 ? "s" : ""} · {compte.mal} mal dit{compte.mal > 1 ? "s" : ""}
        {compte.mal ? ` dont ${compte.corriges} corrigé${compte.corriges > 1 ? "s" : ""}` : ""}
      </p>

      {/* ── DÉMÉNAGER SON TRAVAIL D'UNE BIA À L'AUTRE ────────────────────

          Lamine, le 18 septembre 2026, une heure après avoir installé BIA sur
          son iPhone : « depuis que je l'ai installé, je ne vois plus les
          questions mal dites et bien dites, ils ont tous disparu ».

          Rien n'était perdu, et personne n'aurait pu le deviner : le rangement
          du téléphone appartient à l'APPLICATION qui affiche la page, pas à
          l'adresse. Safari a le sien, le raccourci de l'écran d'accueil le
          sien, l'application native le sien. Trois armoires, aucune ne voit
          les autres. Son travail est resté dans Safari, à quelques
          centimètres, et rien à l'écran ne le disait.

          Le seul passage possible est celui qu'il fait lui-même. D'où ces
          deux boutons. Voir lib/demenagement.ts. */}
      <details className="voix-item">
        <summary><b>Emporter ce travail vers une autre BIA</b></summary>
        <p className="voix-note">
          Ce que tu vois ici ne vit que dans <b>cette</b> BIA. Safari, le
          raccourci de l&apos;écran d&apos;accueil et l&apos;application installée ont
          chacun leur propre rangement, et aucun ne voit celui des autres —
          c&apos;est une règle du téléphone, pas un défaut. Pour faire passer ton
          travail de l&apos;un à l&apos;autre&nbsp;: <b>Emporter</b> d&apos;un côté,
          <b> Reprendre</b> de l&apos;autre.
        </p>
        <p className="voix-note">
          <button type="button" className="voix-copier" onClick={() => void emporter()}>
            Emporter ({affaires})
          </button>
        </p>
        <textarea
          rows={3}
          placeholder="Colle ici ce que tu as emporté de l'autre BIA…"
          value={valises}
          onChange={(e) => setValises(e.target.value)}
        />
        <p className="voix-note">
          <button type="button" className="voix-copier"
            onClick={() => reprendre(valises)}>
            Reprendre ce que j&apos;ai collé
          </button>
          {ditDemenagement ? <span className="voix-dit"> {ditDemenagement}</span> : null}
        </p>
        <p className="voix-note">
          <b>Ton code maître ne voyage pas</b> dans ce texte, et c&apos;est
          volontaire&nbsp;: un presse-papier se lit par d&apos;autres
          applications. Tu le retapes une fois de l&apos;autre côté.
          Et <b>rien n&apos;est écrasé</b>&nbsp;: les verdicts se mélangent, le
          reste n&apos;est repris que si la place est libre. Fait deux fois, ça
          ne coûte rien.
        </p>
      </details>

      {liste.length === 0 ? (
        <p className="voix-note">
          Rien encore dans CETTE BIA. Les deux boutons vert et rouge sont sur
          l&apos;écran principal, sous la présence de BIA — ils ne paraissent
          qu&apos;avec ton code maître, et seulement quand elle vient de dire
          quelque chose. Si tu jugeais déjà dans Safari, ton travail y est
          toujours&nbsp;: ouvre cette page là-bas et sers-toi d&apos;
          <i>Emporter</i>.
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
      <p className="voix-retour voix-retour-bas"><a href="/">← Revenir à BIA</a></p>
    </main>
  );
}
