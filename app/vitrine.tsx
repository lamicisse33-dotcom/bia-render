"use client";

import { useEffect, useState } from "react";

/* ── CE QU'ELLE MONTRE, SUR LE FIL ──────────────────────────────────────────

   Une image posée dans la conversation, à sa place, comme un papier. Le fil
   ne garde que la CLÉ du sujet — jamais l'image elle-même : une photo rangée
   dans la mémoire du téléphone remplirait le quota en quelques échanges et
   ferait tomber toute l'application. La clé pèse quinze signes ; l'image
   revient de Supabase quand il faut.

   LA VIDÉO NE DÉMARRE PAS TOUTE SEULE. `preload="none"` veut dire qu'aucun
   octet ne part avant que le doigt ne se pose. C'est la seule attitude
   honnête quand l'internet de la personne se paie au méga. */

type Piece = { cle: string; sorte: "photo" | "video"; nom: string; url: string; attente?: string };
type Sujet = { cle: string; nom: string; pieces: Piece[] };

/* Deux personnes peuvent demander la même chose dans la même conversation :
   on ne redemande pas au serveur ce qu'on vient d'obtenir. */
const connus = new Map<string, Sujet | null>();

export default function Vitrine({ cle }: { cle: string }) {
  const [sujet, setSujet] = useState<Sujet | null | undefined>(() =>
    connus.has(cle) ? connus.get(cle) : undefined);
  const [grande, setGrande] = useState<Piece | null>(null);

  useEffect(() => {
    if (connus.has(cle)) { setSujet(connus.get(cle)); return; }
    let vivant = true;
    (async () => {
      try {
        const r = await fetch(`/api/vitrine?voir=${encodeURIComponent(cle)}`);
        const d = (await r.json()) as { sujet?: Sujet | null };
        const trouve = d.sujet && d.sujet.pieces?.length ? d.sujet : null;
        connus.set(cle, trouve);
        if (vivant) setSujet(trouve);
      } catch {
        /* Pas de réseau : on n'affiche rien plutôt qu'un carré cassé. La
           réponse de BIA, elle, reste entière au-dessus. */
        if (vivant) setSujet(null);
      }
    })();
    return () => { vivant = false; };
  }, [cle]);

  // Ni pendant l'attente, ni quand il n'y a rien : un trou vaut mieux qu'un
  // squelette qui clignote sous chaque réponse.
  if (!sujet) return null;

  return (
    <>
      <div className="vitrine" role="group" aria-label={`Images — ${sujet.nom}`}>
        {sujet.pieces.map((p) => (
          p.sorte === "video" ? (
            <video key={p.cle} className="vitrine-piece" controls preload="none"
              playsInline poster={p.attente} aria-label={p.nom}>
              <source src={p.url} />
            </video>
          ) : (
            <button key={p.cle} type="button" className="vitrine-piece vitrine-photo"
              onClick={() => setGrande(p)} aria-label={`Agrandir : ${p.nom}`}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={p.url} alt={p.nom} loading="lazy" decoding="async" />
              <span>{p.nom}</span>
            </button>
          )
        ))}
      </div>

      {/* En grand. Un savon sur une vignette de cent pixels ne se voit pas —
          et c'est justement ce qu'on était venu voir. */}
      {grande ? (
        <div className="vitrine-grand" role="dialog" aria-label={grande.nom}
          onClick={() => setGrande(null)}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={grande.url} alt={grande.nom} />
          <p>{grande.nom}</p>
        </div>
      ) : null}
    </>
  );
}
