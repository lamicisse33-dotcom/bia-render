"use client";

import { useState, useEffect, useRef, useCallback } from "react";

interface Son {
  chemin: string;           // ex. "wo/abc123.mp3"
  langue: string;           // "wo" | "fr"
  texte?: string;
  moteur?: string;
  octets?: number;
  le?: string;
}

interface Resume {
  total: number;
  octets_mo: number;
  part_gratuite: number;
  limite_mo: number;
}

interface Correction {
  mot: string;
  dire: string;
  actif: boolean;
  created_at: string;
}

function formatTaille(octets: number) {
  if (octets < 1024) return `${octets} o`;
  if (octets < 1024 * 1024) return `${(octets / 1024).toFixed(1)} Ko`;
  return `${(octets / 1024 / 1024).toFixed(2)} Mo`;
}

function formatDate(iso: string) {
  try {
    return new Date(iso).toLocaleString("fr-FR", {
      day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit",
    });
  } catch { return iso; }
}

function PageCode({ onCode }: { onCode: (c: string) => void }) {
  const [code, setCode] = useState("");
  const [err, setErr] = useState("");
  const [chargement, setChargement] = useState(false);

  async function entrer(e: React.FormEvent) {
    e.preventDefault();
    setChargement(true); setErr("");
    const r = await fetch("/api/voix-gardees", { headers: { "x-bia-code": code } });
    setChargement(false);
    if (r.status === 401) { setErr("Code incorrect."); return; }
    if (!r.ok) { setErr(`Erreur ${r.status}`); return; }
    try { sessionStorage.setItem("bia-code-ecouter", code); } catch { /**/ }
    onCode(code);
  }

  return (
    <div style={{
      minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center",
      background: "#0f172a", fontFamily: "system-ui, sans-serif",
    }}>
      <div style={{
        background: "#1e293b", borderRadius: 16, padding: "40px 48px",
        maxWidth: 400, width: "100%", textAlign: "center",
        boxShadow: "0 25px 50px rgba(0,0,0,.5)",
      }}>
        <div style={{ fontSize: 48, marginBottom: 16 }}>🎧</div>
        <h1 style={{ color: "#f1f5f9", fontSize: 22, fontWeight: 700, margin: "0 0 8px" }}>
          Voix de BIA
        </h1>
        <p style={{ color: "#94a3b8", fontSize: 14, margin: "0 0 28px" }}>
          Réécouter · Corriger la prononciation
        </p>
        {err && (
          <div style={{
            background: "#450a0a", color: "#fca5a5", borderRadius: 8,
            padding: "10px 14px", marginBottom: 16, fontSize: 14,
          }}>{err}</div>
        )}
        <form onSubmit={entrer}>
          <input
            type="password" value={code} onChange={e => setCode(e.target.value)}
            placeholder="Code maître" autoFocus
            style={{
              width: "100%", padding: "12px 16px", borderRadius: 8,
              border: "1px solid #334155", background: "#0f172a",
              color: "#f1f5f9", fontSize: 16, boxSizing: "border-box",
              marginBottom: 12, outline: "none",
            }}
          />
          <button type="submit" disabled={chargement || !code} style={{
            width: "100%", padding: "12px", borderRadius: 8,
            background: chargement ? "#334155" : "#3b82f6",
            color: "#fff", border: "none", fontSize: 16,
            fontWeight: 600, cursor: chargement ? "default" : "pointer",
          }}>
            {chargement ? "Vérification…" : "Accéder →"}
          </button>
        </form>
      </div>
    </div>
  );
}

function ModalCorrection({
  son, code, onFermer, onFait,
}: {
  son: Son;
  code: string;
  onFermer: () => void;
  onFait: (texte: string) => void;
}) {
  const [mot, setMot] = useState("");
  const [dire, setDire] = useState("");
  const [envoi, setEnvoi] = useState(false);
  const [etape, setEtape] = useState<"form" | "ok">("form");

  const mots = Array.from(new Set(
    (son.texte ?? "").split(/\s+/).filter(m => m.length > 2)
  )).slice(0, 10);

  async function valider(e: React.FormEvent) {
    e.preventDefault();
    setEnvoi(true);
    await fetch("/api/voix-gardees", {
      method: "POST",
      headers: { "content-type": "application/json", "x-bia-code": code },
      body: JSON.stringify({ texte: son.texte }),
    }).catch(() => {});
    if (mot.trim() && dire.trim()) {
      await fetch("/api/prononciation", {
        method: "POST",
        headers: { "content-type": "application/json", "x-bia-code": code },
        body: JSON.stringify({ mot: mot.trim(), dire: dire.trim() }),
      }).catch(() => {});
    }
    setEnvoi(false);
    setEtape("ok");
  }

  return (
    <div
      style={{
        position: "fixed", inset: 0, background: "rgba(0,0,0,.7)",
        display: "flex", alignItems: "center", justifyContent: "center",
        zIndex: 100, padding: 16,
      }}
      onClick={e => { if (e.target === e.currentTarget) onFermer(); }}
    >
      <div style={{
        background: "#1e293b", borderRadius: 16, padding: 28,
        maxWidth: 480, width: "100%",
        boxShadow: "0 25px 60px rgba(0,0,0,.6)",
      }}>
        {etape === "ok" ? (
          <div style={{ textAlign: "center" }}>
            <div style={{ fontSize: 48, marginBottom: 16 }}>✅</div>
            <p style={{ color: "#4ade80", fontWeight: 700, fontSize: 16, margin: "0 0 8px" }}>
              Son retiré !
            </p>
            {mot && dire && (
              <p style={{ color: "#94a3b8", fontSize: 14, margin: "0 0 20px" }}>
                BIA dira <strong style={{ color: "#f1f5f9" }}>«&nbsp;{dire}&nbsp;»</strong>
                {" "}à la place de <strong style={{ color: "#f1f5f9" }}>«&nbsp;{mot}&nbsp;»</strong>
                {" "}(actif dans ~5 minutes).
              </p>
            )}
            <button
              onClick={() => onFait(son.texte)}
              style={{
                background: "#3b82f6", color: "#fff", border: "none",
                borderRadius: 8, padding: "10px 24px", cursor: "pointer",
                fontWeight: 600, fontSize: 15,
              }}
            >
              Fermer
            </button>
          </div>
        ) : (
          <>
            <h3 style={{ color: "#f1f5f9", margin: "0 0 8px", fontSize: 17, fontWeight: 700 }}>
              🔧 Corriger la prononciation
            </h3>
            <p style={{
              color: "#94a3b8", fontSize: 13, margin: "0 0 16px",
              background: "#0f172a", borderRadius: 8, padding: "10px 12px",
              lineHeight: 1.5,
            }}>
              «&nbsp;{son.texte}&nbsp;»
            </p>
            <form onSubmit={valider}>
              <label style={{ color: "#94a3b8", fontSize: 13, display: "block", marginBottom: 4 }}>
                Quel mot est mal dit ?
              </label>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 10 }}>
                {mots.map(m => (
                  <button
                    key={m} type="button"
                    onClick={() => setMot(m)}
                    style={{
                      padding: "4px 10px", borderRadius: 6, border: "1px solid",
                      borderColor: mot === m ? "#3b82f6" : "#334155",
                      background: mot === m ? "#1e3a5f" : "#0f172a",
                      color: mot === m ? "#93c5fd" : "#64748b",
                      cursor: "pointer", fontSize: 13,
                    }}
                  >
                    {m}
                  </button>
                ))}
              </div>
              <input
                value={mot} onChange={e => setMot(e.target.value)}
                placeholder="Ou taper le mot ici…"
                style={{
                  width: "100%", padding: "10px 14px", borderRadius: 8,
                  border: "1px solid #334155", background: "#0f172a",
                  color: "#f1f5f9", fontSize: 14, boxSizing: "border-box",
                  marginBottom: 14, outline: "none",
                }}
              />
              <label style={{ color: "#94a3b8", fontSize: 13, display: "block", marginBottom: 4 }}>
                Comment BIA doit-elle le prononcer ?
              </label>
              <input
                value={dire} onChange={e => setDire(e.target.value)}
                placeholder="ex. waakh  ou  jiguéen"
                style={{
                  width: "100%", padding: "10px 14px", borderRadius: 8,
                  border: "1px solid #334155", background: "#0f172a",
                  color: "#f1f5f9", fontSize: 14, boxSizing: "border-box",
                  marginBottom: 20, outline: "none",
                }}
              />
              <div style={{ display: "flex", gap: 10 }}>
                <button type="button" onClick={onFermer} style={{
                  flex: 1, padding: "10px", borderRadius: 8,
                  background: "transparent", color: "#64748b",
                  border: "1px solid #334155", cursor: "pointer", fontSize: 14,
                }}>
                  Annuler
                </button>
                <button type="submit" disabled={envoi} style={{
                  flex: 2, padding: "10px", borderRadius: 8,
                  background: envoi ? "#334155" : "#dc2626",
                  color: "#fff", border: "none", cursor: envoi ? "default" : "pointer",
                  fontWeight: 700, fontSize: 14,
                }}>
                  {envoi ? "En cours…" : mot && dire ? "Retirer + Corriger" : "Retirer le son"}
                </button>
              </div>
            </form>
          </>
        )}
      </div>
    </div>
  );
}

const inputStyle: React.CSSProperties = {
  flex: 1, minWidth: 140, padding: "10px 14px", borderRadius: 8,
  border: "1px solid #334155", background: "#0f172a",
  color: "#f1f5f9", fontSize: 14, outline: "none",
};

function OngletCorrections({ code }: { code: string }) {
  const [corrections, setCorrections] = useState<Correction[]>([]);
  const [chargement, setChargement] = useState(false);
  const [motNouv, setMotNouv] = useState("");
  const [direNouv, setDireNouv] = useState("");
  const [envoi, setEnvoi] = useState(false);

  const charger = useCallback(async () => {
    setChargement(true);
    const r = await fetch("/api/prononciation", { headers: { "x-bia-code": code } });
    if (r.ok) { const d = await r.json(); setCorrections(d.corrections ?? []); }
    setChargement(false);
  }, [code]);

  useEffect(() => { void charger(); }, [charger]);

  async function ajouter(e: React.FormEvent) {
    e.preventDefault();
    setEnvoi(true);
    await fetch("/api/prononciation", {
      method: "POST",
      headers: { "content-type": "application/json", "x-bia-code": code },
      body: JSON.stringify({ mot: motNouv, dire: direNouv }),
    });
    setMotNouv(""); setDireNouv(""); setEnvoi(false);
    await charger();
  }

  async function supprimer(mot: string) {
    await fetch(`/api/prononciation?mot=${encodeURIComponent(mot)}`, {
      method: "DELETE", headers: { "x-bia-code": code },
    });
    await charger();
  }

  return (
    <div>
      <div style={{
        background: "#1e293b", borderRadius: 12, padding: 20, marginBottom: 20,
        border: "1px solid #334155",
      }}>
        <h3 style={{ color: "#f1f5f9", margin: "0 0 14px", fontSize: 15 }}>
          ➕ Ajouter une correction
        </h3>
        <form onSubmit={ajouter} style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
          <input value={motNouv} onChange={e => setMotNouv(e.target.value)}
            placeholder="Mot à corriger" required style={inputStyle} />
          <span style={{ color: "#475569", alignSelf: "center", fontSize: 18 }}>→</span>
          <input value={direNouv} onChange={e => setDireNouv(e.target.value)}
            placeholder="Comme il faut dire" required style={inputStyle} />
          <button type="submit" disabled={envoi || !motNouv || !direNouv} style={{
            padding: "10px 20px", borderRadius: 8, background: "#3b82f6",
            color: "#fff", border: "none", cursor: "pointer", fontWeight: 600, fontSize: 14,
          }}>
            {envoi ? "…" : "Enregistrer"}
          </button>
        </form>
      </div>
      {chargement ? (
        <p style={{ color: "#475569", textAlign: "center" }}>Chargement…</p>
      ) : corrections.length === 0 ? (
        <p style={{ color: "#475569", textAlign: "center" }}>Aucune correction enregistrée.</p>
      ) : (
        corrections.map(c => (
          <div key={c.mot} style={{
            background: "#1e293b", border: "1px solid #334155",
            borderRadius: 10, padding: "12px 16px", marginBottom: 8,
            display: "flex", alignItems: "center", gap: 12,
          }}>
            <span style={{ color: "#f87171", fontWeight: 700, minWidth: 120 }}>{c.mot}</span>
            <span style={{ color: "#64748b" }}>→</span>
            <span style={{ color: "#4ade80", flex: 1 }}>{c.dire}</span>
            <span style={{ color: "#475569", fontSize: 12 }}>{formatDate(c.created_at)}</span>
            <button onClick={() => supprimer(c.mot)} style={{
              background: "transparent", border: "1px solid #7f1d1d",
              color: "#f87171", borderRadius: 6, padding: "4px 10px",
              cursor: "pointer", fontSize: 12,
            }}>✕</button>
          </div>
        ))
      )}
    </div>
  );
}

export default function PageEcouter() {
  const [code, setCode] = useState<string | null>(null);
  const [onglet, setOnglet] = useState<"sons" | "corrections">("sons");
  const [sons, setSons] = useState<Son[]>([]);
  const [resume, setResume] = useState<Resume | null>(null);
  const [chargement, setChargement] = useState(false);
  const [enCours, setEnCours] = useState<string | null>(null);
  const [supprimes, setSupprimes] = useState<Set<string>>(new Set());
  const [recherche, setRecherche] = useState("");
  const [filtreLangue, setFiltreLangue] = useState<"tous" | "wo" | "fr">("tous");
  const [modalSon, setModalSon] = useState<Son | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    try {
      const s = sessionStorage.getItem("bia-code-ecouter");
      if (s) setCode(s);
    } catch { /**/ }
  }, []);

  const chargerSons = useCallback(async (c: string) => {
    setChargement(true);
    const r = await fetch("/api/voix-gardees?avec-meta=1", { headers: { "x-bia-code": c } });
    if (r.ok) { const d = await r.json(); setSons(d.sons ?? []); setResume(d.resume ?? null); }
    setChargement(false);
  }, []);

  useEffect(() => { if (code) void chargerSons(code); }, [code, chargerSons]);

  if (!code) {
    return <PageCode onCode={c => { setCode(c); void chargerSons(c); }} />;
  }

  async function jouer(son: Son) {
    if (audioRef.current) {
      audioRef.current.pause();
      try { URL.revokeObjectURL(audioRef.current.src); } catch { /**/ }
      audioRef.current.src = "";
    }
    if (enCours === son.chemin) { setEnCours(null); return; }
    const codeCourant = code ?? "";
    if (!codeCourant) return;
    setEnCours(son.chemin);
    try {
      const r = await fetch(`/api/voix-gardees?chemin=${encodeURIComponent(son.chemin)}`, {
        headers: { "x-bia-code": codeCourant },
      });
      if (!r.ok) { setEnCours(null); return; }
      const blob = await r.blob();
      const blobUrl = URL.createObjectURL(blob);
      const audio = new Audio(blobUrl);
      audio.onended = () => { setEnCours(null); URL.revokeObjectURL(blobUrl); };
      audio.onerror = () => { setEnCours(null); URL.revokeObjectURL(blobUrl); };
      audioRef.current = audio;
      audio.play().catch(() => { setEnCours(null); URL.revokeObjectURL(blobUrl); });
    } catch { setEnCours(null); }
  }

  function apresCorrection(texte: string) {
    setSupprimes(prev => {
      const n = new Set(prev);
      sons.forEach(s => { if (s.texte === texte) n.add(s.chemin); });
      return n;
    });
    if (audioRef.current && modalSon && enCours === modalSon.chemin) {
      audioRef.current.pause(); setEnCours(null);
    }
    setModalSon(null);
  }

  const sonsFiltres = sons.filter(s => {
    if (supprimes.has(s.chemin)) return false;
    if (filtreLangue !== "tous" && s.langue !== filtreLangue) return false;
    if (recherche && !(s.texte ?? s.chemin).toLowerCase().includes(recherche.toLowerCase())) return false;
    return true;
  });

  return (
    <div style={{ minHeight: "100vh", background: "#0f172a", fontFamily: "system-ui, sans-serif", color: "#f1f5f9" }}>
      <div style={{
        background: "#1e293b", borderBottom: "1px solid #334155",
        padding: "16px 24px", display: "flex", alignItems: "center", gap: 16, flexWrap: "wrap",
      }}>
        <div style={{ flex: 1 }}>
          <h1 style={{ margin: 0, fontSize: 20, fontWeight: 700 }}>🎧 Voix de BIA</h1>
          {resume && (
            <p style={{ margin: "4px 0 0", color: "#94a3b8", fontSize: 13 }}>
              {resume.total} sons · {resume.octets_mo?.toFixed(1)} Mo /{resume.limite_mo} Mo ·{" "}
              <span style={{ color: "#4ade80" }}>{Math.round((resume.part_gratuite ?? 0) * 100)}% gratuit</span>
            </p>
          )}
        </div>
        <button onClick={() => chargerSons(code)} style={{
          background: "#334155", color: "#94a3b8", border: "none",
          borderRadius: 8, padding: "8px 16px", cursor: "pointer", fontSize: 14,
        }}>↺ Actualiser</button>
        <button onClick={() => {
          try { sessionStorage.removeItem("bia-code-ecouter"); } catch { /**/ }
          setCode(null); setSons([]);
        }} style={{
          background: "transparent", color: "#64748b", border: "1px solid #334155",
          borderRadius: 8, padding: "8px 16px", cursor: "pointer", fontSize: 14,
        }}>Déconnexion</button>
      </div>

      <div style={{ display: "flex", borderBottom: "1px solid #334155", background: "#1e293b" }}>
        {(["sons", "corrections"] as const).map(o => (
          <button key={o} onClick={() => setOnglet(o)} style={{
            padding: "12px 24px", background: "transparent", border: "none",
            borderBottom: onglet === o ? "2px solid #3b82f6" : "2px solid transparent",
            color: onglet === o ? "#93c5fd" : "#64748b",
            cursor: "pointer", fontSize: 14, fontWeight: onglet === o ? 700 : 400,
          }}>
            {o === "sons" ? "🔊 Sons enregistrés" : "🔧 Corrections de prononciation"}
          </button>
        ))}
      </div>

      <div style={{ padding: "20px 24px", maxWidth: 900, margin: "0 auto" }}>
        {onglet === "corrections" ? (
          <OngletCorrections code={code} />
        ) : (
          <>
            <div style={{ display: "flex", gap: 10, marginBottom: 16, flexWrap: "wrap" }}>
              <input
                type="search" placeholder="Chercher un texte…"
                value={recherche} onChange={e => setRecherche(e.target.value)}
                style={{ flex: 1, minWidth: 200, ...inputStyle }}
              />
              {(["tous", "wo", "fr"] as const).map(l => (
                <button key={l} onClick={() => setFiltreLangue(l)} style={{
                  padding: "8px 16px", borderRadius: 8, border: "none", fontSize: 13,
                  cursor: "pointer", fontWeight: filtreLangue === l ? 700 : 400,
                  background: filtreLangue === l ? "#3b82f6" : "#1e293b",
                  color: filtreLangue === l ? "#fff" : "#94a3b8",
                }}>
                  {l === "tous" ? "Tous" : l === "wo" ? "🇸🇳 Wolof" : "🇫🇷 Français"}
                </button>
              ))}
              <span style={{ color: "#64748b", fontSize: 13, alignSelf: "center" }}>
                {chargement ? "Chargement…" : `${sonsFiltres.length} son${sonsFiltres.length > 1 ? "s" : ""}`}
              </span>
            </div>

            {sonsFiltres.length === 0 && !chargement && (
              <div style={{ textAlign: "center", padding: 60, color: "#475569" }}>
                {recherche || filtreLangue !== "tous" ? "Aucun résultat." : "Aucun son enregistré."}
              </div>
            )}

            {sonsFiltres.map(son => {
              const actif = enCours === son.chemin;
              return (
                <div key={son.chemin} style={{
                  background: actif ? "#172554" : "#1e293b",
                  border: `1px solid ${actif ? "#3b82f6" : "#334155"}`,
                  borderRadius: 12, padding: "14px 18px", marginBottom: 8,
                  display: "flex", alignItems: "flex-start", gap: 14,
                  transition: "all .15s",
                }}>
                  <button onClick={() => jouer(son)} style={{
                    width: 44, height: 44, borderRadius: "50%",
                    background: actif ? "#3b82f6" : "#334155",
                    border: "none", color: "#fff", fontSize: 18,
                    cursor: "pointer", flexShrink: 0,
                    display: "flex", alignItems: "center", justifyContent: "center",
                  }}>
                    {actif ? "⏹" : "▶"}
                  </button>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p style={{
                      margin: "0 0 6px", fontSize: 15, lineHeight: 1.5,
                      color: actif ? "#93c5fd" : "#e2e8f0", wordBreak: "break-word",
                    }}>
                      {son.texte ?? son.chemin}
                    </p>
                    <div style={{ display: "flex", gap: 10, flexWrap: "wrap", fontSize: 12, color: "#64748b" }}>
                      <span style={{
                        background: son.langue === "wo" ? "#1a3a2a" : "#1a2a3a",
                        color: son.langue === "wo" ? "#4ade80" : "#60a5fa",
                        padding: "2px 8px", borderRadius: 4, fontWeight: 600,
                      }}>
                        {son.langue === "wo" ? "Wolof" : "Français"}
                      </span>
                      <span style={{ border: "1px solid #334155", padding: "2px 8px", borderRadius: 4 }}>
                        {son.moteur ?? "—"}
                      </span>
                      <span>{formatTaille(son.octets)}</span>
                      <span>{formatDate(son.le)}</span>
                    </div>
                  </div>
                  <button
                    onClick={() => setModalSon(son)}
                    style={{
                      background: "transparent", border: "1px solid #7f1d1d",
                      color: "#f87171", borderRadius: 8,
                      padding: "6px 12px", cursor: "pointer",
                      fontSize: 12, fontWeight: 600, flexShrink: 0, whiteSpace: "nowrap",
                    }}
                  >
                    Mal dit 🔧
                  </button>
                </div>
              );
            })}
          </>
        )}
      </div>

      {modalSon && (
        <ModalCorrection
          son={modalSon}
          code={code}
          onFermer={() => setModalSon(null)}
          onFait={apresCorrection}
        />
      )}
    </div>
  );
}
