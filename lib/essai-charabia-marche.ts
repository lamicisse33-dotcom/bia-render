import {NextRequest} from 'next/server';
import {POST as synthese} from '../app/api/chatterbox-test/route';
import {preparerPassagesKhalam} from './passages-khalam';
import {chezOreilleLocale} from './ecoute-locale';
const g=globalThis as typeof globalThis&{biaCharabiaMarche?:{rapport:any;travail?:Promise<void>}};
const etat=g.biaCharabiaMarche??={rapport:null};
export const resumeCharabiaMarche=()=>etat.rapport;
/** Fixed owner-reported text. Inference only: no GPU configuration, model,
 * lesson, pronunciation rule or saved production audio is changed. */
export function verifierCharabiaMarche(){return etat.travail??=(async()=>{
 const texte='Waaw papa, je continue. Mu dem ci marse bi, jënd soble ak tamaate, te dellusi ci kër ga. Elle est allée au marché, a acheté des oignons et des tomates, puis elle est rentrée à la maison. Là, elle prépare le repas pour toute la famille, et ça sent déjà bon !';
 etat.rapport={statut:'en_cours',date:new Date().toISOString(),ecoute_humaine_verifiee:false,cas:[]};
 try{
  const plan=await preparerPassagesKhalam(texte,'wo');etat.rapport.plan=plan;
  const cas=[
   {variante:'ancien-fragment-francais-en-wolof',texte:'continue.',langue:'wo'},
   {variante:'ancienne-coupure-apres-te',texte:'Mu dem ci marse bi, jënd soble ak tamaate, te',langue:'wo'},
   {variante:'ancienne-suite-sans-te',texte:'dellusi ci kër ga.',langue:'wo'},
   {variante:'comparaison-phrase-wolof-entiere',texte:'Mu dem ci marse bi, jënd soble ak tamaate, te dellusi ci kër ga.',langue:'wo'},
   ...plan.filter(p=>p.texte.includes('continue')||p.texte.includes('marse')||p.texte.includes('dellusi')).map(p=>({variante:'preparation-corrigee',texte:p.texte,langue:p.langue})),
  ];
  for(const c of cas){
   const debut=Date.now();
   const r=await synthese(new NextRequest('https://app.khalam.app/api/chatterbox-test',{method:'POST',headers:{'content-type':'application/json','x-chatterbox-test-key':process.env.CHATTERBOX_TEST_KEY||''},body:JSON.stringify({input:{text:c.texte,voice:'female',language:c.langue,seed:913,preserve_segment:true}})}));
   const d=await r.json();if(!r.ok||!d.output?.audio_base64)throw Error(d.code||'synthese_incomplete');
   const out={...c,statut:r.status,duree_audio_s:d.output.duration_seconds,synthese_ms:Date.now()-debut,transcription_indicative:null as string|null};etat.rapport.cas.push(out);
   const b=Buffer.from(d.output.audio_base64,'base64');
   const entendu=await chezOreilleLocale(new Blob([b],{type:'audio/wav'}));out.transcription_indicative=entendu?.texte||null;
  }
  etat.rapport.statut='termine';
 }catch(e){etat.rapport.statut='echec';etat.rapport.erreur=(e as Error).message;}
 etat.rapport.fin=new Date().toISOString();
})();}
