import {timingSafeEqual} from "node:crypto";
import {NextResponse} from "next/server";
import {verifierCode} from "@/lib/codes";
import {garderLecon,lireLecons} from "@/lib/lexique-apprentissage";
export const dynamic="force-dynamic";
export async function POST(r:Request){
 const v=verifierCode(r.headers.get("x-bia-code"));
 const expected=Buffer.from(process.env.CHATTERBOX_TEST_KEY||""),received=Buffer.from(r.headers.get("x-chatterbox-test-key")||"");
 const interne=expected.length>0&&expected.length===received.length&&timingSafeEqual(expected,received);
 if(!(v.ok&&v.maitre)&&!interne)return NextResponse.json({error:"Accès refusé"},{status:401});
 // Narrow repair authorized by Lamine: reuse the approved French spelling/profile,
 // without inventing a phonetic alias or changing any other pronunciation.
 try{
  const date=new Date().toISOString();
  const avant=(await lireLecons(true)).find(l=>l.langue==="fr"&&l.texte.toLowerCase()==="wave");
  if(!avant||avant.statut!=="validé")await garderLecon({texte:"Wave",langue:"fr",prononciation:"Wave",exemple:"Ndax mën naa fay ak Wave ?",statut:"validé",date,date_validation:date});
  const l=(await lireLecons(true)).find(l=>l.langue==="fr"&&l.texte.toLowerCase()==="wave");
  if(l?.statut!=="validé")throw Error("Relecture différente");
  return NextResponse.json({verifie:true,mot:l.texte,profil:"fr",alias:l.prononciation});
 }catch{return NextResponse.json({error:"Correction Supabase non confirmée"},{status:503});}
}
