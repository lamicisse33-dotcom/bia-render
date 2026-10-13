import {ajouterCorrection, lexiqueConfig} from './lexique';
/** Called only after master authentication. Acknowledgement requires read-back. */
export async function enregistrerPhraseMaitre(phrase:string,langue:string){
 if(!lexiqueConfig.actif)throw Error('Mémoire persistante non configurée');
 await ajouterCorrection({source:phrase,corrigee:phrase,langue,auteur:'maitre-vocal',application:'bia'});
 if(!await phraseMaitrePresente(phrase))throw Error('La relecture de la mémoire ne confirme pas la phrase');
}
export async function phraseMaitrePresente(phrase:string){
 const filtre=new URLSearchParams({select:'source,corrigee',source:'eq.'+phrase,corrigee:'eq.'+phrase,auteur:'eq.maitre-vocal',application:'eq.bia',limit:'1'});
 const r=await fetch(`${lexiqueConfig.url}/rest/v1/${lexiqueConfig.table}?${filtre}`,{headers:{apikey:lexiqueConfig.cle,Authorization:`Bearer ${lexiqueConfig.cle}`},cache:'no-store',signal:AbortSignal.timeout(8000)});
 if(!r.ok)throw Error(`Relecture de la mémoire refusée (${r.status})`);
 const rows=await r.json();return Array.isArray(rows)&&rows.some(e=>e.source===phrase&&e.corrigee===phrase);
}
