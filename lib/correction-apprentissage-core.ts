import {correctionProche,reparerEspacesConnus} from './transcription-contexte-core';
export type PassageCorrige={debut:number;fin:number;avant:string;apres:string};
const cle=(s:string)=>s.normalize('NFD').replace(/\p{M}/gu,'').toLowerCase().replace(/kh/g,'x');
/** Only unambiguous spelling variants of validated words; never fuzzy sentences. */
export function corrigerTexteApprentissage(texte:string,phrases:string[],regles:Array<{entendu:string;corrige:string}>){
 const proches=(a:string,b:string)=>{if(Math.abs(a.length-b.length)>1)return false;if(a.length===b.length)return [...a].filter((x,i)=>x!==b[i]).length===1;const [long,court]=a.length>b.length?[a,b]:[b,a];let i=0;while(i<court.length&&long[i]===court[i])i++;return long.slice(i+1)===court.slice(i);};
 const voisins=new Map<string,Set<string>>();
 for(const phrase of phrases){const mots=phrase.toLowerCase().match(/[\p{L}\p{M}]+/gu)||[];for(let i=0;i<mots.length;i++){const v=voisins.get(mots[i])||new Set<string>();if(i)v.add("g:"+mots[i-1]);if(i+1<mots.length)v.add("d:"+mots[i+1]);voisins.set(mots[i],v);}}
 const formes=new Map<string,Set<string>>(),connus=new Set<string>();
 for(const p of phrases)for(const w of p.normalize('NFC').match(/[\p{L}\p{M}]+/gu)||[]){
  connus.add(w.toLowerCase());if(w.length<3)continue;const k=cle(w),set=formes.get(k)||new Set<string>();set.add(w.toLowerCase());formes.set(k,set);
 }
 const passages:PassageCorrige[]=[];let sortie='';
 for(const ligne of texte.split(/(?<=\n)/u)){
  let apres=ligne;
  // Explicit French lines, commands and identifiers are never rewritten.
  if(!/^\s*(?:Français|Francais|INSTRUCTION|TEST|MÉMORISATION|MEMORISATION|BIA-[A-Z]+-\d+)\s*[:\-]?/iu.test(ligne)){
   for(const r of regles){if(!correctionProche(r.entendu,r.corrige))continue;
    const motif=r.entendu.replace(/[.*+?^${}()|[\]\\]/g,'\\$&');
    apres=apres.replace(new RegExp(`(?<![\\p{L}\\p{M}\\p{N}])${motif}(?![\\p{L}\\p{M}\\p{N}])`,'giu'),r.corrige);
   }
   apres=apres.replace(/[\p{L}\p{M}]+/gu,w=>{
    if(connus.has(w.toLowerCase())||w.length<3)return w;
    const options=[...(formes.get(cle(w))||[])];if(options.length!==1)return w;
    let c=options[0];if(/^\p{Lu}/u.test(w))c=c[0].toUpperCase()+c.slice(1);
    return correctionProche(w,c)?c:w;
   });
   const mots=apres.match(/[\p{L}\p{M}]+/gu)||[];let index=-1;
   apres=apres.replace(/[\p{L}\p{M}]+/gu,w=>{
    index++;if(connus.has(w.toLowerCase())||w.length<4)return w;
    const options=[...voisins].filter(([c,v])=>proches(w.toLowerCase(),c)&&correctionProche(w,c)&&((index>0&&v.has('g:'+mots[index-1].toLowerCase()))||(index+1<mots.length&&v.has('d:'+mots[index+1].toLowerCase())))).map(([c])=>c);
    return options.length===1?options[0]:w;
   });
   apres=reparerEspacesConnus(apres,phrases);
  }
  if(apres!==ligne){let a=0,b=ligne.length,c=apres.length;
   while(a<b&&a<c&&ligne[a]===apres[a])a++;
   while(b>a&&c>a&&ligne[b-1]===apres[c-1]){b--;c--;}
   passages.push({debut:sortie.length+a,fin:sortie.length+c,avant:ligne.slice(a,b),apres:apres.slice(a,c)});
  }
  sortie+=apres;
 }
 return {texte:sortie,passages};
}
