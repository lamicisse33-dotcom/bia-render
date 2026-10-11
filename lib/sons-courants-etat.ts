const g=globalThis as typeof globalThis&{biaSonsCourants?:{generation:unknown;corrections?:unknown;lectures:number;reactions:number;dernier_demarrage_ms:number}};
export const sonsCourantsEtat=g.biaSonsCourants??={generation:null,lectures:0,reactions:0,dernier_demarrage_ms:0};
export function noterSonCourant(x:{usage?:unknown;ms?:unknown}){
 if(!['reponse','reaction'].includes(String(x.usage))||typeof x.ms!=='number'||!Number.isFinite(x.ms)||x.ms<0||x.ms>30000)return;
 if(x.usage==='reaction')sonsCourantsEtat.reactions++;else sonsCourantsEtat.lectures++;
 sonsCourantsEtat.dernier_demarrage_ms=Math.round(x.ms);
}
