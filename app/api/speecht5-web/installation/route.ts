import {createHash} from 'node:crypto';
import {autoriserInstallation} from '@/lib/speecht5-installation';
import {lireObjetMemoire,ecrireObjetMemoire} from '@/lib/audio-memoire-stockage';
import manifest from '@/public/speecht5/manifest.json';
export const dynamic='force-dynamic';
const marker='modeles/speecht5-wo-fr/installation/'+manifest.revision+'.json';
const sha=(data:Uint8Array)=>createHash('sha256').update(data).digest('hex');
async function installed(){try{const object=await lireObjetMemoire(marker);return !!object&&(await object.json()).revision===manifest.revision;}catch{return false;}}
export async function GET(){return Response.json({ready:await installed(),revision:manifest.revision,bytes:manifest.total_bytes},{headers:{'cache-control':'no-store'}});}
export async function POST(r:Request){
 if(!await autoriserInstallation((r.headers.get('authorization')||'').replace(/^Bearer /,'')))return new Response(null,{status:401});
 const q=new URL(r.url).searchParams;
 try{
  if(q.get('complete')==='1'){
   if(await installed())return Response.json({ready:true});
   for(const file of Object.values(manifest.files))for(const part of file.parts){
    const object=await lireObjetMemoire(part.path);if(!object)return Response.json({error:'Partie manquante'},{status:409});
    const data=new Uint8Array(await object.arrayBuffer());if(data.length!==part.bytes||sha(data)!==part.sha256)return Response.json({error:'Partie différente'},{status:409});
   }
   await ecrireObjetMemoire(marker,JSON.stringify({revision:manifest.revision,verified_at:new Date().toISOString()}),'application/json');return Response.json({ready:true});
  }
  const name=q.get('file'),index=q.get('part'),file=name?manifest.files[name as keyof typeof manifest.files]:undefined;
  if(!file||index===null||!/^\d+$/.test(index)||Number(index)>=file.parts.length)return new Response(null,{status:400});
  const part=file.parts[Number(index)];
  if(Number(r.headers.get('content-length')||0)>part.bytes)return new Response(null,{status:413});
  const bytes=new Uint8Array(await r.arrayBuffer());if(bytes.length!==part.bytes||sha(bytes)!==part.sha256)return new Response(null,{status:422});
  const exists=await lireObjetMemoire(part.path);
  if(exists){const old=new Uint8Array(await exists.arrayBuffer());if(old.length!==part.bytes||sha(old)!==part.sha256)return new Response(null,{status:409});return Response.json({ok:true,existing:true});}
  await ecrireObjetMemoire(part.path,bytes,'application/octet-stream',false);return Response.json({ok:true});
 }catch{return Response.json({error:'Stockage SpeechT5 indisponible'},{status:503});}
}
