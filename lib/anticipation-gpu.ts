/** Only one GPU operation runs at a time. Continuous voice yields between
 * complete clips, so queued ASR can release the speech gate before the tail. */
type TypeTravail='ecoute'|'audio'|'autre';
type Mesure={type:TypeTravail;attente_ms:number;execution_ms:number;ok:boolean;quand:string};
type Compte={termines:number;erreurs:number;annules:number};
type Job={priorite:number;run:()=>Promise<unknown>;resolve:(v:any)=>void;reject:(e:unknown)=>void;debut:number;type:TypeTravail;signal?:AbortSignal;annuler?:()=>void};
const g=globalThis as typeof globalThis&{biaFileAnticipation?:{jobs:Job[];occupe:boolean;mesures?:Mesure[];types?:Record<TypeTravail,Compte>}};
const etat=g.biaFileAnticipation??={jobs:[],occupe:false};const jobs=etat.jobs;
const compte=(type:TypeTravail)=>((etat.types??={} as Record<TypeTravail,Compte>)[type]??={termines:0,erreurs:0,annules:0});
export function resumeFileAnticipation(){return {revision:'morceaux-priorite-ecoute-v1',occupe:etat.occupe,en_attente:jobs.length,types:etat.types||{},derniers:etat.mesures||[]};}
async function vider(){
 if(etat.occupe)return;etat.occupe=true;
 try{while(jobs.length){
  jobs.sort((a,b)=>b.priorite-a.priorite);const j=jobs.shift()!;
  if(j.annuler)j.signal?.removeEventListener('abort',j.annuler);
  if(j.signal?.aborted){compte(j.type).annules++;j.reject(j.signal.reason||Error('Annulé'));continue;}
  const depart=Date.now();let ok=false;
  try{j.resolve(await j.run());ok=true;compte(j.type).termines++;}
  catch(e){compte(j.type).erreurs++;j.reject(e);}
  finally{etat.mesures=[...(etat.mesures||[]).slice(-29),{type:j.type,attente_ms:depart-j.debut,execution_ms:Date.now()-depart,ok,quand:new Date().toISOString()}];}
 }}finally{etat.occupe=false;}
}
export function gpuAnticipation<T>(run:()=>Promise<T>,priorite=1,o:{signal?:AbortSignal;type?:TypeTravail}={}):Promise<T>{
 if(o.signal?.aborted)return Promise.reject(o.signal.reason||Error('Annulé'));
 if(jobs.length>=20)return Promise.reject(Error('File occupée'));
 return new Promise((resolve,reject)=>{
  const j:Job={run,priorite,resolve,reject,debut:Date.now(),type:o.type||'autre',signal:o.signal};
  j.annuler=()=>{const index=jobs.indexOf(j);if(index<0)return;jobs.splice(index,1);j.signal?.removeEventListener('abort',j.annuler!);compte(j.type).annules++;reject(j.signal?.reason||Error('Annulé'));};
  jobs.push(j);j.signal?.addEventListener('abort',j.annuler,{once:true});void vider();
 });
}
