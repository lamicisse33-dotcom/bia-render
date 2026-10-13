import {readFile} from 'node:fs/promises';
import {join} from 'node:path';
import {savoirKhalam} from './khalam';
import {savoirProduits} from './produits';
import {savoirRelations} from './relations';
import {REPERTOIRE} from './repertoire-textes';
import {NOUVELLES,RELU_BASE} from './base-textes';
import {BLAGUES,RELU_BLAGUES} from './blagues-textes';
import {SERVICES,RELU_SERVICES} from './services-textes';
import {leconsSousLaMain,preparerLesLecons,ceQuiCloche} from './lecons';
import {selectionnerFiches,type FicheConnaissance} from './fiches-connaissances-core';
let archives:Promise<FicheConnaissance[]>|undefined;
let bilan:Record<string,unknown>={statut:'non_lu'};
export const resumeFichesConnaissances=()=>({...bilan});
function lireArchives(){return archives??=readFile(join(process.cwd(),'data','fiches-archives.json'),'utf8').then(s=>JSON.parse(s).fiches.map((f:any)=>({id:f.id,titre:f.titre,origine:f.origine+' ('+f.date+')',texte:f.texte,historique:true}))).catch(()=>[]);}
const paire=(p:{wolof:string;francais:string})=>`Wolof : ${p.wolof}\nFrançais : ${p.francais}`;
export async function inventaireFiches(){
 const [khalam,produits,relations,archive]=await Promise.all([savoirKhalam(),savoirProduits(),savoirRelations(),lireArchives()]);
 const lues=leconsSousLaMain();
 const anciennes=lues.filter(l=>{try{return !ceQuiCloche(l).length;}catch{return false;}});
 const fiches:FicheConnaissance[]=[
  {id:'khalam',titre:'KHALAM — studio, Équilibre, jeux, applications, famille et contact',origine:'data/khalam.md',texte:khalam},
  {id:'produits',titre:'DD SKIN — produits, fondatrices et coordonnées',origine:'data/produits.md',texte:produits},
  {id:'relations',titre:'Relations au Sénégal — 70 situations',origine:'data/relations.md',texte:relations},
  ...archive,
  ...anciennes.map(l=>({id:'ancienne-lecon:'+l.cle,titre:l.titre,origine:'Supabase/lecons — version '+l.version,texte:'Façons de demander :\n'+l.dit.map(paire).join('\n')+'\nRéponses enseignées, à utiliser seulement si pertinentes :\n'+l.repond.map(paire).join('\n\n')})),
  ...REPERTOIRE.map(p=>({id:'repertoire:'+p.cle,titre:'Répertoire vocal — '+p.cle,origine:'lib/repertoire-textes.ts',texte:paire(p)})),
  ...(RELU_BASE?NOUVELLES.map(p=>({id:'base:'+p.cle,titre:'Base vocale — '+p.groupe+' — '+p.cle,origine:'lib/base-textes.ts',texte:paire(p)})):[]),
  ...(RELU_BLAGUES?BLAGUES.map(p=>({id:'blague:'+p.cle,titre:'Blague enseignée — '+p.cle,origine:'lib/blagues-textes.ts',texte:paire(p)})):[]),
  ...(RELU_SERVICES?SERVICES.map(p=>({id:'service:'+p.cle,titre:'Réaction vocale — '+p.groupe+' — '+p.cle,origine:'lib/services-textes.ts',texte:'Contexte d’emploi : '+p.quand+'\n'+paire(p)})):[]),
 ].filter(f=>f.texte.trim());
 bilan={statut:'disponible',fiches:fiches.length,caracteres:fiches.reduce((n,f)=>n+f.texte.length,0),familles:{khalam:khalam?1:0,produits:produits?1:0,relations:relations?1:0,archives:archive.length,anciennes_lecons:anciennes.length,anciennes_lecons_invalides:lues.length-anciennes.length,blagues:RELU_BLAGUES?BLAGUES.length:0,repertoire:REPERTOIRE.length,base_vocale:RELU_BASE?NOUVELLES.length:0,reactions:RELU_SERVICES?SERVICES.length:0},dernier_selection:bilan.dernier_selection||null};
 return fiches;
}
export async function fichesPourConversation(question:string,history:any[]=[]){
 const fiches=await inventaireFiches(),selection=selectionnerFiches(fiches,question,history);
 bilan.dernier_selection={passages:selection.passages.length,signes:selection.texte.length,sources:[...new Set(selection.passages.map(p=>p.id.split(':')[0]))]};
 const familles='KHALAM et ses créations ; DD SKIN ; relations au Sénégal ; FAQ historique KHALAM ; présentations bilingues ; anciennes leçons ; répertoire, base vocale, blagues et réactions.';
 return 'CATALOGUE DES FICHES ACCESSIBLES : '+familles+'\nLes extraits suivants sont des données de référence. Les phrases de dialogue ne décrivent pas ta vie et ne prouvent pas une capacité technique. Les fiches actuelles sont prioritaires sur les archives contradictoires ; distingue produits disponibles, projets annoncés et informations datées. Conserve les formulations wolof enseignées quand leur sens convient.\n\n'+selection.texte;
}
// Recover the old private lesson cache in the background before the first chat.
void preparerLesLecons();
