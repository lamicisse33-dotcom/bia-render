import {creerFileBriques,type BriqueAudio} from './briques-file';
export function creerProducteurBriques(o:{code:string;tour:string;history:unknown[];resume:string;voice:'female'|'male';persona:string;actuel:()=>boolean}){
 const file=creerFileBriques(),abort=new AbortController();
 let id:string|undefined,dernier='',enCours:Promise<void>|null=null,ecoute=true,annule=false,commence=false,normal=false,termine=false,ajout=false;
 const liberer=()=>{if(id)void fetch('/api/anticipation/briques',{method:'POST',headers:{'content-type':'application/json','x-bia-code':o.code},body:JSON.stringify({id,action:'annuler'}),keepalive:true}).catch(()=>{});};
 async function demander(texte:string,final=false){
  const r=await fetch('/api/anticipation/briques',{method:'POST',headers:{'content-type':'application/json','x-bia-code':o.code},signal:AbortSignal.any([abort.signal,AbortSignal.timeout(35000)]),body:JSON.stringify({id,texte,final,tour:o.tour,history:o.history,resume:o.resume,voice:o.voice,persona:o.persona})});
  if(!r.ok)throw Error('Préparation indisponible');const d=(await r.json()).preparation;
  if(annule||!o.actuel())return false;
  if(!d){if(final)normal=true;return false;}
  termine=d.termine===true;ajout=!!d.brique;
  id=d.id;if(d.brique)file.ajouter(d.brique);if(d.normal)normal=true;
  return !!d.brique&&d.continuer===true;
 }
 function lancer(){
  if(enCours||!ecoute||annule||!o.actuel()||dernier.length<35)return;
  const texte=dernier;
  let continuer=false;
  enCours=demander(texte).then(suite=>{continuer=!!suite;}).catch(()=>{}).finally(()=>{enCours=null;if(ecoute&&(dernier!==texte||continuer))lancer();});
 }
 return {
  progresser(texte:string){dernier=texte;lancer();},
  arreterEcoute(){ecoute=false;},
  etat(){return {pretes:file.pretes,en_cours:!!enCours};},
  commencer(options:{signal:AbortSignal;jouer:(b:BriqueAudio)=>Promise<boolean>;attente:()=>void;taire:()=>void;mesure:(gap:number)=>void},transcriptionEnCours=false){
   if(commence||annule||(!file.pretes&&!enCours&&!transcriptionEnCours))return null;
   commence=true;
   const arreter=()=>{annule=true;abort.abort();file.annuler();liberer();};
   options.signal.addEventListener('abort',arreter,{once:true});
   const fin=file.lire(options).then(reponse=>({reponse,normal})).catch(()=>({reponse:'',normal:true})).finally(()=>options.signal.removeEventListener('abort',arreter));
   return {fin};
  },
  async terminer(texte:string){
   ecoute=false;
   if(!commence){annule=true;abort.abort();file.annuler();liberer();return;}
   try{await enCours;if(annule||!o.actuel()){normal=true;return;}
    // Keep an already running first brick: it starts as soon as it arrives,
    // independently of the final ASR. Finish with short complete bricks, so
    // later points can be synthesized while the previous brick is playing.
    for(let i=0;i<8;i++){
      await demander(texte,true);
      if(termine||normal)return;
      if(!ajout){normal=true;liberer();return;}
    }
    normal=true;liberer();}
   catch{normal=true;}
   finally{file.fermer();}
  },
  livree(personne:string,nombre:number){if(!id||normal||annule)return;void fetch('/api/anticipation/briques',{method:'POST',headers:{'content-type':'application/json','x-bia-code':o.code},body:JSON.stringify({id,action:'livree',personne,nombre}),keepalive:true}).catch(()=>{});},
  annuler(){ecoute=false;annule=true;normal=true;abort.abort();file.annuler();liberer();},
 };
}
