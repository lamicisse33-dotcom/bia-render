"use client";

/* ── LA DISCUSSION ÉCRITE, ET POURQUOI ELLE VIT DANS SON PROPRE FICHIER ────

   Lamine, le 27 octobre 2026 : « une fenêtre de discussion UNIQUEMENT TEXTE.
   J'écris, BIA répond par écrit. AUCUN son : sa voix ne parle jamais dans
   cette fenêtre (aujourd'hui un message tapé la fait parler : corrige ça). »

   LA CORRECTION N'EST PAS UN INTERRUPTEUR, C'EST UNE PORTE QUI N'EXISTE PAS.
   On aurait pu ajouter un drapeau « ne parle pas » à `askBia()` dans
   app/page.tsx. Mais `askBia()` est le cœur de la conversation vocale : il
   ouvre le micro, attend son tour, fabrique la voix, anime la bouche. Un
   drapeau de plus dedans, c'est une branche de plus à ne jamais oublier — et
   le jour où on l'oublie, elle parle par-dessus lui.

   Ce fichier ne peut PAS faire de son. Il n'importe ni `speak`, ni
   l'AudioContext, ni `speechSynthesis`, ni le micro. Il n'a qu'une seule
   sortie : `/api/chat`. Le silence n'est donc pas un réglage qu'on peut
   perdre, c'est une conséquence de ce qui n'est pas écrit ici. L'épreuve
   tests/discussion-ecrite-browser.cjs le vérifie en comptant les appels au
   haut-parleur : zéro.

   C'EST LA MÊME BIA. Même route, mêmes consignes, même mémoire : /api/chat
   garde le tour dans ses souvenirs tout seul (voir `garderCeTour`), donc ce
   qui est écrit ici se retrouve dans la conversation vocale. Elle ne parle
   jamais la première : rien n'est envoyé avant qu'il écrive. */

import { useCallback, useEffect, useRef, useState } from "react";

export type MessageEcrit = { role: "moi" | "bia"; texte: string };

/* Le fil est gardé PAR COMPTE, sur l'appareil. Deux personnes qui se prêtent
   le téléphone ne lisent pas la discussion de l'autre : c'est la même règle
   que le fil de la conversation vocale (voir cleFil dans app/page.tsx). */
const cle = (personne: string) => `bia-discussion-${personne || "maitre"}`;
const AU_PLUS = 200;

function lire(personne: string): MessageEcrit[] {
  try {
    const brut = localStorage.getItem(cle(personne));
    if (!brut) return [];
    const liste = JSON.parse(brut);
    if (!Array.isArray(liste)) return [];
    return liste
      .filter((m) => m && (m.role === "moi" || m.role === "bia") && typeof m.texte === "string")
      .slice(-AU_PLUS);
  } catch { return []; }
}

function ecrire(personne: string, liste: MessageEcrit[]) {
  try { localStorage.setItem(cle(personne), JSON.stringify(liste.slice(-AU_PLUS))); } catch {}
}

/* La fenêtre que le modèle reçoit. On n'envoie pas deux cents messages à
   chaque phrase : ce serait payer la mémoire longue deux fois, alors qu'elle
   vit déjà dans ses souvenirs. Les vingt derniers tours suffisent au fil. */
const FENETRE = 20;

/* ── LE NUMÉRO, QUI MANQUAIT ICI ET NULLE PART AILLEURS ────────────────────

   Le 28 octobre 2026 : entrer dans BIA demande désormais un NUMÉRO et un
   CODE, et /api/chat revérifie les deux à chaque réponse — c'est là que
   chaque réponse se paie, donc c'est là qu'on regarde.

   Toute l'application l'avait suivi. Cette fenêtre-ci, non : elle a son
   propre appel à /api/chat, écrit le 27 octobre, et il n'envoyait que le
   code. Le soir même, dans la fenêtre écrite, « cc » répondait — le
   répertoire répond AVANT la porte, ses sons vivent dans un seau public — et
   TOUT LE RESTE était refusé pour numéro manquant.

   On le lit au même endroit que le reste de l'application : `bia-numero`,
   rangé par la porte au moment où le serveur a dit oui. */
function numeroDeCetAppareil(): string {
  try { return localStorage.getItem("bia-numero") || ""; } catch { return ""; }
}

export default function Discussion({ code, personne, onFermer }: { code: string; personne: string; onFermer: () => void }) {
  const [messages, setMessages] = useState<MessageEcrit[]>([]);
  const [saisie, setSaisie] = useState("");
  const [enVol, setEnVol] = useState(false);
  const [souci, setSouci] = useState("");
  const liste = useRef<HTMLDivElement | null>(null);
  const champ = useRef<HTMLTextAreaElement | null>(null);
  const vivant = useRef(true);

  useEffect(() => { setMessages(lire(personne)); }, [personne]);
  useEffect(() => () => { vivant.current = false; }, []);

  /* On descend au dernier message à chaque arrivée, comme toute discussion.
     `behavior: auto` et pas `smooth` : sur un vieil iPhone, l'animation se
     cumule et le fil tremble. */
  useEffect(() => {
    const d = liste.current;
    if (d) d.scrollTop = d.scrollHeight;
  }, [messages, enVol]);

  const envoyer = useCallback(async () => {
    const dit = saisie.trim();
    if (!dit || enVol) return;
    setSouci("");
    setSaisie("");
    const avant = [...messages, { role: "moi" as const, texte: dit }];
    setMessages(avant);
    ecrire(personne, avant);
    setEnVol(true);
    try {
      const r = await fetch("/api/chat", {
        method: "POST",
        /* Le numéro voyage par un EN-TÊTE, jamais par l'adresse : une adresse
           se retrouve dans l'historique du téléphone et dans les journaux. */
        headers: { "content-type": "application/json", "x-bia-code": code,
          ...(numeroDeCetAppareil() ? { "x-bia-numero": numeroDeCetAppareil() } : {}),
          ...(personne && personne !== "maitre" ? { "x-bia-personne": personne } : {}) },
        body: JSON.stringify({
          message: dit,
          /* `parole: false` : ce tour n'est pas une parole. C'est ce que le
             serveur lit pour ranger le tour dans ses souvenirs. */
          parole: false,
          /* `diffuse: false` : une seule réponse, en un bloc. La diffusion au
             fil de l'eau n'existe que pour ouvrir la bouche plus tôt, et ici
             aucune bouche ne s'ouvre. */
          diffuse: false,
          /* Pour que son coût se lise à part, sur la ligne `chat_ecrit` de
             /api/etat → depense.modele. Ne change rien à la réponse. */
          ecrit: true,
          /* Sans lui, `quiParleIci` ne sait pas pour qui ranger le souvenir,
             et ce qui est écrit par quelqu'un d'autre que le maître ne serait
             pas retrouvé dans la conversation vocale. */
          personne,
          history: avant.slice(-FENETRE).map((m) => ({ role: m.role === "moi" ? "user" : "bia", text: m.texte })),
        }),
      });
      const d = await r.json().catch(() => null);
      if (!vivant.current) return;
      const texte = String(d?.reply || "").trim();
      if (!r.ok || !texte) {
        /* ── LA RAISON, PAS UNE PHRASE PASSE-PARTOUT ────────────────────
           Une panne se dit, elle ne s'affiche pas comme une phrase de BIA :
           ranger un message d'erreur dans le fil le ferait remonter un jour
           comme une chose qu'elle aurait dite.
           Mais elle doit DIRE LAQUELLE. Le 28 octobre, ce chemin affichait
           « Je n'ai pas pu répondre » pour un refus de numéro parfaitement
           nommé par le serveur : la vraie raison était là, dans `erreur`, et
           personne ne la lisait. On prend ce que le serveur dit, dans
           l'ordre, et la phrase passe-partout n'est plus que le dernier
           recours. */
        const raison = texte
          || String(d?.erreur || "").trim()
          || (r.status === 401
            ? "Ton accès n’a pas été reconnu. Ouvre l’écran d’entrée et saisis à nouveau ton numéro et ton code."
            : r.status >= 500
              ? "Mon cerveau n’a pas répondu. Réessaie dans un instant."
              : "Je n’ai pas pu répondre. Réessaie dans un instant.");
        setSouci(raison);
        return;
      }
      const apres = [...avant, { role: "bia" as const, texte }];
      setMessages(apres);
      ecrire(personne, apres);
    } catch {
      if (vivant.current) setSouci("Je n’ai pas pu répondre. Réessaie dans un instant.");
    } finally {
      if (vivant.current) setEnVol(false);
    }
  }, [saisie, enVol, messages, personne, code]);

  return (
    <section className="discussion" role="dialog" aria-label="Discussion écrite avec BIA">
      <header className="discussion-haut">
        <button type="button" className="discussion-retour" onClick={onFermer} aria-label="Revenir à l’écran principal">
          <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M15.4 4.6 13.9 3.2 5.1 12l8.8 8.8 1.5-1.4L8.1 12l7.3-7.4Z" /></svg>
        </button>
        <h1 className="discussion-titre">Discussion</h1>
      </header>

      <div className="discussion-fil" ref={liste}>
        {messages.length === 0 ? (
          /* Elle ne parle jamais la première : pas un message d'accueil
             signé d'elle, juste une indication de l'écran. */
          <p className="discussion-vide">Écris ton message ci-dessous.</p>
        ) : null}
        {messages.map((m, i) => (
          <div key={i} className={m.role === "moi" ? "discussion-ligne discussion-ligne-moi" : "discussion-ligne"}>
            <div className={m.role === "moi" ? "discussion-bulle discussion-bulle-moi" : "discussion-bulle discussion-bulle-bia"}>
              {m.texte.split(/\n+/).filter(Boolean).map((p, n) => <span className="discussion-para" key={n}>{p}</span>)}
            </div>
          </div>
        ))}
        {enVol ? <div className="discussion-ligne"><div className="discussion-bulle discussion-bulle-bia discussion-attend" aria-live="polite">…</div></div> : null}
        {souci ? <p className="discussion-souci" role="alert">{souci}</p> : null}
      </div>

      <form className="discussion-saisie" onSubmit={(e) => { e.preventDefault(); void envoyer(); }}>
        <textarea
          ref={champ}
          value={saisie}
          onChange={(e) => setSaisie(e.target.value)}
          /* Entrée envoie, Maj+Entrée va à la ligne : l'habitude de toutes
             les discussions. Sur le téléphone, c'est le bouton qui sert. */
          onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); void envoyer(); } }}
          placeholder="Écris ici"
          rows={1}
          aria-label="Ton message"
        />
        <button type="submit" disabled={!saisie.trim() || enVol} aria-label="Envoyer">
          <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3.4 20.4 22 12 3.4 3.6 3.4 10l13 2-13 2v6.4Z" /></svg>
        </button>
      </form>
    </section>
  );
}
