import {REFLEXION_COURTE} from "./reflexion-courte";
import {attenteEnvoiMs,patienceBriqueMs,premierSegmentMs,segmentMs,signesAnticipation,teteCourteSignes} from "./seuils-anticipation";
const g=globalThis as typeof globalThis&{biaBriquesEtat?:any};
/* `motifs_invalides` : laquelle des sept règles le modèle enfreint, et
   combien de fois. Le 25 octobre, deux préparations sur sept étaient jetées
   sous le seul nom « Brique invalide » — un refus sans nom est un refus
   qu'on cherchera encore dans six jours. */
/* `preparations_tuees` : qui a annulé une préparation en cours, et après
   combien de millisecondes. Le 25 octobre, « annulé: true » ne disait pas
   QUI — et quatre chemins y mènent, qui n'appellent pas le même remède. */
const etat=g.biaBriquesEtat??={patiences_depassees:{fois:0,ms:[] as number[]},attentes_envoi:{fois:0,avec_preparation:0,ms:[] as number[]},preparations_tuees:{} as Record<string,{fois:number;ms_median:number[]}>,sessions:0,preparees:0,finalisees:0,erreurs:0,lectures:0,dernier_premier_son_ms:null,dernier_depuis_micro_ms:null,dernier_blanc_ms:null,blanc_max_ms:0,reflexions:0,dernier_echec:null,motifs_invalides:{} as Record<string,number>};
export const etatBriques=etat;
/* ── LES BRIQUES SUR LA TRANSCRIPTION FINALE : L'ESSAI, ET SON INTERRUPTEUR ─

   Demandé par Lamine le 23 octobre 2026 : « essaie le démarrage des briques
   sur la transcription finale — en mesurant avant/après, réversible, et sans
   toucher à l'attente de fin de parole pour la lecture. »

   Ce que ça retourne : une décision datée et explicite de `commencer()`,
   « ASR alone is not a prepared response. Starting a new brick after speech
   ended can add an entire rejected model call before ordinary chat starts. »
   Le risque est donc nommé depuis le début : quand la brique ne vient pas, on
   AJOUTE une attente avant le chemin ordinaire. C'est précisément ce que
   `departs.sur_transcription_finale` et `replis` mesurent.

   RÉVERSIBLE SANS DÉPLOIEMENT : BIA_BRIQUES_FINALES=non dans Render, et le
   téléphone revient au comportement d'avant au prochain chargement. Le
   réglage est publié ici pour que le téléphone le lise, et pour qu'on sache
   lequel des deux on mesure.

   L'ATTENTE DE FIN DE PAROLE N'EST PAS TOUCHÉE : `finirAttente` reste dans le
   rappel `jouer`, qui ne s'exécute que si une brique arrive vraiment. Un
   démarrage à vide ne prononce rien et n'avance aucune lecture. */
/* ── VERDICT DU 24 OCTOBRE 2026 : L'ESSAI EST REFUSÉ, CHIFFRES EN MAIN ─────

   Quatre tours de Lamine sur Khalam, lus sur /api/etat à 00:51 :

     departs            sur_transcription_finale 10
     chaines            10        replis  7
     tours (ordinaire)  vecu_ms médian 6 340 ms   (4 322 avant l'essai)
     dont le modèle     2 837 ms                  (1 372 avant)

   SEPT CHAÎNES SUR DIX SONT PARTIES EN REPLI. Et le repli n'est pas gratuit :
   le chemin ordinaire ne redémarre qu'APRÈS, ce qui est mot pour mot le
   risque écrit dans la décision d'origine — « an entire rejected model call
   before ordinary chat starts ». Le chemin ordinaire a donc empiré de deux
   secondes pendant l'essai.

   LE DÉFAUT REPASSE À NON. La règle que j'avais écrite pour trancher était :
   « si replis grimpe sans que premier_son_median_ms descende, l'essai coûte
   plus qu'il ne rend ». premier_son_median_ms vaut 6 749 ms, au-dessus du
   chemin ordinaire. La règle a parlé.

   BIA_BRIQUES_FINALES=oui le rallume, pour qu'on puisse le reprendre si les
   briques finissent par se préparer pendant la parole. */
export const briquesSurTranscriptionFinale=()=>(process.env.BIA_BRIQUES_FINALES||'non')==='oui';
export const resumeBriques=()=>({mode:'briques_texte_verrouillees_audio_progressif',revision:'stream-continu-priorite-ecoute-v1',premier_segment_apres_ms:premierSegmentMs(),attente_envoi_ms:attenteEnvoiMs(),patience_brique_ms:patienceBriqueMs(),segment_ms:segmentMs(),seuil_signes_anticipation:signesAnticipation(),modele_briques_configure:process.env.BIA_BRIQUES_MODEL||'defaut',tete_courte_signes:teteCourteSignes(),briques_sur_transcription_finale:briquesSurTranscriptionFinale(),pause_transcription_ms:400,capture_pcm_ms:100,morceau_enregistrement_ms:100,livraison_audio:'progressive_ndjson',anticipation_texte:'pendant_parole_et_fin',ordonnancement_audio:'par_morceau_ecoute_prioritaire',...etat,son_reflexion:'mmm_khalam_convertis_20261020',reflexion_seuil_initial_ms:REFLEXION_COURTE.attente_ms,reflexion_seuil_suite_ms:null,politique_reflexion:REFLEXION_COURTE});
export function noterBriques(d:Record<string,unknown>){
  const ms=Number(d.ms);if(!Number.isFinite(ms)||ms<0||ms>180000)return;
  if(d.etape==='patience_depassee'){
    /* La chaîne de briques n'a rien donné à temps et aucune n'avait commencé
       à parler : on a coupé pour laisser partir le chemin ordinaire. Compté
       avec la durée, pour qu'on sache si la patience est bien réglée. */
    const ms=Number(d.ms);
    const t2=(etat.patiences_depassees??={fois:0,ms:[] as number[]});
    t2.fois+=1;
    if(Number.isFinite(ms)&&ms>=0&&ms<=60000)t2.ms=[...t2.ms.slice(-19),Math.round(ms)];
    return;
  }
  if(d.etape==='attente_envoi'){
    /* Combien on a attendu que ce qui était en vol se pose, et si une
       préparation tournait à ce moment-là. Les deux ensemble disent si
       l'attente a servi ou si on l'a payée pour rien. */
    const ms=Number(d.ms);
    const t=(etat.attentes_envoi??={fois:0,avec_preparation:0,ms:[]});
    t.fois+=1;
    if(d.en_vol)t.avec_preparation+=1;
    if(Number.isFinite(ms)&&ms>=0&&ms<=10000)t.ms=[...t.ms.slice(-19),Math.round(ms)];
    return;
  }
  if(d.etape==='preparation_tuee'){
    const raison=String(d.raison||'sans_nom').slice(0,40);
    const ms=Number(d.ms);
    const t=((etat.preparations_tuees??={})[raison]??={fois:0,ms_median:[]});
    t.fois+=1;
    if(Number.isFinite(ms)&&ms>=0&&ms<=120000)t.ms_median=[...t.ms_median.slice(-19),Math.round(ms)];
    return;
  }
  if(d.etape==='reflexion_prechargee'){
    const charges=Number(d.charges),echecs=Number(d.echecs);
    if(Number.isInteger(charges)&&charges>=0&&charges<=2&&Number.isInteger(echecs)&&echecs>=0&&echecs<=2)etat.reflexion_prechargee={charges,echecs,quand:new Date().toISOString()};
  }
  if(typeof d.tour==='string'&&/^[a-zA-Z0-9_-]{8,80}$/.test(d.tour)&&['depart','lecture_demandee','debut_brique','fin_brique','transcrit','fin_preparation','fin_chaine','annulation'].includes(String(d.etape))){
    const details:Record<string,number>={};
    for(const cle of ['numero','nombre','pretes','en_cours','actuel','repli','tour_actuel','capture_actuelle','finale']){
      const v=Number(d[cle]);if(Number.isInteger(v)&&v>=0&&v<=20)details[cle]=v;
    }
    etat.cycle??={comptes:{},derniers:[]};
    etat.cycle.comptes[String(d.etape)]=(etat.cycle.comptes[String(d.etape)]||0)+1;
    etat.cycle.derniers=[...etat.cycle.derniers.slice(-39),{tour:d.tour,etape:d.etape,ms,...details,quand:new Date().toISOString()}];
  }
  if(d.etape==='depart'){
    const pretes=Number(d.pretes),enCours=Number(d.en_cours),finale=Number(d.finale);
    if(!Number.isInteger(pretes)||pretes<0||pretes>6||![0,1].includes(enCours))return;
    /* Un quatrième choix, distinct exprès : rien n'était prêt et on a quand
       même ouvert la lecture, en pariant sur la transcription finale. Mélangé
       à `sans_preparation`, l'essai serait invisible. */
    const choix=pretes?'prete':enCours?'en_fabrication':finale===1?'sur_transcription_finale':'sans_preparation';
    etat.departs??={};etat.departs[choix]=(etat.departs[choix]||0)+1;
    etat.dernier_depart={choix,pretes,en_cours:!!enCours,quand:new Date().toISOString()};
  }
  if(d.etape==='premier_son'){etat.lectures++;etat.dernier_premier_son_ms=ms;const micro=Number(d.micro_ms);if(Number.isFinite(micro)&&micro>=0&&micro<=180000)etat.dernier_depuis_micro_ms=micro;
    /* Avant/après : la médiane des premiers sons par briques, à comparer à
       tours.reponse_du_modele.vecu_ms du chemin ordinaire. Jamais la moyenne. */
    etat.premiers_sons=[...(etat.premiers_sons||[]).slice(-29),Math.round(ms)];
    const t=[...etat.premiers_sons].sort((a:number,b:number)=>a-b),m=Math.floor(t.length/2);
    etat.premier_son_median_ms=t.length?(t[m]+t[(t.length-1)>>1])/2:null;}
  if(d.etape==='fin_chaine'){
    /* Le repli est le prix de l'essai : la chaîne de briques n'a rien rendu et
       le chemin ordinaire repart APRÈS. On le compte, sinon on ne saurait pas
       ce que l'essai coûte quand il échoue. */
    etat.chaines=(etat.chaines||0)+1;
    if(Number(d.repli)===1)etat.replis=(etat.replis||0)+1;
    etat.dernier_repli_ms=Number(d.repli)===1?Math.round(ms):etat.dernier_repli_ms??null;}
  if(d.etape==='blanc'){etat.dernier_blanc_ms=ms;etat.blanc_max_ms=Math.max(etat.blanc_max_ms,ms);}
  if(d.etape==='reflexion'){
    etat.reflexions++;
    const duree=Number(d.duree_ms);
    if(Number.isFinite(duree)&&duree>=1200&&duree<=2500)etat.derniere_reflexion={phase:d.phase==='initiale'?'initiale':'suite',attente_ms:ms,duree_ms:Math.round(duree),volume:Number(d.volume)||null,parole_ms:Number(d.parole_ms)||null,quand:new Date().toISOString()};
  }
}

