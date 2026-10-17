const etat={interventions:0,segments:0,derniere_secondes:0,dernier_ms:0};
export function noterEcouteLongue(d:Record<string,unknown>){const s=Number(d.secondes),n=Number(d.segments),ms=Number(d.ms);if(!Number.isFinite(s)||s<0||s>300||!Number.isInteger(n)||n<1||n>20||!Number.isFinite(ms)||ms<0||ms>300000)return;etat.interventions++;etat.segments+=n;etat.derniere_secondes=s;etat.dernier_ms=ms;}
export const resumeEcouteLongue=()=>({limite_parole_ms:120000,segment_max_secondes:25,anticipation_reponse:true,...etat});
