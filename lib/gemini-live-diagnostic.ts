type Cas={langue:string;statut:string;entree?:string;source_audio_erreur?:string;jeton_http?:number;fournisseur_http?:number;premier_audio_ms?:number;premier_audio_texte_ms?:number;duree_audio_s?:number;paquets?:number;transcription_entree_caracteres?:number;erreur?:string};
const g=globalThis as typeof globalThis&{biaGeminiDiagnostic?:{statut:string;date?:string;cas:Cas[];travail?:Promise<void>}};
const etat=g.biaGeminiDiagnostic??={statut:'non_lance',cas:[]};
export const resumeGeminiLive=()=>({statut:etat.statut,date:etat.date,cas:etat.cas,perimetre:'Entrée fixe depuis Render ; chaque cas indique audio ou texte. Mesure jusqu’au premier paquet audio. Hors microphone, réseau du téléphone et haut-parleur.'});
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
function sortieVersEntree(raw:Buffer){
 const header=Buffer.alloc(44);header.write('RIFF');header.writeUInt32LE(raw.length+36,4);header.write('WAVEfmt ',8);header.writeUInt32LE(16,16);header.writeUInt16LE(1,20);header.writeUInt16LE(1,22);header.writeUInt32LE(24000,24);header.writeUInt32LE(48000,28);header.writeUInt16LE(2,32);header.writeUInt16LE(16,34);header.write('data',36);header.writeUInt32LE(raw.length,40);
 return pcm16k(Buffer.concat([header,raw]));
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
   cas.entree='preparation_audio_gemini';
   await new Promise<void>((resolve,reject)=>{
    let start=0,bytes=0,packets=0,tour=0;let chunks:Buffer[]=[];const ws=new WebSocket('wss://generativelanguage.googleapis.com/ws/google.ai.generativelanguage.v1beta.GenerativeService.BidiGenerateContentConstrained?access_token='+encodeURIComponent(d.token));
    let settled=false;
    const finish=(error?:string)=>{if(settled)return;settled=true;clearTimeout(timer);ws.close();if(error)reject(Error(error));else{cas.paquets=packets;cas.duree_audio_s=bytes/2/24000;resolve();}};
    const timer=setTimeout(()=>finish('delai_session'),35000);
    ws.onopen=()=>ws.send(JSON.stringify({setup:d.setup}));
    ws.onerror=()=>finish('connexion_google');
    ws.onclose=event=>{if(!settled)finish('fermeture_'+event.code+'_'+event.reason.replace(/auth_tokens\/\S+/g,'[jeton]').slice(0,70));};
    ws.onmessage=async event=>{
     try{
      const msg=JSON.parse(typeof event.data==='string'?event.data:await event.data.text());
      if(msg.error){finish('google_'+String(msg.error.message||msg.error.code||'erreur').replace(/auth_tokens\/\S+/g,'[jeton]').slice(0,80));return;}
      if(msg.setupComplete){
       ws.send(JSON.stringify({clientContent:{turns:[],turnComplete:true}}));
       start=performance.now();
       ws.send(JSON.stringify({realtimeInput:{text:'Répète exactement cette phrase, sans rien ajouter : '+texte}}));
      }
      const c=msg.serverContent;
      if(c?.inputTranscription?.text)cas.transcription_entree_caracteres=(cas.transcription_entree_caracteres||0)+c.inputTranscription.text.length;
      for(const p of c?.modelTurn?.parts||[]){if(p.inlineData?.data){if(!packets)cas.premier_audio_ms=Math.round(performance.now()-start);const part=Buffer.from(p.inlineData.data,'base64');bytes+=part.length;chunks.push(part);packets++;}}
      if(c?.turnComplete){
       if(!packets){finish('tour_sans_audio');return;}
       if(tour===0){
        const audio=sortieVersEntree(Buffer.concat(chunks));cas.premier_audio_texte_ms=cas.premier_audio_ms;delete cas.premier_audio_ms;cas.entree='audio_synthetique_gemini';tour=1;bytes=0;packets=0;chunks=[];start=performance.now();
        ws.send(JSON.stringify({realtimeInput:{audio:{data:audio.toString('base64'),mimeType:'audio/pcm;rate=16000'}}}));ws.send(JSON.stringify({realtimeInput:{audioStreamEnd:true}}));
       }else finish();
      }
      for(const call of msg.toolCall?.functionCalls||[])ws.send(JSON.stringify({toolResponse:{functionResponses:[{id:call.id,name:call.name,response:{contexte:'Pour ce test de salutation, réponds naturellement, sans recherche supplémentaire.'}}]}}));
     }catch{finish('message_invalide');}
    };
   });
   cas.statut='audio_recu';
  }catch(e){cas.statut='echec';cas.erreur=e instanceof Error?e.message.slice(0,100):'echec';}
 }
 etat.statut=etat.cas.every(c=>c.statut==='audio_recu')?'termine':'echec';
})();}
