import {verifierCode} from '@/lib/codes';
import {integrerCorrectionsBiba,lireCorrectionsBiba,resumeBibaCorrections} from '@/lib/biba-corrections';
export async function GET(request:Request){
 const v=verifierCode(request.headers.get('x-bia-code'),false);
 if(!v.ok||!v.maitre)return Response.json({erreur:'Réservé au maître'},{status:401});
 try{return Response.json({reponses:await lireCorrectionsBiba(),bilan:resumeBibaCorrections()},{headers:{'cache-control':'private, no-store'}});}
 catch{return Response.json({erreur:'Lecture des corrections BIBA impossible'},{status:503});}
}
export async function POST(request:Request){
 const v=verifierCode(request.headers.get('x-bia-code'),false);
 if(!v.ok||!v.maitre)return Response.json({erreur:'Réservé au maître'},{status:401});
 try{return Response.json(await integrerCorrectionsBiba(),{headers:{'cache-control':'private, no-store'}});}
 catch{return Response.json({erreur:'Import des corrections BIBA non confirmé',bilan:resumeBibaCorrections()},{status:503});}
}
