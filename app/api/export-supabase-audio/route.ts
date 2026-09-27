import { NextRequest } from "next/server";
import { createHash, timingSafeEqual } from "node:crypto";
import { createReadStream, createWriteStream } from "node:fs";
import { mkdir, rm, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { Readable } from "node:stream";
import { pipeline } from "node:stream/promises";
import { spawn } from "node:child_process";
import { listerCorpus, listerTousLesFichiersDuCorpus, lireFichierBrutDuCorpus } from "@/lib/corpus";
import { toutes } from "@/lib/lexique";

export const runtime="nodejs";
export const dynamic="force-dynamic";

function autorise(req:NextRequest){
  const secret=process.env.BIA_CODE_MAITRE||"";
  const proof=req.nextUrl.searchParams.get("proof")||"";
  if(!secret||!/^[a-f0-9]{64}$/i.test(proof)) return false;
  const expected=createHash("sha256").update(secret).digest("hex");
  try{return timingSafeEqual(Buffer.from(proof,"hex"),Buffer.from(expected,"hex"));}catch{return false;}
}

async function tarGz(src:string,dest:string){
  await new Promise<void>((resolve,reject)=>{
    const p=spawn("tar",["-czf",dest,"-C",src,"."]);
    let err="";
    p.stderr.on("data",d=>err+=String(d));
    p.on("error",reject);
    p.on("close",c=>c===0?resolve():reject(new Error(err||String(c))));
  });
}

export async function GET(req:NextRequest){
  if(!autorise(req)) return new Response("Accès refusé",{status:401});
  const root=join("/tmp","bia-supabase-"+Date.now().toString(36));
  const raw=join(root,"audio-supabase");
  const archive=root+".tar.gz";
  await mkdir(raw,{recursive:true});
  try{
    const [files,table,lexique]=await Promise.all([
      listerTousLesFichiersDuCorpus(),
      listerCorpus(false),
      toutes(),
    ]);
    const audioExt=/\.(webm|wav|mp3|mp4|m4a|aac|ogg|opus)$/i;
    const audioFiles=files.filter(f=>audioExt.test(f.chemin));
    let ok=0,bytes=0;
    const errors:any[]=[];
    for(const f of audioFiles){
      try{
        const r=await lireFichierBrutDuCorpus(f.chemin);
        if(!r?.body) throw new Error("absent");
        const dest=join(raw,f.chemin);
        await mkdir(dirname(dest),{recursive:true});
        await pipeline(Readable.fromWeb(r.body as any),createWriteStream(dest));
        ok++; bytes+=Number(f.octets||0);
      }catch(e){errors.push({chemin:f.chemin,erreur:(e as Error).message});}
    }
    const known=new Set(table.map(x=>x.chemin));
    await Promise.all([
      writeFile(join(root,"fichiers-supabase.json"),JSON.stringify(files,null,2)),
      writeFile(join(root,"table-khalam-corpus.json"),JSON.stringify(table,null,2)),
      writeFile(join(root,"lexique.json"),JSON.stringify(lexique,null,2)),
      writeFile(join(root,"SUMMARY.json"),JSON.stringify({
        fichiers_bucket:files.length,
        audio_bucket:audioFiles.length,
        audio_telecharges:ok,
        audio_erreurs:errors.length,
        audio_octets_declares:bytes,
        lignes_table:table.length,
        fichiers_audio_non_references:audioFiles.filter(f=>!known.has(f.chemin)).length,
        lexique:lexique.length,
        erreurs:errors
      },null,2))
    ]);
    await tarGz(root,archive);
    const body=Readable.toWeb(createReadStream(archive)) as ReadableStream;
    return new Response(body,{headers:{
      "content-type":"application/gzip",
      "content-disposition":'attachment; filename="bia-supabase-audios.tar.gz"',
      "cache-control":"no-store"
    }});
  }catch(e){
    return new Response("Export impossible: "+(e as Error).message,{status:500});
  }finally{
    await rm(root,{recursive:true,force:true}).catch(()=>{});
    await rm(archive,{force:true}).catch(()=>{});
  }
}
