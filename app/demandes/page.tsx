"use client";
import { useCallback, useEffect, useState } from "react";

/* ── LA LISTE DES DEMANDES DE CODE ─────────────────────────────────────────

   Lamine, le 28 octobre 2026 : « donne-moi un moyen simple de voir la liste
   des demandes […] et dis-moi comment je la lis. »

   La table Supabase en est un — mais il lit TOUT depuis son téléphone, et la
   console de Supabase sur un téléphone est une épreuve. Cette page-ci montre
   la même liste, en grand, et permet de marquer « code envoyé » d'un doigt.

   POURQUOI UNE PAGE ET PAS UNE ADRESSE À OUVRIR. La route exige l'en-tête
   `x-bia-code`, et un navigateur de téléphone ne sait pas en poser un. Mettre
   le code maître dans l'adresse l'aurait rangé dans l'historique du téléphone
   et dans les journaux du serveur. La page, elle, lit le code déjà mémorisé
   par BIA — il n'y a rien à taper, et rien à laisser traîner. */

type Ligne = { numero: string; prenom: string | null; statut: string; demande_le: string; derniere: string };

export default function Demandes() {
  const [lignes, setLignes] = useState<Ligne[] | null>(null);
  const [erreur, setErreur] = useState("");
  const [occupe, setOccupe] = useState("");
  /* Le code fabriqué ne vit QUE dans cet écran, et pour un seul numéro à la
     fois : Lamine a demandé qu'il s'affiche une seule fois. Rien ne le range
     ici, et quitter la page l'efface. */
  const [codeNeuf, setCodeNeuf] = useState<{ numero: string; code: string; expire: string; message: string } | null>(null);
  const [copie, setCopie] = useState("");

  const code = () => { try { return localStorage.getItem("bia-code") || ""; } catch { return ""; } };

  const charger = useCallback(async () => {
    setErreur("");
    try {
      const r = await fetch("/api/demande-code", { headers: { "x-bia-code": code() }, cache: "no-store" });
      const d = await r.json();
      if (!r.ok) { setErreur(d.erreur || "Liste indisponible."); return; }
      setLignes(d.demandes || []);
    } catch { setErreur("Pas de connexion. Réessaie dans un instant."); }
  }, []);

  useEffect(() => { void charger(); }, [charger]);

  async function marquer(numero: string, statut: string) {
    setOccupe(numero);
    try {
      await fetch(`/api/demande-code?marquer=${encodeURIComponent(numero)}&statut=${encodeURIComponent(statut)}`,
        { headers: { "x-bia-code": code() }, cache: "no-store" });
      await charger();
    } finally { setOccupe(""); }
  }

  /* ── FABRIQUER LE CODE DE CETTE DEMANDE ────────────────────────

     Lamine, 28 octobre 2026 : « un bouton "Générer le code" par demande en
     attente, qui génère le code pour ce numéro, l'affiche une fois avec un
     message WhatsApp prêt à envoyer à ce numéro, et passe la demande à
     "code envoyé". RIEN n'est envoyé automatiquement. »

     L'ordre compte : le code est fabriqué et LIÉ d'abord, le statut ne change
     qu'après. Marquer « code envoyé » sur une fabrication ratée ferait
     disparaître la demande de la liste sans que personne n'ait reçu son code. */
  async function fabriquer(ligne: Ligne) {
    setOccupe(ligne.numero); setErreur(""); setCodeNeuf(null); setCopie("");
    try {
      const r = await fetch("/api/codes", {
        method: "POST", headers: { "content-type": "application/json", "x-bia-code": code() },
        body: JSON.stringify({ numero: ligne.numero, nom: ligne.prenom || "", heures: 720 }),
      });
      const d = await r.json();
      if (!r.ok || !d.code) { setErreur(d.erreur || "Le code n’a pas pu être créé."); return; }
      const message = `Bonjour${ligne.prenom ? " " + ligne.prenom : ""}, voici ton code pour BIA : ${d.code}\n`
        + `Ouvre https://app.khalam.app et entre ton numéro ${ligne.numero} avec ce code.\n`
        + `Ce code ne marche que sur ce numéro.`;
      setCodeNeuf({ numero: ligne.numero, code: d.code, expire: d.expire, message });
      await marquer(ligne.numero, "code envoyé");
    } catch { setErreur("Pas de connexion. Réessaie dans un instant."); }
    finally { setOccupe(""); }
  }

  const date = (iso: string) => {
    const d = new Date(iso);
    return Number.isNaN(d.getTime()) ? iso
      : d.toLocaleString("fr-FR", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });
  };

  return (
    <main className="reglage">
      <h1>Demandes de code</h1>
      <p className="intro">
        Ceux qui ont laissé leur numéro sur khalam.app. Le code n’est jamais envoyé tout seul :
        c’est toi qui réponds sur WhatsApp, puis tu marques la ligne.
      </p>
      {erreur ? <p role="alert" style={{ color: "#f0a98a" }}>{erreur}</p> : null}
      {lignes === null && !erreur ? <p role="status">Lecture…</p> : null}
      {lignes && !lignes.length ? <p role="status">Aucune demande pour l’instant.</p> : null}
      {lignes?.map((l) => (
        <div key={l.numero} style={{
          border: "1px solid rgba(255,255,255,.14)", borderRadius: 14, padding: 14, marginBottom: 10,
          display: "grid", gap: 8,
        }}>
          <div style={{ display: "flex", justifyContent: "space-between", gap: 10, alignItems: "baseline" }}>
            {/* Le numéro est sélectionnable : il doit pouvoir le copier pour
                l'ouvrir dans WhatsApp. */}
            <b style={{ fontSize: 17, userSelect: "all" }}>{l.numero}</b>
            <span style={{ fontSize: 12, opacity: .6 }}>{date(l.derniere)}</span>
          </div>
          <div style={{ fontSize: 13, opacity: .75 }}>
            {l.prenom ? l.prenom + " · " : ""}{l.statut}
          </div>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            {l.statut !== "code envoyé" ? (
              <button type="button" disabled={occupe === l.numero}
                onClick={() => void fabriquer(l)}
                style={{ minHeight: 44, padding: "0 16px" }}>
                {occupe === l.numero ? "Création…" : "Générer le code"}
              </button>
            ) : null}
            <a className="button" href={`https://wa.me/${l.numero.replace(/\D/g, "")}`}
              target="_blank" rel="noopener noreferrer"
              style={{ minHeight: 44, display: "inline-flex", alignItems: "center", padding: "0 16px" }}>
              Ouvrir WhatsApp
            </a>
            <button type="button" disabled={occupe === l.numero}
              onClick={() => void marquer(l.numero, l.statut === "code envoyé" ? "en attente" : "code envoyé")}
              style={{ minHeight: 44, padding: "0 16px" }}>
              {l.statut === "code envoyé" ? "Remettre en attente" : "Marquer « code envoyé »"}
            </button>
          </div>
        </div>
      ))}
      {codeNeuf ? (
        <section aria-label="Code créé" role="status" style={{
          position: "fixed", inset: "auto 12px 12px", zIndex: 20, background: "#11130f",
          border: "1px solid rgba(212,175,55,.5)", borderRadius: 16, padding: 16, display: "grid", gap: 10,
        }}>
          <b>Code pour {codeNeuf.numero}</b>
          <output style={{ fontSize: 24, letterSpacing: ".12em", userSelect: "all", wordBreak: "break-all" }}>{codeNeuf.code}</output>
          <p style={{ margin: 0, fontSize: 12.5, opacity: .75 }}>
            Il ne s’affichera qu’une fois. Il ne marche que sur ce numéro.
          </p>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            <a className="button" style={{ minHeight: 44, display: "inline-flex", alignItems: "center", padding: "0 16px" }}
              href={`https://wa.me/${codeNeuf.numero.replace(/\D/g, "")}?text=${encodeURIComponent(codeNeuf.message)}`}
              target="_blank" rel="noopener noreferrer">
              Envoyer sur WhatsApp
            </a>
            <button type="button" style={{ minHeight: 44, padding: "0 16px" }}
              onClick={async () => { try { await navigator.clipboard.writeText(codeNeuf.code); setCopie("fait"); } catch { setCopie("non"); } }}>
              {copie === "fait" ? "Code copié" : copie === "non" ? "Sélectionne le code" : "Copier le code"}
            </button>
            <button type="button" style={{ minHeight: 44, padding: "0 16px" }} onClick={() => setCodeNeuf(null)}>Fermer</button>
          </div>
        </section>
      ) : null}
      <button type="button" onClick={() => void charger()} style={{ minHeight: 44, marginTop: 8 }}>Actualiser</button>
    </main>
  );
}
