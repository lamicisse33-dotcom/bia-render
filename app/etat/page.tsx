"use client";

import { useCallback, useEffect, useState } from "react";

/* ── POURQUOI ELLE DIT QUE SON MOTEUR NE RÉPOND PAS ─────────────────────────

   Lamine, le 12 septembre 2026 : « elle n'arrête pas de me dire que son moteur
   ne répond pas. Il faut vérifier ce qui se passe. »

   LE SERVEUR SAVAIT DÉJÀ, ET PERSONNE NE POUVAIT LE LIRE. Chaque refus du
   modèle est noté avec son numéro et son message — « le modèle a refusé : 401
   invalid x-api-key », « 400 credit balance is too low » — et tout ça vivait
   dans /api/etat, une page de texte brut illisible sur un téléphone.

   C'est le défaut de la soirée, pour la cinquième fois : une chose qu'on ne
   voit pas n'existe pas. La réponse était là depuis le début.

   ── CE QUE CETTE PAGE DIT, ET DANS CET ORDRE ──────────────────────────────

   D'abord SI C'EST CASSÉ MAINTENANT, en un mot. Ensuite POURQUOI, avec le
   numéro — parce qu'un numéro se cherche et se corrige, alors que « ça ne
   marche pas » ne se corrige pas. Ensuite les dernières pannes, parce qu'une
   panne qui revient toutes les dix minutes n'est pas la même chose qu'une
   panne isolée. Et enfin ce qui est branché : une clé absente et un crédit
   épuisé donnaient jusqu'ici le même silence.

   ── ELLE NE DEMANDE AUCUN CODE ────────────────────────────────────────────

   /api/etat est ouvert, et c'est voulu : le jour où plus rien ne marche, il ne
   faut pas qu'il faille un code valide pour savoir POURQUOI plus rien ne
   marche. Une page de diagnostic qui dépend de ce qu'elle diagnostique ne sert
   à rien.                                                                   */

type Panne = { quand: string; statut: number | string; detail: string; ou: string };

type Etat = {
  modele?: string;
  cle_modele?: boolean;
  cle_lieux?: boolean;
  voix?: string;
  ecoute?: string;
  lexique?: string;
  voix_clonee?: boolean;
  derniere_panne?: Panne | null;
  pannes?: { total: number; dernieres: Panne[] };
  depense?: unknown;
  repertoire?: { entrees?: number };
  /* ── CE QU'IL LUI A APPRIS ────────────────────────────────────────────────
     Les trois comptes du 16 septembre. Ils existaient déjà dans /api/etat ;
     ils n'avaient pas de porte. Voir plus bas. */
  lexique_entrees?: number | null;
  lexique_auteurs?: Record<string, number> | null;
  lecons_donnees?: {
    tentatives?: number;
    reconnues?: number;
    ecrites?: number;
    sans_le_code?: number;
    rien_en_main?: number;
    avec_code_maitre?: number;
    sans_code_maitre?: number;
    note?: string;
  } | null;
  souvenirs?: { gardes?: number; refuses?: number; cherches?: number; retrouves?: number } | null;
};

/* ── TRADUIRE LE NUMÉRO EN QUELQUE CHOSE QU'ON PEUT FAIRE ──────────────────

   Un numéro seul ne dit rien à qui ne passe pas ses journées dans les
   serveurs. Chacun a pourtant une cause précise et un geste précis, et c'est
   le geste qui compte. */
function expliquer(p: Panne): { quoi: string; faire: string } {
  const s = String(p.statut);
  const d = (p.detail || "").toLowerCase();

  if (d.includes("credit balance") || d.includes("insufficient")) {
    return {
      quoi: "Le crédit du modèle est épuisé.",
      faire: "Recharge le compte Anthropic. C'est la seule chose à faire — rien n'est cassé dans l'application.",
    };
  }
  if (s === "401" || d.includes("authentication") || d.includes("x-api-key")) {
    return {
      quoi: "La clé du modèle est refusée.",
      faire: "Vérifie BIA_LLM_API_KEY (ou ANTHROPIC_API_KEY) sur Render : une clé changée ou effacée donne exactement ça.",
    };
  }
  if (s === "429") {
    return {
      quoi: "Trop de questions en peu de temps.",
      faire: "Attends une minute et reparle-lui. Si ça revient sans arrêt, c'est le plafond du compte qui est atteint.",
    };
  }
  if (s === "529" || s === "503") {
    return {
      quoi: "Le modèle est surchargé, chez eux.",
      faire: "Ce n'est pas ton application. Ça passe tout seul, en général en quelques minutes.",
    };
  }
  if (s === "400" && d.includes("model")) {
    return {
      quoi: "Le nom du modèle n'est pas accepté.",
      faire: "Vérifie BIA_LLM_MODEL sur Render : un modèle renommé ou retiré donne ça.",
    };
  }
  if (s === "réponse vide") {
    return {
      quoi: "Le modèle a répondu, mais sans rien dire.",
      faire: "C'est rare et passager. Repose la question.",
    };
  }
  return {
    quoi: `Le modèle a refusé (${s}).`,
    faire: "Le message brut est en dessous : c'est lui qui dit la cause exacte.",
  };
}

const quand = (iso: string) => {
  try { return new Date(iso).toLocaleString("fr-FR"); } catch { return iso; }
};

export default function PageEtat() {
  const [etat, setEtat] = useState<Etat | null>(null);
  const [erreur, setErreur] = useState("");
  const [occupe, setOccupe] = useState(true);

  const regarder = useCallback(async () => {
    setOccupe(true);
    setErreur("");
    try {
      /* Sans le « no-store », le téléphone rendrait la réponse d'il y a dix
         minutes — et on diagnostiquerait une panne déjà passée. */
      const r = await fetch(`/api/etat?t=${Date.now()}`, { cache: "no-store" });
      if (!r.ok) throw new Error(`le serveur a répondu ${r.status}`);
      setEtat(await r.json() as Etat);
    } catch (e) {
      /* ── ET SI LA PAGE ELLE-MÊME N'ARRIVE PAS À LE JOINDRE ───────────────
         C'est une réponse, et même la plus importante : le serveur est
         endormi ou tombé, et ce n'est alors pas du tout la même panne. */
      setErreur((e as Error).message || "impossible de joindre le serveur");
    }
    setOccupe(false);
  }, []);

  useEffect(() => { void regarder(); }, [regarder]);

  const derniere = etat?.derniere_panne || null;
  const histoire = etat?.pannes?.dernieres || [];

  return (
    <main className="voix">
      <p className="voix-retour"><a href="/">← Revenir à BIA</a></p>

      <h1>L&apos;état de BIA</h1>
      <p className="voix-note">
        Ce qu&apos;elle a retenu de toi, et ce qui a raté. Cette page ne demande
        aucun code, et c&apos;est voulu&nbsp;: le jour où plus rien ne marche, il
        ne faut pas qu&apos;il faille un code valide pour savoir pourquoi.
      </p>

      <p className="voix-note">
        <button type="button" className="voix-copier" onClick={() => void regarder()} disabled={occupe}>
          {occupe ? "Un instant…" : "Regarder à nouveau"}
        </button>
      </p>

      {erreur ? (
        <div className="etat-mal">
          <p><b>Le serveur n&apos;a pas répondu du tout.</b></p>
          <p className="voix-note">{erreur}</p>
          <p className="voix-note">
            Ce n&apos;est pas le modèle, c&apos;est le serveur lui-même —
            endormi ou tombé. Sur la formule gratuite de Render, il s&apos;éteint
            après quinze minutes sans visite et met environ cinquante secondes à
            se réveiller. Attends une minute et regarde à nouveau.
          </p>
        </div>
      ) : null}

      {etat ? (
        <>
          {/* ── EST-CE CASSÉ MAINTENANT ? EN UN MOT ────────────────────── */}
          {derniere ? (
            <div className="etat-mal">
              <p><b>{expliquer(derniere).quoi}</b></p>
              <p>{expliquer(derniere).faire}</p>
              <p className="voix-note">
                À {quand(derniere.quand)} · sur « {derniere.ou} »
              </p>
              {derniere.detail ? <pre className="etat-brut">{derniere.detail}</pre> : null}
            </div>
          ) : (
            <div className="etat-bien">
              <p><b>Le moteur répond.</b></p>
              <p className="voix-note">
                Rien n&apos;est cassé à cet instant. S&apos;il y a eu des pannes
                plus tôt, elles sont dans la liste en dessous.
              </p>
            </div>
          )}

          {/* ── CE QUI EST BRANCHÉ ─────────────────────────────────────────
              Une clé absente et un crédit épuisé donnaient le même silence.
              Ici, les deux se distinguent d'un coup d'œil. */}
          <h2>Ce qui est branché</h2>
          <div className="etat-liste">
            <p><span>Le modèle</span><b>{etat.modele || "—"}</b></p>
            <p>
              <span>Sa clé</span>
              <b className={etat.cle_modele ? "etat-oui" : "etat-non"}>
                {etat.cle_modele ? "présente" : "ABSENTE — elle ne peut pas répondre du tout"}
              </b>
            </p>
            <p><span>Sa voix</span><b>{etat.voix || "—"}{etat.voix_clonee ? " (voix de Kha)" : ""}</b></p>
            <p><span>Son oreille</span><b>{etat.ecoute || "—"}</b></p>
            <p><span>Sa mémoire</span><b>{etat.lexique || "—"}</b></p>
            {/* Sans cette clé, elle ne trouve que les repères écrits à la
                main : trois endroits sur tout Dakar. */}
            <p>
              <span>Sa recherche de lieux</span>
              <b className={etat.cle_lieux ? "etat-oui" : "etat-non"}>
                {etat.cle_lieux
                  ? "clé Google présente"
                  : "clé Google ABSENTE — elle ne trouvera que les trois repères écrits à la main"}
              </b>
            </p>
          </div>

          {/* ── CE QUE TU LUI AS APPRIS ────────────────────────────────────

              Lamine, le 16 septembre 2026 : « je ne peux pas ouvrir le lien
              que tu m'as donné. »

              Je lui avais dit d'ouvrir /api/etat sur son téléphone et d'y
              chercher « lexique_auteurs ». C'était la troisième fois de la
              semaine que je lui demandais de lire du texte brut de serveur —
              et sa règle du 11 septembre disait déjà le contraire : « tout ce
              qui sert à la personne va dans l'interface, jamais sur une page
              qu'il faut taper à la main. »

              Pire : cette page-ci existait depuis le 12, à trois doigts de
              distance, et je l'avais oubliée. Les comptes étaient donc
              lisibles depuis quatre jours — sans porte pour y entrer. Encore.

              ── CE QUE CES TROIS LIGNES RÉPONDENT ──────────────────────────

              Sa question du 16 septembre était : « quand je la corrige sur
              une phrase, sans que ce soit en mode apprentissage, est-ce
              qu'elle mémorise vraiment ? » Aucune réponse de ma part ne vaut
              un compteur qu'il regarde monter lui-même après avoir parlé.

              ── ET POURQUOI SES PHRASES NE SONT PAS ÉCRITES ICI ────────────

              Cette page ne demande aucun code, et ça ne change pas : le jour
              de la panne, il ne faut pas de code pour savoir pourquoi. Mais
              son wolof est ce qu'il a de plus précieux — il m'a demandé le
              15 si un fournisseur pouvait le récupérer. On montre donc les
              NOMBRES, jamais les phrases. */}
          <h2>Ce que tu lui as appris</h2>
          <div className="etat-liste">
            <p>
              <span>Phrases dans sa mémoire</span>
              <b>{typeof etat.lexique_entrees === "number" ? etat.lexique_entrees : "—"}</b>
            </p>
            {/* Les deux comptes qui comptent pour lui, et ils ne disent pas la
                même chose : « maitre-vocal » est né d'une correction en pleine
                conversation, « maitre-lecon » d'une leçon avec son sens en
                français. Voir auteur: enPaire ? … dans app/api/retenir. */}
            <p>
              <span>Corrigées en parlant</span>
              <b className={(etat.lexique_auteurs?.["maitre-vocal"] || 0) > 0 ? "etat-oui" : "etat-non"}>
                {etat.lexique_auteurs?.["maitre-vocal"] ?? "—"}
              </b>
            </p>
            <p>
              <span>Apprises en mode leçon</span>
              <b>{etat.lexique_auteurs?.["maitre-lecon"] ?? "—"}</b>
            </p>
            {etat.souvenirs ? (
              <p>
                <span>Souvenirs gardés</span>
                <b>{etat.souvenirs.gardes ?? 0}</b>
              </p>
            ) : null}
          </div>
          <p className="voix-note">
            Le premier nombre est celui de toute la table, partagée avec tes
            autres applications. Les deux suivants sont à toi seul&nbsp;:
            <b> «&nbsp;corrigées en parlant&nbsp;»</b> doit monter d&apos;un à
            chaque fois que tu la reprends et qu&apos;elle répond
            «&nbsp;c&apos;est mémorisé&nbsp;». Parle-lui, reviens ici, appuie
            sur <i>Regarder à nouveau</i>&nbsp;: si le nombre n&apos;a pas
            bougé, elle ne l&apos;a pas rangé, quoi qu&apos;elle ait dit.
          </p>

          {/* ── ET CE QUI S'EST PASSÉ AUX DERNIÈRES LEÇONS ─────────────────
              Le compte ci-dessus dit SI c'est rangé. Celui-ci dit POURQUOI,
              quand ça ne l'est pas : ordre non reconnu, rien en main, ou tour
              qui n'a jamais été examiné faute de code. Trois pannes
              différentes, trois réparations différentes. */}
          {etat.lecons_donnees && (etat.lecons_donnees.tentatives || 0) > 0 ? (
            <>
              <h2>Tes dernières leçons</h2>
              <div
                className={
                  (etat.lecons_donnees.ecrites || 0) === (etat.lecons_donnees.tentatives || 0)
                    ? "etat-bien"
                    : "etat-mal"
                }
              >
                <p>
                  <b>
                    {etat.lecons_donnees.ecrites || 0} rangée
                    {(etat.lecons_donnees.ecrites || 0) > 1 ? "s" : ""} sur{" "}
                    {etat.lecons_donnees.tentatives} essai
                    {(etat.lecons_donnees.tentatives || 0) > 1 ? "s" : ""}.
                  </b>
                </p>
                {(etat.lecons_donnees.tentatives || 0) - (etat.lecons_donnees.reconnues || 0) > 0 ? (
                  <p className="voix-note">
                    {(etat.lecons_donnees.tentatives || 0) - (etat.lecons_donnees.reconnues || 0)} fois,
                    elle n&apos;a pas compris que c&apos;était un ordre de
                    mémoriser. Dis-moi comment tu l&apos;as formulé&nbsp;: c&apos;est
                    ma liste de tournures qui est trop étroite, pas toi qui
                    t&apos;y prends mal.
                  </p>
                ) : null}
                {(etat.lecons_donnees.rien_en_main || 0) > 0 ? (
                  <p className="voix-note">
                    {etat.lecons_donnees.rien_en_main} fois, l&apos;ordre était
                    clair mais elle n&apos;avait aucune phrase sous la main —
                    «&nbsp;retiens ça&nbsp;» sans qu&apos;un «&nbsp;ça&nbsp;»
                    ait été dit juste avant.
                  </p>
                ) : null}
                {(etat.lecons_donnees.sans_le_code || 0) > 0 ? (
                  <p className="voix-note">
                    {etat.lecons_donnees.sans_le_code} fois, le tour n&apos;a même
                    pas été examiné&nbsp;: le code maître n&apos;était pas
                    reconnu. L&apos;apprentissage est à toi seul.
                  </p>
                ) : null}
              </div>
              <p className="voix-note">
                Ce compte-ci repart à zéro à chaque réveil du serveur, toutes
                les quinze minutes d&apos;inactivité. Les nombres du dessus, eux,
                ne repartent jamais&nbsp;: ils sont dans Supabase.
              </p>
            </>
          ) : null}

          {/* ── LES DERNIÈRES PANNES ───────────────────────────────────────
              Une panne isolée et une panne qui revient toutes les dix minutes
              ne demandent pas le même geste. Le compte total le dit. */}
          <h2>
            Ce qui a raté {etat.pannes?.total ? `(${etat.pannes.total} depuis le dernier réveil)` : ""}
          </h2>
          {histoire.length === 0 ? (
            <p className="voix-note">
              Rien depuis que le serveur s&apos;est réveillé. Attention&nbsp;:
              ce compteur repart à zéro à chaque réveil, et sur la formule
              gratuite il se rendort toutes les quinze minutes.
            </p>
          ) : (
            histoire.map((p, i) => (
              <div key={`${p.quand}-${i}`} className="voix-item">
                <p className="voix-cle">{quand(p.quand)} · {p.ou} · {String(p.statut)}</p>
                <p>{expliquer(p).quoi}</p>
                {p.detail ? <pre className="etat-brut">{p.detail}</pre> : null}
              </div>
            ))
          )}
        </>
      ) : null}

      <p className="voix-retour voix-retour-bas"><a href="/">← Revenir à BIA</a></p>
    </main>
  );
}
