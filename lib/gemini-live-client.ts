// Reste autonome : aucun import chargé pendant la capture du micro.
export function panneLiveRecuperable(code:number,motif:string){
 return code===1006||[429,500,502,503,504].includes(code)||/quota|resource.exhausted|overload|unavailable|temporar|service error|internal error/i.test(motif);
}

/* ── CE QUE KHALAM RAPIDE NE FAISAIT PAS, ET QUI MANQUAIT ──────────────────

   Mesuré le 24 octobre 2026 : `garder()` n'était appelé que par Khalam. Une
   conversation entière sur la connexion rapide ne laissait aucune ligne dans
   khalam_souvenirs, et douze tours seulement vivaient dans la session. Elle
   oubliait donc deux fois : pendant la conversation, et après.

   TOURS_GARDES vient du serveur (BIA_LIVE_HISTORIQUE) ; 40 est le repli. */
export type SortieAvatarLive={pret:()=>boolean;parle:()=>boolean;contexte:(ctx:AudioContext)=>void;preparer:(ctx?:AudioContext)=>Promise<void>;fermer:()=>Promise<void>;interrompre:()=>void;lire:(buffer:AudioBuffer,premier?:(date:number)=>void)=>Promise<number>};
export type LiveEvents={avatar?:SortieAvatarLive;etat:(s:string)=>void;transcription:(role:'user'|'bia',texte:string,fin:boolean)=>void;parle:(v:boolean)=>void;latence:(ms:number,tour:{session:string;tour:number})=>void;erreur:(s:string)=>void;
 /* ── LA CARTE, ET L'ACCORD QUI LA PRÉCÈDE ────────────────────────────────
    `accordPosition` montre la question à l'écran et rend ce qu'elle répond.
    Jamais en silence : sans ces deux rappels, l'outil refuse de partir.
    `carte` ouvre l'écran de guidage sur le lieu trouvé. */
 /* ── LA BOUCHE SUIVAIT UNE MINUTERIE, PAS LE SON ─────────────────────────

    Lamine, le 27 octobre 2026 : « synchronise davantage la bouche de BIA,
    elle est sur la voix Khalam Rapide ».

    Sur Khalam, la bouche lit l'énergie du son, tranche par tranche, et
    s'ouvre d'autant (voir `enveloppeDe` et `formeBouche` dans app/page.tsx).
    Sur Khalam Rapide, elle n'avait RIEN à lire : le client ne disait que
    `parle(true)` / `parle(false)`, et la page faisait tourner une minuterie
    aveugle — une forme toutes les 110 ms, sans aucun rapport avec ce qui
    sortait du haut-parleur. Trois décalages s'additionnaient :

      1. `parle(true)` part quand le morceau est PROGRAMMÉ, pas quand il est
         audible. Les morceaux s'empilent sur `this.next` : la bouche
         commençait à bouger jusqu'à plusieurs centaines de millisecondes
         avant le son.
      2. 110 ms fixes ne suivent ni les syllabes, ni les silences entre deux
         phrases : elle mâchait dans le vide.
      3. Le haut-parleur lui-même a un retard (`outputLatency`) que rien ne
         compensait.

    Le son est pourtant ICI, en clair, dans `jouer()`. On en rend donc
    l'enveloppe — l'énergie moyenne par tranche de 40 ms — avec l'instant
    exact où ce morceau commencera, DANS L'HORLOGE DU HAUT-PARLEUR. La page
    n'a plus qu'à la lire. Elle ne change rien à ce qui se dit ni à ce qui
    s'entend : c'est une mesure, pas un réglage. */
 bouche?:(segment:{debut:number;fin:number;valeurs:number[];pic:number;pas:number})=>void;
 accordPosition?:()=>Promise<boolean>;carte?:(lieu:{dit:string;lat:number;lon:number;sur?:boolean})=>void;
 /* ── UN RAPPEL VIENT D'ÊTRE POSÉ ─────────────────────────────────────────
    La page a besoin de le savoir pour demander les notifications au prochain
    geste : sur iPhone, l'autorisation exige un geste, et parler n'en est pas
    un. Sans ce signal, le premier rappel de quelqu'un ne sonnerait jamais —
    la page croirait qu'il n'a aucun rappel et ne demanderait rien. */
 rappelPose?:(sonnera:boolean)=>void;
 /* ── LIRE UN PAPIER, DEMANDÉ À LA VOIX ───────────────────────────────────
    Vérifié le 24 octobre : /api/papier-photo marche depuis septembre, mais
    seulement derrière un bouton. Khalam Rapide n'avait AUCUN moyen d'ouvrir
    l'appareil photo — donc « lis-moi ce papier » n'avait pas de réponse.
    La page ouvre le champ de fichier, envoie l'image, et rend le texte À
    BIA, qui le dira elle-même : le prononcer ici aussi ferait deux voix. */
 photo?:()=>Promise<{titre?:string;francais?:string;wolof?:string;erreur?:string}>;
 /* ── MONTRER DES IMAGES OU UNE VIDÉO ─────────────────────────────────────
    Khalam les montre depuis septembre par ses balises d'écran ; Khalam
    Rapide n'avait rien. La page les affiche — mêmes quotas, même cache,
    même fournisseur : lib/trouver.ts est appelé une seule fois pour les
    deux moteurs. */
 montrer?:(v:{sorte:'image'|'video';requete:string;pieces:Array<Record<string,unknown>>})=>void;
 /* ── ÉCRIRE UN PAPIER ────────────────────────────────────────────────────
    « Écris-moi un message » n'était pas compris : la consigne interdisait
    les gestes d'écran sauf la carte, et aucun outil ne savait écrire. La
    page fabrique le document par le MÊME chemin que le bouton — /api/document
    et l'écran plein — donc rien n'est dupliqué. */
 ecrire?:(sorte:'message'|'mail'|'devis'|'facture',consigne?:string)=>Promise<{ecrit:boolean;titre?:string;erreur?:string}>;
 /* ── FERMER, VRAIMENT ────────────────────────────────────────────────────
    Elle disait « c'est fermé » sans rien fermer : aucun outil ne le faisait.
    Celui-ci rend la LISTE de ce qu'il a réellement fermé — une liste vide
    veut dire que rien n'était ouvert, et elle doit le dire ainsi. */
 fermer?:(quoi:'carte'|'document'|'photo'|'tout')=>string[];
 /* ── QUAND GOOGLE REFUSE, ON NE LE DIT PAS EN ANGLAIS ────────────────────

    Lamine, le 25 octobre : « ce message de Google ne doit plus jamais
    s'afficher à un utilisateur ».

    Il avait raison de le réclamer, et c'est MOI qui l'avais mis à l'écran :
    la veille, pour pouvoir nommer la cause d'une fermeture, j'avais ajouté
    le motif brut de Google dans le message affiché. Le motif reste — il part
    dans /api/etat, c'est là qu'il sert — mais il ne se montre plus.

    `indisponible` dit à la page de basculer sur Khalam toute seule. Une
    assistante qui ne répond pas est pire qu'une assistante plus lente. */
 indisponible?:(message:string)=>void};
/* Le niveau au-dessus duquel une voix humaine passe DEVANT l'écho, quelle que
   soit la pièce. En dessous, c'est le plancher appris qui décide. */
/* La SEULE phrase que voit quelqu'un quand le fournisseur refuse. Écrite une
   fois, pour qu'aucun chemin ne puisse en inventer une autre — ni, surtout,
   laisser passer l'anglais de Google. */
const INDISPONIBLE="Je ne peux pas parler pour le moment. Écris-moi ici, je te réponds par écrit.";
const SEUIL_INTERRUPTION=0.06;
/* Le plancher appris ne monte pas au-delà, et la barre à franchir non plus :
   sans ces deux bornes, une pièce bruyante rend BIA ininterrompable, et c'est
   exactement ce que les compteurs du 24 octobre ont montré (zéro trame
   laissée sur 43 tours). */
const PLAFOND_ECHO=0.08;
const PLAFOND_INTERRUPTION=0.16;
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
 /* ── LE PETIT JOURNAL, CÔTÉ KHALAM RAPIDE ────────────────────────────────

    Lamine, 24 octobre : « heure de début de parole, de fin détectée, de
    premier son, pour que je voie si elle me coupe encore » et « mesure aussi
    la lenteur, étape par étape ».

    CE QU'ON PEUT OBSERVER ICI, ET CE QU'ON NE PEUT PAS. La fin de parole est
    décidée par Google, sur l'audio qu'on lui envoie : le client n'en est pas
    averti. On ne peut donc pas lire le silence qu'il a réellement attendu.

    MAIS UNE CHOSE SE DÉDUIT SANS RISQUE : le temps entre sa dernière trame
    forte et le PREMIER signe de la réponse contient forcément ce silence,
    plus le modèle, plus le réseau. Si ce total est SOUS le silence exigé,
    alors Google n'a pas attendu ce qu'on lui a demandé — le réglage n'a pas
    pris. C'est un test à sens unique, et il suffit pour répondre à sa
    question. Dans l'autre sens, on ne sépare pas le silence du modèle, et le
    champ `limite` de /api/etat le dit.

    LES ÉTAPES : premier texte (le modèle a commencé), premier son (l'audio
    arrive), démarrage du haut-parleur (l'avance de planification). */
 private debutParoleMesure=0;private premierTexteMs=0;private silenceExige=0;private journalEnvoye=false;
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
 /* ── LE SEUL CAS OÙ GOOGLE NOUS DIT POURQUOI, ET JE LE JETAIS ────────────

    Lamine, le 24 octobre 2026 : « Khalam Rapide a fermé la connexion » et
    plus rien. Cette phrase sort d'ICI, d'une fermeture survenue AVANT
    `setupComplete` — donc d'un setup que Google refuse.

    Et la ligne qui la produisait était :
        if(!established){reject(Error('Khalam Rapide a fermé la connexion.'));return;}
    Pas de code, pas de motif, rien de remonté. Le seul moment où Google
    explique son refus était précisément celui qu'on jetait. On ne pouvait
    donc que deviner — et deviner sur un serveur qu'on ne contrôle pas, c'est
    ne rien savoir du tout.

    Désormais le code ET le motif de fermeture remontent, avec le fait que
    c'était avant ou après la poignée de main. Un 1007 qui porte un message
    et un 1006 muet ne se soignent pas pareil. */
 private motifFermeture='';private erreurGoogle='';
 private sessionMesure=Math.random().toString(36).slice(2,10)+Date.now().toString(36);private tourMesure=0;
 private userText='';private biaText='';private history:Array<{role:string;parts:Array<{text:string}>}>=[];private muted=false;
 constructor(private code:string,private events:LiveEvents,private historique?:Array<{role:'user'|'bia';text:string}>,private tours=40,private personne='',private version='',private appareil='',private numero=''){this.code=code.toUpperCase().replace(/[^A-Z0-9]/g,'');this.tours=Number.isFinite(tours)&&tours>=4&&tours<=80?Math.round(tours):40;}
 /* ── LE RANGEMENT DES RAPPELS, ET POURQUOI LE JETON ARRIVE DE DEHORS ─────
    Le code pour le maître, un jeton d'appareil pour les autres : sans lui,
    tous les rappels des visiteurs tomberaient dans le même tas et chacun
    entendrait l'ordonnance du voisin.
    CE FICHIER NE PEUT PAS IMPORTER lib/appareil.ts. Neuf épreuves sont
    parties en rouge quand je l'ai essayé : elles chargent ce module comme
    `data:`, où un import relatif ne se résout pas. C'est la troisième fois
    que ce piège se referme, après lib/micro.ts et lib/conversation-groq.ts.
    Le jeton arrive donc du constructeur — une seule source, lib/appareil.ts,
    lue par la page. */
 private entetes(){return {'x-bia-code':this.code,...(this.numero?{'x-bia-numero':this.numero}:{}),...(this.personne&&this.personne!=='maitre'?{'x-bia-personne':this.personne}:{}),...(this.appareil?{'x-bia-appareil':this.appareil}:{})};}
 private send(data:unknown){if(this.socket?.readyState===WebSocket.OPEN)this.socket.send(JSON.stringify(data));}
 private avatarGeneration=0;
 private avatarEnVol=0;
 private viderSon(){this.avatarGeneration++;this.avatarEnVol=0;this.events.avatar?.interrompre();for(const n of this.nodes){n.onended=null;try{n.stop();}catch{}}this.nodes.clear();this.next=0;this.finDuSon=performance.now();this.events.parle(false);}
 /* Elle parle, ou elle vient de finir. Les 300 ms de marge couvrent la queue
    d'écho du haut-parleur, qui ré-armait la mesure juste après sa dernière
    syllabe. */
 private elleParle(){return this.events.avatar?.parle()||this.avatarEnVol>0||this.nodes.size>0||(this.finDuSon>0&&performance.now()-this.finDuSon<300);}
 /* ── CE QU'IL ENTEND MAINTENANT A ÉTÉ CALCULÉ IL Y A UN INSTANT ──────────
    `currentTime` est l'horloge de CALCUL du son, pas celle de l'oreille : un
    échantillon programmé à T sort du haut-parleur à T + le retard matériel.
    Pour que la bouche montre ce qu'il ENTEND, et non ce qui se calcule, on
    recule l'horloge de ce retard. Safari ne publie pas toujours
    `outputLatency` ; `baseLatency` prend le relais, zéro en dernier recours.
    Borné à 150 ms : un chiffre aberrant rendu par un navigateur ne doit pas
    pouvoir fermer la bouche avant la fin de la phrase. */
 retardDuHautParleur(){
  const ctx=this.output;if(!ctx)return 0;
  const brut=Number((ctx as AudioContext&{outputLatency?:number}).outputLatency);
  const repli=Number(ctx.baseLatency);
  const v=Number.isFinite(brut)&&brut>0?brut:Number.isFinite(repli)&&repli>0?repli:0;
  return Math.min(Math.max(0,v),0.15);
 }
 /** L'instant, dans l'horloge du son, de ce qui sort du haut-parleur MAINTENANT. */
 horlogeDuSon(){
  const ctx=this.output;if(!ctx||ctx.state==='closed')return null;
  return ctx.currentTime-this.retardDuHautParleur();
 }
 async demarrer(){
  this.stoppe=false;this.modelesRefuses.clear();this.events.etat('Connexion…');
  try{
   this.output=new AudioContext({latencyHint:'interactive'});await this.output.resume();
   await this.events.avatar?.preparer(this.output);
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
     if(!this.elleParle()){
      /* Le début de SA parole : la première trame forte d'un tour où elle se
         tait. Les suivantes ne le déplacent pas — sinon « début de parole »
         finirait par valoir « fin de parole ». */
      if(!this.mesurePrete)this.debutParoleMesure=this.finParole;
      this.finParoleMesure=this.finParole;this.mesurePrete=true;
     }
    }
    /* ── PENDANT QU'ELLE PARLE, ON FILTRE SON PROPRE ÉCHO ──────────────────
       Le plancher d'écho s'apprend sur les trames entendues pendant sa
       parole ; il redescend doucement pour qu'une pièce plus calme ne reste
       pas bloquée sur un ancien niveau. */
    if(this.elleParle()){
     /* ── IL NE POUVAIT PLUS LA COUPER, ET LE CHIFFRE LE DISAIT ───────────

        Mesuré le 24 octobre sur 43 tours : trames_retenues 1 924,
        trames_laissees ZÉRO. Pas une seule trame n'est passée pendant
        qu'elle parlait — donc sa voix à lui non plus. Le plancher appris
        était monté à 0,122 et la barre à franchir valait 0,122 × 2,5 =
        0,305 : il aurait fallu crier.

        « Je dois pouvoir, moi, l'interrompre pendant qu'elle parle : ça, ça
        reste. » Le remède contre l'écho avait mangé la règle qu'il fallait
        garder — un filet posé si haut qu'il attrape aussi ce qu'on voulait
        laisser passer.

        LE PLANCHER EST DONC BORNÉ. Au-delà de PLAFOND_ECHO, on ne monte
        plus : une pièce bruyante ne doit pas pouvoir rendre BIA
        ininterrompable. Et une voix franche passe toujours à SEUIL_INTERRUPTION. */
     this.echoPlancher=Math.min(PLAFOND_ECHO,Math.max(rms,this.echoPlancher*0.995));
     if(rms<=Math.min(PLAFOND_INTERRUPTION,Math.max(SEUIL_INTERRUPTION,this.echoPlancher*2.5))){this.retenues++;return;}
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
 private modelesRefuses=new Set<string>();
 private async connecter(){
  const response=await fetch('/api/gemini-live/session',{method:'POST',headers:{...this.entetes(),'x-bia-live-exclus':[...this.modelesRefuses].join(',')},signal:AbortSignal.timeout(25000),cache:'no-store'});
  const data=await response.json();
  if(!response.ok){
   /* Le fournisseur refuse — quota, panne, surcharge. On bascule au lieu
      d'afficher un refus : il veut parler à BIA, pas lire un diagnostic. */
   if(this.events.indisponible){this.events.indisponible(INDISPONIBLE);throw Error(INDISPONIBLE);}
   throw Error(data.erreur||'Connexion refusée.');
  }
  /* Ce que le serveur a DEMANDÉ à Google d'attendre. Le journal le compare au
     silence observé : c'est la seule façon de savoir si le réglage a pris. */
  this.silenceExige=Number(data?.fin_de_parole?.silence_fin_parole_ms)||0;
  try{localStorage.setItem('bia-code',this.code);}catch{}
  if(this.stoppe)return;
  await new Promise<void>((resolve,reject)=>{
   const ws=new WebSocket('wss://generativelanguage.googleapis.com/ws/google.ai.generativelanguage.v1beta.GenerativeService.BidiGenerateContentConstrained?access_token='+encodeURIComponent(data.token));this.socket=ws;
   let established=false,bascule=false;this.erreurGoogle="";
   const timeout=setTimeout(()=>{ws.close();reject(Error('Khalam Rapide ne répond pas.'));},12000);
   ws.onopen=()=>this.send({setup:data.setup});
   ws.onmessage=async e=>{
    try{
     const d=JSON.parse(typeof e.data==='string'?e.data:await e.data.text());
     if(d.setupComplete){clearTimeout(timeout);established=true;this.ready=true;if(data.setup?.historyConfig?.initialHistoryInClientContent)this.send({clientContent:{turns:this.history,turnComplete:true}});
      else if(this.history.length)this.send({clientContent:{turns:this.history,turnComplete:false}});
      this.events.etat('Je t’écoute');resolve();}
     if(d.error){
      /* Le message de Google est la réponse à « pourquoi ». On le garde, on
         le remonte, et on le MONTRE : « a refusé la session » tout seul
         n'apprend rien à personne. */
      this.erreurGoogle=String(d.error?.message||d.error?.status||'refus sans message').slice(0,300);
      this.declarerFermeture(0,this.erreurGoogle,!established);
      /* Le motif va dans /api/etat, jamais à l'écran : c'est de l'anglais
         technique, et il ne dit rien à qui veut juste parler. */
      ws.close();return;}
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
     if(c?.outputTranscription?.text){
      /* Le premier signe que le modèle a commencé : avant l'audio, donc
         c'est lui qui borne le silence observé. */
      if(!this.premierTexteMs&&this.mesurePrete)this.premierTexteMs=performance.now();
      this.biaText+=c.outputTranscription.text;this.events.transcription('bia',this.biaText,false);}
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
      if(call.name==='trouver_une_pharmacie'){
       const reponse=await this.trouverUnePharmacie();
       this.send({toolResponse:{functionResponses:[{id:call.id,name:call.name,response:reponse}]}});
       continue;
      }
      if(call.name==='fermer_ecran'){
       const quoi=['carte','document','photo','tout'].includes(String(call.args?.quoi))
        ?String(call.args?.quoi) as 'carte'|'document'|'photo'|'tout':'tout';
       const ferme=this.events.fermer?this.events.fermer(quoi):null;
       this.send({toolResponse:{functionResponses:[{id:call.id,name:call.name,response:
        ferme===null?{ferme:[],erreur:'La fermeture n’est pas disponible sur cet écran. Ne dis pas que c’est fermé.'}
        :ferme.length?{ferme,consigne:'Dis en une phrase courte que c’est fermé.'}
        :{ferme:[],consigne:'RIEN n’était ouvert. Dis-le, et n’annonce pas une fermeture.'}}]}});
       continue;
      }
      if(call.name==='ecrire_un_papier'){
       const sorte=['message','mail','devis','facture'].includes(String(call.args?.sorte))
        ?String(call.args?.sorte) as 'message'|'mail'|'devis'|'facture':'message';
       const consigne=String(call.args?.consigne||'').slice(0,1000);
       const reponse=this.events.ecrire
        ?await this.events.ecrire(sorte,consigne).catch(()=>({ecrit:false,erreur:'Le papier n’a pas pu être écrit.'}))
        :{ecrit:false,erreur:'L’écriture n’est pas disponible sur cet écran.'};
       this.send({toolResponse:{functionResponses:[{id:call.id,name:call.name,response:reponse}]}});
       continue;
      }
      if(call.name==='chercher_sur_internet'){
       let reponse;
       try{
        const r=await fetch('/api/chercher',{method:'POST',signal:AbortSignal.timeout(20000),
         headers:{'content-type':'application/json',...this.entetes()},
         body:JSON.stringify({question:String(call.args?.question||'').slice(0,300)})});
        reponse=await r.json();
       }catch{reponse={trouve:false,raison:'La recherche n’a pas répondu. Dis-le et propose de réessayer.'};}
       this.send({toolResponse:{functionResponses:[{id:call.id,name:call.name,response:reponse}]}});
       continue;
      }
      if(call.name==='montrer_des_images'){
       const quoi=String(call.args?.quoi||'').slice(0,160);
       const sorte=call.args?.sorte==='video'?'video':'image';
       let reponse;
       try{
        const r=await fetch('/api/trouver',{method:'POST',signal:AbortSignal.timeout(15000),
         headers:{'content-type':'application/json',...this.entetes()},
         body:JSON.stringify({quoi,sorte})});
        reponse=await r.json();
        /* L'ÉCRAN S'OUVRE VRAIMENT. Sans ça, elle annoncerait des images que
           personne ne verrait — c'est exactement ce qui est arrivé à la
           carte le 23 octobre, et la consigne lui interdit de le dire sans
           cet outil. */
        if(reponse?.trouve&&this.events.montrer)this.events.montrer({sorte,requete:quoi,pieces:reponse.pieces||[]});
        else if(reponse?.trouve)reponse={trouve:false,raison:'L’écran n’est pas disponible ici : ne promets pas d’image.'};
       }catch{reponse={trouve:false,raison:'La recherche n’a pas répondu. Dis-le et propose de réessayer.'};}
       this.send({toolResponse:{functionResponses:[{id:call.id,name:call.name,response:reponse}]}});
       continue;
      }
      if(call.name==='lire_un_papier'){
       const reponse=this.events.photo
        ?await this.events.photo().catch(()=>({erreur:'La photo n’a pas pu être prise.'}))
        :{erreur:'L’appareil photo n’est pas disponible sur cet écran.'};
       this.send({toolResponse:{functionResponses:[{id:call.id,name:call.name,response:reponse}]}});
       continue;
      }
      if(call.name==='lire_en_wolof'){
       /* ── POURQUOI PASSER PAR LA ROUTE PLUTÔT QUE TRADUIRE ELLE-MÊME ─────
          Elle SAIT traduire — mais /api/traduire porte une consigne que la
          conversation n'a pas : dire le papier et RIEN DE PLUS. « Ce n'est
          pas une conversation : elle ne répond pas, elle ne commente pas,
          elle ne conseille pas. » Sur un courrier d'administration, un mot
          ajouté peut coûter cher à quelqu'un. */
       let reponse;
       try{
        const r=await fetch('/api/traduire',{method:'POST',signal:AbortSignal.timeout(20000),
         headers:{'content-type':'application/json',...this.entetes()},
         body:JSON.stringify({texte:String(call.args?.texte||'').slice(0,4000)})});
        const d=await r.json();
        reponse=r.ok&&d?.wolof
         ?{a_dire:d.wolof,consigne:'Dis `a_dire` tel quel. N’ajoute ni commentaire ni conseil : c’est le papier qui parle, pas toi.'}
         :{erreur:'La lecture en wolof n’a pas abouti. Dis-le et propose de réessayer.'};
       }catch{reponse={erreur:'La lecture en wolof n’a pas répondu.'};}
       this.send({toolResponse:{functionResponses:[{id:call.id,name:call.name,response:reponse}]}});
       continue;
      }
      if(call.name==='dire_un_nombre_en_wolof'){
       let reponse;
       try{
        const r=await fetch('/api/nombre',{method:'POST',signal:AbortSignal.timeout(8000),
         headers:{'content-type':'application/json',...this.entetes()},
         body:JSON.stringify({phrase:String(call.args?.phrase||'').slice(0,300)})});
        reponse=await r.json();
       }catch{reponse={trouve:false,raison:'La table des nombres n’a pas répondu. Donne le nombre en français, n’invente pas de wolof.'};}
       this.send({toolResponse:{functionResponses:[{id:call.id,name:call.name,response:reponse}]}});
       continue;
      }
      if(call.name==='gerer_les_rappels'){
       let reponse;
       try{
        const r=await fetch('/api/rappels',{method:'POST',signal:AbortSignal.timeout(12000),
         headers:{'content-type':'application/json',...this.entetes()},
         body:JSON.stringify({phrase:String(call.args?.phrase||'').slice(0,400)})});
        reponse=await r.json();
        if(reponse?.fait)this.events.rappelPose?.(Boolean(reponse.sonnera));
       }catch{reponse={fait:false,raison:'Les rappels n’ont pas répondu. Ne dis pas que c’est noté.'};}
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
   ws.onclose=(e?:{code?:number;reason?:string})=>{
    if(bascule||this.socket!==ws)return;
    clearTimeout(timeout);this.ready=false;
    const code=Number(e?.code)||0,motif=String(e?.reason||'').slice(0,300);
    this.dernierCode=code;this.motifFermeture=motif;
    const modele=String(data.connexion||data.modele||data.setup?.model||'').replace(/^models\//,'');
    if(!this.stoppe&&data.secours_disponible&&modele&&!this.modelesRefuses.has(modele)&&this.modelesRefuses.size<2&&panneLiveRecuperable(code,this.erreurGoogle||motif)){
     bascule=true;this.declarerFermeture(code,this.erreurGoogle||motif,!established);
     this.modelesRefuses.add(modele);this.viderSon();this.finirTour();this.events.etat('Reconnexion au moteur vocal de secours…');
     void this.connecter().then(resolve,e=>{if(!established)reject(e);else if(!this.stoppe){this.arreter();this.events.erreur(INDISPONIBLE);}});return;
    }
    if(!established){
     /* AVANT la poignée de main : c'est le setup qui est refusé. On remonte
        le code et le motif, et on les met dans la phrase — sans eux, il n'y
        a rien à chercher. */
     /* Le code ET le motif partent dans /api/etat : c'est là qu'ils servent
        à chercher. Ils ne vont PAS à l'écran. */
     this.declarerFermeture(code,motif||this.erreurGoogle,true);
     if(this.events.indisponible){this.events.indisponible(INDISPONIBLE);reject(Error(INDISPONIBLE));return;}
     reject(Error(INDISPONIBLE));
     return;
    }
    this.declarerFermeture(code,motif,false);
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
  this.events.avatar?.contexte(ctx);
  if(this.events.avatar?.pret()){
   const generation=this.avatarGeneration;
   const finParole=this.mesurePrete?this.finParoleMesure:0;
   if(finParole)this.mesurePrete=false;
   this.avatarEnVol++;this.events.parle(true);this.events.etat('Bia te répond');
   void this.events.avatar.lire(buffer,date=>{
    if(this.stoppe||generation!==this.avatarGeneration||!finParole)return;
    this.tourMesure++;
    this.events.latence(Math.round(performance.now()-finParole),{session:this.sessionMesure,tour:this.tourMesure});
   }).then(()=>{
    if(this.stoppe||generation!==this.avatarGeneration)return;
    this.avatarEnVol=Math.max(0,this.avatarEnVol-1);
    if(!this.avatarEnVol){this.finDuSon=performance.now();this.events.parle(false);}
   });
   return;
  }
  /* L'enveloppe : l'énergie moyenne par tranche de 40 ms. Même règle que
     `enveloppeDe` sur Khalam, en plus fin — les morceaux de la connexion
     rapide sont courts, et une tranche de 75 ms en aurait avalé certains
     entiers. Un seul passage de plus sur des échantillons déjà en mémoire. */
  const pas=0.04,fenetre=Math.max(1,Math.round(rate*pas)),valeurs:number[]=[];let pic=0;
  for(let i=0;i<a.length;i+=fenetre){
   const bout=Math.min(i+fenetre,a.length);let somme=0;
   for(let j=i;j<bout;j++)somme+=a[j]*a[j];
   const v=Math.sqrt(somme/(bout-i));if(v>pic)pic=v;valeurs.push(v);
  }
  const node=ctx.createBufferSource();node.buffer=buffer;node.connect(ctx.destination);this.nodes.add(node);
  const start=Math.max(ctx.currentTime+0.015,this.next);this.next=start+buffer.duration;
  node.onended=()=>{node.disconnect();this.nodes.delete(node);if(!this.nodes.size){this.finDuSon=performance.now();this.events.parle(false);}};
  node.start(start);
  this.events.bouche?.({debut:start,fin:start+buffer.duration,valeurs,pic,pas});
  this.events.parle(true);this.events.etat('Bia te répond');
  /* Le premier morceau de SA réponse, et lui seul. L'avance de planification
     compte : ce morceau-ci n'est pas encore audible, et c'est le son qu'on
     mesure, pas l'arrivée du paquet. */
  if(this.mesurePrete&&this.finParoleMesure){
   this.mesurePrete=false;this.tourMesure+=1;
   const avance=Math.max(0,(start-ctx.currentTime)*1000);
   const maintenant=performance.now();
   this.events.latence(Math.round(maintenant-this.finParoleMesure+avance),{session:this.sessionMesure,tour:this.tourMesure});
   this.declarerJournal(maintenant,avance);
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
  /* Un tour fini, un journal neuf. `journalEnvoye` empêchait un second envoi
     pour les morceaux suivants du MÊME tour ; il doit retomber ici, sinon un
     seul tour serait journalisé par session. */
  this.premierTexteMs=0;this.journalEnvoye=false;this.debutParoleMesure=0;
 }
 /* ── LE CHEMIN : ACCORD, POSITION, LIEU, DIRECTION, CARTE ────────────────

    L'ordre compte. On demande l'accord AVANT de toucher au GPS : la
    permission du navigateur n'est pas une question posée par BIA, et Lamine
    a demandé « son accord explicite à l'écran, jamais en silence ».

    LA POSITION NE QUITTE PAS CE TOUR. Elle n'entre ni dans l'historique, ni
    dans les souvenirs, ni dans aucun compteur : elle sert à /api/orientation
    et disparaît avec la fonction. Ce qui revient au modèle, c'est une phrase
    et des nombres — jamais les coordonnées. */
 /* ── UN SEUL ENVOI PAR TOUR, AVEC LES TROIS HEURES ENSEMBLE ─────────────
    Les heures sont celles de son téléphone : c'est à sa montre qu'il relira
    son test. Les durées viennent de performance.now(), qui ne saute pas
    quand l'horloge du système se recale. */
 private declarerJournal(premierSonMs:number,avanceMs:number){
  if(this.journalEnvoye)return;
  const base=Date.now()-performance.now();
  const h=(t:number)=>new Date(base+t).toTimeString().slice(0,8);
  const debut=this.debutParoleMesure||this.finParoleMesure;
  /* Le silence observé : de sa dernière trame forte au premier signe de la
     réponse — le texte s'il est arrivé, sinon le son. */
  const premierSigne=this.premierTexteMs||premierSonMs;
  void fetch('/api/mesure',{method:'POST',keepalive:true,headers:{'content-type':'application/json'},
   body:JSON.stringify({type:'journal_parole',moteur:'rapide',
    debut_parole:h(debut),fin_detectee:h(this.finParoleMesure),premier_son:h(premierSonMs),
    parole_ms:Math.round(Math.max(0,this.finParoleMesure-debut)),
    silence_exige_ms:this.silenceExige||null,
    silence_observe_ms:Math.round(Math.max(0,premierSigne-this.finParoleMesure)),
    attente_ms:Math.round(Math.max(0,premierSonMs-this.finParoleMesure+avanceMs)),
    texte_ms:this.premierTexteMs?Math.round(this.premierTexteMs-this.finParoleMesure):null,
    son_ms:Math.round(Math.max(0,premierSonMs-this.finParoleMesure)),
    demarrage_audio_ms:Math.round(avanceMs)})}).catch(()=>{});
  this.journalEnvoye=true;
 }
 /* Le code et le motif d'une fermeture. `avant_setup` dit si Google a refusé
    la configuration ou s'il a coupé une session déjà établie : ce sont deux
    pannes différentes, et un seul chiffre pour les deux n'en soigne aucune. */
 private declarerFermeture(code:number,motif:string,avantSetup:boolean){
  void fetch('/api/mesure',{method:'POST',keepalive:true,headers:{'content-type':'application/json'},
   body:JSON.stringify({type:'khalam_rapide',etape:'fermeture',code,motif:String(motif||'').slice(0,300),
    avant_setup:avantSetup,version:this.version})}).catch(()=>{});
 }
 /* Ce que l'écho a coûté sur ce tour. Des comptes et un niveau, rien d'autre. */
 private declarerEcho(){
  void fetch('/api/mesure',{method:'POST',keepalive:true,headers:{'content-type':'application/json'},
   body:JSON.stringify({type:'khalam_rapide',etape:'echo',
    coupures_pendant_parole:this.coupuresPendantParole,coupures_au_silence:this.coupuresAuSilence,
    trames_retenues:this.retenues,trames_laissees:this.laissees,
    echo_plancher:Math.round(this.echoPlancher*1000),
    arrets:this.arrets,code_fermeture:this.dernierCode,version:this.version})}).catch(()=>{});
 }
 /* ── LA PHARMACIE LA PLUS PROCHE ─────────────────────────────────────────
    Le MÊME ordre que la carte : l'accord d'abord, le GPS ensuite. La
    position ne quitte pas ce tour — elle n'entre ni dans l'historique, ni
    dans les souvenirs, ni dans aucun compteur.
    ET ON NE DIT PAS « DE GARDE ». La route rend `garde_connue`, qui est faux
    tant qu'aucune source de tour de garde ne répond ; on rend sa consigne au
    modèle sans la réécrire. */
 private async trouverUnePharmacie(){
  if(!this.events.accordPosition||!this.events.carte)return {trouve:false,raison:'La carte n’est pas disponible ici.'};
  if(!navigator.geolocation)return {trouve:false,raison:'Ce téléphone ne sait pas donner sa position.'};
  if(!await this.events.accordPosition())
   return {trouve:false,refus:true,raison:'Elle n’a pas voulu partager sa position. Demande-lui le quartier où elle est, et ne devine pas.'};
  let ou:GeolocationPosition;
  try{
   ou=await new Promise<GeolocationPosition>((ok,non)=>navigator.geolocation.getCurrentPosition(ok,non,
    {enableHighAccuracy:true,timeout:12000,maximumAge:30000}));
  }catch{return {trouve:false,raison:'Sa position n’est pas arrivée. Propose de réessayer dehors.'};}
  try{
   const r=await fetch('/api/pharmacies',{method:'POST',signal:AbortSignal.timeout(14000),
    headers:{'content-type':'application/json',...this.entetes()},
    body:JSON.stringify({lat:ou.coords.latitude,lon:ou.coords.longitude})});
   const d=await r.json();
   /* La carte s'ouvre VRAIMENT sur la plus proche : sans ça, elle
      annoncerait une pharmacie que personne ne verrait. */
   if(d?.trouve&&d.plus_proche)this.events.carte({dit:d.plus_proche.nom,lat:d.plus_proche.lat,lon:d.plus_proche.lon,sur:true});
   return d;
  }catch{return {trouve:false,raison:'La recherche de pharmacies n’a pas répondu. Propose d’appeler le 1515.'};}
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
  void this.events.avatar?.fermer();
  void this.input?.close().catch(()=>{});void this.output?.close().catch(()=>{});this.input=undefined;this.output=undefined;
 }
}
