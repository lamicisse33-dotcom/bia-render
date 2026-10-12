import {assurerMemoire,lireObjetMemoire,ecrireObjetMemoire} from './audio-memoire-stockage';
import {validesPartagees,dialoguesDuLexique,type EntreePartagee} from './lexique-partage-core';
const fichier='lexique/traducteur-valide-v1.json';
type Snapshot={version:1;provenance:string;revision:string;importe:string;entrees:EntreePartagee[]};
let cache:Snapshot|null=null,jusqua=0,lecture:Promise<EntreePartagee[]>|undefined;
let bilan={statut:'non_lu',entrees:0,paires:0,provenance:'',revision:'',importe:'',dernier_ms:0};
export const resumeLexiquePartage=()=>({...bilan});
export function lireLexiquePartage():Promise<EntreePartagee[]>{
 if(Date.now()<jusqua)return Promise.resolve(cache?.entrees||[]);
 const charger=()=>lecture??=(async()=>{const debut=Date.now();try{
  const r=await lireObjetMemoire(fichier);if(!r){jusqua=Date.now()+60000;bilan.statut='absent';return [];}
  const v=await r.json() as Snapshot;if(v.version!==1)throw Error('format_invalide');
  cache={...v,entrees:validesPartagees(v.entrees)};jusqua=Date.now()+60000;
  bilan={statut:'disponible',entrees:cache.entrees.length,paires:dialoguesDuLexique(cache.entrees).length,provenance:cache.provenance,revision:cache.revision,importe:cache.importe,dernier_ms:Date.now()-debut};
  return cache.entrees;
 }catch{bilan.statut='lecture_indisponible';jusqua=Date.now()+15000;return cache?.entrees||[];}finally{lecture=undefined;}})();
 // Refresh in the background once loaded: live conversation never waits for it.
 if(cache){void charger();return Promise.resolve(cache.entrees);}return charger();
}
export async function indexLexiquePartage(){return dialoguesDuLexique(await lireLexiquePartage());}
/** Authenticated one-time import. Payload is held in a private service variable,
 * never in public source code. Existing newer corrections win over the seed. */
export async function integrerLexiquePartage(){
 let raw:unknown,provenance='traducteur-wolof/data/lexique.graine.json',revision='dfd485c0fae0ae12f8d5cf4595b85d2805f0579f';
 const code=process.env.KHALAM_INTERPRETE_CODE;
 if(code){
  const r=await fetch('https://interprete.khalam.app/api/lexique',{headers:{'x-code-acces':code},redirect:'error',cache:'no-store',signal:AbortSignal.timeout(15000)});
  if(!r.ok)throw Error('export_traducteur_HTTP_'+r.status);raw=await r.json();provenance='traducteur-wolof/disque-persistant';revision=new Date().toISOString();
 }else raw=JSON.parse(process.env.KHALAM_LEXIQUE_IMPORT||'[]');
 const nouveau=validesPartagees(raw);if(!nouveau.length)throw Error('aucune_entree_validee');
 const ancien=await lireObjetMemoire(fichier),avant=ancien?await ancien.json() as Snapshot:null;
 const entrees=code?nouveau:validesPartagees([...nouveau,...(avant?.entrees||[])]);
 const snapshot:Snapshot={version:1,provenance,revision,importe:new Date().toISOString(),entrees};
 await assurerMemoire();await ecrireObjetMemoire(fichier,JSON.stringify(snapshot),'application/json',true);
 // Re-read durable storage before reporting success.
 cache=null;jusqua=0;const relues=await lireLexiquePartage();
 if(JSON.stringify(relues)!==JSON.stringify(entrees))throw Error('relecture_import_incomplete');
 return {...resumeLexiquePartage(),ajoutees:entrees.length-(avant?.entrees?.length||0),version_vivante:Boolean(code)};
}

let verification:Promise<unknown>|undefined;
export function verifierIntegrationLexiquePartage(){return verification??=(async()=>{
 const {indexDialogue,contexteMaitrises,dialoguerAvecDevoirs}=await import('./dialogue-devoirs');
 const index=await indexDialogue(),partage=index.filter(d=>d.id.startsWith('lexique:'));
 const references=JSON.parse((await contexteMaitrises('Je viens de France.',[])).split('DOMAINES VALIDÉS DISPONIBLES\n')[1]).references_lexique;
 const debut=Date.now();
 const r=await dialoguerAvecDevoirs('Tu peux me demander : tu habites où ? Réponds en wolof.',[],{index,diagnostic:true});
 const exacte=partage.some(d=>d.repliques.some(p=>p.wo===r?.reply));
 return {paires_indexees:partage.length,references_transmises:references.length,essai:{reponse:!!r,source:r?.source,lexique_exact:exacte,ms:Date.now()-debut}};
})();}
