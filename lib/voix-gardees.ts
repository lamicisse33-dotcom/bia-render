/* ── LES VOIX GARDÉES : UNE PHRASE PAYÉE UNE FOIS, SERVIE POUR TOUJOURS ───

   Décidé par Lamine le 24 septembre 2026 : « Garder chaque phrase déjà dite.
   C'est seulement comme ça qu'on peut s'en sortir. » La voix fait ~80 % du
   coût d'un échange ; sans mémoire, si cinq cents personnes entendent
   « Salaam aleekum », Soynade est payé cinq cents fois.

   Chaque morceau de voix fabriqué est rangé dans Supabase (seau PRIVÉ
   `voix-gardees`, créé tout seul). La fois suivante, même texte, même
   langue, même voix : le son vient du seau — zéro signe facturé, et
   quelques centaines de millisecondes au lieu de trois secondes.

   Ce que ça rend gratuit en premier : ses corrections. Elles sont servies
   MOT POUR MOT (voir correctionExacte dans app/api/chat/route.ts), donc
   leur son est toujours le même — une réponse corrigée ne se paie qu'une
   fois, pour tout le monde.

   CE QUI FAIT LA CLÉ : le texte exact, la langue, et l'identité de la voix
   (fournisseur + réglages du serveur, JAMAIS les clés d'accès : changer de
   clé ne doit pas tout faire repayer). Si on change la voix ou ses
   réglages, la clé change : on ne resservira pas l'ancienne voix. Les
   anciens sons restent dans le seau sans servir.

   CE QU'ON NE GARDE PAS : un son fait par le SECOURS (ElevenLabs quand
   Soynade a raté, Soynade quand RunPod a raté) — ce n'est pas la voix de
   BIA, on ne veut pas l'entendre revenir pour toujours. Ni les essais de
   la page de réglage.

   PLACE : Supabase gratuit = 1 Go de fichiers pour tout le projet, et le
   corpus s'en réserve 700 Mo. On se donne 250 Mo par défaut
   (BIA_VOIX_GARDEES_MO), soit plusieurs milliers de phrases. Plein → on
   continue de SERVIR ce qu'on a, on arrête seulement d'ajouter, et ça se
   voit dans /api/etat. L'offre Pro de Supabase (25 $/mois) donne 100 Go.

   ÇA NE FAIT JAMAIS ATTENDRE : le dépôt part après la réponse ; la lecture
   a un délai court, et une fois la liste du seau chargée, une phrase
   inconnue ne coûte même plus ce délai. BIA_VOIX_GARDEES=non éteint tout. */

import { createHash } from "node:crypto";
import { lexiqueConfig } from "./lexique";
import { voixConfig } from "./voix";
import { nombreDeLEnvironnement } from "./nombre-env";

const SEAU = process.env.SUPABASE_BUCKET_VOIX || "voix-gardees";
const OCTETS_AU_PLUS = nombreDeLEnvironnement(process.env.BIA_VOIX_GARDEES_MO, 250, "BIA_VOIX_GARDEES_MO") * 1024 * 1024;
const LECTURE_MS = 1500;
/** Prix Soynade, pour dire en clair ce que le seau a fait économiser. */
const DOLLARS_PAR_SIGNE = 0.22 / 1000;

export const voixGardeesActives = () =>
  lexiqueConfig.actif && (process.env.BIA_VOIX_GARDEES || "oui") !== "non";

function entetes(type?: string) {
  return {
    apikey: lexiqueConfig.cle,
    Authorization: `Bearer ${lexiqueConfig.cle}`,
    ...(type ? { "content-type": type } : {}),
  };
}

/* ── L'IDENTITÉ DE LA VOIX ─────────────────────────────────────────────── */

const SANS_IDENTITE = new Set(["apiKey", "cle", "baseUrl", "attenteMs"]);
function identiteDeLaVoix(): string {
  const f = voixConfig.fournisseur;
  const conf = (voixConfig as unknown as Record<string, unknown>)[f];
  const reglages = conf && typeof conf === "object"
    ? Object.entries(conf as Record<string, unknown>)
        .filter(([k]) => !SANS_IDENTITE.has(k))
        .sort(([a], [b]) => a.localeCompare(b))
    : [];
  return `${f}:${JSON.stringify(reglages)}`;
}

/** Le moteur qui a parlé est-il bien la voix principale de BIA ? */
export function estLaVoixPrincipale(moteur: string): boolean {
  const m = String(moteur || "");
  switch (voixConfig.fournisseur) {
    case "soynade": return m.startsWith("soynade");
    case "runpod": return m.startsWith("khalam-voix");
    case "elevenlabs": return m.startsWith("elevenlabs");
    default: return false;
  }
}

/** Même texte, même langue, même voix → même empreinte. Les réglages
    envoyés par la requête comptent aussi (vides en temps normal). */
export function empreinteDeVoix(texte: string, langue: string, reglages = ""): string {
  const propre = String(texte || "").trim().replace(/\s+/g, " ");
  return createHash("sha256")
    .update(`v1|${identiteDeLaVoix()}|${langue}|${reglages}|${propre}`)
    .digest("hex");
}

const chemin = (langue: string, empreinte: string) => `${langue}/${empreinte}.mp3`;

/* ── CE QUI SE COMPTE ──────────────────────────────────────────────────── */

const compte = {
  servies: 0, signesEvites: 0,
  deposees: 0, octetsDeposes: 0,
  refusees: 0, dernierRefus: "",
  lecturesRatees: 0,
};

/* ── LA LISTE DU SEAU, CHARGÉE UNE FOIS ────────────────────────────────── */

let connues: Set<string> | null = null;
let octetsDansLeSeau = 0;
let chargement: Promise<void> | null = null;
let seauPret = false;

async function assurerLeSeau(): Promise<void> {
  if (seauPret) return;
  const r = await fetch(`${lexiqueConfig.url}/storage/v1/bucket`, {
    method: "POST",
    headers: entetes("application/json"),
    body: JSON.stringify({ name: SEAU, id: SEAU, public: false }),
  });
  /* 409 = déjà là. Certaines versions rendent 400 « already exists ». */
  if (r.ok || r.status === 409) { seauPret = true; return; }
  const detail = await r.text().catch(() => "");
  if (/exist/i.test(detail)) { seauPret = true; return; }
  throw new Error(`le seau « ${SEAU} » n'a pas pu être créé (${r.status})`);
}

async function listerUnDossier(langue: string, dans: Set<string>): Promise<number> {
  let octets = 0;
  for (let offset = 0; offset < 200_000; offset += 1000) {
    const r = await fetch(`${lexiqueConfig.url}/storage/v1/object/list/${SEAU}`, {
      method: "POST",
      headers: entetes("application/json"),
      body: JSON.stringify({ prefix: langue, limit: 1000, offset }),
      cache: "no-store",
    });
    if (!r.ok) throw new Error(`liste du seau refusée (${r.status})`);
    const lot = await r.json() as Array<{ name: string; metadata?: { size?: number } }>;
    for (const o of lot) {
      if (!o.name.endsWith(".mp3")) continue;
      dans.add(chemin(langue, o.name.slice(0, -4)));
      octets += Number(o.metadata?.size) || 0;
    }
    if (lot.length < 1000) break;
  }
  return octets;
}

function chargerLaListe(): void {
  if (chargement || !voixGardeesActives()) return;
  chargement = (async () => {
    await assurerLeSeau();
    const s = new Set<string>();
    let octets = 0;
    for (const langue of ["wo", "fr"]) octets += await listerUnDossier(langue, s);
    connues = s;
    octetsDansLeSeau = octets;
  })().catch((e) => {
    console.error("BIA — voix gardées : la liste du seau n'a pas pu être lue :", (e as Error).message);
    chargement = null;   // on réessaiera à la prochaine phrase
  });
}

/* ── LIRE ──────────────────────────────────────────────────────────────── */

/** Le son déjà payé pour ce texte, ou null. Ne fait jamais attendre plus
    de LECTURE_MS ; une fois la liste chargée, une phrase inconnue rend
    null à l'instant. */
export async function voixGardee(empreinte: string, langue: string, signes: number): Promise<Buffer | null> {
  if (!voixGardeesActives()) return null;
  chargerLaListe();
  const c = chemin(langue, empreinte);
  if (connues && !connues.has(c)) return null;

  const minuterie = new AbortController();
  const t = setTimeout(() => minuterie.abort(), LECTURE_MS);
  try {
    const r = await fetch(`${lexiqueConfig.url}/storage/v1/object/${SEAU}/${c}`, {
      headers: entetes(), signal: minuterie.signal, cache: "no-store",
    });
    if (!r.ok) return null;
    const audio = Buffer.from(await r.arrayBuffer());
    if (audio.length < 200) return null;
    connues?.add(c);
    compte.servies += 1;
    compte.signesEvites += Math.max(0, signes);
    return audio;
  } catch {
    compte.lecturesRatees += 1;
    return null;
  } finally {
    clearTimeout(t);
  }
}

/* ── GARDER ────────────────────────────────────────────────────────────── */

/** Range un son qu'on vient de payer. À lancer SANS l'attendre. */
export async function garderLaVoixFabriquee(empreinte: string, langue: string, audio: Buffer, typeMime: string, moteur: string): Promise<void> {
  if (!voixGardeesActives()) return;
  if (typeMime !== "audio/mpeg") return;               // on ne range que du mp3, léger
  if (!estLaVoixPrincipale(moteur)) return;            // pas la voix de secours
  if (octetsDansLeSeau + audio.length > OCTETS_AU_PLUS) {
    compte.refusees += 1; compte.dernierRefus = "seau plein — voir BIA_VOIX_GARDEES_MO";
    return;
  }
  const c = chemin(langue, empreinte);
  if (connues?.has(c)) return;
  try {
    await assurerLeSeau();
    const r = await fetch(`${lexiqueConfig.url}/storage/v1/object/${SEAU}/${c}`, {
      method: "POST",
      headers: { ...entetes("audio/mpeg"), "x-upsert": "true", "cache-control": "31536000" },
      body: new Uint8Array(audio),
    });
    if (!r.ok) throw new Error(`dépôt refusé (${r.status}) ${(await r.text().catch(() => "")).slice(0, 120)}`);
    connues?.add(c);
    octetsDansLeSeau += audio.length;
    compte.deposees += 1;
    compte.octetsDeposes += audio.length;
  } catch (e) {
    compte.refusees += 1;
    compte.dernierRefus = (e as Error).message;
    console.error("BIA — voix gardées :", compte.dernierRefus);
  }
}

/** Pour /api/etat : ce que le seau a fait gagner, en clair. */
export function resumeVoixGardees() {
  return {
    actives: voixGardeesActives(),
    seau: SEAU,
    voix: voixConfig.fournisseur,
    phrases_dans_le_seau: connues ? connues.size : null,
    mo_dans_le_seau: Math.round(octetsDansLeSeau / 1024 / 1024 * 10) / 10,
    plafond_mo: Math.round(OCTETS_AU_PLUS / 1024 / 1024),
    servies_depuis_le_reveil: compte.servies,
    deposees_depuis_le_reveil: compte.deposees,
    signes_evites: compte.signesEvites,
    dollars_evites: Math.round(compte.signesEvites * DOLLARS_PAR_SIGNE * 1000) / 1000,
    refus: compte.refusees,
    dernier_refus: compte.dernierRefus || null,
    lectures_ratees: compte.lecturesRatees,
  };
}
