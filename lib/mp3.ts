/* ── DIX FOIS MOINS À TÉLÉCHARGER, POUR LA MÊME VOIX ────────────────────────

   Lamine, le 12 septembre 2026 : « même pour les messages préenregistrés
   c'est un peu long », puis « vas-y, il faut le convertir en MP3 ».

   MESURÉ SUR LE SEAU, LE MÊME JOUR : les 270 fichiers de sa voix sont en WAV
   PCM, 24 000 Hz, 16 bits, un seul canal. C'est-à-dire 48 kilo-octets par
   seconde de parole, sans un octet de compression :

       « Salaam »        2,84 s → 136 364 octets
       « Tourne à droite » 1,44 s →  69 164 octets
       « Kan nga ? »           →  330 284 octets

   Sur le wifi du Mac, ça se voit à peine. Sur un téléphone en 4G à Dakar,
   chaque réponse « gratuite » commence par un téléchargement — et le fichier
   ne changera jamais de sa vie.

   ── CE QUE ÇA NE COÛTE PAS ────────────────────────────────────────────────

   AUCUNE VOIX N'EST REPAYÉE. On ne redemande rien à Soynade : on prend les
   fichiers déjà achetés, on les recompresse, on repose le résultat à côté.
   Les 270 WAV RESTENT EN PLACE — ils sont l'original, et si un seul MP3
   manquait, le téléphone retombe dessus sans rien dire. On ne supprime
   jamais ce qui a été payé et relu : c'est sa règle du 11 septembre, et elle
   vaut aussi pour des octets.

   ── POURQUOI DU JAVASCRIPT PUR, ET PAS ffmpeg ─────────────────────────────

   Parce que ce code tourne sur Render, et que rien ne garantit qu'un binaire
   y soit installé. Un outil absent le jour du déploiement, c'est la
   conversion qui ne part jamais — et on ne le découvrirait qu'en regardant
   pourquoi c'est toujours lent. L'encodeur est donc une dépendance du projet,
   installée comme les autres.

   ── LE RÉGLAGE, ET POURQUOI CELUI-LÀ ──────────────────────────────────────

   64 kilobits par seconde, un seul canal. C'est la voix de Kha : on ne joue
   pas avec. À 24 000 Hz et sur une voix seule, 64 kbit/s ne s'entend pas du
   MP3 — alors qu'à 32 on commencerait à entendre le sifflement des « s » et
   des « ch », et le wolof en est plein. On gagne six à sept fois, ce qui
   suffit largement, au lieu de gagner douze et d'abîmer ce qu'il a payé. */

import * as lamejs from "@breezystack/lamejs";

/* ── UN IMPORT QUI TIENT DANS LES DEUX MONDES ──────────────────────────────

   L'encodeur s'exporte différemment selon la façon dont le fichier est
   chargé : nommé quand c'est un module (Next), sous `default` quand c'est
   converti en CommonJS (les épreuves). Prendre l'un des deux, c'est marcher
   ici et casser là — et le message serait « Mp3Encoder is not a
   constructor », qu'on mettrait une heure à relier à ça. On accepte les deux
   et on refuse tôt, avec une phrase qui dit quoi faire. */
type Encodeur = { encodeBuffer(g: Int16Array, d?: Int16Array): Int8Array; flush(): Int8Array };
type Fabrique = new (canaux: number, hz: number, kbits: number) => Encodeur;
const sac = lamejs as unknown as { Mp3Encoder?: Fabrique; default?: { Mp3Encoder?: Fabrique } };
const Mp3Encoder: Fabrique | undefined = sac.Mp3Encoder || sac.default?.Mp3Encoder;

export const KBITS = 64;

export type Onde = {
  hz: number;
  canaux: number;
  bits: number;
  /** Les échantillons, entrelacés s'il y a plusieurs canaux. */
  pcm: Int16Array;
};

/* ── LIRE UN WAV ───────────────────────────────────────────────────────────

   On ne suppose PAS que l'en-tête fait 44 octets. C'est vrai pour la plupart
   des fichiers et faux pour beaucoup d'autres : un encodeur peut glisser un
   morceau « LIST » ou « fact » avant les données, et l'en-tête fait alors 60
   ou 80 octets. Lus comme du son, ces octets-là font un claquement au début
   de la phrase. On parcourt donc les morceaux, comme le format le prévoit. */
export function lireWav(octets: ArrayBuffer): Onde {
  const v = new DataView(octets);
  const mot = (o: number) => String.fromCharCode(
    v.getUint8(o), v.getUint8(o + 1), v.getUint8(o + 2), v.getUint8(o + 3));

  if (octets.byteLength < 44 || mot(0) !== "RIFF" || mot(8) !== "WAVE") {
    throw new Error("ce n'est pas un fichier WAV");
  }

  let o = 12;
  let hz = 0, canaux = 0, bits = 0, format = 0;
  let debut = 0, longueur = 0;

  while (o + 8 <= octets.byteLength) {
    const id = mot(o);
    const taille = v.getUint32(o + 4, true);
    if (id === "fmt ") {
      format = v.getUint16(o + 8, true);
      canaux = v.getUint16(o + 10, true);
      hz = v.getUint32(o + 12, true);
      bits = v.getUint16(o + 22, true);
    } else if (id === "data") {
      debut = o + 8;
      /* Un fichier tronqué annonce plus long qu'il n'est : on prend le plus
         petit des deux, sinon la lecture sort du tampon. */
      longueur = Math.min(taille, octets.byteLength - debut);
      break;
    }
    o += 8 + taille + (taille % 2);
  }

  if (format !== 1) throw new Error(`WAV non PCM (format ${format})`);
  if (bits !== 16) throw new Error(`WAV ${bits} bits, on attend 16`);
  if (!hz || !canaux || !longueur) throw new Error("WAV illisible");

  /* Int16Array exige un décalage pair. Les morceaux WAV sont alignés, mais un
     fichier bricolé peut ne pas l'être : on recopie plutôt que de refuser. */
  const pcm = debut % 2 === 0
    ? new Int16Array(octets, debut, Math.floor(longueur / 2))
    : new Int16Array(new Uint8Array(octets, debut, longueur - (longueur % 2)).slice().buffer);

  return { hz, canaux, bits, pcm };
}

/* ── LES FRÉQUENCES QUE LE MP3 CONNAÎT ─────────────────────────────────────

   Le MP3 n'accepte pas n'importe quelle fréquence : 32/44,1/48 kHz (MPEG-1)
   et 16/22,05/24 kHz (MPEG-2). Celle de Soynade — 24 000 — en fait partie,
   c'est pourquoi on n'a rien à rééchantillonner. Mais si Soynade changeait un
   jour, mieux vaut le REFUSER que d'écrire un fichier dont la voix sort trop
   grave ou trop aiguë sans que personne comprenne pourquoi. */
const FREQUENCES = [48000, 44100, 32000, 24000, 22050, 16000];

/** Le WAV, en MP3. Les octets rendus sont prêts à être déposés tels quels. */
export function versMp3(wav: ArrayBuffer, kbits = KBITS): Uint8Array {
  const onde = lireWav(wav);
  if (!FREQUENCES.includes(onde.hz)) {
    throw new Error(`${onde.hz} Hz : le MP3 ne sait pas encoder cette fréquence`);
  }

  if (!Mp3Encoder) throw new Error("l'encodeur MP3 n'est pas chargé (@breezystack/lamejs)");
  const encodeur = new Mp3Encoder(onde.canaux, onde.hz, kbits);
  const morceaux: Uint8Array[] = [];
  /* 1152 échantillons, c'est la trame du MP3 : travailler par multiples évite
     à l'encodeur de garder des restes entre deux appels. */
  const PAQUET = 1152 * 10;

  if (onde.canaux === 1) {
    for (let i = 0; i < onde.pcm.length; i += PAQUET) {
      const bout = encodeur.encodeBuffer(onde.pcm.subarray(i, i + PAQUET));
      if (bout.length) morceaux.push(new Uint8Array(bout));
    }
  } else {
    /* Deux canaux entrelacés : l'encodeur les veut séparés. Sa voix est en
       mono aujourd'hui — ce chemin existe pour ne pas produire un fichier
       deux fois trop rapide si ça changeait. */
    const g = new Int16Array(PAQUET), d = new Int16Array(PAQUET);
    for (let i = 0; i < onde.pcm.length; i += PAQUET * onde.canaux) {
      let n = 0;
      for (let j = 0; j < PAQUET && i + j * onde.canaux + 1 < onde.pcm.length; j++, n++) {
        g[j] = onde.pcm[i + j * onde.canaux];
        d[j] = onde.pcm[i + j * onde.canaux + 1];
      }
      const bout = encodeur.encodeBuffer(g.subarray(0, n), d.subarray(0, n));
      if (bout.length) morceaux.push(new Uint8Array(bout));
    }
  }

  const fin = encodeur.flush();
  if (fin.length) morceaux.push(new Uint8Array(fin));

  const total = morceaux.reduce((n, m) => n + m.length, 0);
  if (total < 200) throw new Error("le MP3 produit est vide");

  const tout = new Uint8Array(total);
  let o = 0;
  for (const m of morceaux) { tout.set(m, o); o += m.length; }
  return tout;
}

/** Combien de secondes de son, d'après l'en-tête. Sert à vérifier qu'on n'a
    pas converti un fichier tronqué. */
export function secondesDe(wav: ArrayBuffer): number {
  const o = lireWav(wav);
  return o.pcm.length / (o.hz * o.canaux);
}
