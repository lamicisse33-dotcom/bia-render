import {readFile} from 'node:fs/promises';
import {join} from 'node:path';
import {chezOreilleLocale} from './ecoute-locale';
import {noterEssaiAnticipation} from './ecoute-anticipee';
/** Two public prerecorded phrases. No user recording, corpus or memory write. */
export async function verifierEcouteAnticipee(){
 const cas=JSON.parse(await readFile(join(process.cwd(),'data/essai-ecoute-anticipee.json'),'utf8')),tours=[];
 for(const c of cas){
  const prefixe=new Blob([Buffer.from(c.prefixe,'base64')],{type:'audio/webm'}),complet=new Blob([Buffer.from(c.complet,'base64')],{type:'audio/webm'});
  const t=performance.now(),a=await chezOreilleLocale(prefixe),partielMs=Math.round(performance.now()-t);
  const u=performance.now(),b=await chezOreilleLocale(complet),completMs=Math.round(performance.now()-u);
  const normal=(s:string)=>s.normalize('NFC').toLowerCase().replace(/[\p{P}\p{Z}\s]+/gu,' ').trim();
  tours.push({langue:c.langue,prefixe_accepte:!!a?.texte,complet_accepte:!!b?.texte,texte_identique:!!a?.texte&&!!b?.texte&&normal(a.texte)===normal(b.texte),prefixe_ms:partielMs,complet_ms:completMs});
 }
 noterEssaiAnticipation({date:new Date().toISOString(),tours,mesure:'Compatibilité réelle de deux WebM incomplets terminant dans le silence ; hors micro navigateur. Ne valide pas le gain utilisateur et ne compte pas pour les trois comparaisons réelles.'});
}
