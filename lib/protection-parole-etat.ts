const g=globalThis as typeof globalThis&{biaProtectionParole?:{retenues:number;annulees:number;derniere:unknown;captures:Record<string,number>;derniere_capture:unknown}};
const etat=g.biaProtectionParole??={retenues:0,annulees:0,derniere:null,captures:{},derniere_capture:null};
export const resumeProtectionParole=()=>({revision:'silence-avant-son-v1',...etat});
export function noterProtectionParole(d:Record<string,unknown>){
  if(d.type==='capture_progressive'){
    const etape=String(d.etape);
    if(!['branchee','indisponible','voix_incompatible','contexte_exclu','desactivee'].includes(etape))return;
    etat.captures[etape]=(etat.captures[etape]||0)+1;
    etat.derniere_capture={etape,quand:new Date().toISOString()};return;
  }
  const ms=Number(d.ms);if(!Number.isFinite(ms)||ms<0||ms>600000)return;
  if(d.etape==='retenue')etat.retenues++;else if(d.etape==='annulee')etat.annulees++;else return;
  etat.derniere={etape:d.etape,ms,quand:new Date().toISOString()};
}
