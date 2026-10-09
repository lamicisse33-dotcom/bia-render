import { NextRequest,NextResponse } from "next/server";
import { verifierCode } from "@/lib/codes";
import { timingSafeEqual } from "node:crypto";
import { POST as synthese } from "../../chatterbox-test/route";
import { prononciationsApprises } from "@/lib/lexique-apprentissage";
import { texteKhalamVoix } from "@/lib/texte-khalam-voix";
import { segmentsLecture } from "@/lib/lecture-continue";
export const dynamic="force-dynamic";
export const maxDuration=100;
function acces(r:NextRequest){
 const v=verifierCode(r.headers.get("x-bia-code"));if(v.ok&&v.maitre)return true;
 const a=Buffer.from(r.headers.get("x-chatterbox-test-key")||"");const b=Buffer.from(process.env.CHATTERBOX_TEST_KEY||"");
 return b.length>0&&a.length===b.length&&timingSafeEqual(a,b);
}
export async function POST(r:NextRequest){
 if(!acces(r))return NextResponse.json({error:"Code maître requis"},{status:401});
 const b=await r.json().catch(()=>null);
 if(!b||typeof b.texte!=="string"||!b.texte.trim()||b.texte.length>500)return NextResponse.json({error:"Segment requis, maximum 500 caractères"},{status:400});
 const langue=b.langue==="fr"?"fr":"wo";
 try {
  const texte=await prononciationsApprises(texteKhalamVoix(b.texte),langue);
  // Number expansion/learned pronunciations can grow a segment. Split safely
  // again and let the client finish ALL subparts before advancing its cursor.
  const parts=segmentsLecture(texte,500);
  const part=b.partie===undefined?0:Number(b.partie);
  if(!Number.isInteger(part)||part<0||part>=parts.length)return NextResponse.json({error:"Partie invalide"},{status:400});
  const key=process.env.CHATTERBOX_TEST_KEY;
  if(!key)throw new Error("Moteur non configuré");
  const response=await synthese(new NextRequest(r.url,{method:"POST",headers:{"content-type":"application/json","x-chatterbox-test-key":key},
   body:JSON.stringify({input:{text:parts[part],voice:b.voice==="male"?"male":"female",language:langue,preserve_segment:true}})}));
  const data=await response.json();
  if(!response.ok)return NextResponse.json(data,{status:response.status});
  return NextResponse.json({...data,parties:parts.length,partie:part},{headers:{"cache-control":"no-store"}});
 }catch{return NextResponse.json({error:"Voix ou lexique indisponible. Réessaie ce segment."},{status:503});}
}
