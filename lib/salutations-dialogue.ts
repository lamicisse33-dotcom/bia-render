import {REPERTOIRE} from "./repertoire-textes";
import {SALUTATIONS} from "./services-textes";
import {sonne} from "./normaliser";

// Only a whole greeting releases the thematic lesson. A greeting followed by
// a problem still belongs to the lesson; yes/no answers must keep its context.
const formes=new Set(REPERTOIRE.filter(e=>SALUTATIONS.has(e.cle)).flatMap(e=>e.formes.map(sonne)).filter(Boolean));
export function salutationAutonome(question:string){return formes.has(sonne(question));}
