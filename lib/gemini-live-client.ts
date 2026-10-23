
export type LiveEvents={etat:(s:string)=>void;transcription:(role:'user'|'bia',texte:string,fin:boolean)=>void;parle:(v:boolean)=>void;latence:(ms:number)=>void;erreur:(s:string)=>void};
const WORKLET=`
class CaptureBia extends AudioWorkletProcessor{
 constructor(){super();this.pending=[];this.offset=0;this.samples=[];}
 process(inputs){
  const a=inputs[0]?.[0];if(!a)return true;
  this.pending.push(...a);
  const ratio=sampleRate/16000;
  while(this.offset+1<this.pending.length){
   const i=Math.floor(this.offset),f=this.offset-i;
   this.samples.push(this.pending[i]*(1-f)+this.pending[i+1]*f);this.offset+=ratio;
   if(this.samples.length===640){
    const raw=new ArrayBuffer(1280),view=new DataView(raw);let square=0;
    for(let j=0;j<640;j++){const v=Math.max(-1,Math.min(1,this.samples[j]));square+=v*v;view.setInt16(j*2,Math.round(v*(v<0?32768:32767)),true);}
    this.port.postMessage({raw,rms:Math.sqrt(square/640)},[raw]);this.samples=[];
   }
  }
  const used=Math.min(Math.floor(this.offset),this.pending.length);this.pending.splice(0,used);this.offset-=used;
  return true;
 }
}
registerProcessor('capture-bia-live',CaptureBia);
`;
// Wolof and French both use Latin letters; keep their diacritics and symbols.
// This detects foreign scripts, not the language of ambiguous Latin words.
export function alphabetLiveAutorise(text:string){
 return [...text].every(c=>!(/\p{L}/u.test(c))||/\p{Script=Latin}/u.test(c));
}
export class BiaGeminiLive{
 private socket?:WebSocket;private micro?:MediaStream;private input?:AudioContext;private output?:AudioContext;private capture?:AudioWorkletNode;private source?:MediaStreamAudioSourceNode;private gain?:GainNode;
 private nodes=new Set<AudioBufferSourceNode>();private next=0;private stoppe=true;private ready=false;private finParole=0;private premiere=true;private idle?:ReturnType<typeof setInterval>;private timer?:ReturnType<typeof setTimeout>;
 private userText='';private biaText='';private history:Array<{role:string;parts:Array<{text:string}>}>=[];private muted=false;
 constructor(private code:string,private events:LiveEvents,private historique?:Array<{role:'user'|'bia';text:string}>){this.code=code.toUpperCase().replace(/[^A-Z0-9]/g,'');}
 private send(data:unknown){if(this.socket?.readyState===WebSocket.OPEN)this.socket.send(JSON.stringify(data));}
 private viderSon(){for(const n of this.nodes){n.onended=null;try{n.stop();}catch{}}this.nodes.clear();this.next=0;this.events.parle(false);}
 async demarrer(){
  this.stoppe=false;this.events.etat('Connexion…');
  try{
   this.output=new AudioContext({latencyHint:'interactive'});await this.output.resume();
   this.micro=await navigator.mediaDevices.getUserMedia({audio:{echoCancellation:true,noiseSuppression:true,autoGainControl:true},video:false});
   if(this.stoppe){this.micro.getTracks().forEach(t=>t.stop());return;}
   this.input=new AudioContext({latencyHint:'interactive'});
   const url=URL.createObjectURL(new Blob([WORKLET],{type:'application/javascript'}));
   try{await this.input.audioWorklet.addModule(url);}finally{URL.revokeObjectURL(url);}
   this.capture=new AudioWorkletNode(this.input,'capture-bia-live');
   this.source=this.input.createMediaStreamSource(this.micro);this.gain=this.input.createGain();this.gain.gain.value=0;
   this.source.connect(this.capture);this.capture.connect(this.gain);this.gain.connect(this.input.destination);
   this.capture.port.onmessage=e=>{
    if(this.stoppe||this.muted||!this.ready)return;
    const {raw,rms}=e.data as {raw:ArrayBuffer;rms:number};
    if(rms>0.018){this.finParole=performance.now();this.premiere=true;}
    let binary='';for(const b of new Uint8Array(raw))binary+=String.fromCharCode(b);
    this.send({realtimeInput:{audio:{data:btoa(binary),mimeType:'audio/pcm;rate=16000'}}});
   };
   await this.input.resume();
   if(this.historique){this.history=this.historique.filter(m=>m.text?.trim()).slice(-12).map(m=>({role:m.role==='bia'?'model':'user',parts:[{text:m.text}]}));}
   else try{const saved=JSON.parse(localStorage.getItem('bia-gemini-live-history')||'[]');if(Array.isArray(saved))this.history=saved.slice(-12);}catch{}
   await this.connecter();
   this.finParole=performance.now();
   this.idle=setInterval(()=>{if(!this.stoppe&&performance.now()-this.finParole>90000){this.arreter();this.events.etat('En pause. Appuie sur Parler pour reprendre.');}},5000);
  }catch(e){this.arreter();this.events.erreur(e instanceof Error?e.message:'Connexion impossible.');}
 }
 private async connecter(){
  const response=await fetch('/api/gemini-live/session',{method:'POST',headers:{'x-bia-code':this.code},signal:AbortSignal.timeout(25000),cache:'no-store'});
  const data=await response.json();if(!response.ok)throw Error(data.erreur||'Connexion refusée.');
  try{localStorage.setItem('bia-code',this.code);}catch{}
  if(this.stoppe)return;
  await new Promise<void>((resolve,reject)=>{
   const ws=new WebSocket('wss://generativelanguage.googleapis.com/ws/google.ai.generativelanguage.v1beta.GenerativeService.BidiGenerateContentConstrained?access_token='+encodeURIComponent(data.token));this.socket=ws;
   let established=false;
   const timeout=setTimeout(()=>{ws.close();reject(Error('Gemini Live ne répond pas.'));},12000);
   ws.onopen=()=>this.send({setup:data.setup});
   ws.onmessage=async e=>{
    try{
     const d=JSON.parse(typeof e.data==='string'?e.data:await e.data.text());
     if(d.setupComplete){clearTimeout(timeout);established=true;this.ready=true;this.send({clientContent:{turns:this.history,turnComplete:true}});this.events.etat('Je t’écoute');resolve();}
     if(d.error){this.events.erreur('Gemini Live a refusé la session.');ws.close();return;}
     const c=d.serverContent;
     if(c?.interrupted){this.viderSon();this.finirTour();}
     if(c?.inputTranscription?.text){this.userText+=c.inputTranscription.text;this.events.transcription('user',this.userText,false);}
     if(c?.outputTranscription?.text&&!alphabetLiveAutorise(c.outputTranscription.text)){
      this.arreter();this.events.erreur('Réponse interrompue : Bia doit parler français et wolof uniquement. Appuie sur le micro pour reprendre.');return;
     }
     if(c?.outputTranscription?.text){this.biaText+=c.outputTranscription.text;this.events.transcription('bia',this.biaText,false);}
     for(const p of c?.modelTurn?.parts||[]){if(p.inlineData?.data)this.jouer(p.inlineData.data,p.inlineData.mimeType);}
     if(c?.turnComplete){this.finirTour();this.events.etat('Je t’écoute');}
     for(const call of d.toolCall?.functionCalls||[]){
      if(call.name!=='chercher_connaissances'){this.send({toolResponse:{functionResponses:[{id:call.id,name:call.name,response:{erreur:'Outil indisponible'}}]}});continue;}
      let result;try{const r=await fetch('/api/gemini-live/connaissances',{method:'POST',headers:{'x-bia-code':this.code,'Content-Type':'application/json'},body:JSON.stringify({question:String(call.args?.question||'').slice(0,2000),action:call.args?.action,devoir_id:call.args?.devoir_id,offset:call.args?.offset,historique:this.history.slice(-6).map(m=>({role:m.role==='model'?'bia':'user',text:m.parts.map(p=>p.text).join(' ').slice(0,800)}))}),signal:AbortSignal.timeout(15000)});result=await r.json();}catch{result={erreur:'Mémoire inaccessible. Ne prétends pas l’avoir consultée.'};}
      this.send({toolResponse:{functionResponses:[{id:call.id,name:call.name,response:result}]}});
     }
    }catch{this.events.erreur('Un message audio n’a pas pu être lu.');}
   };
   ws.onerror=()=>{clearTimeout(timeout);if(!established)reject(Error('Connexion audio impossible.'));}
   ws.onclose=()=>{
    clearTimeout(timeout);this.ready=false;
    if(!established){reject(Error('Gemini Live a fermé la connexion.'));return;}
    if(!this.stoppe){this.arreter();this.events.etat('Connexion terminée. Appuie sur Parler pour reprendre.');}
   };
  });
 }
 private jouer(base64:string,mime:string){
  const ctx=this.output;if(!ctx||this.stoppe)return;
  const raw=atob(base64),bytes=new Uint8Array(raw.length);for(let i=0;i<raw.length;i++)bytes[i]=raw.charCodeAt(i);
  if(bytes.length%2)throw Error('PCM incomplet');
  const view=new DataView(bytes.buffer),rate=Number(mime?.match(/rate=(\d+)/)?.[1]||24000),buffer=ctx.createBuffer(1,bytes.length/2,rate),a=buffer.getChannelData(0);
  for(let i=0;i<a.length;i++)a[i]=view.getInt16(i*2,true)/32768;
  const node=ctx.createBufferSource();node.buffer=buffer;node.connect(ctx.destination);this.nodes.add(node);
  const start=Math.max(ctx.currentTime+0.015,this.next);this.next=start+buffer.duration;
  node.onended=()=>{node.disconnect();this.nodes.delete(node);if(!this.nodes.size)this.events.parle(false);};
  node.start(start);this.events.parle(true);this.events.etat('Bia te répond');
  if(this.premiere&&this.finParole){this.events.latence(Math.round(performance.now()-this.finParole+(start-ctx.currentTime)*1000));this.premiere=false;}
 }
 private finirTour(){
  if(this.userText.trim()){this.history.push({role:'user',parts:[{text:this.userText}]});this.events.transcription('user',this.userText,true);}
  if(this.biaText.trim()){this.history.push({role:'model',parts:[{text:this.biaText}]});this.events.transcription('bia',this.biaText,true);}
  this.history=this.history.slice(-12);try{localStorage.setItem('bia-gemini-live-history',JSON.stringify(this.history));}catch{}
  this.userText='';this.biaText='';
 }
 couperMicro(v:boolean){this.muted=v;if(v)this.send({realtimeInput:{audioStreamEnd:true}});}
 arreter(){
  this.stoppe=true;this.ready=false;clearInterval(this.idle);clearTimeout(this.timer);
  this.socket?.close();this.socket=undefined;this.capture?.disconnect();this.source?.disconnect();this.gain?.disconnect();
  this.micro?.getTracks().forEach(t=>t.stop());this.micro=undefined;this.viderSon();
  void this.input?.close().catch(()=>{});void this.output?.close().catch(()=>{});this.input=undefined;this.output=undefined;
 }
}
