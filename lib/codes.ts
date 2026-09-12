import { createHmac, randomBytes } from "node:crypto";
import { nombreDeLEnvironnement } from "./nombre-env";

/* ── Codes de testeur pour BIA ─────────────────────────────────────────────
   Un code porte SA PROPRE date d'expiration, signée. Le serveur n'a donc
   aucune liste à garder : il recalcule la signature et sait immédiatement si
   le code est authentique et s'il est encore valable. C'est ce qui permet à
   la limite de temps de survivre au sommeil de Render — l'offre gratuite
   éteint le service après quinze minutes, et tout ce qui vit en mémoire
   disparaît avec lui.

   Le compteur de questions, lui, ne peut pas être signé : il vit en mémoire
   et repart donc à zéro après un réveil. La limite de temps reste, elle.   */

const ALPHABET = "23456789ABCDEFGHJKLMNPQRSTUVWXYZ"; // sans O/0, I/1, ambigus à l'oral
const ORIGINE = Date.UTC(2026, 0, 1) / 60000;        // minutes depuis le 1er janvier 2026

function secret() {
  return process.env.BIA_SECRET || process.env.BIA_CODE_MAITRE || "";
}

function encode(valeur: number, longueur: number) {
  let out = "";
  for (let i = 0; i < longueur; i++) { out = ALPHABET[valeur % 32] + out; valeur = Math.floor(valeur / 32); }
  return out;
}

function decode(texte: string) {
  return [...texte].reduce((acc, c) => acc * 32 + ALPHABET.indexOf(c), 0);
}

function signature(corps: string) {
  const octets = createHmac("sha256", secret()).update(corps).digest();
  return [...octets.subarray(0, 4)].map((o) => ALPHABET[o % 32]).join("");
}

/** Fabrique un code valable `heures` heures. */
export function creerCode(heures: number) {
  const expiration = Math.floor(Date.now() / 60000) - ORIGINE + Math.round(heures * 60);
  const nonce = [...randomBytes(2)].map((o) => ALPHABET[o % 32]).join("");
  const corps = encode(expiration, 4) + nonce;
  return corps + signature(corps);
}

export type Verdict = { ok: true; maitre: boolean } | { ok: false; raison: "absent" | "invalide" | "expire" | "epuise" };

const compteurs = new Map<string, number>();
const MAX_QUESTIONS = nombreDeLEnvironnement(process.env.BIA_MAX_QUESTIONS, 15, "BIA_MAX_QUESTIONS");

export function verifierCode(brut: string | null): Verdict {
  const code = (brut || "").toUpperCase().replace(/[^A-Z0-9]/g, "");
  if (!code) return { ok: false, raison: "absent" };

  const maitre = (process.env.BIA_CODE_MAITRE || "").toUpperCase().replace(/[^A-Z0-9]/g, "");
  if (maitre && code === maitre) return { ok: true, maitre: true };

  if (!secret() || code.length !== 10) return { ok: false, raison: "invalide" };
  const corps = code.slice(0, 6);
  if ([...corps].some((c) => !ALPHABET.includes(c))) return { ok: false, raison: "invalide" };
  if (signature(corps) !== code.slice(6)) return { ok: false, raison: "invalide" };

  const expiration = decode(corps.slice(0, 4)) + ORIGINE;
  if (Math.floor(Date.now() / 60000) > expiration) return { ok: false, raison: "expire" };

  const utilise = (compteurs.get(code) || 0) + 1;
  if (utilise > MAX_QUESTIONS) return { ok: false, raison: "epuise" };
  compteurs.set(code, utilise);
  return { ok: true, maitre: false };
}
