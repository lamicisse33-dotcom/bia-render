import {verifierCode} from '@/lib/codes';
import {lireObjetMemoire} from '@/lib/audio-memoire-stockage';
import manifest from '@/public/piper/manifest.json';
export const dynamic='force-dynamic';
const prefix='modeles/khalam-v2/'+manifest.sha256+'/';
export async function GET(r:Request){
 if(!verifierCode(r.headers.get('x-bia-code'),false).ok)return new Response(null,{status:401});
 const s=new URL(r.url).searchParams.get('part');
 if(s===null||!/^\d+$/.test(s)||Number(s)>=manifest.parts.length)return new Response(null,{status:400});
 try{const part=Number(s),obj=await lireObjetMemoire(prefix+part+'.bin');if(!obj)return new Response(null,{status:503});
  return new Response(obj.body,{headers:{'content-type':'application/octet-stream','cache-control':'private, no-store','x-khalam-sha256':manifest.parts[part]}});
 }catch{return new Response(null,{status:503});}
}
