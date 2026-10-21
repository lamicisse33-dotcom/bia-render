export type MessageEssai={role:'user'|'assistant';content:string};
export const CAS_GPT=[
 {id:'fatigue',nom:'Comprendre le wolof',question:'Dama sonn tey. Réponds en wolof urbain de Dakar.',history:[] as MessageEssai[],critere:'Reconnaître la fatigue, sans inventer sa cause, et répondre avec naturel.'},
 {id:'traduction',nom:'Traduire naturellement',question:'Traduis seulement en wolof urbain de Dakar : Ne pense pas immédiatement au pire. Il peut y avoir d’autres raisons. Est-ce que tu l’as appelée ?',history:[] as MessageEssai[],critere:'Conserver le sens, avec un wolof urbain simple et du français si plus naturel.'},
 {id:'correction',nom:'Respecter une correction',question:'Répète seulement ma correction exacte : Kan moo la ko bëgg may ?',history:[] as MessageEssai[],critere:'Rendre exactement « Kan moo la ko bëgg may ? », sans ajout.',exact:'Kan moo la ko bëgg may ?'},
 {id:'contexte',nom:'Tenir compte du contexte',question:'Je ne peux pas le matin. Que proposes-tu alors ? Réponds en français.',history:[{role:'user',content:'Je travaille de 8 h à 18 h et je veux marcher vingt minutes chaque jour.'},{role:'assistant',content:'Tu pourrais marcher le matin avant le travail.'}] as MessageEssai[],critere:'Proposer un autre moment compatible ; ne pas reproposer le matin.'},
 {id:'montant',nom:'Prendre la dernière correction',question:'J’avais dit 15 000 francs, mais je corrige : mon budget est de 3 000 francs. Réponds seulement par le montant de mon budget actuel, en chiffres.',history:[] as MessageEssai[],critere:'Utiliser 3 000 francs, pas le montant abandonné.'},
 {id:'ambiguite',nom:'Demander une précision',question:'Change ça. Réponds en français.',history:[{role:'user',content:'Je regarde deux objets : un téléphone et un livre.'},{role:'assistant',content:'Je vois le téléphone et le livre.'}] as MessageEssai[],critere:'Demander quel objet changer, sans décider à la place de la personne.'},
] as const;
export const MODELES_GPT=[
 {id:'gpt-6-astra',nom:'GPT‑6 Astra',provider:'openai'},
 {id:'gpt-5.6-sol',nom:'GPT‑5.6 Sol',provider:'openai'},
 {id:'sonnet-actuel',nom:'Sonnet actuel',provider:'anthropic'},
] as const;
export function controleEssai(id:string,texte:string):boolean|null{
 if(id==='correction')return texte.normalize('NFC').trim()==='Kan moo la ko bëgg may ?';
 if(id==='montant')return /^(?:3[\s\u00a0\u202f]?000)(?:\s*(?:francs?|f\s*cfa|fcfa|f))?[.!]?$/iu.test(texte.trim());
 return null;
}
export function medianeEssai(values:number[]):number|null{
 const a=values.filter(Number.isFinite).sort((x,y)=>x-y),n=a.length;
 return n?n%2?a[Math.floor(n/2)]:(a[n/2-1]+a[n/2])/2:null;
}
/** Incremental UTF-8 SSE, including CRLF split across network packets. A closed
 * TCP stream is not proof of successful model completion. No retry/replay. */
export async function lireFluxEssai(r:Response,provider:'openai'|'anthropic',noter:(texte:string)=>void){
 if(!r.body)throw Error('flux_absent');
 const reader=r.body.getReader(),decoder=new TextDecoder();let buffer='',texte='',termine=false,raison='';let usage:any={};
 const traiter=(packet:string)=>{
  const raw=packet.split('\n').filter(l=>l.startsWith('data:')).map(l=>l.slice(5).trimStart()).join('\n');if(!raw)return;
  const d=JSON.parse(raw);
  if(d.type==='error'||d.type==='response.failed')throw Error('flux_refuse');
  if(provider==='openai'){
   if(d.type==='response.output_text.delta'&&typeof d.delta==='string'){texte+=d.delta;noter(texte);}
   if(d.type==='response.completed'){if(d.response?.status!=='completed')throw Error('flux_incomplet');usage=d.response.usage||{};raison='completed';termine=true;}
   if(d.type==='response.incomplete'){usage=d.response?.usage||{};raison='incomplete';termine=true;}
  }else{
   if(d.type==='message_start')usage={...usage,...d.message?.usage};
   if(d.type==='message_delta'){usage={...usage,...d.usage};raison=d.delta?.stop_reason||raison;}
   if(d.type==='content_block_start'&&d.content_block?.type==='text'&&d.content_block.text){texte+=d.content_block.text;noter(texte);}
   if(d.type==='content_block_delta'&&d.delta?.type==='text_delta'&&d.delta.text){texte+=d.delta.text;noter(texte);}
   if(d.type==='message_stop')termine=true;
  }
 };
 try{
  for(;;){const d=await reader.read();buffer+=d.done?decoder.decode():decoder.decode(d.value,{stream:true});
   buffer=buffer.replace(/\r\n/g,'\n');if(buffer.length>1_000_000)throw Error('flux_trop_long');let k;
   while((k=buffer.indexOf('\n\n'))>=0){traiter(buffer.slice(0,k));buffer=buffer.slice(k+2);}if(d.done)break;}
  if(buffer.trim())traiter(buffer);
  if(!termine||!texte.trim()||!['completed','end_turn'].includes(raison))throw Error('flux_incomplet');
  return {texte,usage};
 }finally{await reader.cancel().catch(()=>{});reader.releaseLock();}
}
