import {normaliser} from './normaliser';
import {REPERTOIRE} from './repertoire-textes';
const nom=REPERTOIRE.find(e=>e.cle==='ton-nom')!;
const formes=new Set([...nom.formes,'comment t appelles tu','comment vous appelez vous','comment tu t appelle','tu t appelles comment','ton nom c est quoi','quel est votre nom'].map(normaliser));
/** Match an entire name question, preserving real requests and quotations. */
export function identiteReconnue(question:string){
 const q=normaliser(question).replace(/^(?:bonjour|salut|bonsoir)\s+/,'').replace(/^(?:rara|abia)\s+/,'');
 if(!formes.has(q))return null;
 const langue:'fr'|'wo'=/\b(comment|quel|ton|votre|tu|vous)\b/.test(q)?'fr':'wo';
 return {reply:langue==='fr'?nom.francais:nom.wolof,langue,emotion:'douce',source:'identité Bia',identite:true as const};
}
