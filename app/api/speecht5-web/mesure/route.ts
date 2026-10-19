import {noterSpeechT5} from '@/lib/speecht5-etat';
export async function POST(r:Request){
 const origin=r.headers.get('origin');if(origin&&origin!==new URL(r.url).origin)return new Response(null,{status:403});
 const d=await r.json().catch(()=>({}));noterSpeechT5(d.etape,d.ms);return new Response(null,{status:204});
}
