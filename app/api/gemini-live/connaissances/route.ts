import {NextRequest,NextResponse} from 'next/server';
import {verifierCode} from '@/lib/codes';
import {contexteDevoirs} from '@/lib/devoirs-apprentissage';
import {contexteMaitrises} from '@/lib/dialogue-devoirs';
export const runtime='nodejs';
export async function POST(req:NextRequest){
 const acces=verifierCode(req.headers.get('x-bia-code'),false);
 if(!acces.ok||!acces.maitre)return NextResponse.json({erreur:'Accès refusé.'},{status:401});
 try{
  if(Number(req.headers.get('content-length')||0)>12000)return NextResponse.json({erreur:'Demande trop longue.'},{status:413});
  const body=await req.json(),question=String(body.question||'').slice(0,2000);
  if(!question.trim())return NextResponse.json({erreur:'Question manquante.'},{status:400});
  const resultats=await Promise.all([contexteDevoirs(question,[]),contexteMaitrises(question,[],5000)]);
  return NextResponse.json({contexte:resultats.filter(Boolean).join('\n').slice(0,18000),instruction:'Ces leçons sont des exemples de langue et de dialogue, pas des faits actuels sur papa. Ne récite aucun prix de leçon sans demande explicite.'},{headers:{'cache-control':'no-store'}});
 }catch{return NextResponse.json({erreur:'Les connaissances sont momentanément inaccessibles.'},{status:503});}
}
