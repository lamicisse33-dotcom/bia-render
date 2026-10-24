/* ── ABONNER CE TÉLÉPHONE AUX RAPPELS ─────────────────────────────────────

   Lamine : « rappel qui sonne même BIA fermée ». Il n'y a que la
   notification PUSH pour ça (voir l'en-tête de lib/push-web.ts), et elle
   demande trois choses au téléphone, dans cet ordre :

     1. un service worker enregistré — /sw.js l'est depuis septembre ;
     2. l'autorisation des notifications, qui sur iPhone exige UN GESTE : on
        ne peut pas la demander au chargement de la page. D'où `surGeste` ;
     3. un abonnement, signé par la clé publique du serveur.

   ET SUR IPHONE, UNE QUATRIÈME : BIA DOIT ÊTRE INSTALLÉE sur l'écran
   d'accueil. Dans Safari ordinaire, `PushManager` n'existe même pas. On le
   détecte et on le DIT, au lieu d'abonner dans le vide — c'est sa demande :
   « si le rappel ne peut pas sonner, BIA doit le dire clairement ».

   RIEN N'EST DEMANDÉ TANT QU'ELLE N'A PAS DE RAPPEL. Faire surgir une
   demande d'autorisation à quelqu'un qui vient juste parler à BIA, c'est le
   meilleur moyen de se faire refuser pour toujours : un refus sur iOS ne se
   redemande pas. `abonnerSiDejaAccorde` ne fait donc que RÉTABLIR un
   abonnement déjà accordé. */

export type Etat =
  | { ok: true; telephones: number }
  | { ok: false; pourquoi: string; demandable: boolean };

const possible = () =>
  typeof navigator !== "undefined" && "serviceWorker" in navigator &&
  typeof window !== "undefined" && "PushManager" in window && "Notification" in window;

function manque(): string {
  if (typeof window === "undefined") return "pas de navigateur";
  if (!("Notification" in window)) return "Ce navigateur ne sait pas afficher de notification.";
  if (!("serviceWorker" in navigator)) return "Ce navigateur n'a pas de service worker.";
  if (!("PushManager" in window))
    return "Sur iPhone, les notifications marchent seulement si Bia est installée sur l'écran d'accueil : " +
      "ouvre le menu Partager, puis « Sur l'écran d'accueil ».";
  return "";
}

const brut = (b64: string) => {
  const propre = b64.replace(/-/g, "+").replace(/_/g, "/");
  const bourre = propre + "=".repeat((4 - (propre.length % 4)) % 4);
  const s = atob(bourre), out = new Uint8Array(s.length);
  for (let i = 0; i < s.length; i++) out[i] = s.charCodeAt(i);
  return out;
};

async function poser(entetes: Record<string, string>): Promise<Etat> {
  const r = await fetch("/api/rappels/abonnement", { headers: entetes, cache: "no-store" });
  const d = await r.json() as { cle_publique?: string; possible?: boolean; pourquoi_pas?: string };
  if (!d.possible || !d.cle_publique)
    return { ok: false, pourquoi: d.pourquoi_pas || "Le serveur ne peut pas signer de notification.", demandable: false };

  const enregistrement = await navigator.serviceWorker.ready;
  const existant = await enregistrement.pushManager.getSubscription();
  /* Un abonnement signé par une ANCIENNE clé ne recevra plus rien : le
     serveur signe avec la nouvelle et le service de push refuse. On le
     remplace au lieu de le garder et de croire qu'il marche. */
  const abonnement = existant ?? await enregistrement.pushManager.subscribe({
    userVisibleOnly: true,
    applicationServerKey: brut(d.cle_publique),
  });
  const json = abonnement.toJSON() as { endpoint?: string; keys?: { p256dh?: string; auth?: string } };

  const envoi = await fetch("/api/rappels/abonnement", {
    method: "POST",
    headers: { ...entetes, "content-type": "application/json" },
    body: JSON.stringify({ endpoint: json.endpoint, cles: { p256dh: json.keys?.p256dh, auth: json.keys?.auth } }),
  });
  const v = await envoi.json() as { abonne?: boolean; telephones?: number; erreur?: string };
  return v.abonne
    ? { ok: true, telephones: Number(v.telephones) || 1 }
    : { ok: false, pourquoi: v.erreur || "Le serveur n'a pas gardé l'abonnement.", demandable: false };
}

/** Rétablir un abonnement DÉJÀ accordé. Ne demande jamais rien. */
export async function abonnerSiDejaAccorde(entetes: Record<string, string>): Promise<Etat> {
  const absent = manque();
  if (absent) return { ok: false, pourquoi: absent, demandable: false };
  if (!possible()) return { ok: false, pourquoi: "Notifications indisponibles ici.", demandable: false };
  if (Notification.permission !== "granted")
    return {
      ok: false, demandable: Notification.permission === "default",
      pourquoi: Notification.permission === "denied"
        ? "Les notifications ont été refusées pour Bia. Il faut les réautoriser dans les réglages du téléphone."
        : "Les notifications ne sont pas encore autorisées.",
    };
  try { return await poser(entetes); }
  catch (e) { return { ok: false, pourquoi: e instanceof Error ? e.message : "abonnement impossible", demandable: false }; }
}

/** Demander l'autorisation et abonner. À appeler SUR UN GESTE, jamais avant. */
export async function abonnerSurGeste(entetes: Record<string, string>): Promise<Etat> {
  const absent = manque();
  if (absent) return { ok: false, pourquoi: absent, demandable: false };
  try {
    const accord = Notification.permission === "granted" ? "granted" : await Notification.requestPermission();
    if (accord !== "granted")
      return {
        ok: false, demandable: false,
        pourquoi: "Les notifications n'ont pas été autorisées : le rappel sera gardé, mais il ne sonnera pas.",
      };
    return await poser(entetes);
  } catch (e) {
    return { ok: false, pourquoi: e instanceof Error ? e.message : "abonnement impossible", demandable: false };
  }
}
