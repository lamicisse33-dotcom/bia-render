import {dialoguerAvecDevoirs,indexDialogue,resumeDialogueDevoirs} from './dialogue-devoirs';
import {devoirsALire} from './devoirs-apprentissage';
import {paroleDeLaPersonne} from './dialogue-devoirs-core';
import {cleDialogue,chargerDialoguesRapides,garderChoixRapide,sauverDialoguesRapides} from './dialogue-rapide';
import {audioPourReponse} from './audio-memoire';
import {verifierDialoguesAppris} from './essai-dialogue-devoirs';
const initial={statut:'non_lance',total:0,traites:0,prepares:0,sans_reponse:0,erreurs:0,acces_directs:0,audios_joints:0,appels_modele_relecture:0,ms_max:0,ms_moyen:0};
const g=globalThis as typeof globalThis&{biaPrechauffageDialogue?:{bilan:typeof initial;travail?:Promise<void>}};
const etat:{bilan:typeof initial;travail?:Promise<void>}=g.biaPrechauffageDialogue??={bilan:initial};const {bilan}=etat;
export const resumePrechauffageDialogue=()=>({...bilan});
/** Owner-requested preparation of known openings, not a free-form prompt API.
 * Only the existing authenticated diagnostic can start paid preparation.
 * Writes derived routing cache only; never modifies lessons or recordings. */
export function lancerPrechauffageDialogue(){
 if(!etat.travail)etat.travail=(async()=>{try{
  bilan.statut='preparation';await chargerDialoguesRapides();
  const index=await indexDialogue(),valides=new Set((await devoirsALire()).devoirs.filter(d=>d.valide).map(d=>d.id));
  const demandes=[
   {fr:'Ma copine ne répond plus à mes appels.',wo:''},
   {fr:'Je suis un petit commerçant et j’ai du mal à gérer mon commerce.',wo:''},
   {fr:'Je suis étudiant et j’ai du mal à m’organiser pour mes études.',wo:''},
   {fr:'Ma famille veut me marier à un homme que je ne veux pas épouser.',wo:''},
   ...index.filter(d=>valides.has(d.id)).flatMap(d=>{
    const p=d.repliques.find(p=>p.role==='personne'||paroleDeLaPersonne(p.fr,p.wo));
    return p&&p.fr.length>=16?[{fr:p.fr,wo:p.wo}]:[];
   }),
  ].filter((x,i,a)=>a.findIndex(y=>y.fr===x.fr)===i);
  bilan.total=demandes.length;let somme=0;
  // One request at a time: do not compete with live users for model capacity.
  for(const q of demandes){
   try{
    const r=await dialoguerAvecDevoirs(q.fr+' Réponds en wolof.',[],{index,diagnostic:true});
    if(!r?.dialogue_memorise){bilan.sans_reponse++;continue;}
    bilan.prepares++;
    // A validated bilingual source pair is the same opening in both languages.
    if(q.wo)garderChoixRapide(cleDialogue(index,q.wo,[]),{devoir:r.lecon_id!,replique:r.replique_id!});
    await audioPourReponse(r.reply,r.langue);
    const avant=resumeDialogueDevoirs().appels_modele,debut=Date.now();
    const relu=await dialoguerAvecDevoirs(q.fr+' Réponds en wolof.',[],{index,diagnostic:true});
    const son=relu?await audioPourReponse(relu.reply,relu.langue):null;
    const ms=Date.now()-debut;somme+=ms;bilan.ms_max=Math.max(bilan.ms_max,ms);bilan.ms_moyen=Math.round(somme/bilan.prepares);
    bilan.appels_modele_relecture+=resumeDialogueDevoirs().appels_modele-avant;
    if(relu?.acces_direct&&relu.reply===r.reply)bilan.acces_directs++;
    if(son)bilan.audios_joints++;
   }catch{bilan.erreurs++;}finally{bilan.traites++;}
  }
  // Also prepare the owner's existing multi-turn regression scenarios. The
  // entire question/history is retained in each key: no blind next-line step.
  const suite=await verifierDialoguesAppris();
  for(const scenario of suite.resultats){
   const history:Array<{role:string;text:string}>=[];
   for(const t of scenario.tours){
    if(!t.exacte||!t.reply)break;
    await audioPourReponse(t.reply,'wo');
    const avant=resumeDialogueDevoirs().appels_modele,debut=Date.now();
    const relu=await dialoguerAvecDevoirs(t.question,history,{index,diagnostic:true});
    const son=relu?await audioPourReponse(relu.reply,relu.langue):null;
    const ms=Date.now()-debut;bilan.prepares++;somme+=ms;bilan.ms_max=Math.max(bilan.ms_max,ms);bilan.ms_moyen=Math.round(somme/bilan.prepares);
    bilan.appels_modele_relecture+=resumeDialogueDevoirs().appels_modele-avant;
    if(relu?.acces_direct&&relu.reply===t.reply)bilan.acces_directs++;
    if(son)bilan.audios_joints++;
    history.push({role:'user',text:t.question},{role:'bia',text:t.reply});
   }
  }
  await sauverDialoguesRapides();bilan.statut='termine';
 }catch{bilan.erreurs++;bilan.statut='erreur';}})();
 return resumePrechauffageDialogue();
}
