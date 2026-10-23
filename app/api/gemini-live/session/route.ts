import {resumeGeminiLive} from '@/lib/gemini-live-diagnostic';
import {NextRequest,NextResponse} from 'next/server';
import {createHash} from 'node:crypto';
import {verifierCode} from '@/lib/codes';
import {contexteInstructions} from '@/lib/instructions-apprentissage';
import {BIA_LIVE_CONSIGNES_BASE,BIA_LIVE_LANGUES} from '@/lib/gemini-live-prompt';
export const runtime='nodejs';
export const dynamic='force-dynamic';
const sessions=new Map<string,number[]>();
const headers={'cache-control':'no-store'};
const cle=()=>process.env.GEMINI_API_KEY||process.env.GOOGLE_API_KEY||'';
export async function GET(){return NextResponse.json({configure:Boolean(cle()),modele:process.env.GEMINI_LIVE_MODEL||'gemini-3.8-live',langues_autorisees:['fr','wo'],consignes_base:{empreinte_sha256:createHash('sha256').update(BIA_LIVE_CONSIGNES_BASE).digest('hex'),sources:['identite_et_personnalite_bia','relations','comprehension_conversation','consigne_maitre'],instructions_apprises:true},diagnostic:resumeGeminiLive()},{headers});}
export async function POST(req:NextRequest){
 const acces=verifierCode(req.headers.get('x-bia-code'),false);
 if(!acces.ok)return NextResponse.json({erreur:'Code d’accès refusé.'},{status:401,headers});
 if(!acces.maitre)return NextResponse.json({erreur:'Ce premier branchement est réservé au code maître.'},{status:403,headers});
 // Render can expose an internal nextUrl origin behind its HTTPS reverse proxy.
 const origine=req.headers.get('origin');
 if(origine&&origine!==req.nextUrl.origin&&origine!=='https://app.khalam.app')return NextResponse.json({erreur:'Origine refusée.'},{status:403,headers});
 if(!cle())return NextResponse.json({erreur:'La clé Gemini doit être configurée sur le serveur.',motif:'cle_absente'},{status:503,headers});
 const id=createHash('sha256').update(req.headers.get('x-bia-code')||'').digest('hex'),now=Date.now();
 for(const [k,v] of sessions)if(!v.some(t=>now-t<60000))sessions.delete(k);
 const recent=(sessions.get(id)||[]).filter(t=>now-t<60000);
 if(recent.length>=6)return NextResponse.json({erreur:'Trop de connexions rapprochées. Réessaie dans une minute.'},{status:429,headers});
 sessions.set(id,[...recent,now]);
 let instructions:string;
 try{instructions=await contexteInstructions();}catch{return NextResponse.json({erreur:'Les consignes apprises sont momentanément inaccessibles.'},{status:503,headers});}
 const setup={
  model:'models/'+(process.env.GEMINI_LIVE_MODEL||'gemini-3.8-live').replace(/^models\//,''),
  generationConfig:{responseModalities:['AUDIO'],maxOutputTokens:512,speechConfig:{voiceConfig:{prebuiltVoiceConfig:{voiceName:'Kore'}}}},
  systemInstruction:{parts:[{text:BIA_LIVE_LANGUES+'\n\n'+BIA_LIVE_CONSIGNES_BASE+'\n'+instructions+'\nMODE VOCAL DIRECT : parle uniquement en français ou en wolof urbain de Dakar selon la langue de papa. Privilégie une réponse naturelle et concise, puis écoute. Les consignes de base et les formulations exactes apprises priment sur la concision. Ne coupe jamais la parole. Ne récite pas les prix des devoirs sans demande explicite. Tu appelles le maître papa au début de ta réponse de conversation, sans ajouter papa aux phrases exactes à répéter. Ne lis jamais les balises techniques à voix haute : dans ce mode, exprime les émotions naturellement dans la voix. Les anciennes commandes d’écran ne sont pas exécutées dans ce mode : ne prétends pas avoir effectué une action. Consulte chercher_connaissances pour les leçons et corrections mémorisées pertinentes. Ne prétends jamais avoir enregistré un nouvel apprentissage : renvoie vers le mode habituel pour cela.'+'\n\n'+BIA_LIVE_LANGUES}]},
  inputAudioTranscription:{},outputAudioTranscription:{},
  realtimeInputConfig:{automaticActivityDetection:{startOfSpeechSensitivity:'START_SENSITIVITY_HIGH',endOfSpeechSensitivity:'END_SENSITIVITY_LOW',prefixPaddingMs:150,silenceDurationMs:500},activityHandling:'START_OF_ACTIVITY_INTERRUPTS'},
  contextWindowCompression:{triggerTokens:'18000',slidingWindow:{targetTokens:'9000'}},
  sessionResumption:{},historyConfig:{initialHistoryInClientContent:true},
  tools:[{functionDeclarations:[{name:'chercher_connaissances',description:'Consulter les leçons et formulations wolof apprises par Bia pour répondre à une question pertinente.',parameters:{type:'OBJECT',properties:{question:{type:'STRING'}},required:['question']}}]}]
 };
 try{
  const r=await fetch('https://generativelanguage.googleapis.com/v1beta/auth_tokens',{method:'POST',headers:{'x-goog-api-key':cle(),'Content-Type':'application/json'},body:JSON.stringify({uses:1,expireTime:new Date(now+10*60000).toISOString(),newSessionExpireTime:new Date(now+60000).toISOString(),bidiGenerateContentSetup:setup}),signal:AbortSignal.timeout(15000)});
  if(!r.ok){let motif='refus_google';try{const e=await r.json();motif=String(e.error?.message||e.error?.status||motif).split(cle()).join('[cle masquee]').slice(0,180);}catch{}return NextResponse.json({erreur:'Google refuse actuellement la connexion Live.',statut_fournisseur:r.status,motif},{status:502,headers});}
  const data=await r.json();
  if(typeof data.name!=='string')throw Error('jeton absent');
  return NextResponse.json({token:data.name,setup,expireTime:new Date(now+10*60000).toISOString()},{headers});
 }catch{return NextResponse.json({erreur:'La connexion à Gemini Live a échoué.'},{status:502,headers});}
}
