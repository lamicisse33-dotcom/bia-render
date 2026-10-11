import {NextResponse} from 'next/server';
import {timingSafeEqual} from 'node:crypto';
import {verifierCode} from '@/lib/codes';
import {genererSonsCourants,lireCatalogueCourant,corrigerSonCourant,regenererSonCourant} from '@/lib/sons-courants';
import {ErreurCorrectionSon} from '@/lib/corrections-sons-courants';
import {PHRASES_COURANTES,VERSION_SONS_COURANTS} from '@/lib/sons-courants-core';
export const dynamic='force-dynamic';
export const maxDuration=100;
export async function GET(){
 try{const phrases=await lireCatalogueCourant();return NextResponse.json({version:VERSION_SONS_COURANTS,attendus:PHRASES_COURANTES.length,sons:phrases.flatMap(p=>p.audio?[p.audio]:[]),phrases},{headers:{'cache-control':'no-store'}});}
 catch{return NextResponse.json({error:'Catalogue audio indisponible'},{status:503});}
}
export async function POST(r:Request){
 const v=verifierCode(r.headers.get('x-bia-code'));
 const a=Buffer.from(process.env.CHATTERBOX_TEST_KEY||''),b=Buffer.from(r.headers.get('x-chatterbox-test-key')||'');
 if(!(v.ok&&v.maitre)&&!(a.length>0&&a.length===b.length&&timingSafeEqual(a,b)))return NextResponse.json({error:'Ton code maître est nécessaire pour enregistrer ou régénérer.'},{status:401});
 try{
  const body=await r.json().catch(()=>null);
  // Preserve the private, fixed-catalogue generation endpoint.
  if(!body?.action)return NextResponse.json(await genererSonsCourants());
  const {action,cle,langue,revision}=body;
  if(!['corriger','regenerer'].includes(action)||!PHRASES_COURANTES.some(p=>p.cle===cle&&p.langue===langue)||!Number.isSafeInteger(revision)||revision<0)
   return NextResponse.json({error:'Phrase ou version invalide.'},{status:400});
  if(action==='corriger'&&(typeof body.texte!=='string'||!body.texte.trim()||body.texte.trim().length>600))return NextResponse.json({error:'Écris une phrase de 1 à 600 caractères.'},{status:400});
  const phrase=action==='corriger'?await corrigerSonCourant(cle,langue,revision,body.texte.trim()):await regenererSonCourant(cle,langue,revision);
  return NextResponse.json({phrase},{headers:{'cache-control':'no-store'}});
 }catch(e){return NextResponse.json({error:e instanceof ErreurCorrectionSon?e.message:'La préparation a échoué. Le texte enregistré est conservé. Tu peux réessayer.'},{status:e instanceof ErreurCorrectionSon?e.status:503});}
}
