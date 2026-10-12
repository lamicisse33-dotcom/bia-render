"use client";
import {useCallback,useEffect,useRef} from 'react';
type Son={id:string;texte:string;langue:'fr'|'wo'};
/** Load a small text index, never download the whole lesson audio library. */
export function useAudioMemoire(code:string|null){
 const index=useRef<Son[]>([]),cache=useRef(new Map<string,ArrayBuffer>()),enCours=useRef(new Map<string,Promise<ArrayBuffer|undefined>>());
 useEffect(()=>{
  index.current=[];cache.current.clear();enCours.current.clear();if(!code)return;
  let vivant=true,timer:ReturnType<typeof setTimeout>|undefined;
  const charger=async()=>{
   try{const r=await fetch('/api/audio-memoire',{headers:{'x-bia-code':code},cache:'no-store',signal:AbortSignal.timeout(8000)});if(r.ok){const d=await r.json();if(vivant){index.current=d.sons;const ids=new Set<string>(d.sons.map((s:Son)=>s.id));for(const id of cache.current.keys())if(!ids.has(id))cache.current.delete(id);}}}catch{}
   if(vivant)timer=setTimeout(()=>void charger(),30000);
  };
  void charger();return()=>{vivant=false;if(timer)clearTimeout(timer);};
 },[code]);
 const chargerSon=useCallback(async(id:string):Promise<ArrayBuffer|undefined>=>{
  if(!code)return;const connu=cache.current.get(id);if(connu)return connu;if(enCours.current.has(id))return enCours.current.get(id);
  const requete=(async()=>{try{
   const r=await fetch('/api/audio-memoire?id='+id,{headers:{'x-bia-code':code},signal:AbortSignal.timeout(1800)});if(!r.ok)return;
   const b=await r.arrayBuffer();if(b.byteLength<1000)return;
   cache.current.set(id,b);while(cache.current.size>48)cache.current.delete(cache.current.keys().next().value!);return b;
  }catch{return;}finally{enCours.current.delete(id);}})();enCours.current.set(id,requete);return requete;
 },[code]);
 return useCallback(async(texte:string,langue:'fr'|'wo')=>{
  const i=index.current.findIndex(s=>s.langue===langue&&s.texte===texte.trim());if(i<0)return;
  const son=index.current[i],b=await chargerSon(son.id);
  if(b)void(async()=>{for(const voisin of index.current.slice(i+1,i+5).filter(s=>s.langue===langue))await chargerSon(voisin.id);})();
  return b;
 },[chargerSon]);
}
