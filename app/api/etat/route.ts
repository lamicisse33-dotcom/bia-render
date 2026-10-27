import {resumeControleRapidite} from '@/lib/rapidite-controle-http';
import {resumeKhalamRapide} from '@/lib/khalam-rapide-etat';
import {resumeEligibilite} from '@/lib/eligibilite-etat';
import {resumeLecturesSupabase} from '@/lib/lectures-supabase';
import {resumeOrientation} from '@/lib/orientation-etat';
import {resumeOutilConnaissances} from '@/lib/outil-connaissances-etat';
import {reglagesMemoire} from '@/lib/memoire-reglages';
import {resumeContexteAppris} from '@/lib/essai-contexte-appris';
import {resumePerformanceReferences} from '@/lib/performance-references';
import {resumeTexteVoix} from "@/lib/texte-khalam-voix";
import {resumeEssaiRapidite} from '@/lib/rapidite-etat';
import {resumeRelecture} from "@/lib/relecture-etat";
import {resumeBouclesTranscription} from "@/lib/transcription-en-boucle";
import {resumeCorrectionPrioritaire} from "@/lib/correction-prioritaire";
import {resumeOreilleEssai} from '@/lib/oreille-essai-etat';
import {resumeFileAnticipation} from '@/lib/anticipation-gpu';
import {resumeMicro} from '@/lib/micro-etat';
import {resumeProtectionParole} from '@/lib/protection-parole-etat';
import {resumeReprises} from '@/lib/reprise-etat';
import {resumeBriques} from '@/lib/briques-etat';
import {resumeEssaiAnticipation} from '@/lib/essai-anticipation-conversation';
import {resumeAnticipationReponse} from '@/lib/anticipation-reponse';
import {resumeEcouteProgressive} from '@/lib/anticipation-etat';
import {resumeEcouteLongue} from '@/lib/ecoute-longue-etat';
import {resumePrisesValidees} from '@/lib/prises-validees';
import {resumeMotsSautes} from '@/lib/essai-mots-sautes';
import {resumeStreamingIsole} from '@/lib/essai-streaming-isole';
import {resumeEcouteAnticipee} from '@/lib/ecoute-anticipee';
import {resumeComparaisonCerveaux} from '@/lib/essai-cerveaux-rapides';
import {resumeAnticipationLexique} from '@/lib/anticipation-lexique-voix';
import {resumeCharabiaMarche} from '@/lib/essai-charabia-marche';
import {resumeProfilPreparation} from '@/lib/profil-preparation';
import {resumePossessifSa} from "@/lib/essai-possessif-sa";
import {resumeEmpruntGerer} from "@/lib/essai-emprunt-gerer";
import {resumeFocusLocuteur} from "@/lib/focus-locuteur-etat";
import {resumeLatencePipeline} from '@/lib/essai-latence-pipeline';
import {resumeCommerceContextuel} from '@/lib/essai-commerce-contextuel';
import {resumeDialogueDomaines} from '@/lib/essai-dialogue-domaines';
import {silenceQuiSuffit} from '@/lib/micro';
import {reglagesFinDeParole,silenceFinDeParoleMs} from '@/lib/fin-de-parole';
import {resumeJournalParole} from '@/lib/journal-parole';
import {resumeVoixPage} from '@/lib/voix-page';
import {resumeSessionsLive} from '@/lib/sessions-live-etat';
import {resumeDepotRappels} from '@/lib/rappels-depot';
import {resumeHorloge,armerHorloge,balayerLesRappels} from '@/lib/rappels-horloge';
import {clePubliquePush} from '@/lib/push-web';
import {mesurerLesPortes} from '@/lib/portes-supabase';
import {resumeMemoireOrganisee} from '@/lib/memoire-organisee';
import {resumeConnexionFiches} from "@/lib/essai-fiches";
import {resumeAccesDevoirs,verifierAccesDevoirs} from "@/lib/essai-acces-devoirs";
import {resumeEssaiCorrectionVocale} from "@/lib/essai-correction-vocale";
import {resumeBibaCorrections,lireCorrectionsBiba} from "@/lib/biba-corrections";
import {resumeParcoursRapide} from "@/lib/essai-parcours-rapide";
import {resumeTransportVoix} from "@/lib/essai-transport-voix";
import {resumeFichesConnaissances,inventaireFiches} from "@/lib/fiches-connaissances";
import {resumeEssaiProduits} from "@/lib/essai-produits";
import {resumeLatenceConversation} from "@/lib/essai-latence-conversation";
import {resumeEssaiMemoire} from "@/lib/essai-memoire-maitre";
import {resumeRecherche} from "@/lib/recherche";
import {resumeFonctionsBase} from "@/lib/essai-fonctions-base";
import {resumeEssaiComprehension} from "@/lib/essai-comprehension";
import {resumeRythme} from '@/lib/essai-rythme';
import {resumeAdministration} from '@/lib/essai-administration';
import {resumeBusiness} from '@/lib/essai-business';
import {resumeSoxla} from '@/lib/essai-soxla';
import {resumeLanLool} from '@/lib/essai-lan-lool';
import {resumeFinBi} from "@/lib/essai-fin-bi";
import {resumeMar013} from "@/lib/essai-mar013";
import {resumeIdentite} from "@/lib/identite-bia";
import {resumeEssaiPrises} from "@/lib/essai-prises-voix";
import {resumePreparationEcoute} from "@/lib/preparer-ecoute";
import {resumeIntegriteAudio} from "@/lib/essai-integrite-audio";
import {resumeLectureBilingue} from "@/lib/essai-lecture-bilingue";
import {resumePrechauffageDialogue} from "@/lib/prechauffage-dialogue";
import {resumePiperWeb} from "@/lib/piper-web-etat";
import {resumeModeleGratuit,verifierModeleGratuit} from "@/lib/khalam-gratuit-modele";
import {resumeAnthropic,MODELE_SONNET} from "@/lib/cerveau-anthropic";
import {resumeLatenceCache} from "@/lib/latence-cache-anthropic";
import {resumeDiagnosticLatence} from '@/lib/diagnostic-latence-autonome';
import {resumePortsGpu} from '@/lib/diagnostic-ports-gpu';
import {resumeEssaiGPT} from "@/lib/essai-gpt";
import {resumeSecoursCerebras} from "@/lib/cerveau-cerebras";
import {resumeAudioMemoire} from "@/lib/audio-memoire";
import {sonsCourantsEtat} from "@/lib/sons-courants-etat";
import {resumeSalutations} from '@/lib/reponse-salutation';
import {resumeContinuiteVoix} from "@/lib/continuite-voix-etat";
import {resumeCorrectionsDevoir} from "@/lib/correction-devoir";
import {resumeDialogueDevoirs,essayerDialogueDevoirs,indexDialogue} from "@/lib/dialogue-devoirs";
import {devoirsALire} from "@/lib/devoirs-apprentissage";
import {resumeLectureDevoirs} from "@/lib/lecture-devoirs-etat";
import { resumeCorrectionContexte } from "@/lib/transcription-contextuelle";
import { resumeTransmissionMemoire } from "@/lib/conversation-groq";
import { resumeLimiteGroq } from "@/lib/reprise-modele";
import { etatConversation } from "@/lib/conversation-etat";
import { resumeCerveauLocal } from "@/lib/cerveau-local";
import { resumeOreilleLocale } from "@/lib/ecoute-locale";
import { NextResponse } from "next/server";
import { hoquetsDeLaVoix, hoquetsDeLaVoixLocale, hoquetsDeLaVoixRunPod, voixConfig, voixSansCredit } from "@/lib/voix";
import { ecouteConfig, resumeEcoutes, resumeOreilleSoynade } from "@/lib/ecoute";
import { lexiqueConfig, combien, combienParApplication, parAuteur, lectureLexique, motsCorriges } from "@/lib/lexique";
import { dernierePanne, pannes } from "@/lib/panne";
import { resumeLecons } from "@/lib/lecons-vues";
import { resumeAttentes, resumeCoupures, resumeGuets, resumeLectures, resumeTours, resumeVeilles, resumePrechauffages } from "@/lib/attentes-vues";
import { resumeEtapes, dernierEssaiOreille, dernierEssaiVoix } from "@/lib/etapes";
import { resumeEmotions } from "@/lib/emotions-vues";
import { depense, resumeDuFil } from "@/lib/depense";
import { comptesDuJour, imagesActives, videosActives } from "@/lib/trouver";
import { etatRepertoire } from "@/lib/repertoire";
import { resumeCorpus } from "@/lib/corpus";
import { resumeVoixGardees } from "@/lib/voix-gardees";
import { resumeReponsesGardees } from "@/lib/reponses-gardees";
import { resumePrononciation } from "@/lib/prononciation";
import { tenueActuelle } from "@/lib/tenue";
import { combienDeSouvenirs, resumeSouvenirs } from "@/lib/souvenirs";
import { ecartsEntreLesTours, peseeDeLaConsigne } from "@/lib/pesee";
import { resumeRelations } from "@/lib/relations";
import { resumeAttenteDesMorceaux } from "@/lib/morceaux-de-parole";
import { resumeReflexion } from "@/lib/reflechir";
import { listeDesRates, resumeDesRates } from "@/lib/rates-du-repertoire";
import { verifierCode } from "@/lib/codes";
import { registreDesOrdres, resumeDesOrdres } from "@/lib/ordres-vus";
import { resumeChatterboxTest } from "@/lib/chatterbox-test-etat";

/* Dit à l'interface quels moteurs sont réellement branchés, pour qu'elle
   choisisse le micro et la voix sans deviner. Ouvert : aucun moteur payant
   n'est appelé par défaut. Le diagnostic explicite essai_dialogue est borné
   à deux sélections fixes par démarrage, réservé au maître, sans divulguer les devoirs.

   `derniere_panne` est la ligne qui manquait : quand BIA cesse de réfléchir,
   c'est ici qu'on lit pourquoi — le statut renvoyé par le modèle et le début
   de son message. Elle se vide dès que le modèle répond de nouveau. Aucune
   clé n'y apparaît. */
/* Calculée une fois au chargement du module : elle ne change qu'au
   redéploiement, et c'est précisément ce qu'on veut détecter. */
const VERSION = (process.env.RENDER_GIT_COMMIT || "").slice(0, 12)
  || `local-${Math.floor(Date.now() / 1000)}`;

export async function GET(request: Request) {
  /* ── L'HORLOGE DES RAPPELS NE DOIT PAS DÉPENDRE D'UN SEUL RÉVEIL ────────

     Lamine : « vérifie si l'horloge dépend du passage de 5 min de
     cron-job.org (un rappel "dans deux minutes" ne doit pas arriver en
     retard) ». Non : le battement interne est de TRENTE secondes, et il est
     armé ici comme dans /api/rappels. Le ping extérieur de cinq minutes ne
     sert qu'à garder l'instance debout — c'est lui qui empêche Render de
     l'endormir, et reveil.yml n'y est pour rien (son `schedule` a été retiré
     le 13 septembre, son propre en-tête l'explique).

     On balaie AUSSI à chaque passage ici : si le battement meurt avec
     l'instance, le premier qui ouvre BIA fait sonner ce qui était dû, et
     `rappels.horloge.creneaux_perdus` compte ce qui a été manqué. Un rappel
     raté en silence serait le pire des deux. */
  armerHorloge();
  void balayerLesRappels();
  /* ── SES PHRASES NE SORTENT QU'AVEC SON CODE ──────────────────────────────

     Cette route reste OUVERTE, et c'est voulu depuis le 12 septembre : le
     jour où plus rien ne marche, il ne faut pas d'un code valide pour savoir
     pourquoi. Mais depuis le 17 elle peut porter la liste des questions qui
     ratent le répertoire — c'est-à-dire du wolof à lui, mot pour mot.

     C'est la même décision que le 16 septembre pour les comptes de ses
     leçons : les NOMBRES sur le mur ouvert, jamais les phrases. Sans son
     code, `repertoire_rate` ne contient que des totaux. */
  if(new URL(request.url).searchParams.get("verifier_devoirs")==="1"){try{await devoirsALire();}catch{ /* The failure is counted, no lesson text leaves here. */ }}
  const verdict = verifierCode(request.headers.get("x-bia-code"), false);
  const maitre = verdict.ok && verdict.maitre;
  if(new URL(request.url).searchParams.get('verifier_biba')==='1')try{await lireCorrectionsBiba();}catch{}
  /* Le modèle de Khalam Gratuit vit dans un seau privé : sans ce passage,
     personne ne pouvait dire si l'envoi avait abouti. Lecture seule. */
  if(new URL(request.url).searchParams.get('verifier_khalam_gratuit')==='1'){try{await verifierModeleGratuit();}catch{ /* Le refus est publié, jamais lancé. */ }}
  if(new URL(request.url).searchParams.get("verifier_acces_devoirs")==="1"){
    try{await verifierAccesDevoirs();}catch{return NextResponse.json({erreur:"Vérification de la lecture Supabase impossible",version:VERSION},{status:503});}
  }
  if(new URL(request.url).searchParams.get("indexer_dialogue")==="1"){try{await indexDialogue();}catch{ /* Read-only structure counts; no model call or lesson text. */ }}
  if(new URL(request.url).searchParams.get("essai_dialogue")==="1"){
    if(!maitre)return NextResponse.json({erreur:"Diagnostic réservé au maître"},{status:401});
    await essayerDialogueDevoirs();
  }
  await inventaireFiches();
  if(new URL(request.url).searchParams.get("verifier_fiches")==="1"){const {verifierConnexionFiches}=await import("@/lib/essai-fiches");await verifierConnexionFiches();}
  let entrees: number | null = null;
  try { entrees = await combien(); } catch { entrees = null; }
  let motsCorrigesCompte: number | null = null;
  let motsCorrigesExemples: string[] = [];
  try {
    const mots = await motsCorriges();
    motsCorrigesCompte = mots.length;
    /* Trois exemples, pour que ça se lise : des mots, pas des phrases. */
    motsCorrigesExemples = mots.slice(0, 3).map((m) => `${m.faux} → ${m.juste} (${m.fois})`);
  } catch { motsCorrigesCompte = null; }

  // D'où viennent ces corrections. La table est commune aux trois
  // applications : sans ce détail, on ne sait pas si BIA en reçoit.
  let origines: Record<string, number> | null = null;
  try { origines = await combienParApplication(); } catch { origines = null; }

  /* QUI a posé ces lignes. Le total ne dit pas si ses leçons à lui sont
     arrivées — « maitre-vocal » le dit. Voir parAuteur() dans lib/lexique.ts. */
  let auteurs: Record<string, number> | null = null;
  try { auteurs = await parAuteur(); } catch { auteurs = null; }

  return NextResponse.json({
  /* ── LES TABLES PRIVÉES SONT-ELLES FERMÉES ? ────────────────────────────
     Demandé par Lamine le 24 octobre 2026. On teste avec la clé PUBLIQUE et
     avec la clé de service, parce qu'une liste vide ne prouve rien toute
     seule : une table fermée et une table vide rendent le même zéro. Aucune
     ligne n'est transportée — `limit=0` et le compte dans l'en-tête. Cette
     mesure ne corrige rien. */
  /* ── UNE SEULE VOIX ─────────────────────────────────────────────────────
     Un chemin qui apparaît dans `par_chemin` a tenté de prononcer quelque
     chose pendant une session Khalam Rapide : il a été refusé, et l'écran
     s'est affiché sans voix. Hors session rapide, cette garde ne refuse
     rien — Khalam garde sa voix entière. */
  /* ── COMBIEN DE SESSIONS CHEZ GOOGLE, ET PAR QUI ────────────────────────
     Le 25 octobre, cette question n'avait AUCUNE réponse : rien ne comptait
     les ouvertures. `par_origine` sépare le téléphone de mes essais, et
     `refus_1011` dit si le refus vient du quota. Attention à `premiere` :
     on compte depuis le dernier démarrage de Render, pas depuis minuit. */
  sessions_live:resumeSessionsLive(),
  voix_page:resumeVoixPage(),
  portes_supabase:await mesurerLesPortes(),
  fin_de_parole:reglagesFinDeParole(),journal_parole:resumeJournalParole(),
  /* ── LES RAPPELS DE MÉDICAMENTS ─────────────────────────────────────────
     `rangement` dit où ils vivent : « supabase » (ils survivent aux
     redéploiements) ou « memoire » (ils marchent tout de suite et
     disparaissent au prochain redémarrage, tant que data/rappels.sql n'est
     pas collé). Ne jamais confondre « ça marche » avec « c'est gardé ».
     `cle_de_notification` dit si le serveur peut seulement signer un envoi :
     sans BIA_SECRET, aucun rappel ne sonnera, et il faut le voir. */
  rappels:{...resumeDepotRappels(),horloge:resumeHorloge(),cle_de_notification:Boolean(clePubliquePush())},orientation:resumeOrientation(),lectures_supabase:resumeLecturesSupabase(),reglages_memoire:reglagesMemoire(),outil_connaissances:resumeOutilConnaissances(),eligibilite_anticipation:resumeEligibilite(),khalam_rapide:resumeKhalamRapide(),essai_rapidite:{...resumeEssaiRapidite(),controle_http:resumeControleRapidite()},file_gpu:resumeFileAnticipation(),reprises_reflexion:resumeReprises(),micro_capture:resumeMicro(),protection_parole:resumeProtectionParole(),briques_conversation:resumeBriques(),anticipation_conversation:{essai:resumeEssaiAnticipation(),...resumeAnticipationReponse(),ecoute:resumeEcouteProgressive()},ecoute_longue:resumeEcouteLongue(),prises_validees:resumePrisesValidees(),
    /* ── LA VERSION EN LIGNE, POUR QUE LE TÉLÉPHONE SE METTE À JOUR SEUL ────

       Lamine, le 14 septembre 2026 : « il faut forcer les mises à jour ; dès
       qu'il y a une nouvelle mise à jour, ça doit être automatique chez
       elle. »

       Le service worker ne garde PAS l'application — donc une réouverture
       suffit normalement. Mais BIA s'installe sur l'écran d'accueil et reste
       ouverte des heures : le téléphone garde alors le code chargé le matin,
       et il ne verra jamais ce qu'on a déployé à midi. C'est exactement ce
       qui lui est arrivé : il a essayé des instructions qui n'étaient pas
       encore chez lui.

       On rend donc la version d'ICI, et le téléphone la compare à celle avec
       laquelle il a démarré. Voir app/page.tsx, « la mise à jour d'elle-même ».

       RENDER_GIT_COMMIT est posé par Render à chaque déploiement. En local il
       n'existe pas : on prend l'heure de démarrage du serveur, qui change à
       chaque redémarrage — même effet, sans rien à configurer. */
    version: VERSION,
    dialogue_domaines:resumeDialogueDomaines(),
    commerce_contextuel:resumeCommerceContextuel(),
    contexte_appris:resumeContexteAppris(),
    preparation_references:resumePerformanceReferences(),
    diagnostic_latence_autonome:resumeDiagnosticLatence(),
    connexions_gpu:resumePortsGpu(),
    reglages_rapidite:{silence_court_ms:silenceQuiSuffit(700,0,silenceFinDeParoleMs()),silence_phrase_ms:silenceQuiSuffit(2500,0,silenceFinDeParoleMs()),silence_recit_ms:silenceQuiSuffit(7000,0,silenceFinDeParoleMs()),historique_vocal_max_tours:12,premiere_phrase_courte:true,cache_dialogue_par_sources_pertinentes:true},
    piper_web: resumePiperWeb(),
    khalam_gratuit: resumeModeleGratuit(),
    // La tenue de BIA — réglable depuis /reglage, lue par tout le monde ici.
    tenue: tenueActuelle(),
    /* 21 septembre : ce qui manquait pour voir que les mots corrigés ne
       partaient jamais au modèle. `mots_corriges` doit être > 0 dès qu'une
       correction « Mal dit » a changé un mot ; `lecture.colonnes` doit
       contenir proposee. */
    /* Les exemples sont des mots de son wolof : nombres sur le mur ouvert, mots avec son code. */
    lexique_lecture: { ...lectureLexique(), mots_corriges: motsCorrigesCompte, ...(maitre ? { exemples: motsCorrigesExemples } : {}) },
    voix: voixConfig.fournisseur,
    ecoute: ecouteConfig.fournisseur,
    corrections_prioritaires:resumeCorrectionPrioritaire(),
    corrections_devoirs:resumeCorrectionsDevoir(),
    continuite_voix:resumeContinuiteVoix(),
    rythme_conversation: resumeRythme(),
    lecture_administration: resumeAdministration(),
    lecture_business: resumeBusiness(),
    lecture_emprunt_gerer:resumeEmpruntGerer(),
    lecture_possessif_sa:resumePossessifSa(),
    lecture_soxla: resumeSoxla(),
    lecture_lan_lool: resumeLanLool(),
    lecture_fin_bi: resumeFinBi(),
    lecture_mar013: resumeMar013(),
    identite: resumeIdentite(),
    prises_voix: resumeEssaiPrises(),
    integrite_audio:resumeIntegriteAudio(),
    lecture_charabia_marche:resumeCharabiaMarche(),
    lecture_bilingue:resumeLectureBilingue(),
    dialogue_devoirs: resumeDialogueDevoirs(),
    acces_devoirs:resumeAccesDevoirs(),
    lecture_devoirs: resumeLectureDevoirs(),
    recherche_web:resumeRecherche(),
    fonctions_base:resumeFonctionsBase(),
    produits_ddskin:resumeEssaiProduits(),
    fiches_connaissances:resumeFichesConnaissances(),
    connexion_fiches:resumeConnexionFiches(),
    memorisation_maitre:resumeEssaiMemoire(),
    ecoute_anticipee:resumeEcouteAnticipee(),
    preparation_detaillee:resumeProfilPreparation(),
    latence_conversation:resumeLatenceConversation(),
    latence_pipeline:resumeLatencePipeline(),
    anticipation_lexique_voix:resumeAnticipationLexique(),
    comparaison_cerveaux:resumeComparaisonCerveaux(),
    comprehension_conversation:resumeEssaiComprehension(),
    boucles_transcription:resumeBouclesTranscription(),
    transcription_contextuelle: resumeCorrectionContexte(),
    correction_vocale:resumeEssaiCorrectionVocale(),
    corrections_biba:resumeBibaCorrections(),
    memoire_organisee:resumeMemoireOrganisee(),
    focus_locuteur:resumeFocusLocuteur(),
    ecoute_configuration: {
      soynade_selectionnee: (process.env.STT_PROVIDER || "soynade") === "soynade",
      locale_selectionnee: process.env.STT_PROVIDER === "local_wolof",
      locale_configuree: Boolean(process.env.WOLOF_LOCAL_URL && process.env.WOLOF_LOCAL_API_KEY),
      secours_wolof: process.env.STT_PROVIDER === "local_wolof" ? ["soynade", "elevenlabs"] : ["elevenlabs"],
      cle_soynade_presente: Boolean(voixConfig.soynade.apiKey),
      repli_elevenlabs_disponible: Boolean(ecouteConfig.elevenlabs.apiKey),
      francais: process.env.STT_PROVIDER === "local_wolof" && process.env.WOLOF_LOCAL_ALL_LANGUAGES === "true" ? "local_wolof" : "elevenlabs",
    },
    fournisseur_modele: (process.env.BIA_LLM_PROVIDER || "anthropic").toLowerCase(),
    /* Le cerveau de la FENÊTRE ÉCRITE, qui peut différer de celui de la voix
       depuis le 27 octobre 2026. `null` veut dire « le même que la voix » —
       et il faut pouvoir le lire, sinon personne ne saurait quel cerveau
       répond dans cette fenêtre ni ce qu'il coûte (voir depense.chat_ecrit). */
    fournisseur_modele_ecrit: (process.env.BIA_LLM_PROVIDER_ECRIT || "").toLowerCase().trim() || null,
    cerveau_local: resumeCerveauLocal(),
    conversation: etatConversation(),
    anthropic: resumeAnthropic(),
    latence_cache: resumeLatenceCache(),
    essai_gpt: resumeEssaiGPT(),
    secours_modele: resumeSecoursCerebras(),
    derniere_limite_groq: resumeLimiteGroq(),
    modele: (process.env.BIA_LLM_PROVIDER || "anthropic").toLowerCase() === "cerebras" ? (process.env.CEREBRAS_MODEL || "gpt-oss-120b") : (process.env.BIA_LLM_PROVIDER || "anthropic").toLowerCase() === "local"
      ? (process.env.LOCAL_LLM_MODEL || "Oolel-v0.1-Q8_0")
      : (process.env.BIA_LLM_PROVIDER || "anthropic").toLowerCase() === "groq"
      ? (process.env.GROQ_MODEL || "openai/gpt-oss-120b")
      : (process.env.BIA_LLM_PROVIDER || "anthropic").toLowerCase() === "gemini"
        ? (process.env.GEMINI_MODEL || "gemini-3.7-flash")
        : (process.env.BIA_LLM_MODEL || MODELE_SONNET),
    cle_modele: Boolean(process.env.BIA_LLM_PROVIDER === "cerebras" ? process.env.CEREBRAS_API_KEY : (process.env.BIA_LLM_PROVIDER || "anthropic").toLowerCase() === "local"
      ? process.env.LOCAL_LLM_API_KEY
      : (process.env.BIA_LLM_PROVIDER || "anthropic").toLowerCase() === "groq"
      ? process.env.GROQ_API_KEY
      : (process.env.BIA_LLM_PROVIDER || "anthropic").toLowerCase() === "gemini"
        ? process.env.GEMINI_API_KEY
        : (process.env.BIA_LLM_API_KEY || process.env.ANTHROPIC_API_KEY)),
    groq_disponible: Boolean(process.env.GROQ_API_KEY),
    cerebras_disponible: Boolean(process.env.CEREBRAS_API_KEY),
    /* ── LA CLÉ DES LIEUX ─────────────────────────────────────────────────

       Lamine, le 14 septembre 2026 : « le testeur demandera l'endroit de son
       choix, que nous ne pouvons pas deviner. » Sans cette clé, BIA ne trouve
       que les trois repères écrits à la main et répond « je n'arrive pas à
       chercher » pour tout le reste de Dakar.

       On a passé une demi-journée à se demander si elle était là. Elle se lit
       maintenant d'un coup d'œil, comme celle du modèle. Le contenu de la clé
       ne sort JAMAIS d'ici — seulement oui ou non. */
    cle_lieux: Boolean(String(process.env.GOOGLE_CLE || "").trim()),
    lexique: lexiqueConfig.actif ? "supabase" : "mémoire vive (perdu au réveil)",
    lexique_entrees: entrees,
    lexique_origines: origines,
    /* QUI a posé ces lignes. Voir parAuteur() dans lib/lexique.ts : le total
       ne dit pas si SES leçons sont arrivées ; « maitre-vocal » le dit.
       null veut dire « je n'ai pas pu compter », pas « personne n'a rien
       posé » — la confusion entre les deux est ce qu'on répare ici. */
    lexique_auteurs: auteurs,
    /* CE QUI ARRIVE QUAND IL LUI APPREND QUELQUE CHOSE, marche par marche.
       Le compte par auteur dit que le rangement est vide ; celui-ci dit
       POURQUOI — ordre non reconnu, rien en main, ou rangement qui refuse.
       Voir lib/lecons-vues.ts. */
    lecons_donnees: resumeLecons(),
    voix_clonee: Boolean(voixConfig.soynade.audioPrompt),
    /* ── LA LIGNE QU'ON CHERCHE QUAND ELLE NE PARLE PLUS ──────────────────
       Le 15 septembre 2026, vingt-trois pannes identiques — « Prepaid credits
       are exhausted » — noyées dans une liste qu'il fallait lire une par une.
       Ici, ça tient sur une ligne, en haut, et ça dit quoi faire : recharger.
       Voir voixSansCredit() dans lib/voix.ts. */
    voix_sans_credit: voixSansCredit(),
    /* ── LES HOQUETS DE SA VOIX, RATTRAPÉS ────────────────────────────────
       Lamine, le 15 septembre 2026 : « pendant les leçons, parfois la voix
       saute. Elle amène la voix de la machine. » C'étaient des 502 et des
       connexions coupées, qu'on ne reprenait pas. Maintenant on reprend —
       et ce compteur existe pour qu'une reprise réussie ne soit pas
       invisible : sans lui, on croirait que tout va bien alors que Soynade
       tombe une fois sur dix. Voir lib/voix.ts. */
    voix_hoquets: hoquetsDeLaVoix(),
    /* La voix wolof locale (19 septembre) : branchée ou pas, servies, ratées,
       fabrication moyenne. Ses signes remboursés sont dans depense.voix_locale. */
    voix_locale: hoquetsDeLaVoixLocale(),
    voix_runpod: hoquetsDeLaVoixRunPod(),
    chatterbox_test: resumeChatterboxTest(),
    derniere_panne: dernierePanne(),
    // L'histoire, elle, ne s'efface pas : une panne passée reste lisible même
    // si tout va bien depuis. C'est la seule façon de comprendre après coup.
    pannes: pannes(),
    attentes: resumeAttentes(),
    lecture: resumeLectures(),
    /* LE TOUR COMPLET, des deux bouts qu'il ressent. Sa demande du
       15 septembre 2026 : « mesurer précisément où est-ce qu'on perd du
       temps ». `ou_passe_le_temps` est la réponse, triée du plus gros au
       plus petit. Voir lib/tour.ts. */
    tours: resumeTours(),
    /* LES TROIS INSTANTS DE CHAQUE APPEL EXTÉRIEUR : départ, premier octet
       utile, fin. Sa demande du 15 septembre 2026 — savoir si les quatre
       secondes du modèle et de la voix sont une ATTENTE ou une COULÉE.
       `verdict` le dit en une phrase. Voir lib/etapes.ts. */
    etapes: resumeEtapes(),
    /* L'ESSAI DE SOYNADE aux cinq longueurs — le test qui décide si on
       découpe par phrase ou si on change de moteur. Lancé depuis /vitesse,
       gardé ici jusqu'au suivant. Voir app/api/essai-voix/route.ts. */
    essai_oreille: dernierEssaiOreille(),
    essai_voix: dernierEssaiVoix(),
    /* Ce que le moteur d'écoute a cru entendre, et combien de fois il a
       fallu le reprendre. Voir lib/ecoute.ts. */
    ecoutes: resumeEcoutes(),
    /* ── L'OREILLE DE SOYNADE, À PART ────────────────────────────────────
       Branchée le 19 septembre. Les deux chiffres qui disent s'il faut
       revenir en arriere : combien de replis sur ElevenLabs, et combien
       d'entre eux pour un texte vide. Voir lib/ecoute.ts. */
    oreille_soynade: resumeOreilleSoynade(),
    oreille_locale: resumeOreilleLocale(),
    oreille_essai: resumeOreilleEssai(),
    preparation_ecoute: resumePreparationEcoute(),
    emotions: resumeEmotions(),
    /* CE QUE ÇA COÛTE, COMPTÉ ET NON DEVINÉ. Les signes réellement envoyés à
       Soynade, par route, et les jetons que le modèle dit avoir consommés —
       avec la part revenue du cache. Remis à zéro à chaque redémarrage du
       serveur : c'est une mesure de journée, pas une comptabilité. */
    depense: depense(),
    /* LE RÉPERTOIRE : combien de phrases sont payées une fois pour toutes, et
       si les textes ont été relus par Lamine. Tant que ce n'est pas le cas,
       rien ne s'enregistre et rien ne se sert de mémoire. */
    repertoire: etatRepertoire(),
    sons_courants: sonsCourantsEtat,
    salutations: resumeSalutations(),
    audio_memoire: resumeAudioMemoire(),
    prechauffage_dialogue: resumePrechauffageDialogue(),
    /* ── SON CORPUS DE VOIX, PENDANT QU'IL SE CONSTITUE ───────────────────
       Le 15 septembre 2026, il a dit oui pour qu'on garde sa voix avec ses
       transcriptions : c'est ce qui lui permettra un jour de se passer d'une
       oreille louée. 57 heures ont suffi au meilleur modèle wolof ouvert pour
       atteindre 17 % d'erreur — ce compteur dit où il en est.
       `part_du_plafond` est le chiffre à surveiller : son Supabase est au
       forfait gratuit, et une semaine de voix perdue parce que c'était plein
       sans qu'on le voie serait bête. Voir lib/corpus.ts. */
    corpus: resumeCorpus(),
    voix_gardees: resumeVoixGardees(),
    reponses_gardees: resumeReponsesGardees(),
    prononciation: resumePrononciation(),
    /* ── SA MÉMOIRE ÉCRIT-ELLE VRAIMENT ? ─────────────────────────────────
       Posé le 15 septembre 2026, deux heures après la mémoire elle-même :
       je lui avais confirmé que tout était en ligne sans pouvoir lui dire si
       une seule phrase avait été gardée. `part_qui_retrouve` distingue les
       deux pannes qui se ressemblent : « rien n'est écrit » et « la recherche
       ne trouve rien ». Voir lib/souvenirs.ts. */
    /* ── CE QUE PÈSE SA CONSIGNE, BLOC PAR BLOC ───────────────────────────
       Posé le 17 septembre 2026, après que Lamine a vu 50 $ partir en trois
       jours. J'avais ajouté à sa consigne pendant une semaine sans jamais
       peser la pile : 36 000 jetons envoyés pour 114 reçus. Ce tableau existe
       pour que ça se voie le soir même. Voir lib/pesee.ts. */
    consigne_pesee: peseeDeLaConsigne(),
    /* Le tri des situations de relations. Le 19 septembre, ce bloc pesait
       16 704 signes chaque fois qu'il partait. RÈGLE 1 : c'est ici qu'on
       lit s'il a maigri, pas dans ce que j'affirme. */
    relations: resumeRelations(),
    /* Le fil de la conversation, mis en cache depuis le 19 septembre. Si
       `mis_en_cache` monte et que `cache_lu` du modèle monte avec, ça sert. */
    fil_en_cache: resumeDuFil(),
    /* Le micro : quand il lui coupe la parole, et — depuis le 19 septembre —
       quand il reprend sa phrase pendant qu'elle réfléchit. C'est ici qu'on
       lira si « elle me coupe sans que je termine » est réparé. */
    /* Le dernier morceau de parole et la demande de transcription voyagent
       ensemble depuis le 19 septembre ; le serveur attend le retardataire.
       Si attendus_en_vain monte, on remet l'ancien ordre. */
    attente_des_morceaux: resumeAttenteDesMorceaux(),
    coupures: resumeCoupures(),
    /* Et ce que le guetteur ENTENDAIT : le seul moyen de savoir s'il a raté
       une coupure qu'il aurait dû faire. */
    guet: resumeGuets(),
    /* Le verrou d'écran (20 septembre) : tenu, refusé, relâché, secours. */
    veille: {...resumeVeilles(),gestion:"native-reprise-automatique-v1",secours_audio:false},
    relecture:resumeRelecture(),
    preparation_voix:resumeTexteVoix(),
    /* Les sons du répertoire mis en main avant le premier mot (20 septembre). */
    prechauffage: resumePrechauffages(),
    ecarts_entre_les_tours: ecartsEntreLesTours(),
    souvenirs: resumeSouvenirs(),
    memoire_transmise: resumeTransmissionMemoire(),
    parcours_rapide: resumeParcoursRapide(),
    transport_voix:resumeTransportVoix(),
    essai_streaming_isole:resumeStreamingIsole(),
    mots_sautes:resumeMotsSautes(),
    /* ── ET LE VRAI NOMBRE, CELUI DE LA TABLE ─────────────────────────────
       Le 18 septembre à 23 h, la page disait « Souvenirs gardés : 0 » une
       heure après avoir dit 74. Rien n'était perdu : `gardes` compte ce qui
       a été écrit DEPUIS LE RÉVEIL du serveur, et il repart à zéro à chaque
       déploiement. Je l'avais mis entre trois nombres qui ne repartent
       jamais, sans écrire la différence. Lu par celui qui a construit cette
       mémoire, ça dit « ton travail a disparu ».
       `null` veut dire « je n'ai pas pu compter », jamais zéro : c'est
       exactement la confusion qu'on vient de payer. */
    souvenirs_en_tout: await combienDeSouvenirs(),
    /* ── CE QUE COÛTE ET CE QUE RAPPORTE SA RÉFLEXION ────────────────────
       Lamine, le 16 septembre 2026 : « parfois elle est trop bête ». Depuis
       ce soir elle réfléchit avant de parler sur les questions difficiles,
       et du premier jet ailleurs. Ce champ dit sur combien de questions ça
       se déclenche, et les deux attentes moyennes côte à côte : c'est le
       prix de l'arbitrage, en clair. Voir lib/reflechir.ts. */
    reflexion: resumeReflexion(),
    /* ── CE QUI MANQUE À SON RÉPERTOIRE ─────────────────────────────────
       Lamine, le 17 septembre 2026 : « qu'est-ce qu'on peut copier chez
       eux ? » — d'Abena AI, qui tourne hors ligne. Sa réponse à lui,
       c'est le répertoire : une phrase enregistrée sort en un dixième de
       seconde, gratuitement. Ce champ dit lesquelles manquent, la plus
       demandée d'abord. Voir lib/rates-du-repertoire.ts. */
    /* ── CE QU'IL A DIT, ET CE QU'ELLE EN A FAIT ────────────────────────
       Lamine, le 17 septembre 2026 : « quand je lui demande de faire quelque
       chose, elle doit le faire. » Avant de réparer, voir où ça casse : ses
       phrases d'un côté, ses gestes de l'autre. Voir lib/ordres-vus.ts. */
    ordres: resumeDesOrdres()
      ? { ...resumeDesOrdres(), ...(maitre ? { registre: registreDesOrdres() } : {}) }
      : null,
    repertoire_rate: resumeDesRates()
      ? { ...resumeDesRates(), ...(maitre ? { a_enregistrer: listeDesRates() } : {}) }
      : null,
    /* CE QU'ELLE VA CHERCHER SUR INTERNET. Cent recherches d'images par jour
       sont gratuites ; la cent-unième se paie. Ce compteur est le robinet
       d'arrêt : quand il touche le plafond, BIA répond sans image plutôt que
       d'ouvrir une facture. Il repart chaque jour à minuit. */
    trouver: {
      moteur_images: imagesActives() ? "branché" : "pas de clé Brave",
      moteur_videos: videosActives() ? "branché" : "pas de clé Google",
      ...comptesDuJour(),
    },
  }, {
    /* La page d'attente de bia.khalam.app lit cet état depuis un autre
       domaine : sans cet en-tête, le navigateur lui refuse la réponse et
       elle croirait BIA endormie pour toujours. Rien de secret ici — c'est
       déjà une page ouverte. */
    headers: { "access-control-allow-origin": "*" },
  });
}
