import {NextResponse} from 'next/server';
import {timingSafeEqual} from 'node:crypto';
import {verifierCode} from '@/lib/codes';
import {genererSonsCourants,lireSonsCourants} from '@/lib/sons-courants';
import {PHRASES_COURANTES,VERSION_SONS_COURANTS} from '@/lib/sons-courants-core';
export const dynamic='force-dynamic';
export const maxDuration=100;
export async function GET(){
 try{return NextResponse.json({version:VERSION_SONS_COURANTS,attendus:PHRASES_COURANTES.length,sons:await lireSonsCourants()},{headers:{'cache-control':'no-store'}});}
 catch{return NextResponse.json({error:'Catalogue audio indisponible'},{status:503});}
}
export async function POST(r:Request){
 const v=verifierCode(r.headers.get('x-bia-code'));
 const a=Buffer.from(process.env.CHATTERBOX_TEST_KEY||''),b=Buffer.from(r.headers.get('x-chatterbox-test-key')||'');
 if(!(v.ok&&v.maitre)&&!(a.length>0&&a.length===b.length&&timingSafeEqual(a,b)))return NextResponse.json({error:'Accès refusé'},{status:401});
 try{return NextResponse.json(await genererSonsCourants());}catch{return NextResponse.json({error:'Préparation audio indisponible'},{status:503});}
}
