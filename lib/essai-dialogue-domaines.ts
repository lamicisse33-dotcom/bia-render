import {NextRequest} from 'next/server';
import {indexDialogue} from './dialogue-devoirs';
import {audioPourReponse} from './audio-memoire';
const g=globalThis as typeof globalThis&{biaEssaiDomaines?:{rapport:unknown;travail?:Promise<void>}};
const etat=g.biaEssaiDomaines??={rapport:null};
export const resumeDialogueDomaines=()=>etat.rapport;
/** Fixed two-turn scenarios through the actual web handler. Test mode prevents
 * conversation/memory writes. No private texts leave aggregate diagnostics. */
export function verifierDialogueDomaines(){return etat.travail??=(async()=>{
 etat.rapport={statut:'en_cours',date:new Date().toISOString()};
 const {POST}=await import('../app/api/chat/route'),index=await indexDialogue(),cas=[];
 for(const [nom,questions] of [
  ['commerce',['Je veux parler de mon business. Je vends, mais je ne sais pas combien je gagne.','Je ne sais pas. Aide-moi à avancer.']],
  ['etudes',['Je suis étudiant et j’ai du mal à organiser mes études.','Je remets souvent mon travail à plus tard.']],
  ['mariage',['Ma famille veut me donner en mariage à un homme que je ne veux pas épouser.','Non, je ne veux pas accepter ce mariage.']],
  ['enfants',['Je veux parler des enfants.','Mon enfant pleure.']],
 ] as Array<[string,string[]]>){
  const history:Array<{role:string;text:string}>=[];
  for(const [tour,question] of questions.entries()){
   const debut=Date.now();
   const response=await POST(new NextRequest('https://app.khalam.app/api/chat',{method:'POST',headers:{'content-type':'application/json','x-bia-code':process.env.BIA_CODE_MAITRE||''},body:JSON.stringify({message:question+' Réponds en wolof.',history,apprentissageTest:true})}));
   const d=await response.json(),reply=String(d.reply||'');
   const doc=index.find(x=>x.id===d.lecon_id),ligne=doc?.repliques.find(p=>p.id===d.replique_id);
   const exacte=!!ligne&&[ligne.wo,ligne.fr].includes(reply);
   const audio=exacte?await audioPourReponse(reply,d.langue==='fr'?'fr':'wo'):null;
   cas.push({domaine:nom,tour,http:response.status,ms:Date.now()-debut,source:d.source||null,lecon_retrouvee:!!doc,replique_exacte:exacte,audio_disponible:!!d.audio_memorise||!!audio,une_question_max:(reply.match(/\?/g)||[]).length<=1,repetition:history.some(t=>t.role==='bia'&&t.text===reply)});
   if(!reply||!response.ok)break;
   history.push({role:'user',text:question},{role:'bia',text:reply});
  }
 }
 etat.rapport={statut:'termine',date:new Date().toISOString(),version:(process.env.RENDER_GIT_COMMIT||'').slice(0,12),mesure:'Dialogue web et sources Supabase réels ; questions écrites simulées, hors microphone et lecture navigateur.',tours:cas.length,repliques_exactes:cas.filter(c=>c.replique_exacte).length,audios_disponibles:cas.filter(c=>c.audio_disponible).length,cas};
})().catch(()=>{etat.rapport={statut:'erreur',date:new Date().toISOString()};});}
