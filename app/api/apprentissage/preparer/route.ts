import {NextRequest,NextResponse} from "next/server";
import {verifierCode} from "@/lib/codes";
import {texteKhalamVoix} from "@/lib/texte-khalam-voix";
import {prononciationsApprises} from "@/lib/lexique-apprentissage";
export const dynamic="force-dynamic";
export async function POST(request:NextRequest){
 if(!verifierCode(request.headers.get("x-bia-code")).ok)return NextResponse.json({error:"Code d’accès refusé"},{status:401});
 const d=await request.json().catch(()=>null);
 if(typeof d?.texte!=="string"||!d.texte.trim()||d.texte.length>500)return NextResponse.json({error:"Segment invalide"},{status:400});
 try{return NextResponse.json({texte:await prononciationsApprises(texteKhalamVoix(d.texte),d.langue==="fr"?"fr":"wo")},{headers:{"cache-control":"no-store"}});}
 catch{return NextResponse.json({error:"Lexique indisponible"},{status:503});}
}
