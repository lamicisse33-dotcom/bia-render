const g=globalThis as typeof globalThis&{biaBriquesEtat?:any};
const etat=g.biaBriquesEtat??={sessions:0,preparees:0,finalisees:0,erreurs:0,lectures:0,dernier_premier_son_ms:null,dernier_depuis_micro_ms:null,dernier_blanc_ms:null,blanc_max_ms:0,reflexions:0,dernier_echec:null};
export const etatBriques=etat;
export const resumeBriques=()=>({mode:'briques_verrouillees',revision:'audio-une-preparation-v5',premier_segment_apres_ms:4000,pause_transcription_ms:500,...etat,son_reflexion:'prise_naturelle_manquante'});
export function noterBriques(d:Record<string,unknown>){
  const ms=Number(d.ms);if(!Number.isFinite(ms)||ms<0||ms>180000)return;
  if(typeof d.tour==='string'&&/^[a-zA-Z0-9_-]{8,80}$/.test(d.tour)&&['depart','lecture_demandee','debut_brique','fin_brique','transcrit','fin_preparation','fin_chaine','annulation'].includes(String(d.etape))){
    const details:Record<string,number>={};
    for(const cle of ['numero','nombre','pretes','en_cours','actuel','repli','tour_actuel','capture_actuelle']){
      const v=Number(d[cle]);if(Number.isInteger(v)&&v>=0&&v<=20)details[cle]=v;
    }
    etat.cycle??={comptes:{},derniers:[]};
    etat.cycle.comptes[String(d.etape)]=(etat.cycle.comptes[String(d.etape)]||0)+1;
    etat.cycle.derniers=[...etat.cycle.derniers.slice(-39),{tour:d.tour,etape:d.etape,ms,...details,quand:new Date().toISOString()}];
  }
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
