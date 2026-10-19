const g=globalThis as typeof globalThis&{biaSpeechT5?:{preparations:number;generations:number;erreurs:number;lectures:number;dernier_ms:number}};
const etat=g.biaSpeechT5??={preparations:0,generations:0,erreurs:0,lectures:0,dernier_ms:0};
export function noterSpeechT5(etape:unknown,ms:unknown){
 if(etape==='pret')etat.preparations++;else if(etape==='generation'){etat.generations++;etat.dernier_ms=typeof ms==='number'&&Number.isFinite(ms)?Math.max(0,Math.min(ms,600000)):0;}
 else if(etape==='erreur')etat.erreurs++;else if(etape==='lecture')etat.lectures++;
}
export const resumeSpeechT5=()=>({disponible:true,experimental:true,choix_automatique:false,...etat});
