export type TourCorrection={role:string;text?:string;content?:string};
export type RemplacementCorrection={ancienne:string;source?:string};
/** Only an explicit correction in this thread can identify what to replace.
 * Never search semantically through unrelated lessons or generated suggestions. */
export function origineCorrectionDepuisFil(history:TourCorrection[]=[],phrase:string):RemplacementCorrection|undefined{
 const tours=history.slice(-40).map(t=>({role:t.role,texte:String(t.text??t.content??'').trim()}));
 for(let i=tours.length-1;i>=0;i--){
  const t=tours[i];if(t.role!=='user')continue;
  if(!/\b(?:corrig\p{L}*|mal (?:dit|parl\p{L}*|prononc\p{L}*)|il faut dire|tu dois dire|dis plutôt|la bonne phrase)\b/iu.test(t.texte))continue;
  // Do not mistake the final save command for the correction's start.
  if(/^(?:m[ée]morise|retiens|garde|enregistre)\b/iu.test(t.texte))continue;
  const fin=tours.findLastIndex((x,j)=>j>=i&&(x.texte===phrase||x.texte.endsWith(': '+phrase)));
  if(fin<0)continue;
  // Never reopen an older correction when a new topic or lesson follows it.
  for(let j=i+1;j<fin;j++){
   const x=tours[j];if(x.role!=='user')continue;
   if(/\b(?:m[ée]morise|retiens|enregistre|garde ça)\b/iu.test(x.texte))return;
   const controle=/^(?:bia[, ]*)?(?:r[ée]p[èée]te|redis|non|oui|c.est bon|très bien|corrig\p{L}*|il faut dire|tu dois dire|dis plutôt)\b/iu.test(x.texte);
   const repeteExactement=tours[j+1]&&['bia','assistant'].includes(tours[j+1].role)&&tours[j+1].texte===x.texte;
   if(!controle&&!repeteExactement&&x.texte!==phrase)return;
  }
  let j=i-1;while(j>=0&&!['bia','assistant'].includes(tours[j].role))j--;
  if(j<0||!tours[j].texte||tours[j].texte===phrase)return;
  let k=j-1;while(k>=0&&tours[k].role!=='user')k--;
  return {ancienne:tours[j].texte,...(k>=0?{source:tours[k].texte}:{})};
 }
}
export function entreeLexicaleSimple(row:{application?:string|null;proposee?:string|null;auteur?:string|null}){
 if(row.application==='bia-apprentissage-v1'||/^(?:maitre-devoir|maitre-instruction|maitre-apprentissage)$/.test(row.auteur||''))return false;
 try{if(row.proposee&&typeof JSON.parse(row.proposee)==='object')return false;}catch{}
 return true;
}
