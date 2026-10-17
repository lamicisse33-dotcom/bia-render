const g=globalThis as typeof globalThis&{biaBriquesEtat?:any};
const etat=g.biaBriquesEtat??={sessions:0,preparees:0,finalisees:0,erreurs:0,lectures:0,dernier_premier_son_ms:null,dernier_depuis_micro_ms:null,dernier_blanc_ms:null,blanc_max_ms:0,reflexions:0,dernier_echec:null};
export const etatBriques=etat;
export const resumeBriques=()=>({mode:'briques_verrouillees',revision:'chaine-continue-v2',premier_segment_apres_ms:4000,...etat,son_reflexion:'prise_naturelle_manquante'});
export function noterBriques(d:Record<string,unknown>){
  const ms=Number(d.ms);if(!Number.isFinite(ms)||ms<0||ms>180000)return;
  if(d.etape==='depart'){
    const pretes=Number(d.pretes),enCours=Number(d.en_cours);
    if(!Number.isInteger(pretes)||pretes<0||pretes>6||![0,1].includes(enCours))return;
    const choix=pretes?'prete':enCours?'en_fabrication':'sans_preparation';
    etat.departs??={};etat.departs[choix]=(etat.departs[choix]||0)+1;
    etat.dernier_depart={choix,pretes,en_cours:!!enCours,quand:new Date().toISOString()};
  }
  if(d.etape==='premier_son'){etat.lectures++;etat.dernier_premier_son_ms=ms;const micro=Number(d.micro_ms);if(Number.isFinite(micro)&&micro>=0&&micro<=180000)etat.dernier_depuis_micro_ms=micro;}
  if(d.etape==='blanc'){etat.dernier_blanc_ms=ms;etat.blanc_max_ms=Math.max(etat.blanc_max_ms,ms);}
  if(d.etape==='reflexion')etat.reflexions++;
}
