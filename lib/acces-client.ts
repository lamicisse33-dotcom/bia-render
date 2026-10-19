export class CodeAccesRefuse extends Error {}

export async function verifierAcces(code:string):Promise<{maitre:boolean}>{
 const r=await fetch('/api/acces',{headers:{'x-bia-code':code},cache:'no-store',signal:AbortSignal.timeout(8000)});
 const d=await r.json();
 if(r.status===401||r.status===403)throw new CodeAccesRefuse(d.erreur||'Code refusé. Vérifie ton code.');
 if(!r.ok||d.ok!==true)throw Error('Connexion indisponible. Réessaie dans un instant.');
 return {maitre:d.maitre===true};
}

type StockageCode=Pick<Storage,'getItem'|'removeItem'>;
export type AccesMemorise=
 |{etat:'absent'}
 |{etat:'valide';code:string;maitre:boolean}
 |{etat:'refuse';message:string}
 |{etat:'indisponible';message:string};

/** A temporary outage never deletes a remembered code or opens the password form. */
export async function restaurerAccesMemorise(stockage?:StockageCode):Promise<AccesMemorise>{
 let support:StockageCode,code:string;
 try{support=stockage??window.localStorage;code=support.getItem('bia-code')||'';}catch{return {etat:'absent'};}
 if(!code)return {etat:'absent'};
 try{
  const acces=await verifierAcces(code);
  return {etat:'valide',code,maitre:acces.maitre};
 }catch(e){
  if(e instanceof CodeAccesRefuse){
   try{if(support.getItem('bia-code')===code)support.removeItem('bia-code');}catch{}
   return {etat:'refuse',message:e.message};
  }
  return {etat:'indisponible',message:'Connexion indisponible. Ton code reste mémorisé. Réessaie dans un instant.'};
 }
}
