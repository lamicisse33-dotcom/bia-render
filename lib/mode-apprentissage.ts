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
/** Extract only the dictated phrase, preserving its command prefix. Ordinary
 * conversation and confirmed control commands must not pay a verifier call. */
export function cibleLeconVocale(texte:string,actif:boolean){
 const q=texte.trim(),commande=normaliser(q).replace(/^(?:bia |s il te plait |bon |ok )+/,"").replace(/ s il te plait$/,"");
 if(entrees.has(commande)||sorties.has(commande)||/^(?:(?:voila|tres bien|c est bon|oui) )*(?:memorise|retiens|garde|enregistre|repete|annule|oublie|supprime|stop|silence|non|oui)(?: (?:ca|cela|ceci|cette phrase|cette correction|en memoire|la correction|le micro|stop|memorise|repete|non|oui))?$/.test(commande))return null;
 const m=q.match(/^(?:r[ée]p[èée]te(?:\s+(?:exactement|mot pour mot|avec moi|apr[èe]s moi))?\s*(?::\s*|\s+)|redis exactement\s+|(?:non[,!.]?\s*)?(?:il faut dire|tu dois dire|dis plutôt|la bonne phrase (?:est|c'est)|la correction (?:est|c'est))\s*:\s*|(?:m[ée]morise|retiens|garde(?: en mémoire)?|enregistre)(?:\s+(?:ça|cela|ceci|cette phrase|cette correction))?\s*:\s*)([\s\S]+)$/i);
 if(m){const phrase=m[1].trim();if(!phrase)return null;return {phrase,prefixe:q.slice(0,q.lastIndexOf(m[1])),memorisation:/^(?:m[ée]morise|retiens|garde|enregistre)\b/i.test(q)};}
 return actif?{phrase:q,prefixe:'',memorisation:false}:null;
}
type Tour = {role: string; text?: string; content?: string};
/** Only the owner's last contribution is eligible, never a model's invention.
 * The web client includes the current command in history: ignore it once. */
function phraseDuContexte(history: Tour[], question: string): string {
  const users = history.filter(t => t.role === "user");
  const contenu = (t: Tour) => String(t.text ?? t.content ?? "").trim();
  if (users.length && normaliser(contenu(users[users.length-1])) === normaliser(question)) users.pop();
  const dernier = users.at(-1);
  if (!dernier) return "";
  let phrase = contenu(dernier);
  // A request to begin teaching or an acknowledgement is not the taught content.
  if (!phrase || /^(?:bonjour|salut|merci|ok|d accord|oui|non|tres bien|c est bon|parfait)$/.test(normaliser(phrase))
    || /^(?:memorise|retiens|garde|enregistre|repete|corrige|on apprend|je vais|je veux|peux tu|est ce que|qu est ce|comment|pourquoi|dis moi)\b/.test(normaliser(phrase))) return "";
  phrase = phrase.replace(/^(?:non[,!.]?\s*)?(?:il faut dire|tu dois dire|dis plutôt|la bonne phrase (?:est|c'est)|la correction (?:est|c'est))\s*:\s*/i, "");
  return phrase;
}

type Reponse = { reply: string; emotion: string; apprend: boolean; aRepeter: string;
  source: string; retenu?: string; ordre?: string };

export async function executerLecon(input: {
  texte: string; maitre: boolean; actif: boolean; phrase: string; history?: Tour[];
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
  const sansAdresse = texte.replace(/^(?:(?:bia|s[’\']il te plaît|s[’\']il te plait|ok|bon|voilà|très bien)[,!.]?\s+)+/i, "");
  const memoire = sansAdresse.match(/^(?:m[ée]morise|retiens|garde(?: en mémoire)?|enregistre)(?:\s+(?:ça|cela|ceci|cette phrase|cette correction))?\s*:\s*([\s\S]+)$/i)
    ?? sansAdresse.match(/^(?:m[ée]morise|retiens|garde(?: en mémoire)?|enregistre)\s+(?:ceci|cette phrase|que)\s+([\s\S]+)$/i);
  if (repetition) return reponse(repetition[1].trim(), true, repetition[1].trim(), "repete");
  const ordreMemoire = commande.replace(/^(?:(?:voila|tres bien|c est bon|oui) )+/, "");
  const garder = Boolean(memoire)
    || /^(?:memorise|memorisez|memoriser|retiens|retenez|garde|gardez|enregistre) (?:ca|cela|ceci|cette phrase|cette correction|ce que je viens de dire)(?: en memoire)?$/.test(ordreMemoire)
    || /^(?:memorise memorise|retiens retiens|garde garde)$/.test(ordreMemoire)
    || (input.actif && /^(?:memorise|retiens|garde)$/.test(ordreMemoire));
  if (garder) {
    const phrase = memoire ? memoire[1].trim() : input.actif ? input.phrase.trim() : phraseDuContexte(input.history || [], texte);
    if (!phrase) return reponse("Quelle phrase exacte veux-tu que je mémorise, papa ? Dis-moi « mémorise : » suivi de cette phrase.", input.actif, "");
    try {
      await memoriser(phrase);
      return {...reponse(ACCUSES_LECON.memoire, input.actif, input.actif ? phrase : "", "retiens"), retenu: phrase};
    } catch {
      return {...reponse("Je n'ai pas pu mémoriser, papa. Tu peux réessayer.", input.actif, phrase), emotion: "concernee"};
    }
  }
  if (input.actif && /^(?:repete|repete ca|redis le)$/.test(commande)) {
    return reponse(input.phrase || "Dis-moi la phrase à répéter, papa.", true, input.phrase, "repete");
  }
  return null;
}
