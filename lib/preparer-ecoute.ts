import {transcrire} from './ecoute';
import {motsCorriges} from './lexique';
import {pourScribe} from './mots-a-entendre';
import {corrigerTranscription,lireCorrectionsTranscription,vocabulaireAppris} from './correction-transcription';
import {salutationReconnue} from './salutations-dialogue';

export type TempsEcoute = {total_ms:number; reconnaissance_ms:number; vocabulaire_ms:number; correction_apres_reconnaissance_ms:number; salutation:boolean};
const g=globalThis as typeof globalThis & {biaPreparationEcoute?:{appels:number;dernier:TempsEcoute|null;diagnostic:unknown}};
const etat=g.biaPreparationEcoute??={appels:0,dernier:null,diagnostic:null};
export const resumePreparationEcoute=()=>({...etat});
export const noterDiagnosticEcoute=(bilan:unknown)=>{etat.diagnostic=bilan;};

/** Corrections load during recognition. Hints load only for a provider using them. */
export async function preparerEcoute(audio:Blob,nom:string,indice:string|null){
 const debut=Date.now();let vocabulaire_ms=0;
 const corrections=lireCorrectionsTranscription().catch(()=>null);
 const reco=await transcrire(audio,nom,indice,async()=>{
  const t=Date.now();
  try{
   const [mots,appris]=await Promise.all([motsCorriges(60).catch(()=>[]),vocabulaireAppris().catch(()=>[])]);
   return [...new Set([...pourScribe(mots),...appris])];
  }finally{vocabulaire_ms=Date.now()-t;}
 });
 const reconnu=Date.now();
 let ecriture={texte:String(reco.texte||''),texte_brut:String(reco.texte||''),corrections_transcription:[] as Array<{entendu:string;corrige:string}>,suggestions_ecriture:[] as string[]};
 let correction_disponible=true;
 try{
  const regles=await corrections;if(!regles)throw Error('Corrections indisponibles');
  ecriture=await corrigerTranscription(ecriture.texte,regles);
 }catch{correction_disponible=false;}
 const chronometrage:TempsEcoute={total_ms:Date.now()-debut,reconnaissance_ms:reconnu-debut,vocabulaire_ms,correction_apres_reconnaissance_ms:Date.now()-reconnu,salutation:!!salutationReconnue(ecriture.texte)};
 etat.appels++;etat.dernier=chronometrage;
 return {reco,ecriture,correction_disponible,chronometrage};
}
