import {createPublicKey,verify,type JsonWebKey} from 'node:crypto';
export const FIN_INSTALLATION=Date.parse('2026-10-20T02:00:00Z');
const issuer='https://token.actions.githubusercontent.com';
export const AUDIENCE_SPEECHT5='bia-speecht5-install-20261019';
const workflow='lamicisse33-dotcom/dydy/.github/workflows/bia-speecht5-install-via-bia-20261019.yml@refs/heads/audit/storage-20261015';
let cache:{keys:(JsonWebKey&{kid?:string})[];until:number}|null=null;
async function cles(){
 if(cache&&cache.until>Date.now())return cache.keys;
 const r=await fetch(issuer+'/.well-known/jwks',{signal:AbortSignal.timeout(8000)});if(!r.ok)throw Error('Identité GitHub indisponible');
 const d=await r.json();if(!Array.isArray(d.keys))throw Error('Identité GitHub invalide');cache={keys:d.keys,until:Date.now()+300000};return cache.keys;
}
export async function autoriserInstallation(token:string,now=Date.now(),getKeys:()=>Promise<(JsonWebKey&{kid?:string})[]>=cles){
 if(now>=FIN_INSTALLATION||token.length>16000)return false;
 try{
  const parts=token.split('.');if(parts.length!==3)return false;
  const header=JSON.parse(Buffer.from(parts[0],'base64url').toString()),claims=JSON.parse(Buffer.from(parts[1],'base64url').toString());
  if(header.alg!=='RS256'||typeof header.kid!=='string')return false;
  const seconds=now/1000;
  if(claims.iss!==issuer||claims.aud!==AUDIENCE_SPEECHT5||claims.repository!=='lamicisse33-dotcom/dydy'||String(claims.repository_id)!=='1375115286'||String(claims.repository_owner_id)!=='297633268'||claims.workflow_ref!==workflow||claims.ref!=='refs/heads/audit/storage-20261015'||claims.event_name!=='push')return false;
  if(typeof claims.exp!=='number'||claims.exp<=seconds||claims.exp>seconds+900||typeof claims.iat!=='number'||claims.iat>seconds+30||claims.iat<seconds-900||typeof claims.nbf!=='number'||claims.nbf>seconds+30)return false;
  const jwk=(await getKeys()).find(k=>k.kid===header.kid);if(!jwk)return false;
  return verify('RSA-SHA256',Buffer.from(parts[0]+'.'+parts[1]),createPublicKey({key:jwk,format:'jwk'}),Buffer.from(parts[2],'base64url'));
 }catch{return false;}
}
