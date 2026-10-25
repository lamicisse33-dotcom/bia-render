import {createHash,createPublicKey,verify} from "node:crypto";
import {assurerMemoire,ecrireObjetMemoire,lireObjetMemoire} from "@/lib/audio-memoire-stockage";
import {lexiqueConfig} from "@/lib/lexique";
import {verifierCode} from "@/lib/codes";

export const runtime="nodejs";
export const dynamic="force-dynamic";
const PART_SIZE=8*1024*1024;
const BUCKET_PREFIX="modeles/khalam-gratuit/";
const ALLOWED_WORKFLOW="lamicisse33-dotcom/dydy/.github/workflows/bia-upload-khalam-gratuit.yml@refs/heads/wolof-local";
let jwksCache:{until:number;keys:Array<Record<string,unknown>>}|null=null;

async function verifierJetonGitHub(request:Request):Promise<boolean>{
  try{
    const token=(request.headers.get("authorization")||"").replace(/^Bearer\\s+/i,"");
    const parts=token.split(".");
    if(parts.length!==3)return false;
    const header=JSON.parse(Buffer.from(parts[0],"base64url").toString("utf8"));
    const claims=JSON.parse(Buffer.from(parts[1],"base64url").toString("utf8"));
    if(header.alg!=="RS256"||typeof header.kid!=="string")return false;
    if(claims.iss!=="https://token.actions.githubusercontent.com")return false;
    const audiences=Array.isArray(claims.aud)?claims.aud:[claims.aud];
    if(!audiences.includes("https://app.khalam.app"))return false;
    const now=Math.floor(Date.now()/1000);
    if(!Number.isFinite(claims.exp)||claims.exp<now||claims.nbf>now)return false;
    if(claims.repository!=="lamicisse33-dotcom/dydy"||
       claims.repository_id!=="1375115286"||
       claims.ref!=="refs/heads/wolof-local"||
       claims.workflow_ref!==ALLOWED_WORKFLOW||
       claims.event_name!=="push"||
       claims.actor_id!=="297633268")return false;
    if(!jwksCache||jwksCache.until<Date.now()){
      const response=await fetch("https://token.actions.githubusercontent.com/.well-known/jwks",{cache:"no-store",signal:AbortSignal.timeout(8000)});
      if(!response.ok)return false;
      const doc=await response.json() as {keys?:Array<Record<string,unknown>>};
      if(!Array.isArray(doc.keys))return false;
      jwksCache={keys:doc.keys,until:Date.now()+3600000};
    }
    const jwk=jwksCache.keys.find(k=>k.kid===header.kid);
    if(!jwk)return false;
    const publicKey=createPublicKey({key:jwk as JsonWebKey,format:"jwk"});
    return verify("RSA-SHA256",Buffer.from(parts[0]+"."+parts[1]),publicKey,Buffer.from(parts[2],"base64url"));
  }catch{return false;}
}

const hash=(bytes:Uint8Array)=>createHash("sha256").update(bytes).digest("hex");
const ok=(body:unknown,status=200)=>Response.json(body,{status});
const nonCache={"cache-control":"private, no-store"};

async function currentManifest(){
  const pointer=await lireObjetMemoire(BUCKET_PREFIX+"current.json");
  if(!pointer)return null;
  const current=await pointer.json() as {sha256?:string};
  if(!current.sha256||!/^[a-f0-9]{64}$/.test(current.sha256))return null;
  const stored=await lireObjetMemoire(BUCKET_PREFIX+current.sha256+"/manifest.json");
  return stored?await stored.json() as {sha256:string;bytes:number;partSize:number;parts:string[]}:null;
}

export async function GET(request:Request){
  const verdict=verifierCode(request.headers.get("x-bia-code"),false);
  if(!verdict.ok)return new Response(null,{status:401});
  try{
    const manifest=await currentManifest();
    if(!manifest)return new Response(null,{status:503,headers:nonCache});
    const prefix=BUCKET_PREFIX+manifest.sha256+"/";
    const query=new URL(request.url).searchParams;
    const meta=query.get("meta");
    if(meta==="manifest"||meta==="config"){
      const item=await lireObjetMemoire(prefix+(meta==="manifest"?"manifest.json":"config.json"));
      return item?new Response(item.body,{headers:{"content-type":"application/json",...nonCache}}):new Response(null,{status:503});
    }
    const text=query.get("part");
    if(text===null||!/^\\d+$/.test(text)||Number(text)>=manifest.parts.length)return new Response(null,{status:400});
    const index=Number(text),item=await lireObjetMemoire(prefix+index+".bin");
    if(!item)return new Response(null,{status:503});
    return new Response(item.body,{headers:{"content-type":"application/octet-stream","cache-control":"private, no-store","x-khalam-sha256":manifest.parts[index]}});
  }catch{return new Response(null,{status:503});}
}

export async function POST(request:Request){
  if(!await verifierJetonGitHub(request))return new Response(null,{status:401});
  if(!lexiqueConfig.actif)return ok({error:"BIA storage is not configured"},503);
  const query=new URL(request.url).searchParams;
  const mode=query.get("mode"),sha=query.get("sha256")||"";
  if(!/^[a-f0-9]{64}$/.test(sha))return ok({error:"invalid model hash"},400);
  try{await assurerMemoire();}catch{return ok({error:"private model storage unavailable"},503);}
  const prefix=BUCKET_PREFIX+sha+"/";
  if(mode==="part"){
    const rawIndex=query.get("index")||"";
    if(!/^\\d+$/.test(rawIndex))return ok({error:"invalid part index"},400);
    const bytes=new Uint8Array(await request.arrayBuffer());
    if(bytes.length<1||bytes.length>PART_SIZE||request.headers.get("content-length")&&Number(request.headers.get("content-length"))>PART_SIZE)return ok({error:"invalid part size"},413);
    const digest=hash(bytes);
    if(request.headers.get("x-chunk-sha256")!==digest)return ok({error:"chunk hash mismatch"},422);
    try{await ecrireObjetMemoire(prefix+Number(rawIndex)+".bin",bytes,"application/octet-stream",true);}
    catch{return ok({error:"chunk upload failed"},503);}
    return ok({index:Number(rawIndex),bytes:bytes.length,sha256:digest});
  }
  if(mode!=="commit")return ok({error:"unknown transfer mode"},400);
  let body:{manifest?:Record<string,unknown>;config?:Record<string,unknown>};
  try{body=await request.json();}catch{return ok({error:"invalid JSON"},400);}
  const manifest=body.manifest,config=body.config;
  const bytes=Number(manifest?.bytes),partSize=Number(manifest?.partSize),parts=manifest?.parts;
  if(!manifest||manifest.sha256!==sha||!Number.isSafeInteger(bytes)||bytes<1||bytes>100_000_000||
     partSize!==PART_SIZE||!Array.isArray(parts)||parts.length!==Math.ceil(bytes/PART_SIZE)||
     parts.some(x=>typeof x!=="string"||!/^[a-f0-9]{64}$/.test(x)))return ok({error:"invalid manifest"},400);
  const audio=config?.audio as {sample_rate?:unknown}|undefined;
  if(!config||config.phoneme_type!=="text"||config.num_speakers!==1||
     audio?.sample_rate!==22050||config.default_speaker_id!==0||
     !config.phoneme_id_map||typeof config.phoneme_id_map!=="object")return ok({error:"invalid Piper configuration"},400);
  const combined=createHash("sha256");
  let total=0;
  for(let i=0;i<parts.length;i++){
    const item=await lireObjetMemoire(prefix+i+".bin");
    if(!item)return ok({error:"missing model chunk",index:i},409);
    const chunk=new Uint8Array(await item.arrayBuffer());
    const expectedLength=Math.min(PART_SIZE,bytes-i*PART_SIZE);
    if(hash(chunk)!==parts[i]||chunk.length!==expectedLength)return ok({error:"stored chunk verification failed",index:i},422);
    total+=chunk.length;combined.update(chunk);
  }
  if(total!==bytes||combined.digest("hex")!==sha)return ok({error:"full model verification failed"},422);
  try{
    await ecrireObjetMemoire(prefix+"manifest.json",JSON.stringify(manifest),"application/json",true);
    await ecrireObjetMemoire(prefix+"config.json",JSON.stringify(config),"application/json",true);
    await ecrireObjetMemoire(BUCKET_PREFIX+"current.json",JSON.stringify({sha256:sha,revision:manifest.revision}),"application/json",true);
  }catch{return ok({error:"model metadata commit failed"},503);}
  return ok({revision:manifest.revision,bytes,sha256:sha,verified:true});
}
