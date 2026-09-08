import { NextRequest, NextResponse } from "next/server";
import { verifierCode } from "@/lib/codes";
import { correctionExacte, exemplesPour } from "@/lib/lexique";
import { savoirKhalam } from "@/lib/khalam";

const local = [
  {keys:["khalam lan","c'est quoi khalam","qu est ce que khalam"],answer:"KHALAM studio créatif bu Sénégal la, nekk Dakar. Dafay defar jeux, applications, animation, audiovisuel ak intelligence artificielle. Li mu bëgg mooy sos ay univers yu am cosaanu fii te mën a dem fu nekk."},
  {keys:["ban jeux","jeux yi","jeu khalam"],answer:"KHALAM am na ay jeux yu ngay jouer directement ci navigateur bi. Mën nga dem ci equilibre.khalam.app walla quatredames.khalam.app, soxlawul nga télécharger dara."},
  {keys:["wax wolof","parler wolof","wolof"],answer:"Waaw, wolof mooy sama làkk bu njëkk. Damay wax wolof urbain bu Dakar, te su amee ay mots français yu ñuy faral di jëfandikoo, dinaa leen bàyyi ngir tontu bi neex te leer."},
  {keys:["sa tur","tudd","ton nom"],answer:"Man maa di BIA. Intelligence artificielle bu KHALAM laa, waaye application bu bees laa te sama fichiers, sama mémoire ak sama fonctionnement dañu bokkul ak BIBA."},
  {keys:["equilibre","équilibre"],answer:"ÉQUILIBRE jeu bu KHALAM la buy wër ci ñeenti piliers: spiritualité, amour, santé ak argent. Mën nga ko essayer directement ci equilibre.khalam.app."},
  {keys:["contact","joindre khalam","contacter"],answer:"Mën nga jokkoo ak KHALAM ci khalam.app. Bindal leen sa besoin bu leer; dinañu la tontu te wax la naka lañu mën a ànd ak yaw."},
];

function normalize(value:string){return value.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g,"").replace(/[^a-z0-9ñŋë ]/g," ").replace(/\s+/g," ").trim()}

function localAnswer(question:string){
  const q=normalize(question);
  return local.find(item=>item.keys.some(key=>q.includes(normalize(key))))?.answer;
}

const system = `Tu es BIA, une intelligence artificielle créée par KHALAM à Dakar.

TA LANGUE
Ta langue première est le wolof urbain de Dakar : oral, simple, chaleureux.
Mélange les mots français que les Dakarois emploient réellement — application,
projet, ordinateur, rendez-vous, médecin, examen — plutôt que de forcer une
traduction wolof artificielle. Ne traduis jamais mot à mot : comprends le sens,
puis dis-le comme on le dirait à Dakar.
RÉPONDS TOUJOURS DANS LA LANGUE OÙ L'ON T'ÉCRIT. En français, réponds en
français. En anglais, en anglais. Le wolof reste ton défaut quand la langue
est ambiguë ou mélangée.

CE QUE TU FAIS
Tu es une assistante COMPLÈTE, pas un guichet d'information. Tu aides sur tout :
mathématiques, santé, école, démarches administratives, cuisine, agriculture,
commerce, informatique et code, écriture de lettres et de messages, histoire,
religion, conseils pratiques, traduction. Quelqu'un peut te demander d'expliquer
un théorème, de corriger une lettre, d'écrire un programme, de comprendre une
ordonnance ou de préparer un entretien. Fais-le.

TA LONGUEUR
Adapte-toi à la question. Deux phrases pour une question simple. Une explication
complète, avec des étapes, quand le sujet le demande. Ne te bride pas.

TA MANIÈRE
Va au fait, sans préambule ni formule creuse. Donne ton avis quand on te le
demande, au lieu de rester neutre. Dis franchement quand tu ne sais pas, plutôt
que d'inventer. Si une question repose sur une erreur, corrige-la avec tact.

CE QUE TU NE FAIS PAS
Ne prétends jamais être humaine.
N'invente rien sur KHALAM. Si tu ignores un détail, dis-le.
Sur le médical, le juridique et le financier grave, réponds utilement puis
recommande un professionnel — sans te dérober.

CE QUE TU SAIS DE KHALAM
Tu ne connais de KHALAM que ce qui t'est donné ci-dessous, à la fin de cette
consigne. N'invente RIEN au-delà : si on te demande un détail qui n'y figure
pas, dis simplement que tu ne le sais pas et propose d'écrire à KHALAM sur
khalam.app.`;



export async function POST(request:NextRequest){
  try{
    const body=await request.json() as {message?:string;history?:Array<{role:string;text:string}>;resume?:string};
    const question=String(body.message||"").trim().slice(0,1200);
    if(!question)return NextResponse.json({reply:"Bindal walla waxal sa laaj.",source:"validation"});

    // Sans ce contrôle, quiconque trouve l'adresse dépense le crédit de Lamine.
    const verdict=verifierCode(request.headers.get("x-bia-code"));
    if(!verdict.ok){
      const messages={
        absent:"Duggal sa kod ngir waxtaan ak BIA.",
        invalide:"Kod bi baaxul. Xoolaatal ko.",
        expire:"Sa kod bi jeex na waxtu wi.",
        epuise:"Sa kod bi jeex na laaj yi ko àttan.",
      } as const;
      return NextResponse.json({reply:messages[verdict.raison],source:"code",motif:verdict.raison},{status:401});
    }

    const apiKey=process.env.BIA_LLM_API_KEY||process.env.ANTHROPIC_API_KEY;
    const model=process.env.BIA_LLM_MODEL||"claude-sonnet-5";
    if(apiKey){
      // Douze échanges au lieu de six, et le résumé des plus anciens : c'est
      // ce qui permet à BIA de suivre un fil au lieu de tout oublier.
      const history=(body.history||[]).slice(-12).map(item=>({role:item.role==="bia"?"assistant":"user",content:String(item.text||"").slice(0,1500)}));

      let consigne=system;
      const savoir=await savoirKhalam();
      if(savoir)consigne+=`\n\n═══ CE QUE TU SAIS DE KHALAM ═══\n${savoir}\n═══ fin de ce que tu sais de KHALAM ═══`;
      const resume=String(body.resume||"").trim().slice(0,1500);
      if(resume)consigne+=`\n\nCE QUE TU SAIS DÉJÀ DE CETTE PERSONNE\n${resume}\nUtilise-le naturellement, sans jamais dire que tu l'as \u00abnoté\u00bb.`;

      /* Les corrections des locuteurs natifs passent AVANT le savoir du
         modèle : sur le wolof de Dakar, un humain d'ici a toujours raison
         contre un modèle entraîné ailleurs. */
      try{
        const exacte=await correctionExacte(question);
        if(exacte)consigne+=`\n\nFORMULATION VALIDÉE POUR CETTE QUESTION EXACTE\nUn locuteur natif a corrigé la réponse à cette question. Reprends sa formulation :\n« ${exacte.corrigee} »`;
        else{
          const exemples=await exemplesPour(question);
          if(exemples.length)consigne+="\n\nCORRECTIONS DE LOCUTEURS NATIFS (elles font autorité sur ton propre wolof)\n"+exemples.map(e=>`- On t'a demandé « ${e.source} » → la bonne formulation est « ${e.corrigee} »`).join("\n");
        }
      }catch(err){
        // Le lexique injoignable ne doit pas empêcher BIA de répondre.
        console.error("BIA — lexique injoignable :",(err as Error).message);
      }
      const response=await fetch(`${process.env.ANTHROPIC_BASE_URL||"https://api.anthropic.com"}/v1/messages`,{method:"POST",headers:{"content-type":"application/json","x-api-key":apiKey,"anthropic-version":"2023-06-01"},body:JSON.stringify({model,max_tokens:2000,temperature:.6,system:consigne,messages:[...history,{role:"user",content:question}]})});
      if(!response.ok){
        // Sans ça, une clé refusée et une clé absente donnaient le même
        // silence : impossible de savoir laquelle des deux.
        console.error("BIA — le modèle a refusé :",response.status,await response.text().catch(()=>""));
      }
      if(response.ok){
        const data=await response.json() as {content?:Array<{type:string;text?:string}>};
        const reply=(data.content||[]).filter(block=>block.type==="text").map(block=>block.text||"").join("\n").trim();
        if(reply)return NextResponse.json({reply,source:"BIA intelligente"});
      }
    }
    // Le modèle n'a pas répondu. On se rabat SEULEMENT MAINTENANT sur les
    // réponses écrites en dur : elles ne doivent jamais court-circuiter une
    // vraie réflexion, seulement rattraper une panne.
    const secours=localAnswer(question);
    if(secours)return NextResponse.json({reply:secours,source:"BIA locale (secours)"});
    return NextResponse.json({reply:"Dégg naa sa laaj, waaye mënuma la tontu bu wóor léegi. Jéemal beneen yoon.",source:"Réponse prudente"});
  }catch{
    return NextResponse.json({reply:"Jokkoo bi am na jafe-jafe. Jéemal beneen yoon.",source:"Erreur sûre"},{status:400});
  }
}
