import {verifierCode} from '@/lib/codes';
import {enregistrerPrise,listePrises,lirePrise} from '@/lib/prises-validees';
export const dynamic='force-dynamic';
export async function GET(r:Request){
 const v=verifierCode(r.headers.get('x-bia-code'),false);if(!v.ok)return new Response(null,{status:401});
 try{const id=new URL(r.url).searchParams.get('id');if(id){if(!/^[a-f0-9]{64}$/.test(id))return new Response(null,{status:400});const b=await lirePrise(id);return b?new Response(b,{headers:{'content-type':'audio/wav','cache-control':'private, no-store'}}):new Response(null,{status:404});}
 return Response.json({prises:await listePrises()},{headers:{'cache-control':'private, no-store'}});
 }catch{return Response.json({erreur:'Mémoire des prises indisponible'},{status:503});}
}
export async function POST(r:Request){
 const v=verifierCode(r.headers.get('x-bia-code'),false);if(!v.ok||!v.maitre)return new Response(null,{status:401});
 if(Number(r.headers.get('content-length'))>8_100_000)return new Response(null,{status:413});
 try{const f=await r.formData(),texte=String(f.get('texte')||''),langue=f.get('langue'),voice=f.get('voice'),audio=f.get('audio');
 if(f.get('validee')!=='oui'||!texte.trim()||texte.length>1500||!['wo','fr'].includes(String(langue))||!['female','male'].includes(String(voice))||!(audio instanceof Blob)||audio.size>8_000_044)return new Response(null,{status:400});
 const prise=await enregistrerPrise(texte,langue as 'wo'|'fr',voice as 'female'|'male',new Uint8Array(await audio.arrayBuffer()));return Response.json({confirmee:true,prise});
 }catch{return Response.json({erreur:'La prise audio n’a pas pu être confirmée. Réessaie.'},{status:503});}
}
