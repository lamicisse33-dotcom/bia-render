import { pourLaVoix, enLettres } from "./nombres";

/** Spoken rendering only: the transcript retains its original spelling/numbers. */
export function texteKhalamVoix(texte: string): string {
  let t = texte.normalize("NFC");
  // Resolve clocks before generic numbers; say leading-zero minutes naturally.
  t = t.replace(/\b([01]?\d|2[0-3])\s*[hH:]\s*([0-5]\d)\b/g, (_, h, m) =>
    `${enLettres(Number(h))} heure${Number(h) === 1 ? "" : "s"}${Number(m) ? ` ${enLettres(Number(m))}` : ""}`);
  t = t.replace(/\b([01]?\d|2[0-3])\s*[hH]\b/g, (_, h) => `${enLettres(Number(h))} heure${Number(h) === 1 ? "" : "s"}`);
  t = t.replace(/(^|[\s(])-(?=\d)/g, "$1moins ");
  t = pourLaVoix(t, "fr");
  // Phone numbers and identifiers deliberately protected by pourLaVoix must
  // still reach the multilingual voice as French words, never ambiguous digits.
  return t.replace(/\d/g, c => ` ${enLettres(Number(c))} `).replace(/\s+/g, " ").trim();
}
