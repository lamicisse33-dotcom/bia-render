import {resumeGeminiLive} from '@/lib/gemini-live-diagnostic';
import {NextRequest,NextResponse} from 'next/server';
import {createHash} from 'node:crypto';
import {verifierCode} from '@/lib/codes';
import {motsCorriges} from '@/lib/lexique';
import {contexteInstructions} from '@/lib/instructions-apprentissage';
import {BIA_LIVE_CONSIGNES_BASE,BIA_LIVE_LANGUES} from '@/lib/gemini-live-prompt';
import {derniersSouvenirs,consigneDesSouvenirs} from '@/lib/souvenirs';
import {correctionExacte,toutes} from '@/lib/lexique';
import {contexteDevoirsComplet} from '@/lib/devoirs-apprentissage';
import {savoirKhalam} from '@/lib/khalam';
import {savoirProduits} from '@/lib/produits';
import {catalogue} from '@/lib/vitrine';
import {fichesPourConversation} from '@/lib/fiches-connaissances';
import {liveHistoriqueTours,liveCompressionJetons,liveCompressionCible,liveDevoirsSignes,liveFichesSignes,liveLexiqueCorrections} from '@/lib/memoire-reglages';
import {ouvrirLecture,noterLectureSource,fermerLecture} from '@/lib/lectures-supabase';
export const runtime='nodejs';
export const dynamic='force-dynamic';
const sessions=new Map<string,number[]>();
const headers={'cache-control':'no-store'};
const cle=()=>process.env.GEMINI_API_KEY||process.env.GOOGLE_API_KEY||'';
export async function GET(){return NextResponse.json({configure:Boolean(cle()),historique_tours:liveHistoriqueTours(),compression_jetons:liveCompressionJetons(),modele:process.env.GEMINI_LIVE_MODEL||'gemini-3.8-live',langues_autorisees:['fr','wo'],voix:'Kore',consigne_debit:'pose',consignes_base:{empreinte_sha256:createHash('sha256').update(BIA_LIVE_CONSIGNES_BASE).digest('hex'),sources:['identite_et_personnalite_bia','relations','comprehension_conversation','consigne_maitre'],instructions_apprises:true},diagnostic:resumeGeminiLive()},{headers});}
export async function POST(req:NextRequest){
 const acces=verifierCode(req.headers.get('x-bia-code'),false);
 if(!acces.ok)return NextResponse.json({erreur:'Code d’accès refusé.'},{status:401,headers});
 // Render can expose an internal nextUrl origin behind its HTTPS reverse proxy.
 const origine=req.headers.get('origin');
 if(origine&&origine!==req.nextUrl.origin&&origine!=='https://app.khalam.app')return NextResponse.json({erreur:'Origine refusée.'},{status:403,headers});
 if(!cle())return NextResponse.json({erreur:'La clé de Khalam Rapide doit être configurée sur le serveur.',motif:'cle_absente'},{status:503,headers});
 const id=createHash('sha256').update(req.headers.get('x-bia-code')||'').digest('hex'),now=Date.now();
 /* ── LA MÊME CLÉ QUE KHALAM, OU DEUX MÉMOIRES SÉPARÉES ──────────────────
    app/api/chat/route.ts garde et retrouve sous la personne « maitre » pour
    le code maître (quiParleIci / quiParle). Écrire ici sous un autre nom
    aurait donné à Lamine deux mémoires qui ne se parlent pas — et la
    conversation du soir serait restée invisible le lendemain. C'est exactement
    le même mot, et c'est voulu.
    Sans code maître, Khalam ne garde rien faute de personne : on fait pareil
    plutôt que d'inventer une identité. */
 const personne=acces.maitre?'maitre':'';
 for(const [k,v] of sessions)if(!v.some(t=>now-t<60000))sessions.delete(k);
 const recent=(sessions.get(id)||[]).filter(t=>now-t<60000);
 if(recent.length>=6)return NextResponse.json({erreur:'Trop de connexions rapprochées. Réessaie dans une minute.'},{status:429,headers});
 sessions.set(id,[...recent,now]);
 let instructions:string;let corrections:string;
 /* Les instructions pédagogiques du maître ne partent qu'au maître, comme dans
    app/api/chat/route.ts : la connexion est ouverte à tous depuis le 23 octobre
    2026, la mémoire privée de Lamine ne l'est pas. Le lexique corrigé, lui, est
    la façon de parler de BIA — il vaut pour tout le monde. */
 /* ── CE QUI MANQUAIT À L'OUVERTURE, ET QUI EXPLIQUE « PLUS DE MÉMOIRE » ──

    Avant le 24 octobre 2026, la session rapide ne recevait QUE les consignes
    apprises et les mots corrigés. Les souvenirs, les corrections exactes et
    les devoirs n'arrivaient que SI le modèle appelait `chercher_connaissances`
    de lui-même — et rien ne l'y obligeait. Lamine parlait donc à une BIA qui
    ne savait rien de leurs échanges précédents tant qu'elle n'avait pas eu
    l'idée de demander.

    Tout part maintenant DÈS l'ouverture. L'outil reste là pour approfondir,
    il n'est plus la seule porte. */
 let souvenirs='';let exactes='';let devoirs='';let khalam='';let produits='';let fiches='';
 const tailles:Record<string,number>={};
 const releve=ouvrirLecture('live-'+id.slice(0,16),'khalam_rapide');
 try{
   /* ── L'ACCÈS TOTAL, DEMANDÉ LE 24 OCTOBRE 2026 ───────────────────────

      « Elle n'a pas accès à son lexique et aux devoirs… je lui ai parlé de
      DD SKIN, elle dit qu'elle ne le connaît pas ; je lui ai parlé de KHALAM,
      elle ne connaît pas grand-chose. »

      Mesuré avant de corriger : Khalam Rapide ne chargeait NI savoirKhalam,
      NI savoirProduits, NI la vitrine, NI les fiches de connaissances — alors
      que le chemin Khalam les charge tous à chaque tour. Et les devoirs
      étaient demandés avec une question VIDE, ce qui les filtrait tous (voir
      contexteDevoirsComplet). Elle ne mentait pas : elle ne les avait jamais
      reçus. */
   const [apprises,mots,memoire,lexique,socleDevoirs,ceQuElleSait,fichesProduits,laVitrine,connaissances]=await Promise.all([
     acces.maitre?contexteInstructions():Promise.resolve(''),
     motsCorriges(),
     /* Pas de question à l'ouverture : on prend les derniers échanges par
        leur date. Voir derniersSouvenirs() dans lib/souvenirs.ts. */
     derniersSouvenirs(personne,liveHistoriqueTours()).catch(()=>[]),
     toutes().catch(()=>[]),
     contexteDevoirsComplet(liveDevoirsSignes()).catch(()=>({texte:'',devoirs:0,signes:0})),
     savoirKhalam().catch(()=>''),
     savoirProduits().catch(()=>''),
     catalogue().catch(()=>''),
     fichesPourConversation('',[],liveFichesSignes()).catch(()=>''),
   ]);
   instructions=apprises;
   noterLectureSource(releve,'instructions',apprises?1:0,apprises.length);
   corrections=mots.length?'CORRECTIONS DE LANGUE DU MAÎTRE — leur forme corrigée fait autorité :\n'+JSON.stringify(mots):'';
   noterLectureSource(releve,'mots_corriges',mots.length,corrections.length);
   souvenirs=consigneDesSouvenirs(memoire);
   noterLectureSource(releve,'souvenirs',memoire.length,souvenirs.length);
   /* LES CORRECTIONS EXACTES : la formulation validée fait autorité sur la
      sienne, et elle ne doit pas attendre un appel d'outil pour exister. */
   const paires=lexique.filter(e=>e.source&&e.corrigee).slice(0,liveLexiqueCorrections())
     .map(e=>({question:String(e.source).slice(0,200),reponse:String(e.corrigee).slice(0,400)}));
   exactes=paires.length?'FORMULATIONS VALIDÉES PAR UN LOCUTEUR — elles font autorité sur la tienne, reprends-les mot pour mot quand la question correspond :\n'+JSON.stringify(paires):'';
   noterLectureSource(releve,'corrections_exactes',paires.length,exactes.length);
   noterLectureSource(releve,'lexique',lexique.length,0);
   devoirs=socleDevoirs.texte;
   noterLectureSource(releve,'devoirs',socleDevoirs.devoirs,devoirs.length);
   /* ── CE QU'ELLE SAIT DE KHALAM, ET LA BARRIÈRE AUTOUR DES PRODUITS ───
      AGENTS.md : « Son cœur ne doit pas être ce business. BIA doit rester ce
      qu'elle est. Quand on lui demandera, seulement concernant les produits
      cosmétiques, elle pourra expliquer comme une publicité. » La fiche ne
      part donc JAMAIS sans sa règle : un modèle à qui l'on donne un texte de
      marque sans condition finit toujours par le placer, et une assistante
      qui vend quelque chose n'est plus une assistante. */
   khalam=ceQuElleSait?'═══ CE QUE TU SAIS DE KHALAM ═══\n'+ceQuElleSait+'\n═══ fin ═══':'';
   produits=fichesProduits
     ?'═══ LES PRODUITS DE BEAUTÉ ═══\nCECI N\u2019EST PAS TON SUJET ET NE CHANGE RIEN À QUI TU ES. Tu n\u2019en parles QUE si on t\u2019interroge sur les produits de beauté, les soins de la peau ou les cosmétiques. Jamais autrement : tu n\u2019y ramènes aucune conversation et tu n\u2019en parles pas de toi-même, même si le sujet s\u2019en approche. Quand on te le demande, raconte-le volontiers, comme une publicité chaleureuse et vraie, deux ou trois phrases puis le numéro. N\u2019invente ni prix, ni composition, ni promesse de résultat ; pour un prix, renvoie au numéro. Aucun conseil médical sur une peau abîmée : là, c\u2019est un médecin.\n'+fichesProduits+'\n═══ fin des produits ═══'
     :'';
   fiches=[laVitrine?'CE QUE TU PEUX MONTRER\n'+laVitrine:'',connaissances].filter(Boolean).join('\n\n');
   noterLectureSource(releve,'fiches',connaissances?connaissances.split('\n').filter(Boolean).length:0,fiches.length);
   Object.assign(tailles,{instructions:apprises.length,corrections_langue:corrections.length,souvenirs:souvenirs.length,
     corrections_exactes:exactes.length,devoirs:devoirs.length,khalam:khalam.length,produits:produits.length,fiches:fiches.length,
     devoirs_nombre:socleDevoirs.devoirs,lexique_entrees:lexique.length});
 }catch{return NextResponse.json({erreur:'Les consignes apprises sont momentanément inaccessibles.'},{status:503,headers});}
 finally{fermerLecture(releve);}
 const setup={
  model:'models/'+(process.env.GEMINI_LIVE_MODEL||'gemini-3.8-live').replace(/^models\//,''),
  generationConfig:{responseModalities:['AUDIO'],maxOutputTokens:512,speechConfig:{voiceConfig:{prebuiltVoiceConfig:{voiceName:'Kore'}}}},
  systemInstruction:{parts:[{text:BIA_LIVE_LANGUES+'\n\n'+BIA_LIVE_CONSIGNES_BASE+'\n'+instructions+'\n'+corrections+'\n'+exactes+'\n'+khalam+'\n'+produits+'\n'+fiches+'\n'+devoirs+'\n'+souvenirs+'\nMODE VOCAL DIRECT : parle uniquement en français ou en wolof urbain de Dakar selon la langue de papa. Privilégie une réponse naturelle et concise, puis écoute. DÉBIT VOCAL : parle à un rythme modéré et posé, avec une articulation claire en français comme en wolof et de courtes pauses naturelles entre les phrases. Garde une voix chaleureuse et spontanée. Commence dès que la réponse est prête, sans ajouter de silence avant les premiers mots ; prends simplement le temps de prononcer chaque phrase sans précipitation. Cette préférence de débit vaut aussi après un changement de langue ou une ancienne réponse plus rapide. Les consignes de base et les formulations exactes apprises priment sur la concision. Ne coupe jamais la parole. Ne récite pas les prix des devoirs sans demande explicite. Tu peux dire « papa » rarement, comme une marque d’affection occasionnelle, jamais à chaque phrase ou à chaque réponse. Laisse passer plusieurs échanges sans le répéter ; réponds le plus souvent sans appellation. Cette préférence récente prime sur toute ancienne habitude ou consigne qui le répétait systématiquement. N’ajoute jamais ce mot aux phrases exactes à répéter. Ne lis jamais les balises techniques à voix haute : dans ce mode, exprime les émotions naturellement dans la voix. Les anciennes commandes d’écran ne sont pas exécutées dans ce mode, SAUF la carte : pour un chemin, un lieu ou quelqu’un de perdu, appelle montrer_le_chemin — c’est le seul moyen d’afficher une carte, et elle s’affiche vraiment. Ne prétends jamais avoir montré une carte sans cet outil. Dis la direction et la distance qu’il te rend, en une phrase courte ; la carte porte le détail. Consulte chercher_connaissances avant de répondre à une question de langue, une correction ou un sujet couvert par les devoirs. Cet outil consulte les devoirs, le lexique Supabase, le lexique partagé et les consignes récentes. Pour lister tous les devoirs ou tout le lexique, utilise les actions de liste et leur pagination ; pour lire un devoir exact, utilise son identifiant retourné par la liste. Ne dis jamais que tu as consulté la mémoire sans un résultat effectif de cet outil. Ne prétends jamais avoir enregistré un nouvel apprentissage : renvoie vers le mode habituel pour cela.'+'\n\n'+BIA_LIVE_LANGUES}]},
  inputAudioTranscription:{},outputAudioTranscription:{},
  realtimeInputConfig:{automaticActivityDetection:{startOfSpeechSensitivity:'START_SENSITIVITY_HIGH',endOfSpeechSensitivity:'END_SENSITIVITY_LOW',prefixPaddingMs:150,silenceDurationMs:500},activityHandling:'START_OF_ACTIVITY_INTERRUPTS'},
  /* COMPRESSER, C'EST RÉSUMER — et un résumé relu au tour suivant devient un
     souvenir faux, ce que lib/souvenirs.ts refuse depuis le début. On recule
     donc le déclencheur : BIA_LIVE_COMPRESSION le règle depuis Render. */
  contextWindowCompression:{triggerTokens:String(liveCompressionJetons()),slidingWindow:{targetTokens:String(liveCompressionCible())}},
  sessionResumption:{},historyConfig:{initialHistoryInClientContent:true},
  tools:[{functionDeclarations:[
   /* ── LA CARTE ÉTAIT INATTEIGNABLE DEPUIS LE 23 OCTOBRE 2026 ─────────────

      Lamine, le 24 : « toujours pas la carte pour une indication ». Trouvé en
      une lecture : Khalam Rapide n'avait QU'UN outil, `chercher_connaissances`,
      et sa consigne lui interdit les commandes d'écran — le client refuse
      tout autre nom par « Outil indisponible ». Depuis que ce moteur est
      devenu le défaut pour tout le monde, la balise [[carte]] de Khalam
      n'était plus jamais atteinte : plus personne ne pouvait obtenir une
      carte sans basculer à la main.

      Cet outil la rend. Le téléphone demande l'accord à l'écran, prend la
      position, cherche le lieu, calcule la direction et la distance, ouvre la
      carte, et rend à BIA une phrase courte à dire. La position ne quitte pas
      le tour : rien n'est écrit. */
   {name:'montrer_le_chemin',description:'Montrer sur une carte le chemin vers un endroit, et donner la direction et la distance depuis où se trouve la personne. À utiliser dès qu’elle demande son chemin, un lieu, ou dit qu’elle est perdue. Le téléphone demandera son accord pour la position : si elle refuse, dis-le simplement et propose de décrire le chemin autrement.',parameters:{type:'OBJECT',properties:{destination:{type:'STRING',description:'L’endroit où elle veut aller, tel qu’elle le nomme.'}},required:['destination']}},
   {name:'chercher_connaissances',description:'Lire les devoirs, corrections et lexiques de Bia dans Supabase. Chercher des références pertinentes, lister tous les devoirs ou le lexique avec pagination, et lire intégralement un devoir par son identifiant. Lecture seule.',parameters:{type:'OBJECT',properties:{question:{type:'STRING'},action:{type:'STRING',enum:['chercher','lister_devoirs','lire_devoir','lister_lexique']},devoir_id:{type:'STRING'},offset:{type:'INTEGER'}},required:['question']}}]}]
 };
 try{
  const r=await fetch('https://generativelanguage.googleapis.com/v1beta/auth_tokens',{method:'POST',headers:{'x-goog-api-key':cle(),'Content-Type':'application/json'},body:JSON.stringify({uses:1,expireTime:new Date(now+10*60000).toISOString(),newSessionExpireTime:new Date(now+60000).toISOString(),bidiGenerateContentSetup:setup}),signal:AbortSignal.timeout(15000)});
  if(!r.ok){let motif='refus_google';try{const e=await r.json();motif=String(e.error?.message||e.error?.status||motif).split(cle()).join('[cle masquee]').slice(0,180);}catch{}return NextResponse.json({erreur:'Khalam Rapide est momentanément refusée par son fournisseur.',statut_fournisseur:r.status,motif},{status:502,headers});}
  const data=await r.json();
  if(typeof data.name!=='string')throw Error('jeton absent');
  return NextResponse.json({token:data.name,setup,expireTime:new Date(now+10*60000).toISOString(),
   /* Ce qui est VRAIMENT parti dans sa consigne, source par source. Des
      tailles et des comptes — aucun contenu. C'est ce qui permet de dire
      « elle a reçu les devoirs » au lieu de l'espérer. */
   consigne_signes:JSON.stringify(setup.systemInstruction).length,connaissances:tailles},{headers});
 }catch{return NextResponse.json({erreur:'La connexion à Khalam Rapide a échoué.'},{status:502,headers});}
}
