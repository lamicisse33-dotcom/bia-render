export type BlocPrise={debut:number;sampleRate:number;canaux:Float32Array[]};
/** Copy the exact scheduled samples, including the measured gaps. No synthesis. */
export function wavPrise(blocs:BlocPrise[]):ArrayBuffer{
 if(!blocs.length)throw Error('Aucun audio complet');
 const rate=blocs[0].sampleRate,channels=blocs[0].canaux.length,start=blocs[0].debut;
 if(!rate||!channels||channels>2||blocs.some(b=>b.sampleRate!==rate||b.canaux.length!==channels))throw Error('Format incompatible');
 const frames=Math.max(...blocs.map(b=>Math.round((b.debut-start)*rate)+b.canaux[0].length));
 if(frames<=0||frames>rate*60||frames*channels*4>8_000_000)throw Error('Prise trop longue');
 const out=new ArrayBuffer(44+frames*channels*4),v=new DataView(out);
 const ascii=(p:number,s:string)=>{for(let i=0;i<s.length;i++)v.setUint8(p+i,s.charCodeAt(i));};
 ascii(0,'RIFF');v.setUint32(4,out.byteLength-8,true);ascii(8,'WAVEfmt ');v.setUint32(16,16,true);v.setUint16(20,3,true);v.setUint16(22,channels,true);v.setUint32(24,rate,true);v.setUint32(28,rate*channels*4,true);v.setUint16(32,channels*4,true);v.setUint16(34,32,true);ascii(36,'data');v.setUint32(40,out.byteLength-44,true);
 for(const b of blocs){const offset=Math.round((b.debut-start)*rate);for(let i=0;i<b.canaux[0].length;i++)for(let c=0;c<channels;c++)v.setFloat32(44+((offset+i)*channels+c)*4,b.canaux[c][i],true);}
 return out;
}
export const textePrise=(s:string)=>s.normalize('NFC').trim();
export function ordreValiderPrise(s:string){return /\b(mémorise|memorise|mémoriser|memoriser|retiens|retenir|garde ça)\b/i.test(s)&&!/\b(pas|oublie|efface)\b/i.test(s);}
