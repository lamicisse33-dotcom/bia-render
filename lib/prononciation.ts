/**
 * lib/prononciation.ts
 *
 * Correction phonétique avant synthèse vocale.
 * Deux sources :
 *   1. data/prononciation.txt  — statique, dans le repo
 *   2. Table Supabase `prononciation` — dynamique, sans redéploiement, prioritaire
 */

import { readFileSync } from "fs";
import path from "path";

interface Regle { mot: string; dire: string }

function parseLignes(contenu: string): Regle[] {
  return contenu
    .split("\n")
    .map(l => l.trim())
    .filter(l => l && !l.startsWith("#"))
    .map(l => {
      const idx = l.indexOf("=");
      if (idx < 1) return null;
      return { mot: l.slice(0, idx).trim(), dire: l.slice(idx + 1).trim() };
    })
    .filter((r): r is Regle => r !== null && r.mot.length > 0 && r.dire.length > 0);
}

let reglesStatiques: Regle[] = [];
try {
  const fichier = path.join(process.cwd(), "data", "prononciation.txt");
  reglesStatiques = parseLignes(readFileSync(fichier, "utf-8"));
} catch { /* fichier absent — pas grave */ }

let reglesDynamiques: Regle[] = [];
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
      `${url}/rest/v1/prononciation?actif=eq.true&select=mot,dire&order=created_at.asc`,
      {
        headers: { apikey: key, Authorization: `Bearer ${key}` },
        signal: AbortSignal.timeout(2500),
      }
    );
    if (!r.ok) return;
    const data = (await r.json()) as Array<{ mot: string; dire: string }>;
    if (Array.isArray(data)) reglesDynamiques = data;
  } catch { /* réseau — on garde les règles précédentes */ }
}

void rafraichir();

function echapper(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function toutesLesRegles(): Regle[] {
  return [...reglesDynamiques, ...reglesStatiques]
    .sort((a, b) => b.mot.length - a.mot.length);
}

export function prononcer(texte: string): string {
  if (Date.now() - derniereMAJ >= TTL_MS) void rafraichir();

  let resultat = texte;
  for (const { mot, dire } of toutesLesRegles()) {
    try {
      const re = new RegExp(
        `(?<![\\p{L}\\p{M}])${echapper(mot)}(?![\\p{L}\\p{M}])`,
        "giu"
      );
      resultat = resultat.replace(re, dire);
    } catch { /* regex invalide — on saute */ }
  }
  return resultat;
}

export async function ajouterCorrection(mot: string, dire: string): Promise<void> {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.SUPABASE_SERVICE_KEY ?? process.env.SUPABASE_ANON_KEY;
  if (!url || !key) throw new Error("SUPABASE_URL / clé manquants");

  const r = await fetch(`${url}/rest/v1/prononciation`, {
    method: "POST",
    headers: {
      apikey: key, Authorization: `Bearer ${key}`,
      "Content-Type": "application/json",
      "Prefer": "resolution=merge-duplicates,return=minimal",
    },
    body: JSON.stringify({ mot: mot.trim(), dire: dire.trim(), actif: true }),
    signal: AbortSignal.timeout(4000),
  });
  if (!r.ok) {
    const msg = await r.text().catch(() => r.status.toString());
    throw new Error(`Supabase ${r.status}: ${msg}`);
  }
  derniereMAJ = 0;
  await rafraichir();
}

export async function supprimerCorrection(mot: string): Promise<void> {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.SUPABASE_SERVICE_KEY ?? process.env.SUPABASE_ANON_KEY;
  if (!url || !key) return;

  await fetch(
    `${url}/rest/v1/prononciation?mot=eq.${encodeURIComponent(mot.trim())}`,
    {
      method: "DELETE",
      headers: { apikey: key, Authorization: `Bearer ${key}` },
      signal: AbortSignal.timeout(3000),
    }
  ).catch(() => {});
  derniereMAJ = 0;
  await rafraichir();
}

export async function rafraichirMaintenant(): Promise<void> {
  derniereMAJ = 0;
  await rafraichir();
}

export function resumePrononciation() {
  return {
    statiques: reglesStatiques.length,
    dynamiques: reglesDynamiques.length,
    total: reglesStatiques.length + reglesDynamiques.length,
  };
}
