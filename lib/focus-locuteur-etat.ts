const g=globalThis as typeof globalThis&{biaFocusLocuteur?:{rapports:number;verifications:number;autres:number;incertains:number;erreurs:number;dernier_ms:number;pret:boolean;reference:boolean}};
const etat=g.biaFocusLocuteur??={rapports:0,verifications:0,autres:0,incertains:0,erreurs:0,dernier_ms:0,pret:false,reference:false};
export function noterFocusLocuteur(d:Record<string,unknown>){
 etat.rapports++;
 for(const k of ['verifications','autres','incertains','erreurs'] as const)if(typeof d[k]==='number'&&Number.isFinite(d[k]))etat[k]+=Math.max(0,Math.min(100,Math.round(d[k] as number)));
 etat.dernier_ms=typeof d.dernier_ms==='number'?Math.max(0,Math.min(60000,d.dernier_ms)):0;
 etat.pret=d.pret===true;etat.reference=d.reference===true;
}
export function resumeFocusLocuteur(){return {modele:'ReDimNet B2 VoxCeleb2',traitement:'navigateur',duree_reference:'temporaire pendant la conversation',...etat};}
