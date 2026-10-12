import {createHash} from 'node:crypto';
import {lireObjetMemoire,ecrireObjetMemoire} from './audio-memoire-stockage';
import type {DialogueAppris,TourDialogue} from './dialogue-devoirs-core';
type Choix={devoir:string;replique:string};
type Etat={choix:Map<string,Choix>;charge:boolean;chargement?:Promise<void>;ecriture?:Promise<void>;timer?:ReturnType<typeof setTimeout>;revision:number;sauvee:number;bilan:{trouves:number;manquants:number;sauvegardes:number;erreurs_stockage:number}};
const g=globalThis as typeof globalThis&{biaChoixVerifies?:Etat};
const etat:Etat=g.biaChoixVerifies??={choix:new Map(),charge:false,revision:0,sauvee:0,bilan:{trouves:0,manquants:0,sauvegardes:0,erreurs_stockage:0}};
const {choix,bilan}=etat;
const fichier='dialogue/choix-verifies-v1.json';
// Preserve negation, quantities and all contextual facts. No semantic/fuzzy
// similarity shortcut: only punctuation, address and explicit language request.
export function texteCle(s:string){return s.normalize('NFC').toLowerCase().replace(/[’‘]/g,"'").replace(/^\s*bia\s*[,!:]?\s+/u,'').replace(/\b(?:réponds|reponds)\s+en\s+(?:wolof|français|francais)\s*[.!?]?\s*$/u,'').replace(/[.,!?;:«»“”…]/g,' ').replace(/\s+/g,' ').trim();}
export function cleDialogue(index:DialogueAppris[],question:string,history:TourDialogue[]){
 return createHash('sha256').update(JSON.stringify(['choix-verifie-v1',index,texteCle(question),history.map(t=>({role:t.role,text:texteCle(t.text)})).filter(t=>t.text)])).digest('hex');
}
export function resumeDialoguesRapides(){return {...bilan,choix:choix.size,charge:etat.charge};}
export function chargerDialoguesRapides(){
 if(etat.charge)return Promise.resolve();
 return etat.chargement??=(async()=>{try{
  const r=await lireObjetMemoire(fichier);if(r){const d=await r.json();if(Array.isArray(d))for(const v of d.slice(-2048))if(/^[a-f0-9]{64}$/.test(v.cle)&&typeof v.devoir==='string'&&typeof v.replique==='string'&&!choix.has(v.cle))choix.set(v.cle,{devoir:v.devoir,replique:v.replique});}
  etat.charge=true;
 }catch{bilan.erreurs_stockage++;}finally{etat.chargement=undefined;}})();
}
export function chercherChoixRapide(cle:string){const v=choix.get(cle);if(v)bilan.trouves++;else bilan.manquants++;return v;}
export function garderChoixRapide(cle:string,v:Choix){
 choix.set(cle,v);while(choix.size>2048)choix.delete(choix.keys().next().value!);etat.revision++;
 if(!etat.timer){etat.timer=setTimeout(()=>{etat.timer=undefined;void sauverDialoguesRapides();},1000);etat.timer.unref?.();}
}
export function sauverDialoguesRapides():Promise<void>{
 if(etat.ecriture)return etat.ecriture.then(()=>etat.revision>etat.sauvee?sauverDialoguesRapides():undefined);
 return etat.ecriture=(async()=>{try{await chargerDialoguesRapides();if(!etat.charge)return;const r=etat.revision;
  await ecrireObjetMemoire(fichier,JSON.stringify([...choix].map(([cle,v])=>({cle,...v}))),'application/json',true);etat.sauvee=r;bilan.sauvegardes++;
 }catch{bilan.erreurs_stockage++;}finally{etat.ecriture=undefined;}})();
}
