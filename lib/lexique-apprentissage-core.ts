export type Lecon = {texte:string; langue:"fr"|"wo"; prononciation:string; exemple:string;
  statut:"validé"|"à corriger"|"incertain"; date_validation:string|null; date:string};
export const APP_LECONS="bia-apprentissage-v1";
export function validerLecon(b:Record<string,unknown>):Lecon {
  const texte=typeof b.texte==="string"?b.texte.trim():"";
  const prononciation=typeof b.prononciation==="string"?b.prononciation.trim():"";
  const exemple=typeof b.exemple==="string"?b.exemple.trim():"";
  if(!texte||texte.length>400||prononciation.length>400||exemple.length>2000)throw new Error("Texte ou prononciation trop longs ou manquants.");
  if(b.langue!=="fr"&&b.langue!=="wo")throw new Error("Choisis français ou wolof.");
  if(!["validé","à corriger","incertain"].includes(String(b.statut)))throw new Error("Statut requis.");
  if(b.statut==="validé"&&(!prononciation||b.validation_expresse!==true))throw new Error("Écoute puis confirme explicitement la prononciation avant de valider.");
  const date=new Date().toISOString();
  return {texte,prononciation,exemple,langue:b.langue,statut:b.statut as Lecon["statut"],date,date_validation:b.statut==="validé"?date:null};
}
export function dernieresLecons(rows:Array<{proposee?:string|null}>):Lecon[] {
  const seen=new Set<string>();const out:Lecon[]=[];
  for(const row of rows)try {const v=JSON.parse(row.proposee||"");
    if(v.version!==1||!v.lecon?.texte)continue;const l=v.lecon as Lecon;const key=l.langue+":"+l.texte;
    if(!seen.has(key)){seen.add(key);out.push(l);}
  }catch{}
  return out;
}
export function appliquerRegles(texte:string,regles:Array<{mot:string;dire:string}>):string {
  const uniques=new Map<string,{mot:string;dire:string}>();
  for(const r of regles)if(r.mot&&r.dire&&!uniques.has(r.mot.toLowerCase()))uniques.set(r.mot.toLowerCase(),r);
  const sorted=[...uniques.values()].sort((a,b)=>b.mot.length-a.mot.length);
  if(!sorted.length)return texte;
  const escape=(s:string)=>s.replace(/[.*+?^${}()|[\]\\]/g,"\\$&");
  const re=new RegExp(`(?<![\\p{L}\\p{M}\\p{N}])(?:${sorted.map(r=>escape(r.mot)).join("|")})(?![\\p{L}\\p{M}\\p{N}])`,"giu");
  return texte.replace(re,match=>uniques.get(match.toLowerCase())!.dire);
}

/** French lessons also apply inside urban Wolof. An explicit entry in the
 * requested language wins on homographs, including revoked/uncertain entries. */
export function reglesLeconsMixtes(lecons:Lecon[], langue:"fr"|"wo", anciennes:Array<{mot:string;dire:string}>) {
  const locales=lecons.filter(l=>l.langue===langue);
  const motsLocaux=new Set(locales.map(l=>l.texte.toLowerCase()));
  const emprunts=langue==="wo"?lecons.filter(l=>l.langue==="fr"&&!motsLocaux.has(l.texte.toLowerCase())):[];
  const pertinentes=[...locales,...emprunts];
  const reservees=new Set(pertinentes.map(l=>l.texte.toLowerCase()));
  return [...pertinentes.filter(l=>l.statut==="validé").map(l=>({mot:l.texte,dire:l.prononciation})),
    ...anciennes.filter(r=>!reservees.has(r.mot.toLowerCase()))];
}
