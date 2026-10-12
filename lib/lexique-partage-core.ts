import {createHash} from 'node:crypto';
import {normaliserDialogue,type DialogueAppris} from './dialogue-devoirs-core';
export type EntreePartagee={source:string;corrigee:string;langue_source:'fr'|'wo';niveau:'valide';date:string;origine:string};
export function validesPartagees(rows:unknown):EntreePartagee[]{
 if(!Array.isArray(rows))throw Error('format_lexique_invalide');
 const derniers=new Map<string,Record<string,unknown>>();
 for(const r of rows){
  if(!r||typeof r.source!=='string'||!['fr','wo'].includes(r.langue_source))continue;
  const cle=r.langue_source+':'+normaliserDialogue(r.source),ancien=derniers.get(cle);
  if(!ancien||String(r.date||'')>=String(ancien.date||''))derniers.set(cle,r);
 }
 return [...derniers.values()].filter(r=>r.niveau==='valide'&&typeof r.corrigee==='string'&&r.corrigee.trim()&&String(r.source).trim()&&String(r.source).length<=6000&&r.corrigee.length<=6000).map(r=>({source:String(r.source),corrigee:String(r.corrigee),langue_source:r.langue_source as 'fr'|'wo',niveau:'valide',date:String(r.date||''),origine:String(r.origine||'traducteur-wolof')}));
}
export function dialoguesDuLexique(rows:EntreePartagee[]):DialogueAppris[]{
 const vus=new Set<string>();return rows.flatMap(r=>{
  const fr=r.langue_source==='fr'?r.source:r.corrigee,wo=r.langue_source==='wo'?r.source:r.corrigee;
  const cle=normaliserDialogue(fr)+'|'+normaliserDialogue(wo);if(vus.has(cle))return [];vus.add(cle);
  const id=createHash('sha256').update(JSON.stringify([fr,wo])).digest('hex');
  return [{id:'lexique:'+id,titre:'Lexique KHALAM — '+fr.slice(0,180),date:r.date,repliques:[{id:'0',fr,wo,role:'inconnu' as const}]}];
 });
}
