import {detecterLangue} from "@/lib/langue";
import {NextRequest,NextResponse} from "next/server";
import {timingSafeEqual} from "node:crypto";
import {verifierCode} from "@/lib/codes";
import {decouperVoixKhalam} from "@/lib/decoupage-voix-khalam";
import {texteKhalamVoix} from "@/lib/texte-khalam-voix";
import {prononciationsApprises} from "@/lib/lexique-apprentissage";
import {noterChatterboxTest} from "@/lib/chatterbox-test-etat";
import {segmentsLecture} from "@/lib/lecture-continue";
export const dynamic="force-dynamic";
export const runtime="nodejs";
export const maxDuration=100;
const FRENCH_SHA="b1237586127ce98e7800a68e49938eb5092846862aabcb6e17b2fda7889a6c75";
const SHA="8320e6788427029dcaf7aeea8e54124f172dd7cdd12d7fcf658cf616c0c21e9f";
export async function POST(request:NextRequest){
 const secret=process.env.CHATTERBOX_TEST_KEY||"";
 const supplied=request.headers.get("x-chatterbox-test-key")||"";
 const internal=Boolean(secret&&supplied&&Buffer.byteLength(secret)===Buffer.byteLength(supplied)&&timingSafeEqual(Buffer.from(secret),Buffer.from(supplied)));
 const verdict=verifierCode(request.headers.get("x-bia-code"));
 if(!internal&&!verdict.ok)return NextResponse.json({error:"Code d’accès refusé"},{status:401});
 const body=await request.json().catch(()=>null);
 const partie=Number(body?.partie??0);
 if(typeof body?.texte!=="string"||!body.texte.trim()||body.texte.length>20000||!Number.isSafeInteger(partie)||partie<0||!['male','female'].includes(body?.voice))return NextResponse.json({error:"Texte ou voix invalide"},{status:400});
 const url=(process.env.CHATTERBOX_TEST_URL||"").replace(/\/$/,"");
 if(!url||!secret)return NextResponse.json({error:"Streaming indisponible"},{status:503});
 const start=Date.now();const language=body.langue==="fr"||body.langue==="wo"?body.langue:detecterLangue(body.texte);
 let parts:string[];
 if(body.lecture===true&&body.texte.length>500)return NextResponse.json({error:"Segment trop long"},{status:400});
 try{const text=await prononciationsApprises(texteKhalamVoix(body.texte),language);parts=body.lecture===true?segmentsLecture(text):decouperVoixKhalam(text);}
 catch{return NextResponse.json({error:"Le lexique n’a pas répondu"},{status:503});}
 if(partie>=parts.length)return NextResponse.json({parties:parts.length,partie,audio:null});
 const abort=new AbortController();const deadline=setTimeout(()=>abort.abort(),90000);
 const cancel=()=>abort.abort();request.signal.addEventListener("abort",cancel,{once:true});
 let upstream:Response;
 try{upstream=await fetch(`${url}/tts/stream`,{method:"POST",cache:"no-store",signal:abort.signal,
  headers:{"content-type":"application/json","x-khalam-key":secret},
  body:JSON.stringify({input:{text:parts[partie],voice:body.voice,language,language_id:"fr",temperature:language==="fr"?.3:.4,
   ...(language==="fr"?{exaggeration:.25,cfg_weight:.7}:{})}})});}
 catch{clearTimeout(deadline);request.signal.removeEventListener("abort",cancel);return NextResponse.json({error:"Connexion au streaming interrompue"},{status:502});}
 if(!upstream.ok||!upstream.body){clearTimeout(deadline);request.signal.removeEventListener("abort",cancel);abort.abort();return NextResponse.json({error:"Streaming indisponible"},{status:[404,501,429].includes(upstream.status)?upstream.status:502});}
 const reader=upstream.body.getReader();const decoder=new TextDecoder();const encoder=new TextEncoder();let buffer="",finished=false,sequence=0,samples=0,hasMeta=false;
 const cleanup=()=>{clearTimeout(deadline);request.signal.removeEventListener("abort",cancel);};
 const stream=new ReadableStream<Uint8Array>({
  async start(controller){
   const emit=(d:any)=>controller.enqueue(encoder.encode(JSON.stringify(d)+"\n"));
   try{
    for(;;){
     const r=await reader.read();if(r.done)break;buffer+=decoder.decode(r.value,{stream:true});
     if(buffer.length>2_000_000)throw Error("Paquet vocal trop grand");
     let cut;while((cut=buffer.indexOf("\n"))>=0){const line=buffer.slice(0,cut);buffer=buffer.slice(cut+1);if(!line.trim())continue;const d=JSON.parse(line);
      if(d.type==="meta"){if(hasMeta||d.checkpoint_sha256!==(language==="fr"?FRENCH_SHA:SHA)||d.voice!==body.voice||d.sample_rate!==24000)throw Error("Moteur vocal incorrect");hasMeta=true;emit({...d,parties:parts.length,partie,preparation_ms:Date.now()-start});}
      else if(d.type==="audio"){if(!hasMeta||d.sequence!==sequence||d.offset_samples!==samples||!Number.isSafeInteger(d.samples)||d.samples<=0||typeof d.audio_base64!=="string")throw Error("Morceau vocal incomplet");sequence++;samples+=d.samples;emit(d);}
      else if(d.type==="end"){if(!hasMeta||d.packets!==sequence||d.samples!==samples||!sequence)throw Error("Lecture vocale incomplète");finished=true;noterChatterboxTest(body.voice,{ok:true,generationMs:d.generation_ms});emit(d);}
      else throw Error(d.error||"Streaming vocal interrompu");
     }
    }
    if(!finished)throw Error("Streaming interrompu avant la fin");controller.close();
   }catch(error){noterChatterboxTest(body.voice,{ok:false,code:"STREAM_INTERRUPTED"});
    try{if(abort.signal.aborted)controller.error(error);else{emit({type:"error",error:(error as Error).message});controller.close();}}catch{}
   }
   finally{cleanup();abort.abort();void reader.cancel().catch(()=>{});}
  },
  cancel(){cleanup();abort.abort();return reader.cancel();}
 });
 return new Response(stream,{headers:{"content-type":"application/x-ndjson; charset=utf-8","cache-control":"no-store, no-transform","x-accel-buffering":"no"}});
}
