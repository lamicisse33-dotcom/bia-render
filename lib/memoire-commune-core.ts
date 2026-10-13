import type {ElementMemoire} from './memoire-organisee';
export type DocumentMemoire={id:string;titre:string;origine:string;texte:string};
/** Merge exact equivalent content, retaining every source. Never conflate a
 * question/answer with a bilingual translation or activate a draft. */
export function fusionnerMemoire(elements:ElementMemoire[]):DocumentMemoire[]{
 const uniques=new Map<string,DocumentMemoire>();
 for(const e of elements){
  if(!e.actif||['audios','prononciations','instructions'].includes(e.famille))continue;
  let texte=e.texte,titre=e.famille;
  try{const r=JSON.parse(e.texte);
   if(e.famille==='fiches'){texte=r.texte;titre=r.titre||titre;}
   if(e.famille==='corrections')texte=JSON.stringify({demande:r.source,reponse_corrigee:r.corrigee,langue:r.langue});
   if(e.famille==='lexique_partage')texte='TRADUCTION VALIDÉE\nFrançais : '+(r.langue_source==='fr'?r.source:r.corrigee)+'\nWolof : '+(r.langue_source==='wo'?r.source:r.corrigee);
   if(e.famille==='biba')texte=JSON.stringify({question_wo:r.question_wo,question_fr:r.question_fr,reponse_wo:r.reponse_wo});
   if(e.famille==='anciennes_lecons')texte='Questions possibles :\n'+JSON.stringify(r.dit)+'\nRéponses enseignées :\n'+JSON.stringify(r.repond);
  }catch{}
  if(typeof texte!=='string'||!texte.trim())continue;
  const cle=texte.trim().replace(/\s+/g,' '),ancien=uniques.get(cle);
  if(ancien){if(!ancien.origine.split(' | ').includes(e.source))ancien.origine+=' | '+e.source;continue;}
  uniques.set(cle,{id:e.id,titre,origine:e.source,texte});
 }
 return [...uniques.values()];
}
