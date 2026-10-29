import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import ts from 'typescript';
const compiler=p=>ts.transpileModule(fs.readFileSync(p,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText;
function charger(p,deps={},globals={}){const m={exports:{}};new Function('require','module','exports',...Object.keys(globals),compiler(p))(n=>{assert(n in deps,n);return deps[n];},m,m.exports,...Object.values(globals));return m.exports;}
const pcm=charger('lib/avatar-runway-pcm.ts');
const buffer=(secondes=.1)=>({duration:secondes,numberOfChannels:1,sampleRate:24000,getChannelData:()=>new Float32Array(Math.round(24000*secondes)).fill(.25)});
test('PCM conversion keeps duration, silence, signed clipping and stereo average',()=>{
 const b=pcm.pcmPourAvatar([Float32Array.from([1,-1,0,.5])],16000),v=new DataView(b.buffer);
 assert.deepEqual(Array.from({length:4},(_,i)=>v.getInt16(i*2,true)),[32767,-32768,0,16384]);
 assert.equal(pcm.pcmPourAvatar([new Float32Array(24000)],24000).length,32000);
 assert.equal(pcm.pcmPourAvatar([Float32Array.of(1),Float32Array.of(-1)],16000)[0],0);
 assert.throws(()=>pcm.pcmPourAvatar([],16000));
});
function relais({refuserOuverture=false}={}){
 const rooms=[],timers=new Map(),calls=[],writes=[];let tid=0;
 class FakeRoom{
  handlers={};rpc={};
  constructor(){rooms.push(this);this.localParticipant={registerRpcMethod:()=>{},streamBytes:async()=>({write:async b=>writes.push(b.slice()),close:async()=>{}}),performRpc:async()=>''};}
  on(n,f){this.handlers[n]=f;return this;}
  registerRpcMethod(n,f){this.rpc[n]=f;}
  async connect(_url,token){if(token==='ecran'){this.handlers.track({kind:'video',mediaStreamTrack:{}});this.handlers.track({kind:'audio',mediaStreamTrack:{}});}}
  async disconnect(){}
 }
 const a=charger('lib/avatar-runway-client.ts',{'./avatar-runway-pcm':pcm,'livekit-client':{Room:FakeRoom,RoomEvent:{TrackSubscribed:'track',Disconnected:'disconnect'},Track:{Kind:{Video:'video',Audio:'audio'}}}},{
  localStorage:{getItem:k=>k==='bia-habillage-20261027'?'runway-direct':k==='bia-code'?'TEST':null},
  fetch:async(url,o)=>{const b=JSON.parse(o.body);calls.push(b);if(refuserOuverture&&b.action==='ouvrir')return {ok:false,json:async()=>({erreur:'indisponible'})};return {ok:true,json:async()=>({session:'session',token:'producteur',spectateur:'ecran',url:'wss://test',destination:'runway-avatar-agent',duree_maximale_s:600})};},
  MediaStream:class{},requestAnimationFrame:()=>1,cancelAnimationFrame:()=>{},setTimeout:(fn,ms)=>{const id=++tid;timers.set(id,{fn,ms});return id;},clearTimeout:id=>timers.delete(id),
 });
 const flush=async()=>{for(let i=0;i<12;i++)await Promise.resolve();};
 const rpc=async(name,payload='{}')=>rooms[0].rpc[name]({callerIdentity:'runway-avatar-agent',payload});
 return {a,rooms,timers,calls,writes,flush,rpc};
}
test('conversation waits for remote playout, groups PCM packets and does not finish at network send',async()=>{
 const r=relais();await r.a.preparerAvatarBia();assert(r.a.avatarPret());
 let fini=false,premier=0;
 const p=r.a.parlerAvecAvatar(buffer(),()=>premier++).then(ms=>{fini=true;return ms;});
 const q=r.a.parlerAvecAvatar(buffer());await r.flush();assert(r.writes.length>0);assert(!fini);assert(r.a.avatarParle());
 await r.rpc('lk.playback_started');assert.equal(premier,1);
 await r.rpc('lk.playback_finished');assert.equal(await p,200);assert.equal(await q,200);assert(!r.a.avatarParle());
 await r.a.fermerAvatarBia();assert(r.calls.some(c=>c.action==='fermer'));
});
test('interruption cancels old audio; late old completion cannot finish the next response',async()=>{
 const r=relais();await r.a.preparerAvatarBia();const ancien=r.a.parlerAvecAvatar(buffer());await r.flush();
 r.a.interrompreAvatarBia();assert.equal(await ancien,0);
 let fini=false;const nouveau=r.a.parlerAvecAvatar(buffer()).then(v=>{fini=true;return v;});await r.flush();
 await r.rpc('lk.playback_finished','{"interrupted":true}');await r.flush();assert(!fini);
 await r.rpc('lk.playback_finished');assert.equal(await nouveau,100);
 await r.a.fermerAvatarBia();
});
test('Gemini routes the same PCM to avatar exclusively and ignores completion after interruption',async()=>{
 const {BiaGeminiLive}=charger('lib/gemini-live-client.ts');let done,local=0,reads=0;const parle=[];
 const adapter={pret:()=>true,parle:()=>false,contexte:()=>{},interrompre:()=>{},lire:()=>{reads++;return new Promise(r=>done=r);}};
 const moteur=new BiaGeminiLive('TEST',{avatar:adapter,parle:v=>parle.push(v),etat:()=>{},transcription:()=>{},latence:()=>{},erreur:()=>{}});
 moteur.stoppe=false;moteur.output={createBuffer:(_c,n,hz)=>({duration:n/hz,getChannelData:()=>new Float32Array(n)}),createBufferSource:()=>{local++;throw Error('Audio local interdit avec avatar actif');}};
 moteur.jouer(Buffer.from(new Int16Array(2400).buffer).toString('base64'),'audio/pcm;rate=24000');
 assert.equal(reads,1);assert.equal(local,0);moteur.viderSon();const avant=parle.length;done(100);await Promise.resolve();assert.equal(parle.length,avant);
});

test('a dropped active avatar reconnects once, while closing the conversation cancels retry',async()=>{
 const r=relais();r.a.maintenirAvatarBia(true);await r.flush();
 assert(r.a.avatarPret());
 r.rooms[1].handlers.disconnect();await r.flush();
 assert(!r.a.avatarPret());
 const retry=[...r.timers.values()].find(t=>t.ms===1000);assert(retry);
 retry.fn();await r.flush();assert(r.a.avatarPret());
 assert.equal(r.calls.filter(c=>c.action==='ouvrir').length,2);
 r.rooms[3].handlers.disconnect();await r.flush();
 const late=[...r.timers.values()].find(t=>t.ms===1000);assert(late);
 r.a.maintenirAvatarBia(false);await r.flush();
 late.fn();await r.flush();
 assert.equal(r.calls.filter(c=>c.action==='ouvrir').length,2);
 assert(!r.a.avatarPret());
});
test('a missing remote finish releases the audio and recovers the active avatar',async()=>{
 const r=relais();r.a.maintenirAvatarBia(true);await r.flush();
 const p=r.a.parlerAvecAvatar(buffer());await r.flush();
 const timeout=[...r.timers.values()].find(t=>t.ms===20100);assert(timeout);
 timeout.fn();await r.flush();assert.equal(await p,0);
 assert(r.calls.some(c=>c.evenement==='attente_fin_depassee'));
 assert([...r.timers.values()].some(t=>t.ms===1000));
 r.a.maintenirAvatarBia(false);await r.flush();
});

test('unavailable service retries at most five times instead of looping indefinitely',async()=>{
 const r=relais({refuserOuverture:true});r.a.maintenirAvatarBia(true);await r.flush();
 for(let i=0;i<5;i++){
  const entry=[...r.timers].find(([,t])=>t.ms<=15000);assert(entry);
  r.timers.delete(entry[0]);entry[1].fn();await r.flush();
 }
 assert.equal(r.calls.filter(c=>c.action==='ouvrir').length,6);
 assert.equal(r.timers.size,0);assert(!r.a.avatarPret());
 r.a.maintenirAvatarBia(false);await r.flush();
});
