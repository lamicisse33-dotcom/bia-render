/* Ce que BIA a répondu comme émotion, ces derniers échanges.

   Même raison que lib/panne.ts et lib/attentes-vues.ts : ce qu'on ne peut pas
   voir, on ne peut pas le corriger. « Elle a fait le geste mais le rire n'est
   pas venu » a deux causes possibles, et on ne peut pas les distinguer depuis
   le canapé : ou bien elle a choisi « rire » quand on attendait « fourire »,
   ou bien elle a bien choisi « fourire » et c'est le son qui n'est pas sorti.

   Une ligne par réponse, gardée en mémoire vive. Rien de la conversation n'y
   passe : l'émotion, et les premiers mots de la réponse pour s'y retrouver. */

export type Vue = { emotion: string; balise: boolean; debut: string; quand: string };

/* Les douze visages qu'elle a. La liste vit ici, avec tout ce qui touche à
   l'émotion, et la route l'importe. */
export const EMOTIONS = new Set(["neutre", "douce", "joie", "rire", "fourire", "etonnement", "surprise", "ecoute", "concernee", "triste", "malice", "pensive"]);

/* ── ELLE VOIT SA PROPRE BALISE ─────────────────────────────────────────────

   20 septembre 2026, 23:12, /api/etat sur f642682 : le modèle (claude-sonnet-5)
   refuse l'amorce — « This model does not support assistant message prefill.
   The conversation must end with a user message. » Mot pour mot. L'amorce
   est donc morte pour ce modèle, et il reste le défaut de départ : douze
   « neutre » sur douze, onze sans balise.

   La cause, elle, n'a pas changé : le fil qu'on lui renvoie contient ses
   réponses d'avant NETTOYÉES de leur balise, et il imite ce qu'il voit. C'est
   exactement le défaut du 16 septembre avec ses gestes (« elle dit qu'elle
   n'écrit rien ») — et la même réparation : le téléphone range l'émotion
   avec la phrase, et on la lui remet sous les yeux, en première ligne, là
   où on lui demande de l'écrire. Quand il a posé la balise une fois, il la
   revoit à chaque tour, et l'imitation joue enfin dans le bon sens.

   ON NE REMET QUE CE QU'IL A VRAIMENT ÉCRIT : une réponse sans balise reste
   sans balise dans le fil. Lui fabriquer des « neutre » qu'il n'a pas
   choisis, ce serait lui apprendre le neutre. */
export function avecSaBalise(role: string, texte: string, emotion?: string): string {
  const e = String(emotion || "").toLowerCase();
  if (role !== "assistant" || !EMOTIONS.has(e)) return texte;
  if (/^\s*\[{1,2}\s*[ée]motion/i.test(texte)) return texte;
  return `[[emotion:${e}]]\n${texte}`;
}

/* L'amorce (un début de réponse en rôle assistant) n'est envoyée que si on
   l'a demandée exprès : claude-sonnet-5 la refuse, et chaque essai coûte un
   aller-retour au premier tour après un redémarrage. Un modèle qui l'accepte
   la ferait vivre avec BIA_AMORCE_EMOTION=1 — voir app/api/chat/route.ts. */
export function amorcePermise() { return process.env.BIA_AMORCE_EMOTION === "1"; }

const GARDEES = 30;
let vues: Vue[] = [];

/* ── L'AMORCE, ET CE QUE LE MODÈLE EN A FAIT ────────────────────────────────

   20 septembre 2026 au soir. L'amorce d'émotion (un début de réponse
   « [[emotion: » envoyé en rôle assistant, voir app/api/chat/route.ts) est
   partie en production ; juste après, Lamine : « elle n'arrête pas de dire
   que mon moteur ne répond pas ». Un début de réponse d'assistant est un
   réglage que TOUS les modèles n'acceptent pas — et s'il est refusé, la route
   d'alors le renvoyait tel quel dans la reprise, qui échouait pareil.

   Donc : on compte les amorces envoyées, et dès que le modèle en refuse une
   (400 dont le motif la nomme), on cesse de l'envoyer pour de bon sur ce
   serveur, et /api/etat le dit en toutes lettres. Ça ne se devine pas depuis
   le canapé, et ça ne doit jamais rendre BIA muette. */
let amorcesEnvoyees = 0;
let amorceRefuseeMotif = "";

export function noterAmorceEnvoyee() { amorcesEnvoyees++; }
export function noterAmorceRefusee(motif: string) { amorceRefuseeMotif = String(motif || "refusée").slice(0, 200); }
/* Un 400 dont le motif ne nomme pas l'amorce, mais reçu avec elle : on ne
   sait pas. Trois de suite, et on cesse quand même — mieux vaut perdre
   l'émotion qu'un aller-retour à chaque tour. Un 400 sans amorce n'est pas
   compté ici : il ne dit rien sur elle. */
let refusAvecAmorce = 0;
export function noterRefusAvecAmorce(motif: string) {
  refusAvecAmorce++;
  if (refusAvecAmorce >= 3 && !amorceRefuseeMotif) noterAmorceRefusee(`3 refus (400) de suite avec l'amorce — ${motif}`);
}
export function amorceRefusee() { return Boolean(amorceRefuseeMotif); }
export function resumeAmorce() {
  return { envoyees: amorcesEnvoyees, refus_400_avec: refusAvecAmorce, refusee: amorceRefuseeMotif || null };
}

export function noterEmotion(emotion: string, reponse: string, balise = false) {
  const entree: Vue = {
    emotion: String(emotion || "neutre"),
    /* La balise était-elle là ? « neutre » sans balise veut dire que le
       modèle l'a oubliée ou qu'elle a été coupée ; « neutre » avec balise
       veut dire qu'elle a vraiment choisi neutre. Deux pannes très
       différentes, et sans ce booléen elles se ressemblent. */
    balise: Boolean(balise),
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
  const sansBalise = vues.filter((v) => !v.balise).length;
  return { echanges: vues.length, compte, sans_balise: sansBalise, amorce: resumeAmorce(), dernieres: vues.slice(-5) };
}
