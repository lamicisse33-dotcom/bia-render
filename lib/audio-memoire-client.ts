type Son={id:string;texte:string;langue:'fr'|'wo'};
export type AudioJoint={id:string;base64:string};
/** One instance per signed-in code. In-flight requests of an old session can
 * never populate the new session's cache. Nothing is stored in public caches. */
export function creerMemoireAudio(code:string|null,requete:typeof fetch=fetch){
 let index:Son[]=[];
 const cache=new Map<string,ArrayBuffer>(),directs=new Map<string,string>(),enCours=new Map<string,Promise<ArrayBuffer|undefined>>();
 const cle=(t:string,l:string)=>l+':'+t.trim();
 function garder(id:string,b:ArrayBuffer){cache.set(id,b);while(cache.size>128)cache.delete(cache.keys().next().value!);}
 function installer(texte:string,langue:'fr'|'wo',audio:AudioJoint){
  if(!code||!audio||!/^[a-f0-9]{64}$/.test(audio.id)||typeof audio.base64!=='string'||audio.base64.length>1_400_000)return false;
  try{const s=atob(audio.base64);if(s.length<1000)return false;const b=Uint8Array.from(s,c=>c.charCodeAt(0)).buffer;garder(audio.id,b);directs.set(cle(texte,langue),audio.id);while(directs.size>128)directs.delete(directs.keys().next().value!);return true;}catch{return false;}
 }
 function actualiser(sons:Son[]){
  index=sons;const ids=new Set(sons.map(s=>s.id));
  for(const id of cache.keys())if(!ids.has(id))cache.delete(id);
  for(const [k,id] of directs)if(!ids.has(id))directs.delete(k);
 }
 async function charger(id:string):Promise<ArrayBuffer|undefined>{
  if(!code)return;const b=cache.get(id);if(b)return b;if(enCours.has(id))return enCours.get(id);
  const p=(async()=>{try{const r=await requete('/api/audio-memoire?id='+id,{headers:{'x-bia-code':code},signal:AbortSignal.timeout(1800)});if(!r.ok)return;const b=await r.arrayBuffer();if(b.byteLength<1000)return;garder(id,b);return b;}catch{return;}finally{enCours.delete(id);}})();enCours.set(id,p);return p;
 }
 async function lire(texte:string,langue:'fr'|'wo'){
  const joint=directs.get(cle(texte,langue));if(joint&&cache.has(joint))return cache.get(joint);
  const i=index.findIndex(s=>s.langue===langue&&s.texte===texte.trim());if(i<0)return;
  const b=await charger(index[i].id);if(b)void(async()=>{for(const voisin of index.slice(i+1,i+5).filter(s=>s.langue===langue))await charger(voisin.id);})();return b;
 }
 return {installer,actualiser,lire};
}
