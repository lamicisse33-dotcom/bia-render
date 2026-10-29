import {NextRequest,NextResponse} from 'next/server';
import {verifierCode} from '@/lib/codes';
import {verifierNumero} from '@/lib/acces-lien';
import {createHash} from 'node:crypto';
import {cadrageAvatar,configurationAvatar,verifierAccesAvatar,ouvrirAvatar,fermerAvatar} from '@/lib/avatar-runway-serveur';
export const runtime='nodejs';
export const dynamic='force-dynamic';
const headers={'Cache-Control':'no-store'};
let diagnostic:unknown=null,date=0;
let ouverture=false;
const mesures:{date:string;evenement:string;ms:number|null}[]=[];
export async function GET(req:NextRequest){
 const configuration=configurationAvatar();
 if(req.nextUrl.searchParams.get('verifier')==='1'&&Object.values(configuration).every(Boolean)&&Date.now()-date>60000){
  date=Date.now();diagnostic=await verifierAccesAvatar().catch(()=>({erreur:'verification_indisponible'}));
 }
 return NextResponse.json({configuration,acces:diagnostic,date_verification:date?new Date(date).toISOString():null,mesures,avatar_conversation:true,cadrage:cadrageAvatar()},{headers});
}
export async function POST(req:NextRequest){
 const a=verifierCode(req.headers.get('x-bia-code'),false);
 if(!a.ok)return NextResponse.json({erreur:'Code d’accès refusé.'},{status:401,headers});
 const numero=await verifierNumero(req.headers.get('x-bia-code')||'',req.headers.get('x-bia-numero'),a.maitre);
 if(!numero.ok)return NextResponse.json({erreur:numero.message},{status:401,headers});
 const proprietaire=createHash('sha256').update(req.headers.get('x-bia-code')||'').digest('hex');
 const origin=req.headers.get('origin');
 if(origin&&origin!==req.nextUrl.origin&&origin!=='https://app.khalam.app')return NextResponse.json({erreur:'Origine refusée.'},{status:403,headers});
 try{
  const b=await req.json();
  if(b.action==='mesure'&&['video_recue','audio_envoye','lecture_signalee','lecture_terminee','erreur_client'].includes(b.evenement)){
   mesures.push({date:new Date().toISOString(),evenement:b.evenement,ms:typeof b.ms==='number'&&Number.isFinite(b.ms)?Math.max(0,Math.round(b.ms)):null});if(mesures.length>30)mesures.shift();
   return NextResponse.json({recu:true},{headers});
  }
  if(b.action==='fermer'&&typeof b.session==='string'){await fermerAvatar(b.session,proprietaire);return NextResponse.json({ferme:true},{headers});}
  if(b.action!=='ouvrir')return NextResponse.json({erreur:'Action invalide.'},{status:400,headers});
  if(ouverture)return NextResponse.json({erreur:'Ouverture déjà en cours.'},{status:409,headers});
  ouverture=true;try{return NextResponse.json(await ouvrirAvatar(proprietaire,b.conversation===true),{headers});}finally{ouverture=false;}
 }catch(e){return NextResponse.json({erreur:e instanceof Error&&/^(runway_http_\d+|configuration_incomplete|essai_deja_en_cours|session_sans_identifiant)$/.test(e.message)?e.message:'Connexion avatar indisponible.'},{status:502,headers});}
}
