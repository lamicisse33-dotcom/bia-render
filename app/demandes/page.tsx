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
      <button type="button" onClick={() => void charger()} style={{ minHeight: 44, marginTop: 8 }}>Actualiser</button>
    </main>
  );
}
