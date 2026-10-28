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

function signature(corps: string, longueur = 4) {
  const octets = createHmac("sha256", secret()).update(corps).digest();
  return [...octets.subarray(0, longueur)].map((o) => ALPHABET[o % 32]).join("");
}

/* ── DEUX LONGUEURS, ET POURQUOI ─────────────────────────────────

   Lamine, 28 octobre 2026 : « dis-moi la longueur des codes. Ils doivent être
   longs et aléatoires, pas devinables. »

   L'ANCIEN FORMAT FAISAIT DIX SIGNES, et il était plus court qu'il n'en avait
   l'air : quatre pour l'expiration, deux de hasard, quatre de signature.
   Celui qui devine n'a pas le secret, donc il doit tomber juste sur la
   SIGNATURE : quatre signes sur trente-deux, soit un peu plus d'un million de
   possibilités. C'est beaucoup pour une main, peu pour une machine — surtout
   que le frein de la porte vit en mémoire et repart à zéro à chaque
   redémarrage de Render.

   LE NOUVEAU FAIT SEIZE SIGNES : quatre d'expiration, quatre de hasard, HUIT
   de signature. L'espace à deviner passe de 32⁴ ≈ 10⁶ à 32⁸ ≈ 1,1 × 10¹² —
   un million de fois plus. À mille essais par seconde sans aucun frein, il
   faudrait encore dix-sept ans.

   LES DEUX SONT ACCEPTÉS À L'ENTRÉE. Les codes déjà distribués continuent de
   marcher — personne n'est mis dehors — et seuls les nouveaux sont longs.
   L'alphabet, lui, ne change pas : ni O/0 ni I/1, parce qu'un code se dicte
   au téléphone. */
const ANCIEN = { corps: 6, signature: 4 };
const NOUVEAU = { corps: 8, signature: 8 };

/** Fabrique un code valable `heures` heures. Seize signes, format du 28 octobre 2026. */
export function creerCode(heures: number) {
  const expiration = Math.floor(Date.now() / 60000) - ORIGINE + Math.round(heures * 60);
  const nonce = [...randomBytes(4)].map((o) => ALPHABET[o % 32]).join("");
  const corps = encode(expiration, 4) + nonce;
  return corps + signature(corps, NOUVEAU.signature);
}

/** La longueur d'un code neuf, pour l'écrire à l'écran sans la deviner. */
export const LONGUEUR_CODE = NOUVEAU.corps + NOUVEAU.signature;

export type Verdict = { ok: true; maitre: boolean } | { ok: false; raison: "absent" | "invalide" | "expire" | "epuise" };

const compteurs = new Map<string, number>();
const MAX_QUESTIONS = nombreDeLEnvironnement(process.env.BIA_MAX_QUESTIONS, 15, "BIA_MAX_QUESTIONS");

/** Audio chunks, transcription and diagnostics authenticate with compter=false.
 * Only a conversational answer consumes a question, never its technical requests. */
export function verifierCode(brut: string | null, compter=true): Verdict {
  const code = (brut || "").toUpperCase().replace(/[^A-Z0-9]/g, "");
  if (!code) return { ok: false, raison: "absent" };

  const maitre = (process.env.BIA_CODE_MAITRE || "").toUpperCase().replace(/[^A-Z0-9]/g, "");
  if (maitre && code === maitre) return { ok: true, maitre: true };

  const forme = code.length === LONGUEUR_CODE ? NOUVEAU : code.length === 10 ? ANCIEN : null;
  if (!secret() || !forme) return { ok: false, raison: "invalide" };
  const corps = code.slice(0, forme.corps);
  if ([...corps].some((c) => !ALPHABET.includes(c))) return { ok: false, raison: "invalide" };
  if (signature(corps, forme.signature) !== code.slice(forme.corps)) return { ok: false, raison: "invalide" };

  const expiration = decode(corps.slice(0, 4)) + ORIGINE;
  if (Math.floor(Date.now() / 60000) > expiration) return { ok: false, raison: "expire" };

  const utilise = (compteurs.get(code) || 0) + (compter ? 1 : 0);
  if (utilise > MAX_QUESTIONS) return { ok: false, raison: "epuise" };
  if(compter)compteurs.set(code, utilise);
  return { ok: true, maitre: false };
}

/** Refuse a new session at the quota, while allowing audio for the last answer. */
export function verifierEntree(brut:string|null):Verdict{
 const verdict=verifierCode(brut,false);
 if(!verdict.ok||verdict.maitre)return verdict;
 const code=(brut||'').toUpperCase().replace(/[^A-Z0-9]/g,'');
 return (compteurs.get(code)||0)>=MAX_QUESTIONS?{ok:false,raison:'epuise'}:verdict;
}
