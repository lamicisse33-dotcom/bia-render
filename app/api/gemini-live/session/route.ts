import {NextRequest,NextResponse} from 'next/server';
import {createHash} from 'node:crypto';
import {verifierCode} from '@/lib/codes';
import {contexteInstructions} from '@/lib/instructions-apprentissage';
import {BIA_LIVE_SYSTEM} from '@/lib/gemini-live-prompt';
export const runtime='nodejs';
export const dynamic='force-dynamic';
const sessions=new Map<string,number[]>();
const headers={'cache-control':'no-store'};
const cle=()=>process.env.GEMINI_API_KEY||process.env.GOOGLE_API_KEY||'';
export async function GET(){return NextResponse.json({configure:Boolean(cle()),modele:process.env.GEMINI_LIVE_MODEL||'gemini-3.8-live'},{headers});}
export async function POST(req:NextRequest){
 const acces=verifierCode(req.headers.get('x-bia-code'),false);
 if(!acces.ok)return NextResponse.json({erreur:'Code d’accès refusé.'},{status:401,headers});
 if(!acces.maitre)return NextResponse.json({erreur:'Ce premier branchement est réservé au code maître.'},{status:403,headers});
 if(req.headers.get('origin')&&req.headers.get('origin')!==req.nextUrl.origin)return NextResponse.json({erreur:'Origine refusée.'},{status:403,headers});
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
  systemInstruction:{parts:[{text:BIA_LIVE_SYSTEM+'\n'+instructions+'\nMODE VOCAL DIRECT : parle uniquement en français ou en wolof urbain de Dakar selon la langue de papa. Une ou deux phrases naturelles, puis écoute. Ne coupe jamais la parole. Ne récite pas les prix des devoirs sans demande explicite. Tu appelles le maître papa. Les anciennes commandes d’écran ne sont pas exécutées dans ce mode : ne prétends pas avoir effectué une action. Consulte chercher_connaissances pour les leçons et corrections mémorisées pertinentes. Ne prétends jamais avoir enregistré un nouvel apprentissage : renvoie vers le mode habituel pour cela.'}]},
  inputAudioTranscription:{},outputAudioTranscription:{},
  realtimeInputConfig:{automaticActivityDetection:{startOfSpeechSensitivity:'START_SENSITIVITY_HIGH',endOfSpeechSensitivity:'END_SENSITIVITY_LOW',prefixPaddingMs:150,silenceDurationMs:500},activityHandling:'START_OF_ACTIVITY_INTERRUPTS'},
  contextWindowCompression:{triggerTokens:'18000',slidingWindow:{targetTokens:'9000'}},
  sessionResumption:{},historyConfig:{initialHistoryInClientContent:true},
  tools:[{functionDeclarations:[{name:'chercher_connaissances',description:'Consulter les leçons et formulations wolof apprises par Bia pour répondre à une question pertinente.',parameters:{type:'OBJECT',properties:{question:{type:'STRING'}},required:['question']}}]}]
 };
 try{
  const r=await fetch('https://generativelanguage.googleapis.com/v1beta/auth_tokens',{method:'POST',headers:{'x-goog-api-key':cle(),'Content-Type':'application/json'},body:JSON.stringify({uses:1,expireTime:new Date(now+10*60000).toISOString(),newSessionExpireTime:new Date(now+60000).toISOString(),bidiGenerateContentSetup:setup}),signal:AbortSignal.timeout(15000)});
  if(!r.ok)return NextResponse.json({erreur:'Google refuse actuellement la connexion Live.',statut_fournisseur:r.status},{status:502,headers});
  const data=await r.json();
  if(typeof data.name!=='string')throw Error('jeton absent');
  return NextResponse.json({token:data.name,setup,expireTime:new Date(now+10*60000).toISOString()},{headers});
 }catch{return NextResponse.json({erreur:'La connexion à Gemini Live a échoué.'},{status:502,headers});}
}
