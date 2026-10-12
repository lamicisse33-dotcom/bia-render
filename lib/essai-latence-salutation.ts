import {lexiqueConfig} from './lexique';
import {lireExtraitAudio,type ExtraitCorpus} from './corpus';
import {salutationReconnue} from './salutations-dialogue';
import {preparerEcoute,noterDiagnosticEcoute} from './preparer-ecoute';

let diagnostic:Promise<unknown>|undefined;
/** Private, read-only replay of recent owner recordings. No corpus duplication. */
export function verifierLatenceSalutation(){return diagnostic??=(async()=>{
 const table=process.env.SUPABASE_TABLE_CORPUS||'khalam_corpus';
 const r=await fetch(`${lexiqueConfig.url}/rest/v1/${table}?select=cle,chemin,entendu,verifie,langue,type_audio&order=cle.desc&limit=30`,{headers:{apikey:lexiqueConfig.cle,Authorization:`Bearer ${lexiqueConfig.cle}`},cache:'no-store',signal:AbortSignal.timeout(5000)});
 if(!r.ok)throw Error('Corpus indisponible');
 const lignes=await r.json() as ExtraitCorpus[];
 // Today's short greetings only; never replay an unrelated private topic.
 const recentes=lignes.filter(e=>e.cle.startsWith('2026-10-12/'));
 const exemples=recentes.filter(e=>salutationReconnue(e.verifie||e.entendu)).slice(0,3);
 const resultats=[];
 const {POST}=await import('../app/api/chat/route');
 const {NextRequest}=await import('next/server');
 for(const e of exemples){
  const source=await lireExtraitAudio(e.chemin);if(!source)continue;
  const audio=await source.blob();
  const t=Date.now();
  const ecoute=await preparerEcoute(audio,e.chemin.split('/').at(-1)!,'wo');
  const debutChat=Date.now();
  // Do not send unrelated ASR errors to a paid model in this greeting test.
  const salut=salutationReconnue(ecoute.ecriture.texte);
  let reponse:any=null,audio_ms=0,audio_octets=0,chat_ms=0;
  if(salut){
   const rr=await POST(new NextRequest('https://app.khalam.app/api/chat',{method:'POST',headers:{'content-type':'application/json','x-bia-code':process.env.BIA_CODE_MAITRE||''},body:JSON.stringify({message:ecoute.ecriture.texte,history:[]})}));
   reponse=await rr.json();chat_ms=Date.now()-debutChat;
   if(reponse.son_courant?.adresse){
    const ts=Date.now();const son=await fetch(reponse.son_courant.adresse,{signal:AbortSignal.timeout(5000)});
    if(son.ok)audio_octets=(await son.arrayBuffer()).byteLength;
    audio_ms=Date.now()-ts;
   }
  }
  resultats.push({entendu_initial:e.entendu,texte:ecoute.ecriture.texte,cle:salut?.cle||null,chronometrage:ecoute.chronometrage,chat_ms,audio_ms,audio_octets,source:reponse?.source||null,total_serveur_ms:Date.now()-t});
 }
 const bilan={date:new Date().toISOString(),extraits_recents:recentes.length,essais:resultats.length,salutations:resultats.filter(x=>x.source==='salutation mémorisée').length,audios_disponibles:resultats.filter(x=>x.audio_octets>1000).length,lecture_navigateur_mesuree:false,resultats:resultats.map(({entendu_initial,texte,...publics})=>publics)};
 // Public diagnostics contain no user transcript or private recording URL.
 noterDiagnosticEcoute(bilan);
 return {...bilan,resultats,dernieres_transcriptions:recentes.slice(0,5).map(e=>({texte:e.entendu,salutation:salutationReconnue(e.entendu)?.cle||null}))};
})();}
