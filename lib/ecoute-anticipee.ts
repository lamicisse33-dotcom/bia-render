import {createHash} from 'node:crypto';
import {chezOreilleLocale} from './ecoute-locale';
import type {Ecoute} from './ecoute';
type Travail={owner:string;hash:string;octets:number;langue:string|null;debut:number;resultat:Promise<Ecoute|null>};
const g=globalThis as typeof globalThis&{biaEcouteAnticipee?:{travaux:Map<string,Travail>;utilisees:number;lancees:number;recuperees:number;replis:number;dernier_avancement_ms:number;compatible:boolean;comparaisons:number;identiques:number;divergences:number;diagnostic?:unknown}};
const etat=g.biaEcouteAnticipee??={travaux:new Map(),utilisees:0,lancees:0,recuperees:0,replis:0,dernier_avancement_ms:0,compatible:false,comparaisons:0,identiques:0,divergences:0,diagnostic:null as unknown};
const hash=(s:Uint8Array|string)=>createHash('sha256').update(s).digest('hex');
export const resumeEcouteAnticipee=()=>{const {travaux,...r}=etat;return {...r,suspendue:true,motif_suspension:'echecs_transcription_complete_observes',en_cours:travaux.size,confirmee:anticipationConfirmee(),strategie:'pause de 300 ms, une anticipation par tour, annulée si la parole reprend'};};
export const noterEssaiAnticipation=(r:{tours:Array<{texte_identique:boolean}>;[key:string]:unknown})=>{etat.diagnostic=r;etat.compatible=r.tours.length>=2&&r.tours.every(t=>t.texte_identique);};
export async function anticiperEcoute(cle:string,code:string,audio:Blob,langue:string|null){
 if(process.env.STT_PROVIDER!=='local_wolof'||langue==='fr'&&process.env.WOLOF_LOCAL_ALL_LANGUAGES!=='true')return false;
 if(!etat.compatible||etat.divergences>0)return false;
 const maintenant=Date.now();for(const [k,t] of etat.travaux)if(maintenant-t.debut>30000)etat.travaux.delete(k);
 const owner=hash(code),key=owner+':'+cle;
 if(etat.travaux.has(key))return true;
 if(etat.travaux.size>=12||[...etat.travaux.values()].some(t=>t.owner===owner&&maintenant-t.debut<3000))return false;
 if(!audio.type.includes('webm')||audio.size<4000||audio.size>2*1024*1024)return false;
 const bytes=new Uint8Array(await audio.arrayBuffer());
 etat.lancees++;
 const travail={owner,hash:hash(bytes),octets:bytes.length,langue,debut:Date.now(),resultat:chezOreilleLocale(audio).catch(()=>null)};
 etat.travaux.set(key,travail);
 setTimeout(()=>{if(etat.travaux.get(key)===travail)etat.travaux.delete(key);},30000).unref();
 return true;
}
/** Final audio must begin with the exact authenticated snapshot. Browser also
 * guarantees no detected speech resumed after that snapshot was requested. */
export async function reprendreEcoute(cle:string,code:string,audio:Blob,langue:string|null):Promise<Ecoute|null>{
 const key=hash(code)+':'+cle,t=etat.travaux.get(key);if(!t)return null;
 etat.travaux.delete(key);
 if(Date.now()-t.debut>30000||langue!==t.langue||audio.size<t.octets||hash(new Uint8Array(await audio.slice(0,t.octets).arrayBuffer()))!==t.hash){etat.replis++;return null;}
 const avance=Date.now()-t.debut;
 // Do not let a stalled speculative call add a second full timeout.
 let timer:ReturnType<typeof setTimeout>|undefined;
 const r=await Promise.race([t.resultat,new Promise<null>(resolve=>{timer=setTimeout(()=>resolve(null),1500);})]);
 if(timer)clearTimeout(timer);
 if(!r?.texte.trim()){etat.replis++;return null;}
 etat.recuperees++;etat.dernier_avancement_ms=avance;return r;
}

export const anticipationConfirmee=()=>etat.comparaisons>=3&&etat.divergences===0;
export function comparerAnticipation(avant:Ecoute,complet:Ecoute){
 const normal=(s:string)=>s.normalize('NFC').toLowerCase().replace(/[\p{P}\p{Z}\s]+/gu,' ').trim();
 etat.comparaisons++;if(normal(avant.texte)===normal(complet.texte))etat.identiques++;else etat.divergences++;
}

export const noterUtilisationAnticipation=()=>{etat.utilisees++;};
