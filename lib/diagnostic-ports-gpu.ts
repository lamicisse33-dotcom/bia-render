type Bilan={role:string;port_public?:number;port_pod?:number|null;statut_http?:number;ok?:boolean;ms?:number;verdict?:string};
const g=globalThis as typeof globalThis&{biaPortsGpu?:{statut:string;date?:string;cas:Bilan[];travail?:Promise<void>}};
const etat=g.biaPortsGpu??={statut:'non_lance',cas:[]};
export const resumePortsGpu=()=>({statut:etat.statut,date:etat.date,cas:etat.cas,limite:'Contrôle HTTP depuis Render sur les adresses configurées ; ne liste pas les processus ni les ports ouverts à l’intérieur du pod.'});
export function portsAdresseGpu(adresse:string){
 const u=new URL(adresse);if(!['https:','http:'].includes(u.protocol))throw Error('protocole');
 const port_public=Number(u.port)||(u.protocol==='https:'?443:80);
 const proxy=u.hostname.match(/-(\d+)\.proxy\.runpod\.net$/i);
 return {port_public,port_pod:proxy?Number(proxy[1]):u.port?Number(u.port):null};
}
/** Two bounded read-only health requests. Never transmits or returns a key. */
export function verifierPortsGpu(){return etat.travail??=(async()=>{
 etat.statut='en_cours';etat.date=new Date().toISOString();
 await Promise.all([['oreille',process.env.WOLOF_LOCAL_URL],['voix',process.env.CHATTERBOX_TEST_URL]].map(async([role,adresse])=>{
  const c:Bilan={role:role!};etat.cas.push(c);const debut=Date.now();
  try{
   if(!adresse){c.verdict='adresse_absente';return;}
   Object.assign(c,portsAdresseGpu(adresse));
   const r=await fetch(adresse.replace(/\/$/,'')+'/health',{cache:'no-store',signal:AbortSignal.timeout(5000)});
   c.statut_http=r.status;c.ok=r.ok;c.verdict=r.ok?'sante_http_accessible':r.status===502||r.status===503||r.status===504?'passerelle_sans_service':r.status===404?'route_sante_absente':r.status===401||r.status===403?'acces_refuse':'erreur_http';
   await r.body?.cancel().catch(()=>{});
  }catch{c.ok=false;c.verdict='connexion_non_confirmee';}
  finally{c.ms=Date.now()-debut;}
 }));
 etat.statut='termine';
})();}
