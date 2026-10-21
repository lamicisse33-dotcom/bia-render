const g=globalThis as typeof globalThis&{biaRelecture?:{demandes:number;lectures:number;fins:number;erreurs:number}};
const etat=g.biaRelecture??={demandes:0,lectures:0,fins:0,erreurs:0};
export const resumeRelecture=()=>({revision:'media-explicite-v1',...etat});
export function noterRelecture(etape:unknown){if(etape==='demande')etat.demandes++;if(etape==='lecture')etat.lectures++;if(etape==='fin')etat.fins++;if(etape==='erreur')etat.erreurs++;}
