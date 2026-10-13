import {verifierCode} from '@/lib/codes';
import {organiserMemoire,lireCatalogueMemoire} from '@/lib/memoire-organisee';
export async function GET(request:Request){
 const v=verifierCode(request.headers.get('x-bia-code'),false);
 if(!v.ok||!v.maitre)return Response.json({erreur:'Réservé au maître'},{status:401});
 try{const c=await lireCatalogueMemoire(),u=new URL(request.url),q=(u.searchParams.get('q')||'').toLocaleLowerCase(),famille=u.searchParams.get('famille');
 const trouves=c.elements.filter(e=>(!famille||e.famille===famille)&&(!q||e.texte.toLocaleLowerCase().includes(q))),offset=Math.max(0,Number(u.searchParams.get('offset'))||0);
 return Response.json({actualise:c.actualise,total:trouves.length,offset,elements:trouves.slice(offset,offset+100),suivant:offset+100<trouves.length?offset+100:null},{headers:{'cache-control':'private, no-store'}});
 }catch{return Response.json({erreur:'Catalogue indisponible'},{status:503});}
}
export async function POST(request:Request){
 const v=verifierCode(request.headers.get('x-bia-code'),false);
 if(!v.ok||!v.maitre)return Response.json({erreur:'Réservé au maître'},{status:401});
 try{return Response.json(await organiserMemoire(),{headers:{'cache-control':'private, no-store'}});}
 catch{return Response.json({erreur:'Organisation non confirmée'},{status:503});}
}
