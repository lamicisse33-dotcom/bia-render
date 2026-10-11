export type BlocDevoir={version:2;type:"devoir";id:string;index:number;total:number;texte:string;date:string;statut?:"validé";date_validation?:string;langue?:"fr"|"wo"};
export type DevoirALire={id:string;texte:string;langue:"fr"|"wo";valide:boolean;date:string};
/** Newest block wins (the database returns id.desc). Never read a partial lesson. */
export function assemblerDevoirs(blocs:BlocDevoir[]):{devoirs:DevoirALire[];incomplets:number}{
 const groupes=new Map<string,Map<number,BlocDevoir>>();
 for(const b of blocs){
  if(typeof b.id!=="string"||!Number.isSafeInteger(b.index)||!Number.isSafeInteger(b.total)||b.total<1||b.index<0||b.index>=b.total||typeof b.texte!=="string")continue;
  const g=groupes.get(b.id)||new Map<number,BlocDevoir>();if(!g.has(b.index))g.set(b.index,b);groupes.set(b.id,g);
 }
 const devoirs:DevoirALire[]=[];let incomplets=0;
 for(const [id,g] of groupes){
  const parts=[...g.values()].sort((a,b)=>a.index-b.index),first=parts[0];
  if(parts.length!==first.total||!parts.every((p,i)=>p.index===i&&p.total===first.total)){incomplets++;continue;}
  devoirs.push({id,texte:parts.map(p=>p.texte).join(""),langue:first.langue==="fr"?"fr":"wo",valide:parts.every(p=>p.statut==="validé"&&Boolean(p.date_validation)),date:first.date});
 }
 devoirs.sort((a,b)=>a.date.localeCompare(b.date)||a.id.localeCompare(b.id));
 return {devoirs,incomplets};
}
