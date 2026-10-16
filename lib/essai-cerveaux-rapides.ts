import {messagesConversation} from './conversation-groq';
import {messagesAnthropic,corpsAnthropic} from './cerveau-anthropic';
import {teteDeLaReponse,sansBalises} from './diffusion';
const g=globalThis as typeof globalThis&{biaComparaisonCerveaux?:{rapport:any;travail?:Promise<void>}};
const etat=g.biaComparaisonCerveaux??={rapport:null};
export const resumeComparaisonCerveaux=()=>etat.rapport;
// Eight bounded synthetic requests, no user history, storage writes or voice calls.
export function comparerCerveaux(){return etat.travail??=(async()=>{
 const cas:any[]=[];etat.rapport={statut:'en_cours',date:new Date().toISOString(),cas};
 const questions=[
  {nom:'fr',question:'Pourquoi le ciel est bleu ? Réponds simplement en français.',history:[]},
  {nom:'wo',question:'Dama sonn tey. Réponds en wolof urbain de Dakar.',history:[]},
  {nom:'contexte',question:'Je ne peux pas le matin. Que proposes-tu alors ? Réponds en français.',history:[{role:'user',content:'Je travaille de 8 h à 18 h et je veux marcher vingt minutes chaque jour.'},{role:'assistant',content:'Tu pourrais marcher le matin avant le travail.'}]},
  {nom:'correction',question:'Répète seulement ma correction exacte : Bon, nu wax ci leneen.',history:[]},
 ];
 for(const [i,q] of questions.entries())for(const model of (i%2?['claude-haiku-5-5','claude-sonnet-5-5']:['claude-sonnet-5-5','claude-haiku-5-5'])){
  const debut=performance.now();let texte='',premier:number|null=null,phrase:number|null=null,stop='',usage:any={};
  try{
   const native=messagesAnthropic(messagesConversation({...q,maitre:true,rapide:true}));
   const body=corpsAnthropic({model,max_tokens:256,...native,stream:true,thinking:{type:'disabled'},output_config:{effort:'low'}});
   const r=await fetch(`${process.env.ANTHROPIC_BASE_URL||'https://api.anthropic.com'}/v1/messages`,{method:'POST',headers:{'content-type':'application/json','anthropic-version':'2023-06-01','x-api-key':process.env.BIA_LLM_API_KEY||process.env.ANTHROPIC_API_KEY||''},body:JSON.stringify(body),signal:AbortSignal.timeout(12000)});
   if(!r.ok){cas.push({nom:q.nom,model,statut:r.status,ms:Math.round(performance.now()-debut)});await r.body?.cancel();continue;}
   const reader=r.body!.getReader(),decoder=new TextDecoder();let buffer='';
   for(;;){const v=await reader.read();if(v.done)break;buffer+=decoder.decode(v.value,{stream:true});let k;
    while((k=buffer.indexOf('\n\n'))>=0){const packet=buffer.slice(0,k);buffer=buffer.slice(k+2);const raw=packet.match(/^data:\s*(.+)$/m)?.[1];if(!raw)continue;const d=JSON.parse(raw);
     if(d.type==='message_start')usage={...d.message?.usage};
     if(d.type==='message_delta'){usage={...usage,...d.usage};stop=d.delta?.stop_reason||stop;}
     if(d.type==='error')throw Error('flux_fournisseur');
     if(d.delta?.type==='text_delta'){premier??=Math.round(performance.now()-debut);texte+=d.delta.text||'';if(phrase===null&&teteDeLaReponse(texte))phrase=Math.round(performance.now()-debut);}
    }
   }
   cas.push({nom:q.nom,model,statut:200,premier_texte_ms:premier,premiere_phrase_ms:phrase,complet_ms:Math.round(performance.now()-debut),stop,usage,reponse_test:texte,correction_exacte:q.nom==='correction'?sansBalises(texte)==='Bon, nu wax ci leneen.':null});
  }catch{cas.push({nom:q.nom,model,erreur:true,ms:Math.round(performance.now()-debut)});}
 }
 etat.rapport={...etat.rapport,statut:'termine',fin:new Date().toISOString(),version:(process.env.RENDER_GIT_COMMIT||'').slice(0,12),limite:'Questions synthétiques, personnalité BIA sans mémoire privée ni synthèse vocale. Petit échantillon ; qualité wolof à valider.'};
})();}
