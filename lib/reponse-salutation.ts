import {salutationReconnue,accusePertinent} from './salutations-dialogue';
import {langueDe} from './repertoire';
import {lireCatalogueCourant} from './sons-courants';
import type {PhraseEditable} from './corrections-sons-courants';
const g=globalThis as typeof globalThis&{biaSalutationsEtat?:{tours:number;derniere_cle:string;dernier_ms:number;diagnostic:unknown};biaSalutationsCatalogue?:{catalogue?:PhraseEditable[];jusqua:number;enCours?:Promise<PhraseEditable[]>}};
const etat=g.biaSalutationsEtat??={tours:0,derniere_cle:'',dernier_ms:0,diagnostic:null};
const memoire=g.biaSalutationsCatalogue??={jusqua:0};
export const resumeSalutations=()=>({...etat,regle:'premier_echange_de_la_session',portraits:['bia','rara'],attente_avant_transcription:false,reaction_seulement_sur_demande:true});
async function lire(){
 if(memoire.catalogue&&Date.now()<memoire.jusqua)return memoire.catalogue;
 const charger=()=>memoire.enCours??=(async()=>{try{memoire.catalogue=await lireCatalogueCourant();memoire.jusqua=Date.now()+20000;return memoire.catalogue;}finally{memoire.enCours=undefined;}})();
 if(memoire.catalogue){void charger().catch(()=>{});return memoire.catalogue;}return charger();
}
export function prechaufferSalutations(){return lire().catch(()=>[]);}
export async function reponseSalutation(question:string,ouverture=true){
 if(!ouverture)return null;
 const e=salutationReconnue(question);if(!e)return null;
 const debut=Date.now(),langue=langueDe(question);
 const p=(await lire().catch(()=>memoire.catalogue||[])).find(p=>p.cle===e.cle&&p.langue===langue);
 const reply=p?.texte??(langue==='fr'?e.francais:e.wolof);
 const audio=p?.audio?.texte===reply?p.audio:undefined;
 etat.tours++;etat.derniere_cle=e.cle;etat.dernier_ms=Date.now()-debut;
 return {reply,langue,emotion:e.emotion||'douce',salutation:true,salutation_ouverture:true,cle_salutation:e.cle,source:'salutation mémorisée',...(audio?{son_courant:audio}:{})};
}
let diagnostic:ReturnType<typeof executerDiagnostic>|undefined;
export function verifierSalutations(){return diagnostic??=executerDiagnostic();}
async function executerDiagnostic(){
 const {POST}=await import('../app/api/chat/route');
 const {NextRequest}=await import('next/server');
 const questions=['Bonjour','Bonsoir','Nanga def ?','Bia, bonjour !','Salut, comment vas-tu ?','Naka nga def ?','Bonjour'];
 const resultats=[];
 for(const message of questions){
  const debut=Date.now();const r=await POST(new NextRequest('https://app.khalam.app/api/chat',{method:'POST',headers:{'content-type':'application/json','x-bia-code':process.env.BIA_CODE_MAITRE||''},body:JSON.stringify({message,history:[],persona:'rara',salutationOuverture:true,apprentissageTest:true})}));
  const d=await r.json();let audio_disponible=false;
  if(d.son_courant?.adresse){try{const son=await fetch(d.son_courant.adresse,{signal:AbortSignal.timeout(10000)});audio_disponible=son.ok&&(await son.arrayBuffer()).byteLength>1000;}catch{}}
  resultats.push({message,cle:d.cle_salutation,reply:d.reply,langue:d.langue,salutation:r.ok&&d.salutation===true,reaction:accusePertinent(message),audio_disponible,ms:Date.now()-debut});
 }
 const bilan={date:new Date().toISOString(),total:resultats.length,salutations:resultats.filter(r=>r.salutation).length,reactions_inappropriees:resultats.filter(r=>r.reaction).length,audios_disponibles:resultats.filter(r=>r.audio_disponible).length,lecture_navigateur_mesuree:false,resultats};
 etat.diagnostic=bilan;return bilan;
}
