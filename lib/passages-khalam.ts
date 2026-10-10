import {passagesLanguesVoix,type LangueVoix,type PassageVoix} from "./langue";
import {texteKhalamVoix} from "./texte-khalam-voix";
import {prononciationsApprises} from "./lexique-apprentissage";
import {decouperVoixKhalam} from "./decoupage-voix-khalam";
import {segmentsLecture} from "./lecture-continue";

/** Detect on original spelling; a phonetic correction must never change the profile. */
export async function preparerPassagesKhalam(texte:string, defaut:LangueVoix="wo", lecture=false):Promise<PassageVoix[]> {
  const out:PassageVoix[]=[];
  for(const passage of passagesLanguesVoix(texte,defaut)){
    const prononce=await prononciationsApprises(texteKhalamVoix(passage.texte),passage.langue);
    for(const morceau of lecture?segmentsLecture(prononce):decouperVoixKhalam(prononce))
      if(morceau.trim())out.push({texte:morceau,langue:passage.langue});
  }
  return out;
}
