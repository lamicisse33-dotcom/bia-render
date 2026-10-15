// Durations only: no question, lesson, personal memory or credential is exposed.
type Mesure={nom:string;ms:number;ok:boolean;quand:string};
const g=globalThis as typeof globalThis&{biaProfilPreparation?:{mesures:Mesure[];diagnostic:unknown;essai?:Promise<void>}};
const etat=g.biaProfilPreparation??={mesures:[],diagnostic:null};
export async function chronometrerPreparation<T>(nom:string,lire:()=>Promise<T>):Promise<T>{
 const debut=performance.now();let ok=false;
 try{const r=await lire();ok=true;return r;}
 finally{etat.mesures.push({nom,ms:Math.round(performance.now()-debut),ok,quand:new Date().toISOString()});etat.mesures=etat.mesures.slice(-160);}
}
export function resumeProfilPreparation(){return {mesures:etat.mesures.slice(-60),diagnostic:etat.diagnostic};}
// Owner-requested, bounded read-only probe: no LLM, audio, chat or lesson writes.
export function verifierPreparation(){return etat.essai??=(async()=>{
 const {motsCorriges}=await import('./lexique');
 const {dialoguerAvecDevoirs,contexteMaitrises,choixDuTour}=await import('./dialogue-devoirs');
 const {contexteDevoirs}=await import('./devoirs-apprentissage');
 const {contexteInstructions}=await import('./instructions-apprentissage');
 const {fichesPourConversation}=await import('./fiches-connaissances');
 const {catalogue}=await import('./vitrine');
 const q='Je suis étudiant et je veux mieux organiser mes études.';
 const history=[{role:'user',text:'Je travaille aussi le soir.'},{role:'bia',text:'Quelles sont tes heures de cours ?'}];
 const tours=[];
 for(let i=0;i<3;i++){
  const mesures:Record<string,number>={};
  const lire=async(nom:string,fn:()=>Promise<unknown>)=>{const t=performance.now();await fn();mesures[nom]=Math.round(performance.now()-t);};
  const debut=performance.now();
  try{
   await lire('choix_cache',()=>dialoguerAvecDevoirs(q,history,{cacheSeulement:true,diagnostic:true}));
   await Promise.all([
    lire('mots_corriges',()=>motsCorriges()),lire('devoirs',()=>contexteDevoirs(q)),lire('instructions',()=>contexteInstructions()),
    lire('maitrises',()=>contexteMaitrises(q,history,3000)),lire('choix',()=>choixDuTour(q,history)),
    lire('fiches',()=>fichesPourConversation(q,history,3500)),lire('vitrine',()=>catalogue()),
   ]);
   tours.push({ms:Math.round(performance.now()-debut),mesures,ok:true});
  }catch{tours.push({ms:Math.round(performance.now()-debut),mesures,ok:false});}
 }
 const {contexteMemoireCommune}=await import('./memoire-organisee');
 const comparaison=[];
 for(const nom of ['mots_corriges','fiches']){
  try{
   const calculer=(force:boolean)=>nom==='mots_corriges'?motsCorriges(40,force):contexteMemoireCommune(q,history,3500,force);
   await calculer(false);
   const t=performance.now(),avant=await calculer(true),avantMs=performance.now()-t;
   const u=performance.now(),apres=await calculer(false),apresMs=performance.now()-u;
   comparaison.push({nom,recalcul_ms:Math.round(avantMs),reutilisation_ms:Math.round(apresMs),resultat_identique:JSON.stringify(avant)===JSON.stringify(apres)});
  }catch{comparaison.push({nom,indisponible:true});}
 }
 etat.diagnostic={comparaison,date:new Date().toISOString(),version:(process.env.RENDER_GIT_COMMIT||'').slice(0,12),perimetre:'Lectures de préparation réelles, sans cerveau, microphone ni voix. Premier tour puis deux réutilisations immédiates.',tours};
})();}
