import {identiteOreille} from '@/lib/oreille-essai-auth';
import {manifest,marker,oreilleInstallee,fichierOreille,sha} from '@/lib/oreille-essai-assets';
import {lireObjetMemoire,ecrireObjetMemoire} from '@/lib/audio-memoire-stockage';
export const dynamic='force-dynamic';
export async function GET(){return Response.json({ready:await oreilleInstallee(),revision:manifest.revision,bytes:manifest.total_bytes},{headers:{'cache-control':'no-store'}});}
export async function POST(r:Request){
 if(!await identiteOreille((r.headers.get('authorization')||'').replace(/^Bearer /,''),'install'))return new Response(null,{status:401});
 const q=new URL(r.url).searchParams;
 try{
  if(q.get('complete')==='1'){
   if(await oreilleInstallee())return Response.json({ready:true});
   const {createHash}=await import('node:crypto');
   for(const file of Object.values(manifest.files)){
    const whole=createHash('sha256');let size=0;
    for(const part of file.parts){
     const stored=await lireObjetMemoire(part.path);if(!stored)return Response.json({error:'Partie manquante'},{status:409});
     const data=new Uint8Array(await stored.arrayBuffer());if(data.length!==part.bytes||sha(data)!==part.sha256)return Response.json({error:'Empreinte différente'},{status:409});whole.update(data);size+=data.length;
    }
    if(size!==file.bytes||whole.digest('hex')!==file.sha256)return Response.json({error:'Fichier différent'},{status:409});
   }
   await ecrireObjetMemoire(marker,JSON.stringify({revision:manifest.revision,verified_at:new Date().toISOString(),selected_by_default:false}),'application/json');
   return Response.json({ready:true});
  }
  const file=fichierOreille(q.get('file')),index=q.get('part');
  if(!file||index===null||!/^\d+$/.test(index)||Number(index)>=file.parts.length)return new Response(null,{status:400});
  const part=file.parts[Number(index)];
  if(Number(r.headers.get('content-length'))!==part.bytes)return new Response(null,{status:413});
  const bytes=new Uint8Array(await r.arrayBuffer());if(bytes.length!==part.bytes||sha(bytes)!==part.sha256)return new Response(null,{status:422});
  const stored=await lireObjetMemoire(part.path);
  if(stored){const old=new Uint8Array(await stored.arrayBuffer());if(old.length!==part.bytes||sha(old)!==part.sha256)return new Response(null,{status:409});return Response.json({ok:true,existing:true});}
  await ecrireObjetMemoire(part.path,bytes,'application/octet-stream',false);return Response.json({ok:true});
 }catch{return Response.json({error:'Stockage de l’oreille indisponible'},{status:503});}
}
