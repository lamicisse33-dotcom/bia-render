const g=globalThis as typeof globalThis&{biaReprises?:{comptes:Record<string,number>;derniers:Record<string,unknown>[]}};
const etat=g.biaReprises??={comptes:{},derniers:[]};
export const resumeReprises=()=>({revision:'reprise-pcm-v1',...etat});
export function noterReprise(d:Record<string,unknown>){
 const etape=String(d.etape);
 if(!['armee','indisponible','lecture','transcrit','perimee','repli','decision'].includes(etape)||typeof d.tour!=='string'||!/^g[a-zA-Z0-9_-]{8,80}$/.test(d.tour))return;
 const details:Record<string,unknown>={tour:d.tour,etape,quand:new Date().toISOString()};
 for(const k of ['ms','apres_parole_ms','segments','echantillons','silence_ms']){const n=Number(d[k]);if(Number.isFinite(n)&&n>=0&&n<=3000000)details[k]=Math.round(n);}
 if(['recoller','remplacer','ensuite','ignorer'].includes(String(d.action)))details.action=d.action;
 etat.comptes[etape]=(etat.comptes[etape]||0)+1;etat.derniers=[...etat.derniers.slice(-39),details];
}
