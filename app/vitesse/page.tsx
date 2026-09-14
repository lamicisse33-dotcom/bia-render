"use client";

/* ── OÙ PASSE LE TEMPS — LU DEPUIS L'IPHONE ──────────────────────────────────

   Lamine, le 15 septembre 2026 : « comme tu testes surtout sur iPhone, il faut
   que ces mesures soient accessibles facilement. »

   /api/etat rend déjà tout, mais c'est un mur de JSON : sur un téléphone,
   chercher `ou_passe_le_temps` dedans est une épreuve. Cette page ne mesure
   rien et ne décide rien — elle LIT /api/etat et met le chiffre qui compte en
   haut, en gros.

   Elle s'ouvre sur app.khalam.app/vitesse, sans code : il n'y a ici que des
   durées en millisecondes. Ni question, ni réponse, ni qui parle.           */

import { useCallback, useEffect, useState } from "react";

type Part = { quoi: string; ms: number; part: number };
type Groupe = {
  tours: number; vecu_ms: number; queue_ms: number; transcription_ms: number;
  modele_ms: number; voix_ms: number; demarrage_ms: number; ailleurs_ms: number;
};
type Tour = {
  voie: string; source: string; attente: boolean; queue_ms: number;
  transcription_ms: number; modele_ms: number; voix_ms: number;
  demarrage_ms: number; ailleurs_ms: number; vecu_ms: number;
};
type Appel = {
  appels: number; premier_octet_ms: number; complet_ms: number;
  coulee_ms: number; verdict: string; signes_median: number;
};
type Etat = {
  version?: string;
  etapes?: { modele: Appel | null; voix: Appel | null } | null;
  tours?: {
    tours: number;
    ou_passe_le_temps: Part[];
    reponse_du_modele: Groupe | null;
    reponse_enregistree: Groupe | null;
    avec_phrase_dattente: number;
    sources: Record<string, number>;
    derniers: Tour[];
  } | null;
};

const sec = (ms: number) => `${(ms / 1000).toFixed(1)} s`;

export default function Vitesse() {
  const [etat, setEtat] = useState<Etat | null>(null);
  const [motif, setMotif] = useState("");
  const [quand, setQuand] = useState("");

  const relire = useCallback(async () => {
    try {
      const r = await fetch("/api/etat", { cache: "no-store" });
      setEtat(await r.json() as Etat);
      setMotif("");
      setQuand(new Date().toLocaleTimeString("fr-FR"));
    } catch (e) { setMotif((e as Error).message); }
  }, []);

  /* Toutes les cinq secondes : il fait ses essais d'une main et regarde de
     l'autre. Devoir tirer pour rafraîchir entre chaque tour lui ferait perdre
     le fil de ce qu'il vient de dire. */
  useEffect(() => { void relire(); const t = setInterval(relire, 5000); return () => clearInterval(t); }, [relire]);

  const t = etat?.tours;
  const gros = t?.ou_passe_le_temps?.[0];

  return (
    <main style={{ minHeight: "100vh", background: "#0d0b09", color: "#f3ece2",
      font: "16px/1.5 system-ui, -apple-system, sans-serif", padding: "20px 16px 60px" }}>
      <div style={{ maxWidth: 640, margin: "0 auto" }}>
        <h1 style={{ font: "600 22px/1.3 system-ui", margin: "0 0 4px" }}>Où passe le temps</h1>
        <p style={{ margin: "0 0 24px", opacity: 0.55, fontSize: 13 }}>
          {etat?.version ? `version ${etat.version}` : "…"}{quand ? ` · relu à ${quand}` : ""}
          {motif ? ` · ${motif}` : ""}
        </p>

        {!t && (
          <p style={{ opacity: 0.7 }}>
            Aucun tour mesuré depuis le dernier redémarrage du serveur.
            Parle-lui une fois et cette page se remplit toute seule.
          </p>
        )}

        {t && (
          <>
            {gros && (
              <section style={{ background: "#1a1511", border: "1px solid #2e2620",
                borderRadius: 14, padding: "18px 16px", marginBottom: 22 }}>
                <p style={{ margin: 0, opacity: 0.6, fontSize: 13 }}>Le plus gros morceau</p>
                <p style={{ margin: "6px 0 2px", font: "600 26px/1.2 system-ui", color: "#e8b25f" }}>
                  {gros.quoi}
                </p>
                <p style={{ margin: 0, fontSize: 15, opacity: 0.8 }}>
                  {sec(gros.ms)} — {gros.part} % de l’attente
                </p>
              </section>
            )}

            <Barres parts={t.ou_passe_le_temps} />

            <Appels e={etat?.etapes} />

            <Bloc titre="Quand elle doit réfléchir" g={t.reponse_du_modele} />
            <Bloc titre="Quand la réponse est déjà enregistrée" g={t.reponse_enregistree} />

            <p style={{ margin: "18px 0 6px", opacity: 0.6, fontSize: 13 }}>
              {t.tours} tour(s) mesuré(s) · {t.avec_phrase_dattente} avec une phrase d’attente
            </p>
            <p style={{ margin: "0 0 24px", opacity: 0.5, fontSize: 12 }}>
              {Object.entries(t.sources).map(([s, n]) => `${s} ×${n}`).join(" · ")}
            </p>

            <h2 style={{ font: "600 15px/1.3 system-ui", margin: "0 0 8px", opacity: 0.8 }}>
              Les derniers tours
            </h2>
            <div style={{ overflowX: "auto" }}>
              <table style={{ borderCollapse: "collapse", fontSize: 12, minWidth: 520 }}>
                <thead>
                  <tr style={{ opacity: 0.55, textAlign: "right" }}>
                    <th style={{ textAlign: "left", padding: "4px 8px" }}>source</th>
                    <th style={{ padding: "4px 8px" }}>silence</th>
                    <th style={{ padding: "4px 8px" }}>écoute</th>
                    <th style={{ padding: "4px 8px" }}>modèle</th>
                    <th style={{ padding: "4px 8px" }}>voix</th>
                    <th style={{ padding: "4px 8px" }}>départ</th>
                    <th style={{ padding: "4px 8px" }}>TOTAL</th>
                  </tr>
                </thead>
                <tbody>
                  {[...t.derniers].reverse().map((x, i) => (
                    <tr key={i} style={{ borderTop: "1px solid #241d18", textAlign: "right" }}>
                      <td style={{ textAlign: "left", padding: "5px 8px", opacity: 0.75 }}>
                        {x.source}{x.attente ? " ·att" : ""}
                      </td>
                      <td style={{ padding: "5px 8px" }}>{x.queue_ms}</td>
                      <td style={{ padding: "5px 8px" }}>{x.transcription_ms}</td>
                      <td style={{ padding: "5px 8px" }}>{x.modele_ms}</td>
                      <td style={{ padding: "5px 8px" }}>{x.voix_ms}</td>
                      <td style={{ padding: "5px 8px" }}>{x.demarrage_ms}</td>
                      <td style={{ padding: "5px 8px", fontWeight: 600 }}>{x.vecu_ms}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p style={{ margin: "10px 0 0", opacity: 0.45, fontSize: 11 }}>
              En millisecondes. « silence » = de sa dernière syllabe à lui jusqu’à la coupure du
              micro. « départ » = du son fabriqué à la première syllabe réellement entendue.
              « TOTAL » = tout le tour, tel qu’il le vit.
            </p>
          </>
        )}
      </div>
    </main>
  );
}

/* ── ATTENDRE, OU COULER ────────────────────────────────────────────────
   Sa question du 15 septembre 2026, et c'est elle qui décide de tout ce qui
   suit : les quatre secondes du modèle et de la voix, est-ce qu'on les
   ATTEND avant le premier octet, ou est-ce qu'elles COULENT après ? Dans le
   premier cas il n'y a rien à gagner. Dans le second, il y a tout. */
function Appels({ e }: { e?: { modele: Appel | null; voix: Appel | null } | null }) {
  if (!e || (!e.modele && !e.voix)) return null;
  const un = (titre: string, a: Appel | null) => {
    if (!a) return null;
    const part = a.complet_ms ? Math.round((a.premier_octet_ms / a.complet_ms) * 100) : 0;
    return (
      <div key={titre} style={{ marginBottom: 16 }}>
        <div style={{ display: "flex", justifyContent: "space-between", fontSize: 14, marginBottom: 5 }}>
          <span style={{ fontWeight: 600 }}>{titre}</span>
          <span style={{ opacity: 0.6 }}>{a.appels} appel(s)</span>
        </div>
        <div style={{ display: "flex", height: 18, borderRadius: 4, overflow: "hidden",
          background: "#1a1511", marginBottom: 5 }}>
          <div title="avant le premier octet" style={{ width: `${part}%`, background: "#c2543f" }} />
          <div title="ce qui coule ensuite" style={{ width: `${100 - part}%`, background: "#4f8a5b" }} />
        </div>
        <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, opacity: 0.75 }}>
          <span>premier octet : {sec(a.premier_octet_ms)}</span>
          <span>puis {sec(a.coulee_ms)} qui coulent</span>
          <span>total {sec(a.complet_ms)}</span>
        </div>
        <p style={{ margin: "5px 0 0", fontSize: 12, color: a.coulee_ms > 500 ? "#7fc48f" : "#d79a8c" }}>
          {a.verdict}
        </p>
      </div>
    );
  };
  return (
    <section style={{ marginBottom: 24, paddingTop: 4 }}>
      <h2 style={{ font: "600 15px/1.3 system-ui", margin: "0 0 10px" }}>
        Attendre, ou couler
      </h2>
      {un("Le modèle — avant le premier mot", e.modele)}
      {un("La voix — avant le premier octet audio", e.voix)}
      <p style={{ margin: 0, opacity: 0.45, fontSize: 11 }}>
        En rouge, le temps où rien n’arrive : il faut l’attendre. En vert, ce qui coule
        ensuite : on pourrait commencer à parler sans l’attendre.
      </p>
    </section>
  );
}

function Barres({ parts }: { parts: Part[] }) {
  const max = Math.max(1, ...parts.map((p) => p.ms));
  return (
    <div style={{ marginBottom: 24 }}>
      {parts.map((p) => (
        <div key={p.quoi} style={{ marginBottom: 10 }}>
          <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13, marginBottom: 3 }}>
            <span style={{ opacity: 0.85 }}>{p.quoi}</span>
            <span style={{ opacity: 0.6 }}>{sec(p.ms)}</span>
          </div>
          <div style={{ height: 8, background: "#1a1511", borderRadius: 4, overflow: "hidden" }}>
            <div style={{ height: "100%", width: `${Math.round((p.ms / max) * 100)}%`,
              background: "#e8b25f", borderRadius: 4 }} />
          </div>
        </div>
      ))}
    </div>
  );
}

function Bloc({ titre, g }: { titre: string; g: Groupe | null }) {
  if (!g) return null;
  const lignes: Array<[string, number]> = [
    ["silence avant la coupure", g.queue_ms],
    ["transcription", g.transcription_ms],
    ["modèle", g.modele_ms],
    ["fabrication de la voix", g.voix_ms],
    ["démarrage du son", g.demarrage_ms],
    /* Le temps qu'aucune borne ne couvre. Zéro quand tout est mesuré ;
       s'il grossit, c'est qu'un chemin nous échappe. */
    ["ailleurs", g.ailleurs_ms],
  ];
  return (
    <section style={{ marginBottom: 18 }}>
      <h2 style={{ font: "600 15px/1.3 system-ui", margin: "0 0 6px" }}>
        {titre} <span style={{ opacity: 0.5, fontWeight: 400 }}>({g.tours})</span>
      </h2>
      <p style={{ margin: "0 0 8px", font: "600 20px/1.2 system-ui", color: "#e8b25f" }}>
        {sec(g.vecu_ms)} <span style={{ fontSize: 13, opacity: 0.6, fontWeight: 400 }}>en tout</span>
      </p>
      {lignes.map(([quoi, ms]) => (
        <div key={quoi} style={{ display: "flex", justifyContent: "space-between",
          fontSize: 13, padding: "3px 0", opacity: 0.8 }}>
          <span>{quoi}</span><span>{ms} ms</span>
        </div>
      ))}
    </section>
  );
}
