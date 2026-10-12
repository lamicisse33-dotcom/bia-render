import {REPERTOIRE} from "./repertoire-textes";
import {SALUTATIONS} from "./services-textes";
import {sonne} from "./normaliser";

// Only a whole greeting releases the thematic lesson. A greeting followed by
// a problem still belongs to the lesson; yes/no answers must keep its context.
const formes=new Set(REPERTOIRE.filter(e=>SALUTATIONS.has(e.cle)).flatMap(e=>e.formes.map(sonne)).filter(Boolean));
export function salutationAutonome(question:string){return formes.has(sonne(question));}

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
