import {creerFileBriques,creerFluxBrique,type BriqueAudio} from './briques-file';
import {entetesRapidite} from './rapidite-core';
export function creerProducteurBriques(o:{code:string;tour:string;history:unknown[];resume:string;voice:'female'|'male';persona:string;actuel:()=>boolean;segments?:()=>number}){
 const file=creerFileBriques(),abort=new AbortController();
 const headers={'content-type':'application/json','x-bia-code':o.code,...entetesRapidite()};
 let id:string|undefined,dernier='',enCours:Promise<void>|null=null,ecoute=true,annule=false,commence=false,normal=false,termine=false,ajout=false;
 /* ── LA PORTE QUI A REFUSÉ, NOMMÉE ET DÉCLARÉE ────────────────────────────

    Le 23 octobre, quatre tours Khalam : six segments d'écoute réussis, et
    `sessions: 0` côté serveur — le téléphone n'avait donc RIEN demandé. Mais
    aucune trace ne disait pourquoi : `lancer()` repartait en silence sur
    `dernier.length<35`, et `commencer()` sur `!file.pretes&&!enCours`.

    On compte donc chaque refus par son nom, et on les déclare UNE fois à la
    fin du tour — un envoi par tour, pas un par refus : `lancer()` est appelé
    à chaque progression. Voir lib/eligibilite-etat.ts. */
 const portes:Record<string,number>={};let signesMax=0,declare=false;
 const porte=(nom:string)=>{portes[nom]=(portes[nom]||0)+1;};
 function declarerLesPortes(){
  if(declare)return;declare=true;
  if(!signesMax)porte('jamais_de_texte');
  if(!Object.keys(portes).length)return;
  void fetch('/api/mesure',{method:'POST',headers:{'content-type':'application/json'},keepalive:true,
   body:JSON.stringify({type:'eligibilite',etape:'portes',portes,signes_max:signesMax,segments:o.segments?.()??null})}).catch(()=>{});
 }
 const liberer=()=>{if(id)void fetch('/api/anticipation/briques',{method:'POST',headers,body:JSON.stringify({id,action:'annuler'}),keepalive:true}).catch(()=>{});};
 async function recevoir(r:Response){
  if(!r.headers.get('content-type')?.includes('application/x-ndjson'))return (await r.json()).preparation;
  if(!r.body)throw Error('Audio interrompu');
  const lecteur=r.body.getReader(),decodeur=new TextDecoder(),flux=creerFluxBrique();
  let tampon='',brique:BriqueAudio|undefined,ajoutee=false,total=0,recu=0,empreinte='',bilan:any,termine=false;
  const traiter=(ligne:string)=>{
   if(!ligne.trim())return;
   if(termine||annule||!o.actuel())throw Error('Lecture annulée');
   const d=JSON.parse(ligne);
   if(d.type==='brique'){
    if(brique||!Number.isInteger(d.brique?.numero)||typeof d.brique?.texte!=='string'||!d.brique.texte||d.brique.voice!==o.voice||!['wo','fr'].includes(d.brique.langue))throw Error('Brique invalide');
    brique={...d.brique,audio:'',flux};return;
   }
   if(d.type==='morceau'){
    if(!brique||d.voice!==o.voice||d.partie!==recu||typeof d.audio!=='string'||!d.audio||!Number.isInteger(d.parties)||d.parties<1||d.parties>8||typeof d.empreinte!=='string'||!d.empreinte)throw Error('Audio incomplet');
    if(!recu){total=d.parties;empreinte=d.empreinte;}if(d.parties!==total||d.empreinte!==empreinte||recu>=total)throw Error('Audio incomplet');
    flux.pousser(d.audio);recu++;if(!ajoutee){file.ajouter(brique);ajoutee=true;}return;
   }
   if(d.type==='resultat'){
    if(brique&&(!ajoutee||recu!==total))throw Error('Audio incomplet');
    bilan=d.preparation;if(brique&&(typeof bilan?.id!=='string'||!bilan.id||bilan.brique))throw Error('Brique incomplète');
    termine=true;return;
   }
   throw Error('Audio interrompu');
  };
  try{
   for(;;){const d=await lecteur.read();if(d.done)break;tampon+=decodeur.decode(d.value,{stream:true});if(tampon.length>8_000_000)throw Error('Audio incomplet');let i;while((i=tampon.indexOf('\n'))>=0){traiter(tampon.slice(0,i));tampon=tampon.slice(i+1);}}
   tampon+=decodeur.decode();if(tampon.trim())traiter(tampon);if(!termine)throw Error('Audio incomplet');
   flux.fermer();if(ajoutee)return {...bilan,briqueRecue:true};return bilan;
  }catch(e){
   const erreur=e instanceof Error?e:new Error('Audio interrompu');flux.echouer(erreur);
   if(ajoutee){annule=true;ecoute=false;file.echouer(erreur);abort.abort();liberer();}
   throw erreur;
  }finally{void lecteur.cancel().catch(()=>{});}
 }
 async function demander(texte:string,final=false){
  const r=await fetch('/api/anticipation/briques',{method:'POST',headers,signal:AbortSignal.any([abort.signal,AbortSignal.timeout(35000)]),body:JSON.stringify({id,texte,final,tour:o.tour,history:o.history,resume:o.resume,voice:o.voice,persona:o.persona,flux:true})});
  if(!r.ok)throw Error('Préparation indisponible');const d=await recevoir(r);
  if(annule||!o.actuel())return false;
  if(!d){if(final)normal=true;return false;}
  termine=d.termine===true;ajout=!!d.brique||d.briqueRecue===true;
  id=d.id;if(d.brique)file.ajouter(d.brique);if(d.normal)normal=true;
  return ajout&&d.continuer===true;
 }
 function lancer(){
  if(enCours){porte('preparation_en_cours');return;}
  if(!ecoute){porte('ecoute_fermee');return;}
  if(annule){porte('annule');return;}
  if(!o.actuel()){porte('tour_perime');return;}
  if(dernier.length<35){porte('trop_court');return;}
  const texte=dernier;
  let continuer=false;
  enCours=demander(texte).then(suite=>{continuer=!!suite;}).catch(()=>{}).finally(()=>{enCours=null;if(ecoute&&(dernier!==texte||continuer))lancer();});
 }
 return {
  progresser(texte:string){dernier=texte;signesMax=Math.max(signesMax,texte.length);lancer();},
  porte,
  arreterEcoute(){ecoute=false;},
  etat(){return {pretes:file.pretes,en_cours:!!enCours};},
  commencer(options:{signal:AbortSignal;jouer:(b:BriqueAudio)=>Promise<boolean>;attente:(ms:number)=>void;taire:()=>void;mesure:(gap:number)=>void}){
   // ASR alone is not a prepared response. Starting a new brick after speech
   // ended can add an entire rejected model call before ordinary chat starts.
   if(commence||annule){porte('annule');return null;}
   if(!file.pretes&&!enCours){porte('rien_de_pret');return null;}
   commence=true;
   const arreter=()=>{annule=true;abort.abort();file.annuler();liberer();};
   options.signal.addEventListener('abort',arreter,{once:true});
   const fin=file.lire(options).then(reponse=>({reponse,normal})).catch(e=>{if(file.lectureEnFlux)throw e;return {reponse:'',normal:true};}).finally(()=>options.signal.removeEventListener('abort',arreter));
   // The consumer awaits fin after final ASR; observe early stream failure now
   // without converting it into a replay of already audible speech.
   void fin.catch(()=>{});
   return {fin};
  },
  async terminer(texte:string){
   ecoute=false;
   declarerLesPortes();
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
  livree(personne:string,nombre:number){if(!id||normal||annule)return;void fetch('/api/anticipation/briques',{method:'POST',headers,body:JSON.stringify({id,action:'livree',personne,nombre}),keepalive:true}).catch(()=>{});},
  annuler(){declarerLesPortes();ecoute=false;annule=true;normal=true;abort.abort();file.annuler();liberer();},
 };
}

