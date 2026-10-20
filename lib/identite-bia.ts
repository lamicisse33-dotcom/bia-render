import {REPERTOIRE} from './repertoire-textes';

import {identiteReconnue} from './identite-core';
const nom=REPERTOIRE.find(e=>e.cle==='ton-nom')!;
const etat={nom:'Bia',revision:'identite-bia-v1',reponses_directes:0,diagnostic:null as unknown};
export const resumeIdentite=()=>({...etat});

/** Whole questions only: never intercept a lesson, quotation or other request. */
export function reponseIdentite(question:string){
 const reponse=identiteReconnue(question);if(!reponse)return null;
 etat.reponses_directes++;return reponse;
}

let diagnostic:ReturnType<typeof executerDiagnosticIdentite>|undefined;
/** Authenticated fixed text checks, no synthesis, model call or lesson write. */
export function verifierIdentite(){return diagnostic??=executerDiagnosticIdentite();}
async function executerDiagnosticIdentite(){
 const {lireCatalogueCourant}=await import('./sons-courants');
 const catalogue=await lireCatalogueCourant();
 const {POST}=await import('../app/api/chat/route');
 const {NextRequest}=await import('next/server');
 const resultats=[];
 for(const persona of ['rara','bia'])for(const message of ["Comment tu t'appelles ?",'Quel est ton nom ?','Noo tudd ?','Sa tur mooy lan ?']){
  const debut=Date.now();
  const r=await POST(new NextRequest('https://app.khalam.app/api/chat',{method:'POST',headers:{'content-type':'application/json','x-bia-code':process.env.BIA_CODE_MAITRE||''},body:JSON.stringify({message,persona,history:[{role:'bia',text:"Je m'appelle Rara."}]})}));
  const d=await r.json();
  const son=catalogue.find(p=>p.cle==='ton-nom'&&p.langue===(message.includes('nom')||message.includes('appelles')?'fr':'wo')&&p.texte===d.reply)?.audio;
  let audio_disponible=false;
  if(son){try{const audio=await fetch(son.adresse,{cache:'no-store',signal:AbortSignal.timeout(10000)});audio_disponible=audio.ok&&(await audio.arrayBuffer()).byteLength===son.octets;}catch{}}
  resultats.push({persona,message,reply:d.reply,audio_disponible,khalam_voice:son?.moteur==='khalam-voice',ok:r.ok&&d.identite===true&&d.reply===(message.includes('nom')||message.includes('appelles')?nom.francais:nom.wolof),ms:Date.now()-debut});
 }
 const bilan={date:new Date().toISOString(),total:resultats.length,correctes:resultats.filter(r=>r.ok).length,audios_disponibles:resultats.filter(r=>r.audio_disponible&&r.khalam_voice).length,lecture_audio_mesuree:false,resultats};
 etat.diagnostic=bilan;return bilan;
}
