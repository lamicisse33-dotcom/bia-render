import {randomUUID} from 'node:crypto';
import {lexiqueConfig} from './lexique';
import {remplacerCorrectionValidee} from './correction-prioritaire';
const g=globalThis as typeof globalThis&{biaEssaiCorrectionPrioritaire?:Promise<unknown>};
/** Authenticated, isolated fixture; never touch an owner's text. Real Supabase
 * archive/CAS/reread. This application is excluded from all lexicon readers. */
export function verifierCorrectionPrioritaire(){return g.biaEssaiCorrectionPrioritaire??=(async()=>{
 const id=randomUUID(),source='verification-correction-'+id,avant='Ñaata at nga am ? '+id,apres='Ñaata att nga am ? '+id;
 const base=lexiqueConfig.url+'/rest/v1/'+lexiqueConfig.table;
 const headers={apikey:lexiqueConfig.cle,Authorization:'Bearer '+lexiqueConfig.cle,'content-type':'application/json'};
 const application='verification-correction-prioritaire',auteur='verification-correction-prioritaire';
 const filtre=new URLSearchParams({application:'eq.'+application,auteur:'eq.'+auteur});
 const bilan={date:new Date().toISOString(),anciennes_remplacees:false,nouvelle_relue:false,nettoye:false,synthetique:true,voix_testee:false};
 try{
  const r=await fetch(base,{method:'POST',headers,body:JSON.stringify([{source,corrigee:avant,application,auteur},{source:avant,corrigee:avant,application,auteur}]),signal:AbortSignal.timeout(8000)});
  if(!r.ok)throw Error('fixture');
  await remplacerCorrectionValidee({source:apres,corrigee:apres,langue:'wo',application,auteur},{ancienne:avant,source});
  const q=await fetch(base+'?select=source,corrigee&'+filtre,{headers,cache:'no-store',signal:AbortSignal.timeout(8000)});if(!q.ok)throw Error('relecture');const rows=await q.json();
  bilan.anciennes_remplacees=[source,avant].every(s=>rows.some(r=>r.source===s&&r.corrigee===apres))&&!rows.some(r=>r.corrigee===avant);
  bilan.nouvelle_relue=rows.some(r=>r.source===apres&&r.corrigee===apres);
 }catch{ /* Only boolean proof, no secrets or owner's phrases. */ }
 finally{
  // Constrain cleanup to this fixture's three exact texts, also on retries.
  filtre.set('source','in.('+[source,avant,apres].map(s=>JSON.stringify(s)).join(',')+')');
  try{const r=await fetch(base+'?'+filtre,{method:'DELETE',headers,signal:AbortSignal.timeout(8000)});const q=await fetch(base+'?select=id&'+filtre,{headers,cache:'no-store',signal:AbortSignal.timeout(8000)});bilan.nettoye=r.ok&&q.ok&&(await q.json()).length===0;}catch{}
 }
 return bilan;
})();}
