import {personnaliteConversation} from './conversation-groq';
import {CONSIGNE_COMPREHENSION} from './comprehension-conversation';
import {messagesAnthropic,fetchAnthropic,MODELE_SONNET} from './cerveau-anthropic';
import {contexteInstructions} from './instructions-apprentissage';

type Prefixe=ReturnType<typeof messagesAnthropic>['system'];
type Echantillon={mode:string;statut:number;premier_texte_ms:number|null;complet_ms:number;cache_lu:number;cache_ecrit_1h:number;sortie_jetons:number;termine:boolean};
const g=globalThis as typeof globalThis&{biaLatenceCache?:{chauffe?:Promise<void>;essai?:Promise<void>;rapport:any}};
const etat=g.biaLatenceCache??={rapport:{prechauffage:[],comparaison:null}};
export const resumeLatenceCache=()=>({revision:'prefixes-stables-1h-v1',duree_secondes:3600,...etat.rapport});

/** The exact production prefix, ending before any retrieval or user message.
 * No invented filler and no cached answer. Keep all instruction bytes intact. */
export function prefixeContexte(maitre:boolean,instructions=''):Prefixe{
 const messages=[{role:'system',content:[personnaliteConversation('BIA',maitre),CONSIGNE_COMPREHENSION].filter(Boolean).join('\n\n')}];
 if(maitre&&instructions)messages.push({role:'system',content:'INSTRUCTIONS PÉDAGOGIQUES DU MAÎTRE AUTHENTIFIÉ\n'+instructions});
 return messagesAnthropic(messages).system;
}
const configure=()=>process.env.BIA_LLM_PROVIDER!=='groq'&&(!process.env.BIA_LLM_PROVIDER||process.env.BIA_LLM_PROVIDER==='anthropic')&&Boolean(process.env.BIA_LLM_API_KEY||process.env.ANTHROPIC_API_KEY);
async function appeler(system:Prefixe,max_tokens:number,stream=false){
 return fetchAnthropic((process.env.ANTHROPIC_BASE_URL||'https://api.anthropic.com')+'/v1/messages',{
  method:'POST',headers:{'content-type':'application/json','anthropic-version':'2023-06-01','x-api-key':process.env.BIA_LLM_API_KEY||process.env.ANTHROPIC_API_KEY||''},
  body:JSON.stringify({model:process.env.BIA_LLM_MODEL||MODELE_SONNET,system,messages:[{role:'user',content:max_tokens===0?'warmup':'Explique en une phrase courte pourquoi le ciel est bleu. Réponds en français.'}],max_tokens,...(stream?{stream:true}:{})}),
 },Date.now()+12000);
}
/** At most two zero-output calls per process. Never delays a conversation,
 * changes a voice, writes memory, or keeps a paid idle timer running. */
export function prechaufferContexteAnthropic(){return etat.chauffe??=(async()=>{
 if(!configure())return;
 for(const maitre of [false,true]){
  const debut=Date.now();
  try{
   const instructions=maitre?await contexteInstructions():'';
   const r=await appeler(prefixeContexte(maitre,instructions),0);
   const d=await r.json(),u=d.usage||{};
   etat.rapport.prechauffage.push({maitre,statut:r.status,ms:Date.now()-debut,cache_lu:Number(u.cache_read_input_tokens)||0,cache_ecrit_1h:Number(u.cache_creation?.ephemeral_1h_input_tokens)||0,sortie_jetons:Number(u.output_tokens)||0});
  }catch{etat.rapport.prechauffage.push({maitre,statut:'indisponible',ms:Date.now()-debut});}
 }
})();}
async function mesurer(system:Prefixe,mode:string):Promise<Echantillon>{
 const debut=Date.now();let premier:number|null=null,usage:any={},termine=false;
 const r=await appeler(system,96,true);
 if(!r.ok){await r.body?.cancel();return {mode,statut:r.status,premier_texte_ms:null,complet_ms:Date.now()-debut,cache_lu:0,cache_ecrit_1h:0,sortie_jetons:0,termine:false};}
 if(!r.body)throw Error('flux_absent');
 const reader=r.body.getReader(),decoder=new TextDecoder();let buffer='';
 const traiter=(paquet:string)=>{
  const raw=paquet.match(/^data:\s*(.+)$/m)?.[1];if(!raw)return;
  const d=JSON.parse(raw);
  if(d.type==='error')throw Error('flux_refuse');
  if(d.type==='message_start')usage={...usage,...d.message?.usage};
  if(d.type==='message_delta')usage={...usage,...d.usage};
  if(d.delta?.type==='text_delta'&&d.delta.text)premier??=Date.now()-debut;
  if(d.type==='message_stop')termine=true;
 };
 try{
  for(;;){const d=await reader.read();buffer+=d.done?decoder.decode():decoder.decode(d.value,{stream:true});buffer=buffer.replace(/\r\n/g,'\n');let k;
   while((k=buffer.indexOf('\n\n'))>=0){traiter(buffer.slice(0,k));buffer=buffer.slice(k+2);}if(d.done)break;}
  if(buffer.trim())traiter(buffer);
 }finally{await reader.cancel().catch(()=>{});reader.releaseLock();}
 return {mode,statut:r.status,premier_texte_ms:premier,complet_ms:Date.now()-debut,cache_lu:Number(usage.cache_read_input_tokens)||0,cache_ecrit_1h:Number(usage.cache_creation?.ephemeral_1h_input_tokens)||0,sortie_jetons:Number(usage.output_tokens)||0,termine};
}
/** Four fixed synthetic text calls during this rollout only; alternating order.
 * Report numeric provider timings, never private prompts or generated text.
 * This measures prefill/first text, not microphone-to-speaker latency. */
export function verifierLatenceCache(){return etat.essai??=(async()=>{
 if(!configure())return;
 const cas:Echantillon[]=[];
 etat.rapport.comparaison={statut:'en_cours',synthetique:true,lecture_navigateur_mesuree:false,cas};
 try{
  await prechaufferContexteAnthropic();
  const prefixe=prefixeContexte(true,await contexteInstructions());
  for(const mode of ['sans_cache','cache_1h','cache_1h','sans_cache']){
   const system=mode==='cache_1h'?prefixe:prefixe.map(({cache_control,...bloc})=>bloc);
   cas.push(await mesurer(system,mode));
  }
  etat.rapport.comparaison.statut=cas.every(c=>c.statut===200&&c.termine&&c.premier_texte_ms!==null)&&cas.filter(c=>c.mode==='cache_1h').every(c=>c.cache_lu>0)?'termine':'non_confirme';
 }catch{etat.rapport.comparaison.statut='indisponible';}
 etat.rapport.comparaison.fin=new Date().toISOString();
})();}
