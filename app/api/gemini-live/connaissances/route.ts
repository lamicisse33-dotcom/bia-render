import {NextRequest,NextResponse} from 'next/server';
import {verifierCode} from '@/lib/codes';
import {contexteDevoirs,devoirsALire} from '@/lib/devoirs-apprentissage';
import {contexteMaitrises} from '@/lib/dialogue-devoirs';
import {correctionExacte,exemplesPour,motsCorriges,toutes,lectureLexique,lexiqueConfig} from '@/lib/lexique';
import {contexteInstructions} from '@/lib/instructions-apprentissage';
import {noterOutilConnaissances} from '@/lib/outil-connaissances-etat';
export const runtime='nodejs';
const headers={'cache-control':'no-store'};
const instruction='Les devoirs et le lexique enseignent une façon de parler, pas les faits actuels sur papa. Respecte les corrections exactes et les consignes apprises. Ne récite aucun prix de leçon sans demande explicite. Un devoir non validé peut être consulté pour correction, mais ne doit pas être présenté comme une formulation déjà validée. Ces outils ne modifient aucune donnée.';
export async function POST(req:NextRequest){
 const acces=verifierCode(req.headers.get('x-bia-code'),false);
 if(!acces.ok){noterOutilConnaissances({refus:true});return NextResponse.json({erreur:'Accès refusé.'},{status:401,headers});}
 /* Khalam Rapide est ouverte à tous depuis le 23 octobre 2026. La frontière
    reste celle de app/api/chat/route.ts : les devoirs et le lexique enseignent
    une façon de parler et valent pour tout le monde ; les instructions
    pédagogiques de Lamine, ses maîtrises et ses brouillons non validés ne
    sortent que pour son code. */
 const maitre=acces.maitre;
 const debutOutil=Date.now();
 try{
  if(Number(req.headers.get('content-length')||0)>12000)return NextResponse.json({erreur:'Demande trop longue.'},{status:413,headers});
  const body=await req.json(),question=String(body.question||'').slice(0,2000),action=body.action||'chercher';
  if(!['chercher','lister_devoirs','lire_devoir','lister_lexique'].includes(action))return NextResponse.json({erreur:'Action inconnue.'},{status:400,headers});
  const offset=body.offset??0;
  if(!Number.isSafeInteger(offset)||offset<0)return NextResponse.json({erreur:'Position invalide.'},{status:400,headers});
  if(action==='lister_devoirs'||action==='lire_devoir'){
   const {devoirs:tous,incomplets}=await devoirsALire();
   const devoirs=maitre?tous:tous.filter(d=>d.valide);
   if(action==='lister_devoirs'){noterOutilConnaissances({action,lignes:Math.min(25,Math.max(0,devoirs.length-offset)),ms:Date.now()-debutOutil});return NextResponse.json({devoirs:devoirs.slice(offset,offset+25).map(d=>({id:d.id,titre:d.texte.split('\n').find(l=>l.trim())?.slice(0,180)||'Devoir',valide:d.valide,langue:d.langue,caracteres:d.texte.length})),total:devoirs.length,incomplets,suivant:offset+25<devoirs.length?offset+25:null,instruction},{headers});}
   const devoir=devoirs.find(d=>d.id===body.devoir_id);
   if(!devoir){noterOutilConnaissances({action,lignes:0,ms:Date.now()-debutOutil});return NextResponse.json({erreur:'Devoir introuvable.'},{status:404,headers});}
   noterOutilConnaissances({action,lignes:1,ms:Date.now()-debutOutil});
   return NextResponse.json({devoir:{id:devoir.id,valide:devoir.valide,langue:devoir.langue,texte:devoir.texte.slice(offset,offset+8000),total_caracteres:devoir.texte.length},suivant:offset+8000<devoir.texte.length?offset+8000:null,instruction},{headers});
  }
  if(!lexiqueConfig.actif)throw Error('Supabase absent');
  if(action==='lister_lexique'){
   const entrees=await toutes();if(lectureLexique().motif)throw Error('Lecture incomplète');
   noterOutilConnaissances({action,lignes:Math.min(10,Math.max(0,entrees.length-offset)),ms:Date.now()-debutOutil});
   return NextResponse.json({lexique:entrees.slice(offset,offset+10).map(e=>({source:e.source,corrigee:e.corrigee,langue:e.langue})),total:entrees.length,suivant:offset+10<entrees.length?offset+10:null,instruction},{headers});
  }
  if(!question.trim()){noterOutilConnaissances({action,lignes:0,ms:Date.now()-debutOutil});return NextResponse.json({erreur:'Question manquante.'},{status:400,headers});}
  const historique=Array.isArray(body.historique)?body.historique.slice(-12).filter((m:unknown)=>m&&typeof m==='object'&&'role' in m&&'text' in m).map((m:{role:unknown;text:unknown})=>({role:m.role==='bia'?'bia':'user',text:String(m.text).slice(0,1500)})):[];
  const [devoirs,maitrises,exacte,exemples,mots,instructions,entrees]=await Promise.all([contexteDevoirs(question,historique),maitre?contexteMaitrises(question,historique,5000):Promise.resolve(''),correctionExacte(question),exemplesPour(question,8),motsCorriges(),maitre?contexteInstructions():Promise.resolve(''),toutes()]);
  if(lectureLexique().motif)throw Error('Lecture incomplète');
  noterOutilConnaissances({action,ms:Date.now()-debutOutil,
    lignes:exemples.length+mots.length+(exacte?1:0)+(devoirs?1:0)+(maitrises?1:0)+(instructions?1:0)});
  return NextResponse.json({contexte:{correction_exacte:exacte?{source:exacte.source,corrigee:exacte.corrigee}:null,lexique:exemples.map(e=>({source:e.source,corrigee:e.corrigee,langue:e.langue})),mots_corriges:mots,devoirs,maitrises,instructions},acces:{lexique_entrees:entrees.length,references_lexique:exemples.length,correction_exacte:Boolean(exacte),mots_corriges:mots.length,devoirs_transmis:Boolean(devoirs),maitrises_transmises:Boolean(maitrises),instructions_chargees:Boolean(instructions)},instruction},{headers});
 }catch{return NextResponse.json({erreur:'Les connaissances sont momentanément inaccessibles.'},{status:503,headers});}
}
