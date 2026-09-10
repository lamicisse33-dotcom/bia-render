"use client";

import { useCallback, useEffect, useState } from "react";

/* ── S'INSTALLER SUR LE TÉLÉPHONE ───────────────────────────────────────────

   Demandé par Lamine le 10 septembre 2026 : « vu qu'on ne vise ni l'App Store
   ni Google Play, on expose nos produits sur notre propre site — comment on
   les transforme en véritables applications installables ? »

   La réponse tenait presque entière : BIA a déjà son manifeste, ses icônes,
   son service worker. Il manquait la seule chose qui compte vraiment — QUE
   LES GENS SACHENT QU'ELLE S'INSTALLE. Sans ça, il faut aller chercher
   « Ajouter à l'écran d'accueil » dans un menu du navigateur, et presque
   personne ne le fait.

   DEUX MONDES, DEUX GESTES, ET C'EST LÀ TOUTE LA DIFFICULTÉ.

   Android prévient le site qu'il peut installer. On retient sa proposition —
   sans elle, on ne peut rien déclencher — et on la ressort sur un vrai
   bouton, au moment choisi par nous.

   L'iPhone ne prévient JAMAIS. Apple ne donne pas ce signal aux sites, et
   aucun code n'y changera rien : il n'existe aucun moyen de déclencher
   l'installation depuis une page web sur iOS. La seule chose possible est
   d'ÉCRIRE LE GESTE en toutes lettres — Partager, puis « Sur l'écran
   d'accueil ». Sans cette phrase, un utilisateur d'iPhone n'installera
   jamais BIA, et ce n'est pas sa faute.

   ON NE S'IMPOSE PAS. Rien ne s'affiche si BIA est déjà posée sur l'écran
   d'accueil, ni si la personne a répondu non une fois, ni pendant les
   premières secondes — le temps qu'elle voie de quoi il s'agit. On propose
   d'installer quelque chose qu'on a eu le temps de regarder. */

type Invitation = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: string }>;
};

const ECARTEE = "bia.poser";

function dejaPosee(): boolean {
  try {
    if (window.matchMedia("(display-mode: standalone)").matches) return true;
  } catch { /* vieux navigateur : on continue */ }
  return (navigator as Navigator & { standalone?: boolean }).standalone === true;
}

function surIphone(): boolean {
  return /iphone|ipad|ipod/i.test(navigator.userAgent)
    // Un iPad récent se fait passer pour un Mac ; l'écran tactile le trahit.
    || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
}

export default function Installer() {
  const [invitation, setInvitation] = useState<Invitation | null>(null);
  const [visible, setVisible] = useState(false);
  const [iphone, setIphone] = useState(false);

  const montrer = useCallback(() => {
    if (dejaPosee()) return;
    try { if (localStorage.getItem(ECARTEE) === "non") return; } catch {}
    setVisible(true);
  }, []);

  useEffect(() => {
    const proposition = (e: Event) => {
      // Sans ce refus, Chrome affiche sa propre bannière et on perd la main
      // sur le moment où la question est posée.
      e.preventDefault();
      setInvitation(e as Invitation);
      montrer();
    };
    const posee = () => setVisible(false);
    window.addEventListener("beforeinstallprompt", proposition);
    window.addEventListener("appinstalled", posee);

    /* L'iPhone ne dira rien : on attend qu'elle soit à l'écran, puis on écrit
       le geste. Le délai évite de parler par-dessus son arrivée. */
    let minuteur: ReturnType<typeof setTimeout> | null = null;
    if (surIphone()) {
      setIphone(true);
      minuteur = setTimeout(montrer, 6000);
    }
    return () => {
      window.removeEventListener("beforeinstallprompt", proposition);
      window.removeEventListener("appinstalled", posee);
      if (minuteur) clearTimeout(minuteur);
    };
  }, [montrer]);

  if (!visible) return null;

  return (
    <div className="poser" role="note">
      <span>
        {iphone && !invitation
          ? <>Pour garder BIA sur ton téléphone : appuie sur <strong>Partager</strong>, puis <strong>« Sur l&apos;écran d&apos;accueil »</strong>.</>
          : <>Installe BIA sur ton téléphone. Elle s&apos;ouvrira comme une application, sans passer par le navigateur.</>}
      </span>
      {/* Pas de bouton sur iPhone : il n'y a rien à déclencher, et un bouton
          qui ne fait rien est pire que pas de bouton du tout. */}
      {invitation ? (
        <button type="button" onClick={async () => {
          setVisible(false);
          try { await invitation.prompt(); await invitation.userChoice; } catch {}
          setInvitation(null);
        }}>Installer</button>
      ) : null}
      <button type="button" className="non" onClick={() => {
        setVisible(false);
        try { localStorage.setItem(ECARTEE, "non"); } catch {}
      }}>Non</button>
    </div>
  );
}
