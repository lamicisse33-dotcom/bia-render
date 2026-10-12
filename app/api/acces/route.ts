import {NextRequest,NextResponse} from 'next/server';
import {verifierEntree} from '@/lib/codes';

/** Validate entry without using up a conversational question. */
export async function GET(request:NextRequest){
 const verdict=verifierEntree(request.headers.get('x-bia-code'));
 const messages={absent:'Saisis ton code d’accès.',invalide:'Code refusé. Vérifie ton code.',expire:'Ce code a expiré.',epuise:'Ce code a atteint sa limite d’utilisation.'};
 return NextResponse.json(verdict.ok?{ok:true,maitre:verdict.maitre}:{ok:false,erreur:messages[verdict.raison]},
  {status:verdict.ok?200:401,headers:{'cache-control':'no-store'}});
}
