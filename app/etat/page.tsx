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
  voix?: string;
  ecoute?: string;
  lexique?: string;
  voix_clonee?: boolean;
  derniere_panne?: Panne | null;
  pannes?: { total: number; dernieres: Panne[] };
  depense?: unknown;
  repertoire?: { entrees?: number };
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
        Cette page ne demande aucun code, et c&apos;est voulu&nbsp;: le jour où
        plus rien ne marche, il ne faut pas qu&apos;il faille un code valide
        pour savoir pourquoi.
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
          </div>

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
