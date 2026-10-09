/** Correction commands only; payload is never normalised or rewritten. */
export function correctionDuMaitre(texte: string, maitre: boolean): { phrase: string | null } | null {
  if (!maitre) return null;
  const q = texte.trim();
  const exacte = q.match(/^(?:non[,!.]?\s*)?(?:il faut dire|tu dois dire|dis plutôt|la bonne phrase (?:est|c'est)|la correction (?:est|c'est))\s*:\s*([\s\S]+)$/i);
  if (exacte) {
    let phrase = exacte[1].trim();
    if ((phrase.startsWith("«") && phrase.endsWith("»")) || (phrase.startsWith('"') && phrase.endsWith('"'))) phrase = phrase.slice(1, -1).trim();
    return phrase ? { phrase } : { phrase: null };
  }
  const n = q.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9\s]/g, " ").replace(/\s+/g, " ").trim();
  const ordres = [
    "non corrige", "corrige ca", "stop corrige", "c est a corriger", "il faut corriger",
    "non c est mal parle", "c est mal parle", "tu as mal parle", "tu parles mal",
    "tu as mal dit", "je te corrige", "je suis en train de te corriger",
    "je vais te corriger", "je veux te corriger", "je veux t apprendre le wolof",
    "je vais t apprendre le wolof", "on va corriger ton wolof"
  ];
  return ordres.includes(n) ? { phrase: null } : null;
}
