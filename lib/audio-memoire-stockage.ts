import {lexiqueConfig} from './lexique';
export const SEAU_MEMOIRE='bia-memoire-audio';
const headers=()=>({apikey:lexiqueConfig.cle,Authorization:'Bearer '+lexiqueConfig.cle});
const url=(path:string)=>lexiqueConfig.url+'/storage/v1/object/'+SEAU_MEMOIRE+'/'+path;
let pret=false;
export async function assurerMemoire(){
 if(pret)return;
 const r=await fetch(lexiqueConfig.url+'/storage/v1/bucket/'+SEAU_MEMOIRE,{headers:headers(),cache:'no-store',signal:AbortSignal.timeout(8000)});
 if(r.ok){if((await r.json()).public!==false)throw Error('Le stockage mémoire doit être privé.');pret=true;return;}
 if(![400,404].includes(r.status))throw Error('Stockage indisponible.');
 const cree=await fetch(lexiqueConfig.url+'/storage/v1/bucket',{method:'POST',headers:{...headers(),'content-type':'application/json'},body:JSON.stringify({id:SEAU_MEMOIRE,name:SEAU_MEMOIRE,public:false}),signal:AbortSignal.timeout(8000)});
 if(!cree.ok)throw Error('Création du stockage mémoire impossible.');pret=true;
}
export async function lireObjetMemoire(path:string){
 const r=await fetch(url(path),{headers:headers(),cache:'no-store',signal:AbortSignal.timeout(8000)});
 if(r.status===400||r.status===404)return null;if(!r.ok)throw Error('Lecture mémoire indisponible.');return r;
}
export async function ecrireObjetMemoire(path:string,body:Uint8Array|string,type:string,mutable=false){
 const r=await fetch(url(path),{method:'POST',headers:{...headers(),'content-type':type,'x-upsert':String(mutable)},body,signal:AbortSignal.timeout(15000)});
 if(!r.ok)throw Error('Enregistrement audio refusé ('+r.status+').');
}
async function listerObjets(prefix:string){
 const out=new Map<string,number>();for(let offset=0;;offset+=1000){
  const r=await fetch(lexiqueConfig.url+'/storage/v1/object/list/'+SEAU_MEMOIRE,{method:'POST',headers:{...headers(),'content-type':'application/json'},body:JSON.stringify({prefix,limit:1000,offset,sortBy:{column:'name',order:'asc'}}),cache:'no-store',signal:AbortSignal.timeout(8000)});
  if(!r.ok)throw Error('Liste des audios indisponible.');const lot=await r.json();if(!Array.isArray(lot))throw Error('Liste invalide.');
  for(const x of lot)if(/^[a-f0-9]{64}\.(mp3|json)$/.test(x.name))out.set(x.name.replace(/\.(mp3|json)$/,''),x.metadata?.size||0);
  if(lot.length<1000)break;
 }return out;
}
export async function supprimerObjetMemoire(path:string){
 const r=await fetch(lexiqueConfig.url+'/storage/v1/object/'+SEAU_MEMOIRE,{method:'DELETE',headers:{...headers(),'content-type':'application/json'},body:JSON.stringify({prefixes:[path]}),signal:AbortSignal.timeout(8000)});
 if(!r.ok)throw Error('Nettoyage du verrou impossible.');
}

export async function objetsMemoire(){const [sons,details]=await Promise.all([listerObjets('sons'),listerObjets('details')]);return new Map([...sons].filter(([id,octets])=>octets>1000&&details.has(id)));}
