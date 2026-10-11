import {devoirsALire} from "./devoirs-apprentissage";
import {dialoguerAvecDevoirs,indexDialogue,publierDiagnosticDialogue} from "./dialogue-devoirs";
import {chercherDialogues,type TourDialogue} from "./dialogue-devoirs-core";
// Owner-approved fixed evaluation. Only the existing authenticated learning
// verification route can request the private report. No chats or lessons written.
let essai:Promise<unknown>|undefined;
export function verifierDialoguesAppris(){
 return essai??= (async()=>{
  const index=await indexDialogue(),originaux=(await devoirsALire()).devoirs;
  const scenarios=[
   {nom:"couple",question:"Ma copine ne répond plus à mes appels."},
   {nom:"commerce",question:"Je suis un petit commerçant et j’ai du mal à gérer mon commerce."},
   {nom:"etudes",question:"Je suis étudiant et j’ai du mal à m’organiser pour mes études."},
   {nom:"mariage",question:"Ma famille veut me marier à un homme que je ne veux pas épouser."},
  ];
  const resultats=[];
  for(const scenario of scenarios){
   const historique:TourDialogue[]=[],tours=[];let question=scenario.question;
   for(let tour=0;tour<3;tour++){
    const debut=Date.now(),r=await dialoguerAvecDevoirs(question,historique,{index,diagnostic:true});
    const d=index.find(d=>d.id===r?.lecon_id),p=d?.repliques.find(p=>p.id===r?.replique_id);
    tours.push({tour,question,ms:Date.now()-debut,statut:r?.source||"non_couvert",motif:r?.motif||null,
     exacte:Boolean(p&&[p.wo,p.fr].includes(r!.reply)),une_question_max:Boolean(p&&(r!.reply.match(/\?/g)||[]).length<=1),
     deja_dite:historique.some(t=>t.role==="bia"&&t.text===r?.reply),
     reply:r?.reply,fr:p?.fr,wo:p?.wo,titre:d?.titre,
     voisinage:d&&p?d.repliques.slice(Math.max(0,Number(p.id)-1),Number(p.id)+3):[]});
    if(!r?.dialogue_memorise)break;
    historique.push({role:"user",text:question},{role:"bia",text:r.reply});
    const suivant=d?.repliques[Number(p?.id)+1];
    question=tour===0&&suivant&&suivant.role!=="bia"?suivant.fr:"Et ensuite, que me proposes-tu ?";
   }
   resultats.push({scenario:scenario.nom,candidats:chercherDialogues(index,scenario.question,[]).map(c=>c.d.titre),tours});
  }
  // Refusing a topic must release the lesson instead of forcing another line.
  const premier=resultats[0]?.tours[0];
  const refus=premier?.exacte?await dialoguerAvecDevoirs("Je ne veux plus parler de ma copine. Arrêtons ce sujet.",[{role:"user",text:scenarios[0].question},{role:"bia",text:premier.reply!}],{index,diagnostic:true}):undefined;
  const tours=resultats.flatMap(r=>r.tours);
  const bilan={quand:new Date().toISOString(),scenarios:resultats.length,tours:tours.length,
   repliques_exactes:tours.filter(t=>t.exacte).length,une_question_max:tours.every(t=>t.une_question_max),
   repetitions:tours.filter(t=>t.deja_dite).length,refus_respecte:refus===null,
   ms_max:Math.max(...tours.map(t=>t.ms)),details_prives:true};
  publierDiagnosticDialogue(bilan);
  return {bilan,resultats,non_interpretes:index.filter(d=>!d.repliques.length).map(d=>({titre:d.titre,apercu:originaux.find(o=>o.id===d.id)?.texte.slice(0,1600)}))};
 })();
}
