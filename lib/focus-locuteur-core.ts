/** Conservative speaker verification, never an access/authentication decision. */
export function ressemblanceVoix(a:ArrayLike<number>,b:ArrayLike<number>){
 if(a.length!==192||b.length!==192)return null;
 let ab=0,aa=0,bb=0;
 for(let i=0;i<a.length;i++){
  if(!Number.isFinite(a[i])||!Number.isFinite(b[i]))return null;
  ab+=a[i]*b[i];aa+=a[i]*a[i];bb+=b[i]*b[i];
 }
 return aa>0&&bb>0?ab/Math.sqrt(aa*bb):null;
}
export function verdictLocuteur(score:number|null):'meme'|'autre'|'incertain'{
 return score===null?'incertain':score>=.45?'meme':score<.2?'autre':'incertain';
}
