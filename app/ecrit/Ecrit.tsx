"use client";
/* ── LE DOCUMENT EN PLEIN ÉCRAN, PENDANT QU'IL S'ÉCRIT ─────────────────────

   Lamine, le 24 octobre 2026 : « quand BIA rédige un message, un mail, un
   devis ou une facture, elle s'efface et le document s'affiche en PLEIN
   ÉCRAN sur l'écran principal, comme la carte ou la vidéo, et la personne le
   voit s'écrire en direct. »

   QUATRE FORMATS, PAS UN DE PLUS. Ils existaient déjà comme types dans
   lib/documents.ts, et /api/document sait déjà les fabriquer : on n'invente
   ni forme ni route. Ce qui est neuf, c'est l'écran — un panneau latéral et
   un plein écran ne se dessinent pas pareil, et c'est le plein écran qu'il a
   demandé.

   « IL LE VOIT S'ÉCRIRE EN DIRECT », ET IL FAUT DIRE CE QUE C'EST. Le modèle
   rend le document d'un bloc : il n'y a pas de flux de jetons à suivre. Ce
   qu'on montre est donc un DÉVOILEMENT progressif du document reçu, au rythme
   d'une main qui écrit. Ce n'est pas la fabrication qu'on regarde, c'est
   l'écriture — et pendant la fabrication, l'écran le dit (« BIA écrit… »).
   Prétendre suivre le modèle en direct serait un mensonge d'affichage.

   Un téléphone réglé sur « moins d'animations » reçoit le document entier
   tout de suite : on ne fait pas attendre quelqu'un qui a demandé à ne pas
   voir d'animation. */

import { useEffect, useMemo, useRef, useState } from "react";
import { franc, totauxDe, type Document, type Devis, type Mot, type Totaux } from "@/lib/documents";

export type SorteEcrit = "message" | "mail" | "devis" | "facture";

/** Le nombre de signes déjà « écrits », pour le dévoilement progressif. */
function useEcriture(total: number, actif: boolean) {
  const [ecrits, setEcrits] = useState(actif ? 0 : total);
  const minuterie = useRef<ReturnType<typeof setInterval> | undefined>(undefined);
  useEffect(() => {
    if (!actif) { setEcrits(total); return; }
    setEcrits(0);
    /* Environ 900 signes par seconde : assez lent pour qu'on voie la main,
       assez vif pour qu'un devis de deux mille signes n'oblige pas à
       attendre. */
    minuterie.current = setInterval(() => {
      setEcrits((n) => {
        const suite = n + 18;
        if (suite >= total && minuterie.current) clearInterval(minuterie.current);
        return Math.min(total, suite);
      });
    }, 20);
    return () => { if (minuterie.current) clearInterval(minuterie.current); };
  }, [total, actif]);
  return ecrits;
}

/** Coupe un texte au nombre de signes déjà écrits. */
const jusque = (texte: string, reste: number) => (reste <= 0 ? "" : texte.slice(0, reste));

function VueMessage({ doc, reste, mail }: { doc: Mot; reste: number; mail: boolean }) {
  return (
    <div className={mail ? "ecrit-mail" : "ecrit-message"}>
      <p className="ecrit-canal">{mail ? "Mail" : (doc.canal || "Message WhatsApp")}</p>
      {doc.destinataire ? <p className="ecrit-pour">À : {doc.destinataire}</p> : null}
      {mail && doc.objet ? <p className="ecrit-objet"><b>Objet :</b> {doc.objet}</p> : null}
      <div className={mail ? "ecrit-corps" : "ecrit-bulle"}>{jusque(doc.texte || "", reste)}</div>
    </div>
  );
}

function VueChiffree({ doc, totaux, reste }: { doc: Devis; totaux: Totaux | null; reste: number }) {
  const facture = doc.nature === "facture";
  let budget = reste;
  const prendre = (t: string) => { const v = jusque(t, budget); budget -= t.length; return v; };
  return (
    <div className="ecrit-chiffre">
      <header>
        <h1>{facture ? "Facture" : "Devis"}</h1>
        <p className="ecrit-reference">
          {prendre(facture && doc.numero ? `N° ${doc.numero}` : "")}
          {doc.date ? <span> {prendre(doc.date)}</span> : null}
        </p>
      </header>
      <p className="ecrit-client"><b>Client</b><br />{prendre(doc.client?.nom || "")}</p>
      {doc.objet ? <p className="ecrit-objet">{prendre(doc.objet)}</p> : null}
      <table>
        <thead><tr><th>Désignation</th><th>Qté</th><th>Prix</th></tr></thead>
        <tbody>
          {(doc.lignes || []).map((l, i) => (
            <tr key={i}>
              <td>{prendre(l.designation || "")}</td>
              <td>{l.quantite}</td>
              <td>{franc(l.prix_unitaire)}</td>
            </tr>
          ))}
        </tbody>
      </table>
      {totaux ? (
        <p className="ecrit-total"><span>Total</span><b>{franc(totaux.total)}</b></p>
      ) : null}
    </div>
  );
}

export default function Ecrit({ doc, sorte, enCours, onFermer }: {
  doc: Document | null;
  sorte: SorteEcrit;
  /** Vrai tant que le document se fabrique : l'écran le dit au lieu de mentir. */
  enCours: boolean;
  onFermer: () => void;
}) {
  const [copie, setCopie] = useState(false);
  const animations = useMemo(() => typeof window !== "undefined"
    && !window.matchMedia?.("(prefers-reduced-motion: reduce)").matches, []);

  /* Le texte brut sert à deux choses : mesurer l'écriture, et le copier. */
  const brut = useMemo(() => {
    if (!doc) return "";
    if (doc.type === "message") {
      return [doc.objet ? `Objet : ${doc.objet}` : "", doc.texte || ""].filter(Boolean).join("\n\n");
    }
    if (doc.type === "devis") {
      const t = totauxDe(doc);
      return [
        doc.nature === "facture" ? "FACTURE" : "DEVIS",
        doc.numero ? `N° ${doc.numero}` : "", doc.date, doc.client?.nom || "", doc.objet || "",
        ...(doc.lignes || []).map((l) => `${l.designation} — ${l.quantite} × ${franc(l.prix_unitaire)}`),
        `Total : ${franc(t.total)}`,
      ].filter(Boolean).join("\n");
    }
    return doc.corps?.join("\n\n") || "";
  }, [doc]);

  const ecrits = useEcriture(brut.length, Boolean(doc) && animations);
  const totaux = doc?.type === "devis" ? totauxDe(doc) : null;
  /* Le total n'apparaît qu'une fois les lignes écrites : un total qui
     s'affiche avant ses lignes se lit comme un prix tombé du ciel. */
  const fini = ecrits >= brut.length;

  const copier = async () => {
    try { await navigator.clipboard.writeText(brut); setCopie(true); setTimeout(() => setCopie(false), 2000); } catch { /* rien à dire */ }
  };

  return (
    <main className="ecrit-plein" role="dialog" aria-modal="true" aria-label={sorte}>
      <div className="ecrit-feuille">
        {enCours || !doc ? (
          <p className="ecrit-attente" role="status">BIA écrit…</p>
        ) : doc.type === "devis" ? (
          <VueChiffree doc={doc} totaux={fini ? totaux : null} reste={ecrits} />
        ) : doc.type === "message" ? (
          <VueMessage doc={doc} reste={ecrits} mail={sorte === "mail"} />
        ) : (
          <div className="ecrit-corps">{jusque(brut, ecrits)}</div>
        )}
      </div>
      <div className="ecrit-barre">
        <button type="button" className="pale" onClick={onFermer}>Revenir à BIA</button>
        <button type="button" disabled={!doc || !fini} onClick={() => void copier()}>
          {copie ? "Copié" : "Copier le texte"}
        </button>
      </div>
    </main>
  );
}
