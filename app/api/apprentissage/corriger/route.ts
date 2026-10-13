import {NextRequest,NextResponse} from 'next/server';
import {verifierCode} from '@/lib/codes';
import {lireCorrectionsTranscription,phrasesLexiqueComplet} from '@/lib/correction-transcription';
import {corrigerTexteApprentissage} from '@/lib/correction-apprentissage-core';
export const dynamic='force-dynamic';
export async function POST(r:NextRequest){
 const v=verifierCode(r.headers.get('x-bia-code'));if(!v.ok||!v.maitre)return NextResponse.json({error:'Code maître requis'},{status:401});
 const b=await r.json().catch(()=>null);if(typeof b?.texte!=='string'||b.texte.length>60000)return NextResponse.json({error:'Texte limité à 60 000 caractères.'},{status:400});
 try{const [phrases,regles]=await Promise.all([phrasesLexiqueComplet(true),lireCorrectionsTranscription()]);
  return NextResponse.json({...corrigerTexteApprentissage(b.texte,phrases,regles),source:'lexique_validé_supabase'});
 }catch{return NextResponse.json({error:'Lexique inaccessible : le texte est conservé.'},{status:503});}
}
