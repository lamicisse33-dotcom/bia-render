import {passagesLanguesVoix,type LangueVoix,type PassageVoix} from "./langue";
import {texteKhalamVoix} from "./texte-khalam-voix";
import {prononciationsApprises,lireLecons} from "./lexique-apprentissage";
import {decouperVoixKhalam} from "./decoupage-voix-khalam";
import {segmentsLecture} from "./lecture-continue";

/** Detect on original spelling; a phonetic correction must never change the profile. */
export async function preparerPassagesKhalam(texte:string, defaut:LangueVoix="wo", lecture=false):Promise<PassageVoix[]> {
  const out:PassageVoix[]=[];
  // Re-read the existing persistent lexicon before each synthesis preparation.
  const lecons=await lireLecons(true);
  const wave=lecons.find(l=>l.langue==="fr"&&l.texte.toLowerCase()==="wave");
  const emprunts=wave&&wave.statut==="validé"?[wave.texte,"bus"]:["Wave","bus"];
  for(const passage of passagesLanguesVoix(texte,defaut,emprunts)){
    const prononce=await prononciationsApprises(texteKhalamVoix(passage.texte),passage.langue);
    for(const morceau of lecture?segmentsLecture(prononce):decouperVoixKhalam(prononce))
      if(morceau.trim())out.push({texte:morceau,langue:passage.langue});
  }
  return out;
}
