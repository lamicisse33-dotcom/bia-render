import {lireCatalogueMemoire} from './memoire-organisee';
import {fusionnerMemoire} from './memoire-commune-core';
import {referenceApprisePourTour,resumeReferencesApprises} from './dialogue-devoirs-core';
const g=globalThis as typeof globalThis&{biaPerformanceReferences?:{rapport:any;travail?:Promise<void>}};
const etat=g.biaPerformanceReferences??={rapport:null};
export const resumePerformanceReferences=()=>etat.rapport;
/** Fixed read-only comparison on existing private sources. No model, voice,
 * saved answer, source edit or private text in the public numeric report. */
export function verifierPerformanceReferences(){return etat.travail??=(async()=>{
 const debut=Date.now(),rapport:any={statut:'en_cours',date:new Date().toISOString(),version:(process.env.RENDER_GIT_COMMIT||'').slice(0,12),perimetre:'Filtrage des références uniquement, pas le délai du téléphone. Même contenu, réanalyse forcée puis réutilisation.',tours:[]};etat.rapport=rapport;
 try{
  const catalogue=await lireCatalogueMemoire();
  const sources=fusionnerMemoire(catalogue.elements).filter(d=>/^(?:devoirs|lexique_partage|biba|anciennes_lecons|corrections):/.test(d.id)&&d.texte.length<=32000).sort((a,b)=>b.texte.length-a.texte.length).slice(0,48);
  rapport.sources=sources.length;
  const history=[{role:'user',text:'Je vais au restaurant ce soir en ville.'},{role:'bia',text:'Qu’est-ce que tu veux manger ?'}];
  for(const question of ['Du poisson et des tomates.','Je veux organiser mes études.']){
   const calculer=(force:boolean)=>sources.map(d=>referenceApprisePourTour(d.texte,question,history,force));
   calculer(false);
   for(let i=0;i<3;i++){
    if(Date.now()-debut>10000)throw Error('limite');
    let avant:string[],apres:string[],t=performance.now(),avantMs:number,apresMs:number;
    if(i%2===0){avant=calculer(true);avantMs=performance.now()-t;t=performance.now();apres=calculer(false);apresMs=performance.now()-t;}
    else{apres=calculer(false);apresMs=performance.now()-t;t=performance.now();avant=calculer(true);avantMs=performance.now()-t;}
    rapport.tours.push({reanalyse_ms:Math.round(avantMs*100)/100,reutilisation_ms:Math.round(apresMs*100)/100,identique:JSON.stringify(avant)===JSON.stringify(apres)});
   }
  }
  const mediane=(n:number[])=>{const a=n.sort((a,b)=>a-b);return (a[(a.length-1)>>1]+a[a.length>>1])/2;};
  rapport.medianes={reanalyse_ms:mediane(rapport.tours.map((t:any)=>t.reanalyse_ms)),reutilisation_ms:mediane(rapport.tours.map((t:any)=>t.reutilisation_ms))};
  rapport.statut=sources.length&&rapport.tours.every((t:any)=>t.identique)?'termine':'a_verifier';
  rapport.cache=resumeReferencesApprises().preparation;
 }catch{rapport.statut='a_verifier';}
 rapport.fin=new Date().toISOString();
})();}
