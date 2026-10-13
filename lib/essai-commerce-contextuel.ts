import {NextRequest} from 'next/server';
import {indexDialogue} from './dialogue-devoirs';
import {projetCommercialAPreciser,questionSurProjet,montantDeLeconNonConfirme} from './dialogue-devoirs-core';
const g=globalThis as typeof globalThis&{biaCommerceContextuel?:{rapport:unknown;travail?:Promise<void>}};
const etat=g.biaCommerceContextuel??={rapport:null};
export const resumeCommerceContextuel=()=>etat.rapport;
/** Owner's regression: real web route, simulated written turns, no chat/lesson writes. */
export function verifierCommerceContextuel(){return etat.travail??=(async()=>{
 etat.rapport={statut:'en_cours',date:new Date().toISOString()};
 const {POST}=await import('../app/api/chat/route'),index=await indexDialogue(),cas=[];
 const history:Array<{role:string;text:string}>=[{role:'user',text:'Je voudrais parler de business.'},{role:'bia',text:'Ton bénéfice est de 2 000 francs.'}];
 for(const question of ['Est-ce que ce business peut marcher à Dakar ?','Je veux vendre des chaussures à Dakar.']){
  const debut=Date.now(),inconnu=projetCommercialAPreciser(question,history);
  const r=await POST(new NextRequest('https://app.khalam.app/api/chat',{method:'POST',headers:{'content-type':'application/json','x-bia-code':process.env.BIA_CODE_MAITRE||''},body:JSON.stringify({message:question+' Réponds en wolof.',history,apprentissageTest:true})}));
  const d=await r.json(),reply=String(d.reply||''),ligne=index.find(x=>x.id===d.lecon_id)?.repliques.find(p=>p.id===d.replique_id);
  const texte=ligne?.fr||reply;
  cas.push({projet_non_precise:inconnu,http:r.status,ms:Date.now()-debut,replique_exacte:!!ligne&&[ligne.fr,ligne.wo].includes(reply),question_sur_projet:!!ligne&&questionSurProjet(ligne.fr),montant_non_confirme:montantDeLeconNonConfirme(texte,reply,question,history),ancien_montant_repris:/2[ \u00a0\u202f]*000/.test(reply)||/deux mille|ñaar junni/i.test(reply),une_question_max:(reply.match(/\?/g)||[]).length<=1,repetition:history.some(t=>t.role==='bia'&&t.text===reply),audio_joint:!!d.audio_memorise,source:d.source||null});
  if(!r.ok)break;history.push({role:'user',text:question},{role:'bia',text:reply});
 }
 etat.rapport={statut:'termine',date:new Date().toISOString(),version:(process.env.RENDER_GIT_COMMIT||'').slice(0,12),mesure:'Route web et Supabase réels ; messages écrits simulés, hors microphone et lecture navigateur.',cas};
})().catch(()=>{etat.rapport={statut:'erreur',date:new Date().toISOString()};});}
