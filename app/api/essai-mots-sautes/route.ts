import {verifierCode} from '@/lib/codes';
import {audiosMotsSautes} from '@/lib/essai-mots-sautes';
export async function GET(r:Request){const v=verifierCode(r.headers.get('x-bia-code'),false);if(!v.ok||!v.maitre)return Response.json({erreur:'Code maître requis'},{status:401});return Response.json(audiosMotsSautes(),{headers:{'cache-control':'no-store'}});}
