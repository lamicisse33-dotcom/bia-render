import {REPERTOIRE} from "./repertoire-textes";
import {SALUTATIONS} from "./services-textes";
import {sonne} from "./normaliser";

// Only a whole greeting releases the thematic lesson. A greeting followed by
// a problem still belongs to the lesson; yes/no answers must keep its context.
const entrees=REPERTOIRE.filter(e=>SALUTATIONS.has(e.cle));
const formes=new Map(entrees.flatMap(e=>e.formes.map(f=>[sonne(f),e] as const)));
for(const [cle,variantes] of Object.entries({salut:['hello','hey','bonjour à toi','bonjour à vous','salut à toi','salam aleykoum','assalamou aleykoum','as salam aleykoum'],'ca-va':['comment ça va','comment allez-vous','tu vas bien','vous allez bien']})){
 const entree=entrees.find(e=>e.cle===cle);if(entree)for(const forme of variantes)formes.set(sonne(forme),entree);
}
export function salutationReconnue(question:string){
 const q=sonne(question).replace(/\b(?:abia|rara)\b/g,' ').replace(/\s+/g,' ').trim();
 const exacte=formes.get(q);if(exacte)return exacte;
 // A chain of greetings is still a greeting. Any remaining request keeps
 // the full message in the conversational path ("bonjour, je suis triste").
 let reste=q,derniere:typeof REPERTOIRE[number]|undefined;
 const triees=[...formes.keys()].filter(Boolean).sort((a,b)=>b.length-a.length);
 for(let i=0;i<4&&reste;i++){
  const forme=triees.find(f=>reste===f||reste.startsWith(f+' '));if(!forme)return;
  derniere=formes.get(forme);reste=reste.slice(forme.length).trim();
 }
 return reste?undefined:derniere;
}
export function salutationAutonome(question:string){return !!salutationReconnue(question);}

/** An acknowledgement is only for an explicit action, never a greeting,
 * distress, refusal or a factual question. Nothing is chosen before ASR. */
export function accusePertinent(question:string){
 const q=String(question).toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[’']/g,' ').replace(/[^a-z0-9 ]/g,' ').replace(/\s+/g,' ').trim();
 return /^(?:(?:bia )?(?:peux tu |tu peux |pourrais tu )?)?(?:cherche|recherche|verifie|trouve|lis|traduis|calcule|resume)(?:r)?\b/.test(q)&&!salutationAutonome(question);
}

/** Only discard complete, known greeting exchanges from a routing-cache key.
 * Keep health/family information, names, refusals and every unknown response. */
export function sansSalutationsInitiales<T extends {role:string;text:string}>(history:T[]):T[]{
 let i=0;
 while(i+1<history.length){
  const a=history[i],b=history[i+1];
  if(a.role!=="user"||!["bia","assistant"].includes(b.role))break;
  const e=REPERTOIRE.find(e=>SALUTATIONS.has(e.cle)&&e.formes.some(f=>sonne(f)===sonne(a.text)));
  if(!e||![e.wolof,e.francais].some(t=>sonne(t)===sonne(b.text)))break;
  i+=2;
 }
 return history.slice(i);
}
