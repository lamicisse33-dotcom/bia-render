import {correctionDuMaitre} from "./correction-maitre";
import {executerLecon} from "./mode-apprentissage";
import {origineValide,type OrigineDevoir} from "./correction-devoir-core";
/** Explicit correction + explicit validation, before any language model. */
export async function corrigerDevoirConversation(input:{question:string;maitre:boolean;origine?:unknown;active?:unknown;phrase?:string},sauver:(o:OrigineDevoir,t:string)=>Promise<OrigineDevoir>){
 if(!input.maitre)return null;
 const demande=correctionDuMaitre(input.question,true)||(/^corrige corrige[.!]?$/i.test(input.question.trim())?{phrase:null}:null);
 if(demande&&input.origine&&!origineValide(input.origine)&&!origineValide(input.active))return {reply:"Je ne peux pas identifier une seule phrase dans ce passage. Fais-moi reprendre cette phrase seule avant de la corriger.",apprend:false,aRepeter:"",correction_devoir:null,origine_devoir:input.origine};
 const active=origineValide(input.active)?input.active:null;
 const origine=active||(demande&&origineValide(input.origine)?input.origine:null);
 if(!origine)return null;
 const repondre=(phrase:string)=>({reply:phrase||"Dis-moi la phrase complète corrigée. Je la répète, puis dis « mémorise » pour corriger le devoir.",emotion:"neutre",apprend:true,aRepeter:phrase,correction_devoir:origine,source:"correction du devoir d’origine"});
 if(demande)return repondre(demande.phrase||"");
 if(!active)return null;
 if(/^(?:annule|annule la correction|ne (?:mémorise|retiens|garde) pas(?: ça)?)[.!]?$/i.test(input.question.trim()))return {reply:"Correction annulée. Le devoir est inchangé.",apprend:false,aRepeter:"",correction_devoir:null,origine_devoir:origine};
 let nouvelle:OrigineDevoir|undefined;
 let erreur="";
 const lecon=await executerLecon({texte:input.question,maitre:true,actif:true,phrase:input.phrase||""},async texte=>{
  try{nouvelle=await sauver(origine,texte);}catch(e){erreur=e instanceof Error?e.message:"Enregistrement impossible";throw e;}
 });
 if(lecon?.retenu)return {...lecon,reply:"C’est corrigé dans le devoir d’origine, papa.",apprend:false,aRepeter:"",correction_devoir:null,origine_devoir:nouvelle,devoir_corrige:true};
 if(lecon)return {...lecon,...(erreur?{reply:"Le devoir n’a pas été confirmé comme corrigé : "+erreur}:{}),correction_devoir:lecon.apprend?origine:null};
 return repondre(input.question.trim());
}
