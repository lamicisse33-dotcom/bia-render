import {NextRequest} from 'next/server';
import {savoirProduits} from './produits';
import {resumeTransmissionMemoire} from './conversation-groq';
import {listeAudioMemoire} from './audio-memoire';
import {ouvrirRepliques} from './flux-repliques';
const g=globalThis as typeof globalThis&{biaEssaiProduits?:{rapport:unknown;travail?:Promise<unknown>}};
const etat=g.biaEssaiProduits??={rapport:null};
export const resumeEssaiProduits=()=>etat.rapport;
/** Authenticated fixed questions, no conversation or lesson writes. */
export function verifierProduits(){return etat.travail??=(async()=>{
 const fiche=await savoirProduits(),{POST}=await import('../app/api/chat/route');
 const cas=[],history:Array<{role:string;text:string}>=[];
 for(const message of ['Tu connais DDsking ?','Quels sont leurs produits ?','Donne-moi leur numéro.']){
  const debut=Date.now();
  const r=await POST(new NextRequest('https://app.khalam.app/api/chat',{method:'POST',headers:{'content-type':'application/json','x-bia-code':process.env.BIA_CODE_MAITRE||''},body:JSON.stringify({message,history,apprentissageTest:true})}));
  const d=await r.json(),reply=String(d.reply||'');
  cas.push({question:message,reponse:reply,statut:r.status,ms:Date.now()-debut,produits_transmis:(resumeTransmissionMemoire().derniere?.produits_signes||0)>0});
  history.push({role:'user',text:message},{role:'bia',text:reply});
 }
 const stock=await listeAudioMemoire();
 const audios=stock.sons.filter(p=>/\bdd[\s.-]*skin|black soap|face soap|cleansing lotion/i.test(p.texte));
 let voix:Record<string,unknown>={audio_recu:false};
 if(cas[0]?.reponse){
  const debut=Date.now();
  try{
   const r=await fetch('https://app.khalam.app/api/chatterbox-test/bia',{method:'POST',headers:{'content-type':'application/json','x-chatterbox-test-key':process.env.CHATTERBOX_TEST_KEY||''},body:JSON.stringify({texte:cas[0].reponse,langue:'fr',voice:'female',lecture_fidele:false,continu:true}),signal:AbortSignal.timeout(35000)});
   const lecteur=ouvrirRepliques(r,()=>{}),first=await lecteur.morceau(0);let octets=Buffer.from(first.audio||'','base64').length;
   for(let i=1;i<first.parties;i++)octets+=Buffer.from((await lecteur.morceau(i)).audio||'','base64').length;
   voix={audio_recu:octets>1000,parties:first.parties,octets,ms:Date.now()-debut,ecoute_humaine:false};
  }catch{voix={audio_recu:false,ms:Date.now()-debut};}
 }
 const rapport={date:new Date().toISOString(),version:(process.env.RENDER_GIT_COMMIT||'').slice(0,12),fiche_presente:fiche.includes('DD SKIN'),cas,audios_ddskin_indexes:audios.length,voix};
 etat.rapport={...rapport,cas:cas.map(({reponse,...c})=>({...c,marque_connue:/DD\s*SKIN/i.test(reponse),nie_la_marque:/ne (?:connais|reconnais).*pas|pas d.information/i.test(reponse)}))};
 return rapport;
})();}
