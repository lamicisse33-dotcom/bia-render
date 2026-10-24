/* ── KHALAM RAPIDE ÉCRIVAIT DANS LE VIDE ───────────────────────────────────

   Lamine, 24 octobre 2026 : « BIA n'a plus de mémoire. » Mesuré avant de
   toucher à quoi que ce soit : `garder()` n'était appelé que par
   app/api/chat/route.ts et lib/briques-reponse.ts — c'est-à-dire par Khalam
   seul. Une conversation entière sur Khalam Rapide ne laissait AUCUNE ligne
   dans khalam_souvenirs. Le lendemain, elle ne se rappelait de rien, et elle
   avait raison : rien n'avait été écrit.

   Cette route fait pour la connexion rapide ce que Khalam fait déjà : garder
   le tour. Mêmes gardes que lib/souvenirs.ts — c'est lui qui refuse ce qui
   ne doit pas être gardé, pas cette route.

   ÉCRITURE SEULE, UN TOUR À LA FOIS. Aucune lecture, aucun modèle, aucune
   voix. Le code d'accès identifie la personne, comme partout ailleurs. */
import {NextRequest,NextResponse} from 'next/server';
import {verifierCode} from '@/lib/codes';
import {garder} from '@/lib/souvenirs';
export const runtime='nodejs';
const headers={'cache-control':'no-store'};

export async function POST(req:NextRequest){
  const acces=verifierCode(req.headers.get('x-bia-code'),false);
  if(!acces.ok)return NextResponse.json({erreur:'Accès refusé.'},{status:401,headers});
  try{
    if(Number(req.headers.get('content-length')||0)>12000)return NextResponse.json({erreur:'Tour trop long.'},{status:413,headers});
    const body=await req.json();
    const personne=String(body.personne||'').trim().slice(0,80);
    const dit=String(body.dit||'').slice(0,4000);
    const repondu=String(body.repondu||'').slice(0,4000);
    const langue=body.langue==='wo'||body.langue==='fr'?body.langue:null;
    if(!personne||(!dit.trim()&&!repondu.trim()))return NextResponse.json({erreur:'Tour incomplet.'},{status:400,headers});
    /* `garder` ne fait jamais attendre une réponse ailleurs ; ici il n'y a
       rien à faire attendre, donc on confirme l'écriture au téléphone. */
    await garder({personne,dit,repondu,langue});
    return NextResponse.json({ok:true},{headers});
  }catch{return NextResponse.json({erreur:'Souvenir non enregistré.'},{status:503,headers});}
}
