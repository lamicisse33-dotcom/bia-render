import {NextResponse} from "next/server";
import {verifierCode} from "@/lib/codes";
import {garderInstruction} from "@/lib/instructions-apprentissage";
export const dynamic="force-dynamic";
export async function POST(r:Request){
 const v=verifierCode(r.headers.get("x-bia-code"));if(!v.ok||!v.maitre)return NextResponse.json({error:"Code maître requis"},{status:401});
 const b=await r.json().catch(()=>null);
 if(typeof b?.texte!=="string"||!b.texte.trim()||b.texte.length>4000)return NextResponse.json({error:"Instruction requise, 4 000 caractères maximum"},{status:400});
 try{return NextResponse.json(await garderInstruction(b.texte.trim()));}catch{return NextResponse.json({error:"Instruction non enregistrée : Supabase inaccessible. Réessaie."},{status:503});}
}
