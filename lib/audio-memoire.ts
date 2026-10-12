import {createHash,randomUUID} from 'node:crypto';
import {devoirsALire} from './devoirs-apprentissage';
import {lireLecons} from './lexique-apprentissage';
import {reglesPrononciation} from './prononciation';
import {lexiqueConfig} from './lexique';
import {preparerAvecRegles} from './passages-khalam-core';
import {inventorierMemoire,idAudioMemoire,type AudioMemoire} from './audio-memoire-core';
import {assurerMemoire,lireObjetMemoire,ecrireObjetMemoire,objetsMemoire,supprimerObjetMemoire} from './audio-memoire-stockage';
type Bilan={actif:boolean;statut:string;total:number;prets:number;restants:number;echecs:number;a_verifier:number;devoirs_valides:number;octets:number;mis_a_jour:string;dernier_ms:number;lectures:number;lectures_navigateur?:number;dernier_demarrage_ms?:number;derniere_erreur?:string};
type Echec={essais:number;motif:string};
type Etat={bilan:Bilan;catalogue?:{phrases:AudioMemoire[];aVerifier:string[];expire:number};prets:Map<string,number>;worker?:Promise<void>;timer?:ReturnType<typeof setTimeout>;lecture?:Promise<AudioMemoire[]>;reprise?:Promise<void>;echecs:Record<string,Echec>;indexCharge:boolean};
const global=globalThis as typeof globalThis&{biaAudioMemoire?:Etat};
const etat:Etat=global.biaAudioMemoire??={bilan:{actif:false,statut:'non_lance',total:0,prets:0,restants:0,echecs:0,a_verifier:0,devoirs_valides:0,octets:0,mis_a_jour:'',dernier_ms:0,lectures:0},prets:new Map(),echecs:{},indexCharge:false};
const hash=(b:Uint8Array)=>createHash('sha256').update(b).digest('hex');
export const resumeAudioMemoire=()=>({...etat.bilan});
async function anciennesValidees(){
 const rows:any[]=[];for(let offset=0;;offset+=500){
  const r=await fetch(`${lexiqueConfig.url}/rest/v1/${lexiqueConfig.table}?select=source,corrigee,langue,auteur&application=eq.bia&auteur=in.(maitre-lecon,maitre-vocal)&order=id.desc&limit=500&offset=${offset}`,{headers:{apikey:lexiqueConfig.cle,Authorization:'Bearer '+lexiqueConfig.cle},cache:'no-store',signal:AbortSignal.timeout(8000)});
  if(!r.ok)throw Error('Lecture des anciennes validations impossible.');const page=await r.json();if(!Array.isArray(page))throw Error('Lexique invalide.');rows.push(...page);if(page.length<500)break;
 }return rows;
}
export async function catalogueAudioMemoire(force=false):Promise<AudioMemoire[]>{
 if(!force&&etat.catalogue&&etat.catalogue.expire>Date.now())return etat.catalogue.phrases;
 if(etat.lecture)return etat.lecture;
 etat.lecture=(async()=>{
  const [{devoirs},lecons,anciennes,regles]=await Promise.all([devoirsALire(),lireLecons(true),anciennesValidees(),reglesPrononciation()]);
  const inventaire=inventorierMemoire(devoirs,lecons,anciennes);
  const phrases=inventaire.phrases.map(p=>({...p,id:idAudioMemoire(p,preparerAvecRegles(p.texte,p.langue,lecons,regles,false,true))}));
  etat.catalogue={phrases,aVerifier:inventaire.aVerifier,expire:Date.now()+15000};etat.bilan.devoirs_valides=inventaire.devoirsValides;etat.bilan.a_verifier=inventaire.aVerifier.length;
  actualiser(phrases);return phrases;
 })().finally(()=>{etat.lecture=undefined;});return etat.lecture;
}
function actualiser(phrases=etat.catalogue?.phrases||[]){
 const prets=phrases.filter(p=>etat.prets.has(p.id));Object.assign(etat.bilan,{total:phrases.length,prets:prets.length,restants:phrases.length-prets.length,echecs:phrases.filter(p=>(etat.echecs[p.id]?.essais||0)>=3&&!etat.prets.has(p.id)).length,octets:prets.reduce((n,p)=>n+(etat.prets.get(p.id)||0),0),mis_a_jour:new Date().toISOString()});
}
async function checkpoint(){actualiser();await ecrireObjetMemoire('etat.json',JSON.stringify(etat.bilan),'application/json',true);}
function programmer(ms=1000){if(etat.timer)clearTimeout(etat.timer);etat.timer=setTimeout(()=>{etat.timer=undefined;void travailler();},ms);etat.timer.unref?.();}
export async function lancerAudioMemoire(){
 await assurerMemoire();await ecrireObjetMemoire('activation.json',JSON.stringify({actif:true,autorise_le:new Date().toISOString()}),'application/json',true);
 etat.bilan.actif=true;etat.bilan.statut='inventaire';await initialiser();await catalogueAudioMemoire(true);await checkpoint();programmer();return resumeAudioMemoire();
}
async function initialiser(){
 if(etat.indexCharge)return;
 etat.prets=await objetsMemoire();const erreurs=await lireObjetMemoire('echecs.json');if(erreurs)etat.echecs=await erreurs.json();etat.indexCharge=true;
}
export function reprendreAudioMemoire(){
 if(etat.reprise)return etat.reprise;
 etat.reprise=(async()=>{
  if(!lexiqueConfig.actif)return;
  const activation=await lireObjetMemoire('activation.json');if(!activation||!(await activation.json()).actif)return;
  etat.bilan.actif=true;await initialiser();await catalogueAudioMemoire();programmer();
 })().catch(()=>{etat.bilan.statut='reprise_en_attente';programmer(30000);}).finally(()=>{etat.reprise=undefined;});return etat.reprise;
}
async function travailler(){
 if(etat.worker)return etat.worker;
 if(!etat.bilan.actif){void reprendreAudioMemoire();return;}
 etat.worker=(async()=>{
  try{
   const phrases=await catalogueAudioMemoire();
   const p=phrases.filter(p=>!etat.prets.has(p.id)&&(etat.echecs[p.id]?.essais||0)<3).sort((a,b)=>Number(b.langue==='wo')-Number(a.langue==='wo'))[0];
   if(!p){etat.bilan.statut=etat.bilan.restants?'a_verifier':'termine';await checkpoint();programmer(60000);return;}
   etat.bilan.statut='generation';const debut=Date.now(),claim='verrous/'+p.id+'.json',owner=randomUUID();
   const deja=await lireObjetMemoire('sons/'+p.id+'.mp3');
   if(deja){const bytes=new Uint8Array(await deja.arrayBuffer());const meta=await lireObjetMemoire('details/'+p.id+'.json');if(!meta||bytes.length<=1000||(await meta.json()).sha256!==hash(bytes)){etat.echecs[p.id]={essais:3,motif:'Audio présent sans confirmation valide'};await ecrireObjetMemoire('echecs.json',JSON.stringify(etat.echecs),'application/json',true);}else etat.prets.set(p.id,bytes.length);await checkpoint();programmer();return;}
   const verrou=await lireObjetMemoire(claim);
   if(verrou){const v=await verrou.json();if(Date.now()-v.debut<10*60*1000){programmer(15000);return;}await supprimerObjetMemoire(claim);}
   try{await ecrireObjetMemoire(claim,JSON.stringify({owner,debut:Date.now()}),'application/json');}catch{programmer(15000);return;}
   try{
    const {fabriquerSon}=await import('./sons-courants');
    const {audio,mp3}=await fabriquerSon(p,undefined,true);
    // A source/phonetic correction creates a different key. Never publish this
    // take as current if the source changed while the GPU was working.
    const courantes=await catalogueAudioMemoire(true);
    if(!courantes.some(x=>x.id===p.id)){programmer();return;}
    await ecrireObjetMemoire('sons/'+p.id+'.mp3',mp3,'audio/mpeg');
    const relu=await lireObjetMemoire('sons/'+p.id+'.mp3');if(!relu||hash(new Uint8Array(await relu.arrayBuffer()))!==hash(mp3))throw Error('Relecture audio différente.');
    await ecrireObjetMemoire('details/'+p.id+'.json',JSON.stringify({id:p.id,secondes:audio.secondes,octets:mp3.length,sha256:hash(mp3)}),'application/json');
    etat.prets.set(p.id,mp3.length);delete etat.echecs[p.id];etat.bilan.dernier_ms=Date.now()-debut;delete etat.bilan.derniere_erreur;
   }catch(e){etat.echecs[p.id]={essais:(etat.echecs[p.id]?.essais||0)+1,motif:e instanceof Error?e.message:'generation'};etat.bilan.derniere_erreur=etat.echecs[p.id].motif;await ecrireObjetMemoire('echecs.json',JSON.stringify(etat.echecs),'application/json',true);}
   finally{const v=await lireObjetMemoire(claim);if(v&&(await v.json()).owner===owner)await supprimerObjetMemoire(claim);}
   await checkpoint();programmer(etat.echecs[p.id]?10000:500);
  }catch(e){etat.bilan.statut='reprise_en_attente';etat.bilan.derniere_erreur=e instanceof Error?e.message:'indisponible';programmer(30000);}
 })().finally(()=>{etat.worker=undefined;});return etat.worker;
}
export async function listeAudioMemoire(){
 await reprendreAudioMemoire();const phrases=await catalogueAudioMemoire();
 return {bilan:resumeAudioMemoire(),a_verifier:etat.catalogue?.aVerifier||[],sons:phrases.filter(p=>etat.prets.has(p.id)).map(({id,texte,langue})=>({id,texte,langue}))};
}
export async function servirAudioMemoire(id:string){
 const phrases=await catalogueAudioMemoire();if(!phrases.some(p=>p.id===id))return null;
 const r=await lireObjetMemoire('sons/'+id+'.mp3');if(r){etat.bilan.lectures++;}return r;
}

export function noterLectureAudioMemoire(x:{ms?:unknown}){if(typeof x.ms!=='number'||!Number.isFinite(x.ms)||x.ms<0||x.ms>30000)return;etat.bilan.lectures_navigateur=(etat.bilan.lectures_navigateur||0)+1;etat.bilan.dernier_demarrage_ms=Math.round(x.ms);}

/** Only returned by the authenticated operator diagnostic, never public state. */
export async function diagnosticFormatsAudioMemoire(){
 await catalogueAudioMemoire();const ids=etat.catalogue?.aVerifier||[];const {devoirs}=await devoirsALire();
 return {passages:ids,devoirs:devoirs.filter(d=>ids.some(x=>x.startsWith('devoir:'+d.id+':'))).map(d=>({id:d.id,langue:d.langue,texte:d.texte.slice(0,12000)}))};
}
