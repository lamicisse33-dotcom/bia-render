import {passagesLanguesVoix,type LangueVoix,type PassageVoix} from "./langue";
import {texteKhalamVoix} from "./texte-khalam-voix";
import {prononciationsApprises,lireLecons} from "./lexique-apprentissage";
import {decouperVoixKhalam} from "./decoupage-voix-khalam";
import {segmentsLecture,segmentsLectureWolof} from "./lecture-continue";

/** Detect on original spelling; a phonetic correction must never change the profile. */
export async function preparerPassagesKhalam(texte:string, defaut:LangueVoix="wo", lecture=false, lectureFiable=false):Promise<PassageVoix[]> {
  const out:PassageVoix[]=[];
  // Re-read the existing persistent lexicon before each synthesis preparation.
  const lecons=await lireLecons(true);
  const emprunts=[...new Set(["Wave","bus",...lecons.filter(l=>l.langue==="fr"&&l.statut==="validé").map(l=>l.texte)])];
  for(const passage of passagesLanguesVoix(texte,defaut,emprunts)){
    const prononce=await prononciationsApprises(texteKhalamVoix(passage.texte),passage.langue);
    const morceaux=lectureFiable&&passage.langue==="wo"?segmentsLectureWolof(prononce):lecture?segmentsLecture(prononce):decouperVoixKhalam(prononce);
    for(const morceau of morceaux)
      if(morceau.trim())out.push({texte:morceau,langue:passage.langue});
  }
  return out;
}
