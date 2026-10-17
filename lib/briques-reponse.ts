import {randomUUID} from 'node:crypto';
import {NextRequest} from 'next/server';
import {verifierCode} from './codes';
import {fetchAnthropic,messagesAnthropic,contenuAnthropic,MODELE_SONNET} from './cerveau-anthropic';
import {messagesConversation} from './conversation-groq';
import {contexteMemoireCommune} from './memoire-organisee';
import {contexteInstructions} from './instructions-apprentissage';
import {detecterLangue} from './langue';
import {assemblerSonsCourants} from './assembler-sons-courants';
import {POST as synthetiser} from '../app/api/chatterbox-test/bia/route';
import {contexteAnticipation,empreinteAnticipation,normaliserAnticipation,eligibleAnticipation} from './anticipation-core';
import {gpuAnticipation} from './anticipation-gpu';
import {etatBriques} from './briques-etat';
import type {BriqueAudio} from './briques-file';
import {garder} from './souvenirs';

type Session={id:string;owner:string;tour:string;history:ReturnType<typeof contexteAnticipation>;resume:string;voice:'female'|'male';maitre:boolean;expire:number;traite:string;dernier:string;briques:BriqueAudio[];occupe:boolean;fermee:boolean;appels:number;livree?:boolean};
const g=globalThis as typeof globalThis&{biaBriques?:Map<string,Session>};
const sessions=g.biaBriques??=new Map<string,Session>();
const nettoyer=()=>{for(const [id,s] of sessions)if(s.expire<Date.now()&&!s.occupe)sessions.delete(id);if(sessions.size>=32)for(const [id,s] of sessions){if(s.fermee&&!s.occupe)sessions.delete(id);if(sessions.size<32)break;}};
function resultat(s:Session,brique?:BriqueAudio,normal=false){return {id:s.id,brique,termine:s.fermee,normal};}

/** A brick is committed only when both the complete text and complete audio exist. */
export async function preparerBrique(body:any,code:string,maitre:boolean,signal:AbortSignal){
  nettoyer();const owner=empreinteAnticipation(code),texte=normaliserAnticipation(body.texte),final=body.final===true;
  let s:Session|undefined;
  if(body.id){s=sessions.get(String(body.id));if(!s||s.owner!==owner)throw Error('Session inconnue');}
  else {
    if(!eligibleAnticipation(texte)||!Array.isArray(body.history)||!['female','male'].includes(body.voice)||body.apprend||! /^[a-zA-Z0-9_-]{8,80}$/.test(String(body.tour||'')))return null;
    if(sessions.size>=32||[...sessions.values()].filter(x=>x.owner===owner&&!x.fermee).length>=4)return null;
    const v=verifierCode(code,false);if(!v.ok)return null;
    s={id:randomUUID(),owner,tour:body.tour,history:contexteAnticipation(body.history.map((m:any)=>({...m,role:m.role==='bia'?'assistant':m.role}))),resume:String(body.resume||'').slice(0,6000),voice:body.voice,maitre,expire:Date.now()+240000,traite:'',dernier:'',briques:[],occupe:false,fermee:false,appels:0};
    sessions.set(s.id,s);etatBriques.sessions++;
  }
  if(body.action==='annuler'){s.fermee=true;s.expire=Date.now();return resultat(s);}
  if(body.action==='livree'){
    if(!s.fermee||s.livree||body.nombre!==s.briques.length||!s.briques.length)return null;
    s.livree=true;
    const personne=s.maitre?'maitre':String(body.personne||'').trim().slice(0,80);
    if(personne)await garder({personne,dit:s.dernier,repondu:s.briques.map(b=>b.texte).join(' '),langue:s.briques[0].langue}).catch(()=>{});
    return resultat(s);
  }
  if(s.occupe)throw Error('Préparation en cours');
  if(s.fermee)return resultat(s);
  // Never rewrite a committed prefix. ASR revisions, actions and unusual turns
  // go through ordinary chat after any already spoken brick has completed.
  if(texte.length>6000||!texte.startsWith(s.traite)||!eligibleAnticipation(texte)){
    if(final)s.fermee=true;
    return resultat(s,undefined,final);
  }
  if(!final&&(s.briques.length>=5||s.appels>=10||texte.length-s.dernier.length<35))return resultat(s);
  if(final&&texte===s.traite){if(!verifierCode(code,true).ok)return resultat(s,undefined,true);s.fermee=true;etatBriques.finalisees++;return resultat(s);}
  s.occupe=true;s.appels++;s.dernier=texte;
  let etape='contexte';
  try {
    const [memoire,instructions]=await Promise.all([contexteMemoireCommune(texte,s.history,6500),maitre?contexteInstructions():Promise.resolve('')]);
    const messages=messagesConversation({question:texte,history:s.history,resume:s.resume,maitre,fiches:memoire,instructions,rapide:true});
    messages.push({role:'system',content:`RÉPONSE ORALE PAR BRIQUES VERROUILLÉES. Aucun outil ni action ni écriture de mémoire. Les briques précédentes seront prononcées dans l'ordre et ne peuvent plus être modifiées. Réponds uniquement au prochain point achevé et utile du récit. Une phrase naturelle courte, maximum 180 caractères (${final?'deux phrases, maximum 360 caractères pour terminer':'aucune question, aucun conseil sensible ni conclusion globale prématurée'}). Ne commente pas chaque détail, ne répète pas une brique et n'annonce pas une suite. Respecte les formulations apprises et la langue de la personne. Une correction tardive se traite MAINTENANT, sans nier que la brique précédente a été dite. Ne confirme pas une actualité sportive non vérifiée : tu peux réagir au récit sans certifier le résultat. Si action, recherche, urgence, instruction de mémorisation/correction de devoir, ou demande incompatible, eligible=false. Si le point est inachevé, eligible=false. Ne produis ni balise, ni indication de scène, ni « hmm » écrit. ${final?'La personne a fini : traite tous les éléments restants importants et les corrections, sans répéter les briques précédentes. traite doit être exactement le texte intégral.':'La personne parle encore : traite doit être un PRÉFIXE EXACT du texte intégral, se terminant à la fin du point auquel cette brique répond, et dépasser le préfixe déjà traité. Aucun mot des points suivants ne doit être inclus.'} Retourne eligible, reply et traite.`});
    messages.push({role:'user',content:JSON.stringify({texte_integral:texte,prefixe_deja_traite:s.traite,briques_verrouillees:s.briques.map(b=>b.texte),fin_de_parole:final})});
    etape='modele';
    const schema={type:'object',properties:{eligible:{type:'boolean'},reply:{type:'string'},traite:{type:'string'}},required:['eligible','reply','traite'],additionalProperties:false};
    if((process.env.BIA_LLM_PROVIDER||'anthropic')!=='anthropic')throw Error('Fournisseur incompatible');
    const r=await fetchAnthropic((process.env.ANTHROPIC_BASE_URL||'https://api.anthropic.com')+'/v1/messages',{method:'POST',headers:{'content-type':'application/json','x-api-key':process.env.BIA_LLM_API_KEY||process.env.ANTHROPIC_API_KEY||'','anthropic-version':'2023-06-01'},body:JSON.stringify({model:process.env.BIA_LLM_MODEL||MODELE_SONNET,max_tokens:3000,output_config:{format:{type:'json_schema',schema}},...messagesAnthropic(messages)}),signal},Date.now()+15000);
    if(!r.ok)throw Error('Modèle indisponible');const data=await r.json();if(data.stop_reason==='max_tokens')throw Error('JSON incomplet');
    const d=JSON.parse(contenuAnthropic(data));
    if(d.eligible!==true){if(final)s.fermee=true;return resultat(s,undefined,final);}
    const traite=normaliserAnticipation(d.traite),reply=String(d.reply||'').trim();
    if(!texte.startsWith(traite)||!traite.startsWith(s.traite)||traite.length<=s.traite.length||reply.length<4||reply.length>(final?400:220)||/\[\[|\]\]/.test(reply)||(final&&traite!==texte))throw Error('Brique invalide');
    etape='audio';const langue=detecterLangue(reply,detecterLangue(texte,'wo')) as 'wo'|'fr';
    const clips:ArrayBuffer[]=[];let parties=1,empreinte:string|undefined;
    for(let partie=0;partie<parties;partie++){
      signal.throwIfAborted();
      const response=await gpuAnticipation(async()=>{signal.throwIfAborted();return synthetiser(new NextRequest('https://app.khalam.app/api/chatterbox-test/bia',{method:'POST',headers:{'content-type':'application/json','x-bia-code':code},body:JSON.stringify({texte:reply,langue,voice:s!.voice,lecture_fidele:true,partie,empreinte}),signal}));},final?1:0);
      const a=await response.json();if(!response.ok||!a.audio||a.voice!==s.voice||a.partie!==partie||!Number.isInteger(a.parties)||a.parties<1||a.parties>8||(empreinte&&a.empreinte!==empreinte))throw Error('Audio incomplet');
      parties=a.parties;empreinte=a.empreinte;clips.push(Uint8Array.from(Buffer.from(a.audio,'base64')).buffer);
    }
    signal.throwIfAborted();if(s.fermee)throw Error('Session annulée');
    const audio=Buffer.from(assemblerSonsCourants(clips,30).wav).toString('base64');
    if(final&&!verifierCode(code,true).ok){s.fermee=true;return resultat(s,undefined,true);}
    const brique=Object.freeze({numero:s.briques.length,texte:reply,audio,langue,voice:s.voice});
    s.briques.push(brique);s.traite=traite;etatBriques.preparees++;
    if(final){s.fermee=true;etatBriques.finalisees++;}
    return resultat(s,brique);
  } catch(e){etatBriques.erreurs++;etatBriques.dernier_echec={etape,annule:signal.aborted};if(signal.aborted){s.fermee=true;if(!s.briques.length)sessions.delete(s.id);}throw e;}
  finally{s.occupe=false;}
}
