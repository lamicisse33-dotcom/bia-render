import {REPERTOIRE} from './repertoire-textes';
import {NOUVELLES} from './base-textes';
import {SALUTATIONS} from './services-textes';
export const VERSION_SONS_COURANTS='khalam-female-8320-b123-v1';
export type SonCourant={cle:string;langue:'fr'|'wo';texte:string;usage:'salutation'|'reaction'|'verification'|'identite';adresse:string;secondes:number;octets:number;version:string;moteur?:'khalam-voice';checkpoint_sha256?:string;prise?:string};
export type PhraseCourante=Omit<SonCourant,'adresse'|'secondes'|'octets'|'version'>;
const c=new Set([...SALUTATIONS,'ton-nom','bienvenue','merci','de-rien','pardon','au-revoir','bonne-nuit','bonne-journee','a-demain']);
const entrees=[...REPERTOIRE,...NOUVELLES.filter(e=>!REPERTOIRE.some(r=>r.cle===e.cle))].filter(e=>c.has(e.cle));
// Wolof reactions reuse words/phrases already present in the reviewed repertoire.
// A longer acknowledgement is spoken naturally, never slowed by the player.
const reactions=[
 {cle:'reaction-ok',fr:'OK.',wo:'OK.',usage:'reaction'},
 {cle:'reaction-accord',fr:"D’accord.",wo:'Dacor.',usage:'reaction'},
 {cle:'reaction-ok-pose',fr:'OK… d’accord.',wo:'Waaw… Dacor.',usage:'reaction'},
 {cle:'reaction-tres-bien',fr:'Très bien.',wo:'Baax na.',usage:'reaction'},
 {cle:'reaction-voir',fr:'D’accord, je vais voir ça.',wo:'Waaw, maa ngi xool.',usage:'verification'},
 {cle:'reaction-verifier',fr:'Laisse-moi vérifier.',wo:'Xaaral tuuti, maa ngi seet.',usage:'verification'},
] as const;
export const PHRASES_COURANTES:PhraseCourante[]=[
 ...entrees.flatMap(e=>(['wo','fr'] as const).map(langue=>({cle:e.cle,langue,texte:langue==='wo'?e.wolof:e.francais,usage:e.cle==='ton-nom'?'identite' as const:'salutation' as const}))),
 ...reactions.flatMap(e=>(['wo','fr'] as const).map(langue=>({cle:e.cle,langue,texte:e[langue],usage:e.usage}))),
];
const identique=(s:string)=>s.normalize('NFC').trim().toLowerCase().replace(/[’‘]/g,"'").replace(/\s+/g,' ');
export function sonPourTexte(sons:SonCourant[],texte:string,langue:'fr'|'wo'){
 return sons.find(s=>s.langue===langue&&s.version===VERSION_SONS_COURANTS&&identique(s.texte)===identique(texte));
}
// Greeting recognition in the chat remains separate: every wording can reuse
// the same exact reply audio, without buying one copy per incoming spelling.
export function reactionDisponible(sons:SonCourant[],langue:'fr'|'wo',derniere:string){
 const choix=sons.filter(s=>s.langue===langue&&s.version===VERSION_SONS_COURANTS&&['reaction-ok','reaction-accord','reaction-ok-pose'].includes(s.cle));
 if(!choix.length)return;
 const i=choix.findIndex(s=>s.cle===derniere);return choix[(i+1)%choix.length]?.cle===derniere?undefined:choix[(i+1)%choix.length];
}
