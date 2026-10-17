const g=globalThis as typeof globalThis&{biaEcouteProgressive?:any};
const etat=g.biaEcouteProgressive??={segments:0,segments_reussis:0,segments_echecs:0,dernier_segment_ms:0,interventions_finies:0,dernier_reste_ms:0,dernier_secondes:0};
export function noterSegmentAnticipe(ok:boolean,ms:number){etat.segments++;if(ok)etat.segments_reussis++;else etat.segments_echecs++;etat.dernier_segment_ms=ms;}
export function noterEcouteProgressive(d:Record<string,unknown>){const n=Number(d.segments),s=Number(d.secondes),ms=Number(d.attente_finale_ms);if(!Number.isInteger(n)||n<1||n>40||!Number.isFinite(s)||s<0||s>180||!Number.isFinite(ms)||ms<0||ms>180000)return;etat.interventions_finies++;etat.dernier_reste_ms=ms;etat.dernier_secondes=s;}
export const resumeEcouteProgressive=()=>({...etat});
