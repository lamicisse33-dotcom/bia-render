import {NextRequest} from 'next/server';
const g=globalThis as typeof globalThis&{biaEssaiCorrectionVocale?:{rapport:unknown;travail?:Promise<void>}};
const etat=g.biaEssaiCorrectionVocale??={rapport:null};
export const resumeEssaiCorrectionVocale=()=>etat.rapport;
/** Four fixed, authenticated repetitions through the real web handler and
 * selected brain. Dictated text is simulated; no microphone/TTS proof. No
 * memory command, lesson mutation or unvalidated conversation save. */
export function verifierCorrectionVocale(){return etat.travail??=(async()=>{
 const {POST}=await import('../app/api/chat/route');
 etat.rapport={statut:'en_cours',date:new Date().toISOString()};
 const cas=[];
 for(const c of [
  {nom:'wolof_emprunt_francais',texte:'Dama sokhla preuve de paiement.',attendu:'Dama soxla preuve de paiement.',history:[{role:'user',text:'Nous corrigeons les preuves de paiement. Garde les mots français dans la phrase wolof.'}]},
  {nom:'espaces_wolof',texte:'Damasoxla preuve de paiement.',attendu:'Dama soxla preuve de paiement.',history:[]},
  {nom:'francais',texte:'Je fais un transfer demain.',attendu:'Je fais un transfert demain.',history:[]},
  {nom:'negation_preservee',texte:'Dama bëggul dem.',attendu:'Dama bëggul dem.',history:[]},
 ]){
  const debut=Date.now();
  const r=await POST(new NextRequest('https://app.khalam.app/api/chat',{method:'POST',headers:{'content-type':'application/json','x-bia-code':process.env.BIA_CODE_MAITRE||''},body:JSON.stringify({message:c.texte,history:c.history,parole:true,apprend:true})}));
  const d=await r.json();
  cas.push({nom:c.nom,http:r.status,ms:Date.now()-debut,verification:d.transcription?.statut||null,motif:d.transcription?.motif||null,
   texte_attendu:d.transcription?.texte===c.attendu,repetition_attendue:d.reply===c.attendu,draft_attendu:d.aRepeter===c.attendu,
   aucune_memorisation:!d.retenu&&!d.devoir_corrige,source:d.source||null});
  if(d.transcription?.motif==='credit_insuffisant')break;
 }
 etat.rapport={statut:cas.some(c=>c.motif==='credit_insuffisant')?'bloque_credit':'termine',date:new Date().toISOString(),version:(process.env.RENDER_GIT_COMMIT||'').slice(0,12),mesure:'Claude et route web réels, transcriptions déformées simulées ; hors microphone et lecture audio.',cas};
})().catch(()=>{etat.rapport={statut:'erreur',date:new Date().toISOString(),version:(process.env.RENDER_GIT_COMMIT||'').slice(0,12)};});}
