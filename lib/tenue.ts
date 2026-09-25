/**
 * lib/tenue.ts
 *
 * Quelle planche d'images BIA porte à l'écran — "classique" ou une autre
 * tenue (ex. "wax"). Réglable depuis /reglage (code maître), sans
 * redéploiement : même mécanique que lib/prononciation.ts — une valeur
 * en mémoire, rafraîchie depuis Supabase toutes les 5 minutes, et tout de
 * suite après un changement.
 *
 * Table Supabase `reglages` : colonnes cle TEXT PRIMARY KEY, valeur TEXT.
 * Une seule ligne nous intéresse ici : cle = 'tenue'.
 */

/* Lamine, le 26 septembre 2026 : nouveau personnage BIA (image de référence
   différente, pas une simple mise à jour de la tenue wax) — elle devient la
   BIA par défaut. Classique et wax restent choisissables, rien n'est
   supprimé. */
export const TENUE_PAR_DEFAUT = "nouvelle";

let tenueActuelleEnMemoire = TENUE_PAR_DEFAUT;
let derniereMAJ = 0;
const TTL_MS = 5 * 60 * 1000;

async function rafraichir() {
  const maintenant = Date.now();
  if (maintenant - derniereMAJ < TTL_MS) return;
  derniereMAJ = maintenant;

  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.SUPABASE_SERVICE_KEY ?? process.env.SUPABASE_ANON_KEY;
  if (!url || !key) return;

  try {
    const r = await fetch(
      `${url}/rest/v1/reglages?cle=eq.tenue&select=valeur`,
      { headers: { apikey: key, Authorization: `Bearer ${key}` }, signal: AbortSignal.timeout(2500) }
    );
    if (!r.ok) return;
    const data = (await r.json()) as Array<{ valeur: string }>;
    if (Array.isArray(data) && data[0]?.valeur) tenueActuelleEnMemoire = data[0].valeur;
  } catch { /* réseau indisponible — on garde la valeur précédente */ }
}

void rafraichir();

/** Synchrone : la valeur en mémoire, rafraîchie en fond si le TTL est dépassé. */
export function tenueActuelle(): string {
  if (Date.now() - derniereMAJ >= TTL_MS) void rafraichir();
  return tenueActuelleEnMemoire;
}

export async function changerTenue(valeur: string): Promise<void> {
  const propre = valeur.trim() || TENUE_PAR_DEFAUT;
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.SUPABASE_SERVICE_KEY ?? process.env.SUPABASE_ANON_KEY;
  if (!url || !key) throw new Error("SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY manquants");

  const r = await fetch(`${url}/rest/v1/reglages`, {
    method: "POST",
    headers: {
      apikey: key,
      Authorization: `Bearer ${key}`,
      "Content-Type": "application/json",
      "Prefer": "resolution=merge-duplicates,return=minimal",
    },
    body: JSON.stringify({ cle: "tenue", valeur: propre }),
    signal: AbortSignal.timeout(4000),
  });
  if (!r.ok) {
    const msg = await r.text().catch(() => r.status.toString());
    throw new Error(`Supabase ${r.status}: ${msg}`);
  }
  tenueActuelleEnMemoire = propre;
  derniereMAJ = Date.now();
}
