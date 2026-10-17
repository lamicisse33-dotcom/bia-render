const g=globalThis as typeof globalThis&{biaBriquesEtat?:any};
const etat=g.biaBriquesEtat??={sessions:0,preparees:0,finalisees:0,erreurs:0,lectures:0,dernier_premier_son_ms:null,dernier_depuis_micro_ms:null,dernier_blanc_ms:null,blanc_max_ms:0,reflexions:0,dernier_echec:null};
export const etatBriques=etat;
export const resumeBriques=()=>({mode:'briques_verrouillees',...etat,son_reflexion:'prise_naturelle_manquante'});
export function noterBriques(d:Record<string,unknown>){
  const ms=Number(d.ms);if(!Number.isFinite(ms)||ms<0||ms>180000)return;
  if(d.etape==='premier_son'){etat.lectures++;etat.dernier_premier_son_ms=ms;const micro=Number(d.micro_ms);if(Number.isFinite(micro)&&micro>=0&&micro<=180000)etat.dernier_depuis_micro_ms=micro;}
  if(d.etape==='blanc'){etat.dernier_blanc_ms=ms;etat.blanc_max_ms=Math.max(etat.blanc_max_ms,ms);}
  if(d.etape==='reflexion')etat.reflexions++;
}
