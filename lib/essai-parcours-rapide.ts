import {NextRequest} from 'next/server';
import {teteDeLaReponse} from './diffusion';
import {ouvrirRepliques} from './flux-repliques';
import {resumeTransmissionMemoire} from './conversation-groq';
import {indexDialogue} from './dialogue-devoirs';
import {langueConversation} from './comprehension-conversation';
const g=globalThis as typeof globalThis&{biaParcoursRapide?:{rapport:unknown;travail?:Promise<void>}};
const etat=g.biaParcoursRapide??={rapport:null};
export const resumeParcoursRapide=()=>etat.rapport;
/** Three fixed owner-authorised startup probes, no learning or chat writes.
 * Never accepts public question input or exposes credentials/reply contents. */
export function verifierParcoursRapide(){return etat.travail??=(async()=>{
 etat.rapport={statut:'en_cours',date:new Date().toISOString()};
 const {POST}=await import('../app/api/chat/route'),index=await indexDialogue(),cas=[];
 for(const [nom,message] of [
  ['lecon','Ma copine ne répond plus à mes appels. Réponds en wolof.'],
  ['commerce','Je suis un petit commerçant et je ne sais pas combien je gagne vraiment. Réponds en wolof.'],
  ['phrase_longue','Je pense que pour améliorer les transports dans une ville, il faut investir dans les bus plutôt que dans de nouvelles routes. Mais si les bus sont coûteux, les habitants risquent de continuer à utiliser leur voiture. Comment réponds-tu à cette objection, en tenant compte du budget limité de la ville ? Réponds en français.'],
 ]){
  const debut=Date.now();let premierTexte:number|null=null,phraseMs:number|null=null,recu='',tampon='',fin:any=null,voix:Promise<Record<string,unknown>>|undefined;
  const genererVoix=(texte:string,langue:string)=>(async()=>{try{
   const r=await fetch('https://app.khalam.app/api/chatterbox-test/bia',{method:'POST',headers:{'content-type':'application/json','x-chatterbox-test-key':process.env.CHATTERBOX_TEST_KEY||''},body:JSON.stringify({texte,langue,voice:'female',continu:true,lecture_fidele:false}),signal:AbortSignal.timeout(25000)});
   const clips=ouvrirRepliques(r,()=>{}),premier=await clips.morceau(0),ms=Date.now()-debut;
   for(let i=1;i<premier.parties;i++)await clips.morceau(i);
   return {audio_recu:!!premier.audio,premier_audio_http_ms:ms};
  }catch{return {audio_recu:false};}})();
  try{
   const r=await POST(new NextRequest('https://app.khalam.app/api/chat',{method:'POST',headers:{'content-type':'application/json','x-bia-code':process.env.BIA_CODE_MAITRE||''},body:JSON.stringify({message,history:[],apprentissageTest:true,diffuse:true})}));
   const lecteur=r.body!.getReader(),decoder=new TextDecoder();
   for(;;){const v=await lecteur.read();if(v.done)break;tampon+=decoder.decode(v.value,{stream:true});let k;
    while((k=tampon.indexOf('\n\n'))>=0){const p=tampon.slice(0,k);tampon=tampon.slice(k+2);const ev=p.match(/^event:\s*(.+)$/m)?.[1],j=p.match(/^data:\s*(.+)$/m)?.[1];if(!j)continue;const d=JSON.parse(j);
     if(ev==='texte'){premierTexte??=Date.now()-debut;recu+=d.morceau||'';const tete=teteDeLaReponse(recu);if(!voix&&tete){phraseMs=Date.now()-debut;voix=genererVoix(tete,langueConversation(message,[]));}}
     if(ev==='fin')fin=d;
    }
   }
   const completMs=Date.now()-debut,corps=fin?.corps||{},p=index.find(d=>d.id===corps.lecon_id)?.repliques.find(p=>p.id===corps.replique_id);
   const audio=corps.audio_memorise?.base64?{audio_recu:true,premier_audio_http_ms:completMs,audio_memorise:true}:await (voix||genererVoix(String(corps.reply||''),corps.langue||'fr'));
   cas.push({nom,statut:fin?.statut,premier_texte_ms:premierTexte,premiere_phrase_ms:phraseMs,texte_complet_ms:completMs,...audio,source:corps.source,replique_exacte:!!p&&[p.fr,p.wo].includes(corps.reply),contexte:resumeTransmissionMemoire().derniere});
  }catch{cas.push({nom,erreur:true,ms:Date.now()-debut});}
 }
 etat.rapport={statut:'termine',date:new Date().toISOString(),version:(process.env.RENDER_GIT_COMMIT||'').slice(0,12),mesure:'Chat web et premier audio HTTP réels ; hors microphone, réseau utilisateur et lecture navigateur.',cas};
})().catch(()=>{etat.rapport={statut:'erreur',date:new Date().toISOString(),version:(process.env.RENDER_GIT_COMMIT||'').slice(0,12)};});}
