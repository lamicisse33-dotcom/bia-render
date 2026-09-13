"use client";

import { useCallback, useRef, useState } from "react";
import { REGLAGES_DU_MICRO } from "@/lib/micro";

/* ── PARLER POUR ÉCRIRE ─────────────────────────────────────────────────────

   Lamine apprend le wolof à BIA en le DISANT, pas en le tapant. « Je parle
   wolof et elle répète avec moi. » Une leçon, c'est dix façons de le dire plus
   quatre ou cinq réponses : quatorze lignes de wolof. Les taper une à une sur
   un téléphone, avec les accents du wolof, prendrait la soirée — et il ne
   ferait jamais la deuxième leçon.

   ── POURQUOI CE MICRO-CI N'EST PAS CELUI DE LA CONVERSATION ─────────────────

   Celui de la conversation écoute le silence pour savoir quand la personne a
   fini — seuils, souffle de fond, part vocale, tout lib/micro.ts. Il le faut :
   dans une conversation, personne n'a envie d'appuyer deux fois.

   Ici, c'est l'inverse. Il DICTE : il sait quand il commence et quand il
   s'arrête, et il veut pouvoir marquer une pause au milieu d'une phrase pour
   chercher son mot. Un micro qui se coupe tout seul au premier silence le
   couperait justement là. On appuie, on parle, on appuie : rien ne décide à sa
   place.

   On garde du micro de la conversation ses RÉGLAGES (annulation d'écho,
   réduction de bruit) — ceux-là valent pour les deux.

   ── CE QUI EST ÉCRIT REVIENT, ET SE CORRIGE ─────────────────────────────────

   Ce que rend l'écoute n'est pas parole d'évangile : le moteur écrit le wolof
   comme il croit l'entendre, et il se trompe encore souvent. Le texte arrive
   donc dans une case ORDINAIRE, qu'il relit et corrige. C'est le point de
   toute la page : ce qu'il corrige ici est ce que BIA saura.               */

export type Dicteur = {
  /** L'étiquette de la case en train d'être dictée, "" si aucune. */
  enregistre: string;
  /** Vrai pendant que le serveur écoute ce qui vient d'être dit. */
  ecrit: boolean;
  /** Commencer, ou arrêter et transcrire. */
  basculer: (quoi: string) => Promise<void>;
  /** Arrêter sans rien transcrire — quand on ferme la page. */
  abandonner: () => void;
  etat: string;
  setEtat: (t: string) => void;
};

/** Le format que ce navigateur sait enregistrer. Safari (Mac et iPhone) ne fait
    que du MP4 ; le nom du fichier doit dire la vérité, sinon le moteur d'écoute
    refuse — leçon du 12 septembre 2026. */
function formatDuNavigateur(): { type: string; nom: string } {
  const candidats: Array<{ type: string; nom: string }> = [
    { type: "audio/webm;codecs=opus", nom: "parole.webm" },
    { type: "audio/webm", nom: "parole.webm" },
    { type: "audio/mp4", nom: "parole.mp4" },
  ];
  for (const c of candidats) {
    try { if (MediaRecorder.isTypeSupported(c.type)) return c; } catch {}
  }
  return { type: "", nom: "parole.webm" };
}

export function useDicter(
  code: string,
  quandCestEcrit: (quoi: string, texte: string) => void,
): Dicteur {
  const [enregistre, setEnregistre] = useState("");
  const [ecrit, setEcrit] = useState(false);
  const [etat, setEtat] = useState("");
  const recRef = useRef<MediaRecorder | null>(null);
  const fluxRef = useRef<MediaStream | null>(null);
  const morceauxRef = useRef<BlobPart[]>([]);
  const pourRef = useRef("");

  const fermerLeFlux = useCallback(() => {
    try { fluxRef.current?.getTracks().forEach((p) => p.stop()); } catch {}
    fluxRef.current = null;
    recRef.current = null;
  }, []);

  const abandonner = useCallback(() => {
    try { if (recRef.current?.state === "recording") recRef.current.stop(); } catch {}
    morceauxRef.current = [];
    pourRef.current = "";
    setEnregistre("");
    fermerLeFlux();
  }, [fermerLeFlux]);

  const basculer = useCallback(async (quoi: string) => {
    if (!code) { setEtat("Il faut ton code, en haut."); return; }

    /* DEUXIÈME APPUI : on arrête, et c'est `onstop` qui transcrit. */
    if (enregistre === quoi && recRef.current?.state === "recording") {
      try { recRef.current.stop(); } catch { abandonner(); }
      return;
    }
    /* On dictait AILLEURS : on jette ce début-là plutôt que de l'écrire dans
       la mauvaise case. */
    if (enregistre) abandonner();

    setEtat("");
    try {
      const flux = await navigator.mediaDevices.getUserMedia(REGLAGES_DU_MICRO);
      fluxRef.current = flux;
      const { type, nom } = formatDuNavigateur();
      const rec = new MediaRecorder(flux, type ? { mimeType: type } : undefined);
      recRef.current = rec;
      morceauxRef.current = [];
      pourRef.current = quoi;

      rec.ondataavailable = (e) => { if (e.data?.size) morceauxRef.current.push(e.data); };
      rec.onstop = async () => {
        const pour = pourRef.current;
        const morceaux = morceauxRef.current;
        morceauxRef.current = [];
        pourRef.current = "";
        setEnregistre("");
        fermerLeFlux();
        if (!morceaux.length) { setEtat("Rien n'a été enregistré."); return; }

        setEcrit(true);
        try {
          const blob = new Blob(morceaux, { type: type || "audio/webm" });
          const formulaire = new FormData();
          formulaire.append("audio", new File([blob], nom, { type: blob.type }));
          /* On ne lui souffle AUCUNE langue : il dicte du wolof, du français,
             ou les deux mêlés comme on parle à Dakar. Imposer « wo » ferait
             écrire du wolof à une phrase française. */
          const r = await fetch("/api/ecouter", {
            method: "POST", headers: { "x-bia-code": code }, body: formulaire,
          });
          const d = await r.json() as { texte?: string; panne?: boolean; motif?: string; erreur?: string };
          if (d.erreur === "code") { setEtat("Ce code n'est pas valable."); return; }
          if (d.panne) { setEtat(`Son oreille n'a pas répondu : ${d.motif || "motif inconnu"}`); return; }
          const texte = String(d.texte || "").trim();
          if (!texte) { setEtat("Elle n'a rien entendu. Réessaie en parlant un peu plus près."); return; }
          quandCestEcrit(pour, texte);
        } catch (e) {
          setEtat(`L'écoute a échoué : ${(e as Error).message}`);
        } finally {
          setEcrit(false);
        }
      };

      rec.start();
      setEnregistre(quoi);
    } catch (e) {
      setEtat(`Le micro n'a pas pu s'ouvrir : ${(e as Error).message}`);
      abandonner();
    }
  }, [code, enregistre, abandonner, fermerLeFlux, quandCestEcrit]);

  return { enregistre, ecrit, basculer, abandonner, etat, setEtat };
}
