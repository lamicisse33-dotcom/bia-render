import {CAS_GPT,MODELES_GPT,controleEssai,lireFluxEssai,medianeEssai,type MessageEssai} from './essai-gpt-core';
import {prefixeContexte} from './latence-cache-anthropic';
import {contexteInstructions} from './instructions-apprentissage';
import {corpsAnthropic,MODELE_SONNET} from './cerveau-anthropic';
import {teteDeLaReponse} from './diffusion';

type Mesure={cas:string;modele:string;passage:number;statut:number;premier_texte_ms:number|null;premiere_phrase_ms:number|null;complet_ms:number;reponse?:string;controle_exact?:boolean|null;cache_lu?:number;sortie_jetons?:number;erreur?:string};
type Rapport={statut:string;effort:'low'|'medium';date?:string;fin?:string;erreur?:string;contexte_ms?:number;total:number;mesures:Mesure[]};
const g=globalThis as typeof globalThis&{biaEssaiGPT?:{rapport:Rapport;travail?:Promise<void>;annuler?:AbortController;lancements:number}};
const etat=g.biaEssaiGPT??={rapport:{statut:'non_lance',effort:'low',total:36,mesures:[]},lancements:0};
const cleOpenAI=()=>process.env.OPENAI_API_KEY||process.env.OPENAI_CLE||'';
const cleAnthropic=()=>!process.env.BIA_LLM_PROVIDER||process.env.BIA_LLM_PROVIDER==='anthropic'?process.env.BIA_LLM_API_KEY||process.env.ANTHROPIC_API_KEY||'':'';
const modeleSonnet=()=>process.env.BIA_LLM_MODEL||MODELE_SONNET;
const style="ESSAI DE CONVERSATION : réponds en 40 mots maximum, sauf répétition exacte. Wolof urbain de Dakar simple, vivant et compréhensible ; français conservé quand plus naturel. Respecte exactement les corrections données. Exemples validés à ne pas réciter hors contexte : « Dañu ma bëgg jox ku ma bëggul. » ; « Kan moo la ko bëgg may ? ». Une seule question au maximum. N'invente ni cause, souvenir ni résultat d'action. Aucun outil, aucune écriture de mémoire. Une demande de traduction appelle seulement sa traduction.";
export function resumeEssaiGPT(prive=false){
 const r=etat.rapport;
 const configuration={openai:Boolean(cleOpenAI()),anthropic:Boolean(cleAnthropic()),pret:Boolean(cleOpenAI()&&cleAnthropic())};
 const bilans=MODELES_GPT.map(m=>{const toutes=r.mesures.filter(x=>x.modele===m.id),a=toutes.filter(x=>x.statut===200&&!x.erreur);return {id:m.id,nom:m.nom,reussites:a.length,echecs:toutes.length-a.length,erreurs:[...new Set(toutes.flatMap(x=>x.erreur?[x.erreur]:[]))],controles_exacts:a.filter(x=>x.controle_exact!==null&&x.controle_exact!==undefined).length,controles_reussis:a.filter(x=>x.controle_exact===true).length,premier_texte_ms:medianeEssai(a.flatMap(x=>x.premier_texte_ms===null?[]:[x.premier_texte_ms])),premiere_phrase_ms:medianeEssai(a.flatMap(x=>x.premiere_phrase_ms===null?[]:[x.premiere_phrase_ms])),complet_ms:medianeEssai(a.map(x=>x.complet_ms))};});
 const commun={revision:'essai-gpt-isole-v1',configuration,statut:r.statut,effort:r.effort,lancements_restants:Math.max(0,2-etat.lancements),date:r.date,fin:r.fin,erreur:r.erreur,total:r.total,realises:r.mesures.length,contexte_ms:r.contexte_ms,bilans,version:(process.env.RENDER_GIT_COMMIT||'').slice(0,12),modele_sonnet:modeleSonnet(),limite:'Texte uniquement, hors microphone et synthèse vocale. GPT‑6 Astra est un candidat API : le libellé GPT‑6 de la capture ne prouve pas la variante utilisée dans ChatGPT. La qualité wolof et la compréhension sont à juger sur les réponses.'};
 return prive?{...commun,cas:CAS_GPT,mesures:r.mesures}:commun;
}
export function annulerEssaiGPT(){etat.annuler?.abort();}
export function lancerEssaiGPT(effort:'low'|'medium'='low'){
 if(etat.travail)return etat.travail;
 // No reference-model bill when the comparison cannot actually be made.
 if(!cleOpenAI()||!cleAnthropic()){etat.rapport={...etat.rapport,statut:'configuration_manquante',erreur:!cleOpenAI()?'cle_openai_absente':'cle_anthropic_absente'};return Promise.resolve();}
 if(etat.lancements>=2)return Promise.resolve();
 etat.lancements++;const abort=new AbortController();etat.annuler=abort;
 const rapport:Rapport=etat.rapport={statut:'en_cours',effort,date:new Date().toISOString(),total:36,mesures:[]};
 const travail=(async()=>{
  try{
   const debutContexte=Date.now(),instructions=await contexteInstructions();
   const system=[...prefixeContexte(true,instructions),{type:'text',text:style}];rapport.contexte_ms=Date.now()-debutContexte;
   const refuses=new Set<string>();
   for(let passage=1;passage<=2;passage++)for(const [i,c] of CAS_GPT.entries()){
    // Alternate order across cases and repeats; no model always goes first.
    const depart=(i+passage-1)%MODELES_GPT.length;
    for(let j=0;j<MODELES_GPT.length;j++){
     if(abort.signal.aborted)throw Error('annule');
     const m=MODELES_GPT[(depart+j)%MODELES_GPT.length];if(refuses.has(m.id))continue;
     const debut=Date.now();let premier:number|null=null,phrase:number|null=null;
     const mesure:Mesure={cas:c.id,modele:m.id,passage,statut:0,premier_texte_ms:null,premiere_phrase_ms:null,complet_ms:0};
     try{
      const messages:MessageEssai[]=[...c.history,{role:'user',content:c.question}];
      const isOpenAI=m.provider==='openai';
      const body=isOpenAI?{model:m.id,instructions:system.map(b=>b.text).join('\n\n'),input:messages,reasoning:{effort},text:{verbosity:'low'},max_output_tokens:1536,stream:true,store:false}
       :corpsAnthropic({model:modeleSonnet(),system,messages,max_tokens:256,stream:true});
      const r=await fetch(isOpenAI?'https://api.openai.com/v1/responses':(process.env.ANTHROPIC_BASE_URL||'https://api.anthropic.com')+'/v1/messages',{
       method:'POST',headers:isOpenAI?{'content-type':'application/json',Authorization:'Bearer '+cleOpenAI()}:{'content-type':'application/json','anthropic-version':'2023-06-01','x-api-key':cleAnthropic()},body:JSON.stringify(body),signal:AbortSignal.any([abort.signal,AbortSignal.timeout(20000)])});
      mesure.statut=r.status;
      if(!r.ok){await r.body?.cancel();mesure.erreur='HTTP_'+r.status;if([400,401,402,403,404,429].includes(r.status))refuses.add(m.id);}
      else{
       const d=await lireFluxEssai(r,m.provider,texte=>{premier??=Date.now()-debut;if(phrase===null&&teteDeLaReponse(texte))phrase=Date.now()-debut;});
       mesure.reponse=d.texte;mesure.controle_exact=controleEssai(c.id,d.texte);
       mesure.cache_lu=Number(isOpenAI?d.usage.input_tokens_details?.cached_tokens:d.usage.cache_read_input_tokens)||0;
       mesure.sortie_jetons=Number(d.usage.output_tokens)||0;
      }
     }catch(e){mesure.erreur=abort.signal.aborted?'annule':(e as Error)?.name==='TimeoutError'?'delai_20s':['flux_incomplet','flux_refuse','flux_absent','flux_trop_long'].includes((e as Error)?.message)?(e as Error).message:'indisponible';}
     mesure.premier_texte_ms=premier;mesure.premiere_phrase_ms=phrase;mesure.complet_ms=Date.now()-debut;rapport.mesures.push(mesure);
    }
   }
   rapport.statut=rapport.mesures.length===rapport.total&&rapport.mesures.every(x=>x.statut===200&&!x.erreur)?'termine':'termine_avec_echecs';
  }catch{rapport.statut=abort.signal.aborted?'annule':'indisponible';rapport.erreur=abort.signal.aborted?'annule':'lecture_contexte_indisponible';}
  finally{rapport.fin=new Date().toISOString();}
 })();
 etat.travail=travail;
 void travail.finally(()=>{if(etat.travail===travail)etat.travail=undefined;});
 return travail;
}
