export type FicheConnaissance={id:string;titre:string;origine:string;texte:string;historique?:boolean};
export type PassageFiche=FicheConnaissance&{passage:string;rang:number};
const normal=(s:string)=>s.normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[’']/g,' ').replace(/\bdd[ .-]*sking?\b/g,'dd skin').replace(/\b(?:apps?|applis)\b/g,'applications').replace(/[^\p{L}\p{N}]+/gu,' ').trim();
const vides=new Set('avec dans pour comme cette ceux leur leurs suis faire dit vous nous quel quelle quels quelles comment pourquoi est sont que qui quoi les des une un sur par pas plus aux du de le la et en au ce ma me mon mes tes ton tu je il elle ils elles on ne se ses sa son merci bonjour bia'.split(' '));
const termes=(s:string)=>new Set(normal(s).split(' ').filter(m=>m.length>=3&&!vides.has(m)));
/** Keep complete paragraphs / QA pairs. No first-N-characters truncation:
 * every paragraph remains searchable regardless of its position in the file. */
export function passagesFiches(fiches:FicheConnaissance[]):PassageFiche[]{
 return fiches.flatMap(f=>{
  const sections=f.texte.split(/\n(?=#{1,3} )/);let rang=0;
  return sections.flatMap(section=>{
   const titre=section.match(/^#{1,3}\s+(.+)/)?.[1]||f.titre;
   const blocs=section.length<=3200?[section]:section.split(/\n\s*\n|\n(?=[^\n]{8,180}\?\s*\n)/);
   return blocs.filter(b=>b.trim()).map(p=>({...f,titre:f.titre+' — '+titre,passage:p.trim(),rang:rang++}));
  });
 });
}
export function indexerFiches(fiches:FicheConnaissance[]){
 const passages=passagesFiches(fiches),frequences=new Map<string,number>();
 for(const p of passages)for(const m of termes(p.passage))frequences.set(m,(frequences.get(m)||0)+1);
 return {source:fiches,passages,frequences,documents:passages.map(p=>({p,mots:termes(p.passage+' '+p.titre),titre:termes(p.titre)}))};
}
export function selectionnerFiches(fiches:FicheConnaissance[],question:string,history:Array<{role:string;text?:string;content?:string}>=[],budget=6500,index?:ReturnType<typeof indexerFiches>){
 const q=termes(question),courte=q.size<3||/^(?:et |oui|non|combien|pourquoi|comment|quels?|quelles?)/.test(normal(question));
 const contexte=courte?termes(history.slice(-4).map(t=>t.text??t.content??'').join(' ')):new Set<string>();
 const {passages,frequences,documents}=index?.source===fiches?index:indexerFiches(fiches);
 const notes=documents.map(({p,mots,titre})=>{
  let score=0;
  for(const m of q)if(mots.has(m))score+=1+Math.log(1+passages.length/(frequences.get(m)||1))+(titre.has(m)?2:0);
  for(const m of contexte)if(mots.has(m))score+=.25;
  return {p,score};
 }).filter(x=>x.score>0).sort((a,b)=>b.score-a.score||Number(a.p.historique)-Number(b.p.historique)||a.p.rang-b.p.rang);
 let taille=0;const choisis:PassageFiche[]=[];
 for(const {p} of notes){const n=p.passage.length+p.titre.length+p.origine.length+120;if(n+taille>budget)continue;taille+=n;choisis.push(p);}
 return {passages:choisis,texte:choisis.map(p=>`[${p.id}:${p.rang}] ${p.titre}\nSource : ${p.origine}${p.historique?' — archive : projets et dates à interpréter à la date du document, sans les annoncer comme disponibles aujourd’hui.':''}\n${p.passage}`).join('\n\n'),total_passages:passages.length};
}
