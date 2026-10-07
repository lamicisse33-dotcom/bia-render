/** BIA échange ici en français et wolof écrits en alphabet latin. */
export function ecritureTranscriptionCompatible(texte: string): boolean {
  return !Array.from(texte).some(c => /\p{Letter}/u.test(c) && !/\p{Script=Latin}/u.test(c));
}
