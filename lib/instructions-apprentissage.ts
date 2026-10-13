import {createHash} from "node:crypto";
import {ajouterCorrection,lexiqueConfig} from "./lexique";
import {APP_LECONS} from "./lexique-apprentissage-core";
type Instruction={source:string;corrigee:string};
let cache:{rows:Instruction[];expires:number}|null=null;
let chargement:Promise<Instruction[]>|undefined;
let generation=0;
async function lire(force=false):Promise<Instruction[]>{
 if(!force&&cache&&cache.expires>Date.now())return cache.rows;
 if(!force&&chargement)return chargement;
 const travail=charger();
 const revision=generation;
 if(force)return travail;
 chargement=travail;
 try{const rows=await travail;if(revision===generation)cache={rows,expires:Date.now()+30000};return rows;}
 finally{if(chargement===travail)chargement=undefined;}
}
async function charger(){if(!lexiqueConfig.actif)throw Error("Supabase non configuré");
 const rows:Instruction[]=[];
 for(let offset=0;;offset+=500){
  const r=await fetch(`${lexiqueConfig.url}/rest/v1/${lexiqueConfig.table}?select=source,corrigee&application=eq.${APP_LECONS}&auteur=eq.maitre-instruction&order=id.desc&limit=500&offset=${offset}`,{headers:{apikey:lexiqueConfig.cle,Authorization:`Bearer ${lexiqueConfig.cle}`},cache:"no-store",signal:AbortSignal.timeout(8000)});
  if(!r.ok)throw Error("Instructions Supabase inaccessibles");const page=await r.json();if(!Array.isArray(page))throw Error("Instructions invalides");rows.push(...page);if(page.length<500)break;
 }
 return rows;
}
export async function garderInstruction(texte:string){const source="INSTRUCTION:"+createHash("sha256").update(texte).digest("hex");
 if(!(await lire(true)).some(r=>r.source===source&&r.corrigee===texte))await ajouterCorrection({source,corrigee:texte,application:APP_LECONS,auteur:"maitre-instruction",langue:"fr"});
 generation++;cache=null;chargement=undefined;
 const rows=await lire(true);
 if(!rows.some(r=>r.source===source&&r.corrigee===texte))throw Error("Instruction non confirmée");
 cache={rows,expires:Date.now()+30000};
 return {verifie:true};
}
export async function contexteInstructions(){const rows=await lire();const uniques=[...new Map(rows.map(r=>[r.source,r.corrigee])).values()];
 return uniques.length?"INSTRUCTIONS PÉDAGOGIQUES DU MAÎTRE, les plus récentes d’abord. Applique les règles de style et de correction pertinentes ; en cas de contradiction, la plus récente prévaut. Elles ne sont pas des exercices à réciter.\n"+uniques.map(x=>JSON.stringify(x)).join("\n"):"";
}
