import {createHash} from 'node:crypto';
import {assurerMemoire,ecrireObjetMemoire,lireObjetMemoire} from './audio-memoire-stockage';
import {lexiqueConfig} from './lexique';
import {textePrise} from './prise-validee-core';
const hash=(b:Uint8Array|string)=>createHash('sha256').update(b).digest('hex');
const etat={sauvegardes:0,relectures_confirmees:0,lectures:0,erreurs:0,derniere_validation:null as string|null};
export const resumePrisesValidees=()=>({...etat});
export type PriseMeta={id:string;texte:string;langue:'wo'|'fr';voice:'female'|'male';sha256:string;date:string;octets:number};
export async function enregistrerPrise(texte:string,langue:PriseMeta['langue'],voice:PriseMeta['voice'],bytes:Uint8Array){
 try{
 const b=Buffer.from(bytes);if(b.length<1000||b.length>8_000_044||b.toString('ascii',0,4)!=='RIFF'||b.toString('ascii',8,12)!=='WAVE'||b.readUInt32LE(4)!==b.length-8||b.readUInt32LE(40)!==b.length-44||b.readUInt16LE(20)!==3||b.readUInt16LE(34)!==32)throw Error('Audio WAV invalide');
 const channels=b.readUInt16LE(22),rate=b.readUInt32LE(24);if(![1,2].includes(channels)||rate<8000||rate>96000||(b.length-44)/(rate*channels*4)>60)throw Error('Format audio invalide');
 const id=hash(JSON.stringify(['khalam-prise-v1',textePrise(texte),langue,voice])),sha256=hash(bytes);
 await assurerMemoire();
 // Content-addressed takes remain available when a newer take is validated.
 const path='prises-audio/'+sha256+'.wav';
 await ecrireObjetMemoire(path,bytes,'audio/wav',true);
 const relu=await lireObjetMemoire(path);if(!relu||hash(new Uint8Array(await relu.arrayBuffer()))!==sha256)throw Error('Relecture audio différente');
 const meta:PriseMeta={id,texte:textePrise(texte),langue,voice,sha256,date:new Date().toISOString(),octets:bytes.length};
 await ecrireObjetMemoire('prises-historique/'+id+'-'+sha256+'.json',JSON.stringify(meta),'application/json',true);
 await ecrireObjetMemoire('prises-validees/'+id+'.json',JSON.stringify(meta),'application/json',true);
 const m=await lireObjetMemoire('prises-validees/'+id+'.json');if(!m||(await m.json()).sha256!==sha256)throw Error('Validation non confirmée');
 etat.sauvegardes++;etat.relectures_confirmees++;etat.derniere_validation=meta.date;return meta;
 }catch(e){etat.erreurs++;throw e;}
}
export async function listePrises(){
 const out:PriseMeta[]=[];
 for(let offset=0;;offset+=100){
 const r=await fetch(lexiqueConfig.url+'/storage/v1/object/list/bia-memoire-audio',{method:'POST',headers:{apikey:lexiqueConfig.cle,Authorization:'Bearer '+lexiqueConfig.cle,'content-type':'application/json'},body:JSON.stringify({prefix:'prises-validees',limit:100,offset}),signal:AbortSignal.timeout(8000),cache:'no-store'});
 if(!r.ok)throw Error('Catalogue indisponible');const rows=await r.json();if(!Array.isArray(rows))throw Error('Catalogue invalide');
 for(const row of rows)if(/^[a-f0-9]{64}\.json$/.test(row.name)){const m=await lireObjetMemoire('prises-validees/'+row.name);if(m)out.push(await m.json());}
 if(rows.length<100)break;
 }return out;
}
export async function lirePrise(id:string){
 const r=await lireObjetMemoire('prises-validees/'+id+'.json');if(!r)return null;const m:PriseMeta=await r.json();
 if(!/^[a-f0-9]{64}$/.test(m.sha256))return null;const a=await lireObjetMemoire('prises-audio/'+m.sha256+'.wav');if(!a)return null;
 const b=new Uint8Array(await a.arrayBuffer());if(hash(b)!==m.sha256)throw Error('Audio différent de la prise validée');etat.lectures++;return b;
}
