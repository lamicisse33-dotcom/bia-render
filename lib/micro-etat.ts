type Fin={cause:string;duree_ms:number;parole_ms:number;silence_ms:number;pic:number;mesures:number;vocales:number;plat:boolean;actuel:boolean;contexte:string;quand:string};
const g=globalThis as typeof globalThis&{biaMicroEtat?:{fins:number;courts:number;causes:Record<string,number>;derniers:Fin[]}};
const etat=g.biaMicroEtat??={fins:0,courts:0,causes:{},derniers:[]};
export const resumeMicro=()=>({revision:'capture-proprietaire-v1',...etat});
export function noterMicro(d:Record<string,unknown>){
 const cause=String(d.cause);if(!['silence','analyseur_plat','limite','reprise','absence','exterieur'].includes(cause))return;
 const n=(k:string,max:number)=>Math.max(0,Math.min(max,Number(d[k])||0));
 const fin:Fin={cause,duree_ms:n('duree_ms',600000),parole_ms:n('parole_ms',180000),silence_ms:n('silence_ms',600000),pic:n('pic',128),mesures:n('mesures',10000),vocales:n('vocales',10000),plat:d.plat===true,actuel:d.actuel===true,contexte:['running','suspended','closed','interrupted'].includes(String(d.contexte))?String(d.contexte):'inconnu',quand:new Date().toISOString()};
 etat.fins++;if(fin.duree_ms<1000)etat.courts++;etat.causes[cause]=(etat.causes[cause]||0)+1;etat.derniers.push(fin);etat.derniers=etat.derniers.slice(-20);
}
