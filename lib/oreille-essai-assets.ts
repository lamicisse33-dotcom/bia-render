import {createHash} from 'node:crypto';
import {lireObjetMemoire} from './audio-memoire-stockage';
import manifest from '@/public/oreille-essai/manifest.json';
export {manifest};
export const marker='modeles/oreilles-essai/'+manifest.revision+'/INSTALLATION-VERIFIEE.json';
export const sha=(data:Uint8Array)=>createHash('sha256').update(data).digest('hex');
let verified=false;
export async function oreilleInstallee(){
 if(verified)return true;
 try{const r=await lireObjetMemoire(marker);verified=!!r&&(await r.json()).revision===manifest.revision;return verified;}catch{return false;}
}
export function fichierOreille(name:string|null){
 if(!name||!Object.prototype.hasOwnProperty.call(manifest.files,name))return null;
 return manifest.files[name as keyof typeof manifest.files];
}
