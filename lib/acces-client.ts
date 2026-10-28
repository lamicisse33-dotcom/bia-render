export class CodeAccesRefuse extends Error {}

export async function verifierAcces(code:string,numero=''):Promise<{maitre:boolean}>{
 /* Le numéro part par un EN-TÊTE, jamais par l'adresse : une adresse se
    retrouve dans l'historique du téléphone, dans les journaux du serveur et
    dans le référent envoyé au site suivant. */
 const entetes:Record<string,string>={'x-bia-code':code};
 if(numero)entetes['x-bia-numero']=numero;
 const r=await fetch('/api/acces',{headers:entetes,cache:'no-store',signal:AbortSignal.timeout(8000)});
 const d=await r.json();
 if(r.status===401||r.status===403)throw new CodeAccesRefuse(d.erreur||'Code refusé. Vérifie ton code.');
 if(!r.ok||d.ok!==true)throw Error('Connexion indisponible. Réessaie dans un instant.');
 return {maitre:d.maitre===true};
}

type StockageCode=Pick<Storage,'getItem'|'removeItem'>;
export type AccesMemorise=
 |{etat:'absent'}
 /* ── CEUX QUI UTILISAIENT DÉJÀ BIA ──────────────────────────────
    Leur code est mémorisé, leur numéro ne l'est pas : il n'existait pas
    avant le 28 octobre 2026. On ne les met PAS dehors et on ne leur
    redemande pas leur code — on leur demande leur numéro, une seule fois,
    et le code se lie à ce numéro-là. */
 |{etat:'numero_manquant';code:string}
 |{etat:'valide';code:string;maitre:boolean}
 |{etat:'refuse';message:string}
 |{etat:'indisponible';message:string};

/** A temporary outage never deletes a remembered code or opens the password form. */
export async function restaurerAccesMemorise(stockage?:StockageCode):Promise<AccesMemorise>{
 let support:StockageCode,code:string,numero:string;
 try{support=stockage??window.localStorage;code=support.getItem('bia-code')||'';numero=support.getItem('bia-numero')||'';}catch{return {etat:'absent'};}
 if(!code)return {etat:'absent'};
 if(!numero)return {etat:'numero_manquant',code};
 try{
  const acces=await verifierAcces(code,numero);
  return {etat:'valide',code,maitre:acces.maitre};
 }catch(e){
  if(e instanceof CodeAccesRefuse){
   try{if(support.getItem('bia-code')===code)support.removeItem('bia-code');}catch{}
   return {etat:'refuse',message:e.message};
  }
  return {etat:'indisponible',message:'Connexion indisponible. Ton code reste mémorisé. Réessaie dans un instant.'};
 }
}
