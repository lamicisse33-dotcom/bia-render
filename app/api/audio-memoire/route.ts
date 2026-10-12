import {NextResponse} from 'next/server';
import {verifierCode} from '@/lib/codes';
import {lancerAudioMemoire,listeAudioMemoire,servirAudioMemoire} from '@/lib/audio-memoire';
export const dynamic='force-dynamic';
export async function GET(r:Request){
 const v=verifierCode(r.headers.get('x-bia-code'),false);if(!v.ok)return NextResponse.json({error:'Code BIA requis.'},{status:401});
 try{
  const id=new URL(r.url).searchParams.get('id');
  if(id){if(!/^[a-f0-9]{64}$/.test(id))return new Response(null,{status:400});const audio=await servirAudioMemoire(id);return audio?new Response(audio.body,{headers:{'content-type':'audio/mpeg','cache-control':'private, max-age=0, must-revalidate'}}):new Response(null,{status:404});}
  const d=await listeAudioMemoire();return NextResponse.json({...d,...(!v.maitre?{a_verifier:[]}:{})},{headers:{'cache-control':'no-store'}});
 }catch{return NextResponse.json({error:'La mémoire audio est momentanément indisponible.'},{status:503});}
}
export async function POST(r:Request){
 const v=verifierCode(r.headers.get('x-bia-code'),false);if(!v.ok||!v.maitre)return NextResponse.json({error:'Code maître requis.'},{status:401});
 try{return NextResponse.json(await lancerAudioMemoire());}catch{return NextResponse.json({error:'Préparation indisponible. Réessaie.'},{status:503});}
}
