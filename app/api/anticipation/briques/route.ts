import {verifierCode} from '@/lib/codes';
import {preparerBrique} from '@/lib/briques-reponse';
export async function POST(r:Request){
 const code=r.headers.get('x-bia-code')||'',v=verifierCode(code,false);
 if(!v.ok)return new Response(null,{status:401});
 try{const text=await r.text();if(text.length>50000)return new Response(null,{status:413});
  const preparation=await preparerBrique(JSON.parse(text),code,v.maitre,AbortSignal.any([r.signal,AbortSignal.timeout(35000)]));
  return Response.json({preparation},{headers:{'cache-control':'private, no-store'}});
 }catch{return Response.json({preparation:null},{status:503});}
}
