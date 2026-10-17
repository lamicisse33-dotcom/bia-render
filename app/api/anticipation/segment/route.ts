import {noterSegmentAnticipe} from '@/lib/anticipation-etat';
import {NextRequest} from 'next/server';
import {verifierCode} from '@/lib/codes';
import {POST as ecouter} from '../../ecouter/route';
import {gpuAnticipation} from '@/lib/anticipation-gpu';
export async function POST(r:NextRequest){if(!verifierCode(r.headers.get('x-bia-code'),false).ok)return new Response(null,{status:401});const debut=Date.now();try{const response=await gpuAnticipation(()=>{if(r.signal.aborted)throw Error('Annulé');return ecouter(r);},2);noterSegmentAnticipe(response.ok,Date.now()-debut);return response;}catch{noterSegmentAnticipe(false,Date.now()-debut);return Response.json({panne:true,motif:'Écoute interrompue'},{status:503});}}
