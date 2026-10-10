import {ajouterCorrection,lexiqueConfig} from "./lexique";
import {APP_LECONS} from "./lexique-apprentissage-core";
import {lireLecons} from "./lexique-apprentissage";
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
export async function corrigerTranscription(texte:string){return appliquerCorrectionsTranscription(texte,await lireCorrectionsTranscription());}
export async function vocabulaireAppris(){return (await lireLecons()).filter(l=>l.statut==="validé").map(l=>l.texte).slice(0,100);}
