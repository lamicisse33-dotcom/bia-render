import {createHash,randomUUID} from 'node:crypto';
import {lexiqueConfig,type Entree} from './lexique';
import {assurerMemoire,ecrireObjetMemoire,lireObjetMemoire} from './audio-memoire-stockage';
import {entreeLexicaleSimple,type RemplacementCorrection} from './correction-prioritaire-core';
const g=globalThis as typeof globalThis&{biaCorrectionPrioritaire?:{tentatives:number;confirmees:number;erreurs:number;lignes_remplacees:number;derniere?:unknown;diagnostic?:unknown}};
const etat=g.biaCorrectionPrioritaire??={tentatives:0,confirmees:0,erreurs:0,lignes_remplacees:0};
export const resumeCorrectionPrioritaire=()=>({revision:'derniere-validation-maitre-v1',...etat});
const hash=(s:string)=>createHash('sha256').update(s).digest('hex');
type Ligne=Entree&{id:string|number};
/** No deletion. Exact matching entries are archived before CAS replacement.
 * Structured lessons keep their provenance-checked root correction route. */
export async function remplacerCorrectionValidee(e:Entree,r:RemplacementCorrection){
 etat.tentatives++;
 try{
  if(!lexiqueConfig.actif)throw Error('Mémoire persistante non configurée');
  if(!r.ancienne.trim()||!e.corrigee.trim()||r.ancienne.length>6000||e.corrigee.length>6000)throw Error('Correction invalide');
  const base=lexiqueConfig.url+'/rest/v1/'+lexiqueConfig.table;
  const headers={apikey:lexiqueConfig.cle,Authorization:'Bearer '+lexiqueConfig.cle,'content-type':'application/json'};
  const demande=r.source?.trim()||e.source;
  const clauses=[['corrigee',r.ancienne],['source',r.ancienne],['source',demande]];
  const query=new URLSearchParams({select:'id,source,corrigee,proposee,langue,auteur,application',or:'('+clauses.map(([k,v])=>k+'.eq.'+JSON.stringify(v)).join(',')+')',order:'id.desc'});
  const lignes:Ligne[]=[];
  for(let offset=0;;offset+=500){
   const res=await fetch(base+'?'+query+'&limit=500&offset='+offset,{headers,cache:'no-store',signal:AbortSignal.timeout(8000)});
   if(!res.ok)throw Error('Lecture des anciennes versions refusée');const page=await res.json();if(!Array.isArray(page))throw Error('Lecture des versions invalide');
   lignes.push(...page.filter(entreeLexicaleSimple));if(page.length<500)break;
  }
  const changement=lignes.filter(l=>l.corrigee!==e.corrigee);
  const journal={version:1,date:new Date().toISOString(),avant:changement,apres:e,remplacement:r};
  const path='corrections-historique/'+randomUUID()+'.json',contenu=JSON.stringify(journal);
  await assurerMemoire();await ecrireObjetMemoire(path,contenu,'application/json');
  const archive=await lireObjetMemoire(path);if(!archive||hash(await archive.text())!==hash(contenu))throw Error('Historique non confirmé : remplacement annulé');
  for(const ligne of changement){
   const cas=new URLSearchParams({id:'eq.'+ligne.id,source:'eq.'+ligne.source,corrigee:'eq.'+ligne.corrigee,proposee:ligne.proposee==null?'is.null':'eq.'+ligne.proposee});
   const res=await fetch(base+'?'+cas,{method:'PATCH',headers:{...headers,Prefer:'return=representation'},body:JSON.stringify({corrigee:e.corrigee,proposee:ligne.proposee||r.ancienne}),signal:AbortSignal.timeout(8000)});
   if(!res.ok)throw Error('Remplacement refusé');const rows=await res.json();if(!Array.isArray(rows)||rows.length!==1||rows[0].corrigee!==e.corrigee)throw Error('Version modifiée simultanément : fais relire avant de valider');
  }
  const nouvelles:Entree[]=[{...e,proposee:r.ancienne}];
  if(demande!==e.source&&!lignes.some(l=>l.source===demande))nouvelles.push({...e,source:demande,proposee:r.ancienne});
  const post=await fetch(base,{method:'POST',headers:{...headers,Prefer:'return=representation'},body:JSON.stringify(nouvelles),signal:AbortSignal.timeout(8000)});
  if(!post.ok)throw Error('Nouvelle référence refusée');const inscrites=await post.json();if(!Array.isArray(inscrites)||inscrites.length!==nouvelles.length||inscrites.some(l=>l.id==null))throw Error('Nouvelle référence non identifiée');
  // Confirm the persisted versions, not merely the write response.
  for(const ligne of [...changement,...inscrites]){
   const check=await fetch(base+'?'+new URLSearchParams({select:'id,corrigee',id:'eq.'+ligne.id}),{headers,cache:'no-store',signal:AbortSignal.timeout(8000)});
   if(!check.ok||(await check.json())[0]?.corrigee!==e.corrigee)throw Error('Relecture de la correction non confirmée');
  }
  etat.confirmees++;etat.lignes_remplacees+=changement.length;etat.derniere={quand:journal.date,remplacees:changement.length,historique_verifie:true,relecture_exacte:true};
 }catch(err){etat.erreurs++;throw err;}
}
