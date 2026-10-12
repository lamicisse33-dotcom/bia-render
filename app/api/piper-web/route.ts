import {createHash,timingSafeEqual} from 'node:crypto';
import {verifierCode} from '@/lib/codes';
import {assurerMemoire,lireObjetMemoire,ecrireObjetMemoire} from '@/lib/audio-memoire-stockage';
import manifest from '@/public/piper/manifest.json';
export const dynamic='force-dynamic';
const prefix='modeles/khalam-v2/'+manifest.sha256+'/';
function installation(r:Request){
 const key=process.env.BIA_PIPER_INSTALL_KEY||'',given=r.headers.get('x-bia-piper-install')||'';
 return Date.now()<Date.parse('2026-10-12T18:00:00Z')&&key.length>=32&&given.length===key.length&&timingSafeEqual(Buffer.from(key),Buffer.from(given));
}
function index(r:Request){const s=new URL(r.url).searchParams.get('part');return s!==null&&/^\d+$/.test(s)&&Number(s)<manifest.parts.length?Number(s):-1;}
export async function GET(r:Request){
 if(!verifierCode(r.headers.get('x-bia-code'),false).ok&&!installation(r))return new Response(null,{status:401});
 const part=index(r);if(part<0)return new Response(null,{status:400});
 try{const obj=await lireObjetMemoire(prefix+part+'.bin');if(!obj)return new Response(null,{status:503});
  return new Response(obj.body,{headers:{'content-type':'application/octet-stream','cache-control':'private, no-store','x-khalam-sha256':manifest.parts[part]}});
 }catch{return new Response(null,{status:503});}
}
// Temporary, hash-pinned installation: no arbitrary path, model or overwrite.
export async function POST(r:Request){
 if(!installation(r))return new Response(null,{status:401});
 const part=index(r);if(part<0)return new Response(null,{status:400});
 const expected=Math.min(manifest.partSize,manifest.bytes-part*manifest.partSize);
 if(Number(r.headers.get('content-length'))!==expected)return new Response(null,{status:413});
 const bytes=new Uint8Array(await r.arrayBuffer());
 if(bytes.length!==expected||createHash('sha256').update(bytes).digest('hex')!==manifest.parts[part])return new Response(null,{status:422});
 try{await assurerMemoire();const path=prefix+part+'.bin';const saved=await lireObjetMemoire(path);
  if(saved){const old=new Uint8Array(await saved.arrayBuffer());if(createHash('sha256').update(old).digest('hex')!==manifest.parts[part])return new Response(null,{status:409});}
  else await ecrireObjetMemoire(path,bytes,'application/octet-stream');
  return Response.json({ok:true,part});
 }catch{return Response.json({error:'Installation indisponible.'},{status:503});}
}
