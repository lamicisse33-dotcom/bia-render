import {verifierCode} from '@/lib/codes';
import {preparerReponseAnticipee} from '@/lib/anticipation-reponse';
export async function POST(r:Request){const code=r.headers.get('x-bia-code')||'',v=verifierCode(code,false);if(!v.ok)return new Response(null,{status:401});try{const text=await r.text();if(text.length>50000)return new Response(null,{status:413});return Response.json({preparation:await preparerReponseAnticipee(JSON.parse(text),code,v.maitre,r.signal)},{headers:{'cache-control':'private, no-store'}});}catch{return Response.json({preparation:null});}}
