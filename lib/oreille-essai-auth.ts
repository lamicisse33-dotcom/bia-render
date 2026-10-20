import {createPublicKey,verify,type JsonWebKey} from 'node:crypto';
import {verifierCode} from './codes';
const issuer='https://token.actions.githubusercontent.com';
const end=Date.parse('2026-10-21T00:00:00Z');
type Key=JsonWebKey&{kid?:string};
let cache:{keys:Key[];until:number}|null=null;
async function keys(){
 if(cache&&cache.until>Date.now())return cache.keys;
 const r=await fetch(issuer+'/.well-known/jwks',{signal:AbortSignal.timeout(8000)});
 if(!r.ok)throw Error('Identité indisponible');const data=await r.json();if(!Array.isArray(data.keys))throw Error('Identité invalide');
 cache={keys:data.keys,until:Date.now()+300000};return cache.keys;
}
export async function identiteOreille(token:string,kind:'install'|'test',now=Date.now(),getKeys:()=>Promise<Key[]>=keys){
 if(now>=end||token.length>16000)return false;
 try{
  const p=token.split('.');if(p.length!==3)return false;
  const h=JSON.parse(Buffer.from(p[0],'base64url').toString()),c=JSON.parse(Buffer.from(p[1],'base64url').toString());
  const seconds=now/1000;
  const workflow='lamicisse33-dotcom/dydy/.github/workflows/bia-moonshine-browser-'+kind+'-20261020.yml@refs/heads/audit/storage-20261015';
  if(h.alg!=='RS256'||typeof h.kid!=='string'||c.iss!==issuer||c.aud!=='bia-moonshine-browser-'+kind+'-20261020'||c.repository!=='lamicisse33-dotcom/dydy'||String(c.repository_id)!=='1375115286'||String(c.repository_owner_id)!=='297633268'||c.workflow_ref!==workflow||c.ref!=='refs/heads/audit/storage-20261015'||c.event_name!=='push')return false;
  if(typeof c.exp!=='number'||c.exp<=seconds||c.exp>seconds+900||typeof c.iat!=='number'||c.iat>seconds+30||c.iat<seconds-900||typeof c.nbf!=='number'||c.nbf>seconds+30)return false;
  const k=(await getKeys()).find(k=>k.kid===h.kid);if(!k)return false;
  return verify('RSA-SHA256',Buffer.from(p[0]+'.'+p[1]),createPublicKey({key:k,format:'jwk'}),Buffer.from(p[2],'base64url'));
 }catch{return false;}
}
export async function autoriserEssaiOreille(r:Request){
 const code=r.headers.get('x-bia-code')||'';
 if(verifierCode(code,false).ok)return true;
 return identiteOreille(code||r.headers.get('authorization')?.replace(/^Bearer /,'')||'','test');
}
