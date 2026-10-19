import {verifierCode} from '@/lib/codes';
import {lireObjetMemoire} from '@/lib/audio-memoire-stockage';
import manifest from '@/public/speecht5/manifest.json';
export const dynamic='force-dynamic';
export async function GET(r:Request){
 if(!verifierCode(r.headers.get('x-bia-code'),false).ok)return new Response(null,{status:401});
 const q=new URL(r.url).searchParams,name=q.get('file'),index=q.get('part');
 const file=name?manifest.files[name as keyof typeof manifest.files]:undefined;
 if(!file||index===null||!/^\d+$/.test(index)||Number(index)>=file.parts.length)return new Response(null,{status:400});
 const part=file.parts[Number(index)];
 try{const object=await lireObjetMemoire(part.path);if(!object)return new Response(null,{status:503});
 return new Response(object.body,{headers:{'content-type':'application/octet-stream','cache-control':'private, no-store','x-bia-sha256':part.sha256}});
 }catch{return new Response(null,{status:503});}
}
