const g=globalThis as typeof globalThis&{biaSonsCourants?:{generation:unknown;corrections?:unknown;lectures:number;reactions:number;dernier_demarrage_ms:number;salutations_locales?:number;dernier_salutation_ms?:number;salutations_ouverture?:number}};
export const sonsCourantsEtat=g.biaSonsCourants??={generation:null,lectures:0,reactions:0,dernier_demarrage_ms:0};
export function noterSonCourant(x:{usage?:unknown;ms?:unknown;salutation_ms?:unknown;precharge?:unknown;ouverture?:unknown}){
 if(!['reponse','reaction'].includes(String(x.usage))||typeof x.ms!=='number'||!Number.isFinite(x.ms)||x.ms<0||x.ms>30000)return;
 if(x.usage==='reaction')sonsCourantsEtat.reactions++;else sonsCourantsEtat.lectures++;
 if(typeof x.salutation_ms==='number'&&Number.isFinite(x.salutation_ms)&&x.salutation_ms>=0&&x.salutation_ms<30000){sonsCourantsEtat.salutations_locales=(sonsCourantsEtat.salutations_locales||0)+1;sonsCourantsEtat.dernier_salutation_ms=Math.round(x.salutation_ms);if(x.ouverture===true)sonsCourantsEtat.salutations_ouverture=(sonsCourantsEtat.salutations_ouverture||0)+1;}
 sonsCourantsEtat.dernier_demarrage_ms=Math.round(x.ms);
}
