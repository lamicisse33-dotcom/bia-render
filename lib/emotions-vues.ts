/* Ce que BIA a répondu comme émotion, ces derniers échanges.

   Même raison que lib/panne.ts et lib/attentes-vues.ts : ce qu'on ne peut pas
   voir, on ne peut pas le corriger. « Elle a fait le geste mais le rire n'est
   pas venu » a deux causes possibles, et on ne peut pas les distinguer depuis
   le canapé : ou bien elle a choisi « rire » quand on attendait « fourire »,
   ou bien elle a bien choisi « fourire » et c'est le son qui n'est pas sorti.

   Une ligne par réponse, gardée en mémoire vive. Rien de la conversation n'y
   passe : l'émotion, et les premiers mots de la réponse pour s'y retrouver. */

export type Vue = { emotion: string; debut: string; quand: string };

const GARDEES = 30;
let vues: Vue[] = [];

export function noterEmotion(emotion: string, reponse: string) {
  const entree: Vue = {
    emotion: String(emotion || "neutre"),
    debut: String(reponse || "").slice(0, 60),
    quand: new Date().toISOString(),
  };
  vues = [...vues, entree].slice(-GARDEES);
}

/** Le compte par émotion, plus les cinq dernières dans l'ordre. */
export function resumeEmotions() {
  if (!vues.length) return null;
  const compte: Record<string, number> = {};
  for (const v of vues) compte[v.emotion] = (compte[v.emotion] || 0) + 1;
  return { echanges: vues.length, compte, dernieres: vues.slice(-5) };
}
