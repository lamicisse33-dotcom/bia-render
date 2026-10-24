import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import ts from 'typescript';

const compile=s=>ts.transpileModule(s,{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText;
function load(path,deps={}){
 const m={exports:{}};
 new Function('require','module','exports',compile(fs.readFileSync(path,'utf8')))(id=>{
  if(id in deps)return deps[id];
  if(id==='./rapidite-core')return load('lib/rapidite-core.ts');
  if(id==='./briques-file')return load('lib/briques-file.ts');
  if(id==='./premier-segment')return load('lib/premier-segment.ts');
  if(id==='./seuils-anticipation')return load('lib/seuils-anticipation.ts');
  assert.fail('dépendance non prévue : '+id);
 },m,m.exports);
 return m.exports;
}
const tick=()=>new Promise(r=>setTimeout(r,0));

/* ── LE DÉCOR : LES QUATRE TOURS RÉELLEMENT MESURÉS ───────────────────────

   /api/etat, 23 octobre 2026, micro_capture.derniers sur les quatre tours
   Khalam de Lamine :

     parole_ms   1151   702   2686   767
     silence_ms   454   446    450   450     ← la coupure à 400 ms d'endpoint

   Et le résultat : anticipation_conversation.ecoute 6 segments, 6 réussis —
   mais briques_conversation.sessions 0, departs.sans_preparation 4.

   Ce décor rejoue la capture à l'identique : 100 ms de PCM à la fois (comme
   briques_conversation.capture_pcm_ms), un pré-micro d'une seconde, la parole,
   puis le silence ; une ASR qui répond en 900 ms, comme les transcriptions
   mesurées (927 à 2146 ms). Rien n'est lu dans le code pour conclure : on
   regarde les portes que le téléphone déclare. */
function rejouer({paroleMs,signes,asrMs=900}){
 const portes={},envois=[],demandes=[];
 const progressive=load('lib/ecoute-progressive.ts',{'./ecoute-longue':{wavLong:()=>new Blob([new Uint8Array(44)])}});
 const producteur=load('lib/briques-client.ts',{});
 const attentesAsr=[];
 const faireSemblant=async(url,init)=>{
  const chemin=String(url);
  if(chemin==='/api/mesure'){envois.push(JSON.parse(init.body));return {ok:true,json:async()=>({ok:true})};}
  if(chemin==='/api/anticipation/briques'){
   demandes.push(JSON.parse(init.body));
   return {ok:true,headers:{get:()=>'application/json'},json:async()=>({preparation:{id:'session-essai',termine:true}})};
  }
  assert.fail('appel non prévu : '+chemin);
 };
 {
  const briques=producteur.creerProducteurBriques({
   code:'CODE',tour:'tour-essai-1',history:[],resume:'',voice:'female',persona:'bia',
   actuel:()=>true,segments:()=>pipeline.segmentsCommences,
  });
  /* On observe les portes venues du pipeline d'écoute. Celles que le
     producteur compte lui-même se lisent dans ce qu'il DÉCLARE à
     /api/mesure — c'est-à-dire exactement ce que le serveur verra. */
  const vraiePorte=briques.porte;
  briques.porte=nom=>{portes[nom]=(portes[nom]||0)+1;vraiePorte(nom);};
  let fin=false;
  const progresser=t=>{if(!fin)briques.progresser(t);};
  const pipeline=progressive.creerEcouteProgressive(
   async()=>{const p=new Promise(r=>attentesAsr.push(r));await p;return {ok:true,json:async()=>({texte:'x'.repeat(signes)})};},
   ()=>'wo',()=>true,progresser,4000,nom=>briques.porte(nom));
  const bloc=parle=>pipeline.pousser(new Float32Array(1600).fill(parle?0.3:0.0001),parle);
  return {
   async jouerLeTour(){
    /* Le faux réseau ne vit que le temps du tour : restauré avant de rendre
       la main, sinon l'épreuve suivante parlerait au vrai réseau. */
    const vieuxFetch=globalThis.fetch;globalThis.fetch=faireSemblant;
    /* L'ASR répond après coup. On libère ses attentes en boucle : un segment
       peut en créer un autre, et le tour n'est fini que quand plus rien
       n'attend. */
    const laisserRepondre=async()=>{
     for(let n=0;n<60;n++){
      if(attentesAsr.length){attentesAsr.shift()();}
      await tick();
     }
    };
    try{
     for(let i=0;i<10;i++)bloc(false);                       // 1 s de pré-micro
     for(let i=0;i<Math.round(paroleMs/100);i++){bloc(true);await laisserRepondreUnPeu();}
     for(let i=0;i<5;i++)bloc(false);                        // 500 ms de silence
     /* Le micro se coupe à ~450 ms de silence, AVANT que l'ASR du dernier
        segment réponde : c'est l'ordre réel, et c'est tout l'enjeu. */
     fin=true;briques.arreterEcoute();
     const resultat=pipeline.finir().catch(()=>{});
     await laisserRepondre();
     await resultat;
     await briques.terminer('x'.repeat(signes));
     await laisserRepondre();
     const declare=envois.find(e=>e.type==='eligibilite');
     return {portes,envois,demandes,declare,declarees:declare?.portes??{},segments:pipeline.segmentsCommences};
    }finally{globalThis.fetch=vieuxFetch;}
    async function laisserRepondreUnPeu(){
     /* Pendant la parole, l'ASR a le temps de répondre : c'est ce qui permet
        au texte d'arriver avant la fermeture. */
     if(attentesAsr.length){attentesAsr.shift()();await tick();await tick();await tick();}
    }
   },
  };
 }
}

/* ── LE VERDICT : LA PORTE EST CÔTÉ TÉLÉPHONE, ET ELLE EST LA PREMIÈRE ────

   702, 767 et 1151 ms de parole : la phrase n'atteint jamais le seuil du
   premier segment. Le seul segment part sur le silence de fin de parole, et
   sa transcription revient APRÈS la fermeture de la capture — donc le
   producteur de briques ne voit jamais un caractère. Aucune requête ne part :
   les sept portes du serveur n'ont rien refusé, elles n'ont rien vu. */
for(const paroleMs of [702,767,1151]) test(`une phrase de ${paroleMs} ms : le producteur ne voit aucun texte et le serveur n'est jamais appelé`,async()=>{
 const {portes,demandes,declare,declarees,segments}=await rejouer({paroleMs,signes:60}).jouerLeTour();
 /* LE FAIT DÉCISIF : aucune requête ne part. Les sept portes du serveur
    n'ont donc rien refusé — elles n'ont rien vu. */
 assert.equal(demandes.length,0,'aucune demande de préparation ne doit partir');
 assert.equal(segments,1,'un seul segment, et il part à la fin de la parole');
 /* LA PORTE : la transcription de ce seul segment revient après la fermeture
    de la capture, donc le producteur n'a jamais vu un caractère. */
 assert.equal(portes.transcription_apres_fermeture,1,JSON.stringify(portes));
 /* Et le téléphone le DÉCLARE — c'est ce qui manquait le 23 octobre. */
 assert(declare,'le tour doit déclarer ses portes');
 assert.equal(declare.etape,'portes');
 assert.equal(declare.signes_max,0,'aucun texte n’a atteint le producteur');
 assert.equal(declarees.jamais_de_texte,1,JSON.stringify(declarees));
 assert.equal(declarees.trop_court,undefined,'le seuil de 35 signes n’a même pas été consulté');
});

/* 2 686 ms de parole : au-dessus du seuil de 1 500 ms, un segment part
   PENDANT qu'il parle, sa transcription arrive avant la fermeture, et la
   demande de préparation part vraiment. C'est la correction, mesurée. */
test('une phrase de 2686 ms franchit le premier segment et la préparation part',async()=>{
 const {portes,demandes,declare,declarees,segments}=await rejouer({paroleMs:2686,signes:60}).jouerLeTour();
 assert(segments>=2,`segments=${segments} : un pendant la parole, un à la fin`);
 assert.equal(portes.premier_segment_hors_portee,undefined,JSON.stringify(portes));
 assert(declare&&declare.signes_max>=35,'le texte a bien atteint le producteur : '+JSON.stringify(declare));
 assert.equal(declarees.jamais_de_texte,undefined,JSON.stringify(declarees));
 assert(demandes.length>=1,'la préparation doit être demandée');
 assert.equal(demandes[0].voice,'female');
 assert.equal(demandes[0].tour,'tour-essai-1');
});

/* Le seuil de 35 signes est une porte RÉELLE, mais pas celle du 23 octobre :
   une phrase longue en durée et courte en texte est refusée par elle, et le
   nom le dit. */
test('un texte de moins de 35 signes est refusé par son nom, pas en silence',async()=>{
 const {declare,declarees,demandes}=await rejouer({paroleMs:2686,signes:20}).jouerLeTour();
 assert(declare,'le tour doit déclarer ses portes');
 assert.equal(declare.signes_max,20,'le texte est bien arrivé, mais trop court');
 assert(declarees.trop_court>=1,JSON.stringify(declarees));
 assert.equal(declarees.jamais_de_texte,undefined,'ce n’est PAS la porte du 23 octobre');
 assert.equal(demandes.length,0,'rien ne part au serveur sous 35 signes');
});

/* ── LES PORTES DU SERVEUR, NOMMÉES UNE PAR UNE ───────────────────────────
   Elles ne comptent que ce qu'elles reçoivent : un téléphone qui n'a rien
   demandé les laisse à zéro, et lire le serveur d'abord ferait conclure à
   tort que tout allait bien. */
test('le champ public nomme la porte et ne confond pas téléphone et serveur',()=>{
 delete globalThis.biaEligibilite;
 const etat=load('lib/eligibilite-etat.ts',{});
 assert.equal(etat.resumeEligibilite().porte_qui_refuse,null);
 etat.noterRefusServeur('texte_court',12);
 assert.equal(etat.resumeEligibilite().porte_qui_refuse,'texte_court');
 /* Le téléphone passe devant : s'il n'a jamais demandé, le refus du serveur
    n'est pas la cause. */
 etat.noterEligibilite({etape:'portes',portes:{jamais_de_texte:1,trop_court:3},signes_max:0});
 const r=etat.resumeEligibilite();
 assert.equal(r.porte_qui_refuse,'trop_court');
 assert.equal(r.tours_sans_aucun_texte,1);
 assert.equal(r.tours_declares,1);
 assert.equal(r.cote_telephone.find(p=>p.porte==='trop_court').fois,3);
 assert.equal(r.cote_serveur.find(p=>p.porte==='texte_court').fois,1);
 /* Une porte inventée par un client bricolé n'entre pas. */
 etat.noterEligibilite({etape:'portes',portes:{porte_imaginaire:5},signes_max:0});
 assert.equal(etat.resumeEligibilite().cote_telephone.some(p=>p.porte==='porte_imaginaire'),false);
 /* Et rien d'autre que des noms et des comptes ne sort. */
 etat.noterEligibilite({etape:'portes',portes:{trop_court:1},signes_max:40,texte:'phrase privée'});
 assert(!JSON.stringify(etat.resumeEligibilite()).includes('phrase privée'));
});

/* ── L'ESSAI : DÉMARRER LES BRIQUES SUR LA TRANSCRIPTION FINALE ───────────

   Demandé par Lamine le 23 octobre 2026, après avoir lu que le levier restait
   non pris : « essaie le démarrage des briques sur la transcription finale —
   en mesurant avant/après, réversible, et sans toucher à l'attente de fin de
   parole pour la lecture. »

   Les trois exigences sont éprouvées ici : réversible (l'interrupteur fermé
   rend EXACTEMENT l'ancien comportement), mesurable (le départ se nomme), et
   le repli reste garanti quand la brique ne vient pas. */
function essaiFinal({surTranscriptionFinale,reponseServeur}){
 const producteur=load('lib/briques-client.ts',{});
 const demandes=[],envois=[];
 const faireSemblant=async(url,init)=>{
  const chemin=String(url);
  if(chemin==='/api/mesure'){envois.push(JSON.parse(init.body));return {ok:true,json:async()=>({ok:true})};}
  if(chemin==='/api/anticipation/briques'){
   demandes.push(JSON.parse(init.body));
   return {ok:true,headers:{get:()=>'application/json'},json:async()=>({preparation:reponseServeur})};
  }
  assert.fail('appel non prévu : '+chemin);
 };
 const briques=producteur.creerProducteurBriques({
  code:'CODE',tour:'tour-essai-1',history:[],resume:'',voice:'female',persona:'bia',
  actuel:()=>true,surTranscriptionFinale,
 });
 /* Les portes se lisent dans ce que le producteur DÉCLARE à /api/mesure :
    c'est exactement ce que le serveur verra, et celles qu'il compte en
    interne n'apparaissent pas autrement. */
 return {briques,demandes,envois,
  async lancer(texte){
   const vieuxFetch=globalThis.fetch;globalThis.fetch=faireSemblant;
   try{
    briques.arreterEcoute();
    const lecture=briques.commencer({signal:new AbortController().signal,
     jouer:async()=>assert.fail('aucune brique ne doit être jouée'),attente(){},taire(){},mesure(){}});
    const fini=lecture?lecture.fin:null;
    await briques.terminer(texte);
    const declare=envois.find(e=>e.type==='eligibilite');
    return {lecture,resultat:fini?await fini:null,portes:declare?.portes??{}};
   }finally{globalThis.fetch=vieuxFetch;}
  }};
}

/* INTERRUPTEUR FERMÉ : rien ne bouge. C'est la réversibilité, vérifiée — pas
   promise. L'ancienne épreuve « ASR without a prepared or running brick »
   garde son sens, et aucune requête ne part. */
test('interrupteur fermé : aucune lecture ouverte, aucune requête, comportement d’avant',async()=>{
 const e=essaiFinal({surTranscriptionFinale:false,reponseServeur:{id:'s1',termine:true}});
 const {lecture,portes}=await e.lancer('Une phrase assez longue pour franchir le seuil des trente-cinq signes.');
 assert.equal(lecture,null,'la lecture ne s’ouvre pas');
 assert.equal(e.demandes.length,0,'rien ne part au serveur');
 assert.equal(portes.rien_de_pret,1,'et le refus porte son nom');
 assert.equal(portes.depart_sur_transcription_finale,undefined);
});

/* INTERRUPTEUR OUVERT, et le serveur rend une brique : la lecture s'ouvre, la
   demande finale part, et le départ se nomme pour que l'avant/après se lise. */
test('interrupteur ouvert : la lecture s’ouvre à vide et la transcription finale est demandée',async()=>{
 const e=essaiFinal({surTranscriptionFinale:true,reponseServeur:{id:'s1',termine:true,brique:{numero:0,texte:'Réponse.',audio:'AAAA',langue:'wo',voice:'female'}}});
 const texte='Une phrase assez longue pour franchir le seuil des trente-cinq signes.';
 const {lecture,portes}=await e.lancer(texte);
 assert(lecture,'la lecture doit s’ouvrir');
 assert.equal(portes.depart_sur_transcription_finale,1,JSON.stringify(portes));
 assert.equal(portes.rien_de_pret,undefined,'ce n’est plus un refus');
 assert(e.demandes.length>=1,'la demande finale doit partir');
 assert.equal(e.demandes[0].final,true,'et elle est marquée finale');
 assert.equal(e.demandes[0].texte,texte);
});

/* ET SURTOUT : quand le serveur ne rend RIEN, le repli doit tenir. C'est le
   risque nommé dans la décision d'origine — « an entire rejected model call
   before ordinary chat starts ». La lecture se referme, `normal` est vrai, et
   le chemin ordinaire repart. Rien n'a été prononcé. */
test('serveur sans brique : la lecture se referme sur un repli, rien n’est prononcé',async()=>{
 const e=essaiFinal({surTranscriptionFinale:true,reponseServeur:null});
 const {lecture,resultat}=await e.lancer('Une phrase assez longue pour franchir le seuil des trente-cinq signes.');
 assert(lecture,'la lecture s’ouvre');
 assert.equal(resultat.normal,true,'le chemin ordinaire doit reprendre');
 assert.equal(resultat.reponse,'','aucune brique dite');
});
