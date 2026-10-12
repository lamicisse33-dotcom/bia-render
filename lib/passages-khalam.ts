import type {LangueVoix} from './langue';
import {lireLecons} from './lexique-apprentissage';
import {reglesPrononciation} from './prononciation';
import {preparerAvecRegles} from './passages-khalam-core';
/** One lexicon snapshot for the entire utterance, including French borrowings. */
export async function preparerPassagesKhalam(texte:string,defaut:LangueVoix='wo',lecture=false,lectureFiable=false){
 const [lecons,regles]=await Promise.all([lireLecons(true),reglesPrononciation()]);
 return preparerAvecRegles(texte,defaut,lecons,regles,lecture,lectureFiable);
}
