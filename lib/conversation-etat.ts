import type { EffortConversation } from "./conversation-groq";
const g=globalThis as typeof globalThis & { biaConversation?: {appels:number;reussites:number;echecs:number;secours:number;efforts:Record<EffortConversation,number>;dernier:unknown} };
const c=g.biaConversation ||= {appels:0,reussites:0,echecs:0,secours:0,efforts:{low:0,medium:0,high:0},dernier:null};
export function noterConversation(o:{ok:boolean;modele:string;attendu:string;effort:EffortConversation;ms:number;messages:number}){
 c.appels++;c.efforts[o.effort]++;if(o.ok)c.reussites++;else c.echecs++;
 if(o.ok&&o.modele!==o.attendu)c.secours++;
 c.dernier={modele:o.modele,effort:o.effort,ms:o.ms,messages:o.messages,ok:o.ok,quand:new Date().toISOString()};
}
export function etatConversation(){return {strategie:"personnalite-et-debat-v1",historique_max_messages:40,resume:"positions-arguments-objections",...c};}
