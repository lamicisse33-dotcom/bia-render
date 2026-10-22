import {verifierCode} from '@/lib/codes';
import {noterEssaiStreaming,resumeStreamingIsole,prisesStreamingIsole} from '@/lib/essai-streaming-isole';
function maitre(r:Request){const v=verifierCode(r.headers.get('x-bia-code'),false);return v.ok&&v.maitre;}
export async function GET(r:Request){if(!maitre(r))return Response.json({erreur:'Code maître requis'},{status:401});return Response.json(new URL(r.url).searchParams.get('prises')==='1'?prisesStreamingIsole():resumeStreamingIsole(),{headers:{'cache-control':'no-store'}});}
export async function POST(r:Request){if(!maitre(r))return Response.json({erreur:'Code maître requis'},{status:401});const text=await r.text();if(text.length>32768)return Response.json({erreur:'taille'},{status:413});let d;try{d=JSON.parse(text);}catch{}return Response.json({ok:noterEssaiStreaming(d)});}
