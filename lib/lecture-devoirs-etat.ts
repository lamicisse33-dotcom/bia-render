type Etat={chargements:number;erreurs_chargement:number;dernier_chargement_ms:number|null;devoirs:number|null;incomplets:number|null;debuts_navigateur:number;fins_navigateur:number;erreurs_navigateur:number;premier_son_programme_ms:number|null;dernier_evenement:string|null};
const global=globalThis as typeof globalThis & {__biaLectureDevoirs?:Etat};
const etat=global.__biaLectureDevoirs??={chargements:0,erreurs_chargement:0,dernier_chargement_ms:null,devoirs:null,incomplets:null,debuts_navigateur:0,fins_navigateur:0,erreurs_navigateur:0,premier_son_programme_ms:null,dernier_evenement:null};
export function noterChargementDevoirs(ms:number,resultat?:{devoirs:unknown[];incomplets:number}){
 etat.dernier_chargement_ms=Math.round(ms);
 if(resultat){etat.chargements++;etat.devoirs=resultat.devoirs.length;etat.incomplets=resultat.incomplets;}else etat.erreurs_chargement++;
}
export function noterLectureDevoirs(c:{etape?:unknown;ms?:unknown}){
 if(c.etape==="premier_son"&&typeof c.ms==="number"&&Number.isFinite(c.ms)&&c.ms>=0&&c.ms<600000){etat.debuts_navigateur++;etat.premier_son_programme_ms=Math.round(c.ms);}
 else if(c.etape==="fin")etat.fins_navigateur++;
 else if(c.etape==="erreur")etat.erreurs_navigateur++;
 else return;
 etat.dernier_evenement=new Date().toISOString();
}
export function resumeLectureDevoirs(){return {depuis_demarrage:true,...etat};}
