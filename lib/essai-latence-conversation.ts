import {dialoguerAvecDevoirs,indexDialogue,resumeDialogueDevoirs} from './dialogue-devoirs';
import {audioPourReponse,catalogueAudioMemoire,resumeAudioMemoire} from './audio-memoire';
import {teteDeLaReponse} from './diffusion';
import {ouvrirRepliques} from './flux-repliques';
import {NextRequest} from 'next/server';
const g=globalThis as typeof globalThis&{biaLatenceConversation?:{rapport:unknown;travail?:Promise<unknown>}};
const etat=g.biaLatenceConversation??={rapport:null};
export const resumeLatenceConversation=()=>etat.rapport;
/** Fixed read-only comparison. The legacy selector is retained solely to measure
 * the difference on identical source snapshots. Neither strategy edits lessons. */
export function verifierLatenceConversation(){return etat.travail??=(async()=>{
 const index=await indexDialogue(),catalogues=[];
 for(const recalculer of [true,false]){
  const debut=Date.now(),phrases=await catalogueAudioMemoire(true,recalculer),b=resumeAudioMemoire();
  catalogues.push({strategie:recalculer?'recalcul_complet':'reutilisation',ms:Date.now()-debut,calcul_ms:b.calcul_identifiants_ms,phrases:phrases.length,reutilises:b.preparatifs_reutilises,recalcules:b.preparatifs_recalcules});
 }
 const cas=[];
 const scenarios=[
  {nom:'couple',question:'Ma copine ne répond plus à mes appels.',history:[]},
  {nom:'commerce',question:'Je suis un petit commerçant et je ne sais pas combien je gagne vraiment.',history:[]},
  {nom:'etudes',question:'Je suis étudiant et j’ai du mal à m’organiser pour mes études.',history:[]},
  {nom:'refus_mariage',question:'Non, je ne veux pas accepter ce mariage.',history:[{role:'user',text:'Ma famille veut me marier à un homme que je ne veux pas épouser.'},{role:'bia',text:'Veux-tu accepter ce mariage ?'}]},
 ];
 for(const [i,scenario] of scenarios.entries())for(const strategie of (i%2?['simple','double']:['double','simple']) as Array<'simple'|'double'>){
  const avant=resumeDialogueDevoirs().appels_modele,debut=Date.now();
  const r=await dialoguerAvecDevoirs(scenario.question+' Réponds en wolof.',scenario.history,{index,diagnostic:true,strategie});
  const texteMs=Date.now()-debut,p=index.find(d=>d.id===r?.lecon_id)?.repliques.find(p=>p.id===r?.replique_id);
  const audio=r?await audioPourReponse(r.reply,r.langue):null;
  cas.push({scenario:scenario.nom,strategie,texte_ms:texteMs,texte_et_audio_ms:Date.now()-debut,appels:resumeDialogueDevoirs().appels_modele-avant,selection:Boolean(r),exacte:Boolean(p&&r&&[p.fr,p.wo].includes(r.reply)),une_question_max:Boolean(r&&(r.reply.match(/\?/g)||[]).length<=1),audio_disponible:Boolean(audio),fr:p?.fr,wo:p?.wo});
 }
 // Measure the real web stream and voice transport; no microphone or browser
 // playback. Use pedagogical test mode to suppress chat/memory writes.
 const {POST}=await import('../app/api/chat/route');
 const debut=Date.now();let premierTexte:number|null=null,premierePhrase:number|null=null,texteComplet=0,recu='',tampon='',tete='',reply='',voix:Promise<Record<string,unknown>>|undefined;
 const r=await POST(new NextRequest('https://app.khalam.app/api/chat',{method:'POST',headers:{'content-type':'application/json','x-bia-code':process.env.BIA_CODE_MAITRE||''},body:JSON.stringify({message:'Raconte-moi en deux phrases une promenade à Dakar.',history:[],diffuse:true,apprentissageTest:true})}));
 const reader=r.body!.getReader(),decoder=new TextDecoder();
 for(;;){const v=await reader.read();if(v.done)break;tampon+=decoder.decode(v.value,{stream:true});let k;
  while((k=tampon.indexOf('\n\n'))>=0){const packet=tampon.slice(0,k);tampon=tampon.slice(k+2);const event=packet.match(/^event:\s*(.+)$/m)?.[1],json=packet.match(/^data:\s*(.+)$/m)?.[1];if(!json)continue;const d=JSON.parse(json);
   if(event==='texte'){
    premierTexte??=Date.now()-debut;recu+=d.morceau||'';
    if(!tete&&(tete=teteDeLaReponse(recu))){premierePhrase=Date.now()-debut;
     voix=(async()=>{try{
      const response=await fetch('https://app.khalam.app/api/chatterbox-test/bia',{method:'POST',headers:{'content-type':'application/json','x-chatterbox-test-key':process.env.CHATTERBOX_TEST_KEY||''},body:JSON.stringify({texte:tete,langue:'fr',voice:'female',lecture_fidele:false,continu:true}),signal:AbortSignal.timeout(25000)});
      const flux=ouvrirRepliques(response,()=>{}),first=await flux.morceau(0);const premierAudio=Date.now()-debut;
      for(let i=1;i<first.parties;i++)await flux.morceau(i);
      return {premier_audio_http_ms:premierAudio,audio_recu:Boolean(first.audio),parties:first.parties};
     }catch{return {audio_recu:false};}})();
    }
   }
   if(event==='fin'){texteComplet=Date.now()-debut;reply=String(d.corps?.reply||'');}
  }
 }
 const flux={statut:r.status,premier_texte_ms:premierTexte,premiere_phrase_ms:premierePhrase,texte_complet_ms:texteComplet,tete_conforme:!!tete&&reply.startsWith(tete),...(voix?await voix:{audio_recu:false})};
 const rapport={date:new Date().toISOString(),version:(process.env.RENDER_GIT_COMMIT||'').slice(0,12),mesure:'Supabase, Claude et premier audio HTTP réels. Hors microphone, réseau utilisateur et lecture navigateur.',catalogues,cas,flux};
 etat.rapport={...rapport,cas:cas.map(({fr,wo,...c})=>c)};
 return rapport;
})();}
