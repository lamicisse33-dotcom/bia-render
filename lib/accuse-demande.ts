import {salutationReconnue} from './salutations-dialogue';
import {identiteReconnue} from './identite-core';
/** A verification acknowledgement is for a concrete information request.
 * Ordinary dialogue, name questions and greetings have their own replies. */
export function accuseDemandePertinent(question:string){
 if(identiteReconnue(question)||salutationReconnue(question))return false;
 const q=question.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[’']/g,' ').replace(/[^a-z0-9ñ ]/g,' ').replace(/\s+/g,' ').trim().replace(/^bia /,'');
 if(/\b(?:ton avis|tu en penses|tu penses|tu crois|tu m aimes|tu vas bien|tu es la|ma copine|ma femme|mon mari|je suis triste|je suis fatigue|je me sens)\b/.test(q))return false;
 if(/^(?:(?:peux tu|pourrais tu|tu peux) )?(?:cherche|recherche|verifie|trouve|calcule|traduis|resume|explique|renseigne)(?:r)?\b/.test(q))return true;
 return /^(?:quel(?:le)?s? (?:est|sont)|combien|qui (?:est|a)|quand|ou (?:est|sont|se trouve|trouver)|comment (?:faire|fonctionne|obtenir|calculer|aller)|pourquoi (?:le|la|les|un|une|on)|qu est ce que (?:le|la|les)|est ce que (?:le|la|les)|lan mooy|lu tax|fan la|kan|naata)\b/.test(q);
}
