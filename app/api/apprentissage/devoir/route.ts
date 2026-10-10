import {NextRequest,NextResponse} from "next/server";
import {verifierCode} from "@/lib/codes";
import {garderBlocDevoir} from "@/lib/devoirs-apprentissage";
export const dynamic="force-dynamic";
export async function POST(r:NextRequest){
 const v=verifierCode(r.headers.get("x-bia-code"));if(!v.ok||!v.maitre)return NextResponse.json({error:"Code maître requis"},{status:401});
 const b=await r.json().catch(()=>null);
 if(typeof b?.texte!=="string"||!b.texte||b.texte.length>4000||!Number.isSafeInteger(b.index)||!Number.isSafeInteger(b.total)||b.index<0||b.total<1||b.index>=b.total||typeof b.id!=="string"||!/^[a-f0-9]{64}$/.test(b.id))return NextResponse.json({error:"Bloc de devoir invalide"},{status:400});
 if(b.valide===true&&(b.confirme!==true||!["fr","wo"].includes(b.langue)))return NextResponse.json({error:"Confirmation d’écoute et langue requises"},{status:400});
 try{return NextResponse.json(await garderBlocDevoir(b.texte,b.index,b.total,b.id,b.valide===true,b.langue==="fr"?"fr":"wo"));}
 catch{return NextResponse.json({error:"Sauvegarde Supabase non confirmée. Réessaie sans fermer ce texte."},{status:503});}
}
