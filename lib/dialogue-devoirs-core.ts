import type {DevoirALire} from "./lecture-devoirs-core";
export type RepliqueApprise={id:string;wo:string;fr:string;role:"bia"|"personne"|"inconnu"};
export type DialogueAppris={id:string;titre:string;date:string;repliques:RepliqueApprise[]};
export type TourDialogue={role:string;text:string};
export const normaliserDialogue=(s:string)=>s.normalize("NFD").replace(/[\u0300-\u036f]/g,"").toLowerCase().replace(/[^\p{L}\p{N}]+/gu," ").trim();
const propre=(s:string)=>s.trim().replace(/^[#>*\s]+/,"").replace(/^[-–—]\s+/,"").replace(/\*\*/g,"").replace(/\s*\|\s*$/," ").trim();
const contenu=(s:string)=>s.replace(/^\s*(?:[A-Z]?\d{1,4}[.)\]:—-]\s+|[A-Z]?\d{1,4}\s+(?=(?:Wolof|Fran[cç]ais|WO|FR)\b))/,"").trim();
function roleEtTexte(s:string):{texte:string;role:RepliqueApprise["role"]}{
 const m=s.match(/^(BIA|assistante?|assistant|personne|utilisateur|client|toi|moi|A|B)\s*[:—-]\s*(.+)$/i);
 if(!m)return {texte:s,role:/^Bia[,! ]/i.test(s)?"personne":"inconnu"};
 return {texte:m[2],role:/^(bia|assistante?)$/i.test(m[1])?"bia":/^(personne|utilisateur|client|toi|moi)$/i.test(m[1])?"personne":"inconnu"};
}
/** Parse explicit bilingual labels/tables; never guess or translate missing text. */
export function analyserDevoir(d:DevoirALire):DialogueAppris{
 const lignes=d.texte.split(/\r?\n/);const titre=propre(lignes.find(l=>/\bDEVOIR\s*\d+/i.test(l))||lignes.find(l=>l.trim())||"").slice(0,240);
 const repliques:RepliqueApprise[]=[];
 const groupes:Array<{langue:"wo"|"fr";lignes:string[]}>=[];let groupe:typeof groupes[number]|null=null;
 const ajouter=(wo:string,fr:string)=>{
  const a=roleEtTexte(contenu(wo)),b=roleEtTexte(contenu(fr));
  if(!a.texte||!b.texte||a.texte.length>1800||b.texte.length>1800)return;
  const role=a.role!=="inconnu"?a.role:b.role;
  repliques.push({id:String(repliques.length),wo:a.texte,fr:b.texte,role});
 };
 for(const brut of lignes){
  let ligne=propre(brut);if(!ligne||/^[-|\s:]+$/.test(ligne))continue;
  if(ligne.includes("|")){
   const cells=ligne.replace(/^\|/,"").split("|").map(propre).filter(Boolean);
   if(cells.length>=2&&!cells.some(c=>/^(Wolof|Français|Francais|Num[eé]ro)$/i.test(c))){
    const n=cells.length;if(n===2||n===3&&/^\d+[.)]?$/.test(cells[0])){ajouter(cells[n-2],cells[n-1]);continue;}
   }
  }
  ligne=contenu(ligne);if(!ligne)continue;
  const label=ligne.match(/^(?:(?:🇸🇳|🇫🇷)\s*)?(Wolof|Fran[cç]ais|WO|FR)(?=\s|[:：—-]|$)\s*(?:[:：—-]\s*)?(.*)$/i);
  if(label){groupe={langue:/^(wo|wolof)$/i.test(label[1])?"wo":"fr",lignes:[]};groupes.push(groupe);if(label[2].trim())groupe.lignes.push(contenu(label[2]));continue;}
  if(/^(?:DEVOIR\b|EXERCICE\b|PARTIE\b|OBJECTIF\b|CONSIGNE\b|CORRECTION\b|DIALOGUE\b|\d+\s*$)/i.test(ligne)){groupe=null;continue;}
  if(groupe)groupe.lignes.push(contenu(ligne));
 }
 for(let i=0;i+1<groupes.length;i++){
  const a=groupes[i],b=groupes[i+1];if(a.langue===b.langue)continue;
  const wo=a.langue==="wo"?a:b,fr=a.langue==="fr"?a:b;
  if(wo.lignes.length===fr.lignes.length){for(let j=0;j<wo.lignes.length;j++)ajouter(wo.lignes[j],fr.lignes[j]);}
  // A wrapped bilingual line remains one source utterance, without rewriting.
  else if(wo.lignes.length&&fr.lignes.length)ajouter(wo.lignes.join("\n"),fr.lignes.join("\n"));
  i++;
 }
 return {id:d.id,titre,date:d.date,repliques};
}
export function indexerDevoirs(devoirs:DevoirALire[]){
 const derniers=new Map<string,DevoirALire>();
 for(const d of devoirs){
  const titre=d.texte.split(/\r?\n/).find(l=>/\bDEVOIR\s*\d+\b/i.test(l));const cle=titre?"devoir:"+normaliserDialogue(titre):d.id;
  const precedent=derniers.get(cle);if(!precedent||d.date>=precedent.date)derniers.set(cle,d);
 }
 return [...derniers.values()].map(analyserDevoir);
}
const outils=new Set("le la les de des du un une et est sont je tu il elle on que qui quoi pour avec dans sur pas mais donc alors aussi plus moins pourquoi comment quand quel quelle bonjour merci oui non ai as suis peux peut veux faire fait ce cette ces mon ma mes ton ta tes au aux en se me te lui nos notre etre avoir cela tout tous comme son sa ses par si bien depuis maintenant vraiment deja encore reponds moi toi toi meme bia sama sa bi yi la ci ak te rekk nga naa dama ma ngi ko am na ndax".split(" "));
function termes(s:string){
 const t=normaliserDialogue(s).replace(/\b(?:appels?|appeler|telephone|telephoner|messages?|sms|whatsapp)\b/g," message ").replace(/\b(?:cherie|copines?|copains?|petite amie|petit ami|partenaire|fiancee?)\b/g," copine ")
  .replace(/\b(?:etudiant(?:e)?s?|eleves?|lyceen(?:ne)?s?)\b/g," etudiant ")
  .replace(/\b(?:commercant(?:e)?s?|vendeu(?:r|se)s?|boutiquier(?:e)?s?)\b/g," commerce ")
  .replace(/\b(?:marier|mariee?s?|mariages?)\b/g," mariage ");;
 return new Set(t.split(" ").filter(w=>w.length>=3&&!outils.has(w)));
}
export function contexteDialogue(historique:unknown):TourDialogue[]{
 if(!Array.isArray(historique))return [];
 return historique.filter(t=>t&&["user","bia","assistant"].includes(t.role)&&typeof t.text==="string").slice(-40).map(t=>({role:t.role==="user"?"user":"bia",text:t.text.slice(0,1800)}));
}
export function chercherDialogues(index:DialogueAppris[],question:string,history:TourDialogue[]){
 const q=termes(question),recent=termes(history.filter(t=>t.role==="user").slice(-2).map(t=>t.text).join(" "));
 const derniere=[...history].reverse().find(t=>t.role==="bia")?.text||"";
 const docs=index.filter(d=>d.repliques.length).map(d=>({d,mots:termes(d.titre+" "+d.repliques.map(p=>p.wo+" "+p.fr).join(" "))}));
 const df=new Map<string,number>();for(const doc of docs)for(const w of doc.mots)df.set(w,(df.get(w)||0)+1);
 return docs.map(({d,mots})=>{
  const titre=termes(d.titre);
  const actif=Boolean(derniere)&&d.repliques.some(p=>[p.wo,p.fr].some(t=>normaliserDialogue(t)===normaliserDialogue(derniere)));
  let score=0,accords=0;for(const mot of q)if(mots.has(mot)){accords++;score+=1+Math.log(1+docs.length/(df.get(mot)||1))+(titre.has(mot)?3:0);}
  if(actif){score+=5;for(const mot of recent)if(mots.has(mot))score+=1;}
  return {d,actif,score,accords};
 }).filter(x=>x.actif||x.accords>=2||x.accords>=1&&x.score>=3.5).sort((a,b)=>b.score-a.score).slice(0,3);
}
/** Bound the selector's context without cutting or rewriting a source utterance.
 * Keep neighbours of both the latest reply and the new topic's matching lines. */
export function paquetSelection(candidats:ReturnType<typeof chercherDialogues>,history:TourDialogue[],langue:"fr"|"wo",question=""){
 const deja=new Set(history.filter(t=>t.role==="bia").map(t=>normaliserDialogue(t.text)));
 const derniere=[...history].reverse().find(t=>t.role==="bia")?.text||"",mots=termes(question);
 return candidats.map((c,i)=>{
  const lignes=c.d.repliques,priorites=new Map<number,number>();
  const autour=(j:number,score:number)=>{for(let k=Math.max(0,j-2);k<Math.min(lignes.length,j+9);k++)priorites.set(k,Math.max(priorites.get(k)||0,score-Math.abs(k-j)));};
  lignes.forEach((p,j)=>{
   if([p.wo,p.fr].some(t=>normaliserDialogue(t)===normaliserDialogue(derniere)))autour(j,100);
   const termesLigne=termes(p.wo+" "+p.fr);const score=[...mots].filter(m=>termesLigne.has(m)).length;
   if(score)autour(j,30+score*4);
  });
  let taille=0;const limites=i===0?8000:4500;
  const retenues=lignes.map((p,j)=>({p,j})).sort((a,b)=>(priorites.get(b.j)||0)-(priorites.get(a.j)||0)||a.j-b.j).filter(({p})=>{
   const n=p.wo.length+p.fr.length+180;if(taille+n>limites)return false;taille+=n;return true;
  }).sort((a,b)=>a.j-b.j);
  return {id:String(i),titre:c.d.titre,actif:c.actif,repliques:retenues.map(({p})=>({
   id:i+":"+p.id,wo:p.wo,fr:p.fr,role:p.role,deja_dite:deja.has(normaliserDialogue(p.wo))||deja.has(normaliserDialogue(p.fr)),
   selectionnable:p.role!=="personne"&&(p[langue].match(/\?/g)||[]).length<=1,
  }))};
 });
}
export function resoudreSelection(verdict:unknown,paquet:ReturnType<typeof paquetSelection>,langue:"fr"|"wo"){
 const v=verdict as {statut?:string;id?:string};
 if(v?.statut==="hors_sujet")return {statut:"hors_sujet" as const};
 if(v?.statut!=="selection"||typeof v.id!=="string")return {statut:"clarifier" as const};
 for(const devoir of paquet){const p=devoir.repliques.find(p=>p.id===v.id);
  if(p&&p.selectionnable&&!p.deja_dite)return {statut:"selection" as const,reply:p[langue],id:p.id};}
 return {statut:"clarifier" as const};
}
