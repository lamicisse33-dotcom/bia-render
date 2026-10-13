import {inventaireFiches,fichesPourConversation,resumeFichesConnaissances} from './fiches-connaissances';
import {preparerLesLecons} from './lecons';
import {messagesConversation} from './conversation-groq';
import {selectionnerFiches} from './fiches-connaissances-core';
const g=globalThis as typeof globalThis&{biaConnexionFiches?:{rapport:unknown;travail?:Promise<unknown>}};
const etat=g.biaConnexionFiches??={rapport:null};
export const resumeConnexionFiches=()=>etat.rapport;
/** Fixed read-only source/payload checks. No model, voice, mutation or secret.
 * Public report carries booleans and counts only, never private lesson text. */
export function verifierConnexionFiches(){return etat.travail??=(async()=>{
 await preparerLesLecons();const fiches=await inventaireFiches(),cas=[];
 for(const [question,attendu] of [
  ['Comment accéder aux applications de KHALAM ?','CODE'],
  ['Parle-moi des recherches de KHALAM sur le wolof.','La langue avant'],
  ['Parle-moi de L’Héritage des Khalam et de Didi et Mila.','heritage.khalam.app'],
  ['Quels métiers sont réunis chez Khalam ?','ingénierie'],
  ['Quels projets DD Home étaient annoncés dans la présentation DD Skin ?','DD Home'],
  ['Je souffre de jalousie et mon partenaire fouille mon téléphone.','Privacy itam am na solo'],
 ]){
  const debut=Date.now(),texte=await fichesPourConversation(question,[]);
  const packet=messagesConversation({question,history:[],maitre:false,fiches:texte,contexte:'autre contexte '.repeat(3000)}).map(m=>m.content).join('\n');
  cas.push({question,reference_transmise:packet.toLowerCase().includes(attendu.toLowerCase()),ms:Date.now()-debut,signes_fiches:texte.length});
 }
 const accessibles=fiches.filter(f=>{const p=selectionnerFiches([f],f.titre,[],Math.max(6500,f.texte.length+2000));return p.passages.length>0;}).length;
 return etat.rapport={date:new Date().toISOString(),version:(process.env.RENDER_GIT_COMMIT||'').slice(0,12),mesure:'Lecture des sources locales et des anciennes leçons Supabase ; construction des messages du cerveau. Aucun appel au modèle ni lecture audio.',inventaire:resumeFichesConnaissances(),fiches_accessibles:accessibles,cas};
})();}
