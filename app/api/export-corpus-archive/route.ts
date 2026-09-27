import { NextRequest } from "next/server";
import { createHash, timingSafeEqual } from "node:crypto";
import { mkdir, rm, writeFile } from "node:fs/promises";
import { createReadStream, createWriteStream } from "node:fs";
import { dirname, join } from "node:path";
import { Readable } from "node:stream";
import { pipeline } from "node:stream/promises";
import { spawn } from "node:child_process";
import { CHEMIN_CORPUS_VALIDE, listerCorpus, lireExtraitAudio } from "@/lib/corpus";
import { toutes } from "@/lib/lexique";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function ok(req: NextRequest) {
  const s = process.env.BIA_CODE_MAITRE || "";
  const p = req.nextUrl.searchParams.get("proof") || "";
  if (!s || !/^[a-f0-9]{64}$/i.test(p)) return false;
  const h = createHash("sha256").update(s).digest("hex");
  try { return timingSafeEqual(Buffer.from(p,"hex"),Buffer.from(h,"hex")); }
  catch { return false; }
}

async function makeTar(src:string,dest:string){
  await new Promise<void>((resolve,reject)=>{
    const p=spawn("tar",["-czf",dest,"-C",src,"."]);
    let e="";
    p.stderr.on("data",d=>e+=String(d));
    p.on("error",reject);
    p.on("close",c=>c===0?resolve():reject(new Error(e||String(c))));
  });
}

export async function GET(req: NextRequest){
  if(!ok(req)) return new Response("Accès refusé",{status:401});
  const tag=Date.now().toString(36);
  const root=join("/tmp","bia-export-"+tag);
  const audio=join(root,"audio");
  const archive=root+".tar.gz";
  await mkdir(audio,{recursive:true});
  try{
    const [items,lex]=await Promise.all([listerCorpus(false),toutes()]);
    const verified=items.filter(x=>String(x.verifie||"").trim());
    await Promise.all([
      writeFile(join(root,"corpus.json"),JSON.stringify(items,null,2)),
      writeFile(join(root,"lexique.json"),JSON.stringify(lex,null,2)),
      writeFile(join(root,"transcriptions.jsonl"),items.map(x=>JSON.stringify(x)).join("\n")+"\n"),
      writeFile(join(root,"transcriptions-verifiees.jsonl"),verified.map(x=>JSON.stringify(x)).join("\n")+"\n"),
    ]);
    const errors:any[]=[];
    let got=0;
    for(const item of items){
      const path=String(item.chemin||"");
      if(!CHEMIN_CORPUS_VALIDE.test(path)){errors.push({path,error:"invalid"});continue;}
      try{
        const r=await lireExtraitAudio(path);
        if(!r?.body) throw new Error("missing");
        const dest=join(audio,path);
        await mkdir(dirname(dest),{recursive:true});
        await pipeline(Readable.fromWeb(r.body as any),createWriteStream(dest));
        got++;
      }catch(e){errors.push({path,error:(e as Error).message});}
    }
    await writeFile(join(root,"SUMMARY.json"),JSON.stringify({
      total:items.length,verified:verified.length,lexique:lex.length,
      audio_downloaded:got,audio_errors:errors.length,errors
    },null,2));
    await makeTar(root,archive);
    const body=Readable.toWeb(createReadStream(archive)) as ReadableStream;
    return new Response(body,{headers:{
      "content-type":"application/gzip",
      "content-disposition":'attachment; filename="bia-corpus.tar.gz"',
      "cache-control":"no-store"
    }});
  }catch(e){
    await rm(root,{recursive:true,force:true}).catch(()=>{});
    await rm(archive,{force:true}).catch(()=>{});
    return new Response("Export impossible: "+(e as Error).message,{status:500});
  }
}
