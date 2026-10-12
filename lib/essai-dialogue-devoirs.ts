import {devoirsALire} from "./devoirs-apprentissage";
import {dialoguerAvecDevoirs,indexDialogue,publierDiagnosticDialogue} from "./dialogue-devoirs";
import {chercherDialogues,paroleDeLaPersonne,type TourDialogue} from "./dialogue-devoirs-core";
// Owner-approved fixed evaluation. Only the existing authenticated learning
// verification route can request the private report. No chats or lessons written.
let essai:ReturnType<typeof executerEssai>|undefined;
export function verifierDialoguesAppris(){return essai??=executerEssai();}
async function executerEssai(){
  const index=await indexDialogue(),originaux=(await devoirsALire()).devoirs;
  const scenarios=[
   {nom:"couple",question:"Ma copine ne répond plus à mes appels.",reponse:"Non, nous ne nous sommes pas disputés. Je l’ai déjà appelée, sans réponse."},
   {nom:"commerce",question:"Je suis un petit commerçant et j’ai du mal à gérer mon commerce.",reponse:"Je vends des vêtements. Je ne sais pas combien je gagne vraiment."},
   {nom:"etudes",question:"Je suis étudiant et j’ai du mal à m’organiser pour mes études.",reponse:"Je suis en terminale. J’aime l’informatique et l’anglais."},
   {nom:"mariage",question:"Ma famille veut me marier à un homme que je ne veux pas épouser.",reponse:"J’ai essayé d’en parler à mes parents, mais ils ne m’écoutent pas."},
  ];
  const resultats=[];
  for(const scenario of scenarios){
   const historique:TourDialogue[]=[],tours=[];let question=scenario.question+" Réponds en wolof.";
   for(let tour=0;tour<3;tour++){
    const debut=Date.now(),r=await dialoguerAvecDevoirs(question,historique,{index,diagnostic:true});
    const d=index.find(d=>d.id===r?.lecon_id),p=d?.repliques.find(p=>p.id===r?.replique_id);
    tours.push({tour,question,ms:Date.now()-debut,statut:r?.source||"non_couvert",motif:r?.motif||null,
     exacte:Boolean(p&&[p.wo,p.fr].includes(r!.reply)),une_question_max:Boolean(p&&(r!.reply.match(/\?/g)||[]).length<=1),
     deja_dite:historique.some(t=>t.role==="bia"&&t.text===r?.reply),
     langue:r?.langue,reprise_personne:Boolean(p&&[p.fr,p.wo].includes(question)),reply:r?.reply,fr:p?.fr,wo:p?.wo,titre:d?.titre,
     voisinage:d&&p?d.repliques.slice(Math.max(0,Number(p.id)-1),Number(p.id)+3):[]});
    if(!r?.dialogue_memorise)break;
    historique.push({role:"user",text:question},{role:"bia",text:r.reply});
    question=tour===0?scenario.reponse:"Et ensuite, que me proposes-tu ?";
   }
   resultats.push({scenario:scenario.nom,candidats:chercherDialogues(index,scenario.question,[]).map(c=>c.d.titre),tours});
  }
  // Refusing a topic must release the lesson instead of forcing another line.
  const premier=resultats[0]?.tours[0];
  const refus=premier?.exacte?await dialoguerAvecDevoirs("Je ne veux plus parler de ma copine. Arrêtons ce sujet.",[{role:"user",text:scenarios[0].question},{role:"bia",text:premier.reply!}],{index,diagnostic:true}):undefined;
  const tours=resultats.flatMap(r=>r.tours);
  // Fixed regression for the owner's stuck session. The real lesson index
  // and an active learned reply must not capture a standalone greeting.
  const bloque:TourDialogue[]=[{role:"user",text:scenarios[0].question},
   ...(premier?.reply?[{role:"bia",text:premier.reply}]:[]),
   {role:"user",text:"Nanga def ?"},
   {role:"bia",text:"Peux-tu préciser ce qui te préoccupe le plus dans cette situation ?"}];
  const salutations=await Promise.all(["Salaamaleekum","Nanga def ?","Naka waa kër ga ?"].map(q=>dialoguerAvecDevoirs(q,bloque,{index,diagnostic:true})));
  const bilan={quand:new Date().toISOString(),scenarios:resultats.length,tours:tours.length,
   salutations_testees:salutations.length,salutations_liberees:salutations.filter(r=>r===null).length,
   repliques_exactes:tours.filter(t=>t.exacte).length,une_question_max:tours.every(t=>t.une_question_max),
   repetitions:tours.filter(t=>t.deja_dite).length,reprises_personne:tours.filter(t=>t.reprise_personne).length,
   role_personne:tours.filter(t=>t.fr&&paroleDeLaPersonne(t.fr,t.wo)).length,
   repliques_wolof:tours.filter(t=>t.langue==="wo").length,refus_respecte:refus===null,
   commerce_retrouve:/business|commerce|vente/i.test(resultats.find(r=>r.scenario==="commerce")?.tours[0]?.titre||""),
   question_deja_repondue:resultats.some(r=>r.tours.some(t=>r.scenario==="couple"&&/l.as appelée/.test(t.fr||"")||r.scenario==="mariage"&&/Sur quoi.*pression/.test(t.fr||""))),
   ms_max:Math.max(...tours.map(t=>t.ms)),details_prives:true};
  publierDiagnosticDialogue(bilan);
  return {bilan,resultats,non_interpretes:index.filter(d=>!d.repliques.length).map(d=>({titre:d.titre,apercu:originaux.find(o=>o.id===d.id)?.texte.slice(0,1600)}))};
}

let essaiMaitrises:Promise<unknown>|undefined;
/** Bounded owner-requested conversation evaluation. Private report only;
 * no user chats, source lessons or voice recordings are written. */
export function verifierMaitrisesConversation(){return essaiMaitrises??=(async()=>{
 const {contexteMaitrises}=await import('./dialogue-devoirs');
 const {messagesConversation}=await import('./conversation-groq');
 const {fetchAnthropic,contenuAnthropic,messagesAnthropic,MODELE_SONNET}=await import('./cerveau-anthropic');
 const key=process.env.BIA_LLM_API_KEY||process.env.ANTHROPIC_API_KEY;
 if(!key||process.env.BIA_LLM_PROVIDER!=='anthropic')return {ok:false,motif:'configuration_absente'};
 const index=await indexDialogue(),resultats=[];
 for(const scenario of [
  {nom:'initiative',questions:['Choisis un sujet.','Oui.','Changeons de sujet.']},
  {nom:'commerce',questions:['Je suis un petit commerçant et je ne sais pas combien je gagne vraiment.','Et ensuite ?']},
 ]){
  const history:TourDialogue[]=[];
  for(const question of scenario.questions){
   const debut=Date.now(),apprise=await dialoguerAvecDevoirs(question,history,{index,diagnostic:true});
   let reply=apprise?.reply||'',source=apprise?.source||'conversation',statut=200;
   const maitrises=await contexteMaitrises(question,history);
   if(!reply){
    const r=await fetchAnthropic(`${process.env.ANTHROPIC_BASE_URL||'https://api.anthropic.com'}/v1/messages`,{method:'POST',headers:{'content-type':'application/json','x-api-key':key,'anthropic-version':'2023-06-01'},body:JSON.stringify({model:process.env.BIA_LLM_MODEL||MODELE_SONNET,max_tokens:256,...messagesAnthropic(messagesConversation({question,history:history.map(t=>({role:t.role==='bia'?'assistant':'user',content:t.text})),maitrises}))})},Date.now()+8000);
    statut=r.status;reply=r.ok?contenuAnthropic(await r.json()):'';
   }
   const p=index.find(d=>d.id===apprise?.lecon_id)?.repliques.find(p=>p.id===apprise?.replique_id);
   resultats.push({scenario:scenario.nom,question,reply,source,statut,ms:Date.now()-debut,exacte:apprise?Boolean(p&&[p.fr,p.wo].includes(reply)):null,une_question_max:(reply.match(/\?/g)||[]).length<=1,repetition:history.some(t=>t.role==='bia'&&t.text===reply),domaines:JSON.parse(maitrises.split('DOMAINES VALIDÉS DISPONIBLES\n')[1]).domaines.map((d:{titre:string})=>d.titre)});
   if(!reply)break;history.push({role:'user',text:question},{role:'bia',text:reply});
  }
 }
 return {quand:new Date().toISOString(),lecons_validees:index.length,resultats};
})();}
