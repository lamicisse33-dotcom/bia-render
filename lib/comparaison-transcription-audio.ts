/** Indicative word alignment against the fixed synthetic reference. Never
 * treats ASR agreement as proof of audible fidelity or returns ASR-only words. */
export function motsComparaisonAudio(texte:string){
 return texte.normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().match(/[\p{L}\p{N}]+/gu)||[];
}
export function comparerTranscriptionAudio(reference:string,transcription:string){
 const a=motsComparaisonAudio(reference),b=motsComparaisonAudio(transcription);
 if(a.length>200||b.length>400)throw Error('comparaison_trop_longue');
 const d=Array.from({length:a.length+1},(_,i)=>Array.from({length:b.length+1},(_,j)=>i===0?j:j===0?i:0));
 for(let i=1;i<=a.length;i++)for(let j=1;j<=b.length;j++)d[i][j]=Math.min(d[i-1][j]+1,d[i][j-1]+1,d[i-1][j-1]+Number(a[i-1]!==b[j-1]));
 let i=a.length,j=b.length,suppressions=0,insertions=0,substitutions=0;const absents:number[]=[];
 while(i||j){
  if(i&&j&&a[i-1]===b[j-1]){i--;j--;}
  else if(i&&j&&d[i][j]===d[i-1][j-1]+1){substitutions++;absents.push(--i);j--;}
  else if(i&&d[i][j]===d[i-1][j]+1){suppressions++;absents.push(--i);}
  else{insertions++;j--;}
 }
 return {mots_reference:a.length,mots_reconnus:b.length,distance_mots:d[a.length][b.length],
  suppressions,insertions,substitutions,identique_normalise:d[a.length][b.length]===0,
  mots_reference_non_retrouves:absents.reverse().map(n=>a[n]),validation_humaine:false};
}
