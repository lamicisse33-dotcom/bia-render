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
 return out;
}
