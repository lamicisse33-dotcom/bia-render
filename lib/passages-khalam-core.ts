import {passagesLanguesVoix,type LangueVoix,type PassageVoix} from './langue';
import {texteKhalamVoix} from './texte-khalam-voix';
import {appliquerRegles,reglesLeconsMixtes,type Lecon} from './lexique-apprentissage-core';
import {decouperVoixKhalam} from './decoupage-voix-khalam';
import {segmentsLecture,segmentsLectureWolof} from './lecture-continue';
export function preparerAvecRegles(texte:string,defaut:LangueVoix,lecons:Lecon[],anciennes:Array<{mot:string;dire:string}>,lecture=false,lectureFiable=false):PassageVoix[]{
 const out:PassageVoix[]=[];
 const emprunts=[...new Set(['Wave','bus',...lecons.filter(l=>l.langue==='fr'&&l.statut==='validé').map(l=>l.texte)])];
 const wolof=lecons.filter(l=>l.langue==='wo'&&l.statut==='validé').map(l=>l.texte);
 for(const passage of passagesLanguesVoix(texte,defaut,emprunts,wolof)){
  const prononce=appliquerRegles(texteKhalamVoix(passage.texte),reglesLeconsMixtes(lecons,passage.langue,anciennes));
  const morceaux=lectureFiable&&passage.langue==='wo'?segmentsLectureWolof(prononce):lecture?segmentsLecture(prononce):decouperVoixKhalam(prononce);
  for(const morceau of morceaux)if(morceau.trim())out.push({texte:morceau,langue:passage.langue});
 }
 return lierBiFinal(out);
}

/** Speech planning only: keep a final /bi/ beside its French noun rather than
 * asking the Wolof model to generate a whole clip from this one syllable.
 * Other Wolof words and learned phonetic corrections keep their own profile. */
export function lierBiFinal(passages:PassageVoix[]):PassageVoix[]{
 const out:PassageVoix[]=[];
 for(const [i,p] of passages.entries()){
  const precedent=out.at(-1);
  const fin=/[.!?…]\s*$/u.test(p.texte)||i===passages.length-1;
  if(fin&&p.langue==='wo'&&/^\s*bi[.!?…]*\s*$/iu.test(p.texte)
     &&precedent?.langue==='fr'&&!/[.!?…:;]\s*$/u.test(precedent.texte)){
   const espace=/\s$/u.test(precedent.texte)||/^\s/u.test(p.texte)?'':' ';
   precedent.texte+=espace+p.texte;
  }else out.push({...p});
 }
 return out;
}
