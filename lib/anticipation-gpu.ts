/** Speculative synthesis and incremental ASR are serialized; ASR has priority. */
type Job={priorite:number;run:()=>Promise<unknown>;resolve:(v:any)=>void;reject:(e:unknown)=>void};
const g=globalThis as typeof globalThis&{biaFileAnticipation?:{jobs:Job[];occupe:boolean}};
const etat=g.biaFileAnticipation??={jobs:[],occupe:false};const jobs=etat.jobs;
async function vider(){if(etat.occupe)return;etat.occupe=true;try{while(jobs.length){jobs.sort((a,b)=>b.priorite-a.priorite);const j=jobs.shift()!;try{j.resolve(await j.run());}catch(e){j.reject(e);}}}finally{etat.occupe=false;}}
export function gpuAnticipation<T>(run:()=>Promise<T>,priorite=1):Promise<T>{if(jobs.length>=20)return Promise.reject(Error('File occupée'));return new Promise((resolve,reject)=>{jobs.push({run,priorite,resolve,reject});void vider();});}
