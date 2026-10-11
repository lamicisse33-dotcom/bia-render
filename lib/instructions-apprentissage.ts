import {createHash} from "node:crypto";
import {ajouterCorrection,lexiqueConfig} from "./lexique";
import {APP_LECONS} from "./lexique-apprentissage-core";
async function lire(){if(!lexiqueConfig.actif)throw Error("Supabase non configuré");
 const r=await fetch(`${lexiqueConfig.url}/rest/v1/${lexiqueConfig.table}?select=source,corrigee&application=eq.${APP_LECONS}&auteur=eq.maitre-instruction&order=id.desc&limit=100`,{headers:{apikey:lexiqueConfig.cle,Authorization:`Bearer ${lexiqueConfig.cle}`},cache:"no-store",signal:AbortSignal.timeout(8000)});
 if(!r.ok)throw Error("Instructions Supabase inaccessibles");return await r.json() as Array<{source:string;corrigee:string}>;
}
export async function garderInstruction(texte:string){const source="INSTRUCTION:"+createHash("sha256").update(texte).digest("hex");
 if(!(await lire()).some(r=>r.source===source&&r.corrigee===texte))await ajouterCorrection({source,corrigee:texte,application:APP_LECONS,auteur:"maitre-instruction",langue:"fr"});
 if(!(await lire()).some(r=>r.source===source&&r.corrigee===texte))throw Error("Instruction non confirmée");
 return {verifie:true};
}
export async function contexteInstructions(){const rows=await lire();const uniques=[...new Map(rows.map(r=>[r.source,r.corrigee])).values()];
 return uniques.length?"INSTRUCTIONS PÉDAGOGIQUES DU MAÎTRE, les plus récentes d’abord. Applique les règles de style et de correction pertinentes ; en cas de contradiction, la plus récente prévaut. Elles ne sont pas des exercices à réciter.\n"+uniques.map(x=>JSON.stringify(x)).join("\n"):"";
}
