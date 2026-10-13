import {createHash} from 'node:crypto';
import {normaliserDialogue,termesDialogue} from './dialogue-devoirs-core';
export type ReponseBiba={id:string;question_wo:string;question_fr:string;reponse_wo:string;date:string;origine:'correction_biba'|'base_biba'};
export type ArchiveBiba={version:1;type:'corrections-biba';exporte:string;fichier_present:boolean;reponses:unknown[];reponses_origine:unknown[];lexique:unknown[]};
export function verifierArchiveBiba(value:unknown):ArchiveBiba{
 const v=value as ArchiveBiba;
 if(!v||v.version!==1||v.type!=='corrections-biba'||typeof v.exporte!=='string'||typeof v.fichier_present!=='boolean'||!Array.isArray(v.reponses)||!Array.isArray(v.reponses_origine)||!Array.isArray(v.lexique))throw Error('export_biba_incomplet');
 return v;
}
export function reponsesValideesBiba(v:ArchiveBiba):ReponseBiba[]{
 const derniere=new Map<string,{row:any;origine:ReponseBiba['origine'];valide:boolean}>();
 for(const r of v.reponses_origine as any[])if(r&&typeof r.question_wo==='string')derniere.set(normaliserDialogue(r.question_wo),{row:r,origine:'base_biba',valide:true});
 // Live owner validation takes priority over the bundled original. A pending
 // replacement cannot silently revive an older validated reply for that key.
 for(const r of v.reponses as any[])if(r&&typeof r.question_wo==='string'){
  const cle=normaliserDialogue(r.question_wo),ancien=derniere.get(cle);
  if(!ancien||ancien.origine==='base_biba'||String(r.quand||'')>=String(ancien.row.quand||''))derniere.set(cle,{row:r,origine:'correction_biba',valide:r.validee===true});
 }
 return [...derniere.entries()].filter(([q,{row:r,valide}])=>q&&valide&&typeof r.reponse_wo==='string'&&r.reponse_wo.trim()).map(([q,{row:r,origine}])=>({
  id:'biba:'+createHash('sha256').update(q).digest('hex'),question_wo:r.question_wo,question_fr:typeof r.question_fr==='string'?r.question_fr:'',reponse_wo:r.reponse_wo,date:typeof r.quand==='string'?r.quand:'',origine,
 }));
}
/** Questions and answers are separate fields. question_fr is NEVER presented
 * as the French translation of reponse_wo. Keep every source utterance intact. */
export function selectionnerBiba(rows:ReponseBiba[],question:string,history:unknown,budget=3000){
 const h=Array.isArray(history)?history.filter(t=>t?.role==='user'&&typeof t.text==='string').slice(-2).map(t=>t.text).join(' '):'';
 const q=termesDialogue(question),fil=termesDialogue(h),n=normaliserDialogue(question);
 const scored=rows.map(r=>{const a=termesDialogue(r.question_wo+' '+r.question_fr),texte=termesDialogue(r.reponse_wo);let score=0;
  if([r.question_wo,r.question_fr].some(t=>t&&normaliserDialogue(t)===n))score=100;
  for(const mot of q)score+=a.has(mot)?5:texte.has(mot)?1:0;
  if(score)for(const mot of fil)if(a.has(mot))score++;
  return {r,score};
 }).filter(x=>x.score>=5).sort((a,b)=>b.score-a.score);
 let taille=0;const retenues=[];
 for(const {r,score} of scored){const n=JSON.stringify(r).length;if(taille+n>budget&&!(retenues.length===0&&budget>=3000&&score>=100))continue;taille+=n;retenues.push(r);if(retenues.length>=4)break;}
 return retenues;
}
