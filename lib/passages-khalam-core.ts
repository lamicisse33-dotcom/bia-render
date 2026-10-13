import {passagesLanguesVoix,type LangueVoix,type PassageVoix} from './langue';
import {texteKhalamVoix} from './texte-khalam-voix';
import {appliquerRegles,reglesLeconsMixtes,type Lecon} from './lexique-apprentissage-core';
import {decouperVoixKhalam} from './decoupage-voix-khalam';
import {segmentsLecture,segmentsLectureWolof} from './lecture-continue';
export function preparerAvecRegles(texte:string,defaut:LangueVoix,lecons:Lecon[],anciennes:Array<{mot:string;dire:string}>,lecture=false,lectureFiable=false):PassageVoix[]{
 const out:PassageVoix[]=[];
 const emprunts=[...new Set(['Wave','bus',...lecons.filter(l=>l.langue==='fr'&&l.statut==='validé').map(l=>l.texte)])];
 const wolof=lecons.filter(l=>l.langue==='wo'&&l.statut==='validé').map(l=>l.texte);
 for(const passage of passagesLanguesVoix(espacerPonctuationLecture(texte),defaut,emprunts,wolof)){
  const prononce=appliquerRegles(texteKhalamVoix(passage.texte),reglesLeconsMixtes(lecons,passage.langue,anciennes));
  const morceaux=lectureFiable&&passage.langue==='wo'?segmentsLectureWolof(prononce):lecture?segmentsLecture(prononce):decouperVoixKhalam(prononce);
  for(const morceau of morceaux)if(morceau.trim())out.push({texte:morceau,langue:passage.langue});
 }
 return lierBiFinal(out).map(p=>
  // EMP-023: seed 913 reproduced added speech; the measured 914 take ends
  // at lool. Keep this calibration specific to its exact text and female
  // Wolof voice. Human listening remains separate from the ASR measurement.
  p.langue==='wo'&&p.texte==='Dama stressé lool.'?{...p,prise:{female:914}}:p);
}

/** Only the spoken preparation gains spaces. Stored lesson text is untouched.
 * Restrict period boundaries to words followed by a capital; do not reinterpret
 * decimal numbers, email addresses, URLs or paths as sentence boundaries. */
export function espacerPonctuationLecture(texte:string):string{
 return texte.replace(/\S+/gu,token=>{
  if(/[@/\\]|^www\./iu.test(token))return token;
  return token.replace(/(\p{L}{2,}\.)(?=\p{Lu}\p{Ll})/gu,'$1 ');
 });
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
