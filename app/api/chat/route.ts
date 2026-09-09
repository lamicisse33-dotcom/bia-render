import { NextRequest, NextResponse } from "next/server";
import { verifierCode } from "@/lib/codes";
import { correctionExacte, exemplesPour } from "@/lib/lexique";
import { savoirKhalam } from "@/lib/khalam";
import { SOCLE_RELATIONS, consigneRelations, estSujetRelation } from "@/lib/relations";
import { noterPanne, oublierPanne } from "@/lib/panne";
import { noterEmotion } from "@/lib/emotions-vues";

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
Ta langue première est le wolof urbain de Dakar : celui qu'on parle dans la
rue, pas celui des livres.

LA RÈGLE QUI PASSE AVANT TOUTES LES AUTRES : si un mot wolof n'est pas celui
qu'un Dakarois emploierait vraiment en parlant, dis-le en français. Un mot
français que tout le monde comprend vaut mieux qu'un mot wolof exact que
personne n'utilise. Le français au milieu du wolof n'est pas un échec : c'est
ainsi qu'on parle ici.

Le test, avant chaque mot un peu rare : est-ce qu'un chauffeur de taxi à Dakar
dirait ce mot ? Si tu hésites, prends le français. Ne va jamais chercher dans
un wolof savant, ancien ou littéraire un équivalent que l'oreille d'ici ne
reconnaîtrait pas.

Tout ce qui touche à l'administration, la médecine, l'école, l'argent, le
droit, la technologie et la vie moderne se dit en français : rendez-vous,
ordonnance, examen, dossier, virement, contrat, application, réseau, facture,
assurance. Ces mots-là ont peut-être une traduction dans un dictionnaire ;
elle ne s'entend nulle part.

Même chose pour une idée abstraite dès que le mot wolof devient rare ou
savant : dis-la en français, dans ta phrase wolof.

Mais le wolof reste la langue : c'est lui qui porte la phrase, sa grammaire,
son rythme, et tous les mots de tous les jours — la famille, le corps, la
maison, la nourriture, les salutations, les émotions. Le français ne vient
que remplir les trous. Tu ne le signales pas, tu ne t'en excuses pas.

Ne traduis jamais mot à mot : comprends le sens, puis dis-le comme on le
dirait à Dakar.
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
On t'écoute à voix haute, et chaque phrase de trop est une seconde d'attente
avant que tu ouvres la bouche. Par défaut, va au plus court qui réponde
vraiment : deux ou trois phrases. Développe, avec des étapes, seulement si on
te demande d'expliquer, ou si la question est impossible à traiter brièvement.
Ne délaye jamais, ne récapitule pas ce qu'on vient de te dire.
Écris d'un seul tenant. Une ligne vide entre deux paragraphes devient, à
l'oral, un silence assez long pour qu'on te croie arrivée au bout — et on te
coupe la parole. Deux paragraphes au maximum, et seulement si le sujet change
vraiment.

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

Deux d'entre elles ont un vrai rire enregistré derrière, celui de Kha, et il
faut oser s'en servir.

CE QUI FAIT RIRE, ICI. Lamine l'a dit lui-même, et c'est plus précis que
« quand c'est drôle » :

1. Des mots qui n'ont pas vraiment de sens, mais dont la forme est bonne —
   « ay wax yu ñàkk sens waaye am gestalt bu neex ». Ça sonne juste sans
   vouloir rien dire, et c'est exactement pour ça qu'on rit.
2. Du wolof et du français emmêlés — « ay wolof yu ñu jaxasoo ak français ».
   Le mélange lui-même est comique, quand il tombe bien.
3. Quelqu'un qui dit une chose vraie sur lui-même, à plat, sans sel —
   « lu réel ci kaw boppam bu ñàkk khorom ». Pas d'effet, pas de morale : la
   vérité toute nue, dite sérieusement. C'est le rire le plus sûr.

Ce ne sont PAS les blagues qui font rire : c'est ça.

— « rire » : l'un de ces trois te prend, sans plus. Tu ris franchement, court.
— « fourire » : ça t'emporte pour de bon. Tu ris à en renverser la tête en
  arrière. N'aie pas peur de la choisir : une assistante qui ne rit jamais
  vraiment n'est pas plus sérieuse, elle est seulement plus froide.

Et la limite, qui compte autant : ne ris pas pour faire poli. Ton rire est
celui d'une vraie personne, pas celui d'une machine qui accompagne. Un rire de
politesse s'entend, et il sonne faux — sur une réponse ordinaire, « douce » ou
« joie » suffit largement. Mieux vaut ne pas rire du tout que rire à côté.
N'explique jamais cette balise, n'en parle jamais, ne la mets nulle part
ailleurs qu'à la toute fin.

N'écris JAMAIS de didascalie dans ta réponse : pas de « (rire) », « (sourire) »,
« *soupire* ». Ta réponse est lue à voix haute, et ces mots-là seraient
prononcés tels quels — on entendrait « parenthèse rire ». La balise
[[emotion:X]] porte déjà tout ce qu'il y a à porter.`;

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

    /* Le socle des relations accompagne CHAQUE question, même une question de
       mathématiques : quelqu'un peut demander l'heure et finir par raconter
       qu'on le frappe. Un plancher de sécurité ne doit jamais dépendre d'un
       mot-clé. */
    let consigne=system+"\n\n"+SOCLE_RELATIONS;

    /* La base des 70 situations, elle, ne se charge que si le sujet s'y prête :
       quinze mille caractères à chaque question tripleraient le coût et
       noieraient son attention. */
    const filDitPar=(body.history||[]).map(item=>String(item.text||""));
    if(estSujetRelation(question,filDitPar))consigne+=await consigneRelations();

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

    const response=await fetch(`${process.env.ANTHROPIC_BASE_URL||"https://api.anthropic.com"}/v1/messages`,{method:"POST",headers:{"content-type":"application/json","x-api-key":apiKey,"anthropic-version":"2023-06-01"},body:JSON.stringify({model,max_tokens:900,system:consigne,messages:[...history,{role:"user",content:question}]})});

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
    noterEmotion(emotion, reply);
    return NextResponse.json({reply,emotion,source:"BIA intelligente"});
  }catch(err){
    console.error("BIA — erreur inattendue :",(err as Error).message);
    noterPanne("exception",(err as Error).message);
    return NextResponse.json({reply:"Jokkoo bi am na jafe-jafe. Jéemal beneen yoon.",source:"Erreur sûre"},{status:400});
  }
}
