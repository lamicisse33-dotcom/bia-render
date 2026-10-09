import { ajouterCorrection, lexiqueConfig } from "./lexique";
import { reglesPrononciation } from "./prononciation";
import { APP_LECONS, dernieresLecons, appliquerRegles, reglesLeconsMixtes, type Lecon } from "./lexique-apprentissage-core";
let cache:{lecons:Lecon[];expires:number}|null=null;
let lectureEnCours:Promise<Lecon[]>|null=null;
let revision=0;
function invaliderLecons(){revision++;cache=null;lectureEnCours=null;}
export function lireLecons(force=false):Promise<Lecon[]> {
  if(!force&&cache&&cache.expires>Date.now())return Promise.resolve(cache.lecons);
  if(lectureEnCours)return lectureEnCours;
  const version=revision;
  const lecture=chargerLecons().then(lecons=>{
    if(version===revision)cache={lecons,expires:Date.now()+15000};
    return lecons;
  }).finally(()=>{if(lectureEnCours===lecture)lectureEnCours=null;});
  lectureEnCours=lecture;
  return lecture;
}
async function chargerLecons():Promise<Lecon[]> {
  if(!lexiqueConfig.actif)throw new Error("Mémoire Supabase non configurée");
  const rows:Array<{proposee:string}>=[];
  for(let offset=0;;offset+=500){
    const r=await fetch(`${lexiqueConfig.url}/rest/v1/${lexiqueConfig.table}?select=proposee&application=eq.${APP_LECONS}&order=id.desc&limit=500&offset=${offset}`,{
      headers:{apikey:lexiqueConfig.cle,Authorization:`Bearer ${lexiqueConfig.cle}`},cache:"no-store",signal:AbortSignal.timeout(8000)});
    if(!r.ok)throw new Error(`Lecture du lexique refusée (${r.status})`);
    const page=await r.json();if(!Array.isArray(page))throw new Error("Lexique invalide");rows.push(...page);if(page.length<500)break;
  }
  return dernieresLecons(rows);
}
export async function garderLecon(lecon:Lecon) {
  if(!lexiqueConfig.actif)throw new Error("Mémoire Supabase non configurée");
  // Versioned metadata uses the existing lexicon's text column: no second table,
  // no schema migration, and old consumers exclude this application namespace.
  await ajouterCorrection({source:lecon.texte,corrigee:lecon.texte,langue:lecon.langue,
    auteur:"maitre-apprentissage",application:APP_LECONS,proposee:JSON.stringify({version:1,lecon})});
  invaliderLecons();
}
export async function prononciationsApprises(texte:string,langue:"fr"|"wo") {
  const [lecons,anciennes]=await Promise.all([lireLecons(),reglesPrononciation()]);
  return appliquerRegles(texte,reglesLeconsMixtes(lecons,langue,anciennes));
}
void lireLecons().catch(()=>{});

/** Internal diagnostic: a unique, never-validated record is read back and
 * removed by exact source+author. It never changes a user's correction. */
export async function verifierPersistance() {
  if(!lexiqueConfig.actif)throw new Error("Supabase absent");
  const source=`KHALAM_CONTROLE_${crypto.randomUUID()}`;
  const lecon:Lecon={texte:source,langue:"fr",prononciation:"contrôle",exemple:"Vérification de persistance",statut:"incertain",date:new Date().toISOString(),date_validation:null};
  const headers={apikey:lexiqueConfig.cle,Authorization:`Bearer ${lexiqueConfig.cle}`,"content-type":"application/json"};
  const base=`${lexiqueConfig.url}/rest/v1/${lexiqueConfig.table}`;
  const filtre=`source=eq.${encodeURIComponent(source)}&auteur=eq.controle-technique&application=eq.${APP_LECONS}`;
  try {
    const write=await fetch(base,{method:"POST",headers,body:JSON.stringify([{source,corrigee:source,langue:"fr",auteur:"controle-technique",application:APP_LECONS,proposee:JSON.stringify({version:1,lecon})}]),signal:AbortSignal.timeout(8000)});
    if(!write.ok)throw new Error(`Écriture ${write.status}`);
    const read=await fetch(`${base}?select=proposee&${filtre}`,{headers,cache:"no-store",signal:AbortSignal.timeout(8000)});
    if(!read.ok)throw new Error(`Relecture ${read.status}`);
    const rows=await read.json();if(rows.length!==1||JSON.stringify(JSON.parse(rows[0].proposee).lecon)!==JSON.stringify(lecon))throw new Error("Relecture différente");
    return {ecriture:true,relecture:true,champs:7,statut_test:"incertain"};
  } finally {
    const clean=await fetch(`${base}?${filtre}`,{method:"DELETE",headers,signal:AbortSignal.timeout(8000)});
    invaliderLecons();if(!clean.ok)throw new Error("Nettoyage du contrôle à vérifier");
  }
}
