/* ── FAIRE SONNER LE TÉLÉPHONE QUAND BIA EST FERMÉE ────────────────────────

   Lamine, le 24 octobre 2026 : « rappel qui sonne même BIA fermée ».

   IL N'Y A QU'UN SEUL MOYEN QUI MARCHE VRAIMENT, et autant le dire tout de
   suite pour qu'on ne le re-cherche pas dans trois semaines :

     — un setTimeout dans le service worker NE SURVIT PAS : le navigateur
       arrête le worker quelques secondes après la dernière page fermée ;
     — l'API « Notification Triggers », qui programmait une notification
       locale, a été retirée de Chrome et n'a jamais existé sur Safari ;
     — la notification PUSH, elle, part d'un serveur et réveille le
       téléphone. Sur iPhone elle exige que BIA soit INSTALLÉE sur l'écran
       d'accueil (iOS 16.4+), sur Android elle marche aussi dans le
       navigateur.

   ── LA CLÉ VAPID N'EST PAS UNE NOUVELLE VARIABLE RENDER ───────────────────

   Une paire de clés VAPID, c'est une clé P-256 stable. Plutôt que de
   demander deux variables d'environnement de plus — que je ne peux pas poser
   moi-même, donc qui laisseraient la fonction morte jusqu'à ce que quelqu'un
   s'en occupe — on la DÉRIVE de BIA_SECRET, qui est déjà là.

   Même secret, même paire, à chaque démarrage et sur chaque instance. Et si
   BIA_SECRET change un jour, les abonnements existants cessent d'être
   acceptés : le téléphone se réabonne à la prochaine ouverture, parce que la
   page compare toujours la clé publique servie à celle de son abonnement.

   ── CE QUI EST CHIFFRÉ, ET PAR QUI ────────────────────────────────────────

   Le contenu part chiffré de bout en bout (RFC 8291, aes128gcm) : le service
   de push de Google ou d'Apple transporte un bloc qu'il ne peut pas lire.
   « C'est l'heure de ton médicament » ne passe donc en clair chez personne.
   On n'y met de toute façon que l'heure et SES mots — jamais une ordonnance,
   jamais un nom de médicament qu'on aurait deviné. */

import { createHash, createHmac, createPrivateKey, createPublicKey, diffieHellman, generateKeyPairSync, randomBytes, createCipheriv, sign, type KeyObject } from "node:crypto";

const b64url = (b: Buffer) => b.toString("base64url");
const deB64url = (s: string) => Buffer.from(String(s || ""), "base64url");

/* HKDF-SHA256, écrit à la main : node:crypto en a bien un, mais il refuse une
   longueur de sel nulle sur certaines versions, et le push en a besoin. */
function hkdf(sel: Buffer, ikm: Buffer, info: Buffer, longueur: number): Buffer {
  const prk = createHmac("sha256", sel).update(ikm).digest();
  const sortie = createHmac("sha256", prk).update(Buffer.concat([info, Buffer.from([1])])).digest();
  return sortie.subarray(0, longueur);
}

/* Une clé privée P-256 au format SEC1, sans le point public : OpenSSL le
   recalcule à partir du scalaire. C'est ce qui permet de dériver une paire
   entière d'un secret, sans stocker quoi que ce soit. */
function cleDepuisScalaire(scalaire: Buffer): KeyObject {
  const oid = Buffer.from("06082a8648ce3d030107", "hex");           // prime256v1
  const params = Buffer.concat([Buffer.from([0xa0, oid.length]), oid]);
  const priv = Buffer.concat([Buffer.from([0x04, 0x20]), scalaire]);
  const corps = Buffer.concat([Buffer.from([0x02, 0x01, 0x01]), priv, params]);
  const der = Buffer.concat([Buffer.from([0x30, corps.length]), corps]);
  return createPrivateKey({ key: der, format: "der", type: "sec1" });
}

const pointBrut = (k: KeyObject): Buffer => {
  const jwk = k.export({ format: "jwk" }) as { x: string; y: string };
  return Buffer.concat([Buffer.from([4]), deB64url(jwk.x), deB64url(jwk.y)]);
};
const depuisPoint = (point: Buffer): KeyObject =>
  createPublicKey({
    key: { kty: "EC", crv: "P-256", x: b64url(point.subarray(1, 33)), y: b64url(point.subarray(33, 65)) },
    format: "jwk",
  });

let cache: { privee: KeyObject; publique: string } | null = null;
/** La paire VAPID, dérivée de BIA_SECRET. `null` si le secret manque. */
export function clesVapid(): { privee: KeyObject; publique: string } | null {
  if (cache) return cache;
  const secret = String(process.env.BIA_SECRET || "").trim();
  if (secret.length < 8) return null;
  /* Un scalaire P-256 doit être dans [1, n-1]. Un condensat SHA-256 a une
     chance sur 2^128 environ de tomber hors de l'intervalle : OpenSSL
     refuserait la clé, et on le verrait tout de suite au démarrage, pas une
     fois sur dix. Le domaine « vapid » évite qu'une autre dérivation future
     du même secret donne la même clé. */
  const scalaire = createHash("sha256").update("bia-vapid-v1:" + secret).digest();
  const privee = cleDepuisScalaire(scalaire);
  cache = { privee, publique: b64url(pointBrut(createPublicKey(privee))) };
  return cache;
}

/** Ce que le navigateur doit recevoir pour s'abonner. */
export const clePubliquePush = () => clesVapid()?.publique || "";

/* ── L'EN-TÊTE VAPID ────────────────────────────────────────────────────── */
function jetonVapid(audience: string, privee: KeyObject): string {
  const entete = b64url(Buffer.from(JSON.stringify({ typ: "JWT", alg: "ES256" })));
  const corps = b64url(Buffer.from(JSON.stringify({
    aud: audience,
    exp: Math.floor(Date.now() / 1000) + 11 * 3600,
    sub: "https://app.khalam.app",
  })));
  const aSigner = Buffer.from(`${entete}.${corps}`);
  const signature = sign("sha256", aSigner, { key: privee, dsaEncoding: "ieee-p1363" });
  return `${entete}.${corps}.${b64url(signature)}`;
}

/* ── LE CHIFFREMENT DU CONTENU (RFC 8291, aes128gcm) ───────────────────── */
export function chiffrerPourPush(message: Buffer, p256dh: string, auth: string): Buffer {
  const abonne = depuisPoint(deB64url(p256dh));
  const ephemere = generateKeyPairSync("ec", { namedCurve: "prime256v1" });
  const pointEphemere = pointBrut(ephemere.publicKey);
  const pointAbonne = deB64url(p256dh);
  const partage = diffieHellman({ privateKey: ephemere.privateKey, publicKey: abonne });

  const prk = hkdf(deB64url(auth), partage,
    Buffer.concat([Buffer.from("WebPush: info\0"), pointAbonne, pointEphemere]), 32);
  const sel = randomBytes(16);
  const cle = hkdf(sel, prk, Buffer.from("Content-Encoding: aes128gcm\0"), 16);
  const nonce = hkdf(sel, prk, Buffer.from("Content-Encoding: nonce\0"), 12);

  const chiffreur = createCipheriv("aes-128-gcm", cle, nonce);
  /* 0x02 = dernier enregistrement. Un seul enregistrement : nos messages
     tiennent en deux lignes, et découper n'apporterait rien. */
  const corps = Buffer.concat([chiffreur.update(Buffer.concat([message, Buffer.from([2])])), chiffreur.final(), chiffreur.getAuthTag()]);

  const tailleEnreg = Buffer.alloc(4);
  tailleEnreg.writeUInt32BE(4096, 0);
  return Buffer.concat([sel, tailleEnreg, Buffer.from([pointEphemere.length]), pointEphemere, corps]);
}

export type Envoi = { ok: boolean; statut: number; disparu: boolean; motif?: string };

/** Envoyer une notification. `disparu` = l'abonnement est mort, à retirer. */
export async function envoyerPush(
  abonnement: { endpoint: string; cles: { p256dh: string; auth: string } },
  charge: unknown,
  ttlSecondes = 3600,
): Promise<Envoi> {
  const cles = clesVapid();
  if (!cles) return { ok: false, statut: 0, disparu: false, motif: "BIA_SECRET manquant : aucune clé VAPID" };
  let audience: string;
  try { audience = new URL(abonnement.endpoint).origin; }
  catch { return { ok: false, statut: 0, disparu: true, motif: "adresse de push illisible" }; }
  try {
    const corps = chiffrerPourPush(Buffer.from(JSON.stringify(charge)), abonnement.cles.p256dh, abonnement.cles.auth);
    const r = await fetch(abonnement.endpoint, {
      method: "POST",
      headers: {
        TTL: String(ttlSecondes),
        "Content-Encoding": "aes128gcm",
        "Content-Type": "application/octet-stream",
        Urgency: "high",
        Authorization: `vapid t=${jetonVapid(audience, cles.privee)}, k=${cles.publique}`,
      },
      body: corps,
      signal: AbortSignal.timeout(8000),
    });
    /* 404 et 410 : le téléphone a désinstallé BIA ou vidé ses données. Ce
       n'est pas une panne, c'est un abonnement à oublier — et le garder
       ferait croire à un rappel envoyé alors que plus rien ne le reçoit. */
    const disparu = r.status === 404 || r.status === 410;
    return { ok: r.ok, statut: r.status, disparu, motif: r.ok ? undefined : await r.text().catch(() => "") };
  } catch (e) {
    return { ok: false, statut: 0, disparu: false, motif: e instanceof Error ? e.message : "envoi impossible" };
  }
}
