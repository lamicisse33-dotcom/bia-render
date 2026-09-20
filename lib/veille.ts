/* ── L'ÉCRAN QUI RESTE ÉVEILLÉ, ET LA PREUVE QU'IL LE RESTE ─────────────────

   Lamine, le 14 septembre 2026, puis à nouveau le 20 : « l'écran du téléphone
   doit rester éveillé durant le temps que BIA est affichée. »

   Le verrou d'écran existait depuis le 14 (navigator.wakeLock). Le 20, il
   redemande la même chose : donc chez lui, ça ne tient pas. Et on ne le
   savait pas, parce que RIEN ne le comptait — un réglage qu'on ne compte
   pas est un réglage qu'on croit.

   Ce fichier fait deux choses :

   1. Il COMPTE ce qui arrive au verrou (tenu, refusé et pourquoi, relâché
      par le téléphone, API absente) et l'envoie à /api/mesure. Ça se lit
      sur /api/etat, `veille`.

   2. Il tient un SECOURS pour les cas où l'API manque ou refuse : une vidéo
      minuscule (16 × 16, noire, avec une piste audio silencieuse — sans
      piste audio, iOS l'ignore), jouée en boucle, invisible. C'est le
      procédé de NoSleep.js, celui des applications d'avant iOS 16.4. Elle
      ne part que sur un geste de la personne (iOS l'exige) — le premier
      toucher sur BIA suffit.

   Ce que le secours coûte, et qu'il faut savoir : une piste audio qui joue,
   même silencieuse, peut changer la façon dont iOS route le son (le micro,
   la voix). C'est pour ça qu'il ne part QUE si le verrou officiel manque ou
   refuse — jamais en plus de lui. Si un jour /api/etat montre le secours
   actif ET des coupures de micro, c'est lui qu'il faudra regarder. */

/* Deux secondes de noir et de silence, 2,5 ko, fabriquées avec ffmpeg
   (16 × 16, h264 baseline, aac 8 kbit/s). */
export const VIDEO_DE_VEILLE = "data:video/mp4;base64,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";

export type EvenementDeVeille =
  | "api_absente" | "tenu" | "refuse" | "relache" | "secours_lance" | "secours_refuse";

export function noterVeille(quoi: EvenementDeVeille, detail = "") {
  try {
    const corps = JSON.stringify({ type: "veille", quoi, detail: detail.slice(0, 80) });
    if (navigator.sendBeacon) navigator.sendBeacon("/api/mesure", new Blob([corps], { type: "application/json" }));
    else void fetch("/api/mesure", { method: "POST", headers: { "content-type": "application/json" }, body: corps, keepalive: true });
  } catch { /* la mesure ne doit jamais gêner */ }
}

/** Le secours : une vidéo invisible en boucle. Rend une fonction d'arrêt. */
export function lancerLeSecours(): () => void {
  const v = document.createElement("video");
  v.setAttribute("playsinline", "");
  v.setAttribute("webkit-playsinline", "");
  v.loop = true;
  v.preload = "auto";
  v.style.cssText = "position:fixed;width:1px;height:1px;opacity:0;pointer-events:none;left:-10px;top:-10px";
  v.src = VIDEO_DE_VEILLE;
  document.body.appendChild(v);
  v.play().then(() => noterVeille("secours_lance")).catch((e) => noterVeille("secours_refuse", String(e?.name || e)));
  return () => { try { v.pause(); v.removeAttribute("src"); v.load(); v.remove(); } catch { } };
}
