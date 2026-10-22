import {questionQuiMeriteraitReflexion} from './reflechir';
import {normaliser} from './normaliser';

/** Keep Haiku on short, low-risk turns where a second classification call
 * would cost more time than it saves. Learned Wolof, translations, actions,
 * calculations, comparisons, and long/context-heavy requests stay on Sonnet. */
export function choisirModeleConversation(question:string, options:{apprentissage?:boolean;avecOutil?:boolean;modeleConfigure:string;profil?:string|null}){
 const {apprentissage=false,avecOutil=false,modeleConfigure,profil}=options;
 if(profil==='sonnet')return 'claude-sonnet-5-5';
 if(profil==='haiku'||profil==='haiku-optimise')return 'claude-haiku-5-5';
 if(modeleConfigure!=='claude-sonnet-5-5'||apprentissage||avecOutil)return modeleConfigure;
 const q=normaliser(question);
 if(!q||questionQuiMeriteraitReflexion(question,apprentissage))return modeleConfigure;
 const mots=q.split(/\s+/).filter(Boolean);
 if(mots.length>12||/\d/.test(q))return modeleConfigure;
 if(/\b(traduis|traduction|traduire|comment on dit|comment tu dis|en wolof|en francais|reformule|corrige|memorise|souviens toi|cherche|trouve|calcule|combien|prix|argent|sante|medicament|contrat|envoie|reserve|achete|vends|dois je|je dois|il faut)\b/.test(q))return modeleConfigure;
 return 'claude-haiku-5-5';
}
