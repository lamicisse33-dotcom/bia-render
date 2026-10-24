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
      .then((cles) => Promise.all(cles.filter((k) => k !== CACHE && k !== "bia-piper-model-v1").map((k) => caches.delete(k))))
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
            "<meta charset=utf-8><body style='background:#050507;color:#FFF7DC;font:16px sans-serif;text-align:center;padding:40px'>Amul connexion.",
            { headers: { "content-type": "text/html; charset=utf-8" } },
          ),
      ),
    ),
  );
});

/* ═══════════════════════════════════════════════════════════════════════
   LES RAPPELS DE MÉDICAMENTS — LA SEULE CHOSE QUI SONNE APP FERMÉE

   Lamine, le 24 octobre 2026 : « rappel qui sonne même BIA fermée ».

   C'est la SEULE voie qui marche, et autant l'écrire ici pour qu'on ne la
   re-cherche pas dans trois semaines :
     — un setTimeout dans ce fichier ne survit pas : le navigateur arrête le
       service worker quelques secondes après la dernière page fermée ;
     — « Notification Triggers », qui programmait une notification locale, a
       été retirée de Chrome et n'a jamais existé sur Safari ;
     — la notification PUSH, elle, part du serveur et réveille le téléphone.
       Sur iPhone elle exige que BIA soit INSTALLÉE sur l'écran d'accueil
       (iOS 16.4+) ; sur Android elle marche aussi dans le navigateur.

   CE QUI ARRIVE ICI EST DÉJÀ DÉCHIFFRÉ par le navigateur (RFC 8291) : le
   service de push de Google ou d'Apple a transporté un bloc qu'il ne pouvait
   pas lire. Le contenu ne porte que l'heure et SES mots — jamais un nom de
   médicament qu'on aurait deviné.
   ═══════════════════════════════════════════════════════════════════════ */

self.addEventListener("push", (e) => {
  /* Un push sans données, ou avec des données illisibles, ne doit PAS passer
     en silence : iOS révoque l'autorisation d'une application installée qui
     reçoit un push et n'affiche rien. On affiche donc toujours quelque
     chose, même si c'est maigre. */
  let titre = "BIA", corps = "C'est l'heure de ton médicament.";
  try {
    const d = e.data ? e.data.json() : null;
    if (d && typeof d.titre === "string" && d.titre) titre = d.titre.slice(0, 80);
    if (d && typeof d.corps === "string" && d.corps) corps = d.corps.slice(0, 200);
  } catch { /* données illisibles : on garde le texte par défaut */ }

  e.waitUntil(
    self.registration.showNotification(titre, {
      body: corps,
      icon: "/icone-192.png",
      badge: "/icone-192.png",
      /* `tag` + `renotify` : deux rappels de la même heure ne s'empilent pas,
         mais un rappel du soir ne remplace pas celui du matin en silence. */
      tag: "bia-rappel",
      renotify: true,
      requireInteraction: true,
      vibrate: [200, 100, 200, 100, 200],
      data: { url: "/" },
    }),
  );
});

self.addEventListener("notificationclick", (e) => {
  e.notification.close();
  /* On revient sur BIA déjà ouverte si elle l'est : ouvrir un second onglet
     laisserait deux BIA qui s'écoutent au micro. */
  e.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((fenetres) => {
      for (const f of fenetres) if ("focus" in f) return f.focus();
      return self.clients.openWindow("/");
    }),
  );
});
