import { lexiqueConfig } from "./lexique";
import { empreinteCode, empreinteNumero, normaliserNumero, MESSAGES_NUMERO } from "./acces-numero";

/* ── LE CODE EST LIÉ À UN TÉLÉPHONE, ET À UN SEUL ──────────────────────────

   Lamine, le 28 octobre 2026, deux fois dans la même journée.

   LE MATIN : « le code est lié au numéro à la première utilisation ». Rangé
   alors en EMPREINTES dans un seau privé — on ne savait répondre qu'à une
   question, « est-ce le même téléphone qu'hier ? », et personne, nous compris,
   ne pouvait retrouver un numéro.

   LE SOIR : « le générateur de codes doit exiger le numéro […] garde le
   numéro EN CLAIR dans une table privée, pour que je le lise dans Supabase.
   Le code lui-même reste en empreinte. »

   C'EST UN RENONCEMENT, ET IL FAUT LE DIRE : à partir d'ici, la liste des
   numéros de ses utilisateurs EXISTE et se lit. C'est sa décision, et elle a
   une raison — il fabrique les codes à la main, un par personne, et il doit
   savoir à qui il a donné quoi. Ce qui protège n'est donc plus le
   chiffrement, c'est la porte : RLS activé, AUCUNE règle, donc seule la clé
   de service ouvre la table. Ni la page, ni un téléphone, ni la clé publique.

   LE CODE, LUI, RESTE UNE EMPREINTE. Voler la table ne donne les codes de
   personne.

   L'ANCIEN SEAU EST ENCORE LU, jamais écrit : les liaisons posées le matin y
   dorment, et leurs propriétaires ne doivent pas être mis dehors. Elles
   s'éteindront d'elles-mêmes avec leurs codes.

   QUAND LE RANGEMENT NE RÉPOND PAS, ON N'ENFERME PERSONNE DEHORS. Refuser
   tout le monde pendant une panne de Supabase serait pire que le partage d'un
   code : on laisse entrer, sans lier, et `/api/etat` le dit
   (`acces_numero.sans_memoire`). */

const TABLE = process.env.SUPABASE_TABLE_CODES || "khalam_codes";
const SEAU = process.env.SUPABASE_BUCKET_ACCES || "bia-acces";

const entetes = () => ({
  apikey: lexiqueConfig.cle,
  Authorization: "Bearer " + lexiqueConfig.cle,
  "content-type": "application/json",
});

export type Lien = {
  code_empreinte: string;
  numero: string | null;
  numero_empreinte: string | null;
  prenom: string | null;
  origine: string | null;
  cree_le?: string;
};

/* Un lien lu reste en mémoire quelques minutes : une conversation appelle le
   cerveau à chaque tour, et chaque tour n'a pas à repasser par le réseau pour
   relire la même ligne. Seuls les liens TROUVÉS sont gardés — mettre en cache
   une absence ferait rater la liaison qu'un autre téléphone vient de poser. */
const enMemoire = new Map<string, { lien: Lien; jusqua: number }>();
const CACHE_MS = 5 * 60 * 1000;
export function oublierLien(cle: string) { enMemoire.delete(cle); }

async function lireDansLaTable(cle: string): Promise<Lien | null> {
  const r = await fetch(lexiqueConfig.url + "/rest/v1/" + TABLE
    + "?select=code_empreinte,numero,numero_empreinte,prenom,origine,cree_le&code_empreinte=eq." + encodeURIComponent(cle),
    { headers: entetes(), cache: "no-store", signal: AbortSignal.timeout(8000) });
  if (!r.ok) throw Error("Lecture des accès indisponible.");
  const lignes = await r.json();
  return Array.isArray(lignes) && lignes.length ? lignes[0] as Lien : null;
}

/* L'ancien seau, en lecture seule. On n'y écrit plus rien. */
async function lireDansLeSeau(cle: string): Promise<Lien | null> {
  const r = await fetch(lexiqueConfig.url + "/storage/v1/object/" + SEAU + "/" + cle + ".json",
    { headers: entetes(), cache: "no-store", signal: AbortSignal.timeout(8000) });
  if (!r.ok) return null;
  const vieux = await r.json() as { numero?: string };
  if (!vieux || typeof vieux.numero !== "string" || !vieux.numero) return null;
  return { code_empreinte: cle, numero: null, numero_empreinte: vieux.numero, prenom: null, origine: "seau" };
}

async function lireLien(cle: string): Promise<Lien | null> {
  const garde = enMemoire.get(cle);
  if (garde && garde.jusqua > Date.now()) return garde.lien;
  let lien = await lireDansLaTable(cle);
  if (!lien) lien = await lireDansLeSeau(cle).catch(() => null);
  if (lien) enMemoire.set(cle, { lien, jusqua: Date.now() + CACHE_MS });
  return lien;
}

/**
 * Pose une liaison. `x-upsert`-less : une insertion qui arrive deuxième
 * échoue en 409, et c'est ce qui rend la course entre deux téléphones
 * inoffensive — sans ça, le dernier arrivé écraserait la liaison du premier.
 */
async function poserLien(ligne: Omit<Lien, "cree_le">): Promise<Lien> {
  const r = await fetch(lexiqueConfig.url + "/rest/v1/" + TABLE, {
    method: "POST", headers: { ...entetes(), Prefer: "return=minimal" },
    body: JSON.stringify(ligne), signal: AbortSignal.timeout(8000),
  });
  if (r.status === 409) {
    const deja = await lireDansLaTable(ligne.code_empreinte);
    if (deja) { enMemoire.set(ligne.code_empreinte, { lien: deja, jusqua: Date.now() + CACHE_MS }); return deja; }
  } else if (!r.ok) throw Error("Enregistrement de l’accès refusé (" + r.status + ").");
  enMemoire.set(ligne.code_empreinte, { lien: ligne as Lien, jusqua: Date.now() + CACHE_MS });
  return ligne as Lien;
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
  if (ratés.size > 5000) for (const [k, v] of ratés) if (!v.some((t) => maintenant - t < FENETRE_MS)) ratés.delete(k);
}

export function tropDEssais(cle: string): boolean {
  const maintenant = Date.now();
  return (ratés.get(cle) || []).filter((t) => maintenant - t < FENETRE_MS).length >= MAX_RATES;
}

const compte = { lies: 0, nouveaux: 0, refuses_autre_numero: 0, refuses_essais: 0, sans_memoire: 0, crees: 0, delies: 0 };
export function resumeAccesNumero() { return { ...compte, memoire_vive: enMemoire.size }; }

export type VerdictNumero =
  | { ok: true; lie: "nouveau" | "deja" | "sans_memoire" | "maitre" }
  | { ok: false; message: string };

/** Le numéro correspond-il à la liaison de ce code ? */
function correspond(lien: Lien, numero: string): boolean {
  if (lien.numero) return normaliserNumero(lien.numero) === numero;
  if (lien.numero_empreinte) return lien.numero_empreinte === empreinteNumero(numero);
  return false;
}

/**
 * Le numéro est-il celui de ce code ? Lie à la première utilisation quand le
 * code n'a pas été créé pour un numéro précis — c'est le cas de tous les codes
 * distribués avant le 28 octobre 2026, et ils doivent continuer de marcher.
 *
 * `maitre` entre sans être lié : Lamine ouvre BIA depuis plusieurs téléphones,
 * et lier son code à l'un d'eux l'enfermerait dehors sur les autres.
 */
export async function verifierNumero(code: string, numeroBrut: string | null, maitre: boolean): Promise<VerdictNumero> {
  const numero = normaliserNumero(numeroBrut);
  if (!numeroBrut || !String(numeroBrut).trim()) return { ok: false, message: MESSAGES_NUMERO.absent };
  if (!numero) return { ok: false, message: MESSAGES_NUMERO.invalide };
  if (maitre) return { ok: true, lie: "maitre" };

  const cle = empreinteCode(code);
  if (!cle || !lexiqueConfig.actif) { compte.sans_memoire += 1; return { ok: true, lie: "sans_memoire" }; }
  if (tropDEssais(cle)) { compte.refuses_essais += 1; return { ok: false, message: MESSAGES_NUMERO.essais }; }

  let lien: Lien | null;
  try { lien = await lireLien(cle); }
  catch { compte.sans_memoire += 1; return { ok: true, lie: "sans_memoire" }; }

  if (!lien) {
    try { lien = await poserLien({ code_empreinte: cle, numero, numero_empreinte: null, prenom: null, origine: "premiere_utilisation" }); }
    catch { compte.sans_memoire += 1; return { ok: true, lie: "sans_memoire" }; }
    if (correspond(lien, numero)) { compte.nouveaux += 1; return { ok: true, lie: "nouveau" }; }
  }
  if (correspond(lien, numero)) { compte.lies += 1; return { ok: true, lie: "deja" }; }
  noterEssaiRate(cle);
  compte.refuses_autre_numero += 1;
  return { ok: false, message: MESSAGES_NUMERO.autre };
}

/* ── LIER UN CODE DÈS SA CRÉATION ──────────────────────────────────────────
   Lamine, 28 octobre 2026 : « il doit demander le numéro et lier le code à CE
   numéro dès la création. Ce code ne marche ensuite que pour ce numéro. » */
export async function creerLien(code: string, numeroBrut: string, prenom?: string): Promise<{ ok: true } | { ok: false; message: string }> {
  const numero = normaliserNumero(numeroBrut);
  if (!numeroBrut || !String(numeroBrut).trim()) return { ok: false, message: MESSAGES_NUMERO.absent };
  if (!numero) return { ok: false, message: MESSAGES_NUMERO.invalide };
  if (!lexiqueConfig.actif) return { ok: false, message: "Le rangement des accès n’est pas joignable." };
  const cle = empreinteCode(code);
  if (!cle) return { ok: false, message: "Le serveur n’a pas de secret configuré." };
  try {
    await poserLien({
      code_empreinte: cle, numero, numero_empreinte: null,
      prenom: (prenom || "").trim().slice(0, 40) || null, origine: "genere",
    });
    compte.crees += 1;
    return { ok: true };
  } catch { return { ok: false, message: "Le code n’a pas pu être lié à ce numéro." }; }
}

/* ── DÉLIER, POUR UN CHANGEMENT DE TÉLÉPHONE ───────────────────────────────
   Lamine : « un moyen de délier ou de régénérer un code (changement de
   téléphone) ». Délier est le geste le plus doux : le code reste valable et
   se reliera au prochain téléphone qui l'emploie. */
export async function delierCode(code: string): Promise<boolean> {
  if (!lexiqueConfig.actif) return false;
  const cle = empreinteCode(code);
  if (!cle) return false;
  const r = await fetch(lexiqueConfig.url + "/rest/v1/" + TABLE + "?code_empreinte=eq." + encodeURIComponent(cle),
    { method: "DELETE", headers: { ...entetes(), Prefer: "return=minimal" }, signal: AbortSignal.timeout(8000) });
  if (r.ok) { oublierLien(cle); compte.delies += 1; }
  return r.ok;
}

/** Déplacer un code vers un autre numéro, sans le refabriquer. */
export async function relierCode(code: string, numeroBrut: string): Promise<{ ok: true } | { ok: false; message: string }> {
  const numero = normaliserNumero(numeroBrut);
  if (!numero) return { ok: false, message: MESSAGES_NUMERO.invalide };
  if (!(await delierCode(code))) return { ok: false, message: "L’ancienne liaison n’a pas pu être retirée." };
  return creerLien(code, numero);
}
