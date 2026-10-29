const g=globalThis as typeof globalThis&{biaProtectionParole?:{retenues:number;annulees:number;derniere:unknown;captures:Record<string,number>;derniere_capture:unknown;motifs_exclusion:Record<string,number>;attentes_detaillees?:Record<string,unknown>[];demarrage_detaille?:Record<string,unknown>[]}};
const etat=g.biaProtectionParole??={retenues:0,annulees:0,derniere:null,captures:{},derniere_capture:null,motifs_exclusion:{}};
const attentes=etat.attentes_detaillees??=[],demarrages=etat.demarrage_detaille??=[];
export const resumeProtectionParole=()=>({revision:'silence-avant-son-v1',...etat,attentes_detaillees:attentes,demarrage_detaille:demarrages});
export function noterProtectionParole(d:Record<string,unknown>){
  if(d.type==='demarrage_voix'){
    const ms=Number(d.ms);if(!['reveil','decodage','prise_parole'].includes(String(d.phase))||!Number.isFinite(ms)||ms<0||ms>600000)return;
    demarrages.push({phase:d.phase,ms:Math.round(ms),ok:d.ok===true,quand:new Date().toISOString()});if(demarrages.length>60)demarrages.shift();return;
  }
  if(d.type==='capture_progressive'){
    const etape=String(d.etape);
    if(!['branchee','indisponible','voix_incompatible','contexte_exclu','desactivee'].includes(etape))return;
    etat.captures[etape]=(etat.captures[etape]||0)+1;
    const motif=String(d.motif||'');
    if(['apprentissage','correction_devoir','correction_liste','prenom','reprise','voix_incompatible','desactivee'].includes(motif))etat.motifs_exclusion[motif]=(etat.motifs_exclusion[motif]||0)+1;
    etat.derniere_capture={etape,motif,apparence:d.apparence==='rara'?'rara':d.apparence==='bia'?'bia':'inconnue',quand:new Date().toISOString()};return;
  }
  const ms=Number(d.ms);if(!Number.isFinite(ms)||ms<0||ms>600000)return;
  if(d.etape==='retenue')etat.retenues++;else if(d.etape==='annulee')etat.annulees++;else return;
  etat.derniere={etape:d.etape,ms,quand:new Date().toISOString()};
  const phase=['autre','avant_lecture','lecture_simple','avatar_pret','apres_decodage','apres_amorcage'].includes(String(d.phase))?d.phase:'inconnue';
  const contexte=['running','suspended','interrupted','closed'].includes(String(d.contexte))?d.contexte:'inconnu';
  const raw=d.causes&&typeof d.causes==='object'?d.causes as Record<string,unknown>:{};
  const causes=Object.fromEntries(['micro','porte','signal','analyse_erreur'].map(k=>{const n=Number(raw[k]);return [k,Number.isFinite(n)?Math.max(0,Math.min(10000,Math.round(n))):0];}));
  attentes.push({etape:d.etape,ms:Math.round(ms),phase,contexte,causes,quand:new Date().toISOString()});if(attentes.length>30)attentes.shift();
}
