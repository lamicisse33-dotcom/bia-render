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

test('restoration keeps the validated speaking bust and never prepares or selects a framing experiment',async()=>{
 const calls=[];const a=charger(async(url,o)=>{calls.push({url,...o});return {ok:true,json:async()=>({id:'restored-session'})};});
 await a.preparerCadrageAvatar();assert.equal(calls.length,0);
 assert.equal(a.cadrageAvatar().id,'e15f387a-20ae-4dd4-986d-601fb748ec07');
 const session=await a.ouvrirAvatar('owner',true);
 assert.equal(session.cadrage,'buste');
 assert.equal(JSON.parse(calls[0].body).avatar.avatarId,a.cadrageAvatar().id);
 assert.equal(calls.length,1);
});
