
/* ── CE QUE KHALAM RAPIDE NE FAISAIT PAS, ET QUI MANQUAIT ──────────────────

   Mesuré le 24 octobre 2026 : `garder()` n'était appelé que par Khalam. Une
   conversation entière sur la connexion rapide ne laissait aucune ligne dans
   khalam_souvenirs, et douze tours seulement vivaient dans la session. Elle
   oubliait donc deux fois : pendant la conversation, et après.

   TOURS_GARDES vient du serveur (BIA_LIVE_HISTORIQUE) ; 40 est le repli. */
export type LiveEvents={etat:(s:string)=>void;transcription:(role:'user'|'bia',texte:string,fin:boolean)=>void;parle:(v:boolean)=>void;latence:(ms:number,tour:{session:string;tour:number})=>void;erreur:(s:string)=>void;
 /* ── LA CARTE, ET L'ACCORD QUI LA PRÉCÈDE ────────────────────────────────
    `accordPosition` montre la question à l'écran et rend ce qu'elle répond.
    Jamais en silence : sans ces deux rappels, l'outil refuse de partir.
    `carte` ouvre l'écran de guidage sur le lieu trouvé. */
 accordPosition?:()=>Promise<boolean>;carte?:(lieu:{dit:string;lat:number;lon:number;sur?:boolean})=>void};
/* Le niveau au-dessus duquel une voix humaine passe DEVANT l'écho, quelle que
   soit la pièce. En dessous, c'est le plancher appris qui décide. */
const SEUIL_INTERRUPTION=0.06;
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
 private nodes=new Set<AudioBufferSourceNode>();private next=0;private stoppe=true;private ready=false;private finParole=0;private idle?:ReturnType<typeof setInterval>;private timer?:ReturnType<typeof setTimeout>;
 /* ── MESURER UNE FOIS PAR TOUR, ET PAS UNE FOIS PAR MORCEAU ──────────────

    Lu sur /api/etat le 23 octobre 2026 à 22:28 : neuf « mesures » en 393 ms,
    de 31 à 2 324 ms, pour UNE seule réponse. Trente et une mesures pour cinq
    tours réels, et une médiane bonne par hasard.

    LA FAUTE ÉTAIT ICI. `premiere` était ré-armé par n'importe quelle trame
    au-dessus du seuil de bruit — donc par la voix de BIA que le micro entend
    par le haut-parleur. Chaque morceau audio suivant déclenchait une mesure,
    et ce qu'elle mesurait n'était plus une attente mais la PROFONDEUR DE LA
    FILE DE LECTURE : le terme d'avance de planification grandit à mesure que
    les morceaux s'empilent. D'où les valeurs qui montent.

    Et mon garde-fou du serveur ne rattrapait rien : il bornait les valeurs
    impossibles, pas le double armement. RÈGLE 4, corollaire — un filet sous
    le mauvais trou ne rattrape rien.

    DONC : on n'arme la mesure que sur une parole entendue PENDANT QU'ELLE SE
    TAIT, et le premier morceau de sa réponse la referme. `finParole`, lui,
    reste mis à jour par toutes les trames : c'est la veille des 90 secondes,
    qui doit compter l'activité et non les tours.

    CE QUE ÇA NE MESURE PLUS, exprès : le tour où on lui coupe la parole. Les
    trames y arrivent pendant qu'elle parle, donc rien ne s'arme. Mieux vaut
    quatre tours justes que trente faux. */
 private finParoleMesure=0;private mesurePrete=false;private finDuSon=0;
 /* ── ELLE SE COUPE ELLE-MÊME ───────────────────────────────────────────────

    Lamine, le 24 octobre 2026 : « BIA se coupe elle-même parfois. »

    LA CAUSE PROBABLE, ET ELLE EST MESURABLE : le micro capte sa propre voix
    par le haut-parleur, et la détection d'activité de Google la prend pour
    une interruption (`START_OF_ACTIVITY_INTERRUPTS`). Elle s'interrompt
    elle-même, littéralement.

    L'ANNULATION D'ÉCHO EST DÉJÀ DEMANDÉE — echoCancellation,
    noiseSuppression, autoGainControl sont posés depuis le début sur
    getUserMedia. Ce levier-là est dépensé : il ne reste rien à activer, et
    pourtant l'écho passe. C'est le cas ordinaire sur un téléphone tenu à la
    main, haut-parleur vers soi.

    CE QU'ON FAIT, ET C'EST LE MOINS INTRUSIF QUI RESTE : pendant qu'elle
    parle, on n'envoie plus à Google les trames dont le niveau ressemble à son
    propre écho. Une VRAIE interruption — quelqu'un qui parle par-dessus —
    dépasse nettement ce niveau, et passe. On garde donc la possibilité de la
    couper en parlant, qui est tout l'intérêt d'une conversation.

    LE PLANCHER EST APPRIS, PAS DEVINÉ : on observe le niveau de l'écho
    pendant qu'elle parle et on exige de le dépasser franchement. Un seuil
    fixe marcherait dans une pièce et pas dans l'autre.

    ET ON COMPTE TOUT : les interruptions survenues pendant qu'elle parlait,
    celles qu'on a laissées passer, et les trames retenues. Sans ces nombres,
    on ne saurait pas si le remède marche — ni s'il l'empêche, elle, d'être
    coupée pour de vrai. */
 private echoPlancher=0;private retenues=0;private laissees=0;private coupuresPendantParole=0;private coupuresAuSilence=0;
 /* ── POURQUOI ELLE S'ARRÊTE, ET IL Y A CINQ CHEMINS ───────────────────────

    Le 24 octobre à 15:35, elle s'est coupée plusieurs fois et TOUS les
    compteurs d'écho valaient zéro. Mon relevé ne partait que sur une
    interruption de Google : zéro pouvait vouloir dire « pas d'écho » comme
    « code pas encore chargé ». Deux causes, un seul chiffre — donc aucune
    cause nommée. C'est un défaut de la mesure, pas du remède.

    Désormais le relevé part à CHAQUE tour, et chaque arrêt porte son nom :
      alphabet   — la garde « français et wolof » a fermé la session
      fermeture  — le WebSocket s'est fermé (avec son code)
      veille     — 90 secondes de silence
      erreur     — un message illisible
    Un arrêt sans nom est un arrêt qu'on cherchera encore demain. */
 private arrets:Record<string,number>={};private dernierCode=0;
 private sessionMesure=Math.random().toString(36).slice(2,10)+Date.now().toString(36);private tourMesure=0;
 private userText='';private biaText='';private history:Array<{role:string;parts:Array<{text:string}>}>=[];private muted=false;
 constructor(private code:string,private events:LiveEvents,private historique?:Array<{role:'user'|'bia';text:string}>,private tours=40,private personne='',private version=''){this.code=code.toUpperCase().replace(/[^A-Z0-9]/g,'');this.tours=Number.isFinite(tours)&&tours>=4&&tours<=80?Math.round(tours):40;}
 private send(data:unknown){if(this.socket?.readyState===WebSocket.OPEN)this.socket.send(JSON.stringify(data));}
 private viderSon(){for(const n of this.nodes){n.onended=null;try{n.stop();}catch{}}this.nodes.clear();this.next=0;this.finDuSon=performance.now();this.events.parle(false);}
 /* Elle parle, ou elle vient de finir. Les 300 ms de marge couvrent la queue
    d'écho du haut-parleur, qui ré-armait la mesure juste après sa dernière
    syllabe. */
 private elleParle(){return this.nodes.size>0||(this.finDuSon>0&&performance.now()-this.finDuSon<300);}
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
    if(rms>0.018){
     this.finParole=performance.now();                       // veille : toute activité
     if(!this.elleParle()){this.finParoleMesure=this.finParole;this.mesurePrete=true;}
    }
    /* ── PENDANT QU'ELLE PARLE, ON FILTRE SON PROPRE ÉCHO ──────────────────
       Le plancher d'écho s'apprend sur les trames entendues pendant sa
       parole ; il redescend doucement pour qu'une pièce plus calme ne reste
       pas bloquée sur un ancien niveau. */
    if(this.elleParle()){
     this.echoPlancher=Math.max(rms,this.echoPlancher*0.995);
     if(rms<=Math.max(SEUIL_INTERRUPTION,this.echoPlancher*2.5)){this.retenues++;return;}
     this.laissees++;
    }
    let binary='';for(const b of new Uint8Array(raw))binary+=String.fromCharCode(b);
    this.send({realtimeInput:{audio:{data:btoa(binary),mimeType:'audio/pcm;rate=16000'}}});
   };
   await this.input.resume();
   if(this.historique){this.history=this.historique.filter(m=>m.text?.trim()).slice(-this.tours).map(m=>({role:m.role==='bia'?'model':'user',parts:[{text:m.text}]}));}
   else try{const saved=JSON.parse(localStorage.getItem('bia-gemini-live-history')||'[]');if(Array.isArray(saved))this.history=saved.slice(-this.tours);}catch{}
   await this.connecter();
   this.finParole=performance.now();
   this.idle=setInterval(()=>{if(!this.stoppe&&performance.now()-this.finParole>90000){this.arrets.veille=(this.arrets.veille||0)+1;this.declarerEcho();this.arreter();this.events.etat('En pause. Appuie sur Parler pour reprendre.');}},5000);
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
   const timeout=setTimeout(()=>{ws.close();reject(Error('Khalam Rapide ne répond pas.'));},12000);
   ws.onopen=()=>this.send({setup:data.setup});
   ws.onmessage=async e=>{
    try{
     const d=JSON.parse(typeof e.data==='string'?e.data:await e.data.text());
     if(d.setupComplete){clearTimeout(timeout);established=true;this.ready=true;this.send({clientContent:{turns:this.history,turnComplete:true}});this.events.etat('Je t’écoute');resolve();}
     if(d.error){this.events.erreur('Khalam Rapide a refusé la session.');ws.close();return;}
     const c=d.serverContent;
     if(c?.interrupted){
      /* Mesuré avant d'être corrigé : une coupure survenue PENDANT qu'elle
         parlait est une interruption d'elle-même jusqu'à preuve du contraire ;
         une coupure dans le silence vient bien de la personne. */
      if(this.elleParle())this.coupuresPendantParole++;else this.coupuresAuSilence++;
      this.declarerEcho();
      this.viderSon();this.finirTour();
     }
     if(c?.inputTranscription?.text){this.userText+=c.inputTranscription.text;this.events.transcription('user',this.userText,false);}
     if(c?.outputTranscription?.text&&!alphabetLiveAutorise(c.outputTranscription.text)){
      this.arrets.alphabet=(this.arrets.alphabet||0)+1;this.declarerEcho();
      this.arreter();this.events.erreur('Réponse interrompue : Bia doit parler français et wolof uniquement. Appuie sur le micro pour reprendre.');return;
     }
     if(c?.outputTranscription?.text){this.biaText+=c.outputTranscription.text;this.events.transcription('bia',this.biaText,false);}
     for(const p of c?.modelTurn?.parts||[]){if(p.inlineData?.data)this.jouer(p.inlineData.data,p.inlineData.mimeType);}
     if(c?.turnComplete){this.finirTour();this.events.etat('Je t’écoute');}
     for(const call of d.toolCall?.functionCalls||[]){
      if(call.name==='garder_la_correction'){
       /* L'écriture passe par la route qui réutilise les fonctions de Khalam.
          On lui donne le fil : c'est lui qui porte la provenance. */
       let reponse;
       try{
        const r=await fetch('/api/gemini-live/correction',{method:'POST',signal:AbortSignal.timeout(15000),
         headers:{'content-type':'application/json','x-bia-code':this.code},
         body:JSON.stringify({phrase:String(call.args?.phrase||'').slice(0,4000),langue:call.args?.langue,
          history:this.history.slice(-12).map(m=>({role:m.role==='model'?'bia':'user',text:m.parts.map(p=>p.text).join(' ').slice(0,800)}))})});
        reponse=await r.json();
       }catch{reponse={ecrit:false,erreur:'Le rangement n’a pas répondu. Dis-le au lieu d’annoncer une mémorisation.'};}
       this.send({toolResponse:{functionResponses:[{id:call.id,name:call.name,response:reponse}]}});
       continue;
      }
      if(call.name==='montrer_le_chemin'){
       const reponse=await this.montrerLeChemin(String(call.args?.destination||'').slice(0,160));
       this.send({toolResponse:{functionResponses:[{id:call.id,name:call.name,response:reponse}]}});
       continue;
      }
      if(call.name!=='chercher_connaissances'){this.send({toolResponse:{functionResponses:[{id:call.id,name:call.name,response:{erreur:'Outil indisponible'}}]}});continue;}
      let result;try{const r=await fetch('/api/gemini-live/connaissances',{method:'POST',headers:{'x-bia-code':this.code,'Content-Type':'application/json'},body:JSON.stringify({question:String(call.args?.question||'').slice(0,2000),action:call.args?.action,devoir_id:call.args?.devoir_id,offset:call.args?.offset,historique:this.history.slice(-6).map(m=>({role:m.role==='model'?'bia':'user',text:m.parts.map(p=>p.text).join(' ').slice(0,800)}))}),signal:AbortSignal.timeout(15000)});result=await r.json();}catch{result={erreur:'Mémoire inaccessible. Ne prétends pas l’avoir consultée.'};}
      this.send({toolResponse:{functionResponses:[{id:call.id,name:call.name,response:result}]}});
     }
    }catch{this.arrets.erreur=(this.arrets.erreur||0)+1;this.events.erreur('Un message audio n’a pas pu être lu.');}
   };
   ws.onerror=()=>{clearTimeout(timeout);if(!established)reject(Error('Connexion audio impossible.'));}
   ws.onclose=(e?:{code?:number})=>{
    clearTimeout(timeout);this.ready=false;
    if(!established){reject(Error('Khalam Rapide a fermé la connexion.'));return;}
    /* Une fermeture EN PLEINE RÉPONSE est exactement ce que Lamine décrit :
       elle s'arrête au milieu d'une phrase. On la nomme et on la compte. */
    if(!this.stoppe){
     this.arrets[this.elleParle()?'fermeture_pendant_parole':'fermeture']=(this.arrets[this.elleParle()?'fermeture_pendant_parole':'fermeture']||0)+1;
     this.dernierCode=Number(e?.code)||0;this.declarerEcho();
     this.arreter();this.events.etat('Connexion terminée. Appuie sur Parler pour reprendre.');
    }
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
  node.onended=()=>{node.disconnect();this.nodes.delete(node);if(!this.nodes.size){this.finDuSon=performance.now();this.events.parle(false);}};
  node.start(start);this.events.parle(true);this.events.etat('Bia te répond');
  /* Le premier morceau de SA réponse, et lui seul. L'avance de planification
     compte : ce morceau-ci n'est pas encore audible, et c'est le son qu'on
     mesure, pas l'arrivée du paquet. */
  if(this.mesurePrete&&this.finParoleMesure){
   this.mesurePrete=false;this.tourMesure+=1;
   const avance=Math.max(0,(start-ctx.currentTime)*1000);
   this.events.latence(Math.round(performance.now()-this.finParoleMesure+avance),{session:this.sessionMesure,tour:this.tourMesure});
  }
 }
 private finirTour(){
  const dit=this.userText,repondu=this.biaText;
  if(this.userText.trim()){this.history.push({role:'user',parts:[{text:this.userText}]});this.events.transcription('user',this.userText,true);}
  if(this.biaText.trim()){this.history.push({role:'model',parts:[{text:this.biaText}]});this.events.transcription('bia',this.biaText,true);}
  this.history=this.history.slice(-this.tours);try{localStorage.setItem('bia-gemini-live-history',JSON.stringify(this.history));}catch{}
  /* ── LE TOUR EST GARDÉ, COMME SUR KHALAM ─────────────────────────────
     `void` : écrire ne doit jamais retarder la parole suivante. Un souvenir
     perdu coûte un souvenir ; une seconde d'attente se paie à chaque
     phrase. C'est la règle de lib/souvenirs.ts, appliquée ici aussi. */
  /* Le relevé part à chaque fin de tour : un zéro ne doit plus pouvoir
     signifier « rien mesuré ». */
  this.declarerEcho();
  if(this.personne&&(dit.trim()||repondu.trim())){
   void fetch('/api/gemini-live/souvenir',{method:'POST',keepalive:true,
    headers:{'content-type':'application/json','x-bia-code':this.code},
    body:JSON.stringify({personne:this.personne,dit,repondu})}).catch(()=>{});
  }
  this.userText='';this.biaText='';
 }
 /* ── LE CHEMIN : ACCORD, POSITION, LIEU, DIRECTION, CARTE ────────────────

    L'ordre compte. On demande l'accord AVANT de toucher au GPS : la
    permission du navigateur n'est pas une question posée par BIA, et Lamine
    a demandé « son accord explicite à l'écran, jamais en silence ».

    LA POSITION NE QUITTE PAS CE TOUR. Elle n'entre ni dans l'historique, ni
    dans les souvenirs, ni dans aucun compteur : elle sert à /api/orientation
    et disparaît avec la fonction. Ce qui revient au modèle, c'est une phrase
    et des nombres — jamais les coordonnées. */
 /* Ce que l'écho a coûté sur ce tour. Des comptes et un niveau, rien d'autre. */
 private declarerEcho(){
  void fetch('/api/mesure',{method:'POST',keepalive:true,headers:{'content-type':'application/json'},
   body:JSON.stringify({type:'khalam_rapide',etape:'echo',
    coupures_pendant_parole:this.coupuresPendantParole,coupures_au_silence:this.coupuresAuSilence,
    trames_retenues:this.retenues,trames_laissees:this.laissees,
    echo_plancher:Math.round(this.echoPlancher*1000),
    arrets:this.arrets,code_fermeture:this.dernierCode,version:this.version})}).catch(()=>{});
 }
 private async montrerLeChemin(destination:string){
  if(!destination.trim())return {erreur:'Dis-moi d’abord où elle veut aller.'};
  if(!this.events.accordPosition||!this.events.carte)return {erreur:'La carte n’est pas disponible ici.'};
  if(!navigator.geolocation)return {erreur:'Ce téléphone ne sait pas donner sa position.'};
  if(!await this.events.accordPosition())
   return {refus:true,erreur:'Elle n’a pas voulu partager sa position. Ne la redemande pas ; propose de décrire le chemin avec des repères qu’elle connaît.'};
  let ou:GeolocationPosition;
  try{
   ou=await new Promise<GeolocationPosition>((ok,non)=>navigator.geolocation.getCurrentPosition(ok,non,
    {enableHighAccuracy:true,timeout:12000,maximumAge:30000}));
  }catch{return {erreur:'Sa position n’est pas arrivée. Propose de réessayer dehors, ou de décrire le chemin autrement.'};}
  const de={lat:ou.coords.latitude,lon:ou.coords.longitude};
  const entetes={'content-type':'application/json','x-bia-code':this.code};
  try{
   const r=await fetch(`/api/lieu?quoi=${encodeURIComponent(destination)}`,{headers:{'x-bia-code':this.code},signal:AbortSignal.timeout(12000)});
   const d=await r.json() as {candidats?:Array<{dit:string;lat:number;lon:number;sur?:boolean}>;panne?:boolean};
   const lieu=(d.candidats||[])[0];
   if(!lieu)return {erreur:d.panne?'La recherche de lieux ne répond pas. Dis-le-lui et propose de réessayer.':`Je ne trouve pas « ${destination} ». Demande-lui un repère connu à côté.`};
   const o=await fetch('/api/orientation',{method:'POST',headers:entetes,signal:AbortSignal.timeout(12000),
    body:JSON.stringify({de,vers:{lat:lieu.lat,lon:lieu.lon,nom:lieu.dit},langue:'fr'})});
   const chemin=await o.json() as {phrase?:string;direction?:string;distance_m?:number;marche_minutes?:number;par_les_rues?:boolean};
   /* La carte s'ouvre VRAIMENT : c'est ce qui manquait, et la consigne
      interdit au modèle de dire qu'il l'a montrée sans cet outil. */
   this.events.carte(lieu);
   return {
    carte_affichee:true,
    destination:lieu.dit,
    sur:lieu.sur!==false,
    direction:chemin.direction,
    distance_m:chemin.distance_m,
    marche_minutes:chemin.marche_minutes,
    distance_par_les_rues:chemin.par_les_rues===true,
    a_dire:chemin.phrase,
    instruction:'Dis `a_dire` en une phrase courte, dans sa langue. La carte est déjà à l’écran. Si `sur` est faux, préviens que tu n’es pas certaine de cet endroit. Ne donne pas de durée en voiture.',
   };
  }catch{return {erreur:'Le chemin n’a pas pu être calculé. Dis-le simplement.'};}
 }
 couperMicro(v:boolean){this.muted=v;if(v)this.send({realtimeInput:{audioStreamEnd:true}});}
 arreter(){
  this.stoppe=true;this.ready=false;this.mesurePrete=false;clearInterval(this.idle);clearTimeout(this.timer);
  this.socket?.close();this.socket=undefined;this.capture?.disconnect();this.source?.disconnect();this.gain?.disconnect();
  this.micro?.getTracks().forEach(t=>t.stop());this.micro=undefined;this.viderSon();
  void this.input?.close().catch(()=>{});void this.output?.close().catch(()=>{});this.input=undefined;this.output=undefined;
 }
}
