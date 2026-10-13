import {passagesLanguesVoix,type LangueVoix,type PassageVoix} from './langue';
import {texteKhalamVoix} from './texte-khalam-voix';
import {appliquerRegles,reglesLeconsMixtes,type Lecon} from './lexique-apprentissage-core';
import {decouperVoixKhalam} from './decoupage-voix-khalam';
import {segmentsLecture,segmentsLectureWolof} from './lecture-continue';
export function preparerAvecRegles(texte:string,defaut:LangueVoix,lecons:Lecon[],anciennes:Array<{mot:string;dire:string}>,lecture=false,lectureFiable=false):PassageVoix[]{
 const out:PassageVoix[]=[];
 const emprunts=[...new Set(['Wave','bus',...lecons.filter(l=>l.langue==='fr'&&l.statut==='validé').map(l=>l.texte)])];
 const wolof=lecons.filter(l=>l.langue==='wo'&&l.statut==='validé').map(l=>l.texte);
 for(const passage of lierPossessifWolof(passagesLanguesVoix(espacerPonctuationLecture(texte),defaut,emprunts,wolof))){
  const prononce=appliquerRegles(texteKhalamVoix(passage.texte),reglesLeconsMixtes(lecons,passage.langue,anciennes));
  const morceaux=lectureFiable&&passage.langue==='wo'?segmentsLectureWolof(prononce):lecture?segmentsLecture(prononce):decouperVoixKhalam(prononce);
  for(const morceau of morceaux)if(/[\p{L}\p{N}]/u.test(morceau))out.push({texte:morceau,langue:passage.langue});
 }
 return lierBiFinal(out).map(p=>{
  // Measured female takes for exact spoken groups. The other voice and any
  // future pronunciation correction retain their own default preparation.
  const seed=p.langue==='wo'?new Map([
   ['Dama stressé lool.',914],
   ['Dañu ma ne dossierbi',915],
   ['Dañu ma laaj',914],
  ]).get(p.texte.trim()):undefined;
  return seed===undefined?p:{...p,prise:{female:seed}};
 });
}

/** In mixed speech, the homograph "sa" supplies Wolof possessive context to
 * a preceding isolated Wolof word. BUS-077: "Dëfal sa" avoids the measured
 * hallucination from generating "Dëfal" alone. No crossing sentence boundaries. */
export function lierPossessifWolof(passages:PassageVoix[]):PassageVoix[]{
 const out:PassageVoix[]=[];
 for(const p of passages){
  const precedent=out.at(-1),m=p.langue==='fr'?p.texte.match(/^(\s*sa)(?=\s+\S)/iu):null;
  if(m&&precedent?.langue==='wo'&&/^\s*\p{L}+\s*$/u.test(precedent.texte)){
   precedent.texte+=m[1];out.push({...p,texte:p.texte.slice(m[1].length)});
  }else out.push({...p});
 }
 return out;
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

/** Speech planning only: keep final /bi/, or /bi/ between French spans, beside its noun rather than
 * asking the Wolof model to generate a whole clip from this one syllable.
 * Other Wolof words and learned phonetic corrections keep their own profile. */
export function lierBiFinal(passages:PassageVoix[]):PassageVoix[]{
 const out:PassageVoix[]=[];
 for(let i=0;i<passages.length;i++){
  const p=passages[i];
  const precedent=out.at(-1);
  const suivant=passages[i+1];
  // ADM-035: an isolated medial bi hallucinated "Bi Jala". The measured
  // French borrowing keeps /bi/ between its noun and French continuation.
  if(p.langue==='wo'&&/^\s*bi\s*$/iu.test(p.texte)&&precedent?.langue==='fr'
     &&suivant?.langue==='fr'&&!/[.!?…:;,]\s*$/u.test(precedent.texte)){
   precedent.texte+=(/\s$/u.test(precedent.texte)||/^\s/u.test(p.texte)?'':' ')+p.texte;
   precedent.texte+=(/\s$/u.test(precedent.texte)||/^\s/u.test(suivant.texte)?'':' ')+suivant.texte;
   i++;
   continue;
  }
  const fin=/[.!?…]\s*$/u.test(p.texte)||i===passages.length-1;
  if(fin&&p.langue==='wo'&&/^\s*bi[.!?…]*\s*$/iu.test(p.texte)
     &&precedent?.langue==='fr'&&!/[.!?…:;]\s*$/u.test(precedent.texte)){
   const espace=/\s$/u.test(precedent.texte)||/^\s/u.test(p.texte)?'':' ';
   precedent.texte+=espace+p.texte;
  }else out.push({...p});
 }
 return out;
}
