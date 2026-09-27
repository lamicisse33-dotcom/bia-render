import { NextRequest, NextResponse } from "next/server";
import { createHash, timingSafeEqual } from "node:crypto";
import { CHEMIN_CORPUS_VALIDE, listerCorpus, lireExtraitAudio } from "@/lib/corpus";
import { toutes } from "@/lib/lexique";

/* Passerelle temporaire d'export vers le Mac runner.
   Elle ne contient aucun secret : la preuve envoyée doit être le SHA-256 du
   code maître déjà présent dans l'environnement Render. Cette route sera
   retirée après l'export. */
function autorise(request: NextRequest) {
  const secret=process.env.BIA_CODE_MAITRE||"";
  const recu=request.nextUrl.searchParams.get("proof")||"";
  if(!secret || !/^[a-f0-9]{64}$/i.test(recu)) return false;
  const attendu=createHash("sha256").update(secret).digest("hex");
  try {
    return timingSafeEqual(Buffer.from(recu,"hex"),Buffer.from(attendu,"hex"));
  } catch { return false; }
}


async function listerStockageBrut() {
  const url=(process.env.SUPABASE_URL||"").replace(/\/$/,"");
  const key=process.env.SUPABASE_SERVICE_KEY||"";
  const bucket=process.env.SUPABASE_BUCKET_CORPUS||"corpus";
  if(!url||!key) return { fichiers:0, octets:0, dossiers:0, erreurs:["supabase absent"] as string[] };
  const headers={
    apikey:key,
    Authorization:`Bearer ${key}`,
    "content-type":"application/json",
  };
  const erreurs:string[]=[];
  let fichiers=0,octets=0,dossiers=0;
  const vus=new Set<string>();
  const fileExt=/\.(webm|wav|mp3|mp4|m4a|aac|ogg|opus)$/i;

  async function scan(prefix:string){
    let offset=0;
    for(;;){
      const r=await fetch(`${url}/storage/v1/object/list/${bucket}`,{
        method:"POST",headers,
        body:JSON.stringify({prefix,limit:1000,offset,sortBy:{column:"name",order:"asc"}}),
      });
      if(!r.ok){erreurs.push(`${prefix||"/"}: ${r.status}`);return;}
      const rows=await r.json() as Array<Record<string,unknown>>;
      for(const row of rows){
        const name=String(row.name||"");
        if(!name) continue;
        const meta=(row.metadata||null) as Record<string,unknown>|null;
        const full=prefix?`${prefix}/${name}`:name;
        if(meta){
          fichiers++;
          octets+=Number(meta.size||0)||0;
        }else if(!vus.has(full)){
          vus.add(full); dossiers++;
          await scan(full);
        }
      }
      if(rows.length<1000) break;
      offset+=rows.length;
    }
  }
  await scan("");
  return {fichiers,octets,dossiers,erreurs};
}

export async function GET(request: NextRequest) {
  if (!autorise(request)) return NextResponse.json({ erreur: "export" }, { status: 401 });
  const chemin=request.nextUrl.searchParams.get("chemin");
  try {
    if (chemin) {
      if (!CHEMIN_CORPUS_VALIDE.test(chemin)) return NextResponse.json({ erreur:"chemin" },{status:400});
      const r=await lireExtraitAudio(chemin);
      if (!r) return NextResponse.json({ erreur:"absent" },{status:404});
      const type=chemin.endsWith(".mp3")?"audio/mpeg":
        chemin.endsWith(".wav")?"audio/wav":
        chemin.endsWith(".ogg")?"audio/ogg":
        chemin.endsWith(".mp4")?"audio/mp4":"audio/webm";
      return new NextResponse(Buffer.from(await r.arrayBuffer()),{headers:{"content-type":type}});
    }
    const [extraits,lexique,stockage]=await Promise.all([listerCorpus(false),toutes(),listerStockageBrut()]);
    const connus=new Set(extraits.map(e=>e.chemin));
    return NextResponse.json({
      extraits,
      lexique,
      verifies: extraits.filter(e=>Boolean(e.verifie)).length,
      total: extraits.length,
      stockage,
      audio_references_en_table: connus.size,
      ecart_stockage_table: Math.max(0,stockage.fichiers-connus.size),
    });
  } catch(err) {
    return NextResponse.json({erreur:(err as Error).message},{status:500});
  }
}
