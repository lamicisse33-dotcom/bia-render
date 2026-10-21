import {verifierCode} from '@/lib/codes';
import {resumeEssaiGPT,lancerEssaiGPT,annulerEssaiGPT} from '@/lib/essai-gpt';
export const runtime='nodejs';
export const dynamic='force-dynamic';
function maitre(r:Request){const v=verifierCode(r.headers.get('x-bia-code'),false);return v.ok&&v.maitre;}
export async function GET(r:Request){if(!maitre(r))return Response.json({erreur:'Code maître requis'},{status:401});return Response.json(resumeEssaiGPT(true),{headers:{'cache-control':'no-store'}});}
export async function POST(r:Request){
 if(!maitre(r))return Response.json({erreur:'Code maître requis'},{status:401});
 const raw=await r.text();if(raw.length>256)return Response.json({erreur:'Requête trop longue'},{status:413});
 let b;try{b=JSON.parse(raw);}catch{return Response.json({erreur:'Requête invalide'},{status:400});}
 if(!b||Object.keys(b).some(k=>!['action','effort'].includes(k))||!['lancer','arreter'].includes(b.action)||b.effort!==undefined&&!['low','medium'].includes(b.effort))return Response.json({erreur:'Essai fixe uniquement'},{status:400});
 if(b.action==='arreter')annulerEssaiGPT();else void lancerEssaiGPT(b.effort||'low');
 return Response.json(resumeEssaiGPT(true),{headers:{'cache-control':'no-store'}});
}
