const norm=(s:string)=>s.normalize("NFC").toLowerCase().replace(/[.,!?;:]/g,"").replace(/\s+/g," ").trim();
const tokens=(s:string)=>norm(s).match(/[\p{L}\p{M}\p{N}'’-]+/gu)||[];
const distance=(a:string,b:string)=>{let p=Array.from({length:b.length+1},(_,i)=>i);for(let i=1;i<=a.length;i++){const r=[i];for(let j=1;j<=b.length;j++)r[j]=Math.min(r[j-1]+1,p[j]+1,p[j-1]+Number(a[i-1]!==b[j-1]));p=r;}return p[b.length];};
export function phrasesDevoirsValides(blocs:Array<{id:string;index:number;total:number;texte:string;statut?:string;date_validation?:string}>,wolofSeulement=false):string[]{
 const groups=new Map<string,typeof blocs>();for(const b of blocs){const g=groups.get(b.id)||[];if(!g.some(x=>x.index===b.index))g.push(b);groups.set(b.id,g);}
 const out=new Set<string>();
 for(const g of groups.values()){
  if(g.length!==g[0].total||!g.every(b=>b.total===g[0].total&&b.statut==="validé"&&b.date_validation))continue;
  const full=g.sort((a,b)=>a.index-b.index).map(b=>b.texte).join("\n");
  if(/^\s*(?:instruction|test|règle|regle|consigne)\b/i.test(full))continue;
  const lines=full.split("\n");
  for(let line of lines){
   line=line.trim();if(!line||/^(devoir|exercice|instruction|test|regle|règle|consigne|objectif|partie|correction)\b/i.test(line))continue;
   const labelled=line.match(/^(?:wolof|français|francais)\s*:\s*(.+)$/i);
   if(labelled){if(wolofSeulement&&!/^wolof\s*:/i.test(line))continue;line=labelled[1];}else if(/^[A-ZÀ-Ÿ\s—-]{8,}$/.test(line)||line.endsWith(":"))continue;
   line=line.replace(/^(?:[A-Z]?\d+[.)—:-]?\s+)/,"").trim();
   if(line.length>=3)out.add(line);
  }
 }
 return [...out];
}
export function propositionsLexique(texte:string,candidats:string[],budgetMs?:number):string[]{
 const fin=budgetMs===undefined?Infinity:Date.now()+Math.max(0,budgetMs);
 const a=tokens(texte);if(!a.length||a.length>80)return [];
 const negatives=(w:string[])=>w.filter(x=>["pas","non","jamais","sans","ne","amul","bul","deedeet","déedéet","du","duma"].includes(x)).join("|");
 const digits=(s:string)=>s.match(/\d+/g)?.join("|")||"";
 if(candidats.some(c=>norm(c)===norm(texte)))return [];
 const rows=[];
 for(const c of new Set(candidats)){
  if(Date.now()>fin)return [];
  const b=tokens(c);if(b.length!==a.length||digits(c)!==digits(texte)||negatives(b)!==negatives(a))continue;
  let changed=0,cost=0;let safe=true;
  for(let i=0;i<a.length;i++){
   if(a[i]===b[i])continue;
   changed++;const d=distance(a[i],b[i]);cost+=d;
   if(a[i].length<4||b[i].length<4||d>Math.max(1,Math.floor(Math.max(a[i].length,b[i].length)*.25))){safe=false;break;}
  }
  if(safe&&changed>0&&changed<=2&&changed<=Math.max(1,Math.floor(a.length*.3)))rows.push({c,cost});
 }
 // Match a word inside a new sentence only when a validated neighbour agrees.
 const known=new Set<string>();const contexts=new Map<string,Set<string>>();
 for(const sentence of candidats){if(Date.now()>fin)return [];const words=tokens(sentence);for(let i=0;i<words.length;i++){
  const w=words[i];known.add(w);const around=contexts.get(w)||new Set<string>();
  if(i>0)around.add("left:"+words[i-1]);if(i+1<words.length)around.add("right:"+words[i+1]);contexts.set(w,around);
 }}
 if(a.length>=3)for(let i=0;i<a.length;i++){
  const heard=a[i];if(known.has(heard)||heard.length<4||/\d/.test(heard))continue;
  for(const [word,around]of contexts){
   if(Date.now()>fin)return [];
   if(word.length<4||Math.abs(word.length-heard.length)>1||/\d/.test(word))continue;
   if(!(i>0&&around.has("left:"+a[i-1]))&&!(i+1<a.length&&around.has("right:"+a[i+1])))continue;
   const d=distance(heard,word);if(d!==1)continue;
   let position=-1;
   const proposal=texte.replace(/[\p{L}\p{M}\p{N}'’-]+/gu,m=>{position++;return position===i?word:m;});
   rows.push({c:proposal,cost:d+1});
  }
 }
 return [...new Set(rows.sort((x,y)=>x.cost-y.cost).map(x=>x.c))].slice(0,3);
}
