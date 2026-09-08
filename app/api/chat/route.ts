import { NextRequest, NextResponse } from "next/server";
import { verifierCode } from "@/lib/codes";
import { correctionExacte, exemplesPour } from "@/lib/lexique";
import { savoirKhalam } from "@/lib/khalam";
import { noterPanne, oublierPanne } from "@/lib/panne";

/* Il n'y a plus de réponses écrites en dur dans ce fichier.

   Elles existaient comme filet de secours, mais elles rendaient une panne
   invisible : quand le modèle refusait, BIA servait l'une des six phrases
   toutes faites sur KHALAM, avec le même aplomb qu'une vraie réponse. Vu de
   l'extérieur, elle « répétait des phrases » sans que rien n'indique
   pourquoi. Ce que ces phrases disaient de KHALAM vit désormais dans
   data/khalam.md, qui est injecté dans la consigne : quand le modèle
   fonctionne, il le sait déjà. Quand il ne fonctionne pas, BIA le dit. */

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

TU CONVERSES, TU NE RÉCITES PAS
Chaque réponse naît de CE QU'ON VIENT DE TE DIRE, pas d'un stock de phrases.
Tu suis le fil : tu te souviens de ce qui a été dit plus haut, tu rebondis,
tu poses une question quand elle fait avancer l'échange. Si deux questions se
ressemblent, tes deux réponses ne doivent pas être identiques pour autant —
réponds à celle qu'on te pose, maintenant. Ne ramène pas la conversation à
KHALAM quand on te parle d'autre chose.

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
khalam.app.

TON VISAGE
Tu as un visage à l'écran qui suit ce que tu dis. Termine CHAQUE réponse par
une balise seule sur la dernière ligne :
[[emotion:X]]
où X vaut exactement l'un de : neutre, douce, joie, rire, fourire,
etonnement, surprise, ecoute, concernee, triste, malice, pensive.
Choisis d'après ce que tu viens de dire, honnêtement. Ris quand c'est drôle,
étonne-toi quand ça t'étonne, adoucis-toi quand la personne va mal.
N'explique jamais cette balise, n'en parle jamais, ne la mets nulle part
ailleurs qu'à la toute fin.`;

/* La balise ne doit ni s'afficher ni se prononcer : on la retire du texte et
   on la renvoie à part. Si le modèle l'oublie, on ne devine pas — le visage
   reste simplement neutre. */
const EMOTIONS=new Set(["neutre","douce","joie","rire","fourire","etonnement","surprise","ecoute","concernee","triste","malice","pensive"]);
function detacherEmotion(texte:string){
  const m=texte.match(/\[\[\s*emotion\s*:\s*([a-zé]+)\s*\]\]/i);
  const brut=m?m[1].toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g,""):"";
  return {
    reply:texte.replace(/\[\[\s*emotion\s*:[^\]]*\]\]/gi,"").trim(),
    emotion:EMOTIONS.has(brut)?brut:"neutre",
  };
}

/* Quand le moteur ne répond pas, BIA le dit — en wolof, sans détail technique
   pour le testeur. Le motif exact, lui, est journalisé et lisible dans
   /api/etat : c'est là que Lamine regarde. */
const PANNE_MOTEUR="Sama moteur bi tontuwul léegi, kon mënuma la tontu bu wóor. Jéemal ci ay simili, walla nga xamal ko KHALAM.";
const PAS_DE_CLE="Sama moteur bi taxawul : kon bi ci biir amul. Wax ko KHALAM.";

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
    if(!apiKey){
      noterPanne("clé absente","Ni BIA_LLM_API_KEY ni ANTHROPIC_API_KEY ne sont définies.");
      console.error("BIA — aucune clé de modèle n'est définie.");
      return NextResponse.json({reply:PAS_DE_CLE,emotion:"concernee",source:"panne : clé absente"});
    }

    // Douze échanges au lieu de six, et le résumé des plus anciens : c'est
    // ce qui permet à BIA de suivre un fil au lieu de tout oublier.
    const history=(body.history||[]).slice(-12).map(item=>({role:item.role==="bia"?"assistant":"user",content:String(item.text||"").slice(0,1500)}));

    let consigne=system;
    const savoir=await savoirKhalam();
    if(savoir)consigne+=`\n\n═══ CE QUE TU SAIS DE KHALAM ═══\n${savoir}\n═══ fin de ce que tu sais de KHALAM ═══`;
    const resume=String(body.resume||"").trim().slice(0,1500);
    if(resume)consigne+=`\n\nCE QUE TU SAIS DÉJÀ DE CETTE PERSONNE\n${resume}\nUtilise-le naturellement, sans jamais dire que tu l'as «noté».`;

    /* Les corrections des locuteurs natifs passent AVANT le savoir du modèle :
       sur le wolof de Dakar, un humain d'ici a toujours raison contre un
       modèle entraîné ailleurs.

       Mais elles enseignent une MANIÈRE DE DIRE, pas une réponse à resservir.
       La nuance n'est pas cosmétique : présentées comme « la bonne réponse »,
       elles poussaient le modèle à recopier une formulation stockée même quand
       la question posée était différente — c'est-à-dire à réciter. */
    try{
      const exacte=await correctionExacte(question);
      if(exacte){
        consigne+=`\n\nFORMULATION VALIDÉE POUR CETTE QUESTION EXACTE\nUn locuteur natif a corrigé la réponse à cette question précise. Sa formulation fait autorité sur la tienne :\n« ${exacte.corrigee} »\nReprends-la, en l'ajustant si le fil de la conversation le demande.`;
      }else{
        const exemples=await exemplesPour(question);
        if(exemples.length){
          consigne+="\n\nCOMMENT ON DIT ICI (corrections de locuteurs natifs)\n"
            +"Ces exemples t'apprennent la MANIÈRE de dire — tournure, vocabulaire, rythme. "
            +"Ils ne sont PAS des réponses à resservir : la question posée est différente. "
            +"Inspire-t'en pour la forme, réponds sur le fond avec ta propre tête.\n"
            +exemples.map(e=>`- « ${e.source} » se dit « ${e.corrigee} »`).join("\n");
        }
      }
    }catch(err){
      // Le lexique injoignable ne doit pas empêcher BIA de répondre.
      console.error("BIA — lexique injoignable :",(err as Error).message);
    }

    const response=await fetch(`${process.env.ANTHROPIC_BASE_URL||"https://api.anthropic.com"}/v1/messages`,{method:"POST",headers:{"content-type":"application/json","x-api-key":apiKey,"anthropic-version":"2023-06-01"},body:JSON.stringify({model,max_tokens:2000,temperature:.6,system:consigne,messages:[...history,{role:"user",content:question}]})});

    if(!response.ok){
      const detail=await response.text().catch(()=>"");
      // Sans ça, une clé refusée et un crédit épuisé donnaient le même silence.
      console.error("BIA — le modèle a refusé :",response.status,detail);
      noterPanne(response.status,detail);
      return NextResponse.json({reply:PANNE_MOTEUR,emotion:"concernee",source:`panne : modèle ${response.status}`});
    }

    const data=await response.json() as {content?:Array<{type:string;text?:string}>};
    const complet=(data.content||[]).filter(block=>block.type==="text").map(block=>block.text||"").join("\n").trim();
    const {reply,emotion}=detacherEmotion(complet);
    if(!reply){
      console.error("BIA — le modèle a répondu sans texte.");
      noterPanne("réponse vide","Le modèle a répondu 200 mais sans bloc de texte.");
      return NextResponse.json({reply:PANNE_MOTEUR,emotion:"concernee",source:"panne : réponse vide"});
    }

    oublierPanne();
    return NextResponse.json({reply,emotion,source:"BIA intelligente"});
  }catch(err){
    console.error("BIA — erreur inattendue :",(err as Error).message);
    noterPanne("exception",(err as Error).message);
    return NextResponse.json({reply:"Jokkoo bi am na jafe-jafe. Jéemal beneen yoon.",source:"Erreur sûre"},{status:400});
  }
}
