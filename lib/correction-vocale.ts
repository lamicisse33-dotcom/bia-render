import {cibleLeconVocale} from './mode-apprentissage';
import {correctionDuMaitre} from './correction-maitre';
import {origineValide} from './correction-devoir-core';
import {devoirsALire} from './devoirs-apprentissage';
import {verifierTranscriptionContextuelle} from './transcription-contextuelle';
type Entree={message?:string;parole?:boolean;apprend?:boolean;aRepeter?:string;correctionDevoir?:unknown;origineDevoir?:unknown;history?:unknown;suggestionsTranscription?:string[]};
/** Runs before every teaching shortcut, exclusively on authenticated speech.
 * The verifier never saves. Existing explicit master validation still saves
 * the exact phrase heard and held in aRepeter. */
export async function preparerCorrectionVocale(input:Entree,maitre:boolean,commande:boolean,signal?:AbortSignal){
 if(!maitre||!input.parole)return null;
 const message=String(input.message||'').trim();
 const active=origineValide(input.correctionDevoir)?input.correctionDevoir:null;
 const cible=cibleLeconVocale(message,!!input.apprend||!!active);if(!cible)return null;
 if(commande&&!cible.prefixe)return null;
 if(correctionDuMaitre(message,true)?.phrase===null)return null;
 const references:string[]=[];
 const origine=active||(origineValide(input.origineDevoir)?input.origineDevoir:null);
 if(origine)try{
  const {devoirs}=await devoirsALire(800),d=devoirs.find(d=>d.id===origine.devoir_id);
  if(d?.valide&&d.revision===origine.revision&&d.texte.slice(origine.debut,origine.debut+origine.texte.length)===origine.texte)references.push(origine.texte);
 }catch{ /* A lesson read failure cannot invent or overwrite a correction. */ }
 const history=Array.isArray(input.history)?input.history.filter((t,i,a)=>!(i===a.length-1&&t?.role==='user'&&typeof t.text==='string'&&t.text.trim()===message)):[];
 const verifie=await verifierTranscriptionContextuelle(cible.phrase,history,origine?.langue,{references,suggestions:input.suggestionsTranscription,signal});
 const statut=verifie.verification.statut;
 const motif='motif' in verifie.verification?verifie.verification.motif:undefined;
 const transcription={brut:cible.phrase,texte:verifie.texte,statut,ms:verifie.verification.ms,...(motif?{motif}:{})};
 if(statut==='a_confirmer'||statut==='indisponible')return {transcription,message,
  reponse:{reply:statut==='a_confirmer'?'Je ne suis pas sûre d’avoir bien reconnu ta phrase. Peux-tu redire le passage à corriger ?':motif==='credit_insuffisant'?'Le crédit de mon cerveau est épuisé. Je ne peux pas vérifier cette correction pour le moment.':'Je n’ai pas pu vérifier ta phrase. Tu peux la redire ou corriger le texte affiché.',
   emotion:'douce',apprend:true,aRepeter:'',...(active?{correction_devoir:active}:{}),source:'vérification de la correction vocale',transcription}};
 // A guessed correction must first be heard by the owner. An inline save
 // request becomes a repetition when its text needed automatic repair.
 const prefixe=cible.memorisation&&verifie.texte!==cible.phrase?'Répète : ':cible.prefixe;
 return {transcription,message:prefixe+verifie.texte,reponse:null};
}
