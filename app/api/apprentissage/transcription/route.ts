import {NextRequest,NextResponse} from "next/server";
import {verifierCode} from "@/lib/codes";
import {garderCorrectionTranscription} from "@/lib/correction-transcription";
export const dynamic="force-dynamic";
export async function POST(r:NextRequest){const v=verifierCode(r.headers.get("x-bia-code"));if(!v.ok||!v.maitre)return NextResponse.json({error:"Code maître requis"},{status:401});const b=await r.json().catch(()=>null);
 if(typeof b?.entendu!=="string"||typeof b?.corrige!=="string"||!b.entendu.trim()||!b.corrige.trim()||b.entendu.length>400||b.corrige.length>400||b.confirme!==true)return NextResponse.json({error:"Confirme la correction exacte, jusqu’à 400 caractères par règle."},{status:400});
 try{await garderCorrectionTranscription(b.entendu.trim(),b.corrige.trim());return NextResponse.json({ok:true,verifie:true});}catch{return NextResponse.json({error:"Correction non confirmée dans Supabase."},{status:503});}}
