import {audioPossessifSa} from '@/lib/essai-possessif-sa';
export const dynamic='force-dynamic';
export async function GET(){
 const audio=audioPossessifSa();
 if(!audio)return Response.json({disponible:false},{status:503});
 return new Response(new Uint8Array(audio),{headers:{'content-type':'audio/mpeg','cache-control':'no-store'}});
}
