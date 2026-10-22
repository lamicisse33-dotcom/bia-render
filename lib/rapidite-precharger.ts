import {motsCorriges} from './lexique';
import {contexteInstructions} from './instructions-apprentissage';
import {indexDialogue} from './dialogue-devoirs';
import {catalogueAudioMemoire} from './audio-memoire';
import {anticiperLexiqueVoix} from './anticipation-lexique-voix';
import {noterPrechargementRapidite} from './rapidite-etat';
import {preparerMemoireCommune} from './memoire-organisee';
let enCours: Promise<void> | null = null;
/** The normal readers retain their own revision checks and TTLs. No lesson,
 * recording or memory is written and ASR never awaits this preparation. */
export function prechargerPendantEcoute() {
  if (enCours) return;
  const debut = Date.now(); anticiperLexiqueVoix();
  enCours = Promise.allSettled([motsCorriges(), contexteInstructions(), indexDialogue(), catalogueAudioMemoire(), preparerMemoireCommune()])
    .then(r => {noterPrechargementRapidite({ms: Date.now()-debut, lectures_reussies: r.filter(x=>x.status==='fulfilled').length, quand: new Date().toISOString()});})
    .finally(()=>{enCours=null;});
}
