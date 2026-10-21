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
  if(!tours.slice(i).some(x=>x.texte===phrase||x.texte.endsWith(': '+phrase)))continue;
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
