import {salutationReconnue,accusePertinent} from './salutations-dialogue';
import {langueDe} from './repertoire';
import {lireCatalogueCourant} from './sons-courants';
import type {PhraseEditable} from './corrections-sons-courants';
let catalogue:PhraseEditable[]|undefined,jusqua=0,enCours:Promise<PhraseEditable[]>|undefined;
const etat={tours:0,derniere_cle:'',dernier_ms:0,diagnostic:null as unknown};
export const resumeSalutations=()=>({...etat,attente_avant_transcription:false,reaction_seulement_sur_demande:true});
async function lire(){
 if(catalogue&&Date.now()<jusqua)return catalogue;
 const charger=()=>enCours??=(async()=>{try{catalogue=await lireCatalogueCourant();jusqua=Date.now()+20000;return catalogue;}finally{enCours=undefined;}})();
 if(catalogue){void charger().catch(()=>{});return catalogue;}return charger();
}
export function prechaufferSalutations(){return lire().catch(()=>[]);}
export async function reponseSalutation(question:string){
 const e=salutationReconnue(question);if(!e)return null;
 const debut=Date.now(),langue=langueDe(question);
 const p=(await lire().catch(()=>catalogue||[])).find(p=>p.cle===e.cle&&p.langue===langue);
 const reply=p?.texte??(langue==='fr'?e.francais:e.wolof);
 const audio=p?.audio?.texte===reply?p.audio:undefined;
 etat.tours++;etat.derniere_cle=e.cle;etat.dernier_ms=Date.now()-debut;
 return {reply,langue,emotion:e.emotion||'douce',salutation:true,cle_salutation:e.cle,source:'salutation mémorisée',...(audio?{son_courant:audio}:{})};
}
let diagnostic:Promise<unknown>|undefined;
export function verifierSalutations(){return diagnostic??=(async()=>{
 const {POST}=await import('../app/api/chat/route');
 const {NextRequest}=await import('next/server');
 const questions=['Bonjour','Bonsoir','Nanga def ?','Bia, bonjour !','Salut, comment vas-tu ?','Naka nga def ?','Bonjour'];
 const history:Array<{role:'user'|'bia';text:string}>=[],resultats=[];
 for(const message of questions){
  const debut=Date.now();const r=await POST(new NextRequest('https://app.khalam.app/api/chat',{method:'POST',headers:{'content-type':'application/json','x-bia-code':process.env.BIA_CODE_MAITRE||''},body:JSON.stringify({message,history})}));
  const d=await r.json();let audio_disponible=false;
  if(d.son_courant?.adresse){const son=await fetch(d.son_courant.adresse,{signal:AbortSignal.timeout(5000)});audio_disponible=son.ok&&(await son.arrayBuffer()).byteLength>1000;}
  resultats.push({message,cle:d.cle_salutation,reply:d.reply,langue:d.langue,salutation:r.ok&&d.salutation===true,reaction:accusePertinent(message),audio_disponible,ms:Date.now()-debut});
  history.push({role:'user',text:message},{role:'bia',text:d.reply||''});
 }
 const bilan={date:new Date().toISOString(),total:resultats.length,salutations:resultats.filter(r=>r.salutation).length,reactions_inappropriees:resultats.filter(r=>r.reaction).length,audios_disponibles:resultats.filter(r=>r.audio_disponible).length,lecture_navigateur_mesuree:false,resultats};
 etat.diagnostic=bilan;return bilan;
})();}
