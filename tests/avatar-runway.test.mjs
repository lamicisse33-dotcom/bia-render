import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import ts from 'typescript';
import * as sdk from 'livekit-server-sdk';
import * as crypto from 'node:crypto';
function charger(fetch){
 const m={exports:{}};let salles=0;
 const source=ts.transpileModule(fs.readFileSync('lib/avatar-runway-serveur.ts','utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText;
 class Rooms{async createRoom(){salles++;}async deleteRoom(){salles--;}async listRooms(){return [];}}
 new Function('require','module','exports','process','fetch','Date','globalThis',source)(n=>n==='node:crypto'?crypto:{...sdk,RoomServiceClient:Rooms},m,m.exports,{env:{RUNWAYML_API_SECRET:'test-secret-runway',LIVEKIT_URL:'wss://test.livekit.cloud',LIVEKIT_API_KEY:'test-key',LIVEKIT_API_SECRET:'test-secret-livekit-which-is-long-enough'}},fetch,class extends Date{static now(){return Date.parse('2026-10-29T12:00:00Z');}},{});
 return {...m.exports,salles:()=>salles};
}
test('session uses custom Bia, limits duration, scopes JWTs to a unique room, and cancels once',async()=>{
 const calls=[];const a=charger(async(url,options)=>{calls.push({url,...options});return {ok:true,json:async()=>({id:'test-session'})};});
 const result=await a.ouvrirAvatar();const body=JSON.parse(calls[0].body);
 assert.equal(body.avatar.avatarId,a.AVATAR_BIA);assert.equal(body.maxDuration,120);
 const decode=t=>JSON.parse(Buffer.from(t.split('.')[1],'base64url').toString());
 const client=decode(result.token),avatar=decode(body.livekit.token);
 assert.equal(client.video.room,avatar.video.room);assert.equal(client.video.room,body.livekit.roomName);
 assert.equal(avatar.attributes['lk.publish_on_behalf'],client.sub);assert.equal(avatar.kind,'agent');
 assert.equal(client.video.roomAdmin,undefined);assert.equal(result.destination,a.AVATAR_IDENTITE);
 assert(!JSON.stringify(result).includes('test-secret'));
 await assert.rejects(a.ouvrirAvatar(),/essai_deja_en_cours/);
 await a.fermerAvatar(result.session);await a.fermerAvatar(result.session);
 assert.equal(calls.filter(c=>c.method==='DELETE').length,1);assert.equal(a.salles(),0);
});
test('provider refusal removes temporary room and returns no provider body or credentials',async()=>{
 const a=charger(async()=>({ok:false,status:401,text:async()=> 'sensitive-provider-body'}));
 await assert.rejects(a.ouvrirAvatar(),{message:'runway_http_401'});assert.equal(a.salles(),0);
});

test('full figure is a separate unprocessed avatar; only ready variant becomes the session source',async()=>{
 const calls=[];
 const a=charger(async(url,o)=>{calls.push({url,...o});return {ok:true,json:async()=>url.endsWith('?limit=100')?{data:[],hasMore:false}:url.endsWith('/avatars')?{id:'wide-avatar',status:'READY'}:{id:'wide-session'}};});
 await a.preparerCadrageAvatar();assert.equal(a.cadrageAvatar().statut,'pret');
 const create=JSON.parse(calls.find(c=>c.method==='POST').body);assert.equal(create.imageProcessing,'none');assert(create.referenceImage.endsWith('satin-anime-20261028/repos.webp'));
 const session=await a.ouvrirAvatar('owner',true);assert.equal(session.cadrage,'hanches');
 assert.equal(JSON.parse(calls.at(-1).body).avatar.avatarId,'wide-avatar');
 assert(!calls.some(c=>c.method==='PATCH'||c.url.includes(a.AVATAR_BIA)));
});
test('restart finds existing full figure without creating another avatar',async()=>{
 const calls=[];const a=charger(async(url,o)=>{calls.push({url,...o});return {ok:true,json:async()=>({data:[{id:'existing-wide',name:'Bia plan hanches — 2026-10-29',status:'READY'}],hasMore:false})};});
 await a.preparerCadrageAvatar();assert.equal(a.cadrageAvatar().id,'existing-wide');assert.equal(calls.length,1);
});
test('failed wider source leaves the validated bust available',async()=>{
 let first=true;const a=charger(async()=>{if(first){first=false;return {ok:false,status:503};}return {ok:true,json:async()=>({id:'fallback-session'})};});
 await a.preparerCadrageAvatar();assert.equal(a.cadrageAvatar().statut,'indisponible');assert.equal((await a.ouvrirAvatar()).cadrage,'buste');
});
