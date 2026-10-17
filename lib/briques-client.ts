import {creerFileBriques,type BriqueAudio} from './briques-file';
export function creerProducteurBriques(o:{code:string;tour:string;history:unknown[];resume:string;voice:'female'|'male';persona:string;actuel:()=>boolean}){
 const file=creerFileBriques(),abort=new AbortController();
 let id:string|undefined,dernier='',enCours:Promise<void>|null=null,ecoute=true,annule=false,commence=false,normal=false;
 const liberer=()=>{if(id)void fetch('/api/anticipation/briques',{method:'POST',headers:{'content-type':'application/json','x-bia-code':o.code},body:JSON.stringify({id,action:'annuler'}),keepalive:true}).catch(()=>{});};
 async function demander(texte:string,final=false){
  const r=await fetch('/api/anticipation/briques',{method:'POST',headers:{'content-type':'application/json','x-bia-code':o.code},signal:AbortSignal.any([abort.signal,AbortSignal.timeout(35000)]),body:JSON.stringify({id,texte,final,tour:o.tour,history:o.history,resume:o.resume,voice:o.voice,persona:o.persona})});
  if(!r.ok)throw Error('Préparation indisponible');const d=(await r.json()).preparation;
  if(annule||!o.actuel())return;
  if(!d){if(final)normal=true;return;}
  id=d.id;if(d.brique)file.ajouter(d.brique);if(d.normal)normal=true;
 }
 function lancer(){
  if(enCours||!ecoute||annule||!o.actuel()||dernier.length<35)return;
  const texte=dernier;
  enCours=demander(texte).catch(()=>{}).finally(()=>{enCours=null;if(ecoute&&dernier!==texte)lancer();});
 }
 return {
  progresser(texte:string){dernier=texte;lancer();},
  arreterEcoute(){ecoute=false;},
  commencer(options:{signal:AbortSignal;jouer:(b:BriqueAudio)=>Promise<boolean>;attente:()=>void;taire:()=>void;mesure:(gap:number)=>void}){
   if(commence||annule||!file.pretes)return null;
   commence=true;
   const arreter=()=>{annule=true;abort.abort();file.annuler();liberer();};
   options.signal.addEventListener('abort',arreter,{once:true});
   const fin=file.lire(options).then(reponse=>({reponse,normal})).catch(()=>({reponse:'',normal:true})).finally(()=>options.signal.removeEventListener('abort',arreter));
   return {fin};
  },
  async terminer(texte:string){
   ecoute=false;
   if(!commence){annule=true;abort.abort();file.annuler();liberer();return;}
   try{await enCours;if(annule||!o.actuel()){normal=true;return;}await demander(texte,true);}
   catch{normal=true;}
   finally{file.fermer();}
  },
  livree(personne:string,nombre:number){if(!id||normal||annule)return;void fetch('/api/anticipation/briques',{method:'POST',headers:{'content-type':'application/json','x-bia-code':o.code},body:JSON.stringify({id,action:'livree',personne,nombre}),keepalive:true}).catch(()=>{});},
  annuler(){ecoute=false;annule=true;normal=true;abort.abort();file.annuler();liberer();},
 };
}
