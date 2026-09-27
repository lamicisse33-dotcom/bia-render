"use client";

/* ── ONBOARDING VOIX ────────────────────────────────────────────────────────

   Au premier lancement (ou quand aucune belle voix française n'est trouvée),
   BIA guide l'utilisateur pour télécharger la meilleure voix disponible sur
   son appareil — une seule fois, gratuit, et la voix reste pour toujours.

   Logique :
   - iOS → Aurélie (Améliorée) dans Réglages > Accessibilité
   - Android → Google Text-to-Speech dans Paramètres > Gestion générale
   - Autres → message générique avec lien vers les paramètres

   Une fois téléchargée, l'utilisateur appuie sur « J'ai téléchargé la voix »
   et BIA vérifie — si une belle voix est maintenant présente, elle laisse
   entrer et note dans localStorage que l'onboarding est fait. Si pas encore,
   elle ré-affiche le guide.

   localStorage : clé "bia-voix-ok" = "1" quand c'est réglé. */

import { useCallback, useEffect, useState } from "react";

const CLE_VOIX_OK = "bia-voix-ok";

/* ── DÉTECTION DE L'APPAREIL ────────────────────────────────────────────── */
function detecterAppareil(): "ios" | "android" | "autre" {
  if (typeof navigator === "undefined") return "autre";
  const ua = navigator.userAgent;
  if (/iPad|iPhone|iPod/.test(ua)) return "ios";
  if (/Android/.test(ua)) return "android";
  return "autre";
}

/* ── LA MÊME FONCTION QUE DANS page.tsx ────────────────────────────────── */
function choisirVoixFrancaiseFeminine(voices: SpeechSynthesisVoice[]): SpeechSynthesisVoice | undefined {
  const feminines = /aur(?:e|é)lie|audrey|am[ée]lie|marie|virginie|julie|alice|c[ée]line|l[ée]a|hortense|roxane|charlotte|sophie/i;
  const masculines = /thomas|nicolas|daniel|henri|jacques|paul|gilles|bernard|alain|antoine|mathieu|r[ée]mi|yann/i;
  return voices
    .filter((v) => v.lang.toLowerCase().startsWith("fr"))
    .filter((v) => !masculines.test(`${v.name} ${v.voiceURI}`))
    .map((v) => {
      const id = `${v.name} ${v.voiceURI}`;
      let score = 0;
      if (feminines.test(id)) score += 100;
      if (v.localService) score += 60;
      if (/premium/i.test(id)) score += 40;
      if (/enhanced|am[ée]lior[ée]e?/i.test(id)) score += 30;
      if (/^fr[-_]fr/i.test(v.lang)) score += 20;
      else if (/^fr[-_](sn|ca|be|ch)/i.test(v.lang)) score += 10;
      if (v.default) score += 1;
      return { voix: v, score };
    })
    .sort((a, b) => b.score - a.score)[0]?.voix;
}

function belleVoixDisponible(): Promise<boolean> {
  return new Promise((ok) => {
    if (!("speechSynthesis" in window)) { ok(false); return; }
    const verifier = (voices: SpeechSynthesisVoice[]) => ok(Boolean(choisirVoixFrancaiseFeminine(voices)));
    const maintenant = window.speechSynthesis.getVoices();
    if (maintenant.length > 0) { verifier(maintenant); return; }
    let fait = false;
    window.speechSynthesis.addEventListener("voiceschanged", () => {
      if (fait) return; fait = true;
      verifier(window.speechSynthesis.getVoices());
    }, { once: true });
    setTimeout(() => { if (!fait) { fait = true; verifier(window.speechSynthesis.getVoices()); } }, 1500);
  });
}

/* ── CE QUE L'ONBOARDING DOIT MONTRER SELON L'APPAREIL ─────────────────── */
type InfosAppareil = {
  titre: string;
  voixCible: string;
  etapes: string[];
  conseil: string;
};

function infosParAppareil(appareil: "ios" | "android" | "autre"): InfosAppareil {
  if (appareil === "ios") {
    return {
      titre: "iPhone ou iPad",
      voixCible: "Aurélie (Améliorée)",
      etapes: [
        "Ouvre les Réglages de ton iPhone",
        "Va dans Accessibilité",
        "Appuie sur Contenu énoncé",
        "Appuie sur Voix",
        "Choisis Français",
        "Appuie sur Aurélie, puis sur Télécharger à côté de « Améliorée »",
        "Attends la fin du téléchargement (quelques secondes selon ta connexion)",
      ],
      conseil: "Si tu ne vois pas « Améliorée », télécharge d'abord la voix de base Aurélie — BIA l'utilisera quand même.",
    };
  }
  if (appareil === "android") {
    return {
      titre: "Android",
      voixCible: "Google Text-to-Speech",
      etapes: [
        "Ouvre les Paramètres de ton téléphone",
        "Va dans Gestion générale (ou Système selon ton téléphone)",
        "Appuie sur Langue et saisie",
        "Appuie sur Synthèse vocale ou Sortie de synthèse vocale",
        "Vérifie que le moteur actif est Google Text-to-Speech",
        "Appuie sur l'engrenage à côté, puis sur Paramètres de langue",
        "Choisis Français (France) et télécharge les données vocales",
      ],
      conseil: "Sur certains téléphones, Google TTS est déjà installé. Si BIA parle bien en français après avoir appuyé sur le bouton ci-dessous, c'est bon.",
    };
  }
  return {
    titre: "Ton appareil",
    voixCible: "une voix française",
    etapes: [
      "Va dans les paramètres de ton appareil",
      "Cherche « Synthèse vocale » ou « Voix »",
      "Télécharge une voix française de qualité (Premium ou Améliorée si disponible)",
    ],
    conseil: "Sur la plupart des appareils, une voix française est déjà disponible. Si BIA parle bien en français, c'est bon.",
  };
}

/* ── LE HOOK PRINCIPAL ─────────────────────────────────────────────────── */
export function useOnboardingVoix() {
  const [besoin, setBesoin] = useState(false);
  const [verifie, setVerifie] = useState(false);

  useEffect(() => {
    try {
      if (localStorage.getItem(CLE_VOIX_OK) === "1") { setVerifie(true); return; }
    } catch { /* pas de localStorage */ }
    belleVoixDisponible().then((ok) => {
      if (ok) {
        try { localStorage.setItem(CLE_VOIX_OK, "1"); } catch {}
        setVerifie(true);
      } else {
        setBesoin(true);
        setVerifie(true);
      }
    });
  }, []);

  const valider = useCallback(async () => {
    const ok = await belleVoixDisponible();
    if (ok) {
      try { localStorage.setItem(CLE_VOIX_OK, "1"); } catch {}
      setBesoin(false);
    }
    return ok;
  }, []);

  const passer = useCallback(() => {
    // Permet de passer sans la voix améliorée (BIA fonctionnera quand même)
    try { localStorage.setItem(CLE_VOIX_OK, "1"); } catch {}
    setBesoin(false);
  }, []);

  return { besoin, verifie, valider, passer };
}

/* ── LE COMPOSANT VISUEL ─────────────────────────────────────────────────── */
type Props = {
  onTermine: () => void;
};

export default function OnboardingVoix({ onTermine }: Props) {
  const appareil = detecterAppareil();
  const infos = infosParAppareil(appareil);
  const [verification, setVerification] = useState<"attente" | "ok" | "pas-encore">("attente");

  const verifier = useCallback(async () => {
    setVerification("attente");
    const ok = await belleVoixDisponible();
    if (ok) {
      try { localStorage.setItem(CLE_VOIX_OK, "1"); } catch {}
      setVerification("ok");
      setTimeout(onTermine, 900);
    } else {
      setVerification("pas-encore");
    }
  }, [onTermine]);

  const passer = useCallback(() => {
    try { localStorage.setItem(CLE_VOIX_OK, "1"); } catch {}
    onTermine();
  }, [onTermine]);

  return (
    <div style={{
      position: "fixed", inset: 0, zIndex: 9999,
      background: "#050507",
      display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
      padding: "24px 20px",
      fontFamily: "system-ui, -apple-system, sans-serif",
      color: "#e8e8f0",
      overflowY: "auto",
    }}>
      {/* Icône */}
      <div style={{ fontSize: 52, marginBottom: 16 }}>🎙️</div>

      {/* Titre */}
      <h1 style={{ fontSize: 22, fontWeight: 700, textAlign: "center", marginBottom: 8, color: "#fff" }}>
        Pour entendre BIA avec sa vraie voix
      </h1>
      <p style={{ fontSize: 14, color: "#9090b0", textAlign: "center", marginBottom: 28, maxWidth: 340, lineHeight: 1.5 }}>
        BIA parle avec une voix française naturelle intégrée à ton {infos.titre}.
        Il suffit de la télécharger une seule fois — c'est gratuit.
      </p>

      {/* Voix cible */}
      <div style={{
        background: "#1a1a2e", borderRadius: 12, padding: "14px 20px",
        marginBottom: 24, width: "100%", maxWidth: 380,
        border: "1px solid #2a2a4a",
      }}>
        <div style={{ fontSize: 12, color: "#7070a0", marginBottom: 4 }}>Voix à télécharger</div>
        <div style={{ fontSize: 16, fontWeight: 600, color: "#c0a0ff" }}>{infos.voixCible}</div>
      </div>

      {/* Étapes */}
      <div style={{ width: "100%", maxWidth: 380, marginBottom: 24 }}>
        {infos.etapes.map((e, i) => (
          <div key={i} style={{
            display: "flex", gap: 12, marginBottom: 12, alignItems: "flex-start",
          }}>
            <div style={{
              minWidth: 26, height: 26, borderRadius: "50%",
              background: "#2a1a4a", color: "#c0a0ff",
              display: "flex", alignItems: "center", justifyContent: "center",
              fontSize: 12, fontWeight: 700, flexShrink: 0,
            }}>{i + 1}</div>
            <div style={{ fontSize: 14, lineHeight: 1.5, paddingTop: 4 }}>{e}</div>
          </div>
        ))}
      </div>

      {/* Conseil */}
      <div style={{
        background: "#0e1a0e", border: "1px solid #2a4a2a", borderRadius: 10,
        padding: "12px 16px", marginBottom: 28, width: "100%", maxWidth: 380,
      }}>
        <div style={{ fontSize: 12, color: "#70a070", marginBottom: 3 }}>💡 Conseil</div>
        <div style={{ fontSize: 13, color: "#90c090", lineHeight: 1.5 }}>{infos.conseil}</div>
      </div>

      {/* Bouton principal */}
      <button
        onClick={verifier}
        disabled={verification === "attente" && false}
        style={{
          width: "100%", maxWidth: 380, padding: "16px",
          background: verification === "ok" ? "#1a4a1a" : "#3a1a6a",
          color: verification === "ok" ? "#80e080" : "#fff",
          border: "none", borderRadius: 14,
          fontSize: 16, fontWeight: 600, cursor: "pointer",
          marginBottom: 12, transition: "background 0.3s",
        }}
      >
        {verification === "ok"
          ? "✓ Voix détectée — BIA s'ouvre !"
          : verification === "pas-encore"
          ? "Pas encore détectée — réessayer"
          : "J'ai téléchargé la voix"}
      </button>

      {verification === "pas-encore" && (
        <p style={{ fontSize: 13, color: "#e07070", textAlign: "center", marginBottom: 12, maxWidth: 340 }}>
          BIA ne trouve pas encore la voix. Vérifie que le téléchargement est terminé, puis réessaie.
        </p>
      )}

      {/* Passer */}
      <button
        onClick={passer}
        style={{
          background: "none", border: "none", color: "#5050a0",
          fontSize: 13, cursor: "pointer", padding: "8px",
          textDecoration: "underline",
        }}
      >
        Continuer sans la voix améliorée
      </button>
    </div>
  );
}
