type Cas={langue:string;statut:string;jeton_http?:number;fournisseur_http?:number;premier_audio_ms?:number;duree_audio_s?:number;paquets?:number;transcription_entree_caracteres?:number;erreur?:string};
const g=globalThis as typeof globalThis&{biaGeminiDiagnostic?:{statut:string;date?:string;cas:Cas[];travail?:Promise<void>}};
const etat=g.biaGeminiDiagnostic??={statut:'non_lance',cas:[]};
export const resumeGeminiLive=()=>({statut:etat.statut,date:etat.date,cas:etat.cas,perimetre:'Audio synthétique fixe envoyé à Gemini depuis Render ; mesure jusqu’au premier paquet audio. Hors microphone, réseau du téléphone et haut-parleur.'});
function pcm16k(wav:Buffer){
 if(wav.toString('ascii',0,4)!=='RIFF'||wav.toString('ascii',8,12)!=='WAVE')throw Error('wav_invalide');
 let rate=0,channels=0,bits=0,format=0,data:Buffer|undefined;
 for(let offset=12;offset+8<=wav.length;){
  const size=wav.readUInt32LE(offset+4),name=wav.toString('ascii',offset,offset+4),start=offset+8;
  if(start+size>wav.length)throw Error('wav_tronque');
  if(name==='fmt '){format=wav.readUInt16LE(start);channels=wav.readUInt16LE(start+2);rate=wav.readUInt32LE(start+4);bits=wav.readUInt16LE(start+14);}
  if(name==='data')data=wav.subarray(start,start+size);
  offset=start+size+(size%2);
 }
 if(!data||format!==1||bits!==16||channels!==1||!rate)throw Error('format_audio_non_pris_en_charge');
 const count=Math.floor(data.length/2*16000/rate),out=Buffer.alloc(count*2);
 for(let i=0;i<count;i++){const at=i*rate/16000,a=Math.floor(at),b=Math.min(a+1,data.length/2-1),f=at-a;out.writeInt16LE(Math.round(data.readInt16LE(a*2)*(1-f)+data.readInt16LE(b*2)*f),i*2);}
 return out;
}
async function sourceAudio(langue:string,texte:string){
 const url=process.env.CHATTERBOX_TEST_URL,key=process.env.CHATTERBOX_TEST_KEY;
 if(!url||!key)throw Error('voix_source_absente');
 const r=await fetch(url.replace(/\/$/,'')+'/tts',{method:'POST',headers:{'Content-Type':'application/json','X-Khalam-Key':key},body:JSON.stringify({input:{text:texte,voice:'female',language:langue}}),signal:AbortSignal.timeout(45000)});
 if(!r.ok)throw Error('voix_source_HTTP_'+r.status);
 const d=await r.json();return pcm16k(Buffer.from(d.output?.audio_base64||'','base64'));
}
export function verifierGeminiLive(){return etat.travail??=(async()=>{
 etat.date=new Date().toISOString();etat.statut='en_cours';
 if(typeof WebSocket==='undefined'){etat.statut='websocket_serveur_indisponible';return;}
 const {POST}=await import('../app/api/gemini-live/session/route');
 const {NextRequest}=await import('next/server');
 for(const [langue,texte] of [['fr','Bonjour Bia. Comment vas-tu ?'],['wo','Nanga def Bia ?']]){
  const cas:Cas={langue,statut:'en_cours'};etat.cas.push(cas);
  try{
   const response=await POST(new NextRequest('https://app.khalam.app/api/gemini-live/session',{method:'POST',headers:{'x-bia-code':process.env.BIA_CODE_MAITRE||''}}));
   cas.jeton_http=response.status;const d=await response.json();
   if(!response.ok){cas.fournisseur_http=d.statut_fournisseur;throw Error(d.motif||'session_refusee');}
   const audio=await sourceAudio(langue,texte);
   await new Promise<void>((resolve,reject)=>{
    let start=0,bytes=0,packets=0;const ws=new WebSocket('wss://generativelanguage.googleapis.com/ws/google.ai.generativelanguage.v1beta.GenerativeService.BidiGenerateContentConstrained?access_token='+encodeURIComponent(d.token));
    let settled=false;
    const finish=(error?:string)=>{if(settled)return;settled=true;clearTimeout(timer);ws.close();if(error)reject(Error(error));else{cas.paquets=packets;cas.duree_audio_s=bytes/2/24000;resolve();}};
    const timer=setTimeout(()=>finish('delai_session'),25000);
    ws.onopen=()=>ws.send(JSON.stringify({setup:d.setup}));
    ws.onerror=()=>finish('connexion_google');
    ws.onclose=()=>{if(!settled)finish('session_fermee_sans_audio');};
    ws.onmessage=async event=>{
     try{
      const msg=JSON.parse(typeof event.data==='string'?event.data:await event.data.text());
      if(msg.error){finish('erreur_protocole_google');return;}
      if(msg.setupComplete){
       ws.send(JSON.stringify({clientContent:{turns:[],turnComplete:true}}));
       ws.send(JSON.stringify({realtimeInput:{audio:{data:audio.toString('base64'),mimeType:'audio/pcm;rate=16000'}}}));
       start=performance.now();ws.send(JSON.stringify({realtimeInput:{audioStreamEnd:true}}));
      }
      const c=msg.serverContent;
      if(c?.inputTranscription?.text)cas.transcription_entree_caracteres=(cas.transcription_entree_caracteres||0)+c.inputTranscription.text.length;
      for(const p of c?.modelTurn?.parts||[]){if(p.inlineData?.data){if(!packets)cas.premier_audio_ms=Math.round(performance.now()-start);bytes+=Buffer.from(p.inlineData.data,'base64').length;packets++;}}
      if(c?.turnComplete)finish(packets?undefined:'tour_sans_audio');
      for(const call of msg.toolCall?.functionCalls||[])ws.send(JSON.stringify({toolResponse:{functionResponses:[{id:call.id,name:call.name,response:{contexte:'Pour ce test de salutation, réponds naturellement, sans recherche supplémentaire.'}}]}}));
     }catch{finish('message_invalide');}
    };
   });
   cas.statut='audio_recu';
  }catch(e){cas.statut='echec';cas.erreur=e instanceof Error?e.message.slice(0,100):'echec';}
 }
 etat.statut=etat.cas.every(c=>c.statut==='audio_recu')?'termine':'echec';
})();}
