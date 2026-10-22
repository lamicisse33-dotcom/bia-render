import {PROFILS_RAPIDITE, profilRapidite, type ProfilRapidite} from './rapidite-core';
type BriqueMesure={profil:ProfilRapidite;reprises:number;vecu_ms:number;micro_ms:number;quand:string};
type Mesure = {profil: ProfilRapidite; reprises: number; vecu_ms: number; queue_ms: number; transcription_ms: number; modele_ms: number; voix_ms: number; demarrage_ms: number; quand: string};
const g = globalThis as typeof globalThis & {biaEssaiRapidite?: {modeles: Record<string, {appels: number; modele: string}>; tours: Mesure[]; briques:BriqueMesure[]; prechauffages: number; derniers_prechargements: unknown}};
const etat = g.biaEssaiRapidite ??= {modeles: {}, tours: [], briques:[], prechauffages: 0, derniers_prechargements: null};
export function noterModeleRapidite(profil: unknown, modele: string) {
  const p = profilRapidite(profil); if (!p) return;
  const c = etat.modeles[p] ??= {appels: 0, modele}; c.appels++; c.modele = modele;
}
export function noterPrechargementRapidite(details: unknown) { etat.prechauffages++; etat.derniers_prechargements = details; }
export function noterTourRapidite(d: Record<string, unknown>) {
  const profil = profilRapidite(d.profil_rapidite); if (!profil) return;
  const valeurs: Record<string, number> = {};
  for (const k of ['vecu_ms','queue_ms','transcription_ms','modele_ms','voix_ms','demarrage_ms']) {
    const n = Number(d[k]); if (!Number.isFinite(n) || n < 0 || n > 600000) return; valeurs[k] = Math.round(n);
  }
  const reprises = Math.max(0, Math.min(30, Math.floor(Number(d.reprises) || 0)));
  etat.tours.push({profil, reprises, ...valeurs, quand: new Date().toISOString()} as Mesure);
  etat.tours = etat.tours.slice(-90);
}
export function noterPremierSonRapidite(d:Record<string,unknown>){
 const profil=profilRapidite(d.profil_rapidite),ms=Number(d.ms),micro=Number(d.micro_ms);
 if(!profil||d.etape!=='premier_son'||!Number.isFinite(ms)||!Number.isFinite(micro)||ms<0||ms>180000||micro<0||micro>ms)return;
 etat.briques.push({profil,reprises:Math.max(0,Math.min(30,Math.floor(Number(d.reprises)||0))),vecu_ms:ms,micro_ms:micro,quand:new Date().toISOString()});etat.briques=etat.briques.slice(-90);
}
const mediane = (n: number[]) => { const a = [...n].sort((a,b)=>a-b), m = Math.floor(a.length/2); return a.length ? (a[m]+a[(a.length-1)>>1])/2 : null; };
export function resumeEssaiRapidite() {
  return {profils: PROFILS_RAPIDITE.map(profil => {
    const ordinaires=etat.tours.filter(t=>t.profil===profil),briques=etat.briques.filter(t=>t.profil===profil);
    const tours = [...ordinaires,...briques], directs = tours.filter(t=>!t.reprises);
    return {profil, modele: etat.modeles[profil] ?? null, tours: tours.length, ordinaires:ordinaires.length,briques:briques.length,tours_avec_reprise: tours.length-directs.length,
      mediane_sans_reprise_ms: mediane(directs.map(t=>t.vecu_ms)), mediane_tous_tours_ms: mediane(tours.map(t=>t.vecu_ms))};
  }), ...etat, limite: 'Mesures navigateur déclarées, sans texte ni son privé. Une reprise peut inclure une nouvelle écoute et un nouveau calcul dans les anciennes bornes. Les groupes avec reprise sont indiqués séparément.'};
}
