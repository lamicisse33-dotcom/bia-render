"use client";
import {useEffect,useMemo} from 'react';
import {creerMemoireAudio} from './audio-memoire-client';
/** The reply can bring its audio before the periodic catalogue has loaded. */
export function useAudioMemoire(code:string|null){
 const memoire=useMemo(()=>creerMemoireAudio(code),[code]);
 useEffect(()=>{
  if(!code)return;let vivant=true,timer:ReturnType<typeof setTimeout>|undefined;
  const charger=async()=>{
   try{const r=await fetch('/api/audio-memoire',{headers:{'x-bia-code':code},cache:'no-store',signal:AbortSignal.timeout(8000)});if(r.ok){const d=await r.json();if(vivant&&Array.isArray(d.sons))memoire.actualiser(d.sons);}}catch{}
   if(vivant)timer=setTimeout(()=>void charger(),30000);
  };
  void charger();return()=>{vivant=false;if(timer)clearTimeout(timer);};
 },[code,memoire]);
 return memoire;
}
