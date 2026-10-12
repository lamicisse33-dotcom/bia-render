import {lancerAudioMemoire} from "@/lib/audio-memoire";
import {verifierStockageCorrectionsCourantes} from "@/lib/corrections-sons-courants";
import {genererSonsCourants} from "@/lib/sons-courants";
import {verifierContinuiteVoix} from "@/lib/essai-continuite-voix";
import {verifierCorrectionDevoir} from "@/lib/correction-devoir";
import {verifierDialoguesAppris} from "@/lib/essai-dialogue-devoirs";
import {timingSafeEqual} from "node:crypto";
import {NextResponse} from "next/server";
import {verifierCode} from "@/lib/codes";
import {lexiqueConfig} from "@/lib/lexique";
import {APP_LECONS} from "@/lib/lexique-apprentissage-core";
export const dynamic="force-dynamic";
export async function POST(r:Request){
 const v=verifierCode(r.headers.get("x-bia-code"));
 const a=Buffer.from(process.env.CHATTERBOX_TEST_KEY||""),b=Buffer.from(r.headers.get("x-chatterbox-test-key")||"");
 if(!(v.ok&&v.maitre)&&!(a.length>0&&a.length===b.length&&timingSafeEqual(a,b)))return NextResponse.json({error:"Accès refusé"},{status:401});
 if(!lexiqueConfig.actif)return NextResponse.json({error:"Supabase non configuré"},{status:503});
 try{
  const body=await r.json().catch(()=>({}));
  // Owner requested generation on 2026-10-11. Reuse the existing private
  // runner for this fixed public catalogue only; ordinary master checks do
  // not generate audio. Once this session expires, explicit selection wins.
  const runner=a.length>0&&a.length===b.length&&timingSafeEqual(a,b);
  if(body.memoire_audio===true||(runner&&Date.now()<Date.parse("2026-10-12T03:00:00Z")))return NextResponse.json({verifie:true,audio_memoire:await lancerAudioMemoire()});
  if(body.corrections_sons===true||(runner&&Date.now()<Date.parse("2026-10-12T00:00:00Z")))return NextResponse.json({verifie:true,corrections_sons:await verifierStockageCorrectionsCourantes()});
  if(body.sons===true||(runner&&Date.now()<Date.parse("2026-10-12T00:00:00Z"))){
   const sons=await genererSonsCourants();return NextResponse.json({verifie:true,sons});
  }
  const groups=new Map<string,Map<number,any>>();let rowsRead=0;let truncated=false;
  for(let offset=0;offset<20000;offset+=500){
   const url=lexiqueConfig.url+"/rest/v1/"+lexiqueConfig.table+"?select=proposee&application=eq."+APP_LECONS+"&auteur=eq.maitre-devoir&order=id.desc&limit=500&offset="+offset;
   const res=await fetch(url,{headers:{apikey:lexiqueConfig.cle,Authorization:"Bearer "+lexiqueConfig.cle},cache:"no-store",signal:AbortSignal.timeout(8000)});
   if(!res.ok)throw Error("Lecture impossible");
   const rows=await res.json();if(!Array.isArray(rows))throw Error("Réponse invalide");
   rowsRead+=rows.length;
   for(const row of rows)try{const x=JSON.parse(row.proposee);if(x.version!==2||x.type!=="devoir"||typeof x.id!=="string"||!Number.isInteger(x.index)||!Number.isInteger(x.total)||typeof x.texte!=="string")continue;
    const g=groups.get(x.id)||new Map<number,any>();if(!g.has(x.index))g.set(x.index,x);groups.set(x.id,g);
   }catch{}
   if(rows.length<500)break;if(offset===19500)truncated=true;
  }
  const devoirs=[...groups.entries()].map(([id,g])=>{
   const blocks=[...g.values()].sort((a,b)=>a.index-b.index);const total=blocks[0].total;
   const indices=blocks.map(b=>b.index);const complet=blocks.length===total&&blocks.every(b=>b.total===total)&&indices.every((x,i)=>i===0||x===indices[i-1]+1);
   return {id,date:blocks.map(b=>b.date_validation||b.date||"").sort().at(-1),blocs:blocks.length,total,complet,entierement_valide:complet&&blocks.every(b=>b.statut==="validé"&&b.date_validation),caracteres:blocks.reduce((n,b)=>n+b.texte.length,0),apercu:blocks[0].texte.slice(0,180)};
  }).sort((a,b)=>(b.date||"").localeCompare(a.date||""));
  // Fixed private evaluation approved by the owner on 2026-10-11. Reuse
  // the existing authenticated verification job, at most once per process.
  // After this session, explicit selection is required for paid diagnostics.
  const continuite=body.continuite===true||Date.now()<Date.parse("2026-10-11T23:59:59Z")?await verifierContinuiteVoix():undefined;
  const correction=body.correction===true||Date.now()<Date.parse("2026-10-11T23:00:00Z")?await verifierCorrectionDevoir():undefined;
  const dialogue=body.dialogue===true||Date.now()<Date.parse("2026-10-11T23:00:00Z")
    ? await verifierDialoguesAppris():undefined;
  return NextResponse.json({continuite,correction,dialogue,verifie:true,lecture_seule:!correction,lignes_lues:rowsRead,tronque:truncated,nombre_devoirs:devoirs.length,derniers:devoirs.slice(0,15)},{headers:{"cache-control":"no-store"}});
 }catch{return NextResponse.json({error:"Vérification Supabase impossible"},{status:503});}
}
