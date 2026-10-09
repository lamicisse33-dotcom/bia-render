import { NextRequest, NextResponse } from "next/server";
import { verifierCode } from "@/lib/codes";
import { lireLecons,garderLecon } from "@/lib/lexique-apprentissage";
import { validerLecon } from "@/lib/lexique-apprentissage-core";
export const dynamic="force-dynamic";
function autorise(r:NextRequest){const v=verifierCode(r.headers.get("x-bia-code"));return v.ok&&v.maitre;}
export async function GET(r:NextRequest){
 if(!autorise(r))return NextResponse.json({error:"Code maître requis"},{status:401});
 try{return NextResponse.json({lecons:await lireLecons(true),memoire:"Supabase — lexique existant"},{headers:{"cache-control":"no-store"}});}
 catch{return NextResponse.json({error:"Lexique indisponible. Réessaie."},{status:503});}
}
export async function POST(r:NextRequest){
 if(!autorise(r))return NextResponse.json({error:"Code maître requis"},{status:401});
 let lecon;
 try{lecon=validerLecon(await r.json());}catch(e){return NextResponse.json({error:(e as Error).message},{status:400});}
 try{await garderLecon(lecon);return NextResponse.json({ok:true,lecon});}
 catch{return NextResponse.json({error:"Enregistrement impossible. Rien n'est confirmé."},{status:503});}
}
