// Optional reflection only; no microphone, ASR, voice or streaming settings.
export const REFLEXION_COURTE = Object.freeze({
  parole_max_ms:5000, une_sur:3, intervalle_ms:45000, attente_ms:1200, volume:0.35,
  entre_briques:false,
});
export type RythmeReflexion = {courtes:number;derniere:number|null};
export function choisirReflexionCourte(etat:RythmeReflexion,paroleMs:number,maintenant:number):boolean {
  if(!Number.isFinite(paroleMs)||paroleMs<=0||paroleMs>REFLEXION_COURTE.parole_max_ms)return false;
  etat.courtes++;
  if(etat.courtes%REFLEXION_COURTE.une_sur!==0)return false;
  return etat.derniere===null||maintenant-etat.derniere>=REFLEXION_COURTE.intervalle_ms;
}
