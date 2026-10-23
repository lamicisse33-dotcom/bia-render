type Cas={langue:string;statut:string;entree?:string;jeton_http?:number;fournisseur_http?:number;premier_audio_ms?:number;duree_audio_s?:number;paquets?:number;transcription_entree_caracteres?:number;erreur?:string};
const g=globalThis as typeof globalThis&{biaGeminiDiagnostic?:{statut:string;date?:string;cas:Cas[];connaissances?:Record<string,unknown>;travail?:Promise<void>}};
const etat=g.biaGeminiDiagnostic??={statut:'non_lance',cas:[]};
export const resumeGeminiLive=()=>({statut:etat.statut,date:etat.date,cas:etat.cas,connaissances:etat.connaissances,perimetre:'Question audio synthétique Khalam diffusée en temps réel depuis Render vers Khalam Rapide. Mesure depuis la fin de cet audio jusqu’au premier paquet de réponse. Hors microphone, réseau du téléphone et haut-parleur.'});
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
export function verifierGeminiLive(){return etat.travail??=(async()=>{
 etat.date=new Date().toISOString();etat.statut='en_cours';
 if(typeof WebSocket==='undefined'){etat.statut='websocket_serveur_indisponible';return;}
 try{
  const consulter=async(body:Record<string,unknown>)=>{
   const r=await fetch('https://app.khalam.app/api/gemini-live/connaissances',{method:'POST',headers:{'content-type':'application/json','x-bia-code':process.env.BIA_CODE_MAITRE||'',origin:'https://app.khalam.app'},body:JSON.stringify(body),signal:AbortSignal.timeout(25000),cache:'no-store'});
   const d=await r.json();if(!r.ok)throw Error('connaissances_http_'+r.status);return d;
  };
  const recherche=await consulter({question:'Parlons des enfants et des corrections de wolof.'});
  const catalogue=await consulter({action:'lister_devoirs'});
  const lexique=await consulter({action:'lister_lexique'});
  const premier=catalogue.devoirs?.[0];
  const lecture=premier?await consulter({action:'lire_devoir',devoir_id:premier.id}):null;
  etat.connaissances={statut:'verifie',date:new Date().toISOString(),http:200,devoirs:catalogue.total,incomplets:catalogue.incomplets,lexique_entrees:lexique.total,mots_corriges:recherche.acces?.mots_corriges,lexique_pagine:Array.isArray(lexique.lexique)&&lexique.lexique.length>0,lecture_devoir:Boolean(lecture?.devoir?.texte),devoirs_transmis:recherche.acces?.devoirs_transmis,maitrises_transmises:recherche.acces?.maitrises_transmises,instructions_chargees:recherche.acces?.instructions_chargees};
 }catch(e){etat.connaissances={statut:'echec',erreur:e instanceof Error?e.message:'verification_impossible'};}
 const {POST:parler}=await import('../app/api/chatterbox-test/route');
 const {NextRequest}=await import('next/server');
 for(const [langue,texte] of [['fr','Bonjour Bia. Comment vas-tu ?'],['wo','Nanga def Bia ?']]){
  const cas:Cas={langue,statut:'en_cours',entree:'audio_synthetique_khalam'};etat.cas.push(cas);
  try{
   const speech=await parler(new NextRequest('https://app.khalam.app/api/chatterbox-test',{method:'POST',headers:{'content-type':'application/json','x-chatterbox-test-key':process.env.CHATTERBOX_TEST_KEY||''},body:JSON.stringify({input:{text:texte,voice:'female',language:langue,seed:913}})}));
   if(!speech.ok)throw Error('source_audio_http_'+speech.status);
   const spoken=await speech.json();if(!spoken.output?.audio_base64)throw Error('source_audio_absente');
   const audio=pcm16k(Buffer.from(spoken.output.audio_base64,'base64'));
   const response=await fetch('https://app.khalam.app/api/gemini-live/session',{method:'POST',headers:{'x-bia-code':process.env.BIA_CODE_MAITRE||'',origin:'https://app.khalam.app'},signal:AbortSignal.timeout(25000),cache:'no-store'});
   cas.jeton_http=response.status;const d=await response.json();
   if(!response.ok){cas.fournisseur_http=d.statut_fournisseur;throw Error(d.motif||'session_refusee');}
   await new Promise<void>((resolve,reject)=>{
    let end=0,first=0,bytes=0,packets=0,settled=false;
    const ws=new WebSocket('wss://generativelanguage.googleapis.com/ws/google.ai.generativelanguage.v1beta.GenerativeService.BidiGenerateContentConstrained?access_token='+encodeURIComponent(d.token));
    const finish=(error?:string)=>{if(settled)return;settled=true;clearTimeout(timer);ws.close();if(error)reject(Error(error));else{cas.premier_audio_ms=Math.round(first-end);cas.paquets=packets;cas.duree_audio_s=bytes/2/24000;resolve();}};
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
       void (async()=>{
        for(let offset=0;offset<audio.length;offset+=1280){
         if(settled)return;
         ws.send(JSON.stringify({realtimeInput:{audio:{data:audio.subarray(offset,offset+1280).toString('base64'),mimeType:'audio/pcm;rate=16000'}}}));
         await new Promise(r=>setTimeout(r,40));
        }
        end=performance.now();
        for(let n=0;n<16;n++){
         if(settled)return;
         ws.send(JSON.stringify({realtimeInput:{audio:{data:Buffer.alloc(1280).toString('base64'),mimeType:'audio/pcm;rate=16000'}}}));
         await new Promise(r=>setTimeout(r,40));
        }
        if(!settled)ws.send(JSON.stringify({realtimeInput:{audioStreamEnd:true}}));
       })().catch(()=>finish('envoi_audio'));
      }
      const c=msg.serverContent;
      if(c?.inputTranscription?.text)cas.transcription_entree_caracteres=(cas.transcription_entree_caracteres||0)+c.inputTranscription.text.length;
      for(const p of c?.modelTurn?.parts||[]){
       if(!p.inlineData?.data)continue;
       if(!end){finish('reponse_avant_fin_parole');return;}
       if(!packets)first=performance.now();
       bytes+=Buffer.from(p.inlineData.data,'base64').length;packets++;
      }
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
