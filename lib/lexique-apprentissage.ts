import { ajouterCorrection, lexiqueConfig } from "./lexique";
import { reglesPrononciation } from "./prononciation";
import { APP_LECONS, dernieresLecons, appliquerRegles, type Lecon } from "./lexique-apprentissage-core";
let cache:{lecons:Lecon[];expires:number}|null=null;
export async function lireLecons(force=false):Promise<Lecon[]> {
  if(!force&&cache&&cache.expires>Date.now())return cache.lecons;
  if(!lexiqueConfig.actif)throw new Error("Mémoire Supabase non configurée");
  const rows:Array<{proposee:string}>=[];
  for(let offset=0;;offset+=500){
    const r=await fetch(`${lexiqueConfig.url}/rest/v1/${lexiqueConfig.table}?select=proposee&application=eq.${APP_LECONS}&order=id.desc&limit=500&offset=${offset}`,{
      headers:{apikey:lexiqueConfig.cle,Authorization:`Bearer ${lexiqueConfig.cle}`},cache:"no-store",signal:AbortSignal.timeout(8000)});
    if(!r.ok)throw new Error(`Lecture du lexique refusée (${r.status})`);
    const page=await r.json();if(!Array.isArray(page))throw new Error("Lexique invalide");rows.push(...page);if(page.length<500)break;
  }
  const lecons=dernieresLecons(rows);cache={lecons,expires:Date.now()+15000};return lecons;
}
export async function garderLecon(lecon:Lecon) {
  if(!lexiqueConfig.actif)throw new Error("Mémoire Supabase non configurée");
  // Versioned metadata uses the existing lexicon's text column: no second table,
  // no schema migration, and old consumers exclude this application namespace.
  await ajouterCorrection({source:lecon.texte,corrigee:lecon.texte,langue:lecon.langue,
    auteur:"maitre-apprentissage",application:APP_LECONS,proposee:JSON.stringify({version:1,lecon})});
  cache=null;
}
export async function prononciationsApprises(texte:string,langue:"fr"|"wo") {
  const [lecons,anciennes]=await Promise.all([lireLecons(),reglesPrononciation()]);
  const pertinentes=lecons.filter(l=>l.langue===langue);
  // A latest uncertain/rejected entry masks any older rule for the same word.
  const mots=new Set(pertinentes.map(l=>l.texte.toLowerCase()));
  return appliquerRegles(texte,[...pertinentes.filter(l=>l.statut==="validé").map(l=>({mot:l.texte,dire:l.prononciation})),
    ...anciennes.filter(r=>!mots.has(r.mot.toLowerCase()))]);
}
void lireLecons().catch(()=>{});
