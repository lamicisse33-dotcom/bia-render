const g=globalThis as typeof globalThis&{biaContinuiteVoix?:{flux:number;clips:number;cache:number;erreurs:number;premier_morceau_ms:number|null;diagnostic?:unknown;essai?:Promise<unknown>}};
export const continuiteVoix=g.biaContinuiteVoix??={flux:0,clips:0,cache:0,erreurs:0,premier_morceau_ms:null};
export const resumeContinuiteVoix=()=>({flux:continuiteVoix.flux,clips:continuiteVoix.clips,cache:continuiteVoix.cache,erreurs:continuiteVoix.erreurs,premier_morceau_ms:continuiteVoix.premier_morceau_ms,diagnostic:continuiteVoix.diagnostic});
