import {createHash} from 'node:crypto';
/** Stable normal reading; an explicit new take must also reach the GPU. */
export function grainePriseVoix(prise:unknown,voix:string,partie:number,mesuree=913){
 if(typeof prise!=='string'||!prise.trim())return mesuree;
 return createHash('sha256').update(JSON.stringify([prise.slice(0,80),voix,partie])).digest().readUInt32BE(0)&0x7fffffff;
}
