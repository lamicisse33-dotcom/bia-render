/* ═══════════════════════════════════════════════════════════════════════
   BIA — le service worker le plus modeste possible
   © 2026 KHALAM (Kha & Lamine).

   IL NE GARDE PAS L'APPLICATION. C'est délibéré, et c'est tout l'intérêt.

   BIA vit sur Render : sa page est fabriquée par le serveur à chaque
   ouverture, donc une mise à jour arrive d'elle-même, sans bannière et sans
   numéro de version à changer à la main. Un service worker qui garderait
   l'application casserait précisément ça — il servirait une vieille BIA sans
   que personne comprenne pourquoi. On a déjà payé cette leçon avec BIBA, dans
   l'autre sens.

   IL NE FAIT DONC QU'UNE CHOSE : quand le téléphone n'a pas de réseau et
   qu'on ouvre BIA, il montre la page de secours au lieu d'un écran blanc.
   Rien d'autre ne passe par lui.

   Demandé par Lamine le 10 septembre 2026 : « écrire, j'ai besoin de
   connexion. Elle peut même le dire, avoir une voix déjà enregistrée. »
   ═══════════════════════════════════════════════════════════════════════ */

const CACHE = "bia-secours-v1";
const SECOURS = "/hors-ligne.html";
/* Ce que la page de secours a besoin d'avoir sous la main. Le son peut ne pas
   exister encore : allSettled, pour qu'un fichier manquant ne fasse pas
   échouer toute l'installation. */
const AVEC = [SECOURS, "/sons/hors-ligne.mp3"];

self.addEventListener("install", (e) => {
  self.skipWaiting();
  e.waitUntil(
    caches.open(CACHE).then((c) => Promise.allSettled(AVEC.map((u) => c.add(u)))),
  );
});

self.addEventListener("activate", (e) => {
  e.waitUntil(
    caches.keys()
      .then((cles) => Promise.all(cles.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  );
});

self.addEventListener("fetch", (e) => {
  const req = e.request;

  /* On ne s'occupe QUE de l'ouverture d'une page. Les images, les sons, les
     appels à l'API : on n'y touche pas — ils vont au réseau comme si ce
     fichier n'existait pas. */
  if (req.mode !== "navigate") return;

  e.respondWith(
    fetch(req).catch(() =>
      caches.match(SECOURS).then(
        (r) =>
          r ||
          new Response(
            "<meta charset=utf-8><body style='background:#050507;color:#FFF7DC;font:16px sans-serif;text-align:center;padding:40px'>Amul jokkoo — pas de connexion.",
            { headers: { "content-type": "text/html; charset=utf-8" } },
          ),
      ),
    ),
  );
});
