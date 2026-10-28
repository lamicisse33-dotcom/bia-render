import { lexiqueConfig } from "./lexique";
import { empreinteCode, empreinteNumero, normaliserNumero, MESSAGES_NUMERO } from "./acces-numero";

/* ── LE CODE SE LIE À UN TÉLÉPHONE, ET À UN SEUL ───────────────────────────

   Lamine, le 28 octobre 2026 : « le code est lié au numéro à la première
   utilisation : ensuite il ne marche que sur ce numéro ».

   CE QUI EST RANGÉ, EXACTEMENT, ET OÙ. Un objet par code, dans un seau
   Supabase PRIVÉ (`bia-acces`), qui n'est atteignable qu'avec la clé de
   service — jamais depuis un téléphone, jamais depuis la page. L'objet
   s'appelle de l'empreinte du code, et contient l'empreinte du numéro :

       bia-acces/8f3c…b1.json   { "numero": "2a7e…90", "depuis": "2026-10-28T…" }

   NI LE NUMÉRO NI LE CODE N'Y SONT EN CLAIR. Les deux sont signés avec le
   secret du serveur. On peut donc répondre « même téléphone qu'hier ? » et
   rien d'autre : ce rangement, volé, ne rend aucun numéro — et nous non plus
   ne pourrons jamais en tirer la liste des numéros de ses utilisateurs.

   QUAND LE RANGEMENT NE RÉPOND PAS, ON N'ENFERME PERSONNE DEHORS. Supabase
   peut tomber, ou n'être pas configuré. Refuser tout le monde à ce
   moment-là serait une panne bien pire que le partage d'un code : on laisse
   donc entrer, sans lier, et `/api/etat` le dit (`acces_numero.sans_memoire`).

   LE COMPTEUR D'ESSAIS vit en mémoire, et repart à zéro quand Render
   redémarre. C'est une limite réelle et elle est écrite ici : il freine celui
   qui devine des codes à la main, il n'arrêterait pas une machine patiente
   qui attendrait un redémarrage. */

const SEAU = process.env.SUPABASE_BUCKET_ACCES || "bia-acces";
const entetes = () => ({ apikey: lexiqueConfig.cle, Authorization: "Bearer " + lexiqueConfig.cle });
const adresse = (nom: string) => lexiqueConfig.url + "/storage/v1/object/" + SEAU + "/" + nom;

/* Le seau est créé à la première utilisation, comme celui de la mémoire
   audio : une case à cocher de plus dans Supabase, c'est une soirée perdue le
   jour où on l'oublie. Un seau déjà là rend 400 ou 409 : ce n'est pas une
   erreur. */
let seauPret = false;
async function assurerLeSeau() {
  if (seauPret) return;
  const r = await fetch(lexiqueConfig.url + "/storage/v1/bucket/" + SEAU,
    { headers: entetes(), cache: "no-store", signal: AbortSignal.timeout(8000) });
  if (r.ok) {
    if ((await r.json()).public !== false) throw Error("Le rangement des accès doit être privé.");
    seauPret = true; return;
  }
  if (![400, 404].includes(r.status)) throw Error("Rangement des accès indisponible.");
  const cree = await fetch(lexiqueConfig.url + "/storage/v1/bucket", {
    method: "POST", headers: { ...entetes(), "content-type": "application/json" },
    body: JSON.stringify({ id: SEAU, name: SEAU, public: false }), signal: AbortSignal.timeout(8000),
  });
  if (!cree.ok && cree.status !== 409) throw Error("Création du rangement des accès impossible.");
  seauPret = true;
}

/* Un lien lu reste en mémoire quelques minutes : une conversation appelle le
   cerveau à chaque tour, et chaque tour n'a pas à repasser par le réseau pour
   relire la même ligne. Seuls les liens TROUVÉS sont gardés — mettre en
   cache une absence ferait rater la liaison qu'un autre onglet vient de
   poser. */
type Lien = { numero: string; depuis: string };
const enMemoire = new Map<string, { lien: Lien; jusqua: number }>();
const CACHE_MS = 5 * 60 * 1000;

async function lireLien(cle: string): Promise<Lien | null> {
  const garde = enMemoire.get(cle);
  if (garde && garde.jusqua > Date.now()) return garde.lien;
  await assurerLeSeau();
  const r = await fetch(adresse(cle + ".json"),
    { headers: entetes(), cache: "no-store", signal: AbortSignal.timeout(8000) });
  if (r.status === 400 || r.status === 404) return null;
  if (!r.ok) throw Error("Lecture des accès indisponible.");
  const lien = await r.json() as Lien;
  if (!lien || typeof lien.numero !== "string" || !lien.numero) return null;
  enMemoire.set(cle, { lien, jusqua: Date.now() + CACHE_MS });
  return lien;
}

async function poserLien(cle: string, numero: string): Promise<Lien> {
  await assurerLeSeau();
  const lien: Lien = { numero, depuis: new Date().toISOString() };
  const r = await fetch(adresse(cle + ".json"), {
    method: "POST",
    headers: { ...entetes(), "content-type": "application/json", "x-upsert": "false" },
    body: JSON.stringify(lien), signal: AbortSignal.timeout(8000),
  });
  /* 409 : deux téléphones ont tenté le même code à la même seconde. Le
     premier a gagné ; on relit pour savoir lequel, et le second sera refusé
     comme il doit l'être. `x-upsert: false` est ce qui rend la course
     inoffensive — sans lui, le dernier arrivé écraserait la liaison. */
  if (r.status === 409) {
    const deja = await lireLien(cle);
    if (deja) return deja;
  } else if (!r.ok) throw Error("Enregistrement de l’accès refusé (" + r.status + ").");
  enMemoire.set(cle, { lien, jusqua: Date.now() + CACHE_MS });
  return lien;
}

/* ── LE FREIN CONTRE CELUI QUI DEVINE ──────────────────────────────────── */
const ratés = new Map<string, number[]>();
const FENETRE_MS = 10 * 60 * 1000;
const MAX_RATES = 5;

export function noterEssaiRate(cle: string) {
  const maintenant = Date.now();
  const vus = (ratés.get(cle) || []).filter((t) => maintenant - t < FENETRE_MS);
  vus.push(maintenant);
  ratés.set(cle, vus);
  /* On ne laisse pas la carte grandir sans fin : un serveur qui tourne des
     semaines finirait par garder une ligne par code jamais revu. */
  if (ratés.size > 5000) for (const [k, v] of ratés) if (!v.some((t) => maintenant - t < FENETRE_MS)) ratés.delete(k);
}

export function tropDEssais(cle: string): boolean {
  const maintenant = Date.now();
  const vus = (ratés.get(cle) || []).filter((t) => maintenant - t < FENETRE_MS);
  return vus.length >= MAX_RATES;
}

/* Ce que /api/etat montre : des nombres, jamais un numéro ni un code. */
const compte = { lies: 0, nouveaux: 0, refuses_autre_numero: 0, refuses_essais: 0, sans_memoire: 0 };
export function resumeAccesNumero() { return { ...compte, memoire_vive: enMemoire.size }; }

export type VerdictNumero =
  | { ok: true; lie: "nouveau" | "deja" | "sans_memoire" | "maitre" }
  | { ok: false; message: string };

/**
 * Le numéro est-il celui de ce code ? Lie à la première utilisation.
 * `maitre` entre sans être lié : Lamine ouvre BIA depuis plusieurs téléphones,
 * et lier son code à l'un d'eux l'enfermerait dehors sur les autres.
 */
export async function verifierNumero(code: string, numeroBrut: string | null, maitre: boolean): Promise<VerdictNumero> {
  const numero = normaliserNumero(numeroBrut);
  if (!numeroBrut || !String(numeroBrut).trim()) return { ok: false, message: MESSAGES_NUMERO.absent };
  if (!numero) return { ok: false, message: MESSAGES_NUMERO.invalide };
  if (maitre) return { ok: true, lie: "maitre" };

  const cle = empreinteCode(code);
  const empreinte = empreinteNumero(numero);
  if (!cle || !empreinte || !lexiqueConfig.actif) { compte.sans_memoire += 1; return { ok: true, lie: "sans_memoire" }; }

  if (tropDEssais(cle) || tropDEssais(empreinte)) { compte.refuses_essais += 1; return { ok: false, message: MESSAGES_NUMERO.essais }; }

  let lien: Lien | null;
  try { lien = await lireLien(cle); }
  catch { compte.sans_memoire += 1; return { ok: true, lie: "sans_memoire" }; }

  if (!lien) {
    try { lien = await poserLien(cle, empreinte); }
    catch { compte.sans_memoire += 1; return { ok: true, lie: "sans_memoire" }; }
    if (lien.numero === empreinte) { compte.nouveaux += 1; return { ok: true, lie: "nouveau" }; }
  }
  if (lien.numero === empreinte) { compte.lies += 1; return { ok: true, lie: "deja" }; }
  noterEssaiRate(cle); noterEssaiRate(empreinte);
  compte.refuses_autre_numero += 1;
  return { ok: false, message: MESSAGES_NUMERO.autre };
}
