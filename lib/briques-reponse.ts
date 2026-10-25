import {randomUUID} from 'node:crypto';
import {signesAnticipation} from './seuils-anticipation';
import {modeleRapidite,profilRapidite,type ProfilRapidite} from './rapidite-core';
import {noterModeleRapidite} from './rapidite-etat';
import {NextRequest} from 'next/server';
import {verifierCode} from './codes';
import {fetchAnthropic,messagesAnthropic,contenuAnthropic,modeleBriques} from './cerveau-anthropic';
import {messagesConversation} from './conversation-groq';
import {messagesBriques,enchainerBrique} from './briques-prompt';
import {lireAudioBrique} from './briques-audio';
import {contexteMemoireCommune} from './memoire-organisee';
import {contexteInstructions} from './instructions-apprentissage';
import {detecterLangue} from './langue';
import {assemblerSonsCourants} from './assembler-sons-courants';
import {POST as synthetiser} from '../app/api/chatterbox-test/bia/route';
import {contexteAnticipation,empreinteAnticipation,normaliserAnticipation,eligibleBriques} from './anticipation-core';
import {noterRefusServeur} from './eligibilite-etat';
import {etatBriques} from './briques-etat';
import type {BriqueAudio} from './briques-file';
import {garder} from './souvenirs';
import {salutationReconnue} from './salutations-dialogue';
import {identiteReconnue} from './identite-core';

type Session={modeleEssai?:string;profil:ProfilRapidite|null;id:string;owner:string;tour:string;history:ReturnType<typeof contexteAnticipation>;resume:string;voice:'female'|'male';maitre:boolean;expire:number;traite:string;dernier:string;briques:BriqueAudio[];occupe:boolean;fermee:boolean;appels:number;livree?:boolean;suite?:SuiteTexte};
const g=globalThis as typeof globalThis&{biaBriques?:Map<string,Session>};
const sessions=g.biaBriques??=new Map<string,Session>();
const nettoyer=()=>{for(const [id,s] of sessions)if(s.expire<Date.now()&&!s.occupe){oublierSuite(s);sessions.delete(id);}if(sessions.size>=32)for(const [id,s] of sessions){if(s.fermee&&!s.occupe){oublierSuite(s);sessions.delete(id);}if(sessions.size<32)break;}};
function resultat(s:Session,brique?:BriqueAudio,normal=false){return {id:s.id,brique,termine:s.fermee,normal,continuer:!!brique&&!s.fermee&&s.briques.length<5&&s.appels<10&&s.dernier.length-s.traite.length>=signesAnticipation()};}

type VueTexte=Pick<Session,'history'|'resume'|'traite'|'profil'>&{briques:Array<Pick<BriqueAudio,'texte'>>;modeleEssai?:string};
type TexteBrique={traite:string;reply:string};
type SuiteTexte={texte:string;prefixe:string;numero:number;final:boolean;abort:AbortController;resultat:Promise<{texte:TexteBrique|null;mesure:MesureTexte}|null>};
type MesureTexte={contexte_ms:number;modele_ms:number;entree_signes:number;sortie_signes:number};
async function preparerTexte(s:VueTexte,texte:string,final:boolean,maitre:boolean,signal:AbortSignal,mesure:MesureTexte,diagnosticAncien=false,modeleEssai?:string){
 signal.throwIfAborted();const debutPreparation=Date.now();
    const [memoire,instructions]=await Promise.all([contexteMemoireCommune(texte,s.history,6500),maitre?contexteInstructions():Promise.resolve('')]);
    const messages=diagnosticAncien?messagesConversation({question:texte,history:s.history,resume:s.resume,maitre,fiches:memoire,instructions,rapide:true}):messagesBriques({history:s.history,resume:s.resume,maitre,memoire,instructions});
    messages.push({role:'system',content:`RÉPONSE ORALE PAR BRIQUES VERROUILLÉES. Aucun outil ni action ni écriture de mémoire. Les briques précédentes seront prononcées dans l'ordre et ne peuvent plus être modifiées. Réponds uniquement au prochain point achevé et utile du récit. Une phrase naturelle complète de 6 à 10 mots, idéalement 60 à 85 caractères, maximum 90 caractères. Exprime un point utile sans formule d’attente ; les détails suivants alimentent les prochaines briques. Ne coupe jamais une formulation apprise exacte pour la raccourcir : si elle exige plus de place, conserve-la entière. ${final?'Traite un point à la fois, puis les prochaines briques traiteront les autres.':'Aucune question, aucun conseil sensible ni conclusion globale prématurée.'} Ne commente pas chaque détail, ne répète pas une brique et n'annonce pas une suite. Respecte les formulations apprises et la langue de la personne. Une correction tardive se traite MAINTENANT, sans nier que la brique précédente a été dite. Ne confirme pas une actualité sportive non vérifiée : tu peux réagir au récit sans certifier le résultat. Si action, recherche, urgence, instruction de mémorisation/correction de devoir, ou demande incompatible, eligible=false. Si le point est inachevé, eligible=false. Ne produis ni balise, ni indication de scène, ni « hmm » écrit. traite doit être un PRÉFIXE EXACT du texte intégral, jusqu'au point auquel cette brique répond. ${final?'La personne a fini : traite le prochain point restant ou la correction, sans répéter les briques précédentes. Si tout est traité, traite est exactement le texte intégral. Si la transcription finale a révisé le préfixe déjà traité, réponds à cette précision et utilise le texte intégral comme traite.':'La personne parle encore : traite doit dépasser le préfixe déjà traité. Aucun mot des points suivants ne doit être inclus.'} Retourne eligible, reply et traite.`});
    messages.push({role:'system',content:s.briques.length===0
      ?'Tu commences une seule réponse composée de plusieurs briques. Une adresse comme « Oui papa » ou « D’accord papa » est facultative et réservée au début de cette première brique, jamais répétée ensuite.'
      :'Tu CONTINUES la même réponse, tu ne recommences pas une conversation. Enchaîne directement sur le contenu utile, sans salutation, sans formule d’accord introductive et sans nouvelle adresse « papa ». Les briques verrouillées constituent déjà le début de ta réponse.'});
    const mots=texte.split(' ');
    if(!diagnosticAncien)messages.push({role:'system',content:'FORMAT COMPACT : traite est le NUMÉRO du dernier mot traité (entier), choisi dans les positions fournies, et non le texte du préfixe. Si tout est traité, utilise le numéro du dernier mot. Ne recompte pas les mots, lis leur numéro. Le serveur reconstitue le préfixe exact. Les autres règles sur les préfixes restent applicables.'});
    messages.push({role:'user',content:JSON.stringify({texte_integral:texte,prefixe_deja_traite:s.traite,briques_verrouillees:s.briques.map(b=>b.texte),fin_de_parole:final,...(!diagnosticAncien?{positions:mots.map((mot,i)=>[i+1,mot])}:{})})});
    mesure.contexte_ms=Date.now()-debutPreparation;mesure.entree_signes=messages.reduce((n,m)=>n+m.content.length,0);
    const debutModele=Date.now();
    const schema={type:'object',properties:{eligible:{type:'boolean'},reply:{type:'string'},traite:{type:diagnosticAncien?'string':'integer'}},required:['eligible','reply','traite'],additionalProperties:false};
    if((process.env.BIA_LLM_PROVIDER||'anthropic')!=='anthropic')throw Error('Fournisseur incompatible');
    /* Le modèle des briques a sa propre variable : voir modeleBriques(). Un
       essai peut en forcer un autre, et seulement un essai. */
    const model=modeleRapidite(s.profil,modeleEssai||s.modeleEssai||modeleBriques());noterModeleRapidite(s.profil,model);
    /* Le champ public dit le modèle de PRODUCTION. Un essai qui force un
       témoin ne doit pas le repeindre : le 24 octobre, mon propre essai a
       publié `claude-sonnet-5-5` parce qu'il finissait par le témoin. */
    if(!modeleEssai&&!s.modeleEssai)etatBriques.modele_briques=model;
    const r=await fetchAnthropic((process.env.ANTHROPIC_BASE_URL||'https://api.anthropic.com')+'/v1/messages',{method:'POST',headers:{'content-type':'application/json','x-api-key':process.env.BIA_LLM_API_KEY||process.env.ANTHROPIC_API_KEY||'','anthropic-version':'2023-06-01'},body:JSON.stringify({model,max_tokens:3000,output_config:{format:{type:'json_schema',schema}},...messagesAnthropic(messages)}),signal},Date.now()+15000);
    if(!r.ok)throw Error('Modèle indisponible');const data=await r.json();if(data.stop_reason==='max_tokens')throw Error('JSON incomplet');
    mesure.modele_ms=Date.now()-debutModele;mesure.sortie_signes=contenuAnthropic(data).length;
    const d=JSON.parse(contenuAnthropic(data));
    if(d.eligible!==true)return null;
    /* ── SEPT RAISONS SOUS UN SEUL NOM, ET C'ÉTAIT MA FAUTE ─────────────────

       Mesuré le 25 octobre sur les tours de Lamine : sessions 7, préparées 3,
       ERREURS 2, dernier_echec « Brique invalide » après 1 499 ms. Deux
       préparations sur sept jetées — et le motif ne disait pas laquelle des
       SEPT règles le modèle avait enfreinte. Un refus sans nom est un refus
       qu'on cherchera encore dans six jours : c'est écrit dans
       AVANT-DE-DIRE-QUE-C-EST-BON.md, et je venais de le refaire.

       Chaque règle porte son nom maintenant. Le texte rendu reste le même —
       on ne valide ni plus ni moins qu'avant, on dit seulement POURQUOI. */
    const refuser=(raison:string)=>{
      const e=Error('Brique invalide') as Error&{raison?:string};
      e.raison=raison;
      return e;
    };
    if(!diagnosticAncien&&(!Number.isInteger(d.traite)||d.traite<1||d.traite>mots.length))
      throw refuser('mots_traites_hors_bornes');
    const traite=diagnosticAncien?normaliserAnticipation(d.traite):mots.slice(0,d.traite).join(' '),reply=enchainerBrique(String(d.reply||'').trim(),s.briques.length);
    if(!texte.startsWith(traite))throw refuser('traite_pas_prefixe_du_texte');
    if((!final||texte.startsWith(s.traite))&&(!traite.startsWith(s.traite)||traite.length<=s.traite.length))
      throw refuser('aucun_progres_depuis_la_brique_precedente');
    if(reply.length<4)throw refuser('reponse_trop_courte');
    if(reply.length>220)throw refuser('reponse_trop_longue');
    if(/\[\[|\]\]/.test(reply))throw refuser('balise_decran_dans_la_reponse');
    if(final&&!texte.startsWith(s.traite)&&traite!==texte)throw refuser('finale_ne_couvre_pas_le_texte');
    return {traite,reply};
}
function oublierSuite(s:Session){s.suite?.abort.abort();s.suite=undefined;}
function anticiperSuite(s:Session,texte:string,courante:TexteBrique,final:boolean,signal:AbortSignal){
 oublierSuite(s);
 // One text-only look-ahead for an unchanged transcript and phase. No speculative
 // audio, memory write or quota charge; locked audio is still committed below.
 const abort=new AbortController();
 const suivant:VueTexte={profil:s.profil,history:s.history,resume:s.resume,traite:courante.traite,briques:[...s.briques,{texte:courante.reply}]};
 const mesure:MesureTexte={contexte_ms:0,modele_ms:0,entree_signes:0,sortie_signes:0};
 const resultat=preparerTexte(suivant,texte,final,s.maitre,AbortSignal.any([abort.signal,signal,AbortSignal.timeout(15000)]),mesure)
  .then(texte=>({texte,mesure})).catch(()=>null);
 s.suite={texte,prefixe:courante.traite,numero:s.briques.length+1,final,abort,resultat};
}

/** A brick is committed only when both the complete text and complete audio exist. */
export async function preparerBrique(body:any,code:string,maitre:boolean,signal:AbortSignal,diagnostic?:'classique'|'chauffe',flux?:{debut:(b:Omit<BriqueAudio,'audio'>)=>void;morceau:(d:{audio:string;partie:number;parties:number;empreinte:string;voice:string})=>void}){
  const diagnosticAncien=diagnostic==='classique';
  nettoyer();const owner=empreinteAnticipation(code),texte=normaliserAnticipation(body.texte),final=body.final===true;
  let s:Session|undefined;
  if(body.id){s=sessions.get(String(body.id));if(!s||s.owner!==owner||s.profil!==profilRapidite(body.essaiRapidite))throw Error('Session inconnue');}
  else {
    /* ── CHAQUE REFUS PORTE SON NOM ──────────────────────────────────────

       Sept conditions étaient réunies dans un seul `||` : le refus repartait
       `null`, sans trace. Le 23 octobre, `sessions: 0` et `preparations: 0`
       ne disaient donc rien de la cause. Même ordre, même décision, mais
       chaque porte se nomme avant de se fermer. Voir lib/eligibilite-etat.ts. */
    if(texte.length<signesAnticipation()||texte.length>6000){noterRefusServeur('texte_court',texte.length);return null;}
    if(!eligibleBriques(texte)){noterRefusServeur('texte_action',texte.length);return null;}
    if(salutationReconnue(texte)){noterRefusServeur('salutation',texte.length);return null;}
    if(identiteReconnue(texte)){noterRefusServeur('identite',texte.length);return null;}
    if(!Array.isArray(body.history)){noterRefusServeur('historique');return null;}
    if(!['female','male'].includes(body.voice)){noterRefusServeur('voix');return null;}
    if(body.apprend){noterRefusServeur('apprentissage');return null;}
    if(! /^[a-zA-Z0-9_-]{8,80}$/.test(String(body.tour||''))){noterRefusServeur('tour_invalide');return null;}
    if(sessions.size>=32||[...sessions.values()].filter(x=>x.owner===owner&&!x.fermee).length>=4){noterRefusServeur('limite_personne');return null;}
    const v=verifierCode(code,false);if(!v.ok)return null;
    s={modeleEssai:typeof body.modeleEssai==='string'&&/^claude-[a-z0-9.-]{3,60}$/.test(body.modeleEssai)?body.modeleEssai:undefined,profil:profilRapidite(body.essaiRapidite),id:randomUUID(),owner,tour:body.tour,history:contexteAnticipation(body.history.map((m:any)=>({...m,role:m.role==='bia'?'assistant':m.role}))),resume:String(body.resume||'').slice(0,6000),voice:body.voice,maitre,expire:Date.now()+240000,traite:'',dernier:'',briques:[],occupe:false,fermee:false,appels:0};
    sessions.set(s.id,s);etatBriques.sessions++;
  }
  if(body.action==='annuler'){oublierSuite(s);s.fermee=true;s.expire=Date.now();return resultat(s);}
  if(body.action==='livree'){
    if(!s.fermee||s.livree||body.nombre!==s.briques.length||!s.briques.length)return null;
    s.livree=true;
    const personne=s.maitre?'maitre':String(body.personne||'').trim().slice(0,80);
    if(personne)await garder({personne,dit:s.dernier,repondu:s.briques.map(b=>b.texte).join(' '),langue:s.briques[0].langue}).catch(()=>{});
    return resultat(s);
  }
  if(s.occupe)throw Error('Préparation en cours');
  if(s.fermee)return resultat(s);
  // Audio already committed is immutable. A revised final transcription is
  // explained in the next brick; actual action requests retain normal routing.
  if(!eligibleBriques(texte)||(!final&&!texte.startsWith(s.traite))){
    oublierSuite(s);if(final)s.fermee=true;
    return resultat(s,undefined,final);
  }
  if(!final&&(s.briques.length>=5||s.appels>=10||texte.length-s.traite.length<signesAnticipation()))return resultat(s);
  if(final&&texte===s.traite){oublierSuite(s);if(!verifierCode(code,true).ok)return resultat(s,undefined,true);s.fermee=true;etatBriques.finalisees++;return resultat(s);}
  s.occupe=true;s.appels++;s.dernier=texte;
  let etape='contexte';const debutPreparation=Date.now();
  const mesure={profil:diagnosticAncien?'classique':'concis',synthetique:s.tour.startsWith('diagnostic-'),contexte_ms:0,modele_ms:0,audio_ms:0,total_ms:0,entree_signes:0,sortie_signes:0,parties:0,preparation_voix_ms:0,generation_voix_ms:0,fabrication_voix_ms:0,cache_parties:0,eligible:false,modele_anticipe:false,modele_attente_ms:0};
  try {
    signal.throwIfAborted();
    const suite=s.suite;
    const compatible=!diagnostic&&suite?.final===final&&suite.texte===texte&&suite.prefixe===s.traite&&suite.numero===s.briques.length;
    let courante:TexteBrique|null;const attenteModele=Date.now();
    etape='modele';
    if(suite&&compatible){
      const annuler=()=>suite.abort.abort();signal.addEventListener('abort',annuler,{once:true});
      let avance;try{avance=await suite.resultat;}finally{signal.removeEventListener('abort',annuler);if(s.suite===suite)s.suite=undefined;}
      signal.throwIfAborted();if(s.fermee)throw Error('Session annulée');
      if(avance){Object.assign(mesure,avance.mesure);mesure.modele_anticipe=true;courante=avance.texte;}
      else courante=await preparerTexte(s,texte,final,maitre,signal,mesure,diagnosticAncien);
    }else{oublierSuite(s);courante=await preparerTexte(s,texte,final,maitre,signal,mesure,diagnosticAncien);}
    signal.throwIfAborted();if(s.fermee)throw Error('Session annulée');
    mesure.modele_attente_ms=Date.now()-attenteModele;
    if(!courante){if(final||diagnostic){s.fermee=true;oublierSuite(s);}return {...resultat(s,undefined,final),mesure};}
    const {traite,reply}=courante;
    mesure.eligible=true;
    // Internal startup comparison only: do not synthesize or charge a spoken
    // turn for the old prompt. The public route cannot enable this argument.
    if(diagnostic){s.fermee=true;return {...resultat(s),mesure};}
    const termine=final&&traite===texte;
    // A streamed final answer must reserve its single turn before any audio
    // leaves the server, rather than checking quota after it was already heard.
    let quotaReserve=false;
    if(flux&&termine){if(!verifierCode(code,true).ok){s.fermee=true;return resultat(s,undefined,true);}quotaReserve=true;}
    etape='audio';const debutAudio=Date.now();const langue=detecterLangue(reply,detecterLangue(texte,'wo')) as 'wo'|'fr';
    if(traite!==texte&&s.appels<(final?8:10)&&s.briques.length<(final?8:4))anticiperSuite(s,texte,courante,final,signal);
    const audioComplet=await (async()=>{
      signal.throwIfAborted();
      const response=await synthetiser(new NextRequest('https://app.khalam.app/api/chatterbox-test/bia',{method:'POST',headers:{'content-type':'application/json','x-bia-code':code},body:JSON.stringify({texte:reply,langue,voice:s!.voice,lecture_fidele:true,continu:true,brique:true,final}),signal}));
      if(response.ok)flux?.debut({numero:s!.briques.length,texte:reply,langue,voice:s!.voice});
      return lireAudioBrique(response,s!.voice,signal,flux?.morceau);
    })();
    const {clips,parties}=audioComplet;
    mesure.audio_ms=Date.now()-debutAudio;mesure.parties=parties;
    mesure.preparation_voix_ms=audioComplet.preparation_ms;mesure.generation_voix_ms=audioComplet.generation_ms;mesure.fabrication_voix_ms=audioComplet.fabrication_ms;mesure.cache_parties=audioComplet.cache_parties;
    signal.throwIfAborted();if(s.fermee)throw Error('Session annulée');
    const audio=Buffer.from(assemblerSonsCourants(clips,30).wav).toString('base64');
    if(termine&&!quotaReserve&&!verifierCode(code,true).ok){s.fermee=true;return resultat(s,undefined,true);}
    const brique=Object.freeze({numero:s.briques.length,texte:reply,audio,langue,voice:s.voice});
    s.briques.push(brique);s.traite=traite;etatBriques.preparees++;
    if(termine){oublierSuite(s);s.fermee=true;etatBriques.finalisees++;}
    return {...resultat(s,brique),mesure};
  } catch(e){oublierSuite(s);etatBriques.erreurs++;const message=e instanceof Error?e.message:'';const raison=(e as Error&{raison?:string})?.raison;
  /* Le motif général ET la règle précise. Les deux : le motif dit à quelle
     étape ça casse, la raison dit laquelle des sept règles le modèle a
     enfreinte — et c'est elle qui dit s'il faut changer la consigne, le
     modèle, ou le seuil. */
  /* `??=` : une instance déjà démarrée porte un état sans ce champ, et
     `etatBriques.motifs_invalides[raison]` y jetterait un TypeError au
     premier refus — c'est-à-dire exactement au moment où on a besoin de
     lui. Une épreuve l'a attrapé avant le déploiement. */
  if(raison){(etatBriques.motifs_invalides??={})[raison]=(etatBriques.motifs_invalides[raison]||0)+1;}
  etatBriques.dernier_echec={etape,annule:signal.aborted,motif:['Audio incomplet','Brique invalide','JSON incomplet','Modèle indisponible','Session annulée'].includes(message)?message:'autre',raison:raison||null,ms:Date.now()-debutPreparation,quand:new Date().toISOString()};if(signal.aborted){s.fermee=true;if(!s.briques.length)sessions.delete(s.id);}throw e;}
  finally{mesure.total_ms=Date.now()-debutPreparation;etatBriques.fabrications??=[];etatBriques.fabrications=[...etatBriques.fabrications.slice(-19),{...mesure,final,quand:new Date().toISOString()}];s.occupe=false;}
}

