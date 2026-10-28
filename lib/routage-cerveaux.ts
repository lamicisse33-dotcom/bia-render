import {questionQuiMeriteraitReflexion} from './reflechir';
import {normaliser} from './normaliser';

/** Keep Haiku on short, low-risk turns where a second classification call
 * would cost more time than it saves. Learned Wolof, translations, actions,
 * calculations, comparisons, and long/context-heavy requests stay on Sonnet. */
export function choisirModeleConversation(question:string, options:{apprentissage?:boolean;avecOutil?:boolean;modeleConfigure:string;profil?:string|null}){
 const {apprentissage=false,avecOutil=false,modeleConfigure,profil}=options;
 if(profil==='sonnet'||profil==='sonnet-segment-1500')return 'claude-sonnet-5-5';
 if(profil==='haiku'||profil==='haiku-optimise')return 'claude-haiku-5-5';
 if(modeleConfigure!=='claude-sonnet-5-5'||apprentissage||avecOutil)return modeleConfigure;
 const q=normaliser(question);
 if(!q||questionQuiMeriteraitReflexion(question,apprentissage))return modeleConfigure;
 const mots=q.split(/\s+/).filter(Boolean);
 if(mots.length>12||/\d/.test(q))return modeleConfigure;
 if(/\b(traduis|traduction|traduire|comment on dit|comment tu dis|en wolof|en francais|reformule|corrige|memorise|souviens toi|cherche|trouve|calcule|combien|prix|argent|sante|medicament|contrat|envoie|reserve|achete|vends|dois je|je dois|il faut)\b/.test(q))return modeleConfigure;
 return 'claude-haiku-5-5';
}

/* ── UN CERVEAU À PART POUR LA FENÊTRE ÉCRITE ──────────────────────────────

   Lamine, le 27 octobre 2026 : « le moteur Khalam ne marche pas, actuellement
   il y a un problème du serveur d'hébergement. Si on peut avoir un moteur
   local qui comprend le texte sans entraînement, ou un petit moteur juste
   pour la fenêtre de discussion texte uniquement, ce serait préférable. »

   `BIA_LLM_PROVIDER` est GLOBALE : la changer changerait aussi sa voix. Cette
   règle-ci ne s'applique qu'aux tours venus de la fenêtre écrite, reconnus
   par le drapeau `ecrit` que cette fenêtre pose elle-même.

   DEUX INTERDITS, ET ILS SONT ÉPROUVÉS :
   — un tour PARLÉ ne voit jamais la variable de la fenêtre écrite ;
   — une variable absente, vide ou faite d'espaces ne change RIEN : on
     retombe sur le cerveau global, donc sur le comportement d'avant. */
export function cerveauDuTour(options: { ecrit?: boolean; global?: string; pourLEcrit?: string }): string {
  const { ecrit = false, global = "", pourLEcrit = "" } = options;
  const ordinaire = (global || "anthropic").toLowerCase().trim() || "anthropic";
  if (!ecrit) return ordinaire;
  const choisi = (pourLEcrit || "").toLowerCase().trim();
  return choisi || ordinaire;
}

/* ── ET SI LE CERVEAU DE L'ÉCRIT N'A PAS SA CLÉ ─────────────────────────────

   Lamine, le 28 octobre 2026 au soir : « si la clé manque, dis-moi laquelle
   poser ; en attendant, REPLI AUTOMATIQUE sur le cerveau ordinaire pour que
   l'écrit réponde toujours. »

   Sans ce repli, poser `BIA_LLM_PROVIDER_ECRIT=gemini` sans poser la clé qui
   va avec rendait la fenêtre écrite DÉFINITIVEMENT muette d'une seule
   variable — une phrase de panne à la place de chaque réponse. C'est trop
   facile à faire pour que ce soit permis.

   On ne replie QUE la fenêtre écrite, et seulement vers le cerveau ordinaire.
   La voix n'est jamais concernée : elle ne porte pas le drapeau `ecrit`.
   Et un repli n'est pas silencieux — il est compté et nommé dans /api/etat,
   pour que « ça répond » ne cache pas « ça ne répond pas avec ce que tu
   croyais ». */
const replis = { tours_ecrits: 0, replis: 0, voulu: "", motif: "", dernier: "" };

export function resumeCerveauEcrit() {
  return {
    ...replis,
    variable: "BIA_LLM_PROVIDER_ECRIT",
    limite: "Des noms de cerveaux et des comptes. Aucune question, aucun texte, aucune clé.",
  };
}

export function cerveauDeLEcrit(options: {
  ecrit?: boolean; global?: string; pourLEcrit?: string; aLaCle: (fournisseur: string) => boolean;
}): { fournisseur: string; repli: null | { voulu: string; motif: "cle_absente" } } {
  const { ecrit = false, global = "", pourLEcrit = "", aLaCle } = options;
  const ordinaire = cerveauDuTour({ ecrit: false, global });
  const voulu = cerveauDuTour({ ecrit, global, pourLEcrit });
  if (ecrit) replis.tours_ecrits += 1;
  /* Rien de choisi à part, ou la clé est là : on ne touche à rien. Et on ne
     replie jamais vers un cerveau qui n'a pas sa clé non plus — ça
     remplacerait une panne par la même panne, en cachant la première. */
  if (voulu === ordinaire || aLaCle(voulu) || !aLaCle(ordinaire)) return { fournisseur: voulu, repli: null };
  replis.replis += 1;
  replis.voulu = voulu;
  replis.motif = "cle_absente";
  replis.dernier = new Date().toISOString();
  return { fournisseur: ordinaire, repli: { voulu, motif: "cle_absente" } };
}
