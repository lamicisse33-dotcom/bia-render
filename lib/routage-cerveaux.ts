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
