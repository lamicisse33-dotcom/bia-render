'use client';
import {useEffect,useMemo,useState} from 'react';
import {textePrise} from './prise-validee-core';
import type {PriseMeta} from './prises-validees';
export type PriseLocale={texte:string;langue:'wo'|'fr';voice:'female'|'male';audio:ArrayBuffer;date:number};
export function usePriseValidee(code:string|null){
 const [message,setMessage]=useState(''),[candidate,setCandidate]=useState<PriseLocale|null>(null);
 const api=useMemo(()=>{
 let derniere:PriseLocale|null=null,index:PriseMeta[]=[],actif=true;
 let initial:Promise<void>|undefined;
 const cache=new Map<string,ArrayBuffer>();
 const headers={'x-bia-code':code||''};
 async function actualiser(){if(!code)return;try{const r=await fetch('/api/prises-validees',{headers,signal:AbortSignal.timeout(10000)});if(r.ok&&actif)index=(await r.json()).prises;}catch{}}
 return {
 actualiser(){const p=actualiser();initial??=p;return p;},fermer(){actif=false;},ouvrir(){actif=true;},derniere:()=>derniere,
 oublier(){derniere=null;setCandidate(null);},
 capturer(p:PriseLocale){if(!actif||!code)return;derniere=p;setCandidate(p);setMessage('');},
 async lire(texte:string,langue:string,voice:string){
 await (initial??=actualiser());
 const m=index.find(p=>p.texte===textePrise(texte)&&p.langue===langue&&p.voice===voice);if(!m)return;
 const key=m.id+':'+m.sha256;if(cache.has(key))return cache.get(key);
 const r=await fetch('/api/prises-validees?id='+m.id,{headers,signal:AbortSignal.timeout(8000)});if(!r.ok)throw Error('La prise validée est indisponible. Elle n’a pas été remplacée par une nouvelle voix.');
 const b=await r.arrayBuffer();if(actif){cache.set(key,b);while(cache.size>16)cache.delete(cache.keys().next().value!);}return b;
 },
 async valider(p:PriseLocale|null,texte?:string){
 if(!p||Date.now()-p.date>10*60*1000|| (texte&&textePrise(texte)!==textePrise(p.texte))){setMessage('Texte retenu, mais aucune prise complète correspondante à conserver. Fais répéter la phrase puis valide son audio.');return;}
 setMessage('Enregistrement de la prise audio…');
 try{const f=new FormData();f.set('texte',p.texte);f.set('langue',p.langue);f.set('voice',p.voice);f.set('validee','oui');f.set('audio',new Blob([p.audio],{type:'audio/wav'}),'prise.wav');
 const r=await fetch('/api/prises-validees',{method:'POST',headers,body:f,signal:AbortSignal.timeout(45000)}),d=await r.json();if(!r.ok||!d.confirmee)throw Error(d.erreur||'Sauvegarde non confirmée');
 if(!actif)return;index=[d.prise,...index.filter(x=>x.id!==d.prise.id)];cache.set(d.prise.id+':'+d.prise.sha256,p.audio);setMessage('Prise audio enregistrée et relue : cette phrase réutilisera cette voix.');
 }catch(e){if(actif)setMessage(e instanceof Error?e.message:'Sauvegarde non confirmée');}
 }
 };
 },[code]);
 useEffect(()=>{api.ouvrir();setCandidate(null);setMessage('');void api.actualiser();const t=setInterval(()=>void api.actualiser(),30000);return()=>{api.fermer();clearInterval(t);};},[api]);
 return {api,candidate,message};
}
