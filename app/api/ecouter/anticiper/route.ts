import {verifierCode} from '@/lib/codes';
import {cleValide} from '@/lib/morceaux-de-parole';
import {anticiperEcoute} from '@/lib/ecoute-anticipee';
export async function POST(request:Request){
 const code=request.headers.get('x-bia-code')||'',v=verifierCode(code);
 if(!v.ok||!v.maitre)return Response.json({erreur:'code'},{status:401});
 try{
  const f=await request.formData(),audio=f.get('audio'),cle=cleValide(f.get('tour'));
  if(!cle||!(audio instanceof Blob))return Response.json({acceptee:false},{status:400});
  return Response.json({acceptee:await anticiperEcoute(cle,code,audio,String(f.get('indice_langue')||'')||null)});
 }catch{return Response.json({acceptee:false},{status:400});}
}
