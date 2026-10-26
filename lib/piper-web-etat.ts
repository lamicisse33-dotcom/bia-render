const etat={preparations:0,generations:0,lectures_navigateur:0,erreurs:0,derniere_generation_ms:0,dernier_premier_son_ms:0};
export function noterPiperWeb(d:{etape?:string;ms?:number}){
 const ms=Number.isFinite(d.ms)?Math.round(Math.max(0,Math.min(180000,d.ms!))):0;
 if(d.etape==='pret')etat.preparations++;
 else if(d.etape==='generation'){etat.generations++;etat.derniere_generation_ms=ms;}
 else if(d.etape==='lecture'){etat.lectures_navigateur++;etat.dernier_premier_son_ms=ms;}
 else if(d.etape==='erreur')etat.erreurs++;
}
export const resumePiperWeb=()=>({moteur:'Khalam Gratuit',execution:'navigateur',...etat});
