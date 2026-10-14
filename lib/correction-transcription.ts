import {salutationAutonome} from "./salutations-dialogue";
import {phrasesApprisesDevoirs} from "./devoirs-apprentissage";
import {propositionsLexique} from "./comparaison-lexique-core";
import {ajouterCorrection,lexiqueConfig} from "./lexique";
import {APP_LECONS} from "./lexique-apprentissage-core";
import {lireLecons} from "./lexique-apprentissage";
import {lireCorrectionsBiba} from './biba-corrections';
import {lireLexiquePartage} from './lexique-partage';
type Regle={entendu:string;corrige:string;date:string};
let cache:{regles:Regle[];expires:number}|null=null;
const normaliser=(s:string)=>s.normalize("NFC").toLocaleLowerCase().replace(/\s+/gu," ").trim();
export async function lireCorrectionsTranscription():Promise<Regle[]>{
 if(!lexiqueConfig.actif)throw Error("Supabase absent");
 if(cache&&cache.expires>Date.now())return cache.regles;
 const regles:Regle[]=[];const seen=new Set<string>();
 for(let offset=0;;offset+=500){
  const r=await fetch(`${lexiqueConfig.url}/rest/v1/${lexiqueConfig.table}?select=proposee&application=eq.${APP_LECONS}&auteur=eq.maitre-transcription&order=id.desc&limit=500&offset=${offset}`,{headers:{apikey:lexiqueConfig.cle,Authorization:`Bearer ${lexiqueConfig.cle}`},cache:"no-store",signal:AbortSignal.timeout(4000)});
  if(!r.ok)throw Error("Corrections indisponibles");const rows=await r.json();
  for(const row of rows)try{const d=JSON.parse(row.proposee);const key=normaliser(d.entendu||"");if(d.version===3&&d.type==="transcription"&&key&&typeof d.corrige==="string"&&!seen.has(key)){seen.add(key);regles.push(d);}}catch{}
  if(rows.length<500)break;
 }
 cache={regles,expires:Date.now()+15000};return regles;
}
export async function garderCorrectionTranscription(entendu:string,corrige:string){
 if(!lexiqueConfig.actif)throw Error("Supabase absent");
 const d={version:3,type:"transcription",entendu,corrige,date:new Date().toISOString()};
 await ajouterCorrection({source:entendu,corrigee:corrige,proposee:JSON.stringify(d),auteur:"maitre-transcription",application:APP_LECONS,langue:"wo"});cache=null;
 const regles=await lireCorrectionsTranscription();if(!regles.some(r=>normaliser(r.entendu)===normaliser(entendu)&&r.corrige===corrige))throw Error("Correction non relue");
}
export function appliquerCorrectionsTranscription(texte:string,regles:Regle[]){
 const escape=(s:string)=>s.replace(/[.*+?^${}()|[\]\\]/g,"\\$&");
 const map=new Map<string,string>();for(const r of regles)if(!map.has(normaliser(r.entendu)))map.set(normaliser(r.entendu),r.corrige);
 const motifs=[...map.keys()].sort((a,b)=>b.length-a.length).map(s=>s.split(" ").map(escape).join("\\s+"));
 const corrections:Array<{entendu:string;corrige:string}>=[];
 const corrige=motifs.length?texte.normalize("NFC").replace(new RegExp(`(?<![\\p{L}\\p{M}\\p{N}])(?:${motifs.join("|")})(?![\\p{L}\\p{M}\\p{N}])`,"giu"),m=>{const c=map.get(normaliser(m))!;if(m!==c)corrections.push({entendu:m,corrige:c});return c;}):texte;
 return {texte:corrige,texte_brut:texte,corrections_transcription:corrections};
}
export const suggestionsEcriture=propositionsLexique;
export async function corrigerTranscription(texte:string,regles?:Regle[],phrasesEnCours?:Promise<string[]|null>,budgetSuggestions?:number){
 regles??=await lireCorrectionsTranscription();const resultat=appliquerCorrectionsTranscription(texte,regles);
 // An exact greeting needs the validated corrections, not a fuzzy search
 // through every homework phrase. Never discard the rest of a real request.
 if(salutationAutonome(resultat.texte))return {...resultat,suggestions_ecriture:[] as string[]};
 const lecons=await (phrasesEnCours||phrasesLexiqueComplet());if(!lecons)throw Error("Lexique indisponible");
 return {...resultat,suggestions_ecriture:suggestionsEcriture(resultat.texte,[...regles.map(r=>r.corrige),...lecons],budgetSuggestions)};
}
const gPhrases=globalThis as typeof globalThis&{biaReferencesTranscription?:Map<string,{phrases?:string[];expire:number;chargement?:Promise<string[]>}>;biaRevisionMemoire?:number;biaGenerationDevoirs?:number;biaGenerationPrononciation?:number};
const references:NonNullable<typeof gPhrases.biaReferencesTranscription>=gPhrases.biaReferencesTranscription??=new Map();
export async function phrasesLexiqueComplet(wolofSeulement=false):Promise<string[]>{
 const cle=JSON.stringify([wolofSeulement,gPhrases.biaRevisionMemoire||0,gPhrases.biaGenerationDevoirs||0,gPhrases.biaGenerationPrononciation||0]);
 let entree=references.get(cle);if(entree?.phrases&&entree.expire>Date.now())return entree.phrases;
 if(entree?.chargement)return entree.chargement;
 if(!entree){entree={expire:0};references.set(cle,entree);}const cible=entree;
 cible.chargement=chargerPhrasesLexique(wolofSeulement).then(phrases=>{cible.phrases=phrases;cible.expire=Date.now()+15000;return phrases;}).finally(()=>{cible.chargement=undefined;});
 for(const k of references.keys())if(k!==cle&&references.size>4)references.delete(k);
 return cible.chargement;
}
async function chargerPhrasesLexique(wolofSeulement=false){
 const resultats=await Promise.allSettled([lireLecons(),phrasesApprisesDevoirs(wolofSeulement),lireCorrectionsBiba(),lireLexiquePartage()]);
 const individuelles=resultats[0].status==="fulfilled"?resultats[0].value.filter(l=>l.statut==="validé"&&(!wolofSeulement||l.langue==="wo")).map(l=>l.texte):[];
 const devoirs=resultats[1].status==="fulfilled"?resultats[1].value:[];
 if(resultats.every(r=>r.status==="rejected"))throw Error("Lexique indisponible");
 const biba=resultats[2].status==='fulfilled'?resultats[2].value.map(r=>r.reponse_wo):[];
 const partage=resultats[3].status==='fulfilled'?resultats[3].value.flatMap(r=>wolofSeulement?[r.langue_source==='wo'?r.source:r.corrigee]:[r.source,r.corrigee]):[];
 return [...new Set([...individuelles,...devoirs,...biba,...partage])];
}
export async function vocabulaireAppris(){
 const phrases=await phrasesLexiqueComplet();
 return [...new Set(phrases.flatMap(p=>[p,...p.match(/[\p{L}\p{M}'’-]{3,}/gu)||[]]))];
}
