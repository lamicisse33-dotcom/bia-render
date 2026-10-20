import {verifierCode} from '@/lib/codes';
import {preparerBrique} from '@/lib/briques-reponse';
export async function POST(r:Request){
 const code=r.headers.get('x-bia-code')||'',v=verifierCode(code,false);
 if(!v.ok)return new Response(null,{status:401});
 try{const text=await r.text();if(text.length>50000)return new Response(null,{status:413});
  const body=JSON.parse(text);
  if(body.flux===true&&!body.action){
   const abort=new AbortController(),signal=AbortSignal.any([r.signal,abort.signal,AbortSignal.timeout(35000)]),encoder=new TextEncoder();
   const stream=new ReadableStream<Uint8Array>({
    async start(controller){
     const envoyer=(d:unknown)=>{signal.throwIfAborted();controller.enqueue(encoder.encode(JSON.stringify(d)+'\n'));};
     let annonce=false;
     try{
      const preparation=await preparerBrique(body,code,v.maitre,signal,undefined,{
       debut:b=>{annonce=true;envoyer({type:'brique',brique:b});},
       morceau:d=>envoyer({type:'morceau',...d}),
      });
      const bilan=preparation&&annonce?{...preparation,brique:undefined}:preparation;
      envoyer({type:'resultat',preparation:bilan});controller.close();
     }catch{try{controller.enqueue(encoder.encode(JSON.stringify({type:'erreur',message:'Audio interrompu'})+'\n'));controller.close();}catch{}}
    },
    cancel(){abort.abort();},
   });
   return new Response(stream,{headers:{'content-type':'application/x-ndjson','cache-control':'private, no-store, no-transform','x-accel-buffering':'no'}});
  }
  const preparation=await preparerBrique(body,code,v.maitre,AbortSignal.any([r.signal,AbortSignal.timeout(35000)]));
  return Response.json({preparation},{headers:{'cache-control':'private, no-store'}});
 }catch{return Response.json({preparation:null},{status:503});}
}

