/** Commands run before the language model, only for an authenticated master.
 * Normalize commands, never the Wolof phrase being taught. Saving is explicit.
 */
export const ACCUSES_LECON = {
  entree: "D'accord papa, mode apprentissage activé.",
  sortie: "D'accord papa, je reviens en mode normal.",
  memoire: "C'est mémorisé, papa.",
} as const;

const normaliser = (s: string) => s.normalize("NFD").replace(/[\u0300-\u036f]/g, "")
  .toLowerCase().replace(/[^a-z0-9 ]/g, " ").replace(/\s+/g, " ").trim();
const entrees = new Set([
  "mode apprentissage", "mets toi en mode apprentissage", "met toi en mode apprentissage",
  "passe en mode apprentissage", "active le mode apprentissage", "active ton mode apprentissage",
  "je veux que tu te mettes en mode apprentissage", "on apprend", "on va apprendre",
  "je vais t apprendre", "repete avec moi", "repete apres moi",
  "apprentissage apprentissage", "corrige corrige",
]);
const sorties = new Set([
  "on a fini d apprendre", "nous avons fini d apprendre", "on a termine d apprendre",
  "on a fini", "c est fini", "fin de la lecon", "on a termine la lecon",
  "la lecon est terminee", "quitte le mode apprentissage", "arrete le mode apprentissage",
  "desactive le mode apprentissage", "reviens en mode normal", "repasse en mode normal",
  "mode normal", "arrete d apprendre", "on arrete", "fini fini", "termine termine",
]);
type Reponse = { reply: string; emotion: string; apprend: boolean; aRepeter: string;
  source: string; retenu?: string; ordre?: string };

export async function executerLecon(input: {
  texte: string; maitre: boolean; actif: boolean; phrase: string;
}, memoriser: (phrase: string) => Promise<void>): Promise<Reponse | null> {
  if (!input.maitre) return null;
  const texte = input.texte.trim();
  if (/^[«"“]/.test(texte)) return null;
  const commande = normaliser(texte).replace(/^(?:bia |s il te plait |bon |ok )+/, "")
    .replace(/ s il te plait$/, "");
  const reponse = (reply: string, apprend: boolean, aRepeter: string, ordre?: string): Reponse =>
    ({reply, apprend, aRepeter, ordre, emotion: "neutre", source: "mode apprentissage maître"});
  if (entrees.has(commande)) return reponse(ACCUSES_LECON.entree, true, "", "apprendre");
  if (sorties.has(commande)) return reponse(ACCUSES_LECON.sortie, false, "", "fini");

  // A colon or an explicit 'avec/après moi' delimits the payload exactly.
  const repetition = texte.match(/^(?:r[ée]p[èée]te(?:\s+(?:avec|apr[èe]s)\s+moi)?\s*:\s*|r[ée]p[èée]te\s+(?:avec|apr[èe]s)\s+moi\s+)([\s\S]+)$/i);
  const memoire = texte.match(/^(?:m[ée]morise|retiens)(?:\s+(?:ceci|cette phrase))?\s*:\s*([\s\S]+)$/i)
    ?? texte.match(/^(?:m[ée]morise|retiens)\s+(?:ceci|cette phrase|que)\s+([\s\S]+)$/i);
  if (repetition) return reponse(repetition[1].trim(), true, repetition[1].trim(), "repete");
  const garder = Boolean(memoire) || (input.actif && /^(?:memorise|retiens|garde)(?: ca)?$/.test(commande));
  if (garder) {
    const phrase = memoire ? memoire[1].trim() : input.phrase.trim();
    if (!phrase) return reponse("Dis-moi d'abord la phrase à mémoriser, papa.", true, "");
    try {
      await memoriser(phrase);
      return {...reponse(ACCUSES_LECON.memoire, true, phrase, "retiens"), retenu: phrase};
    } catch {
      return {...reponse("Je n'ai pas pu mémoriser, papa. Tu peux réessayer.", true, phrase), emotion: "concernee"};
    }
  }
  if (input.actif && /^(?:repete|repete ca|redis le)$/.test(commande)) {
    return reponse(input.phrase || "Dis-moi la phrase à répéter, papa.", true, input.phrase, "repete");
  }
  return null;
}
