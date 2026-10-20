import {autoriserEssaiOreille} from '@/lib/oreille-essai-auth';
import {manifest,oreilleInstallee,fichierOreille,sha} from '@/lib/oreille-essai-assets';
import {lireObjetMemoire} from '@/lib/audio-memoire-stockage';
import {mesurerOreilleEssai,resumeOreilleEssai} from '@/lib/oreille-essai-etat';
export const dynamic='force-dynamic';
export async function GET(r:Request){
 if(!await autoriserEssaiOreille(r))return new Response(null,{status:401});
 const q=new URL(r.url).searchParams;
 if(!q.has('file'))return Response.json({ready:await oreilleInstallee(),manifest,counters:resumeOreilleEssai()},{headers:{'cache-control':'no-store'}});
 const file=fichierOreille(q.get('file')),index=q.get('part');
 if(!file||index===null||!/^\d+$/.test(index)||Number(index)>=file.parts.length)return new Response(null,{status:404});
 if(!await oreilleInstallee())return new Response(null,{status:503});
 try{
  const part=file.parts[Number(index)],stored=await lireObjetMemoire(part.path);if(!stored)return new Response(null,{status:503});
  const bytes=new Uint8Array(await stored.arrayBuffer());if(bytes.length!==part.bytes||sha(bytes)!==part.sha256)return new Response(null,{status:503});
  return new Response(bytes,{headers:{'content-type':'application/octet-stream','cache-control':'private, no-store','x-bia-sha256':part.sha256}});
 }catch{return new Response(null,{status:503});}
}
export async function POST(r:Request){
 if(!await autoriserEssaiOreille(r))return new Response(null,{status:401});
 if(Number(r.headers.get('content-length')||0)>2048)return new Response(null,{status:413});
 try{const d=await r.json();if(!['pret','transcription','erreur'].includes(d.kind)||d.engine!=='moonshine'||d.revision!==manifest.revision)return new Response(null,{status:400});mesurerOreilleEssai(d.kind,Number(d.ms)||0);return Response.json({ok:true});}catch{return new Response(null,{status:400});}
}
