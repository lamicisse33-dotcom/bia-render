/* ── OÙ LES RAPPELS SONT RANGÉS, ET CE QUI SE PASSE QUAND LA TABLE MANQUE ──

   Lamine veut tester un rappel à deux minutes aujourd'hui. Je ne peux pas
   créer une table dans son Supabase d'ici — je n'ai ni l'URL ni la clé — et
   lui demander de coller du SQL avant de pouvoir essayer, c'est transformer
   « teste en vrai » en « attends demain ».

   DONC DEUX RANGEMENTS, ET ON DIT TOUJOURS LEQUEL SERT :
     supabase  — la table khalam_rappels existe (voir data/rappels.sql) ;
                 les rappels survivent aux redéploiements de Render.
     memoire   — elle n'existe pas encore ; ça marche tout de suite et ça
                 disparaît au prochain redémarrage.

   /api/etat → rappels.rangement le publie. RÈGLE 3 : un zéro aveugle ne
   prouve rien, et « ça a marché » sans dire où c'était rangé laisserait
   croire à une persistance qui n'existe pas.

   CE FICHIER NE COMPREND RIEN. Il ne lit pas de phrases, ne décide pas des
   heures : lib/rappels.ts fait ça et n'a aucun import. Ici on range. */

import { lexiqueConfig } from "./lexique";
import type { Rappel } from "./rappels";

export type Abonnement = {
  endpoint: string;
  cles: { p256dh: string; auth: string };
  ajoute: string;
};
export type Document = { rappels: Rappel[]; abonnements: Abonnement[] };

const TABLE = process.env.SUPABASE_TABLE_RAPPELS || "khalam_rappels";
const vide = (): Document => ({ rappels: [], abonnements: [] });

/* Le repli en mémoire vive. Borné : un serveur ne doit pas pouvoir être
   gonflé par des identifiants inventés. */
const enMemoire = new Map<string, Document>();
const MAX_PERSONNES = 500, MAX_RAPPELS = 20, MAX_ABONNEMENTS = 5;

type Etat = {
  rangement: "supabase" | "memoire" | "inconnu";
  table_absente: boolean;
  lectures: number; ecritures: number;
  echecs: Record<string, number>;
  personnes_en_memoire: number;
};
const g = globalThis as typeof globalThis & { biaRappelsDepot?: Etat };
const etat: Etat = (g.biaRappelsDepot ??= {
  rangement: "inconnu", table_absente: false, lectures: 0, ecritures: 0,
  echecs: {}, personnes_en_memoire: 0,
});
const echec = (quoi: string) => { etat.echecs[quoi] = (etat.echecs[quoi] || 0) + 1; };

export function resumeDepotRappels() {
  return { ...etat, echecs: { ...etat.echecs }, personnes_en_memoire: enMemoire.size };
}

const entetes = () => ({
  apikey: lexiqueConfig.cle,
  Authorization: `Bearer ${lexiqueConfig.cle}`,
  "Content-Type": "application/json",
});
const actif = () => Boolean(lexiqueConfig.url && lexiqueConfig.cle);

/** L'identifiant de rangement. Jamais vide : un rappel sans propriétaire
    serait lu par tout le monde, ce qui est exactement ce qu'il a interdit. */
export function cleDe(personne: string): string {
  const propre = String(personne || "").trim().toLowerCase().replace(/[^a-z0-9_-]/g, "").slice(0, 60);
  return propre || "";
}

function borner(d: Document): Document {
  return {
    rappels: (d.rappels || []).slice(0, MAX_RAPPELS),
    abonnements: (d.abonnements || []).slice(-MAX_ABONNEMENTS),
  };
}

/** Le document d'une personne. Jamais null : l'absence est un document vide. */
export async function lire(personne: string): Promise<Document> {
  const cle = cleDe(personne);
  if (!cle) return vide();
  if (!actif() || etat.table_absente) { etat.rangement = "memoire"; return enMemoire.get(cle) || vide(); }
  try {
    etat.lectures++;
    const r = await fetch(
      `${lexiqueConfig.url}/rest/v1/${TABLE}?application=eq.${encodeURIComponent(lexiqueConfig.application)}` +
      `&personne=eq.${encodeURIComponent(cle)}&select=document`,
      { headers: entetes(), signal: AbortSignal.timeout(4000), cache: "no-store" });
    if (r.status === 404 || r.status === 406) { etat.table_absente = true; etat.rangement = "memoire"; echec("table_absente"); return enMemoire.get(cle) || vide(); }
    if (!r.ok) { echec(`lecture_${r.status}`); return enMemoire.get(cle) || vide(); }
    const lignes = await r.json() as Array<{ document?: Document }>;
    etat.rangement = "supabase";
    return borner(lignes[0]?.document || vide());
  } catch { echec("lecture_reseau"); return enMemoire.get(cle) || vide(); }
}

/** Écrire le document complet d'une personne. */
export async function ecrire(personne: string, d: Document): Promise<boolean> {
  const cle = cleDe(personne);
  if (!cle) return false;
  const borne = borner(d);
  /* On garde TOUJOURS la copie en mémoire, même quand Supabase répond : elle
     sert de repli si le réseau tombe au tour suivant, et l'horloge du tour en
     cours n'a pas à attendre une relecture. */
  if (enMemoire.size < MAX_PERSONNES || enMemoire.has(cle)) enMemoire.set(cle, borne);
  if (!actif() || etat.table_absente) { etat.rangement = "memoire"; return true; }
  try {
    etat.ecritures++;
    const r = await fetch(`${lexiqueConfig.url}/rest/v1/${TABLE}`, {
      method: "POST",
      headers: { ...entetes(), Prefer: "resolution=merge-duplicates,return=minimal" },
      body: JSON.stringify({ application: lexiqueConfig.application, personne: cle, document: borne, maj: new Date().toISOString() }),
      signal: AbortSignal.timeout(5000),
    });
    if (r.status === 404 || r.status === 406) { etat.table_absente = true; etat.rangement = "memoire"; echec("table_absente"); return true; }
    if (!r.ok) { echec(`ecriture_${r.status}`); return false; }
    etat.rangement = "supabase";
    return true;
  } catch { echec("ecriture_reseau"); return false; }
}

/** TOUTES les lignes — pour l'horloge seule, jamais pour un navigateur.
    Bornée : au-delà, l'horloge sonnerait moins souvent que les rappels. */
export async function toutesLesPersonnes(): Promise<Array<{ personne: string; document: Document }>> {
  if (!actif() || etat.table_absente)
    return [...enMemoire.entries()].map(([personne, document]) => ({ personne, document }));
  try {
    const r = await fetch(
      `${lexiqueConfig.url}/rest/v1/${TABLE}?application=eq.${encodeURIComponent(lexiqueConfig.application)}` +
      `&select=personne,document&limit=500`,
      { headers: entetes(), signal: AbortSignal.timeout(6000), cache: "no-store" });
    if (r.status === 404 || r.status === 406) {
      etat.table_absente = true; etat.rangement = "memoire"; echec("table_absente");
      return [...enMemoire.entries()].map(([personne, document]) => ({ personne, document }));
    }
    if (!r.ok) { echec(`balayage_${r.status}`); return []; }
    etat.rangement = "supabase";
    const lignes = await r.json() as Array<{ personne: string; document?: Document }>;
    return lignes.map((l) => ({ personne: l.personne, document: borner(l.document || vide()) }));
  } catch { echec("balayage_reseau"); return []; }
}
