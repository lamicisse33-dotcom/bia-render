import {transcrire,type Ecoute} from './ecoute';
import {motsCorriges} from './lexique';
import {pourScribe} from './mots-a-entendre';
import {corrigerTranscription,lireCorrectionsTranscription,phrasesLexiqueComplet} from './correction-transcription';
import {salutationReconnue} from './salutations-dialogue';

export type TempsEcoute = {total_ms:number; reconnaissance_ms:number; vocabulaire_ms:number; correction_apres_reconnaissance_ms:number; salutation:boolean;references_ms:number;comparaison_ms:number;references_pretes:boolean};
const g=globalThis as typeof globalThis & {biaPreparationEcoute?:{appels:number;dernier:TempsEcoute|null;diagnostic:unknown}};
const etat=g.biaPreparationEcoute??={appels:0,dernier:null,diagnostic:null};
export const resumePreparationEcoute=()=>({...etat});
export const noterDiagnosticEcoute=(bilan:unknown)=>{etat.diagnostic=bilan;};

/** Corrections load during recognition. Hints load only for a provider using them. */
export async function preparerEcoute(audio:Blob,nom:string,indice:string|null,recoAnticipee?:Ecoute|null){
 const debut=Date.now();let vocabulaire_ms=0,references_ms=0,comparaison_ms=0,references_pretes=false;
 const corrections=lireCorrectionsTranscription().catch(()=>null);
 const phrases=phrasesLexiqueComplet().catch(()=>null);
 const reco=recoAnticipee??await transcrire(audio,nom,indice,async()=>{
  const t=Date.now();
  try{
   const [mots,appris]=await Promise.all([motsCorriges(60).catch(()=>[]),phrases.then(p=>p?[...new Set(p.flatMap(s=>[s,...s.match(/[\p{L}\p{M}'’-]{3,}/gu)||[]]))]:[])]);
   return [...new Set([...pourScribe(mots),...appris])];
  }finally{vocabulaire_ms=Date.now()-t;}
 });
 const reconnu=Date.now();
 let ecriture={texte:String(reco.texte||''),texte_brut:String(reco.texte||''),corrections_transcription:[] as Array<{entendu:string;corrige:string}>,suggestions_ecriture:[] as string[]};
 let correction_disponible=true;
 try{
  const regles=await corrections;if(!regles)throw Error('Corrections indisponibles');
  const recherche=Date.now();let timer:ReturnType<typeof setTimeout>|undefined;
  // Fuzzy hints are optional. Exact owner rules still apply before replying.
  const references=await Promise.race([phrases,new Promise<null>(r=>{timer=setTimeout(()=>r(null),120);})]);
  if(timer)clearTimeout(timer);references_ms=Date.now()-recherche;references_pretes=references!==null;
  const comparaison=Date.now();ecriture=await corrigerTranscription(ecriture.texte,regles,Promise.resolve(references||[]),80);comparaison_ms=Date.now()-comparaison;
 }catch{correction_disponible=false;}
 const chronometrage:TempsEcoute={total_ms:Date.now()-debut,reconnaissance_ms:reconnu-debut,vocabulaire_ms,correction_apres_reconnaissance_ms:Date.now()-reconnu,salutation:!!salutationReconnue(ecriture.texte),references_ms,comparaison_ms,references_pretes};
 etat.appels++;etat.dernier=chronometrage;
 return {reco,ecriture,correction_disponible,chronometrage};
}
