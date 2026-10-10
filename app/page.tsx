"use client";
import {piperLocaleDisponible} from "@/lib/voix-piper-locale";

import { detecterLangue } from "@/lib/langue";
import LectureApprentissage from "./LectureApprentissage";
import {demandeLecture} from "@/lib/intention-lecture";
import { ouvrirFluxVoix, type MorceauVoix } from "@/lib/flux-khalam";
import { useCallback, useEffect, useRef, useState } from "react";
import dynamic from "next/dynamic";
import { chargerPortrait } from "@/lib/portrait-images";
import { lienMessage } from "@/lib/communication";
import {
  A_FABRIQUER, CHAPEAU, PARTIE_1, PARTIE_1_CONNU,
  dire, extraireNom, fichiersPossibles,
} from "@/lib/attente";
import type { Langue, Parole } from "@/lib/attente";
import {
  ajouterProfil, chargerProfils, cleEmetteur, cleFil, cleResume, garderProfils, oublierProfil,
} from "@/lib/profils";
import type { Profil } from "@/lib/profils";

/* ── LA CARTE ───────────────────────────────────────────────────────────────
   Chargée SEULEMENT quand elle s'ouvre. La bibliothèque de cartes pèse
   plusieurs centaines de kilo-octets : personne ne doit la télécharger pour
   dire bonjour à BIA. */
import type { Lieu } from "./carte/Carte";
const Carte = dynamic(() => import("./carte/Carte"), { ssr: false });

/* ── LA VIDÉO PLEIN ÉCRAN ───────────────────────────────────────────────────
   Même geste que la carte : elle se retire, la vidéo prend tout. Chargée
   seulement à l'ouverture, comme la carte. */
import type { Film } from "./video/Video";
const Video = dynamic(() => import("./video/Video"), { ssr: false });
import {
  chargerPapiers, garderPapier, oublierPapiers, nouvelIdPapier, titreDe,
} from "@/lib/papiers";
import type { PapierGarde } from "@/lib/papiers";
import { NOMBRES, RELU_NOMBRES } from "@/lib/nombres-textes";
import { DIFFUSER_LE_MODELE, resteADire, teteDeLaReponse } from "@/lib/diffusion";
import { RELU } from "@/lib/repertoire-textes";
import { RELU_BASE } from "@/lib/base-textes";
import { RELU_GUIDAGE } from "@/lib/guidage-textes";
import { choisirService, RELU_SERVICES } from "@/lib/services-textes";
import { compterVerdicts, lireVerdicts, poserVerdict } from "@/lib/verdicts";
import { corrigerVerdict, type Verdict } from "@/lib/verdicts";
import { veutArreterLaListe, veutCorrigerLaListe } from "@/lib/mal-dit";
import { franc, lecture, sorteEvoquee, totauxDe } from "@/lib/documents";
import type { Devis, Document as Papier, Lettre, Mot, Partie, Sorte, Totaux } from "@/lib/documents";
import { lireMesures, noterMesure } from "@/lib/chrono";
import { finir as finirLeTour, poser as poserBorne, tourVide, type Bornes } from "@/lib/tour";
import { fenetreDuFil } from "@/lib/fenetre-du-fil";
import type { Mesure, Voie } from "@/lib/chrono";
import { fichierDe, souffleDe } from "@/lib/sons";
import { lireLeRire } from "@/lib/rires";
import { choixVoixBia, choisirVoixBia, essaiChatterboxActif, routeVoixBia, voixChatterboxBia, type ChoixVoixBia } from "@/lib/chatterbox-essai";
import { reveiller } from "@/lib/reveil-du-son";
import { frapper, arreterFrappe, sonnerFini } from "@/lib/frappe";
/* `sonne` vit dans lib/normaliser.ts : un fichier SANS aucun import, écrit le
   15 septembre après l'écran noir. Rien ici ne doit remonter jusqu'au
   serveur. */
import { sonne } from "@/lib/normaliser";
import { fluxVivant,
  INTERVENTION_MAXIMALE, MICRO_LACHE_ENTRE_LES_TOURS, MICRO_SUR_SON_PROPRE_CONTEXTE, REGLAGES_DU_MICRO,
  SILENCE_QUI_CLÔT_LA_CONVERSATION, TOUR_DE_VEILLE,
  TOURS_MUETS_AVANT_DE_DOUTER, FLUX_DU_GUETTEUR,
  barreDeCoupure, partVocale, silenceQuiSuffit, suivreLEcho, suivreLeBruit, creerFiltreDeclenchement,
  vautLaPeine, vraimentUneVoix, hauteurDeVoix, HAUTEUR_MINIMALE,
} from "@/lib/micro";
import { CLE_VITESSE, VITESSE_POSEE, ralentir, vitesseChoisie, voixDejaPosee } from "@/lib/ralentir";
import {
  DUREE_DU_RATTRAPAGE, GARDER_CE_QUIL_DIT_PENDANT_QUELLE_PARLE, RELANCE_DU_DEPOT,
  faut_il_se_taire, recoller, type Prononce,
} from "@/lib/sa-propre-voix";
import { attendreSonTour, creerDetectionInterruption } from "@/lib/tour-de-parole";
import Installer from "./installer";
import Ecran from "./ecran";
import type { PieceEcran } from "./ecran";
import CarteVitrine, { chargerSujet } from "./vitrine";
import CarteTrouve, { versEcran } from "./trouve";
import type { Resultat } from "./trouve";
import { contientUnGrosMot } from "@/lib/gestes-de-la-main";
import { decrireLAppareil, lancerLeSecours, noterVeille } from "@/lib/veille";
import OnboardingVoix, { useOnboardingVoix } from "./onboarding-voix/OnboardingVoix";

/* Un message peut porter le RENVOI vers un papier — son identifiant, pas son
   contenu. Le papier lui-même vit dans sa propre boîte, qui ne se rogne
   jamais ; le fil ne garde que la trace de l'endroit où il a été écrit. */
type Message = {
  role: "bia" | "user";
  text: string;
  /* ── CE QU'ELLE A FAIT, ET QU'ELLE NE VOYAIT PAS ──────────────────────
     Lamine, le 16 septembre 2026 : « elle s'est mise à écrire un mail. Je
     lui ai demandé d'arrêter. Elle me dit qu'elle n'écrit rien. »

     Ses gestes sont détachés de sa phrase côté serveur — il le faut, sinon
     elle prononcerait les balises à voix haute. Mais on ne rangeait ensuite
     que la phrase NETTOYÉE : au tour suivant elle relisait ses propres mots
     sans aucune trace de ce qu'elle avait fait, et répondait de bonne foi
     qu'elle ne faisait rien. Le fil les porte maintenant avec la phrase, et
     ils lui reviennent sous les yeux. Voir lib/ses-gestes.ts.

     Court exprès : ça repart au serveur à chaque question. */
  gestes?: string[];
  /** L'émotion qu'elle a VRAIMENT écrite en tête de cette phrase (jamais
      celle qu'on a devinée) : le serveur la lui remet sous les yeux au tour
      suivant, sinon elle imite ses phrases nettoyées et cesse de l'écrire.
      Voir avecSaBalise() dans lib/emotions-vues.ts. */
  emotion?: string;
  papier?: string;
  /** La CLÉ d'un sujet de la vitrine — jamais l'image : elle pèse trop pour
      la mémoire du téléphone, et elle revient de Supabase quand il faut. */
  voir?: string;
  /** Ce qu'elle est allée chercher sur Internet. Gardé EN ENTIER, contrairement
      à la vitrine : une recherche se paie, et on ne rachète pas deux fois les
      mêmes chaussures pour remonter le fil. Six adresses pèsent un kilo-octet. */
  trouve?: Resultat;
  /** Cette phrase a été corrigée à la main : c'est la bonne, pas la sienne. */
  corrige?: boolean;
};

/* ── SES RENSEIGNEMENTS À LUI ───────────────────────────────────────────────
   Donnés une fois, gardés sur l'appareil, reposés sur chaque papier. Le NINEA
   et le registre de commerce ne sont pas un détail : sans eux, un devis est
   refusé par une administration ou par une société — c'est le premier motif
   de rejet. La TVA est un réglage, jamais une décision du modèle : la plupart
   des artisans n'y sont pas assujettis, et l'afficher quand on ne l'est pas
   est une faute. */
/* Les services que BIA rend, chacun derrière son bouton. */
/* « video » n'ouvre pas un papier : il ouvre le sélecteur du téléphone, comme
   « photo ». Lamine, le 12 septembre 2026 : « des vidéos prises sur YouTube ou
   directement sur ton téléphone ». Une chose qu'on ne voit pas n'existe pas —
   donc c'est un bouton, à côté des autres. */
/* « relire » est le seul service qui n'écrit rien : il ouvre la liste des
   textes qui attendent l'oreille de Lamine. Il ne paraît qu'avec son code. */
type Service = "" | "message" | "facture" | "devis" | "mail" | "lettre" | "photo" | "video" | "lire" | "fiche" | "relire";

type Emetteur = Partie & { tva: boolean };
const EMETTEUR_VIDE: Emetteur = {
  nom: "", metier: "", telephone: "", adresse: "", ninea: "", rc: "", tva: false,
};
/* Les 24 cases de la planche, dans l'ordre du fichier.
   01-07 les bouches, 08-11 le repos, 12-20 les émotions, 21-24 les rires. */
const CASES = {
  bouche_fermee: 1, bouche_entr: 2, bouche_a: 3, bouche_A: 4,
  bouche_o: 5, bouche_ou: 6, bouche_i: 7,
  yeux_ouverts: 8, yeux_mi: 9, yeux_fermes: 10, regard_cote: 11,
  douce: 12, joie: 13, etonnement: 14, surprise: 15,
  ecoute: 16, concernee: 17, triste: 18, malice: 19, pensive: 20,
  rire: 21, rire_tete: 22, fourire: 23, rire_retenu: 24,
} as const;

/* Les deux planches suivantes (19 septembre 2026) : six mouvements de quatre
   images chacune, numérotés comme dans PLANCHES-A-DEMANDER-A-CHATGPT.md.
   Le numéro est celui de la case dans SA planche ; le CSS sait quelle
   planche va avec quel nom. Tant que les fichiers ne sont pas dans public/,
   rien ne les appelle — ils attendent les CYCLES ci-dessous. */
const CASES_DES_PLANCHES_SUIVANTES = {
  /* bia-gestes-24.webp */
  ecoute_1: 1,
  ecoute_2: 2,
  ecoute_3: 3,
  ecoute_4: 4,
  reflexion_1: 5,
  reflexion_2: 6,
  reflexion_3: 7,
  reflexion_4: 8,
  rire_apaise_1: 9,
  rire_apaise_2: 10,
  rire_apaise_3: 11,
  rire_apaise_4: 12,
  comprehension_1: 13,
  comprehension_2: 14,
  comprehension_3: 15,
  comprehension_4: 16,
  douceur_1: 17,
  douceur_2: 18,
  douceur_3: 19,
  douceur_4: 20,
  compassion_1: 21,
  compassion_2: 22,
  compassion_3: 23,
  compassion_4: 24,
  /* bia-mains-24.webp */
  salut_1: 1,
  salut_2: 2,
  salut_3: 3,
  salut_4: 4,
  aurevoir_1: 5,
  aurevoir_2: 6,
  aurevoir_3: 7,
  aurevoir_4: 8,
  coeur_1: 9,
  coeur_2: 10,
  coeur_3: 11,
  coeur_4: 12,
  bouche_etonne_1: 13,
  bouche_etonne_2: 14,
  bouche_etonne_3: 15,
  bouche_etonne_4: 16,
  bouche_grosmot_1: 17,
  bouche_grosmot_2: 18,
  bouche_grosmot_3: 19,
  bouche_grosmot_4: 20,
  paume_1: 21,
  paume_2: 22,
  paume_3: 23,
  paume_4: 24,
} as const;

/* bia-mains2-24-wax.webp — livrée le 25 septembre 2026, en plus des six
   gestes ci-dessus : cœur à deux mains, bisou soufflé, rire main devant la
   bouche. Huit images par geste (au lieu de quatre) pour une animation plus
   fluide. N'existe que dans la tenue wax pour l'instant. */
const CASES_DE_LA_TROISIEME_PLANCHE = {
  coeur_double_1: 1, coeur_double_2: 2, coeur_double_3: 3, coeur_double_4: 4,
  coeur_double_5: 5, coeur_double_6: 6, coeur_double_7: 7, coeur_double_8: 8,
  bisou_1: 9, bisou_2: 10, bisou_3: 11, bisou_4: 12,
  bisou_5: 13, bisou_6: 14, bisou_7: 15, bisou_8: 16,
  rire_main_1: 17, rire_main_2: 18, rire_main_3: 19, rire_main_4: 20,
  rire_main_5: 21, rire_main_6: 22, rire_main_7: 23, rire_main_8: 24,
} as const;

/* bia-mains3-24-nouvelle.webp — prière (mains jointes) et compter (1, 2, 3
   doigts). Demandé le 26 septembre 2026. N'existe QUE dans la tenue
   "nouvelle" — voir la garde sur `tenue` à la fin de arreterLaBouche. */
const CASES_DE_LA_QUATRIEME_PLANCHE = {
  priere_1: 1, priere_2: 2, priere_3: 3, priere_4: 4,
  compter_1: 5, compter_2: 6, compter_3: 7, compter_4: 8,
} as const;
type Face = keyof typeof CASES | keyof typeof CASES_DES_PLANCHES_SUIVANTES | keyof typeof CASES_DE_LA_TROISIEME_PLANCHE
  | keyof typeof CASES_DE_LA_QUATRIEME_PLANCHE;

/* Un mouvement = ses quatre cases dans l'ordre : montée, tenue, variation,
   redescente. Joués à PAS_DU_CYCLE ms par image, avec le fondu de
   visageAvant entre deux. */
const cycle = (nom: string): Face[] => [1, 2, 3, 4].map((k) => `${nom}_${k}` as Face);
/* Huit images au lieu de quatre — mêmes gestes affectueux (cœur, bisou,
   rire), animation plus fluide. Voir CASES_DE_LA_TROISIEME_PLANCHE. */
const cycle8 = (nom: string): Face[] => [1, 2, 3, 4, 5, 6, 7, 8].map((k) => `${nom}_${k}` as Face);
const CYCLES = {
  ecoute: cycle("ecoute"), reflexion: cycle("reflexion"), rire_apaise: cycle("rire_apaise"),
  comprehension: cycle("comprehension"), douceur: cycle("douceur"), compassion: cycle("compassion"),
  salut: cycle("salut"), aurevoir: cycle("aurevoir"), coeur: cycle("coeur"),
  bouche_etonne: cycle("bouche_etonne"), bouche_grosmot: cycle("bouche_grosmot"), paume: cycle("paume"),
  coeur_double: cycle8("coeur_double"), bisou: cycle8("bisou"), rire_main: cycle8("rire_main"),
  priere: cycle("priere"), compter: cycle("compter"),
} as const;
const PAS_DU_CYCLE = 380;


/* ── TROIS FOIS MOINS D'OCTETS QUI MONTENT DE DAKAR ───────────────────────

   Soynade, le 19 septembre 2026 : « le modèle a été entraîné sur des audios
   échantillonnés en wav 16 kHz mono… en backend nous rééchantillonnons tous
   les audios reçus en ce format. » Donc envoyer mieux que 16 kHz mono ne
   sert à rien : le débit par défaut du navigateur (autour de 100 kbit/s)
   part à la poubelle chez eux. À 32 kbit/s, l'opus d'Android et l'aac
   d'iPhone gardent tout ce qu'une oreille de 16 kHz peut entendre, et le
   forfait de la personne en paie le tiers. Ça se lit sur le compteur
   `oreille` de /api/etat (octets par seconde de parole), avant et après.

   Si le navigateur refuse l'option, on repart sans — comme avant. */
const DEBIT_DU_MICRO = 32_000;
function ouvrirEnregistreur(flux: MediaStream): MediaRecorder {
  try { return new MediaRecorder(flux, { audioBitsPerSecond: DEBIT_DU_MICRO }); }
  catch { return new MediaRecorder(flux); }
}
/* Ce que l'émotion de la réponse appelle comme mouvement, une fois la
   bouche fermée. Les rires ont leur propre chemin (rire_apaise). */
const CYCLE_DE_L_EMOTION: Partial<Record<string, keyof typeof CYCLES>> = {
  etonnement: "bouche_etonne", surprise: "bouche_etonne",
  concernee: "compassion", triste: "compassion",
  douce: "douceur", ecoute: "comprehension",
  /* Le grand rire (fourire) fait ce geste au lieu du simple retour au calme
     — elle reste joviale, visage souriant. Le petit rire (rire) garde
     rire_apaise, voir stopMouth ci-dessous. */
  fourire: "rire_main",
};

/* Ce que BIA renvoie → ce qu'on affiche. Les rires ne sont pas une image
   fixe : ils s'animent, d'où les suites plus bas. */
const EMOTION_VERS_FACE: Record<string, Face> = {
  neutre: "yeux_ouverts", douce: "douce", joie: "joie", rire: "rire",
  fourire: "fourire", etonnement: "etonnement", surprise: "surprise",
  ecoute: "ecoute", concernee: "concernee", triste: "triste",
  malice: "malice", pensive: "pensive",
};

/* Un rire ne tient pas sur une seule image. On enchaîne quelques cases pour
   que le visage bouge — c'est ce qui donne l'impression du vrai. */
/* Le chemin du retour au repos, après n'importe quelle émotion : la douceur,
   puis les yeux mi-clos, puis les yeux ouverts. C'est ce qui remplace la
   coupe franche que Lamine trouvait brusque. */
const ATTERRISSAGE: Array<[Face, number]> = [["douce", 420], ["yeux_mi", 240], ["yeux_ouverts", 0]];

const SUITES: Partial<Record<string, Array<[Face, number]>>> = {
  rire:    [["joie",320],["rire",620],["rire_tete",720],["rire",560],["joie",480]],
  /* Le grand rire, quand aucun son n'est disponible : même arc que la suite
     sonore de lib/sons.ts, tête renversée en arrière et retour. */
  fourire: [["rire",380],["rire_tete",900],["fourire",1100],["rire_tete",760],["rire",520],["joie",520]],
  surprise:[["etonnement",340],["surprise",1300],["etonnement",600]],
  malice:  [["douce",380],["malice",1600]],
  pensive: [["pensive",1500],["regard_cote",700]],
};
type Recognition = {
  lang: string;
  interimResults: boolean;
  continuous: boolean;
  start: () => void;
  stop: () => void;
  /* stop() rend ce qu'il a entendu ; abort() jette tout. C'est abort qu'il
     faut pour annuler, et il existe partout où la reconnaissance existe. */
  abort?: () => void;
  onstart: (() => void) | null;
  onend: (() => void) | null;
  onerror: ((event: { error?: string }) => void) | null;
  onresult: ((event: any) => void) | null;
};

const welcomeBia = "Salaam! Man maa di BIA. Waxal ak man ci wolof walla ci français.";
/* 25 septembre 2026 : le seul texte d'accueil disait « Man maa di BIA »
   (« je suis BIA ») quelle que soit la personne choisie — Rara se
   présentait donc comme BIA dès l'écran vide, avant même le premier
   message. Sa propre phrase, même forme, son propre nom. */
const welcomeRara = "Salaam! Man maa di Rara. Waxal ak man ci wolof walla ci français.";

const pause = (ms: number) => new Promise((fini) => setTimeout(fini, ms));

/* ── L'EXTENSION QUI CORRESPOND AU VRAI FORMAT ──────────────────────────────

   Elle était calculée dans le `onstop`, et il en faut maintenant une
   deuxième : chaque morceau monté au fil de l'eau porte le même nom de
   fichier, et ElevenLabs lit ce nom. Deux calculs séparés auraient fini par
   diverger — celui du morceau disant « webm » et celui du fichier « m4a », sur
   le même enregistrement. Un seul endroit, donc.

   Rappel de ce que ça coûte quand on se trompe : le 12 septembre, on
   annonçait du webm en tendant du MP4 à Safari, et BIA demandait de répéter
   indéfiniment quoi qu'on lui dise. */
function extensionDe(type: string): string {
  const t = String(type || "");
  return t.includes("mp4") || t.includes("mpeg") || t.includes("aac") ? "m4a"
    : t.includes("ogg") ? "ogg"
    : t.includes("wav") ? "wav"
    : "webm";
}

/* Chaque morceau de voix arrive avec du silence au début et à la fin. Mis
   bout à bout, ces silences s'additionnent et créent, entre deux phrases, un
   blanc assez long pour qu'on croie BIA arrivée au bout de sa réponse — et
   qu'on lui coupe la parole. On les rogne, en gardant 25 ms de marge : couper
   au ras rendrait l'attaque sèche. */
function sansSilence(ctx: AudioContext, brut: AudioBuffer): AudioBuffer {
  const donnees = brut.getChannelData(0);
  const SEUIL = 0.006;
  let fin = donnees.length;
  while (fin > 1 && Math.abs(donnees[fin - 1]) < SEUIL) fin -= 1;
  let debut = 0;
  while (debut < fin && Math.abs(donnees[debut]) < SEUIL) debut += 1;

  const marge = Math.round(brut.sampleRate * 0.025);
  debut = Math.max(0, debut - marge);
  fin = Math.min(donnees.length, fin + marge);
  const garde = fin - debut;
  if (garde < 1 || garde > donnees.length - marge) return brut;   // rien à gagner

  const coupe = ctx.createBuffer(brut.numberOfChannels, garde, brut.sampleRate);
  for (let c = 0; c < brut.numberOfChannels; c++) {
    coupe.copyToChannel(brut.getChannelData(c).slice(debut, fin), c);
  }
  return coupe;
}

const rythmesAudioBia = new WeakMap<ArrayBuffer, number>();
function octetsDeBase64(b64: string, vitesseSource?: number) {
  const brut = atob(b64);
  const tableau = new Uint8Array(brut.length);
  for (let i = 0; i < brut.length; i++) tableau[i] = brut.charCodeAt(i);
  if (typeof vitesseSource === "number" && Number.isFinite(vitesseSource) && vitesseSource > 0) rythmesAudioBia.set(tableau.buffer, vitesseSource);
  return tableau.buffer;
}

/* BIA et Rara partagent le moteur installé dans la même application iPhone.
   Les personnalités restent distinctes ; hors application, la voix est inchangée. */
function voixLocaleBiaDisponible(_persona = "rara"): boolean {
  if (typeof window === "undefined" || essaiChatterboxActif()) return false;
  const moteur = (window as Window & { BiaLocalVoice?: { epoch?: number; settings?: unknown } }).BiaLocalVoice;
  return typeof moteur?.epoch === "number" && typeof moteur.settings === "function";
}
function epoqueVoixLocaleBia(): number {
  if (typeof window === "undefined") return 0;
  const epoch = (window as Window & { BiaLocalVoice?: { epoch?: number } }).BiaLocalVoice?.epoch;
  return typeof epoch === "number" && Number.isSafeInteger(epoch) && epoch > 0 ? epoch : 0;
}
function personnageAuDemarrage(stockage: Pick<Storage, "getItem" | "setItem">): string {
  const cle = "bia-persona-default-rara-v1";
  if (stockage.getItem(cle) !== "1") {
    const avant = stockage.getItem("bia-persona");
    if (avant === "bia" || avant === "rara") stockage.setItem("bia-persona-avant-rara-v1", avant);
    stockage.setItem("bia-persona", "rara");
    stockage.setItem(cle, "1");
    return "rara";
  }
  return stockage.getItem("bia-persona") === "bia" ? "bia" : "rara";
}
function noterRouteVoixBia(etape: string, locale: boolean, erreur?: unknown) {
  const message = String(erreur || "");
  const motif = /caract|phon[eè]me|symbol|unicode/i.test(message) ? "caractere"
    : /occup|busy|long|invalide/i.test(message) ? "requete"
    : /abort|annul/i.test(message) ? "annulation" : erreur ? "synthese" : "";
  void fetch("/api/mesure", { method: "POST", headers: { "content-type": "application/json" },
    body: JSON.stringify({ type: "route_voix", etape, locale, epoch: locale ? epoqueVoixLocaleBia() : 0,
      revision: "bia-voix-route-v2", motif }), keepalive: true,
  }).catch(() => {});
}


/* ── Quelle langue ? ───────────────────────────────────────────────────────
   Le navigateur n'a pas de voix wolof. Sans ce test, la retouche phonétique
   ci-dessous s'appliquait AUSSI au français : « communication » devenait
   « tchommounitchation ». On ne la déclenche donc que sur du wolof.        */
const motsFrancais = /\b(le|la|les|un|une|des|du|de|et|est|sont|pour|dans|avec|vous|nous|je|tu|il|elle|que|qui|ne|pas|sur|ce|cette|mais|plus|tout|faire|peut|comme|son|sa|ses|au|aux|par|en|si|bien|très|donc|alors|quand)\b/g;
const motsWolof = /\b(naa|nga|ngeen|ci|ak|bi|bu|la|lu|mooy|moo|dafa|dafay|ngir|waaw|déedéet|sama|yow|man|ñu|ñi|yi|te|walla|léegi|mën|bëgg|am|amul|lan|ban|def|dem|wax|jàng|jëf|nekk|jamm|noo|kañ|fu|nu)\b/g;

function estWolof(texte: string) {
  return detecterLangue(texte) === "wo";
}

function phoneticWolof(text: string) {
  return text
    .replace(/khalam\.app/gi, "Khalam point app")
    .replace(/ñ/gi, "gn").replace(/ŋ/gi, "ng").replace(/x/gi, "kh")
    .replace(/c/gi, "tch").replace(/j/gi, "dj").replace(/ë/gi, "eu")
    .replace(/u/gi, "ou");
}



export default function Home() {
  const [history, setHistory] = useState<Message[]>([]);
  const [face, setFace] = useState<Face>("yeux_ouverts");
  /* Le visage qu'on vient de quitter, pour le fondu. Les bouches sont exclues
     des deux côtés : la parole reste nette. */
  const [visageAvant, setVisageAvant] = useState<{ face: Face; n: number } | null>(null);
  const facePrecedente = useRef<Face | null>(null);
  useEffect(() => {
    const avant = facePrecedente.current;
    facePrecedente.current = face;
    if (!avant || avant === face) return;
    if (avant.startsWith("bouche_") || face.startsWith("bouche_")) { setVisageAvant(null); return; }
    setVisageAvant({ face: avant, n: Date.now() });
    const t = setTimeout(() => setVisageAvant(null), 260);
    return () => clearTimeout(t);
  }, [face]);
  const onboarding = useOnboardingVoix();
  const [mode, setMode] = useState<"ready" | "listening" | "thinking" | "speaking" | "error">("ready");
  /* ── LA CONVERSATION VOCALE ────────────────────────────────────────────
     Demandée par Lamine le 12 septembre 2026 : « un premier appui ouvre la
     conversation vocale, le microphone reste ensuite actif… un second appui
     permet de fermer complètement. »

     `mode` dit ce qu'elle fait à cet instant ; `conversation` dit si le fil
     est ouvert. Les deux sont nécessaires : pendant qu'elle réfléchit, le
     mode n'est plus « listening » mais la conversation, elle, continue. */
  const [conversation, setConversation] = useState(false);
  /* Le quatrième indicateur qu'il demande : « parole détectée ». Il existait
     déjà DANS le micro (`aParle`), mais rien ne le montrait — on ne voyait
     pas la différence entre « je t'écoute » et « je t'entends ». */
  const [entendParler, setEntendParler] = useState(false);
  const [clavier, setClavier] = useState(false);
  const [lectureContinue, setLectureContinue] = useState<{texte:string;nonce:number;auto:boolean}|null>(null);
  const [saisie, setSaisie] = useState("");
  /* PLUS DE TEXTE SUR L'ÉCRAN.
     Demande de Lamine, 9 septembre 2026 : l'écran ne montre que BIA. La
     dernière réponse s'affichait sous son visage ; elle vit désormais
     uniquement dans le fil, à l'intérieur du clavier. Qui veut lire ouvre le
     clavier. Tant que le clavier est replié, il n'y a AUCUN texte : ni la
     réponse, ni le témoin de panne, rien. Le témoin de panne existe toujours,
     mais il s'affiche à l'intérieur du clavier, en tête du fil. */
  /* Quand la reponse ne vient pas du modele, on le dit a l ecran. Sans ce
     temoin, une panne du moteur ressemblait a une reponse ordinaire. */
  const [panne, setPanne] = useState("");
  const [choixVoix, setChoixVoix] = useState<ChoixVoixBia>("piper");
  const essaiChatterbox = choixVoix !== "piper";
  const [erreurChoixVoix, setErreurChoixVoix] = useState("");
  useEffect(() => { setChoixVoix(choixVoixBia()); }, []);
  const [voixLocalePresente, setVoixLocalePresente] = useState(false);
  useEffect(() => {
    const verifier = () => { const presente = voixLocaleBiaDisponible(); setVoixLocalePresente(presente); noterRouteVoixBia("ouverture", presente); };
    verifier();
    const visible = () => { if (document.visibilityState === "visible") verifier(); };
    document.addEventListener("visibilitychange", visible);
    return () => document.removeEventListener("visibilitychange", visible);
  }, []);
  const [code, setCode] = useState<string | null>(null);
  const [codeSaisi, setCodeSaisi] = useState("");
  const [codeErreur, setCodeErreur] = useState("");
  const [moteurs, setMoteurs] = useState<{ voix: string; ecoute: string } | null>(null);
  const [tenue, setTenue] = useState<string>("nouvelle");
  /* ── RARA, LE DEUXIÈME PERSONNAGE ───────────────────────────────────────
     Demandé par Lamine le 25 septembre 2026 : un choix personnel, propre à
     chaque personne sur son téléphone — pas un réglage global comme la
     tenue. On le garde donc dans le téléphone (localStorage), jamais sur le
     serveur. */
  const [persona, setPersona] = useState<string>("rara");
  /* Lue dans des useCallback figés (deps vides ou sans `persona`) : sans ce
     ref, ils garderaient pour toujours la valeur du tout premier rendu, et
     la voix de Rara ne se déclencherait jamais après une bascule. Même
     raison que codeRef un peu plus haut. */
  const personaRef = useRef(persona);
  useEffect(() => { personaRef.current = persona; }, [persona]);
  useEffect(() => {
    try {
      setPersona(personnageAuDemarrage(window.localStorage));
    } catch {}
  }, []);
  const choisirPersona = (valeur: string) => {
    setPersona(valeur);
    try { window.localStorage.setItem("bia-persona", valeur); } catch {}
  };
  /* Même moteur vocal pour les deux personnages, demandé le5octobre2026.
     L'ancien audioPrompt vide excluait Rara du pont natif déjà installé. */
  const voixAudioPrompt = () => undefined;
  /* ── SON DÉFILÉ D'ENTRÉE ────────────────────────────────────────────────
     Demandé par Lamine le 26 septembre 2026 : à chaque bascule sur Rara,
     ses quatre photos (de la fiche qui a servi à générer son avatar)
     défilent avant que le portrait habituel ne s'installe — comme une
     présentation, pas seulement un changement muet d'image. */
  const [introRara, setIntroRara] = useState<number | null>(null);
  const [resume, setResume] = useState("");
  const [corrige, setCorrige] = useState<number | null>(null);
  const [correction, setCorrection] = useState("");
  /* Les autres façons de le dire, qu'elle propose elle-même. Reconnaître une
     bonne phrase est immédiat ; en écrire une sur un clavier de téléphone est
     un travail — c'est pour ça que personne ne corrigeait. */
  const [propositions, setPropositions] = useState<string[]>([]);
  const [reformule, setReformule] = useState(false);
  const [copieFaite, setCopieFaite] = useState(false);
  const [avis, setAvis] = useState("");

  /* ── LE PAPIER ────────────────────────────────────────────────────────────
     Demandé par Lamine : qu'on puisse parler wolof à BIA et repartir avec un
     devis propre, en français, prêt à envoyer. Le serveur savait déjà le
     fabriquer ; voici ce qui manquait — le bouton, le papier à l'écran, la
     correction d'un chiffre mal entendu, et le PDF. */
  const [papierPret, setPapierPret] = useState<Sorte | null>(null);
  /* Lu au moment d'envoyer la question : `papierPret` lui-même ne serait pas
     à jour dans la fonction d'envoi, qui a été fabriquée avant. */
  const papierPretRef = useRef<Sorte | null>(null);
  /* L'appui long qui éteint le point. `appuiLong` empêche le clic qui suit
     de rouvrir un papier : sur un téléphone, relâcher après un appui long
     déclenche quand même onClick. */
  const minuteurAppui = useRef<number | undefined>(undefined);
  const appuiLong = useRef(false);
  const [papierOuvert, setPapierOuvert] = useState(false);
  const [papier, setPapier] = useState<{ doc: Papier; totaux: Totaux | null } | null>(null);
  /* Tous les papiers déjà écrits par cette personne. Ils survivent au
     rechargement, au changement de service et à la question suivante. */
  const [papiers, setPapiers] = useState<PapierGarde[]>([]);
  /* Lequel est ouvert à l'écran : sans ça, retoucher un papier rouvert en
     créerait un deuxième au lieu de corriger le premier. */
  const papierOuvertId = useRef<string>("");
  /* Un papier est prêt et personne ne l'a encore ouvert : le petit clavier
     clignote en jaune jusqu'à ce qu'on le touche. Il ne s'arrête pas tout
     seul — c'est le principe : on ne rate pas un travail terminé. */
  const [papierFini, setPapierFini] = useState(false);

  /* ── L'ÉCRAN QUI S'OUVRE SOUS SON MENTON ────────────────────────────────
     Lamine, le 11 septembre 2026 : « paf, il y a un écran de télévision qui
     s'ouvre pour te montrer cette image ». Il ne vit pas dans le fil : c'est
     une surface à lui, et une seule à la fois. */
  const [ecran, setEcran] = useState<{ titre: string; pieces: PieceEcran[]; credit?: string } | null>(null);

  /* ── LE DÉBIT DE SA VOIX, À PORTÉE DE MAIN ──────────────────────────────
     Lamine, le 11 septembre 2026 : « où se trouve le réglage dont tu parles ?
     Il n'y a aucun bouton paramètre sur BIA. »

     Il avait raison, et c'est la deuxième fois que je fais la même erreur en
     deux jours : j'avais mis ce curseur sur /reglage — une page sans lien,
     qu'il faut taper à la main et qui demande le code maître. Autant dire
     qu'elle n'existe pas.

     Le débit n'est pas un réglage d'atelier : c'est un confort d'écoute, et
     il change d'une personne à l'autre. Quelqu'un qui comprend mal le
     français veut l'entendre plus lentement, quelqu'un de pressé non. Il vit
     donc dans « Moi », avec le reste de ce qui appartient à la personne, et
     il ne demande aucun code. */
  const [debit, setDebit] = useState(VITESSE_POSEE);
  const debitNatifRef = useRef(0.85);
  const [erreurDebit, setErreurDebit] = useState("");
  const voixAvecDebitNatif = () => (window as Window & { BiaLocalVoice?: { getSpeed?: () => Promise<{speed: number}>; setSpeed?: (speed: number) => Promise<{speed: number}>; settings?: () => Promise<unknown> } }).BiaLocalVoice;
  useEffect(() => {
    let actif = true;
    const synchroniser = () => {
      if (essaiChatterboxActif()) { setDebit(1); return; }
      const voix = voixAvecDebitNatif();
      if (voix?.getSpeed) {
        void voix.getSpeed().then((d) => { if (actif) { debitNatifRef.current = d.speed; setDebit(d.speed); } }).catch(() => { if (actif) setErreurDebit("Impossible de lire le réglage de la voix."); });
      } else if (voixLocaleBiaDisponible()) {
        const v = Number(localStorage.getItem("bia-native-speed-ui"));
        const garde = Number.isFinite(v) && v >= 0.7 && v <= 1.2 ? v : 0.85;
        debitNatifRef.current = garde; setDebit(garde);
      } else setDebit(vitesseChoisie());
    };
    synchroniser(); window.addEventListener("focus", synchroniser);
    const visible = () => { if (document.visibilityState === "visible") synchroniser(); };
    document.addEventListener("visibilitychange", visible);
    return () => { actif = false; window.removeEventListener("focus", synchroniser); document.removeEventListener("visibilitychange", visible); };
  }, [persona]);
  const changerDebit = (valeur: number) => {
    if (essaiChatterboxActif()) return;
    setDebit(valeur); debitNatifRef.current = valeur; setErreurDebit("");
    const voix = voixAvecDebitNatif();
    if (voixLocaleBiaDisponible()) {
      try { localStorage.setItem("bia-native-speed-ui", String(valeur)); } catch {}
    }
    if (voix?.setSpeed) {
      void voix.setSpeed(valeur).catch(() => setErreurDebit("Le réglage n’a pas été enregistré. Réessaie le curseur."));
    }
  };
  const vitesseAudioBia = (octets: ArrayBuffer) => {
    if (essaiChatterboxActif()) return 1;
    const source = rythmesAudioBia.get(octets);
    return voixLocaleBiaDisponible(personaRef.current) && source
      ? debitNatifRef.current / source : vitesseChoisie();
  };
  useEffect(() => {
    // Écrit à chaque mouvement : elle le lira au mot suivant, sans rien relancer.
    if (essaiChatterboxActif()) return;
    try { localStorage.setItem(CLE_VITESSE, String(debit)); } catch {}
  }, [debit]);

  /* Une seule surface : un nouvel écran remplace l'ancien au lieu de
     s'empiler dessus. Deux écrans de chaussures l'un sur l'autre, personne
     ne saurait lequel referme quoi. */
  const montrerSurEcran = useCallback((v: { titre: string; pieces: PieceEcran[]; credit?: string }) => {
    if (!v?.pieces?.length) return;
    setEcran(v);
  }, []);
  const fermerEcran = useCallback(() => setEcran(null), []);
  /* Elle vient de le lire à voix haute et attend un « oui ». Tant que ce
     n'est pas donné, le papier n'est pas un papier : c'est une proposition. */
  const [aValider, setAValider] = useState(false);
  /* Ces deux miroirs existent parce que fabriquerPapier est gardé en mémoire :
     à son retour, dix secondes plus tard, il ne verrait que l'état d'avant. */
  const papierOccupeRef = useRef(false);
  const papierOuvertRef = useRef(false);
  const [papierOccupe, setPapierOccupe] = useState(false);
  const [papierErreur, setPapierErreur] = useState("");
  const [pdf, setPdf] = useState("");
  const [fiche, setFiche] = useState(false);
  const [emetteur, setEmetteur] = useState<Emetteur>(EMETTEUR_VIDE);
  /* QUI PARLE. Un téléphone se prête, ici : au frère, au client, au voisin.
     Chacun a sa case — son prénom, ses notes, ses papiers, sa conversation. */
  const [profils, setProfils] = useState<Profil[]>([]);
  const [profil, setProfil] = useState("");
  const [quiParle, setQuiParle] = useState(false);
  const [nouveauNom, setNouveauNom] = useState("");
  /* Retirer quelqu'un efface ses notes, ses papiers et sa conversation. Ça ne
     se fait pas d'un seul doigt posé par erreur : il faut confirmer. */
  const [aRetirer, setARetirer] = useState<string | null>(null);
  /** La photo d'un papier, pendant qu'elle la lit. */
  const [photoOccupe, setPhotoOccupe] = useState(false);
  /* L'APPEL PRÉPARÉ. Demandé par Lamine le 10 septembre 2026 : « elle doit
     pouvoir lancer des appels ». Une application web ne compose pas un numéro
     toute seule — et c'est heureux : ce qu'elle fait, c'est ouvrir le clavier
     du téléphone avec le numéro déjà écrit. La personne appuie, ou pas. */
  const [appel, setAppel] = useState<{ numero: string; nom: string; urgence?: boolean } | null>(null);
  /* ── LE MICRO PENDANT QUE LA CARTE ARRIVE ─────────────────────────────────

     Lamine, le 14 septembre 2026 : « il faut couper le micro quand la carte
     s'affiche, pour le remettre une fois qu'elle est affichée totalement. »

     Entre le doigt qui choisit le lieu et la carte enfin peinte, il se passe
     plusieurs secondes : l'ecran fond au noir, la bibliotheque se reveille,
     les tuiles arrivent une a une. Pendant ce temps le micro restait ouvert —
     il ecoutait le telephone travailler, la pastille d'enregistrement restait
     allumee, et ce qu'il attrapait la ne voulait rien dire.

     On le ferme donc au doigt, et on le rouvre quand la carte previent
     qu'elle est la. SEULEMENT S'IL ETAIT OUVERT : on ne rallume pas un micro
     que la personne venait de couper. C'est ce temoin-ci qui s'en souvient. */
  const microAvantLaCarte = useRef(false);
  /* Le même témoin pour la vidéo en plein écran — voir l'effet plus bas. */
  const microAvantLeFilm = useRef(false);
  /* Et le même pour la rangée des tuiles. Il manquait : on fermait le micro
     en entrant et personne ne le rouvrait en sortant. Voir « LA FENÊTRE DES
     SERVICES FERME LE MICRO » plus bas. */
  const microAvantLesServices = useRef(false);
  /* La version avec laquelle ce téléphone a démarré. Voir « la mise à jour
     d'elle-même » plus bas. */
  const versionChargee = useRef("");
  /* Deux témoins de plus, lisibles depuis l'effet qui surveille la version :
     il ne se refabrique jamais, donc il ne peut pas lire un état de React. */
  const occupeeRef = useRef(false);
  const filmOuvertRef = useRef(false);
  /* Le mode, lisible depuis un effet qui ne se refabrique jamais (le
     secours de veille dit ce que faisait BIA quand le téléphone l'a mis en
     pause). */
  const modeRef = useRef<typeof mode>("ready");
  useEffect(() => { modeRef.current = mode; }, [mode]);

  /* ── LA CARTE, ET LA CONFIRMATION QUI LA PRÉCÈDE ─────────────────────────

     Lamine, le 11 septembre 2026 : « BIA doit pouvoir guider une personne
     pour qu'elle se retrouve, comme Google Maps… elle se retire pour laisser
     la carte, mais on peut continuer à parler avec elle. »

     `carte` est la destination confirmée : tant qu'elle vaut null, rien ne
     s'ouvre. `aConfirmer` est l'étape d'avant, et elle n'est pas
     négociable — c'est la leçon de WARI, ce commerce que la base de données
     place encore à Ouakam dix ans après sa fermeture. On répète l'endroit, on
     attend le « waaw », et seulement après on démarre.

     LA CONVERSATION N'EST PAS DÉMONTÉE quand la carte s'ouvre : elle est
     posée PAR-DESSUS. Le micro, l'historique, sa voix, tout continue de
     tourner dessous. C'est ce qui fait qu'on peut lui parler sans la voir. */
  const [carte, setCarte] = useState<Lieu | null>(null);
  /* ── CARTE OUVERTE : BIA SE TAIT ─────────────────────────────────────────

     Règle donnée par Lamine le 14 septembre 2026 : « dès que BIA dit ok je
     t'y amène et que la carte s'ouvre, elle doit se taire, pour faire simple.
     On laisse les guidages continuer. À moins que tu veuilles lui poser une
     autre question : tu appuies sur Ramène-moi pour lui parler à nouveau. »

     C'est plus simple ET c'est plus sûr. En conduisant, une seule voix doit
     exister : celle qui dit où tourner. Tout le reste — la fin d'une réponse,
     une phrase d'attente, un accusé de réception — peut attendre qu'on soit
     arrivé, ou que la personne referme la carte elle-même.

     Un `ref` et pas seulement l'état : speak() est appelé depuis des
     fonctions parties AVANT l'ouverture de la carte, et elles liraient une
     valeur périmée. */
  const carteOuverteRef = useRef(false);
  useEffect(() => { carteOuverteRef.current = carte !== null; }, [carte]);
  /* Les deux témoins que lit la surveillance de version : elle ne se
     refabrique pas, donc elle ne peut pas lire `mode` ni `film`. */
  useEffect(() => { occupeeRef.current = mode !== "ready"; }, [mode]);

  const [aConfirmer, setAConfirmer] = useState<Lieu[] | null>(null);
  /* Vrai quand la RECHERCHE a échoué, pas quand l'endroit est inconnu. */
  const [lieuEnPanne, setLieuEnPanne] = useState(false);
  const [chercheLieu, setChercheLieu] = useState(false);

  /* ── LES BLAGUES DÉJÀ ENTENDUES ─────────────────────────────────────────

     Une blague répétée n'est plus une blague. La mémoire de ce qui a servi
     vit ICI, sur le téléphone, et pas sur le serveur : Render redémarre —
     trois fois dans la nuit du 12 septembre 2026 — et une rotation gardée
     là-bas resservirait éternellement la première.

     On l'envoie à chaque demande ; le serveur choisit dans le reste. */
  const blaguesDites = useRef<string[]>([]);
  /* La dernière formulation de service qu'elle a servie. Elle repart avec la
     question suivante pour qu'on ne serve pas deux fois de suite la même :
     le serveur ne peut pas s'en souvenir, Render redémarre. Comme les
     blagues. */
  const dernierService = useRef("");
  /* ── L'APPRENTISSAGE À LA VOIX ────────────────────────────────────────────

     Lamine, le 14 septembre 2026 : « je prononce les choses, je continue à
     prononcer jusqu'à ce qu'elle répète avec moi, et une fois que c'est bon,
     je lui dis : ça c'est bon, retiens ça. »

     Deux témoins, et rien de plus. `apprend` : on est dans la boucle. `aRepeter` :
     la dernière phrase qu'elle a redite — c'est celle-là qu'on garde quand il
     valide, parce que c'est celle qu'il vient d'ENTENDRE. Tout le reste est
     dans lib/instructions.ts, côté serveur, là où le code maître se vérifie. */
  const apprend = useRef(false);
  const aRepeter = useRef("");
  /* ── SA VOIX, GARDÉE LE TEMPS D'UN « MÉMORISE » ──────────────────────────

     Lamine, le 14 septembre 2026 : « il vaut mieux qu'elle entende ce que je
     dis et la manière dont je le dis. »

     Le son ne lui apprend pas à prononcer — le moteur de voix n'a pas
     d'oreille, voir app/api/memoire/route.ts. Mais c'est la PREUVE de comment
     ça se dit, et c'est le corpus. On garde donc le dernier enregistrement en
     mémoire vive, et on ne l'envoie QUE s'il dit « mémorise ». Un son de plus
     par tour, jamais deux, et rien ne part tant qu'il n'a pas validé. */
  const sonDeSaVoix = useRef<{ blob: Blob; nom: string } | null>(null);
  const [enApprentissage, setEnApprentissage] = useState(false);
  /* ── CE QU'ELLE VIENT DE RÉPÉTER, VISIBLE ─────────────────────────────────

     Lamine, le 14 septembre 2026 : « le mieux c'est de mettre un bouton bleu
     pendant la session d'apprentissage au lieu de lui demander de mémoriser.
     Si j'appuie sur ce bouton elle mémorise directement. »

     `aRepeter` est un ref — il ne réveille pas l'écran. Il fallait donc son
     double en état, sinon le bouton n'apparaîtrait qu'au tour suivant, c'est
     à dire une phrase trop tard. */
  const [aGarder, setAGarder] = useState("");
  /* ── CE QUE SA PHRASE VEUT DIRE, PENDANT QU'IL APPREND ──────────────────
     Lamine, le 15 septembre 2026 : « si elle comprend le sens, elle le dit en
     français, ce n'est pas la peine que je lui répète ça. Je dois tout
     simplement confirmer et passer à l'étape suivante. »
     `sur` dit d'où ça vient — ses leçons, ou une traduction du modèle. Ça ne
     change RIEN à ce qu'elle dit : ça se voit sur le bandeau, et lui seul
     décide si ça mérite un regard. */
  const [sens, setSens] = useState<{ francais: string; sur: boolean } | null>(null);
  const [sensCherche, setSensCherche] = useState(false);
  /* « en cours », « gardée », ou le motif du refus. Jamais un « c'est fait »
     muet : c'est exactement la faute qu'on vient de passer deux soirées à
     réparer. */
  const [motGarde, setMotGarde] = useState("");
  /* La phrase qui VIENT d'être rangée. Séparée de `aGarder` parce que la
     leçon se referme aussitôt : sans elle, l'annonce afficherait des
     guillemets vides au moment précis où il a besoin de relire ce qui est
     entré. */
  const [gardee, setGardee] = useState("");
  /* ── LA LANGUE DE LA CONVERSATION, D'UN TOUR À L'AUTRE ──────────────────

     `langueRef` est remise à « wo » au début de CHAQUE tour, parce que la
     phrase d'attente doit partir avant qu'on sache ce qui a été dit. Elle ne
     peut donc pas servir d'indice au moteur d'écoute : elle vaudrait
     toujours « wo ».

     Celle-ci, elle, se souvient : elle garde la dernière langue REELLEMENT
     reconnue, transcription ou clavier. C'est elle qu'on envoie à Scribe
     comme indice — quelqu'un qui parle français depuis dix minutes ne se met
     pas à parler wolof sans prévenir. Au premier mot, wolof : BIA est wolof
     d'abord. */
  const langueDuFil = useRef<"wo" | "fr">("wo");

  /* ── SON ÉCLIPSE ────────────────────────────────────────────────────────

     Lamine, le 12 septembre 2026 à trois heures du matin : « quand elle doit
     se retirer de l'écran, il faut que ça soit un peu plus spectaculaire.
     Comme un hologramme qui s'éteint : ça fait des rayons, après ça grouille
     un peu, et puis ça s'éclipse d'un coup. »

     Les trois temps sont dans app/globals.css. Ici, une seule chose : la
     carte et la vidéo n'arrivent QU'APRÈS l'extinction. Sans cette attente,
     le plein écran recouvrirait l'animation et personne ne la verrait — le
     geste serait joué, mais derrière un rideau.

     Sept cent vingt millisecondes. Assez pour être vu, trop court pour faire
     attendre. */
  const [eclipse, setEclipse] = useState(false);
  const [rallume, setRallume] = useState(false);
  const eclipser = useCallback(async (ouvrir: () => void) => {
    setEclipse(true);
    await new Promise((r) => setTimeout(r, 720));
    ouvrir();
    setEclipse(false);
  }, []);
  /* Le retour : elle se rallume, sans grouiller. Un retour n'est pas une
     panne. */
  const revenir = useCallback((fermer: () => void) => {
    fermer();
    setRallume(true);
    setTimeout(() => setRallume(false), 460);
  }, []);

  /* ── LA VIDÉO QUI PREND TOUT L'ÉCRAN ─────────────────────────────────────
     Lamine, le 12 septembre 2026 : « elle se retire définitivement comme elle
     fait sur la carte ». Deux sources : YouTube, ou un fichier du téléphone —
     et celui-là ne quitte jamais l'appareil. */
  const [film, setFilm] = useState<Film | null>(null);
  /* Le témoin que lit la surveillance de version : elle ne se refabrique pas,
     donc elle ne peut pas lire cet état-ci. */
  useEffect(() => { filmOuvertRef.current = film !== null; }, [film]);
  const fichierVideo = useRef<HTMLInputElement | null>(null);
  /* L'adresse locale d'une vidéo choisie sur le téléphone. On la relâche à la
     fermeture : sans ça le navigateur garde le fichier en mémoire. */
  const adresseLocale = useRef<string>("");

  /* CHERCHER L'ENDROIT, PUIS LE FAIRE CONFIRMER.

     Mesuré le 11 septembre 2026 : sur dix endroits de Dakar demandés comme un
     Dakarois les nomme, les dix ont renvoyé quelque chose et TROIS se sont
     trompés en silence — « Hôpital Principal » a renvoyé son parking, « Gare
     de Thiaroye » un poste de santé, « Station Total Ouakam » une agence
     fermée depuis dix ans.

     Le danger n'est donc pas de ne pas trouver : c'est de trouver à côté sans
     le dire. On ne démarre jamais un guidage sans que la personne ait vu et
     approuvé où on l'emmène. */
  const chercherLeLieu = useCallback(async (quoi: string) => {
    setChercheLieu(true);
    setAConfirmer(null);
    setLieuEnPanne(false);
    try {
      const r = await fetch(`/api/lieu?quoi=${encodeURIComponent(quoi)}`,
        { headers: { "x-bia-code": codeRef.current } });
      const d = await r.json() as { candidats?: Lieu[]; panne?: boolean };
      const trouves = (d.candidats || []).slice(0, 3);
      /* ── « JE NE TROUVE PAS CET ENDROIT » SUR UNE PANNE DE RÉSEAU ──────

         Lamine, le 14 septembre 2026 : il demande Ouakam — une commune de
         Dakar, cent mille habitants — et lit « je ne trouve pas cet endroit ».

         Le serveur distinguait DÉJÀ les deux cas : il renvoie `panne: true`
         quand la recherche elle-même a échoué. Cette ligne lisait le champ...
         et n'en faisait rien. Les deux situations tombaient sur la même
         phrase, et cette phrase accuse l'endroit au lieu d'accuser le réseau.

         C'est la sixième fois cette semaine que le serveur sait et que
         l'écran écrase. */
      if (d.panne) setLieuEnPanne(true);
      setAConfirmer(trouves);
    } catch {
      setLieuEnPanne(true);
      setAConfirmer([]);
    } finally {
      setChercheLieu(false);
    }
  }, []);
  /* LES SERVICES, EN RANGÉE. Demande de Lamine, le 10 septembre 2026 : « tous
     les services vont être des boutons sur ces points ; dès que tu appuies,
     c'est seulement cette page qui s'ouvre ». Un seul service ouvert à la
     fois, et la rangée reste en haut pour passer de l'un à l'autre. */
  const [service, setService] = useState<Service>("");
  /* Vrai seulement si le code gardé sur cet appareil est celui de Lamine. Sert
     à ne montrer qu'à lui la page d'écoute des voix, qui dépense à chaque
     appui. La réponse ne dit que oui ou non, et ne coûte rien. */
  const [estMaitre, setEstMaitre] = useState(false);
  /* Le même témoin, lisible depuis les fonctions qui ne se refabriquent pas
     à chaque rendu — l'attente, notamment, qui doit savoir à qui elle parle
     AVANT de demander un prénom. */
  const estMaitreRef = useRef(false);
  /* Les verdicts du code maître : le compte s'affiche sur les boutons, et le
     mot d'accusé de réception s'efface tout seul. */
  /* ── ELLE VIENT DE RÉPONDRE À UNE SALUTATION ────────────────────────────

     Lamine, le 12 septembre 2026 au soir : « quand on dit Salam ou bonjour,
     n'importe quelle forme de salutation, jusqu'à ce qu'elle réponde — et si
     la personne parle à nouveau, dès qu'elle finit de parler, aussitôt elle
     doit dire "d'accord, je vois ça". Peu importe ce que la personne dira. »

     Une salutation part en un dixième de seconde : le son est déjà là. Mais
     la phrase SUIVANTE est la vraie demande, et celle-là coûte dix secondes
     — mesurées sur son serveur. C'est le plus long silence de la
     conversation, et il tombe juste après le moment où elle a paru la plus
     vive. C'est cet écart qui fait « machine ».

     Le drapeau ne vaut QUE pour le tour suivant : on le baisse dès qu'il a
     servi. « Je vois ça » deux fois de suite ne serait plus une attention,
     ce serait un tic. */
  const apresSalutationRef = useRef(false);
  const [compteVerdicts, setCompteVerdicts] = useState({ bien: 0, mal: 0, corriges: 0 });
  /* ── LE CHANTIER DE LA LISTE « MAL DIT » ─────────────────────────────────

     Lamine, le 18 septembre 2026 : « il faut qu'elle puisse avoir accès à la
     liste du bouton mal dit pour qu'on puisse corriger ensemble […] chaque
     mot corrigé doit quitter la liste. »

     OUVERT OU FERMÉ, ET C'EST LE TÉLÉPHONE QUI DÉCIDE. Il faut JOINDRE la
     phrase en cours à la requête, donc trancher avant de partir : une
     reconnaissance faite par le modèle arriverait un tour trop tard, et il
     répondrait « d'accord, allons-y » sans rien avoir sous les yeux.

     « À CORRIGER » VEUT DIRE : marquée mal dite, et pas encore corrigée. Une
     phrase corrigée reste dans la liste — c'est elle qu'on réinjectera dans
     le répertoire — mais elle sort du TRAVAIL. C'est ce qu'il demande : elle
     quitte la liste, sans que la correction soit perdue. */
  const chantierMalDit = useRef(false);
  const aCorriger = useCallback((): Verdict[] =>
    lireVerdicts().filter((v) => v.avis === "mal" && !v.corrige?.trim()), []);
  const [motVerdict, setMotVerdict] = useState("");
  const motVerdictMinuterie = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [aColler, setAColler] = useState("");
  /** Le téléphone sait-il partager ? Sur mobile, oui — et c'est ce qui ouvre WhatsApp. */
  const [partageable, setPartageable] = useState(false);
  const [copie, setCopie] = useState(false);

  const recognitionRef = useRef<Recognition | null>(null);
  const mouthTimer = useRef<ReturnType<typeof setInterval> | null>(null);
  const resetTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  /* Les minuteries de l'atterrissage, pour pouvoir les annuler si une autre
     émotion arrive entre-temps. */
  const atterrissage = useRef<ReturnType<typeof setTimeout>[]>([]);
  /* Les deux planches suivantes sont-elles arrivées ? On les charge une fois
     au démarrage (c'est aussi ce qui les met en cache avant le premier
     geste) ; tant qu'une des deux manque, les cycles restent muets et le
     visage garde ses 24 cases d'origine. Jamais un avatar noir. */
  const planchesPretesRef = useRef(false);
  /* Le geste à faire quand la bouche aura fini : celui que le serveur a
     donné avec une phrase du répertoire (« salut » → la main qui salue),
     ou celui que l'émotion appelle. Et le geste à faire TOUT DE SUITE,
     pendant qu'elle réfléchit : la main sur la bouche quand la personne
     vient de dire un gros mot. */
  const gesteApresRef = useRef<keyof typeof CYCLES | "">("");
  const gesteImmediatRef = useRef<keyof typeof CYCLES | "">("");
  const [portraitCharge, setPortraitCharge] = useState("");
  useEffect(() => {
    let actif = true;
    planchesPretesRef.current = false;
    setPortraitCharge("");
    chargerPortrait(persona, tenue).then(() => {
      if (!actif) return;
      planchesPretesRef.current = true;
      setPortraitCharge(persona + ":" + tenue);
    }).catch(() => { /* Keep the base portrait instead of switching to a missing image. */ });
    return () => { actif = false; };
  }, [persona, tenue]);
  const portraitPret = portraitCharge === persona + ":" + tenue;
  useEffect(() => {
    if (persona !== "rara" || !portraitPret) { setIntroRara(null); return; }
    const DUREE_PAR_IMAGE = 550;
    const TOTAL = 4;
    let i = 0;
    setIntroRara(0);
    const minuteries: number[] = [];
    for (let k = 1; k <= TOTAL; k++) {
      minuteries.push(window.setTimeout(() => {
        setIntroRara(k < TOTAL ? k : null);
      }, DUREE_PAR_IMAGE * k));
    }
    return () => { minuteries.forEach(id => window.clearTimeout(id)); };
  }, [persona, portraitPret]);
  const busyRef = useRef(false);
  const historyRef = useRef<Message[]>([]);
  /* ── LA QUESTION EN VOL, POUR NE PAS LA PERDRE S'IL LA CONTINUE ─────────

     Lamine, le 18 septembre 2026 : « quand je parle, parfois elle me coupe
     sans que je termine. » Le micro se ferme sur une respiration, la
     demi-phrase part à la transcription, et pendant les cinq secondes où
     elle réfléchit, RIEN n'écoute : la fin de sa phrase tombe dans le vide,
     et elle répond à la moitié.

     Le guetteur écoute maintenant aussi pendant qu'elle réfléchit. S'il
     reprend, on tue le tour — et on garde ici ce qu'il avait déjà dit, pour
     le recoller devant la suite. Voir le guetteur, plus bas. Vide quand
     aucun tour vocal n'est en vol. */
  const questionEnVolRef = useRef<string>("");
  /* ── LA PORTE : ELLE NE PARLE JAMAIS PAR-DESSUS LUI ─────────────────────

     Lamine, le 19 septembre : « même si la réponse est arrivée, elle doit
     la stocker en attendant que je termine. » Quand le guetteur l'entend
     parler pendant qu'elle réfléchit, il ferme cette porte. speak() attend
     devant, voix déjà fabriquée. Quand il se tait, le guetteur décide —
     continuation ou nouvelle phrase, voir lib/sa-propre-voix.ts — puis
     ouvre. Nulle quand personne ne parle. RÈGLE 4 : la valeur de départ est
     « pas de porte », donc elle parle, comme avant. */
  const porteRef = useRef<{ attendre: Promise<void>; ouvrir: () => void; depuis: number } | null>(null);
  const filRef = useRef<HTMLDivElement | null>(null);
  const champRef = useRef<HTMLInputElement | null>(null);
  const photoRef = useRef<HTMLInputElement | null>(null);
  const codeRef = useRef<string>("");
  const contexteRef = useRef<AudioContext | null>(null);
  const sourceRef = useRef<AudioBufferSourceNode | null>(null);
  /* Le renvoi sert à couper le souffle d'attente depuis couperSon(), qui est
     déclarée plus haut que lui. Un seul endroit coupe le son ; il doit
     pouvoir couper celui-ci aussi. */
  const taireLeSoufflRef = useRef<(() => void) | null>(null);
  /** Les morceaux d'une même réponse, programmés bout à bout. */
  const sourcesRef = useRef<Set<AudioBufferSourceNode>>(new Set());
  const animationRef = useRef<number | null>(null);
  const enregistreurRef = useRef<MediaRecorder | null>(null);
  /* De quoi débrancher l'analyseur du micro sans toucher au contexte de la
     page — qui porte toute sa voix et ne doit jamais être fermé ici. */
  const debrancherMicroRef = useRef<(() => void) | null>(null);
  /* Le contexte audio de l'ANALYSEUR seul — fermé avec le micro. Voir la
     section 6 de lib/micro.ts : c'est lui, la pastille orange. */
  const ctxMicroRef = useRef<AudioContext | null>(null);
  /* `adresseDuSon` est défini plus bas, avec les autres fonctions du son ; la
     salutation d'ouverture, elle, est posée bien avant. Un ref, comme pour
     `taire` et les veilles. */
  const adresseDuSonRef = useRef<((cle: string, langue: "wo" | "fr") => string) | null>(null);

  /* ── LE MICRO RESTE OUVERT ENTRE DEUX TOURS ────────────────────────────

     Avant, chaque tour rouvrait le micro : `getUserMedia` à chaque phrase.
     Cet appel-là coûte de un à trois dixièmes de seconde, et sur certains
     téléphones il refait clignoter la pastille rouge à chaque fois — comme
     si BIA redemandait la permission.

     Le flux et son analyseur vivent donc le temps de la CONVERSATION, pas
     le temps d'une phrase. C'est aussi ce qui permet de l'entendre pendant
     qu'elle parle : sans flux ouvert à ce moment-là, on ne pourrait pas lui
     couper la parole. */
  const fluxRef = useRef<MediaStream | null>(null);
  const analyseRef = useRef<AnalyserNode | null>(null);
  /* Second analyseur, dédié à la hauteur de voix (voir hauteurDeVoix dans
     lib/micro.ts). Celui du dessus a un fftSize de 512, donc un tampon
     temporel de 256 échantillons -- trop court pour capter une période
     complète d'une voix grave (il en faudrait ~686 à 48kHz pour descendre
     à 70Hz). Plutôt que d'agrandir l'analyseur existant, très finement
     réglé et chargé d'histoire (échos, contextes suspendus...), on en
     crée un second, branché sur la même source, réservé à cet usage. */
  const analysePeriodiqueRef = useRef<AnalyserNode | null>(null);
  /* Vrai tant que la conversation vocale est ouverte. C'est un ref ET un état :
     l'état pour l'affichage, le ref pour onstop et les veilles, qui ont été
     posés avant et ne verraient jamais un état changé depuis. */
  const conversationRef = useRef(false);
  /* L'énergie de SA voix à cet instant, entre 0 et 1 — celle qui fait bouger
     sa bouche. On s'en sert pour savoir s'il faut la couper : il faut la
     COUVRIR, pas seulement faire du bruit pendant qu'elle parle. */
  const sonDelleRef = useRef(0);
  /* Vrai tant qu'un morceau de sa réponse joue VRAIMENT à cet instant ; faux
     pendant un blanc entre deux morceaux (le suivant pas encore arrivé). Le
     guetteur s'en sert : voir plus bas, section « LE GUETTEUR NE JUGE PAS UN
     BLANC ». */
  const segmentEnCoursRef = useRef(false);
  /* Le seuil de parole calculé pour la pièce où l'on se trouve. Partagé avec
     le guetteur qui écoute pendant qu'elle parle : les deux doivent juger la
     même pièce, sinon l'un entend ce que l'autre ignore. */
  const seuilRef = useRef(0);
  /* `taire` est défini plus bas ; les veilles, elles, sont posées avant. Ce
     renvoi évite de réordonner tout le fichier pour une seule flèche — même
     procédé que `ecouterRef`. */
  const taireRef = useRef<(() => void) | null>(null);
  const askBiaRef = useRef<((question: string, parole?: boolean, tourDonne?: number) => Promise<void>) | null>(null);
  /* CE QU'IL A DIT EN LA COUPANT, en attendant la suite de sa phrase. Le
     guetteur le dépose ici ; la transcription suivante le recolle devant ce
     qu'elle rapporte. Voir recoller() dans lib/sa-propre-voix.ts. */
  const motsRattrapesRef = useRef<Prononce | null>(null);
  /* ── COMBIEN DE FOIS ELLE L'A COUPÉ TROP TÔT, DANS CETTE CONVERSATION ────
     Lamine, le 21 septembre 2026 : « quand je parle, elle me coupe très
     souvent. » Chaque phrase recollée (voir finDeSaParole) en ajoute une, et
     le silence qui ferme le micro s'allonge d'autant pour lui — voir
     silenceQuiSuffit() dans lib/micro.ts. Remis à zéro à chaque ouverture de
     la conversation : une autre personne, un autre rythme. */
  const coupesTropTotRef = useRef(0);
  const [repriseDuTour, setRepriseDuTour] = useState(0);
  /* ── LA CLÉ DU DERNIER EXTRAIT DE SA VOIX ──────────────────────────────
     Le serveur garde son audio et rend une clé. Quand il appuie sur le bouton
     bleu, on la renvoie : c'est ce qui transforme un son gardé en donnée
     d'entraînement, parce que le bouton bleu est le seul instant où on sait
     qu'un texte est JUSTE. Voir lib/corpus.ts. */
  const extraitRef = useRef<string>("");
  /* ── ANNULER PENDANT QU'ON PARLE ────────────────────────────────────────
     Demandé par Lamine le 10 septembre 2026 : « pendant qu'il parle, il peut
     se tromper. Pour que ça ne soit pas transmis à BIA et qu'on ne perde pas
     de temps, qu'il appuie sur annuler. »

     Le drapeau est un ref et pas un état : il est lu dans onstop, qui a été
     posé il y a longtemps et ne verrait jamais un état changé depuis. */
  const annuleRef = useRef(false);
  const [annule, setAnnule] = useState(false);
  const moteursRef = useRef<{ voix: string; ecoute: string } | null>(null);
  const jouerSouffleRef = useRef<((emotion: string, sansPrelude?: boolean) => Promise<void>) | null>(null);
  const tourRef = useRef<object | null>(null);

  /* ── UN TOUR ANCIEN N'ÉCRIT JAMAIS L'ÉTAT D'UN TOUR RÉCENT ──────────────

     La règle vient de la relecture du 12 septembre au soir, et elle est la
     bonne. Le motif existait déjà dans BIA — `tourRef` pour la lecture de la
     voix, `attenteRef` pour la phrase d'attente : chacun porte un jeton, et
     ce qui revient d'un jeton périmé se jette. Mais ces deux jetons ne
     couvraient qu'un SOUS-SYSTÈME chacun. Le TOUR, lui, n'en avait pas.

     Or c'est exactement là qu'était le blocage du troisième tour : la capture
     du prénom écrivait l'état d'un tour qui ne lui appartenait plus. Une
     course réparée à la main est réparée une fois ; une règle posée les
     empêche toutes.

     Un numéro suffit — et il est plus sûr qu'un objet, parce qu'il se lit
     dans un journal. Six choses vivent en parallèle ici (le micro, la
     transcription, le modèle, la voix, le prénom, l'interruption) : chacune
     porte désormais le numéro du tour où elle est née, et ne parle que si ce
     tour est encore le tour en cours. */
  const numeroDuTourRef = useRef(0);
  const fluxVoixRef = useRef(new Set<AbortController>());
  const ouvrirUnTour = useCallback(() => {
    for (const flux of fluxVoixRef.current) flux.abort();
    fluxVoixRef.current.clear();
    return ++numeroDuTourRef.current;
  }, []);
  const estLeTour = useCallback((n: number) => numeroDuTourRef.current === n, []);

  /* ── DEUX IDENTITÉS, PARCE QU'IL Y A DEUX CHOSES ────────────────────────

     La relecture du 12 septembre au soir a trouvé ce que le numéro de tour ne
     couvrait pas, et son raisonnement est juste :

         ENREGISTREMENT → transcription → TOUR → réponse → voix

     La capture du PRÉNOM est un enregistrement sans tour : elle passe par le
     micro et la transcription, puis s'arrête là. Elle ne pouvait donc porter
     aucun numéro de tour — et c'est exactement le chemin qui bloquait le
     micro. Un seul numéro ne pouvait pas les couvrir tous les deux.

       — le numéro d'ENREGISTREMENT protège : le MediaRecorder, son onstop, la
         transcription, la capture du prénom, et les erreurs de réseau ;
       — le numéro de TOUR protège : le modèle, la réponse, la voix,
         l'attente parlée, l'interruption.

     Les deux tournent ensemble quand on coupe la parole ou qu'on ferme la
     conversation : tout ce qui était en vol meurt d'un coup. */
  const numeroEnregistrementRef = useRef(0);
  const nouvelEnregistrement = useCallback(() => ++numeroEnregistrementRef.current, []);
  const estCetEnregistrement = useCallback(
    (n: number) => numeroEnregistrementRef.current === n, []);
  const resumeRef = useRef("");
  const resumeEnCours = useRef(false);
  const emotionRef = useRef("neutre");
  /* L attente parlee. Le jeton dit si la phrase en cours a encore lieu
     d etre : des que la reponse arrive, il change, et tout ce qui etait
     en route se tait. */
  const attenteRef = useRef<object | null>(null);
  /* Le relais entre l'attente et la réponse.

     Avant, la réponse coupait l'attente à la seconde où son TEXTE arrivait —
     alors que sa VOIX, elle, met encore quatre à huit secondes à se
     fabriquer. BIA s'arrêtait donc net, le texte restait affiché, et le
     silence revenait exactement là où on voulait l'éviter.

     Maintenant l'attente garde la parole jusqu'à ce que le son de la réponse
     soit en main. `stopAttente` dit « arrête-toi APRÈS ta phrase » — jamais
     au milieu d'un mot — et `phraseEnCours` est cette phrase, qu'on attend
     avant d'enchaîner. */
  const stopAttenteRef = useRef(false);
  /* La présentation n'est dite QU'UNE FOIS par conversation, au tout premier
     échange. Après, plus un mot d'attente : le silence et la lueur. */
  const presentationFaiteRef = useRef(false);
  /** Le son d'attente en cours, avec son réglage de volume pour le couper net. */
  const attenteSonRef = useRef<{ source: AudioBufferSourceNode; volume: GainNode } | null>(null);
  /** Le prénom de la personne, gardé sur l'appareil. */
  const nomRef = useRef("");
  /** La langue de l'échange en cours : le chapeau doit être dit dedans. */
  const langueRef = useRef<Langue>("wo");
  /** Vrai entre la question « comment tu t'appelles ? » et la réponse. */
  const attendLeNomRef = useRef(false);
  /** Le prénom qu'elle vient d'apprendre : elle le dira dans sa réponse. */
  const nouveauNomRef = useRef("");
  /** Pour rouvrir le micro depuis l'attente sans dépendre de l'ordre du fichier. */
  const ecouterRef = useRef<(() => Promise<void>) | null>(null);
  /* LE CHRONOMÈTRE. Idée de Lamine : plutôt que de meubler à l'aveugle, BIA
     mesure combien de temps elle fait attendre, et sert la phrase dont la
     durée remplit ce temps-là. Quatre repères suffisent — le départ, la fin
     de la transcription, la fin du modèle, et l'arrivée du son. */
  const mesuresRef = useRef<Mesure[]>([]);
  /* ── LES CINQ BORNES D'UN TOUR DE VOIX ────────────────────────────────

     Lamine, le 15 septembre 2026 : « on veut mesurer précisément où est-ce
     qu'on perd du temps […] sans changer le comportement pour l'instant ».

     Les trois mesures d'en dessous (departAttente / tTranscrit / tModele)
     commencent au micro coupé et s'arrêtent quand le son est EN MAIN. Les
     deux bouts qu'il RESSENT n'y sont pas : la queue de silence avant que le
     micro se ferme, et le démarrage réel du haut-parleur. Celle-ci les
     ajoute. Elle ne fait que poser des dates — voir lib/tour.ts. */
  const bornesRef = useRef<Bornes>(tourVide());
  const departAttenteRef = useRef(0);
  const tTranscritRef = useRef(0);
  const tModeleRef = useRef(0);
  const voieRef = useRef<Voie>("ecrit");
  const attenteCache = useRef<Map<string, ArrayBuffer[]>>(new Map());
  const toursRef = useRef(0);
  const cacheSons = useRef<Map<string, ArrayBuffer>>(new Map());
  const dernierSon = useRef<string | null>(null);
  /* Le dernier souffle d'attente joué : c'est ce qui empêche le même « mmm »
     de revenir deux fois de suite. Sur le son qu'elle fera le plus souvent de
     toute sa vie, c'est ce détail qui sépare une personne d'une machine. */
  const dernierSouffle = useRef<string | null>(null);
  const transcritRef = useRef(false);
  /* Le motif de la dernière panne d'écoute, s'il y en a eu une. Il change ce
     que BIA DIT : « je n'ai pas entendu » n'est pas « mon oreille est en
     panne », et confondre les deux fait crier devant un micro muet. */
  const noteEcouteRef = useRef("");
  const dernierDitRef = useRef("");

  const emetteurRef = useRef<Emetteur>(EMETTEUR_VIDE);
  const profilRef = useRef("");

  historyRef.current = history;
  papierPretRef.current = papierPret;
  resumeRef.current = resume;
  codeRef.current = code || "";
  emetteurRef.current = emetteur;
  profilRef.current = profil;

  /* Ce que BIA a mesuré les fois précédentes : combien de temps elle fait
     attendre, et combien de temps durent ses phrases. Sur l'appareil, jamais
     au serveur — ces chiffres dépendent du téléphone et du réseau. */
  useEffect(() => {
    setPartageable(typeof navigator !== "undefined" && typeof navigator.share === "function");
  }, []);

  /* LE CLAVIER DU TÉLÉPHONE CACHAIT LE BOUTON DE FERMETURE.

     Défaut signalé par Lamine le 10 septembre 2026 : « la fenêtre du clavier,
     si tu l'ouvres, il n'y a pas de bouton fermer et ça ne se ferme pas, il
     faut actualiser la page ».

     Sur iPhone, le clavier ne rétrécit pas la page : il se pose PAR-DESSUS.
     Un panneau collé en bas de l'écran passe donc dessous, et sa croix se
     retrouve hors de vue — on appuie dans le vide. Le seul moyen de le savoir
     est de mesurer la fenêtre VISIBLE, que le navigateur expose à part. On en
     fait une variable de style, et les trois panneaux se posent dessus. */
  useEffect(() => {
    const vue = window.visualViewport;
    if (!vue) return;
    const poser = () => {
      const bas = Math.max(0, window.innerHeight - (vue.height + vue.offsetTop));
      /* Une mesure de quelques pixels n'est pas un clavier : c'est la barre du
         navigateur qui bouge, ou un arrondi. La prendre pour un clavier
         remonterait les panneaux sans raison — et un panneau remonté ne sort
         plus de l'écran quand on le referme. */
      document.documentElement.style.setProperty("--bas-clavier", `${bas > 40 ? Math.round(bas) : 0}px`);
    };
    poser();
    vue.addEventListener("resize", poser);
    vue.addEventListener("scroll", poser);
    return () => {
      vue.removeEventListener("resize", poser);
      vue.removeEventListener("scroll", poser);
    };
  }, []);

  /* Échap referme, et sur un téléphone c'est le voile qui joue ce rôle : on
     touche à côté, ça se referme. Deux façons de sortir valent mieux qu'une —
     personne ne devrait avoir à recharger la page pour fermer une fenêtre. */
  useEffect(() => {
    const auClavier = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return;
      if (corrige !== null) { setCorrige(null); setCorrection(""); setPropositions([]); return; }
      if (quiParle) { setQuiParle(false); return; }
      if (papierOuvert) { setPapierOuvert(false); return; }
      if (clavier) setClavier(false);
    };
    window.addEventListener("keydown", auClavier);
    return () => window.removeEventListener("keydown", auClavier);
  }, [corrige, papierOuvert, quiParle, clavier]);

  useEffect(() => {
    mesuresRef.current = lireMesures();
  }, []);

  // Le code est gardé sur l'appareil : le testeur ne le retape pas à chaque fois.
  useEffect(() => {
    try {
      const g = localStorage.getItem("bia-code"); if (g) setCode(g);
      /* Les verdicts déjà posés sur cet appareil : le compte doit être juste
         dès l'ouverture, sinon le premier appui paraît remettre à zéro. */
      setCompteVerdicts(compterVerdicts(lireVerdicts()));
      /* Qui est sur cet appareil, et qui parlait la dernière fois. Sur un
         téléphone qui servait déjà, tout ce qui s'y trouve devient la case du
         premier utilisateur : on ne perd les notes de personne. */
      const { profils: liste, actif } = chargerProfils();
      setProfils(liste);
      setProfil(actif);
      profilRef.current = actif;
      nomRef.current = liste.find((x) => x.id === actif)?.nom || "";
      // BIA retrouve la conversation là où on l'a laissée, même après avoir
      // fermé l'onglet. Tout reste sur l'appareil : rien n'est envoyé ailleurs.
      const fil = localStorage.getItem(cleFil(actif));
      if (fil) setHistory(JSON.parse(fil) as Message[]);
      const notes = localStorage.getItem(cleResume(actif));
      if (notes) { setResume(notes); resumeRef.current = notes; }
      // Ses papiers l'attendent, écrits la semaine dernière ou il y a une heure.
      setPapiers(chargerPapiers(actif));
      // Ses renseignements : donnés une fois, ils restent sur l'appareil.
      const sien = localStorage.getItem(cleEmetteur(actif));
      if (sien) setEmetteur({ ...EMETTEUR_VIDE, ...(JSON.parse(sien) as Partial<Emetteur>) });
    } catch {}
    fetch("/api/etat")
      .then((r) => r.json())
      .then((e) => {
        setMoteurs(e); moteursRef.current = e; versionChargee.current = String(e?.version || "");
        if (e?.tenue) setTenue(String(e.tenue));
        /* Notre moteur parle déjà posément : le curseur « Débit » se lit
           relativement à lui (voir lib/ralentir.ts). */
        voixDejaPosee(e?.voix === "runpod");
      })
      .catch(() => {});
  }, []);

  /* ── L'ÉCRAN QUI NE S'ÉTEINT PLUS PENDANT QU'ELLE EST LÀ ─────────────────

     Lamine, le 14 septembre 2026 : « il faut faire de sorte que quand elle
     est affichée, l'écran du téléphone reste éveillé. »

     Un téléphone s'éteint au bout de trente secondes. Or on ne touche pas
     BIA : on lui PARLE. Elle réfléchit quatre secondes, elle répond huit —
     pendant tout ce temps, rien ne bouge sous le doigt, et l'écran se
     verrouille au milieu de sa phrase. Et sur la carte, c'est pire : on
     conduit, on ne touche à rien, et l'écran meurt juste avant le virage.

     LE VERROU NE TIENT QUE TANT QUE LA PAGE EST VISIBLE — c'est le navigateur
     qui l'exige, et c'est une bonne règle : dès qu'on passe à autre chose, le
     téléphone reprend sa vie normale. Il faut donc le REDEMANDER à chaque
     retour, sinon il ne revient jamais après le premier changement
     d'application.

     ON NE LE DEMANDE PAS SI LE NAVIGATEUR NE SAIT PAS FAIRE. Safari le sait
     depuis iOS 16.4 ; ailleurs, on ne fait rien et rien ne casse.

     ET ÇA COÛTE DE LA BATTERIE, il faut le dire : un écran allumé en
     permanence est ce qui vide un téléphone le plus vite. C'est son choix, et
     il le sait — mais le verrou tombe dès qu'on quitte BIA, donc ça ne dure
     que le temps qu'on est avec elle. */
  /* 20 septembre : il redemande la même chose, donc ça ne tenait pas chez
     lui — et rien ne le comptait. Maintenant chaque issue est mesurée
     (/api/etat → veille), et un secours prend le relais quand l'API manque
     ou refuse. Voir lib/veille.ts. */
  useEffect(() => {
    type Verrou = { release: () => Promise<void>; released?: boolean; addEventListener?: (t: string, f: () => void) => void };
    const api = (navigator as unknown as {
      wakeLock?: { request: (t: string) => Promise<Verrou> };
    }).wakeLock;
    let verrou: Verrou | null = null;
    let vivant = true;
    let arreterLeSecours: (() => void) | null = null;
    let secoursVoulu = !api;
    if (!api) noterVeille("api_absente");
    noterVeille("appareil", decrireLAppareil());

    /* ── 21 SEPTEMBRE : « ÇA NE MARCHE TOUJOURS PAS » ───────────────────
       Deux trous dans la version du 20. Le secours ne partait QUE sur un
       toucher postérieur au refus : si le refus arrivait après le premier
       toucher (il est asynchrone), il attendait un second toucher qui, dans
       une conversation à la voix, ne vient jamais — refus 3, secours 2.
       Et une fois parti, il n'était plus surveillé : une pause imposée par
       le téléphone (micro qui s'ouvre, autre son) l'éteignait pour de bon.
       Voir lancerLeSecours() dans lib/veille.ts pour la seconde moitié. */
    const ceQueFaitBia = () => `${modeRef.current}${document.visibilityState !== "visible" ? " cachée" : ""}`;
    const lancerSiPossible = () => {
      if (!vivant || !secoursVoulu || arreterLeSecours) return;
      /* Un geste a déjà eu lieu sur la page (activation collante) : la vidéo
         peut partir tout de suite, sans attendre le toucher suivant. */
      const dejaTouche = (navigator as unknown as { userActivation?: { hasBeenActive?: boolean } }).userActivation?.hasBeenActive;
      if (!dejaTouche) return;
      arreterLeSecours = lancerLeSecours(ceQueFaitBia);
    };
    const auGeste = () => {
      if (!vivant) return;
      if (secoursVoulu && !arreterLeSecours) arreterLeSecours = lancerLeSecours(ceQueFaitBia);
      /* Et on redemande le verrou officiel sur le geste : certains
         navigateurs ne l'accordent qu'avec une activation récente. S'il
         passe, le secours s'arrête. */
      if (api && secoursVoulu) void tenir();
    };
    window.addEventListener("pointerdown", auGeste, { passive: true });

    const tenir = async () => {
      if (!vivant || !api || document.visibilityState !== "visible") return;
      if (verrou && !verrou.released) return;
      try {
        verrou = await api.request("screen");
        noterVeille("tenu");
        secoursVoulu = false;
        if (arreterLeSecours) { arreterLeSecours(); arreterLeSecours = null; }
        /* Le téléphone peut le relâcher de lui-même (batterie faible, écran
           couvert). On le saura, et on redemandera au retour. */
        verrou.addEventListener?.("release", () => {
          if (!vivant) return;
          noterVeille("relache");
          /* Relâché sans qu'on quitte la page : on ne reste pas sans rien. */
          if (document.visibilityState === "visible") { secoursVoulu = true; lancerSiPossible(); }
        });
      } catch (e) {
        /* Refusé : NotAllowedError le plus souvent (mode économie d'énergie,
           page cachée). On le dit, et le secours prend le relais — tout de
           suite si un geste a déjà eu lieu, sinon au prochain toucher. */
        noterVeille("refuse", String((e as Error)?.name || e));
        secoursVoulu = true;
        lancerSiPossible();
      }
    };
    const auRetour = () => { if (document.visibilityState === "visible") void tenir(); };

    void tenir();
    document.addEventListener("visibilitychange", auRetour);
    return () => {
      vivant = false;
      document.removeEventListener("visibilitychange", auRetour);
      window.removeEventListener("pointerdown", auGeste);
      void verrou?.release().catch(() => { });
      arreterLeSecours?.();
    };
  }, []);

  /* ── LA MISE À JOUR D'ELLE-MÊME ──────────────────────────────────────────

     Lamine, le 14 septembre 2026 : « il faut forcer les mises à jour ; dès
     qu'il y a une nouvelle mise à jour, ça doit être automatique chez elle. »

     Le service worker ne garde PAS l'application, donc une réouverture suffit
     normalement. Mais BIA s'installe sur l'écran d'accueil et reste ouverte
     des heures : le téléphone garde alors le code chargé le matin, et ne
     verra jamais ce qu'on a déployé à midi. C'est exactement ce qui vient de
     lui arriver — il a essayé des instructions qui n'étaient pas chez lui.

     ON REGARDE QUAND IL REVIENT À L'APPLICATION, pas en boucle : un appel
     toutes les trente secondes brûlerait sa batterie et son forfait pour
     attendre un déploiement qui arrive deux fois par jour.

     ET ON NE RECHARGE JAMAIS AU MILIEU DE QUELQUE CHOSE. Recharger pendant
     qu'elle parle, qu'elle écoute, qu'une carte guide ou qu'un papier est
     ouvert, ce serait couper la parole à quelqu'un pour lui annoncer une
     bonne nouvelle. On attend le calme — et le calme revient toujours. */
  useEffect(() => {
    const regarder = async () => {
      if (document.visibilityState !== "visible") return;
      if (!versionChargee.current) return;
      try {
        const e = await (await fetch("/api/etat", { cache: "no-store" })).json();
        const enLigne = String(e?.version || "");
        if (!enLigne || enLigne === versionChargee.current) return;
        /* Une version neuve est en ligne. On attend qu'elle ne fasse rien. */
        const calme = () => !occupeeRef.current
          && !conversationRef.current && !carteOuverteRef.current
          && !filmOuvertRef.current && !papierOuvertRef.current;
        if (calme()) { location.reload(); return; }
        const montre = setInterval(() => {
          if (calme()) { clearInterval(montre); location.reload(); }
        }, 4000);
        /* Deux minutes, puis on laisse tomber : elle revérifiera au prochain
           retour. Mieux vaut une version en retard qu'une horloge qui tourne
           en attendant un silence qui ne vient pas. */
        setTimeout(() => clearInterval(montre), 120000);
      } catch { /* pas de réseau : on réessaiera au prochain retour */ }
    };
    document.addEventListener("visibilitychange", regarder);
    /* Et une fois au démarrage, après un instant : si la page dort depuis
       hier dans un onglet, le premier retour n'aura pas lieu. */
    const premier = setTimeout(() => void regarder(), 20000);
    return () => {
      document.removeEventListener("visibilitychange", regarder);
      clearTimeout(premier);
    };
  }, []);

  /* Quand elle a fini de parler, son visage garde l'émotion de ce qu'elle
     vient de dire, puis revient au repos. Certaines émotions s'animent au
     lieu de rester figées — un rire, ça bouge. */
  const stopMouth = useCallback((_answer = "") => {
    if (mouthTimer.current) clearInterval(mouthTimer.current);
    mouthTimer.current = null;
    setMode("ready");
    if (resetTimer.current) clearTimeout(resetTimer.current);

    const emo = emotionRef.current || "neutre";
    const suite = SUITES[emo];
    /* ── ELLE REDESCEND, ELLE NE RETOMBE PAS ────────────────────────────
       Après l'émotion, on ne saute plus au repos : on y descend par la
       douceur puis les yeux mi-clos, comme un visage qui se calme. Deux
       images qui existaient déjà ; il manquait le chemin entre les deux. */
    const atterrir = (apres: number) => {
      atterrissage.current.forEach(clearTimeout);
      atterrissage.current = ATTERRISSAGE.reduce<ReturnType<typeof setTimeout>[]>((liste, [f, d], i) => {
        const depart = apres + ATTERRISSAGE.slice(0, i).reduce((n, [, dd]) => n + dd, 0);
        liste.push(setTimeout(() => setFace(f), depart));
        return liste;
      }, []);
    };
    /* Le chemin en quatre images d'une planche suivante, quand elle est là :
       posé à la place de l'atterrissage, puis l'atterrissage derrière. */
    const descendrePar = (noms: readonly Face[], apres: number) => {
      atterrissage.current.forEach(clearTimeout);
      atterrissage.current = noms.map((f, i) => setTimeout(() => setFace(f), apres + i * PAS_DU_CYCLE));
      let quand = apres + noms.length * PAS_DU_CYCLE;
      for (const [f, d] of ATTERRISSAGE) { /* même arc que atterrir, à la suite */
        atterrissage.current.push(setTimeout(() => setFace(f), quand));
        quand += d;
      }
    };
    /* Petit rire → redescente douce (rire_apaise). Grand rire (fourire) →
       le nouveau geste rire_main, via CYCLE_DE_L_EMOTION ci-dessus : elle
       reste joviale au lieu de simplement se calmer. */
    const apaise = planchesPretesRef.current && emo === "rire";
    /* Le geste d'après la phrase : celui du serveur d'abord, sinon celui
       que l'émotion appelle sur la planche du visage. Rien sans planches. */
    const gesteBrut = planchesPretesRef.current ? (gesteApresRef.current || CYCLE_DE_L_EMOTION[emo] || "") : "";
    /* Prière et compter n'existent que dans la tenue "nouvelle" de BIA et
       chez Rara (voir CASES_DE_LA_QUATRIEME_PLANCHE) : sur classique/wax,
       --planche-mains3 n'existe pas. Demandés ailleurs, on les ignore
       plutôt que d'afficher une case vide. */
    const aLaQuatriemePlanche = tenue === "nouvelle" || persona === "rara";
    const geste = (gesteBrut === "priere" || gesteBrut === "compter") && !aLaQuatriemePlanche ? "" : gesteBrut;
    gesteApresRef.current = "";
    if (suite) {
      let t = 0;
      for (const [f, d] of suite) { setTimeout(() => setFace(f), t); t += d; }
      if (apaise) descendrePar(CYCLES.rire_apaise.slice(1), t + 600);
      else if (geste) descendrePar(CYCLES[geste], t + 400);
      else atterrir(t + 1400);
    } else if (geste) {
      setFace(EMOTION_VERS_FACE[emo] || "yeux_ouverts");
      descendrePar(CYCLES[geste], 500);
    } else {
      setFace(EMOTION_VERS_FACE[emo] || "yeux_ouverts");
      atterrir(3800);
    }
  }, []);

  /* Bouche à l'aveugle : une forme toutes les 110 ms, sans rapport avec le
     son. Gardée uniquement pour la voix du navigateur, qui ne donne accès à
     aucun signal audio — impossible de la synchroniser. */
  const bouche = useCallback((actif: boolean, answer = "") => {
    if (actif) {
      setMode("speaking");
      const shapes: Face[] = ["bouche_a", "bouche_fermee", "bouche_o", "bouche_A", "bouche_entr"];
      let index = 0;
      if (mouthTimer.current) clearInterval(mouthTimer.current);
      mouthTimer.current = setInterval(() => setFace(shapes[index++ % shapes.length]), 110);
    } else {
      stopMouth(answer);
    }
  }, [stopMouth]);

  /* ── LE CONTEXTE AUDIO : UN SEUL, ET JAMAIS MORT ──────────────────────────

     TOUT ce qui s'entend dans BIA passe par ici — sa voix, les phrases
     d'attente, les rires, le bruit de frappe. C'est donc le point où un seul
     défaut rend l'application entièrement muette pendant que le texte, lui,
     continue de s'afficher : exactement ce que Lamine a vu le 10 septembre
     2026.

     UN CONTEXTE FERMÉ NE SE ROUVRE PAS. Il était fabriqué une fois puis gardé
     tel quel ; s'il finissait « closed » — la page démontée et remontée, un
     autre bout de code qui le ferme, iOS qui coupe la session audio — on
     continuait de le réutiliser, et plus rien ne sortait jamais. On le
     refabrique donc dès qu'il est mort. */
  const contexte = useCallback(() => {
    const mort = !contexteRef.current || contexteRef.current.state === "closed";
    if (mort) {
      const C = window.AudioContext || (window as any).webkitAudioContext;
      contexteRef.current = new C();
    }
    // Suspendu : iOS le fait dès qu'on repose le téléphone. On le réveille.
    if (contexteRef.current!.state === "suspended") void contexteRef.current!.resume();
    return contexteRef.current!;
  }, []);

  /* ── LE HAUT-PARLEUR NE REVIENT PAS TOUT SEUL APRÈS UN ENREGISTREMENT ────

     Lamine, le 18 septembre 2026 : « quand elle rit pour la première fois le
     son arrive, mais si elle continue le son ne suit pas — le deuxième rire,
     y a pas de son. »

     C'est le haut-parleur, pas le rire. Entre les deux rires, le micro s'est
     ouvert et refermé. Sur iPhone, un enregistrement met la session audio du
     téléphone en mode « enregistrement » et laisse le contexte de lecture
     SUSPENDU — ou, sur Safari, dans un état « interrupted » que la norme ne
     connaît même pas. Un son démarré là-dedans NE SORT PAS. Et il ne se
     plaint pas : `onended` n'arrive jamais, le filet de secours rend la main
     au bout de la durée du fichier, et tout continue comme si elle avait ri.
     Le visage rit, la gorge est muette. C'est exactement ce qu'il a vu.

     ON RÉVEILLAIT BIEN LE CONTEXTE — MAIS SANS ATTENDRE. `resume()` rend une
     promesse ; on la jetait (`void`) et on démarrait le son dans la foulée.
     Le premier rire s'en sortait parce que son fichier venait du réseau, et
     ces deux cents millisecondes suffisaient au réveil. Le second partait du
     cache, tout de suite, et arrivait avant que le haut-parleur soit rendu.

     UN SON QUI VIENT DE LA MÉMOIRE EST DONC PLUS FRAGILE QU'UN SON QUI VIENT
     DU RÉSEAU. C'est le contraire de ce qu'on croit en accélérant les choses,
     et ça vaut pour tout ce qu'on mettra en cache ensuite — les sons du
     répertoire, et les fichiers embarqués dans l'application native.

     On attend donc le réveil. Trois essais courts : le premier suffit presque
     toujours, les deux autres sont pour l'iPhone qui rend le haut-parleur
     avec un temps de retard. Au pire on a perdu 120 ms ; au mieux, elle rit
     pour de vrai. */
  const reveillerLeSon = useCallback(async () => {
    const ctx = contexte();
    /* La règle elle-même est dans lib/reveil-du-son.ts, avec son histoire et
       ses épreuves. Ici on ne fait que l'appliquer. */
    await reveiller(ctx);
    return ctx;
  }, [contexte]);

  const couperSon = useCallback(() => {
    /* Le souffle d'attente tombe avec le reste : s'il survivait à sa réponse,
       elle ferait « mmm » par-dessus sa propre phrase. */
    taireLeSoufflRef.current?.();
    /* Elle ne parle plus : son énergie retombe, sinon la barre à franchir
       pour l'interrompre resterait haute alors qu'elle s'est tue. */
    sonDelleRef.current = 0;
    if (animationRef.current) cancelAnimationFrame(animationRef.current);
    animationRef.current = null;
    try { sourceRef.current?.stop(); } catch {}
    sourceRef.current = null;
    /* Une réponse longue a plusieurs morceaux PROGRAMMÉS à l'avance sur
       l'horloge du son. Les couper un par un ne suffit pas : ceux qui n'ont
       pas encore commencé démarreraient tout seuls après. */
    for (const s of sourcesRef.current) { try { s.stop(); } catch {} }
    sourcesRef.current.clear();
  }, []);

  /* L'enveloppe du son : l'énergie moyenne par tranche de 45 ms. C'est elle
     qui dira à la bouche quand s'ouvrir, au lieu d'une minuterie aveugle. */
  /* Sept formes au lieu de trois. L'énergie du son donne l'ouverture ; on
     alterne ensuite entre les formes de même ouverture pour que la bouche ne
     répète pas indéfiniment la même image sur une voyelle tenue. */
  const formeBouche = (part: number, i: number): Face => {
    if (part < 0.05) return "bouche_fermee";
    if (part < 0.14) return "bouche_entr";
    if (part < 0.30) return i % 2 ? "bouche_o" : "bouche_entr";
    if (part < 0.48) return i % 3 === 0 ? "bouche_i" : i % 3 === 1 ? "bouche_a" : "bouche_ou";
    if (part < 0.72) return i % 2 ? "bouche_a" : "bouche_i";
    return i % 3 === 0 ? "bouche_a" : "bouche_A";
  };

  const enveloppeDe = (mémoire: AudioBuffer) => {
    const donnees = mémoire.getChannelData(0);
    const fenetre = Math.max(1, Math.floor(mémoire.sampleRate * 0.075));
    const valeurs: number[] = [];
    let pic = 0;
    for (let i = 0; i < donnees.length; i += fenetre) {
      const fin = Math.min(i + fenetre, donnees.length);
      let somme = 0;
      for (let j = i; j < fin; j++) somme += donnees[j] * donnees[j];
      const v = Math.sqrt(somme / (fin - i));
      if (v > pic) pic = v;
      valeurs.push(v);
    }
    return { valeurs, pic: pic || 1, pas: 0.075 };
  };

  /* Joue un morceau et fait suivre la bouche. Les seuils sont choisis pour
     que le silence ferme vraiment les lèvres : sinon elle mâche dans le vide
     entre deux phrases, et c'est ce qui se voyait le plus. */
  /* Il rend la durée réelle du son, en millisecondes — c'est ainsi que BIA
     apprend combien de temps dure chacune de ses phrases.

     Et surtout : il rend TOUJOURS la main. La première version ne se
     terminait que sur `onended`. Si le navigateur suspend le son — un iPhone
     qui passe en arrière-plan, un appel qui arrive — `onended` ne vient
     jamais, et tout ce qui attendait la fin de cette phrase attendait pour
     toujours. BIA s'est tue à cause de ça. Un secours calé sur la durée du
     morceau garantit qu'on repart, même si le son n'est pas sorti. */
  /* ── LE TOUR, ENVOYÉ QUAND LE SON SORT VRAIMENT ────────────────────────

     Appelée à l'instant de la première syllabe de la VRAIE réponse, et là
     seulement. Une attente qui parle, un accusé de réception, une transition
     : aucun ne l'appelle — sinon le tour se fermerait avant que la réponse
     n'existe, et on mesurerait deux secondes là où il en a attendu neuf.

     Elle ne change rien à ce que BIA fait. Elle soustrait des dates et les
     poste. Si on la retirait, le comportement serait identique — c'est la
     consigne de Lamine : « sans changer le comportement pour l'instant ». */
  const envoyerLeTour = useCallback((quandLaSyllabeSort = Date.now()) => {
    const bornes = bornesRef.current;
    poserBorne(bornes, "syllabe", quandLaSyllabeSort);
    const tour = finirLeTour(bornes);
    /* Le tour est refermé QUOI QU'IL ARRIVE : sans ça, la réponse suivante
       hériterait des bornes de celle-ci et rendrait une durée inventée. */
    bornesRef.current = tourVide(bornes.voie);
    if (!tour) return;
    void fetch("/api/mesure", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ type: "tour", ...tour }),
    }).catch(() => {});
  }, []);

  /* `estLaReponse` : voir envoyerLeTour(). Cette fonction joue AUSSI des
     accusés de réception et des transitions, qui sortent du haut-parleur
     AVANT la réponse. Les compter comme « première syllabe » ferait croire à
     un tour de deux secondes là où il en a duré neuf. */
  const jouerEtAnimer = useCallback(async (octets: ArrayBuffer, estLaReponse = false) => {
    /* Le haut-parleur d'abord, le son ensuite. Voir reveillerLeSon(). */
    const ctx = await reveillerLeSon();
    return new Promise<number>((fini) => {
    let rendu = false;
    let secours: ReturnType<typeof setTimeout> | null = null;
    const rendre = (ms: number) => {
      if (rendu) return;
      rendu = true;
      if (secours) clearTimeout(secours);
      fini(ms);
    };
    ctx.decodeAudioData(octets.slice(0)).then((brut) => {
      /* POSÉE, PAS PRESSÉE. Lamine, le 11 septembre 2026 : « ralentir de
         30 % la vitesse de sa voix, elle est trop agressive ». Le modèle de
         voix n'a AUCUN réglage de vitesse — vérifié dans sa documentation —
         alors on étire le son ici, sans toucher à sa hauteur : c'est la voix
         de Kha, elle ne doit pas devenir plus grave. Voir lib/ralentir.ts. */
      const mémoire = ralentir(ctx, sansSilence(ctx, brut), vitesseAudioBia(octets));
      const { valeurs, pic, pas } = enveloppeDe(mémoire);
      const source = ctx.createBufferSource();
      source.buffer = mémoire;
      source.connect(ctx.destination);
      sourceRef.current = source;

      const depart = ctx.currentTime;
      let precedente: Face | null = null;
      /* Une bouche humaine ne change pas de forme dix fois par seconde. On
         impose un temps minimum entre deux images : sans lui, le visage
         papillonne et paraît nerveux — c'est ce que Lamine a vu. */
      const MINIMUM = 130; // millisecondes
      let dernierChangement = 0;
      const suivre = () => {
        if (sourceRef.current !== source) return;
        const ecoule = (ctx.currentTime - depart) * 1000;
        const i = Math.floor(ecoule / (pas * 1000));
        const part = i >= 0 && i < valeurs.length ? valeurs[i] / pic : 0;
        sonDelleRef.current = part;
        segmentEnCoursRef.current = true;   // un seul morceau ici : jamais de blanc à couvrir
        const forme = formeBouche(part, i);
        if (forme !== precedente && ecoule - dernierChangement >= MINIMUM) {
          precedente = forme;
          dernierChangement = ecoule;
          setFace(forme);
        }
        animationRef.current = requestAnimationFrame(suivre);
      };

      const duree = mémoire.duration * 1000;
      source.onended = () => {
        if (animationRef.current) cancelAnimationFrame(animationRef.current);
        animationRef.current = null;
        if (sourceRef.current === source) sourceRef.current = null;
        rendre(duree);
      };
      setMode("speaking");
      source.start();
      if (estLaReponse) envoyerLeTour();
      // Le filet : la durée du morceau, plus une seconde de marge.
      secours = setTimeout(() => rendre(duree), duree + 1000);
      animationRef.current = requestAnimationFrame(suivre);
    }).catch(() => rendre(0));
    });
  }, [reveillerLeSon, envoyerLeTour]);

  /* La voix du navigateur : béquille, gardée pour le cas où Oolel ne répond
     pas. Elle ne sait pas dire le wolof, d'où la réécriture phonétique — et
     seulement pour le wolof, sinon le français ressort déformé. */
  /* ── ELLE REND LA MAIN QUAND LA VOIX S'EST TUE, PAS AVANT ────────────────

     Trouvé par l'audit du 12 septembre au soir, et c'est juste :

       « parlerAvecLeTelephone() lance speechSynthesis.speak() de façon
         asynchrone et retourne avant la fin réelle de la voix. Comme le
         retour à ready déclenche ecouter() 180 ms plus tard, le micro peut
         être rouvert pendant que speechSynthesis parle encore. »

     Et c'est pire que ça. `bouche(true)`, appelée par `onstart`, met l'état à
     « speaking » ; l'appelant, lui, mettait « ready » juste après l'appel.
     Les deux se battaient donc dans un ordre que personne ne décide — selon
     lequel arrivait en dernier, BIA restait figée sur « elle parle » ou
     rouvrait le micro sur sa propre voix de secours. La même famille de
     course que celle du prénom, à un autre endroit.

     La fonction rend maintenant une promesse qui ne se dénoue qu'à la FIN
     réelle de la voix. L'appelant attend, puis décide de l'état — et comme
     `stopMouth` remet déjà « ready », il n'a le plus souvent rien à faire.

     ET ELLE SE DÉNOUE TOUJOURS. Sur iPhone, `onend` manque parfois à l'appel
     — c'est connu. Une promesse qui ne se dénoue jamais, ici, ce serait un
     micro mort pour de bon : on aurait échangé une course contre un blocage.
     Un garde-fou la dénoue donc au bout d'une durée calculée sur la longueur
     du texte, généreusement. */
  /* ── CE QUI EST SORTI DU HAUT-PARLEUR, ET QUAND ────────────────────────
     Pas ce que le modèle a écrit : ce que le haut-parleur a réellement joué.
     Sa voix est découpée en tête et suite, donc le texte a toujours de
     l'avance sur le son. C'est la fenêtre que lib/sa-propre-voix.ts compare
     au micro pour savoir si elle s'entend elle-même. */
  const ditsRef = useRef<Prononce[]>([]);
  const voixDuTelephoneRef = useRef(false);
  /* Armée une seule fois, au premier geste : voir micro(). */
  const voixDuTelephoneArmee = useRef(false);
  /* Dernier réveil envoyé à notre moteur (RunPod) : 0 au départ. Mesuré en
     conversation réelle le 25 septembre 2026 : vingt secondes de garde-fou
     étaient beaucoup trop courtes -- une conversation normale rouvre le
     micro à chaque tour (toutes les dix-vingt secondes), donc ce réveil se
     redéclenchait à chaque tour et venait se disputer les trois machines
     RunPod avec la vraie phrase à dire (17 s de fabrication mesurés au lieu
     de 2,3-2,7 s). Le réveil n'a de sens qu'après une VRAIE pause -- on
     attend donc presque la durée du sommeil de la machine (dix minutes,
     idle_timeout dans main.py) avant d'en renvoyer un. */
  const dernierReveilMoteur = useRef(0);
  const parlerAvecLeTelephone = useCallback((answer: string) => new Promise<void>((fini) => {
    if (essaiChatterboxActif()) {
      setPanne("KHALAM Voice n’a pas produit de son. Réessaie l’essai vocal.");
      stopMouth(answer); fini(); return;
    }
    if (voixLocaleBiaDisponible(personaRef.current)) {
      noterRouteVoixBia("repli_bloque", true);
      setPanne("La voix locale n'a pas répondu. La voix du téléphone est désactivée pour ce test.");
      stopMouth(answer); fini(); return;
    }
    noterRouteVoixBia("telephone", false);
    // Pas de voix du tout sur cet appareil : on rend la main tout de suite,
    // sinon BIA resterait « en train de répondre » pour toujours — et le
    // micro, qui se ferme pendant qu'elle parle, ne se rouvrirait jamais.
    if (!("speechSynthesis" in window)) { stopMouth(answer); fini(); return; }
    /* ON N'ANNULE QUE S'IL Y A QUELQUE CHOSE À ANNULER. `cancel()` suivi
       aussitôt de `speak()` dans le même tour est connu pour ne rien dire du
       tout sur iPhone — et ici il n'y avait rien à annuler neuf fois sur dix.
       On paie donc le risque pour rien. */
    if (window.speechSynthesis.speaking || window.speechSynthesis.pending) {
      window.speechSynthesis.cancel();
    }
    const synth = window.speechSynthesis;

    /* Web Speech n'expose pas le genre d'une voix. Pour éviter que Safari
       prenne arbitrairement la première voix française (souvent masculine),
       on classe les voix françaises disponibles : voix féminines connues
       d'iOS/macOS en premier, variantes Premium/Enhanced ensuite, et on
       exclut explicitement les principales voix masculines françaises. */
    const choisirVoixFrancaiseFeminine = (voices: SpeechSynthesisVoice[]) => {
      /* Sur iPhone, on veut Aurélie en priorité absolue. Si elle existe
         localement, aucune autre voix française ne doit passer devant elle.
         On garde ensuite le classement féminin comme secours uniquement. */
      const aurelie = voices.find((v) =>
        v.lang.toLowerCase().startsWith("fr") &&
        /aur(?:e|é)lie/i.test(`${v.name} ${v.voiceURI}`)
      );
      if (aurelie) return aurelie;

      const feminines = /audrey|am[ée]lie|marie|virginie|julie|alice|c[ée]line|l[ée]a|hortense|roxane|charlotte|sophie/i;
      const masculines = /thomas|nicolas|daniel|henri|jacques|paul|gilles|bernard|alain|antoine|mathieu|r[ée]mi|yann/i;

      return voices
        .filter((v) => v.lang.toLowerCase().startsWith("fr"))
        .filter((v) => !masculines.test(`${v.name} ${v.voiceURI}`))
        .map((v) => {
          const identite = `${v.name} ${v.voiceURI}`;
          let score = 0;
          if (feminines.test(identite)) score += 100;
          if (v.localService) score += 60;
          if (/premium/i.test(identite)) score += 40;
          if (/enhanced|am[ée]lior[ée]e?/i.test(identite)) score += 30;
          if (/^fr[-_]fr/i.test(v.lang)) score += 20;
          else if (/^fr[-_](sn|ca|be|ch)/i.test(v.lang)) score += 10;
          if (v.default) score += 1;
          return { voix: v, score };
        })
        .sort((a, b) => b.score - a.score)[0]?.voix;
    };

    /* Safari/iOS peut charger la liste des voix après le premier getVoices().
       On attend brièvement voiceschanged si aucune bonne voix féminine
       française n'est encore visible. */
    const choisirEtParler = (voices: SpeechSynthesisVoice[]) => {
      const wolof = voices.find((v) => v.lang.toLowerCase().startsWith("wo"));
      const french = choisirVoixFrancaiseFeminine(voices);

      const enWolof = estWolof(answer);
      const utterance = new SpeechSynthesisUtterance(wolof || !enWolof ? answer : phoneticWolof(answer));
      if (wolof && enWolof) { utterance.voice = wolof; utterance.lang = wolof.lang; }
      else if (french) { utterance.voice = french; utterance.lang = french.lang; }
      else utterance.lang = "fr-FR";
      /* La voix iPhone parlait trop vite : BIA imposait elle-même 1.02/1.06,
         donc le réglage de confort du téléphone ne suffisait pas. On pose ici
         la voix de secours à un débit nettement plus calme, sans modifier sa
         hauteur ni le moteur vocal principal. */
      utterance.rate = enWolof ? 0.78 : 0.82;

      voixDuTelephoneRef.current = true;
      let rendu = false;
      const rendre = () => {
        if (rendu) return;
        rendu = true;
        clearTimeout(gardeFou);
        voixDuTelephoneRef.current = false;
        bouche(false, answer);
        fini();
      };
      const gardeFou = setTimeout(rendre, Math.min(45000, 3000 + (answer.length / 14) * 2000));

      let aDemarre = false;
      utterance.onstart = () => { aDemarre = true; bouche(true); };
      utterance.onend = rendre;
      utterance.onerror = () => {
        setPanne("panne : la voix du téléphone a refusé de parler");
        rendre();
      };
      synth.speak(utterance);
      setTimeout(() => {
        if (!aDemarre && !rendu) setPanne("panne : la voix du téléphone reste muette");
      }, 1000);
    };

    const maintenant = synth.getVoices();
    if (choisirVoixFrancaiseFeminine(maintenant)) {
      choisirEtParler(maintenant);
      return;
    }

    let lance = false;
    let attenteVoix: ReturnType<typeof setTimeout> | null = null;
    const lancerAvecVoixChargees = () => {
      if (lance) return;
      lance = true;
      if (attenteVoix) clearTimeout(attenteVoix);
      synth.removeEventListener("voiceschanged", lancerAvecVoixChargees);
      choisirEtParler(synth.getVoices());
    };
    synth.addEventListener("voiceschanged", lancerAvecVoixChargees, { once: true });
    attenteVoix = setTimeout(lancerAvecVoixChargees, 1200);
  }), [bouche, stopMouth, setPanne]);

  /* ── Les sons qui ne s'écrivent pas ───────────────────────────────────

     Un rire synthétisé n'est pas un rire. Ceux-ci sont de vrais
     enregistrements : on les joue tels quels, et le visage suit la suite
     d'images prévue pour ce son plutôt que l'ouverture de la bouche. */
  /* Comme jouerEtAnimer : il rend TOUJOURS la main. Le rire s'attendait
     lui-même par `onended` ; si le son ne sort pas — un iPhone qui vient
     d'enregistrer et n'a pas rendu le haut-parleur, une interruption —
     `onended` ne vient jamais et tout ce qui suit reste bloqué. La réponse
     entière restait alors coincée derrière un rire qu'on n'entendait pas. */
  const jouerSonAvecVisages = useCallback(async (octets: ArrayBuffer, visages: Array<[string, number]>) => {
    /* LE RIRE PASSE PAR ICI, ET C'EST LUI QUI A RÉVÉLÉ LE DÉFAUT. Un rire
       part du cache, sans attendre le réseau : c'est le son le plus rapide de
       toute l'application, donc le premier à partir avant que le haut-parleur
       soit rendu. Voir reveillerLeSon(). */
    const ctx = await reveillerLeSon();
    return new Promise<void>((fini) => {
      let rendu = false;
      let secours: ReturnType<typeof setTimeout> | null = null;
      let minuteriesVisages: Array<ReturnType<typeof setTimeout>> = [];
      /* ── LE VISAGE FINIT SA DESCENTE APRÈS LE SON ────────────────────

         Lamine, le 12 septembre 2026 au soir : « pendant qu'elle rit,
         aussitôt elle devient sereine. Ce n'est pas comme ça que ça se
         passe, ça fait bizarre. »

         Il a raison, et c'était ici. À la fin du son, on effaçait les
         minuteries de visage qui restaient — donc la DESCENTE du rire (la
         tête qui revient, le sourire qui retombe) était annulée, et la
         première chose qui écrivait le visage ensuite le remettait au repos
         d'un coup. Un rire ne s'arrête pas avec son son : le visage
         redescend après.

         On laisse donc l'arc finir, et on ne rend la main qu'au plus tard
         des deux — le son ou le visage. Ce qui suit (une réponse, une
         question) n'écrit donc plus par-dessus un rire en cours. */
      const rendre = (couperLesVisages = false) => {
        if (rendu) return;
        rendu = true;
        if (secours) clearTimeout(secours);
        if (couperLesVisages) for (const m of minuteriesVisages) clearTimeout(m);
        fini();
      };
      ctx.decodeAudioData(octets.slice(0)).then((mémoire) => {
        const source = ctx.createBufferSource();
        source.buffer = mémoire;
        source.connect(ctx.destination);
        sourceRef.current = source;

        const minuteries: Array<ReturnType<typeof setTimeout>> = [];
        let t = 0;
        for (const [visage, duree] of visages) {
          minuteries.push(setTimeout(() => {
            if (sourceRef.current === source) setFace(visage as Face);
          }, t));
          t += duree;
        }

        minuteriesVisages = minuteries;
        /* La durée de l'arc de visages, pour ne pas rendre la main avant
           qu'il soit fini. C'est la somme des images, plus rien. */
        const arc = visages.reduce((n, [, d]) => n + d, 0);
        source.onended = () => {
          if (sourceRef.current === source) sourceRef.current = null;
          const reste = Math.max(0, arc - mémoire.duration * 1000);
          if (reste > 0) setTimeout(() => rendre(), reste);
          else rendre();
        };
        setMode("speaking");
        source.start();
        secours = setTimeout(() => rendre(), Math.max(mémoire.duration * 1000, arc) + 1000);
      }).catch(() => rendre(true));
    });
  }, [reveillerLeSon]);

  /* ── LE SOUFFLE QUI COUVRE LE TEMPS DE RÉFLEXION ──────────────────────

     Mesuré le 16 septembre sur 63 tours : 10,9 secondes entre sa dernière
     syllabe à lui et la première d'elle, PENDANT LESQUELLES ELLE NE FAIT
     AUCUN BRUIT. C'est ça qu'il ressent comme de la lenteur, et c'est la plus
     grosse part du problème — plus grosse que tout ce que je peux gratter sur
     le micro.

     ── SA FONCTION À ELLE, QUI NE TOUCHE À RIEN ──────────────────────────

     Pas `jouerSouffle`, et c'est délibéré. Celui-là écrit le mode et le
     visage : il la ferait passer en « speaking » alors qu'elle réfléchit, et
     la boucle qui rouvre le micro se déclencherait de travers. On a déjà payé
     une soirée pour ce genre de croisement, le 17 septembre au soir.

     Ici on ne fait qu'une chose : jouer un son. Le visage est déjà pensif, le
     mode est déjà « thinking », et rien de tout ça ne doit bouger.

     ── ET IL S'EFFACE DEVANT ELLE ────────────────────────────────────────

     Trois gardes, et chacune répare un défaut qu'on connaît :

       — il ne part QUE si le tour est encore le sien ;
       — il ne part QUE si rien d'autre ne sort du haut-parleur, sinon il se
         superposerait à sa réponse ;
       — et il attend 600 ms. Une réponse qui vient du répertoire arrive en
         moins que ça : elle ne doit pas être précédée d'un « mmm » de
         réflexion alors qu'il n'y a eu aucune réflexion. */
  const souffleDattenteRef = useRef<AudioBufferSourceNode | null>(null);
  const soufflerEnAttendant = useCallback(async (jeton: object) => {
    if (essaiChatterboxActif()) return;
    if (carteOuverteRef.current) return;
    const souffle = souffleDe("reflexion");
    if (!souffle) return;
    /* Aucun fichier déclaré : on n'essaie même pas d'en chercher un. Sans
       cette ligne, chaque tour partirait chercher un son qui n'existe pas —
       un aller-retour au serveur par question, pour un 404. */
    if (!souffle.fichiers.length) return;
    await new Promise((suite) => setTimeout(suite, 600));
    if (attenteRef.current !== jeton || stopAttenteRef.current) return;
    if (sourceRef.current) return;      // elle parle déjà : on se tait
    const fichier = fichierDe(souffle, dernierSouffle.current);
    let octets = cacheSons.current.get(fichier);
    if (!octets) {
      try {
        const r = await fetch(fichier);
        if (!r.ok) return;              // pas encore enregistré : silence, comme avant
        octets = await r.arrayBuffer();
        cacheSons.current.set(fichier, octets);
      } catch { return; }
    }
    dernierSouffle.current = fichier;
    if (attenteRef.current !== jeton || stopAttenteRef.current) return;
    if (sourceRef.current) return;
    try {
      const ctx = await reveillerLeSon();
      const memoire = await ctx.decodeAudioData(octets.slice(0));
      if (attenteRef.current !== jeton || stopAttenteRef.current) return;
      if (sourceRef.current) return;
      const source = ctx.createBufferSource();
      source.buffer = memoire;
      source.connect(ctx.destination);
      souffleDattenteRef.current = source;
      source.onended = () => {
        if (souffleDattenteRef.current === source) souffleDattenteRef.current = null;
      };
      source.start();
    } catch { /* un souffle qui ne part pas ne casse rien */ }
  }, [reveillerLeSon]);

  /* Elle se met à parler : le souffle s'arrête, il a fini son travail. */
  const taireLeSouffle = useCallback(() => {
    const s = souffleDattenteRef.current;
    souffleDattenteRef.current = null;
    if (s) { try { s.stop(); } catch { } }
  }, []);
  taireLeSoufflRef.current = taireLeSouffle;

  /* Le rire part AVANT la parole, pendant que la voix se synthétise : on
     couvre ainsi l'attente du premier morceau, et l'émotion arrive d'un
     coup au lieu d'être annoncée puis jouée. Si le fichier n'est pas encore
     déposé, on ne fait rien — le visage rit en silence, comme avant. */
  const jouerSouffle = useCallback(async (emotion: string, sansPrelude = false) => {
    if (essaiChatterboxActif()) return;
    /* Carte ouverte : pas de rire, pas de soupir, rien. Une seule voix quand
       on conduit — la meme regle que speak() et direSonTeutFait(). */
    if (carteOuverteRef.current) return;
    const souffle = souffleDe(emotion);
    if (!souffle) return;
    /* ── ELLE COMMENCE PAR LE PETIT RIRE, PUIS ENCHAÎNE ──────────────────

       Lamine : « elle doit normalement commencer par le petit rire, ensuite
       enchaîner par le grand rire, mais le grand rire doit durer au moins
       quatre à cinq secondes ou six secondes même pour que ça soit
       intéressant. »

       Le grand rire fait déjà 4,2 et 5,2 secondes dans les fichiers de Kha.
       Ce qui manquait, c'est l'amorce : un rire ne part pas à pleine gorge,
       il se retient une demi-seconde puis se lâche. Le petit rire retenu
       vient donc devant, et les deux ensemble font près de six secondes. */
    if (!sansPrelude && souffle.prelude) {
      await jouerSouffleRef.current?.(souffle.prelude, true);
    }
    const fichier = fichierDe(souffle, dernierSon.current);
    let octets = cacheSons.current.get(fichier);
    if (!octets) {
      try {
        const r = await fetch(fichier);
        if (!r.ok) return;
        octets = await r.arrayBuffer();
        cacheSons.current.set(fichier, octets);
      } catch { return; }
    }
    dernierSon.current = fichier;
    await jouerSonAvecVisages(octets, souffle.visages);
  }, [jouerSonAvecVisages]);
  /* Le renvoi sert à l'enchaînement : jouerSouffle s'appelle elle-même pour
     jouer l'amorce, et une fonction ne peut pas se citer dans sa propre
     définition. */
  jouerSouffleRef.current = jouerSouffle;

  /* ── UNE PHRASE DÉJÀ ENREGISTRÉE ──────────────────────────────────────

     « Dès qu'elle commence à écrire, elle doit dire d'accord, je commence
     l'écriture » — Lamine, le 10 septembre 2026.

     On ne la fait PAS synthétiser : ce serait trois secondes d'attente et un
     appel payant pour une phrase qui ne change jamais. Un fichier enregistré
     par Kha part instantanément, et c'est la même voix.

     Le fichier peut ne pas être là : dans ce cas on ne dit rien, et on ne se
     plaint pas. Le bruit de frappe et le petit clavier suffisent déjà à
     montrer qu'elle travaille. */
  const direEnregistre = useCallback(async (quoi: string) => {
    if (essaiChatterboxActif()) return;
    try {
      const fichier = `/sons/${quoi}.mp3`;
      let octets = cacheSons.current.get(fichier);
      if (!octets) {
        const r = await fetch(fichier);
        if (!r.ok) return;
        octets = await r.arrayBuffer();
        cacheSons.current.set(fichier, octets);
      }
      await jouerSonAvecVisages(octets, [["parle", 900]]);
    } catch { /* pas de fichier, pas de bruit, pas d'erreur */ }
  }, [jouerSonAvecVisages]);

  /* ── LA VOIX D'ATTENTE ────────────────────────────────────────────────

     Une seule voix continue, en trois temps, expliqués dans lib/attente.ts.
     Ce qui suit ne fait que les jouer, et surtout : couper NET quand la
     réponse est prête. */

  /* Le son d'une parole d'attente. On essaie d'abord le fichier tout prêt de
     public/sons/attente/ — gratuit, instantané, et c'est là qu'il doit finir.
     S'il n'est pas encore fabriqué, on le synthétise et on le garde en
     mémoire pour la durée de la session. */
  const audioParole = useCallback(async (p: Parole, langue: Langue, nom = "") => {
    const texte = dire(p, langue, nom);
    const cleAttente = `${routeVoixBia()}:${voixChatterboxBia()}:${personaRef.current}:${voixLocaleBiaDisponible(personaRef.current) ? debitNatifRef.current : "serveur"}:${texte}`;
    const garde = attenteCache.current.get(cleAttente);
    if (garde) return garde;

    /* ── LE FICHIER TOUT PRÊT : GRATUIT, INSTANTANÉ, D'UN SEUL BLOC ────────

       On regarde d'abord dans le SEAU, où l'enregistrement les dépose comme
       les 84 réponses et les 49 phrases de guidage ; puis, à défaut, dans
       public/sons/attente/.

       Pourquoi ça compte, mesuré sur le serveur en ligne le 12 septembre
       2026 : les quatre fichiers de public/sons/attente/ n'avaient JAMAIS été
       déposés — 404 sur les quatre. Chaque attente de chaque échange partait
       donc chez Soynade : huit secondes et quelques signes payés, à chaque
       question, pour deux phrases qui ne changent jamais. C'est exactement ce
       que le répertoire existe pour éviter, et l'attente y échappait. */
    /* 25 septembre 2026 : ces fichiers tout prêts sont de VRAIS
       enregistrements de la voix de Kha — pas un clonage, la voix elle-même.
       Rara ne les a pas encore les siens, donc ce raccourci ne doit jouer
       que pour BIA : sinon Rara prononcerait sa phrase d'attente avec la
       voix de Kha, quels que soient les réglages de /api/voix plus bas. */
    if (!essaiChatterboxActif() && !p.wo.includes("{nom}") && personaRef.current !== "rara" && !voixLocaleBiaDisponible(personaRef.current)) {
      const base = (moteursRef.current as { repertoire?: { base_sons?: Record<string, string> } } | null)
        ?.repertoire?.base_sons?.[langue] || "";
      for (const adresse of fichiersPossibles(p, langue, base)) {
        try {
          const f = await fetch(adresse, { cache: "force-cache" });
          if (!f.ok) continue;
          const octets = await f.arrayBuffer();
          if (octets.byteLength > 512) {
            const morceaux = [octets];
            attenteCache.current.set(cleAttente, morceaux);
            return morceaux;
          }
        } catch {}
      }
    }

    /* TOUS LES MORCEAUX, PAS SEULEMENT LE PREMIER.
       Le serveur découpe en escalier : le premier morceau ne fait que 110
       signes, pour que la RÉPONSE démarre vite. Une parole d'attente de six
       cents signes réclamée avec `partie: 0` revenait donc tronquée à sa
       première phrase — sept secondes au lieu de quarante-deux — et BIA
       repartait au début, encore et encore. C'est ce que Lamine a entendu. */
    const demander = async (partie: number): Promise<MorceauVoix> => {
      const r = await fetch(routeVoixBia(), {
        method: "POST",
        headers: { "content-type": "application/json", "x-bia-code": codeRef.current },
        body: JSON.stringify({ texte, partie, voice: voixChatterboxBia(), ou: "attente", audioPrompt: voixAudioPrompt() }),
      });
      if (!r.ok) throw new Error("voix indisponible");
      return await r.json() as { parties: number; audio: string | null; speed?: number };
    };

    const premier = await demander(0);
    if (!premier.audio) throw new Error("voix muette");
    const morceaux = [octetsDeBase64(premier.audio, premier.speed)];
    for (let i = 1; i < (premier.parties || 1); i++) {
      const suite = await demander(i);
      if (!suite.audio) break;
      morceaux.push(octetsDeBase64(suite.audio, suite.speed));
    }
    attenteCache.current.set(cleAttente, morceaux);
    return morceaux;
  }, []);

  /* Jouer une parole d'attente, et pouvoir la couper au milieu d'un mot sans
     que ça claque. D'où le réglage de volume : on ne stoppe pas la source, on
     la descend à zéro en quarante millisecondes, puis on la stoppe. */
  const direUnMorceau = useCallback((octets: ArrayBuffer, jeton: object, quand = 0) =>
    new Promise<number>((fini) => {
      const ctx = contexte();
      let rendu = false;
      const rendre = (fin = 0) => { if (!rendu) { rendu = true; fini(fin); } };
      ctx.decodeAudioData(octets.slice(0)).then((brut) => {
        if (attenteRef.current !== jeton) return rendre();
        const mémoire = ralentir(ctx, sansSilence(ctx, brut), vitesseAudioBia(octets));
        const { valeurs, pic, pas } = enveloppeDe(mémoire);
        const source = ctx.createBufferSource();
        const volume = ctx.createGain();
        source.buffer = mémoire;
        source.connect(volume);
        volume.connect(ctx.destination);

        const depart = Math.max(ctx.currentTime + 0.03, quand);
        let precedente: Face | null = null;
        let dernierChangement = -1e9;
        const suivre = () => {
          if (attenteSonRef.current?.source !== source) return;
          const ecoule = ctx.currentTime - depart;
          const i = Math.floor(ecoule / pas);
          const part = i >= 0 && i < valeurs.length ? valeurs[i] / pic : 0;
          sonDelleRef.current = part;
          segmentEnCoursRef.current = true;   // un seul morceau ici : jamais de blanc à couvrir
          const forme = formeBouche(part, i);
          if (forme !== precedente && ecoule - dernierChangement >= 0.13) {
            precedente = forme; dernierChangement = ecoule; setFace(forme);
          }
          animationRef.current = requestAnimationFrame(suivre);
        };

        const fin = depart + mémoire.duration;
        source.onended = () => {
          if (attenteSonRef.current?.source === source) attenteSonRef.current = null;
          rendre(fin);
        };
        attenteSonRef.current = { source, volume };
        /* Notée, pas comptée : l'attente ne raccourcit pas le tour, elle le
           rend supportable. Savoir lesquels en ont eu une explique pourquoi
           deux tours de neuf secondes ne se ressemblent pas. */
        bornesRef.current.attente = true;
        setMode("speaking");
        source.start(depart);
        animationRef.current = requestAnimationFrame(suivre);
        // Filet : si le son ne sort pas, on ne reste pas bloqué.
        setTimeout(() => rendre(fin), (fin - ctx.currentTime) * 1000 + 1200);
      }).catch(() => rendre());
    }), [contexte]);

  /* Une parole entière : ses morceaux programmés bout à bout sur l'horloge du
     son, sans couture — la même technique que pour la réponse. */
  const direParole = useCallback(async (morceaux: ArrayBuffer[], jeton: object) => {
    let quand = 0;
    for (const octets of morceaux) {
      if (attenteRef.current !== jeton || stopAttenteRef.current) return;
      quand = await direUnMorceau(octets, jeton, quand);
      if (!quand) return;
    }
  }, [direUnMorceau]);

  /** Couper l'attente immédiatement, proprement, sans claquement. */
  const couperAttente = useCallback(() => {
    const en = attenteSonRef.current;
    attenteSonRef.current = null;
    if (!en) return;
    try {
      const ctx = contexte();
      en.volume.gain.setTargetAtTime(0, ctx.currentTime, 0.012);
      en.source.stop(ctx.currentTime + 0.06);
    } catch { try { en.source.stop(); } catch {} }
  }, [contexte]);

  /* ── L'ATTENTE, TELLE QUE LAMINE L'A REDESSINÉE ────────────────────────

     Avant : elle meublait tout le temps mort en parlant, et une phrase de
     quarante secondes revenait à chaque tour. Entendue une fois, c'est
     accueillant ; entendue à chaque question, c'est une machine qui récite.
     C'est ce qui a gâché la démonstration.

     Maintenant : la présentation — « je t'ai bien entendu, comment tu
     t'appelles ? » — est dite UNE SEULE FOIS, au tout premier échange de la
     conversation. Ensuite, plus rien : le silence, et une lueur dorée qui
     respire près de son visage. Comme Siri, comme ChatGPT. Quand la réponse
     est prête, la lueur s'éteint et elle parle. */
  const attendreEnParlant = useCallback(async (jeton: object, langue: Langue) => {
    if (essaiChatterboxActif()) return;
    // Après le premier échange, elle se tait : c'est toute la règle.
    if (presentationFaiteRef.current) return;
    presentationFaiteRef.current = true;

    const jouer = async (p: Parole, nom = "") => {
      if (attenteRef.current !== jeton || stopAttenteRef.current) return false;
      let morceaux: ArrayBuffer[];
      try { morceaux = await audioParole(p, langue, nom); } catch { return false; }
      if (attenteRef.current !== jeton || stopAttenteRef.current) return false;
      await direParole(morceaux, jeton);
      return attenteRef.current === jeton && !stopAttenteRef.current;
    };

    // 1. Elle a entendu. Et si elle ne connaît pas encore la personne, elle
    //    demande son prénom — une seule fois dans la vie de l'appareil.
    /* ── ELLE NE DEMANDE PAS SON NOM À SON PÈRE ──────────────────────────

       Lamine, le 14 septembre 2026 : « elle doit m'appeler papa, pas un autre
       nom quoi qu'il arrive… dès qu'elle détecte le code maître, même sur un
       autre téléphone. »

       Le code maître suffit à le reconnaître, et il le suit d'appareil en
       appareil — c'est exactement ce qu'il demandait, et c'est plus sûr qu'un
       timbre de voix. Lui demander « comment tu t'appelles ? » sur un
       téléphone neuf reviendrait à ne pas reconnaître son père à la voix. */
    const connu = estMaitreRef.current ? "papa" : nomRef.current.trim();
    if (connu) {
      if (!await jouer(PARTIE_1_CONNU, connu)) return;
    } else {
      if (!await jouer(PARTIE_1)) return;
      /* Le micro se rouvre pour recevoir le prénom, et ce qu'il entend est
         traité comme un prénom, jamais comme une nouvelle question. S'il ne
         dit rien, la partie 2 part quand même : on ne laisse pas un silence
         s'installer parce que quelqu'un n'a pas voulu se nommer. */
      attendLeNomRef.current = true;
      void ecouterRef.current?.();
      /* ── POURQUOI ELLE SE « PLANTAIT » APRÈS UNE CORRECTION ──────────────

         Signalé par Lamine le 11 septembre 2026 : « après avoir corrigé,
         quand tu lui parles, elle se plante ; il faut fermer et rouvrir pour
         qu'elle redevienne normale. »

         Elle n'était pas plantée. Elle attendait un PRÉNOM, et elle a pris
         sa phrase pour ce prénom — puis l'a jetée, sans répondre.

         Le chemin exact : au premier échange elle demande « comment tu
         t'appelles ? » et lève ce drapeau, le temps d'écouter la réponse.
         Ouvrir la fenêtre de correction appelle taire(), qui coupe le tour en
         cours ; cette boucle sortait alors par un `return` sec — SANS
         rabaisser le drapeau. Il restait levé pour toujours. Tout ce qu'on
         disait ensuite partait dans la case « prénom » et n'allait nulle
         part. Recharger la page effaçait le drapeau : d'où « je ferme et je
         rouvre, et elle redevient normale ».

         Le drapeau se rabaisse désormais par un `finally` : quelle que soit
         la façon dont on sort d'ici — fin normale, interruption, erreur — il
         ne peut plus rester levé. */
      try {
        const limite = Date.now() + 9000;
        while (attendLeNomRef.current && Date.now() < limite) {
          if (attenteRef.current !== jeton || stopAttenteRef.current) return;
          await pause(200);
        }
      } finally {
        attendLeNomRef.current = false;
      }
      const tout_neuf = nomRef.current.trim();
      if (tout_neuf) nouveauNomRef.current = tout_neuf;
    }

    /* 2. ET C'EST TOUT. Elle se tait, le visage reprend l'air pensif, et la
       lueur dorée respire jusqu'à ce que la réponse arrive. Rien n'est
       répété, rien ne se superpose, rien ne se coupe au milieu d'un mot. */
    if (attenteRef.current === jeton && !stopAttenteRef.current) {
      setMode("thinking");
      setFace("pensive");
    }
  }, [audioParole, direParole]);

  /* Le trait tiré à la fin de l'attente : du micro coupé jusqu'au son de la
     réponse. C'est ce total-là qu'il faudra meubler la prochaine fois. */
  const noterAttente = useCallback(() => {
    const depart = departAttenteRef.current;
    if (!depart) return;
    departAttenteRef.current = 0;
    const fin = Date.now();
    const transcrit = tTranscritRef.current;
    const modele = tModeleRef.current || fin;
    const mesure: Mesure = {
      voie: voieRef.current,
      transcription: transcrit ? transcrit - depart : 0,
      modele: Math.max(0, modele - (transcrit || depart)),
      voix: Math.max(0, fin - modele),
      total: fin - depart,
      quand: fin,
    };
    mesuresRef.current = noterMesure(mesure, mesuresRef.current);
    /* Une copie au serveur. Sur le téléphone, ces chiffres servent à choisir
       la phrase ; ici ils servent à savoir quelles phrases écrire — et ça, on
       ne peut le lire qu'en dehors de l'appareil. Quatre nombres, rien
       d'autre : ni la question, ni la réponse, ni qui parle. */
    void fetch("/api/mesure", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(mesure),
    }).catch(() => {});
  }, []);

  /* Reprendre la parole à l'attente, proprement : on lui demande de
     s'arrêter, on laisse finir la phrase commencée, et alors seulement on
     coupe. Couper avant, c'est un mot tranché en deux ; ne pas couper du
     tout, c'est deux voix l'une sur l'autre. */
  /* LA COUPURE, ET LE CHAPEAU QUI LA RECOUVRE.

     On ne laisse plus la phrase finir : elle dure quarante secondes, attendre
     serait absurde. On la coupe où elle en est — mais jamais brutalement.
     Le volume descend en quelques centièmes, puis le CHAPEAU est dit :
     « bon, je réponds à ta question ». Sans lui, la coupure s'entend comme
     une panne ; avec lui, elle s'entend comme quelqu'un qui a fini de
     réfléchir. C'est l'idée de Lamine, et c'est ce qui fait la différence. */
  /* ── LE CHAPEAU, ET QUAND IL NE FAUT SURTOUT PAS LE DIRE ─────────────────

     Trouvé le 12 septembre 2026 à deux heures du matin, sur le symptôme exact
     décrit par Lamine : « elle dit je t'entends, après elle se met à
     réfléchir et c'est tout, elle ne dit plus rien, le micro reste bloqué sur
     elle comme si elle parlait. »

     Le chapeau — « Bon, noppi naa. Léegi ma la tontu. » — existe pour FERMER
     une attente : il fait la jointure entre « je réfléchis » et la réponse.
     Il a un sens quand le modèle a mis cinq secondes.

     Mais une réponse du répertoire arrive en CENT MILLISECONDES. Il n'y a
     aucune attente à fermer — et le chapeau, lui, doit d'abord être fabriqué
     par Soynade, parce que les fichiers tout prêts de /sons/attente/ n'ont
     jamais été déposés (vérifié le même soir : 404 sur les quatre). On
     attendait donc huit secondes de fabrication pour annoncer une réponse
     déjà là. Micro fermé, visage figé : BIA paraissait bloquée.

     C'est mon passage de 42 à 84 réponses instantanées qui a rendu le cas
     ordinaire : avant, la plupart des questions passaient par le modèle et
     l'attente avait le temps de finir toute seule.

     RÈGLE : on ne dit un chapeau que s'il y a eu une vraie attente à fermer.
     Quand la réponse est déjà en main, on coupe et on répond. */
  const finirAttente = useCallback(async (langue: Langue = "wo", avecChapeau = true) => {
    const parlait = Boolean(attenteSonRef.current) && avecChapeau;
    stopAttenteRef.current = true;
    attenteRef.current = null;
    /* Un cas fin : la réponse arrive pendant qu'elle attend le prénom, micro
       ouvert. Si on remet le drapeau à faux ici, ce que le micro a déjà pris
       repartira comme une NOUVELLE question par-dessus la réponse. Tant que
       l'enregistreur tourne, on laisse le drapeau : ce qu'il rapportera sera
       traité comme un prénom, puis oublié. */
    if (!enregistreurRef.current) attendLeNomRef.current = false;
    couperAttente();
    if (parlait && !essaiChatterboxActif()) {
      try {
        /* ET MÊME LÀ, IL NE RETIENT PAS LA RÉPONSE. Fabriquer le chapeau
           demande huit secondes à Soynade tant que /sons/attente/ est vide.
           Passé une seconde et demie, on l'abandonne et on répond : une
           jointure qui fait attendre plus que ce qu'elle joint ne joint
           plus rien. */
        const morceaux = await Promise.race([
          audioParole(CHAPEAU, langue),
          new Promise<null>((r) => setTimeout(() => r(null), 1500)),
        ]);
        if (morceaux) {
          const jeton = {};
          attenteRef.current = jeton;
          stopAttenteRef.current = false;
          await direParole(morceaux, jeton);
          attenteRef.current = null;
        }
      } catch {}
    }
    stopAttenteRef.current = false;
  }, [audioParole, couperAttente, direParole]);

  /* La vraie voix : Oolel Voices, la même que BIBA. Le serveur découpe la
     réponse — Soynade n'accepte que 500 caractères — et on va chercher le
     morceau suivant PENDANT que le précédent est lu, sinon un silence
     s'installe entre chaque phrase. */
  /* ── UNE PHRASE DU RÉPERTOIRE : LE SON EST DÉJÀ FAIT ─────────────────────

     Lamine, le 11 septembre 2026 : « garder les enregistrements des mots
     courants, une fois, comme ça on n'aura plus à payer ces mots-là. »

     Ici, on ne demande rien à /api/voix : on va chercher le fichier déjà
     fabriqué et on le joue. Pas un signe facturé, et le son part en une
     fraction de seconde au lieu de huit. C'est le même chemin d'affichage que
     la voix ordinaire — visage compris — pour que rien ne se voie. */
  /* ── UN SON DÉJÀ PAYÉ NE SE RETÉLÉCHARGE PAS ──────────────────────────────

     Lamine, le 12 septembre 2026 : « même pour les messages préenregistrés
     c'est un peu long. »

     Mesuré : les fichiers du répertoire arrivent de Supabase avec l'en-tête
     « cache-control: no-cache », et ils sont en WAV — 133 ko pour « Salaam »,
     323 ko pour « kan nga ». Le navigateur les reprenait donc au réseau À
     CHAQUE FOIS. Sur le wifi du Mac ça fait 250 ms ; sur un téléphone en 4G à
     Dakar, c'est bien plus, et ça s'ajoute à tout le reste pour un fichier qui
     ne changera jamais de sa vie.

     DEUX MÉMOIRES, PARCE QU'ELLES NE SERVENT PAS AU MÊME MOMENT :
       — celle de la page, en mémoire vive : la deuxième fois dans la même
         conversation, le son part sans un aller-retour, instantanément ;
       — celle du navigateur (Cache Storage) : elle survit à la fermeture de
         l'application, donc demain matin « Salaam » part aussi vite.

     Cache Storage garde ce qu'on lui donne SANS DEMANDER SON AVIS à
     l'en-tête — c'est tout l'intérêt ici : le serveur dit « ne garde pas »,
     et nous savons mieux que lui, parce que ces fichiers-là sont gravés.

     Et si les deux mémoires sont vides ou refusées (navigation privée, place
     épuisée), on fait ce qu'on faisait avant : on va le chercher. Une mémoire
     qui tombe ne doit jamais rendre BIA muette. */
  const octetsDuRepertoire = useCallback(async (adresse: string): Promise<ArrayBuffer> => {
    const vif = cacheSons.current.get(adresse);
    if (vif) return vif;

    let boite: Cache | null = null;
    try { boite = await caches.open("bia-sons-v1"); } catch { boite = null; }

    if (boite) {
      try {
        const garde = await boite.match(adresse);
        if (garde) {
          const octets = await garde.arrayBuffer();
          if (octets.byteLength > 1000) {
            cacheSons.current.set(adresse, octets);
            return octets;
          }
        }
      } catch { }
    }

    /* ── LE LÉGER D'ABORD, L'ORIGINAL SI BESOIN ─────────────────────────

       On demande le MP3 : six fois plus léger que le WAV, la même voix.
       Mais un MP3 peut manquer — la conversion n'est pas encore passée sur
       cette phrase-là, ou son dépôt a raté — et dans ce cas le WAV est
       toujours là, puisqu'on ne supprime jamais ce qui a été payé.

       ON NE DIT RIEN À LA PERSONNE. Elle entend la même phrase, un peu plus
       tard. Un silence, lui, se remarquerait. */
    const candidats = adresse.endsWith(".mp3")
      ? [adresse, adresse.replace(/\.mp3$/, ".wav")]
      : [adresse];

    let dernier = "";
    for (const ou of candidats) {
      let r: Response;
      try { r = await fetch(ou); } catch (e) { dernier = String(e); continue; }
      if (!r.ok) { dernier = `${r.status}`; continue; }
      /* On met de côté AVANT de lire : une fois le corps consommé, il ne se
         relit plus. Et on le range sous l'adresse DEMANDÉE, pas sous celle
         qui a répondu : au prochain tour on cherchera la même. */
      if (boite) { try { await boite.put(adresse, r.clone()); } catch { } }
      const octets = await r.arrayBuffer();
      cacheSons.current.set(adresse, octets);
      return octets;
    }
    throw new Error(`son du répertoire introuvable (${dernier})`);
  }, []);

  const direSonTeutFait = useCallback(async (adresse: string, emotion?: string) => {
    if (essaiChatterboxActif()) { setMode("ready"); setFace("yeux_ouverts"); return; }
    /* LA MEME REGLE QUE speak() : carte ouverte, BIA se tait. Une reponse
       enregistree ne passe pas par speak(), donc elle echappait a la garde —
       et c'est justement la reponse la plus frequente quand on demande un
       trajet : « d'accord, je t'emmene ». */
    if (carteOuverteRef.current) return;
    /* SANS CHAPEAU : la réponse est déjà là, il n'y a pas d'attente à fermer.
       C'est ce qui bloquait BIA — voir finirAttente. */
    await finirAttente(langueRef.current, false);
    window.speechSynthesis?.cancel();
    couperSon();
    if (emotion) await jouerSouffle(emotion);
    setMode("speaking");
    const octetsDits = await octetsDuRepertoire(adresse);
    /* Le son est en main : le reste est du décodage et du démarrage. Sans
       cette borne, les quarante millisecondes qui suivent ne tombaient dans
       aucun morceau et la somme ne faisait plus le total. */
    poserBorne(bornesRef.current, "enMain");
    await jouerEtAnimer(octetsDits, true);
    setMode("ready");
    setFace("yeux_ouverts");
  }, [finirAttente, couperSon, jouerSouffle, jouerEtAnimer, octetsDuRepertoire]);

  const speak = useCallback(async (answer: string, emotion?: string, ou = "réponse", suite = false) => {
    /* La carte est ouverte : seul le guidage a le droit de parler. Voir la
       règle écrite près de `carteOuverteRef`. Ce qui arrive ici en retard —
       la fin d'une réponse, une phrase d'attente — meurt sans bruit. */
    if (carteOuverteRef.current && ou !== "guidage") return;
    /* PRENDRE LA PAROLE N'EST PAS COUPER LA PAROLE.

       Ce bloc était en tête de la fonction : le son mourait à l'instant où le
       texte de la réponse revenait, puis on attendait la synthèse en silence.
       Il est descendu là où il a un sens — juste avant de dire le premier
       mot, une fois le son fabriqué. */
    const tourAuDepart = numeroDuTourRef.current;
    const actuel = () => numeroDuTourRef.current === tourAuDepart;
    const peutParler = () => attendreSonTour(actuel, () => porteRef.current);
    if (suite && ou === "réponse") setMode("thinking");
    const prendreLaParole = async () => {
      /* ── SAUF QUAND ELLE A DÉJÀ COMMENCÉ ─────────────────────────────

         `suite` veut dire : la tête de la réponse est en train d'être dite,
         et ceci en est le reste. Prendre la parole une seconde fois
         couperait le son qu'on vient de lancer — donc on ne fait rien, on
         continue simplement de parler. */
      if (suite) return;
      await finirAttente(langueRef.current);
      if (!actuel()) return;
      window.speechSynthesis?.cancel();
      couperSon();
    };

    if (!answer.trim()) { await prendreLaParole(); return; }

    /* ── PENDANT UNE LEÇON, PAS DE VOIX DE MACHINE ────────────────────────

       Lamine, le 15 septembre 2026 : « pendant les leçons, parfois la voix
       saute. Elle amène la voix de la machine. »

       Ailleurs, la voix du téléphone est un filet utile : elle dit la phrase,
       mal, mais elle la dit. Pendant une leçon, c'est un CONTRESENS. Il est en
       train de lui apprendre à prononcer ; une voix française synthétique qui
       lit du wolof écrit à l'oreille — « djarignou » pour « jariñu » — ne lui
       apprend rien et lui fait croire qu'elle a mal retenu.

       On préfère le lui DIRE. Une leçon qu'on refait vaut mieux qu'une leçon
       qu'on juge sur une prononciation qui n'est pas la sienne. */
    const enLecon = ou === "apprentissage";
    const renoncer = () => {
      setPanne("sa voix n'a pas répondu — redis la phrase");
      stopMouth(answer);
    };

    /* ── UNE SEULE LANGUE POUR TOUTE LA RÉPONSE ───────────────────────────

       Le téléphone n'envoyait PAS la langue, alors le serveur la devinait —
       et il la devinait MORCEAU PAR MORCEAU. Une réponse coupée en trois
       pouvait donc être lue par le modèle wolof, puis par le modèle
       français, puis par le wolof : la voix changeait de langue au milieu
       d'une phrase, sur un texte pourtant juste à l'écran.

       On décide ici, une fois, sur la réponse ENTIÈRE — un fragment de
       quatre mots ne se juge pas, une réponse complète oui. */
    const langueDite = estWolof(answer) ? "wo" : "fr";
    const locale = voixLocaleBiaDisponible(personaRef.current);
    if (choixVoixBia() === "piper" && !locale) {
      setPanne("Piper est installé dans l’application du téléphone. Ouvre cette application pour l’utiliser, ou choisis Khalam Voice dans Moi.");
      stopMouth(answer); return;
    }
    noterRouteVoixBia("demande", locale);

    if (!essaiChatterboxActif() && moteursRef.current && moteursRef.current.voix === "navigateur" && !voixLocaleBiaDisponible(personaRef.current)) {
      await prendreLaParole();
      if (!await peutParler()) return;
      if (enLecon) { renoncer(); return; }
      if (emotion) await jouerSouffle(emotion);
      if (!await peutParler()) return;
      await parlerAvecLeTelephone(answer);
      return;
    }

    /* ── LE FRANÇAIS PAR LE TÉLÉPHONE, TOUJOURS ────────────────────────────

       26 septembre 2026, décidé avec Lamine : le français est déjà quasi
       instantané et gratuit par la voix du navigateur (le téléphone la
       fabrique lui-même, zéro aller-retour serveur, zéro coût Soynade). Le
       wolof, lui, n'existe dans AUCUN navigateur — c'est pour lui seul que
       notre moteur (voix de Kha) a un sens. On ne passe donc plus par le
       serveur pour le français : gain de vitesse ET d'argent, sur la partie
       de la conversation qui n'en a pas besoin.

       Les leçons restent sur le vrai moteur (elles portent sur le wolof,
       `enLecon` est donc un filet, pas le cas normal ici). */
    if (!essaiChatterboxActif() && langueDite === "fr" && !enLecon && !voixLocaleBiaDisponible(personaRef.current) && typeof window !== "undefined" && "speechSynthesis" in window) {
      await prendreLaParole();
      if (!await peutParler()) return;
      if (emotion) await jouerSouffle(emotion);
      if (!await peutParler()) return;
      await parlerAvecLeTelephone(answer);
      return;
    }

    const routeVoix = routeVoixBia();
    const voixChoisie = voixChatterboxBia();
    const demander = async (partie: number) => {
      let dernier = "voix indisponible";
      for (let essai = 0; essai < 3; essai++) {
        if (!actuel()) throw new Error("tour interrompu");
        let attente = 500 * (essai + 1);
        try {
          if (essaiChatterboxActif()) {
            const abort = new AbortController();
            fluxVoixRef.current.add(abort);
            const annuler = () => { abort.abort(); fluxVoixRef.current.delete(abort); };
            let response: Response;
            try {
              response = await fetch(routeVoix + "/stream", {
                method: "POST", signal: abort.signal,
                headers: { "content-type": "application/json", "x-bia-code": codeRef.current },
                body: JSON.stringify({ texte: answer, partie, voice: voixChoisie, langue: langueDite }),
              });
            } catch (error) { annuler(); throw error; }
            if (response.ok) {
              if (response.headers.get("content-type")?.includes("application/x-ndjson")) return await ouvrirFluxVoix(response, annuler);
              annuler();
              return await response.json() as MorceauVoix;
            }
            annuler();
            // Compatibility only before any audio has played: never repeat a
            // partially heard stream through a second synthesis request.
            if (![404, 501].includes(response.status)) throw new Error(`Streaming HTTP ${response.status}`);
          }
          const r = await fetch(routeVoix, {
            method: "POST",
            headers: { "content-type": "application/json", "x-bia-code": codeRef.current },
            body: JSON.stringify({ texte: answer, partie, ou, langue: langueDite, voice: voixChoisie,
              tete: !suite && partie === 0, audioPrompt: voixAudioPrompt() }),
          });
          if (r.ok) return await r.json() as { parties: number; audio: string | null; type_mime?: string; fabrication_ms?: number; speed?: number };
          dernier = r.status === 429 ? "moteur vocal occupé" : `voix indisponible (HTTP ${r.status})`;
          if (![429, 502, 503, 504].includes(r.status)) break;
          if (r.status === 429) attente = Math.min(5000, Math.max(2000, (Number(r.headers.get("retry-after")) || 2) * 1000));
        } catch (e) { dernier = "connexion au moteur vocal interrompue"; }
        if (essai < 2) await new Promise((f) => setTimeout(f, attente));
      }
      throw new Error(dernier);
    };

    const enOctets = (b64: string, source?: number) => octetsDeBase64(b64, source);

    try {
      // La synthèse part TOUT DE SUITE — et pendant ces quelques secondes,
      // l'attente continue de parler. C'est elle qui couvre le trou, plus le
      // silence.
      /* On lance les DEUX premiers morceaux en même temps. Ils sont
         indépendants : le serveur découpe le même texte de la même façon à
         chaque appel, il n'a rien à mémoriser. Attendre le premier pour
         demander le second, c'était ajouter la fabrication de l'un à celle de
         l'autre — et ce temps-là s'entendait, en plein milieu de sa phrase. */
      const premier = demander(0);
      // One test GPU: start the first audible segment before queuing the next.
      let second = essaiChatterboxActif() ? null : demander(1).catch(() => null);
      let bloc = await premier;
      if (!actuel()) return;
      if (essaiChatterboxActif() && bloc.parties > 1) second = demander(1).catch(() => null);
      if (!suite) noterAttente();   // le son est là : l'attente est finie, on la note
      if (ou === "réponse") {
        poserBorne(bornesRef.current, "enMain");
        /* Ce que le serveur a mis à fabriquer la tête : le reste de voix_ms,
           c'est le réseau. Voir lib/tour.ts. */
        if (!suite && bloc.fabrication_ms) bornesRef.current.fabrication = Number(bloc.fabrication_ms) || 0;
      }
      /* Une reprise de parole reste prioritaire, même si la synthèse tarde. */
      const devantLaPorte = Date.now();
      if (!await peutParler()) return;
      if (ou === "réponse") bornesRef.current.porte = Date.now() - devantLaPorte;
      await prendreLaParole();
      if (!await peutParler()) return;
      if (!bloc.audio) {
        if (essaiChatterboxActif()) {
          setPanne("KHALAM Voice n’a produit aucun son. Réessaie l’essai vocal.");
          stopMouth(answer); return;
        }
        if (locale) {
          noterRouteVoixBia("audio_absent", true);
          setPanne("La voix locale n'a produit aucun son. Réessaie depuis BIA.");
          stopMouth(answer); return;
        }
        if (enLecon) { renoncer(); return; }
        await parlerAvecLeTelephone(answer);
        return;
      }
      // Le rire vient maintenant : entre la dernière phrase d'attente et le
      // premier mot de la réponse, il fait la liaison.
      if (emotion) await jouerSouffle(emotion);
      if (!await peutParler()) return;

      const jeton = {};
      tourRef.current = jeton;

      // Seul le propriétaire du tour peut changer le mode ou programmer un son.
      const perdu = () => !actuel() || tourRef.current !== jeton;

      /* TROIS MORCEAUX D'AVANCE, pas deux.
         Avec un seul, le moindre à-coup du réseau se transformait en silence.
         Ils se fabriquent tous en parallèle côté serveur ; garder deux longueurs
         d'avance coûte une requête de plus et supprime les blancs.

         Passé à TROIS le 26 septembre 2026. Signalé par Lamine : « quand
         elle raconte une histoire, à un moment elle se tait, il faut la
         relancer. » Mesuré ce jour-là, sur notre propre moteur (RunPod) :
         la fabrication d'un morceau prend maintenant 3 à 6 s, parfois plus
         -- alors que le morceau qui parle pendant ce temps-là ne dure
         souvent que 2-3 s de voix. Avec deux longueurs d'avance, le morceau
         suivant n'avait donc pas toujours fini de se fabriquer quand
         l'horloge du son en avait besoin -- d'où le blanc, en plein milieu
         d'une histoire à plusieurs phrases. Une longueur de plus donne au
         morceau qui vient après le suivant le temps de départ de DEUX
         morceaux parlés, pas un seul. Nos trois machines RunPod
         (workers=(0,3), main.py) suffisent tout juste à ces trois
         fabrications de front. */
      const total = bloc.parties;
      const enVol = new Map<number, Promise<Awaited<ReturnType<typeof demander>> | null>>();
      enVol.set(0, premier);
      if (total > 1) enVol.set(1, second || demander(1).catch(() => null));
      const lancer = (i: number) => {
        if (!actuel() || i <= 1 || i >= total || enVol.has(i)) return;
        // One GPU: preserve synthesis order, with two parts of lookahead.
        const pending = essaiChatterboxActif()
          ? (enVol.get(i - 1) || Promise.resolve(null)).then(() => actuel() ? demander(i) : null)
          : demander(i);
        enVol.set(i, pending.catch(() => null));
      };

      /* ── ELLE ENCHAÎNE, COMME QUELQU'UN QUI PARLE ──────────────────────

         Avant, chaque morceau attendait que le précédent se soit ENTENDU
         finir avant d'être décodé puis lancé. Entre les deux : le décodage du
         mp3, un tour de boucle du navigateur, et la traîne de silence que
         Soynade laisse au bout de chaque rendu. Un demi-quart de seconde à
         chaque couture — et comme la coupure tombe en fin de phrase, là où la
         voix redescend, on croyait qu'elle avait fini.

         Maintenant les morceaux sont PROGRAMMÉS sur l'horloge du son, à la
         milliseconde : le suivant démarre à l'instant précis où le précédent
         se termine, décodé longtemps à l'avance. Il n'y a plus de couture. */
      // Wait for playback to wake after microphone use, including Safari interrupted state.
      const ctx = await reveillerLeSon();
      if (perdu()) return;
      if (String(ctx.state) !== "running") throw new Error("Appuie sur le micro pour réactiver le son.");
      const segments: Array<{ debut: number; fin: number; valeurs: number[]; pic: number; pas: number }> = [];
      let quand = 0;
      // Vrai par défaut : le premier morceau, on l'a déjà en main (bloc), pas de blanc au départ.
      segmentEnCoursRef.current = true;
      /* Le trou réel entre deux morceaux, en millisecondes. Il devrait être
         nul ; on le mesure quand même, parce qu'on croyait déjà qu'il l'était.
         Il part au serveur avec le reste — c'est le seul moyen de le voir
         depuis ailleurs que le téléphone. */
      const coutures: number[] = [];
      const debutTotal = Date.now();
      let premiereSyllabeFaite = suite;   // la tête parle déjà : ce n'est plus la première
      let noteDansLEcho = false;

      const programmer = async (octets: ArrayBuffer, continu = false) => {
        const brut = await ctx.decodeAudioData(octets.slice(0));
        if (perdu() || !await peutParler() || perdu()) return;
        // Internal audio packet boundaries can fall inside a syllable.
        // Keep every sample; silence trimming applies only to whole clips.
        const mémoire = ralentir(ctx, continu ? brut : sansSilence(ctx, brut), vitesseAudioBia(octets));
        const { valeurs, pic, pas } = enveloppeDe(mémoire);
        const source = ctx.createBufferSource();
        source.buffer = mémoire;
        source.connect(ctx.destination);
        // Un souffle de sécurité au premier morceau : programmer dans le passé
        // le ferait démarrer en retard et tout décaler.
        const debut = Math.max(ctx.currentTime + 0.06, quand);
        if (quand > 0) coutures.push(Math.round((debut - quand) * 1000));
        source.start(debut);
        /* LE TEXTE ENTRE DANS LA FENÊTRE D'ÉCHO AU MOMENT OÙ IL SE JOUE, pas
           quand il a été écrit. Une seule fois par appel : les morceaux
           suivants disent la même phrase. On garde court — au-delà de
           quelques secondes, ce n'est plus un écho. */
        if (!noteDansLEcho) {
          noteDansLEcho = true;
          ditsRef.current = [...ditsRef.current, { texte: answer, quand: Date.now() }].slice(-6);
        }
        /* LA BORNE FINALE, et c'est la seule qui compte pour lui : l'instant
           où le son sort vraiment. `debut` est dans l'horloge du son, qui ne
           compte pas comme celle du monde — on la ramène en ajoutant l'écart
           entre les deux. Et seulement au PREMIER morceau : les suivants sont
           déjà en train de parler. */
        if (!premiereSyllabeFaite) {
          premiereSyllabeFaite = true;
          noterRouteVoixBia("lecture", locale);
          if (ou === "réponse") {
            envoyerLeTour(Date.now() + Math.round((debut - ctx.currentTime) * 1000));
          }
        }
        sourcesRef.current.add(source);
        source.onended = () => { sourcesRef.current.delete(source); };
        quand = debut + mémoire.duration;
        segments.push({ debut, fin: quand, valeurs, pic, pas });
      };

      /* Une seule animation pour toute la réponse : elle lit l'horloge du son
         et cherche dans quel morceau on se trouve. La bouche ne se remet donc
         pas à zéro entre deux morceaux. */
      let precedente: Face | null = null;
      let dernierChangement = -1e9;
      const MINIMUM = 0.13;   // secondes entre deux images de bouche
      const suivre = () => {
        if (tourRef.current !== jeton) return;
        const t = ctx.currentTime;
        const seg = segments.find((s) => t >= s.debut && t < s.fin);
        segmentEnCoursRef.current = Boolean(seg);
        if (!seg) sonDelleRef.current = 0;
        if (seg) {
          const i = Math.floor((t - seg.debut) / seg.pas);
          const part = i >= 0 && i < seg.valeurs.length ? seg.valeurs[i] / seg.pic : 0;
          sonDelleRef.current = part;
          const forme = formeBouche(part, i);
          if (forme !== precedente && t - dernierChangement >= MINIMUM) {
            precedente = forme;
            dernierChangement = t;
            setFace(forme);
          }
        }
        animationRef.current = requestAnimationFrame(suivre);
      };
      setMode("speaking");
      animationRef.current = requestAnimationFrame(suivre);

      for (let i = 0; i < total; i++) {
        lancer(i + 1);
        lancer(i + 2);
        if (!essaiChatterboxActif()) lancer(i + 3);
        let morceau: MorceauVoix | null = null;
        try { morceau = i === 0 ? bloc : await enVol.get(i)!; } catch { morceau = null; }
        if (perdu()) return;         // une nouvelle réponse a pris la main, ou on l'a fait taire
        /* ── UN MORCEAU RATÉ NE DOIT PLUS TAIRE TOUTE L'HISTOIRE ───────────

           Trouvé le 26 septembre 2026, après le guetteur (voir plus haut) :
           Lamine, en pleine histoire racontée par BIA, la deuxième fois —
           « elle se coupe toute seule, et quand elle reprend, elle saute
           les étapes, elle ne raconte pas toute l'histoire. » Le guetteur ne
           coupait plus rien (a_coupe: false sur toute la session mesurée
           après son corrige) : la vraie cause était ici. `demander(i)` peut
           rendre `audio: null` sans lever d'erreur — une panne interne à
           /api/voix se rend ainsi, exprès, pour ne pas gonfler `pannes` d'un
           bruit réseau — et si l'appel jette carrément (réseau du téléphone
           coupé une seconde à Dakar), rien ne le rattrapait ici : un SEUL
           morceau raté faisait `break`, et tout le reste de la réponse,
           pourtant déjà en train de se fabriquer en arrière-plan chez nous,
           partait à la poubelle sans un mot — sans même l'erreur qui aurait
           fait lire la réponse par le téléphone à la place.

           Une phrase perdue au milieu d'une histoire vaut mieux que la
           moitié de l'histoire jamais dite : on retente CE morceau une
           fois, et s'il manque encore, on saute SEULEMENT lui — la suite
           continue, morceau après morceau, jusqu'au bout. */
        if (!morceau || !morceau.audio) {
          try { morceau = await demander(i); } catch { morceau = null; }
        }
        if (perdu()) return;
        if (!morceau?.audio) throw new Error("La voix n’a pas pu terminer la réponse.");
        if (morceau && morceau.audio) {
          // Retry decoding once; never silently skip words from the response.
          try { await programmer(enOctets(morceau.audio, morceau.speed), Boolean(morceau.flux)); }
          catch {
            if (perdu()) return;
            await programmer(enOctets(morceau.audio, morceau.speed), Boolean(morceau.flux));
          }
          if (morceau.flux) {
            for await (const packet of morceau.flux) {
              if (perdu()) { morceau.annuler?.(); return; }
              try { await programmer(enOctets(packet), true); }
              catch { if (perdu()) return; await programmer(enOctets(packet), true); }
            }
          }
        }
        /* On ne dort pas jusqu'à la fin du morceau : on se réveille deux
           secondes avant, le temps de décoder et de programmer le suivant
           sans jamais laisser l'horloge nous rattraper. */
        const avance = Math.max(0, (quand - ctx.currentTime - 2) * 1000);
        if (i + 1 < total) await pause(avance);
        if (perdu()) return;
      }

      // Elle a fini de parler quand le dernier morceau s'est tu, pas avant.
      const reste = Math.max(0, (quand - ctx.currentTime) * 1000);
      await pause(reste + 120);
      segmentEnCoursRef.current = true;   // fini : plus de blanc à couvrir, le guetteur rejuge normalement
      if (perdu()) return;
      void fetch("/api/mesure", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          type: "lecture",
          morceaux: segments.length,
          couture_max_ms: coutures.length ? Math.max(...coutures) : 0,
          couture_totale_ms: coutures.reduce((a, b) => a + b, 0),
          duree_ms: Date.now() - debutTotal,
        }),
      }).catch(() => {});
      stopMouth(answer);
    } catch (e) {
      if (!actuel()) return;
      /* ── LE REPLI NE DOIT PLUS ÊTRE UN MYSTÈRE ──────────────────────────

         Lamine, le 12 septembre 2026, capture à l'appui : « elle écrit la
         réponse correctement, mais sur la voix, elle utilisait une langue
         que je ne connais pas. »

         C'était ce repli-ci, et il était MUET sur lui-même. Quand la voix de
         Kha échoue — crédit Soynade épuisé, clé refusée, réseau coupé — le
         téléphone lit à sa place. Et comme aucun iPhone n'a de voix wolof,
         on lui donne du wolof RETOUCHÉ pour une bouche française :
         « jariñu » devient « djarignou ». Lu par une voix française
         synthétique, ça ne ressemble plus à rien de connaissable — pas au
         wolof, pas au français. Exactement ce qu'il décrit.

         Le texte, lui, n'avait rien : il vient du modèle, pas de la voix.
         C'est pour ça que l'écran était juste et la voix incompréhensible.

         MAINTENANT ÇA SE VOIT. Une panne de voix s'affiche comme une panne
         d'oreille : on ne cherche plus une heure pourquoi elle parle une
         langue inconnue. Le motif exact se lit dans /api/etat. */
      noterRouteVoixBia("erreur", locale, e);
      setPanne(`panne : sa voix — ${String(e).replace(/^Error:\s*/, "").slice(0, 100)}`);
      await prendreLaParole();
      if (!await peutParler()) return;
      /* Même règle qu'en haut : pendant une leçon, se taire vaut mieux que
         prononcer son wolof avec une bouche française. */
      if (ou === "apprentissage" || locale || essaiChatterboxActif()) { stopMouth(answer); return; }
      await parlerAvecLeTelephone(answer);
    }
  }, [contexte, reveillerLeSon, couperSon, finirAttente, jouerSouffle, noterAttente, parlerAvecLeTelephone, stopMouth]);




  const askBia = useCallback(async (question: string, parole = false, tourDonne?: number) => {
    /* Le sens de sa phrase, demandé pendant qu'on prépare la réponse et
       attendu juste avant qu'elle ouvre la bouche. Voir plus bas. */
    const clean = question.trim();
    const lectureDemandee=demandeLecture(question);
    if (lectureDemandee) {
      const precedent=lectureContinue?.texte || [...historyRef.current].reverse()
        .find(m=>m.role==="user" && m.text.trim() && !demandeLecture(m.text))?.text || "";
      const lecture=lectureDemandee.auto?lectureDemandee:demandeLecture(question,precedent)!;
      fermerConversation(); taire(); setSaisie(""); setClavier(false);
      setLectureContinue({texte:lecture.texte,nonce:Date.now(),auto:lecture.auto}); return;
    }
    if (!clean || busyRef.current) return;
    /* ── « ALLONS CORRIGER LA LISTE MAL DIT » ─────────────────────────────

       On tranche ICI, avant de partir : la phrase en cours doit voyager AVEC
       la question. Reconnu par le modèle, ça arriverait un tour trop tard —
       il répondrait « d'accord, allons-y » sans rien avoir sous les yeux, et
       Lamine croirait que ça marche.

       POUR LUI SEUL : cette liste est la sienne, sur son téléphone. Sans son
       code, on n'ouvre rien.

       Et le chantier se ferme tout seul quand il n'y a plus rien : rien ne
       sert de traîner une consigne vide dans chaque tour. */
    if (codeRef.current) {
      if (veutArreterLaListe(clean)) chantierMalDit.current = false;
      else if (veutCorrigerLaListe(clean)) chantierMalDit.current = true;
      if (chantierMalDit.current && !aCorriger().length) chantierMalDit.current = false;
    }
    /* Le micro a déjà ouvert son tour avant d'envoyer la parole à la
       transcription : on le REPREND, on n'en ouvre pas un second. Une
       question tapée, elle, ouvre le sien. */
    const monTour = tourDonne ?? ouvrirUnTour();
    busyRef.current = true;
    setSaisie("");
    setHistory((items) => [...items, { role: "user", text: clean }]);
    /* Ce qu'il vient de dire, gardé tant qu'elle réfléchit : s'il continue
       sa phrase pendant ce temps, le guetteur le recollera devant la suite
       au lieu de la laisser répondre à la moitié. Une question tapée n'a
       pas de suite à l'oral. */
    questionEnVolRef.current = parole ? clean : "";
    gesteApresRef.current = "";
    /* Un gros mot : la main sur la bouche tout de suite, pendant qu'elle
       réfléchit — c'est le moment où le visage est libre. */
    gesteImmediatRef.current = contientUnGrosMot(clean) ? "bouche_grosmot" : "";
    setMode("thinking");
    setFace("pensive");
    setPanne("");
    setAppel(null);

    /* Il a prononcé le mot « devis », « fakture », « bataaxal ». Le bouton
       s'allume tout de suite, sans attendre que BIA le décide : elle peut
       oublier sa balise, lui n'oubliera pas ce qu'il est venu chercher. */
    const evoquee = sorteEvoquee(clean);
    if (evoquee) setPapierPret((deja) => deja || evoquee);

    // Le temps où l'humain écoute est du temps gagné : elle meuble en parlant.
    // Après le micro, ce sont les transitions qui tiennent déjà la parole —
    // on ne leur superpose pas une phrase d'attente.
    toursRef.current += 1;
    if (!parole) {
      // Question tapée : le chronomètre part d'ici, sans transcription.
      departAttenteRef.current = Date.now();
      voieRef.current = "ecrit";
      tTranscritRef.current = 0;
      tModeleRef.current = 0;
      /* Tapée : il n'y a ni queue de silence ni transcription. Le tour part
         du moment où il appuie sur Entrée, et `queue_ms` vaudra zéro — ce
         qui est la vérité, pas un trou dans la mesure. */
      bornesRef.current = tourVide("ecrit");
      poserBorne(bornesRef.current, "micro");
      langueRef.current = estWolof(clean) ? "wo" : "fr";
      langueDuFil.current = langueRef.current;
      const jeton = {};
      attenteRef.current = jeton;
      stopAttenteRef.current = false;
      void attendreEnParlant(jeton, langueRef.current);
    }

    try {
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "content-type": "application/json", "x-bia-code": codeRef.current },
        body: JSON.stringify({
          message: clean,
          persona,
          /* Une fenêtre qui saute par paliers, pas qui glisse : c'est ce
             qui permet au cache du fil de retrouver son préfixe quatre tours
             sur cinq. Voir lib/fenetre-du-fil.ts. */
          history: fenetreDuFil(historyRef.current),
          /* ── LE POINT QUI CLIGNOTE, ET QU'ELLE NE VOYAIT PAS ───────────
             Lamine, le 16 septembre 2026 : « ça continue à clignoter en bas.
             Je lui ai demandé d'arrêter d'écrire, elle dit qu'elle n'écrit
             pas. » Elle disait vrai : ce point, c'est LE TÉLÉPHONE qui
             l'allume en lisant les mots de Lamine, avant même qu'elle
             réponde. Elle n'en savait rien, donc elle niait — et elle avait
             raison de nier. Elle le sait maintenant, et elle peut l'éteindre
             avec [[papier:ferme]]. */
          bouton: papierPretRef.current || "",
          /* ── LA LISTE « MAL DIT », QU'ELLE NE VOYAIT PAS ────────────────
             Elle ne part QUE si le chantier est ouvert : hors chantier, ces
             phrases n'ont rien à faire dans chaque tour, ni comme dépense ni
             comme bruit dans sa consigne. Voir lib/mal-dit.ts. */
          ...(chantierMalDit.current ? (() => {
            const liste = aCorriger();
            const premiere = liste[0];
            return { malDit: {
              reste: liste.length,
              encours: premiere ? premiere.dit : "",
              question: premiere ? premiere.question : "",
            } };
          })() : {}),
          /* Le prénom qu'elle vient d'apprendre part avec la question : elle
             le dit dans sa réponse, et c'est ce qui attache quelqu'un à une
             application. Une seule fois — après, il est dans ses notes. */
          blaguesDites: blaguesDites.current,
          dernierService: dernierService.current,
          /* Voir lib/instructions.ts : le serveur n'en tient compte que si le
             code maître est là. */
          apprend: apprend.current,
          aRepeter: aRepeter.current,
          resume: [resumeRef.current, nouveauNomRef.current
            ? `La personne vient de te dire son prénom : ${nouveauNomRef.current}. Emploie-le une fois dans ta réponse, naturellement, sans en faire trop.`
            : ""].filter(Boolean).join("\n"),
          /* Le serveur ne diffuse que si on le lui demande : une vieille
             version du téléphone continue de recevoir un seul bloc. */
          diffuse: DIFFUSER_LE_MODELE,
        }),
      });

      /* ── ELLE COMMENCE À PARLER PENDANT QU'IL ÉCRIT ─────────────────────

         Lamine, le 14 septembre 2026, à quelques heures d'une démonstration :
         « la première exigence c'est la rapidité de réaction ; s'ils la
         trouvent lente, autant utiliser ChatGPT. »

         Le texte du modèle arrive maintenant au fil de l'eau. Dès qu'il y en
         a assez pour qu'aucune substitution ne soit plus possible côté
         serveur — la règle exacte est dans lib/diffusion.ts — on envoie la
         PREMIÈRE PHRASE à la voix sans attendre la suite. Sur une réponse de
         trois phrases, elle ouvre la bouche deux à quatre secondes plus tôt.

         Le serveur garde le dernier mot : sa réponse complète arrive à la
         fin, et c'est elle qui va à l'écran, dans l'historique et dans le
         reste de ce qui suit. On ne lui dit que ce qu'elle n'a pas déjà dit.

         UNE SEULE TÊTE, PAS UN FLOT DE MORCEAUX. Le chemin d'avant sait déjà
         enchaîner les morceaux sans couture, à la milliseconde ; le refaire
         ici l'aurait dédoublé. Deux appels en tout : la tête, puis le reste. */
      let teteDite = "";
      let teteEnCours: Promise<void> | null = null;
      let statut = response.status;
      let data: { reply: string; motif?: string; emotion?: string; balise?: boolean; papier?: string; appel?: { numero: string; nom: string } | null; voir?: string; carte?: string; rireApres?: string; blague?: string; film?: { video: string; titre: string; source?: string } | null; trouve?: Resultat | null; son?: string; corrige?: boolean; toutesDites?: boolean; service?: string; source?: string; apprend?: boolean; aRepeter?: string; ordre?: string; retenu?: string; gestes?: string[]; corrigee?: string };

      if (response.headers.get("content-type")?.includes("text/event-stream") && response.body) {
        const lecteur = response.body.getReader();
        const decodeur = new TextDecoder();
        let tampon = "", recu = "";
        let fin: { corps: { reply: string; motif?: string; emotion?: string; balise?: boolean; papier?: string; appel?: { numero: string; nom: string } | null; voir?: string; carte?: string; rireApres?: string; blague?: string; film?: { video: string; titre: string; source?: string } | null; trouve?: Resultat | null; son?: string; corrige?: boolean; toutesDites?: boolean; service?: string; source?: string; apprend?: boolean; aRepeter?: string; ordre?: string; retenu?: string; gestes?: string[]; corrigee?: string }; statut: number } | null = null;
        for (;;) {
          const { done, value } = await lecteur.read();
          if (done) break;
          tampon += decodeur.decode(value, { stream: true });
          let coupe: number;
          while ((coupe = tampon.indexOf("\n\n")) >= 0) {
            const paquet = tampon.slice(0, coupe);
            tampon = tampon.slice(coupe + 2);
            const lignes = paquet.split("\n");
            const nom = lignes.find((l) => l.startsWith("event:"))?.slice(6).trim();
            const brut = lignes.find((l) => l.startsWith("data:"));
            if (!brut) continue;
            let ev: { morceau?: string; corps?: { reply: string; motif?: string; emotion?: string; balise?: boolean; papier?: string; appel?: { numero: string; nom: string } | null; voir?: string; carte?: string; rireApres?: string; blague?: string; film?: { video: string; titre: string; source?: string } | null; trouve?: Resultat | null; son?: string; corrige?: boolean; toutesDites?: boolean; service?: string; source?: string; apprend?: boolean; aRepeter?: string; ordre?: string; retenu?: string; gestes?: string[]; corrigee?: string }; statut?: number };
            try { ev = JSON.parse(brut.slice(5).trim()); } catch { continue; }
            if (nom === "texte") {
              recu += ev.morceau || "";
              /* On ne prend la parole qu'une fois, et jamais sur un tour
                 périmé : quelqu'un a pu lui couper la parole entre-temps. */
              if (!teteDite && estLeTour(monTour)) {
                const tete = teteDeLaReponse(recu);
                if (tete) {
                  teteDite = tete;
                  /* La balise d'émotion est demandée en PREMIÈRE ligne : elle
                     est donc déjà arrivée, et le souffle peut partir juste. */
                  const marque = recu.match(/\[{1,2}\s*[ée]motion\s*[:\-—]?\s*([A-Za-zÀ-ÿ_]+)\s*\]{1,2}/i);
                  if (marque) emotionRef.current = marque[1].toLowerCase()
                    .normalize("NFD").replace(/[\u0300-\u036f]/g, "");
                  /* ── LA BORNE DU MODÈLE, EN DIFFUSION ──────────────
                     Elle était posée à l'arrivée du bloc complet — donc APRÈS
                     que la tête avait déjà parlé, et donc après la fermeture
                     du tour. Elle atterrissait dans le tour SUIVANT et lui
                     donnait une durée de voix impossible : cinq secondes de
                     fabrication sur un tour qui n'en avait duré quatre.
                     C'est le défaut que les treize premiers tours ont
                     montré. Ici, c'est le bon instant : le modèle a écrit
                     assez pour qu'elle ouvre la bouche. */
                  poserBorne(bornesRef.current, "modele");
                  /* ELLE PART SUR LA TÊTE : le modèle écrit encore. C'est le
                     chantier du 15 septembre au soir, et sa deuxième question
                     — « combien de réponses partent avant la fin complète du
                     modèle ». Sans cette ligne on ferait dix tours sans
                     pouvoir y répondre. */
                  bornesRef.current.surLaTete = true;
                  teteEnCours = speak(tete, emotionRef.current);
                }
              }
            }
            if (nom === "fin" && ev.corps) fin = { corps: ev.corps, statut: Number(ev.statut) || 200 };
          }
        }
        if (!fin) throw new Error("BIA unavailable");
        data = fin.corps;
        statut = fin.statut;
      } else {
        data = (await response.json()) as { reply: string; motif?: string; emotion?: string; balise?: boolean; papier?: string; appel?: { numero: string; nom: string } | null; voir?: string; carte?: string; rireApres?: string; blague?: string; film?: { video: string; titre: string; source?: string } | null; trouve?: Resultat | null; son?: string; corrige?: boolean; toutesDites?: boolean; service?: string; source?: string; apprend?: boolean; aRepeter?: string; ordre?: string; retenu?: string; gestes?: string[]; corrigee?: string };
      }

      tModeleRef.current = Date.now();   // le modèle a fini d'écrire
      poserBorne(bornesRef.current, "modele");
      /* ── ET SI CE N'EST PLUS SON TOUR, ELLE SE TAIT ────────────────────

         La réponse du modèle peut arriver après qu'on lui a coupé la parole,
         qu'on a ouvert le clavier, ou qu'une nouvelle phrase est partie.
         Elle parlerait alors par-dessus le tour suivant, et c'est elle qui
         écrirait le dernier état — le blocage exact qu'on vient de réparer,
         par un autre chemin. Ce qui revient d'un tour périmé se jette. */
      if (!estLeTour(monTour)) return;
      /* La formulation de service qu'elle vient de servir : on la retient
         pour ne pas la resservir juste après. */
      if (data.service) dernierService.current = data.service;
      /* L'APPRENTISSAGE SUIT CE QUE DIT LE SERVEUR, jamais ce que le téléphone
         croit : lui seul a vu le code maître et lu l'ordre. */
      if (typeof data.apprend === "boolean") {
        apprend.current = data.apprend;
        setEnApprentissage(data.apprend);
      }
      if (typeof data.aRepeter === "string") {
        aRepeter.current = data.aRepeter;
        /* Le bouton suit la phrase en main, à la milliseconde. Et l'annonce
           d'un garde précédent s'efface : elle parlait d'une autre phrase. */
        setAGarder(data.aRepeter);
        // Une leçon répète uniquement le texte reçu, sans traduction générée.
        setSens(null);
        setSensCherche(false);
        setMotGarde("");
      }
      /* ── LES DEUX ORDRES QUI N'ONT RIEN À DIRE : ILS AGISSENT ──────────

         Lamine, le 17 septembre 2026 : « quand je lui demande de se taire,
         effectivement elle se tait immédiatement. Mais après quelques
         instants d'attente, elle s'est mise à répéter. »

         C'ÉTAIT MON RENVOI AUTOMATIQUE, ÉCRIT LE MATIN MÊME. Ce qu'il dit
         pendant qu'elle parle est déposé de côté, et reparti tout seul dès
         qu'elle se tait. Excellent pour une phrase qu'il a commencée par-
         dessus elle. Catastrophique pour un ORDRE : il dit « tais-toi », le
         guetteur le dépose, elle obéit et se tait — puis mon renvoi relance
         ce même « tais-toi » comme une nouvelle question. Elle obéit encore.
         Et encore. La boucle qu'il a entendue.

         UN ORDRE EXÉCUTÉ NE SE REJOUE PAS. On vide le dépôt ici, à l'instant
         où le geste prend effet. */
      if (data.ordre === "micro" || data.ordre === "silence") {
        motsRattrapesRef.current = null;
      }
      /* ── ELLE A FINI UNE PHRASE DE LA LISTE « MAL DIT » ───────────────

         Lamine, le 18 septembre 2026 : « chaque mot corrigé doit quitter la
         liste. »

         LE SERVEUR N'EFFACE RIEN : il ne possède pas la liste et ne sait pas
         où on en est entre deux tours. Il rapporte la bonne version, et c'est
         ici qu'on raye — une seule autorité sur la liste, celle qui la
         détient.

         ON GARDE LA CORRECTION AU LIEU DE JETER LA LIGNE. C'est elle qu'on
         réinjectera dans le répertoire : jeter maintenant, ce serait refaire
         le travail plus tard. Elle quitte le TRAVAIL, pas la mémoire — voir
         `aCorriger`, qui écarte tout ce qui porte déjà une correction. */
      if (data.corrigee && chantierMalDit.current) {
        const enCours = aCorriger()[0];
        if (enCours) {
          setCompteVerdicts(compterVerdicts(
            corrigerVerdict(enCours.dit, String(data.corrigee))));
          /* Plus rien à corriger : on referme, sinon sa consigne répéterait
             « la liste est vide » à chaque tour jusqu'à demain. */
          if (!aCorriger().length) chantierMalDit.current = false;
        }
      }
      if (data.ordre === "micro") { taire(); fermerConversation(); }
      if (data.ordre === "silence") taire();
      /* ── SA VOIX PART AVEC LE TEXTE, ET SEULEMENT S'IL VALIDE ───────────

         Le texte est déjà retenu par le serveur à cet instant. Le son est un
         PLUS : s'il ne part pas, la mémoire reste juste. On ne fait donc pas
         attendre la réponse pour lui, et on n'échoue pas dessus. */
      if (data.retenu && sonDeSaVoix.current) {
        const son = sonDeSaVoix.current;
        const quoi = data.retenu;
        void (async () => {
          try {
            const f = new FormData();
            f.append("texte", quoi);
            f.append("audio", son.blob, son.nom);
            await fetch("/api/memoire", {
              method: "POST", headers: { "x-bia-code": codeRef.current }, body: f,
            });
          } catch { /* le texte est gardé ; le son manquera, c'est tout */ }
        })();
      }
      if (data.ordre === "oublie" && aRepeter.current) {
        const quoi = aRepeter.current;
        void fetch(`/api/memoire?texte=${encodeURIComponent(quoi)}`, {
          method: "DELETE", headers: { "x-bia-code": codeRef.current },
        }).catch(() => { });
      }
      /* ICI SE JOUAIT LE SILENCE.
         On coupait l'attente à l'arrivée du TEXTE. Mais la voix, elle, n'est
         pas encore fabriquée : quatre à huit secondes plus tard. BIA se
         taisait donc pile au moment où il fallait tenir la conversation.
         L'attente garde la parole ; c'est speak() qui la reprendra, une fois
         le son en main. */
      if (statut === 401) {
        // Code refusé : on renvoie le testeur à l'écran d'entrée avec le motif.
        try { localStorage.removeItem("bia-code"); } catch {}
        setCode(null);
        setCodeErreur(data.reply);
        setMode("ready"); setFace("yeux_ouverts");
        await finirAttente(langueRef.current, false);
        /* ── ET ELLE LE DIT, AVEC SA VOIX ────────────────────────────────

           Un code expiré ne pouvait RIEN faire entendre : fabriquer une voix
           demande un code valide, et c'est justement le code qui manque. On
           lisait donc un texte à l'écran, sans un mot — et il n'y a pas
           pire moment pour se taire que celui où quelqu'un ne comprend pas
           pourquoi BIA ne répond plus.

           Le son vient du seau public : aucune clé n'est nécessaire. Et s'il
           n'est pas encore enregistré, on ne fait rien de plus — le texte
           reste à l'écran, comme avant. */
        if (data.son) { try { await direSonTeutFait(data.son, "concernee"); } catch { } }
        return;
      }
      if (statut >= 400) throw new Error("BIA unavailable");
      emotionRef.current = data.emotion || "neutre";
      /* Elle estime avoir de quoi écrire : c'est elle qui allume le bouton,
         et son avis vaut mieux qu'un mot-clé — elle a suivi toute la
         conversation. Le papier déjà ouvert est jeté : il date d'avant. */
      /* « mail » depuis le 15 septembre 2026 : quand elle pose la balise
         elle-même, elle peut reconnaître un mail comme les trois autres. */
      /* ── « ARRÊTE D'ÉCRIRE » ─────────────────────────────────────────────

         Lamine, le 16 septembre 2026 : « je lui ai demandé d'arrêter
         d'écrire. Elle me dit qu'elle n'écrit rien. »

         Elle n'avait AUCUN geste pour arrêter. Elle pouvait le promettre ;
         rien ne se fermait, et le papier restait là à la contredire. Elle
         pose maintenant [[papier:ferme]] et tout s'en va : le bouton qui
         propose d'écrire, le papier déjà écrit, et l'erreur s'il y en avait
         une. C'est le seul de ses gestes qui ne fabrique rien. */
      if (data.papier === "ferme") {
        setPapierPret(null);
        setPapier(null);
        papierOuvertId.current = "";
        setPapierErreur("");
      }
      if (data.papier === "facture" || data.papier === "devis" || data.papier === "lettre"
          || data.papier === "message" || data.papier === "mail") {
        setPapierPret(data.papier as Sorte);
        /* ── ELLE N'ÉCRIT PLUS RIEN SANS QU'ON LE LUI DEMANDE ────────────────

           Lamine, le 13 septembre 2026 : « il faut dire à BIA de ne rien
           écrire tant qu'on ne lui demande pas vraiment. »

           IL Y AVAIT ICI UN APPEL AU MODÈLE QU'IL N'AVAIT PAS DEMANDÉ. Quand
           le modèle estimait, au milieu d'une conversation, qu'il y avait de
           quoi écrire, la page fabriquait le papier AUSSITÔT — et fabriquer
           un papier, c'est un second appel au modèle, avec tout l'historique
           joint, donc le plus cher de l'application.

           Mon raisonnement du 10 septembre n'était pas faux : elle écrivait
           pendant qu'on écoutait sa réponse, au lieu de faire attendre dix
           secondes devant un écran vide. Ce qu'il manquait, c'était le prix.
           Chaque fois qu'elle se trompait — et elle se trompe, il l'a vu de
           ses yeux avec le bandeau rouge d'hier soir — il payait un devis que
           personne ne voulait. Le soir où son crédit est tombé à zéro, ce
           n'est plus un détail de confort.

           ELLE GARDE LE DROIT DE LE DIRE, ET ELLE LE PERD D'AGIR. Le bouton
           s'allume : c'est elle qui annonce qu'elle a de quoi écrire, et son
           avis vaut mieux qu'un mot-clé puisqu'elle a suivi la conversation.
           Mais rien ne part tant qu'un doigt ne l'a pas touché.

           Ce que ça coûte, dit franchement : une dizaine de secondes d'attente
           après l'appui, au lieu de zéro. C'est le choix qu'il fait, et c'est
           le sien — c'est son argent.

           Si un jour le crédit n'est plus un souci, la ligne à rétablir est
           celle-ci, et elle est la seule. */
        /* On ne jette PLUS le papier ouvert. Il était effacé ici, au prétexte
           qu'il datait d'avant — et c'est ce que Lamine a vu : « quand elle
           écrit un message, le prochain message le supprime. » Il reste à
           l'écran et dans sa boîte ; le nouveau viendra à côté, pas dessus. */
      }
      // Elle a un numéro à composer : le bouton s'allume jusqu'au tour suivant.
      if (data.appel?.numero) setAppel(data.appel);
      /* ELLE VEUT OUVRIR LA CARTE. On ne l'ouvre pas tout de suite : on
         cherche l'endroit, puis on le fait CONFIRMER. Le modèle n'a écrit
         qu'un nom en clair — il ne sait pas où sont les choses, et on ne lui
         demande surtout pas de coordonnées. */
      if (data.carte) void chercherLeLieu(data.carte);
      /* On retient la blague servie, pour ne pas la réentendre demain. Quand
         toutes ont servi, le serveur le dit et on repart de zéro — mieux vaut
         une blague entendue il y a longtemps que pas de blague. */
      if (data.blague) {
        blaguesDites.current = [...blaguesDites.current.filter((b) => b !== data.blague), data.blague];
        if (data.toutesDites) blaguesDites.current = [data.blague];
      }
      /* ELLE VEUT QU'ON REGARDE. Plein écran, elle se retire — le même geste
         que la carte, pour qu'il n'y ait qu'une chose à apprendre. */
      if (data.film?.video) {
        const f = data.film;
        void eclipser(() => setFilm({ sorte: "youtube", video: f.video, titre: f.titre, source: f.source }));
      }
      setPanne(data.source && data.source.startsWith("panne") ? data.source : "");
      /* D'OÙ VIENT LA RÉPONSE. Une phrase du répertoire arrive avec son son
         déjà fabriqué ; une réponse du modèle demande le modèle PUIS la voix.
         Mélanger les deux dans une médiane donnerait un chiffre qui ne décrit
         aucun des deux cas. */
      if (data.source) bornesRef.current.source = data.source;
      /* Elle a quelque chose à montrer. On ne garde que la clé du sujet : le
         fil est rangé dans la mémoire du téléphone, et des images y tiendraient
         trois échanges avant de la remplir. */
      setHistory((items) => [...items, {
        role: "bia", text: data.reply,
        /* Ses gestes voyagent avec sa phrase : c'est le seul moyen qu'elle
           sache, au tour suivant, ce qu'elle a fait au tour d'avant. */
        ...(data.gestes?.length ? { gestes: data.gestes } : {}),
        /* Et son émotion aussi, quand c'est elle qui l'a écrite. */
        ...(data.balise && data.emotion ? { emotion: data.emotion } : {}),
        ...(data.voir ? { voir: data.voir } : {}),
        ...(data.trouve?.pieces?.length ? { trouve: data.trouve } : {}),
        /* Une phrase resservie telle qu'il l'a corrigée porte la même marque
           que s'il venait de la corriger : il doit VOIR que son travail sert,
           et pouvoir la retoucher encore. */
        ...(data.corrige ? { corrige: true } : {}),
      }]);

      /* PAF. L'écran s'ouvre de lui-même : c'est tout l'intérêt — elle parle,
         et la chose apparaît. On replie le clavier d'abord, sinon il couvre
         justement la moitié basse de l'écran où les images vont se poser. */
      if (data.trouve?.pieces?.length) {
        setClavier(false);
        montrerSurEcran(versEcran(data.trouve));
      } else if (data.voir) {
        void chargerSujet(data.voir).then((vu) => {
          if (vu) { setClavier(false); montrerSurEcran(vu); }
        });
      }
      // Répétition fidèle : aucun sens généré ne se greffe à sa parole.
      let aDire = data.reply;


      // Le visage prend l'émotion tout de suite, avant même la voix : c'est
      // ce qui donne l'impression qu'elle réagit à ce qu'on lui a dit.
      const suite = SUITES[emotionRef.current];
      if (!suite) setFace(EMOTION_VERS_FACE[emotionRef.current] || "yeux_ouverts");
      /* Une réponse du répertoire arrive avec son son déjà fabriqué : on le
         joue tel quel. Si le fichier manque — seau vidé, réseau coupé — on
         retombe sur la synthèse ordinaire plutôt que de rester muette. */
      /* Si c'était une salutation, le tour SUIVANT commencera par « d'accord,
         je vois ça » — quoi qu'on lui dise. Posé ici, avant de jouer le son :
         c'est le serveur qui l'a dit, il n'y a rien à deviner. */
      if ((data as { salutation?: boolean }).salutation) apresSalutationRef.current = true;
      /* Le geste de la main qui va avec cette phrase, joué quand la bouche
         aura fini (voir stopMouth et lib/gestes-de-la-main.ts). */
      { const g = String((data as { geste?: string }).geste || ""); gesteApresRef.current = g in CYCLES ? (g as keyof typeof CYCLES) : ""; }
      /* ── ELLE A DÉJÀ COMMENCÉ : ON NE LUI FAIT DIRE QUE LA SUITE ───────

         La tête est partie pendant que le modèle écrivait. Ce qui reste, on
         l'obtient en retirant de la réponse ce qui est déjà sorti de sa
         bouche — et on attend qu'elle ait fini avant d'enchaîner, sinon le
         second son couvrirait le premier.

         Le son enregistré ne peut pas arriver ici : il vient d'une étiquette,
         et une étiquette ne dépasse jamais le seuil. La garde est là quand
         même, parce qu'un jour ce sera peut-être faux. */
      if (teteDite && !data.son) {
        if (teteEnCours) await teteEnCours;
        if (!estLeTour(monTour)) return;
        const reste = resteADire(data.reply, teteDite);
        if (reste) await speak(reste, undefined, "réponse", true);
      } else if (data.son && !essaiChatterboxActif() && !voixLocaleBiaDisponible(personaRef.current)) {
        try {
          await direSonTeutFait(data.son, emotionRef.current);
          /* ── ELLE RIT APRÈS LA CHUTE, PAS AVANT ────────────────────────

             L'ordre n'est pas un détail : rire avant la chute, c'est la
             vendre ; rire après, c'est la partager. direSonTeutFait joue
             l'émotion AVANT le son — c'est juste pour une réponse, faux pour
             une blague. Le rire d'une blague vient donc ici, une fois qu'elle
             a fini de parler.

             Et il ne coûte rien : c'est un enregistrement de la vraie voix de
             Kha, déjà dans public/sons/. */
          if (data.rireApres) await jouerSouffle(data.rireApres);
        }
        catch { if (!estLeTour(monTour)) return; await speak(aDire, emotionRef.current, data.apprend ? "apprentissage" : "réponse"); }
      } else {
        if (!estLeTour(monTour)) return;
        await speak(aDire, emotionRef.current, data.apprend ? "apprentissage" : "réponse");
      }
    } catch {
      if (!estLeTour(monTour)) return;
      emotionRef.current = "concernee";
      const fallback = "Jokkoo bi am na jafe-jafe. Jéemal beneen yoon.";
      setHistory((items) => [...items, { role: "bia", text: fallback }]);
      setFace("concernee");
      setMode("error");
      await speak(fallback);
    } finally {
      if (estLeTour(monTour)) {
        busyRef.current = false;
        questionEnVolRef.current = "";
      }
    }
  }, [speak, attendreEnParlant, finirAttente, ouvrirUnTour, estLeTour, lectureContinue]);

  /* LE TEXTE FRANÇAIS QU'ON COLLE, DIT EN WOLOF.

     Lamine, le 10 septembre 2026 : « elle doit pouvoir aussi copier un
     message qui parle français, le coller, pour que ça soit traduit en wolof
     à haute voix ».

     C'est le pendant du message qu'elle écrit. Là, quelqu'un qui parle très
     bien mais lit mal le français reçoit un SMS de sa banque, de l'école, de
     l'hôpital — et il attend le soir que quelqu'un le lui lise. Ici il colle,
     et il entend.

     Ça ne passe PAS par la conversation : /api/chat lui répondrait en
     français, puisqu'on lui écrit en français. C'est un chemin à part, où
     elle ne répond pas et ne conseille pas — elle lit. */
  const lireTexteColle = useCallback(async (brut: string) => {
    const texte = brut.trim();
    if (!texte || busyRef.current) return;
    busyRef.current = true;
    setSaisie("");
    setHistory((items) => [...items, { role: "user", text: texte }]);
    setMode("thinking");
    setFace("pensive");
    setPanne("");
    langueRef.current = "wo";
    departAttenteRef.current = Date.now();
    voieRef.current = "ecrit";
    tTranscritRef.current = 0;
    tModeleRef.current = 0;

    try {
      const r = await fetch("/api/traduire", {
        method: "POST",
        headers: { "content-type": "application/json", "x-bia-code": codeRef.current },
        body: JSON.stringify({ texte }),
      });
      const d = await r.json() as { wolof?: string; erreur?: string };
      tModeleRef.current = Date.now();
      if (!r.ok || !d.wolof) {
        setPanne("Le texte n'a pas pu être lu. Réessaie.");
        setMode("ready"); setFace("yeux_ouverts");
        return;
      }
      emotionRef.current = "neutre";
      setHistory((items) => [...items, { role: "bia", text: d.wolof as string }]);
      setFace("yeux_ouverts");
      speak(d.wolof, undefined, "lecture");
    } catch {
      setPanne("Pas de réseau.");
      setMode("error");
    } finally {
      busyRef.current = false;
    }
  }, [speak]);

  /* ── PHOTOGRAPHIER UN PAPIER ────────────────────────────────────────────

     Lamine, le 10 septembre 2026 : « BIA doit être capable de photographier
     un document, pour le traduire à haute voix en wolof, ou pour le scanner
     et le garder. »

     C'est le même service que le texte collé, mais pour ce qui arrive sur du
     papier — et ici presque tout arrive sur du papier. Une convocation, une
     ordonnance, un bulletin, une facture, une lettre d'huissier. Aujourd'hui
     la personne attend le soir que quelqu'un le lui lise, et parfois elle
     n'ose pas demander.

     LA PHOTO EST RÉDUITE AVANT DE PARTIR. Un téléphone récent sort des images
     de quatre à huit méga-octets ; envoyées telles quelles depuis Dakar, elles
     mettent une minute et coûtent cher en données. Réduites à 1600 pixels,
     elles pèsent quelques centaines de kilo-octets et le texte reste
     parfaitement lisible — c'est la résolution que le modèle regarde de toute
     façon. */
  /* CE QUI L'EMPÊCHAIT DE LIRE UNE CAPTURE D'ÉCRAN — et c'était mon erreur.

     Je réduisais l'image à 1600 pixels sur son PLUS GRAND côté. Sur une photo
     posée à plat, ça ne fait rien. Sur une capture d'écran de téléphone, qui
     fait deux fois et demie plus haut que large, la largeur tombait à sept
     cents pixels : un texte écrit en douze points devenait haut de cinq
     pixels, une bouillie. Elle recevait bien l'image, et elle avait raison de
     dire qu'elle n'y voyait rien.

     Le modèle, de son côté, ramène de toute façon toute image à 1568 pixels
     sur son plus grand côté. Envoyer plus haut ne sert donc à rien : c'est la
     HAUTEUR qu'il faut réduire, pas la largeur.

     D'où le découpage. Une image haute est coupée en bandes qui se recouvrent,
     chacune assez basse pour passer entière sans être rétrécie. La largeur —
     donc la finesse du texte — est préservée. Le serveur les recolle en un
     seul document.

     Et le fond est peint en blanc avant le dessin : une capture au format PNG
     peut avoir des zones transparentes, qui deviennent NOIRES en JPEG. C'est
     l'autre façon dont une image « devient sombre » sans que personne n'y
     comprenne rien. */
  const decouperPhoto = (fichier: File): Promise<{ images: string[]; type: string }> =>
    new Promise((resolve, reject) => {
      const lecteur = new FileReader();
      lecteur.onerror = () => reject(new Error("lecture"));
      lecteur.onload = () => {
        const img = new Image();
        img.onerror = () => reject(new Error("image"));
        img.onload = () => {
          const LARGEUR = 1400;   // la finesse du texte tient à celle-ci
          const HAUTEUR = 1500;   // sous la limite du modèle, jamais rétrécie
          const RECOUVREMENT = 0.08;

          const echelle = Math.min(1, LARGEUR / img.width);
          const l = Math.max(1, Math.round(img.width * echelle));
          const hTotale = Math.max(1, Math.round(img.height * echelle));

          const bandes = Math.min(4, Math.max(1, Math.ceil(hTotale / HAUTEUR)));
          const pas = bandes === 1 ? hTotale : Math.ceil(hTotale / bandes);
          const marge = bandes === 1 ? 0 : Math.round(pas * RECOUVREMENT);

          const images: string[] = [];
          for (let i = 0; i < bandes; i++) {
            const haut = Math.max(0, i * pas - (i ? marge : 0));
            const bas = Math.min(hTotale, (i + 1) * pas + (i < bandes - 1 ? marge : 0));
            const h = bas - haut;
            if (h <= 0) continue;

            const toile = document.createElement("canvas");
            toile.width = l; toile.height = h;
            const ctx = toile.getContext("2d");
            if (!ctx) { reject(new Error("toile")); return; }
            // Le fond blanc : sans lui, une capture transparente vire au noir.
            ctx.fillStyle = "#ffffff";
            ctx.fillRect(0, 0, l, h);
            ctx.drawImage(img, 0, haut / echelle, img.width, h / echelle, 0, 0, l, h);
            const url = toile.toDataURL("image/jpeg", 0.9);
            images.push(url.slice(url.indexOf(",") + 1));
          }
          if (!images.length) { reject(new Error("vide")); return; }
          resolve({ images, type: "image/jpeg" });
        };
        img.src = String(lecteur.result || "");
      };
      lecteur.readAsDataURL(fichier);
    });

  const lirePapierPhoto = useCallback(async (fichier: File) => {
    if (busyRef.current) return;
    busyRef.current = true;
    setPhotoOccupe(true);
    setPanne("");
    setMode("thinking");
    setFace("pensive");
    langueRef.current = "wo";
    departAttenteRef.current = Date.now();
    voieRef.current = "ecrit";
    tTranscritRef.current = 0;
    tModeleRef.current = 0;

    try {
      const { images, type } = await decouperPhoto(fichier);
      const r = await fetch("/api/papier-photo", {
        method: "POST",
        headers: { "content-type": "application/json", "x-bia-code": codeRef.current },
        body: JSON.stringify({ images, type }),
      });
      const d = await r.json() as { sorte?: string; titre?: string; francais?: string; wolof?: string; erreur?: string };
      tModeleRef.current = Date.now();
      if (!r.ok || !d.wolof) {
        setPanne(d.erreur === "photo trop lourde"
          ? "L'image est trop lourde. Reprends-la d'un peu plus loin."
          : "L'image n'a pas pu être lue. Réessaie.");
        setMode("ready"); setFace("yeux_ouverts");
        return;
      }

      /* LE FRANÇAIS EST GARDÉ, PAS SEULEMENT DIT. C'est la trace du papier :
         elle reste dans le fil, sur l'appareil, sous le nom de la personne —
         relisible, corrigeable, et prête à devenir un message ou une lettre.
         Ne garder que le wolof reviendrait à perdre le document. */
      const marque = d.sorte === "image" ? "🖼" : "📄";
      const trace = [d.titre ? `${marque} ${d.titre}` : `${marque} Image`, d.francais]
        .filter(Boolean).join("\n\n");
      setHistory((items) => [...items, { role: "user", text: trace }, { role: "bia", text: d.wolof as string }]);
      emotionRef.current = "neutre";
      setFace("yeux_ouverts");
      speak(d.wolof, undefined, "lecture");
    } catch {
      setPanne("La photo n'a pas pu être envoyée.");
      setMode("error");
    } finally {
      setPhotoOccupe(false);
      busyRef.current = false;
    }
  }, [speak]);

  /* Pendant qu'elle réfléchit, le visage ne doit pas se figer — mais il ne
     doit pas s'agiter non plus.

     La première version enchaînait neuf images en cinq secondes, dans le même
     ordre à chaque tour : un changement toutes les six dixièmes de seconde,
     toujours le même. Ça ne donnait pas une présence, ça donnait une machine.

     Quelqu'un qui réfléchit tient son visage plusieurs secondes, puis fait un
     geste, puis se repose encore. On alterne donc de longs repos — deux et
     demie à cinq secondes — avec un seul geste à la fois, tiré au hasard. Le
     clignement, lui, reste rapide : c'est sa nature. */
  useEffect(() => {
    if (mode !== "thinking") return;
    let vivant = true;
    let minuterie: ReturnType<typeof setTimeout>;

    const entre = (a: number, b: number) => a + Math.random() * (b - a);

    function poser(visage: Face, duree: number, suite: () => void) {
      setFace(visage);
      minuterie = setTimeout(() => { if (vivant) suite(); }, duree);
    }

    function repos() {
      poser("pensive", entre(2600, 5200), geste);
    }

    /* Un mouvement de quatre images, une à la fois, puis la suite. */
    function enchainer(noms: readonly Face[], i: number, puis: () => void) {
      if (i >= noms.length) { puis(); return; }
      poser(noms[i], PAS_DU_CYCLE, () => enchainer(noms, i + 1, puis));
    }
    const debut = Date.now();

    function geste() {
      const tirage = Math.random();
      if (planchesPretesRef.current) {
        if (gesteImmediatRef.current) {
          const g = gesteImmediatRef.current; gesteImmediatRef.current = "";
          enchainer(CYCLES[g], 0, repos);
          return;
        }
        /* Avec les planches suivantes : elle réfléchit, elle écoute, et si
           l'attente s'étire au-delà de quatre secondes, la paume ouverte —
           « un instant ». Le retour au repos passe par la dernière image du
           cycle, proche du visage calme. */
        const longue = Date.now() - debut > 4000;
        if (longue && tirage < 0.35) enchainer(CYCLES.paume, 0, repos);
        else if (tirage < 0.55) enchainer(CYCLES.reflexion, 0, repos);
        else if (tirage < 0.85) enchainer(CYCLES.ecoute, 0, repos);
        else poser("yeux_mi", 130, () => poser("yeux_fermes", 170, () => poser("yeux_mi", 120, repos)));
        return;
      }
      if (tirage < 0.42) {
        // Un regard qui glisse, et qui revient sans se presser.
        poser("regard_cote", entre(1400, 2400), repos);
      } else if (tirage < 0.72) {
        poser("yeux_mi", 130, () => poser("yeux_fermes", 170, () => poser("yeux_mi", 120, repos)));
      } else {
        poser("ecoute", entre(1800, 3000), repos);
      }
    }

    /* Avec les planches, le premier mouvement part tout de suite : l'attente
       fait rarement plus de quelques secondes, et c'est le début qu'il faut
       occuper. Sans elles, comme avant : un repos d'abord. */
    if (planchesPretesRef.current) geste(); else repos();
    return () => { vivant = false; clearTimeout(minuterie); };
  }, [mode]);

  /* Les quatre paroles d'attente sont mises en mémoire dès l'entrée du code,
     pendant que personne ne demande rien. La partie 1 part à l'instant où le
     micro se coupe : elle doit être là, pas en train de se fabriquer.

     Si les fichiers de public/sons/attente/ existent, ça ne coûte rien du
     tout — c'est un simple téléchargement. Sinon on les synthétise une fois
     pour la session, et on garde la voix en mémoire. */
  useEffect(() => {
    if (!code) return;
    let vivant = true;
    void (async () => {
      for (const langue of ["wo", "fr"] as const) {
        if (essaiChatterboxActif()) return;
        for (const parole of A_FABRIQUER) {
          if (!vivant) return;
          try { await audioParole(parole, langue); } catch { return; }
        }
      }
    })();
    return () => { vivant = false; };
  }, [code, audioParole]);

  /* ── ET LES SONS DU RÉPERTOIRE QUI OUVRENT ET FERMENT LES CONVERSATIONS ──

     Mesuré le 19 septembre 2026 : 2,5 s pour aller chercher un son dans le
     seau la première fois. Le « salut » d'ouverture arrivait donc en 6 s.
     Après le code, on demande la liste (une vingtaine d'adresses, voir
     CLES_A_PRECHAUFFER) et on range dans bia-sons-v1 ce qui n'y est pas
     encore — un par un, sans presser, et pas dans la mémoire vive : ce
     n'est pas pour tout de suite, c'est pour le jour où on en aura besoin.
     Le cache garde d'une ouverture à l'autre : ça ne coûte qu'une fois par
     appareil. Ce que ça a coûté et servi se lit sur /api/etat → prechauffage. */
  useEffect(() => {
    if (!code) return;
    let vivant = true;
    void (async () => {
      /* On laisse passer les paroles d'attente (ci-dessus) et la salutation
         d'ouverture : elles passent avant. */
      if (essaiChatterboxActif()) return;
      await new Promise((r) => setTimeout(r, 4000));
      if (!vivant) return;
      const bilan = { demandes: 0, deja_la: 0, chargees: 0, ratees: 0, ms: 0, octets: 0 };
      const debut = Date.now();
      try {
        const liste = await (await fetch("/api/repertoire/prechauffer", { cache: "force-cache" })).json() as { sons?: Array<{ adresse: string }> };
        const boite = await caches.open("bia-sons-v1").catch(() => null);
        if (!boite) return;
        for (const { adresse } of liste.sons || []) {
          if (!vivant) return;
          bilan.demandes += 1;
          try {
            if (await boite.match(adresse)) { bilan.deja_la += 1; continue; }
            const r = await fetch(adresse);
            if (!r.ok) { bilan.ratees += 1; continue; }
            bilan.octets += Number(r.headers.get("content-length")) || 0;
            await boite.put(adresse, r);
            bilan.chargees += 1;
          } catch { bilan.ratees += 1; }
        }
      } catch { /* pas de réseau, pas de liste : rien à préchauffer */ }
      bilan.ms = Date.now() - debut;
      if (bilan.demandes) void fetch("/api/mesure", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ type: "prechauffage", ...bilan }), keepalive: true }).catch(() => { });
    })();
    return () => { vivant = false; };
  }, [code]);

  /* ── ELLE SALUE À L'OUVERTURE, ET DIT « JE SUIS LÀ » ────────────────────

     Lamine, le 12 septembre 2026 : « dès qu'on ouvre l'application elle doit
     saluer et dire je suis là. »

     RIEN À ENREGISTRER : la phrase existe déjà, payée et relue. #salut dit
     exactement « Salaamualeekum. Maa ngi fi. » — « Bonjour. Je suis là. » Et
     #bonsoir dit « Naka tay ? Maa ngi thi Diam ». Le choix se fait sur
     l'heure de Dakar.

     ── POURQUOI AU PREMIER TOUCHER, ET PAS À L'AFFICHAGE ──────────────────

     Parce qu'aucun navigateur n'autorise le son avant un geste de la
     personne — c'est la règle, pas un réglage, et elle est la plus stricte
     sur iPhone. « Dès qu'on ouvre » est donc impossible à tenir : elle
     serait muette une fois sur deux, et on croirait à une panne. Le premier
     doigt posé sur l'écran, lui, arrive de toute façon dans la seconde. À
     l'usage c'est le même geste ; à la différence près que ça marche.

     ── ET ÇA ANNULE UNE RÈGLE, QU'IL A LUI-MÊME CHANGÉE ───────────────────

     Le 9 septembre : « BIA ne parle jamais la première ». Le mot d'accueil
     parlé avait été retiré pour ça, et il ne restait que l'écrit. Le
     12 septembre il demande l'inverse. C'est son application ; c'est écrit
     ici pour qu'on sache que ce n'est pas un oubli.

     UNE SEULE FOIS PAR SÉANCE. On ouvre une application vingt fois par
     jour : saluer à chaque retour de l'écran d'accueil deviendrait une
     sonnerie. La séance, c'est cette page-ci tant qu'elle n'est pas
     rechargée. */
  const salueRef = useRef(false);
  useEffect(() => {
    const reveiller = () => {
      contexte();
      if (essaiChatterboxActif()) return;
      if (salueRef.current || !code) return;
      salueRef.current = true;
      /* Elle ne coupe jamais la parole à personne : si elle est déjà en
         train de parler ou d'écouter, on laisse tomber la salutation. */
      if (mode !== "ready") return;
      const h = new Date().getHours();
      const cle = h >= 5 && h < 17 ? "salut" : "bonsoir";
      /* .mp3, et octetsDuRepertoire retombe seul sur le .wav. Si rien ne
         vient, on ne dit rien et on ne se plaint pas : un accueil raté ne
         doit pas être la première chose qu'on voit de BIA. */
      const ou = adresseDuSonRef.current?.(cle, "wo") || "";
      if (!ou) return;
      void direSonTeutFait(ou).catch(() => { });
    };
    window.addEventListener("pointerdown", reveiller);
    window.addEventListener("touchstart", reveiller, { passive: true });
    return () => {
      window.removeEventListener("pointerdown", reveiller);
      window.removeEventListener("touchstart", reveiller);
    };
  }, [contexte, code, mode, direSonTeutFait]);

  /* Le verrou du micro ne doit jamais rester coincé. Si BIA reste « en train
     de réfléchir ou de parler » au-delà de trois minutes, c'est que quelque
     chose s'est perdu en route : on rouvre le micro plutôt que de laisser la
     personne devant un bouton mort. */
  useEffect(() => {
    if (mode !== "thinking" && mode !== "speaking") return;
    const secours = setTimeout(() => setMode("ready"), 180000);
    return () => clearTimeout(secours);
  }, [mode]);

  /* ── LE JOURNAL DES ÉTATS ────────────────────────────────────────────────

     Demandé à la relecture du 12 septembre au soir, et c'est juste : « si ça
     bloque, on saura immédiatement quel état n'a pas été quitté. »

     Une console ne se lit pas sur un téléphone, alors le journal vit AUSSI
     dans la page : les quarante derniers changements, avec le numéro du tour
     et l'horloge, sur `window.biaEtats`. On le récupère en branchant le
     téléphone au Mac, ou en le recopiant. Trois lignes suffisent pour savoir
     quel état est resté coincé, au lieu de le déduire d'un récit. */
  useEffect(() => {
    const lieu = window as typeof window & { biaEtats?: string[] };
    const ligne = `[tour ${numeroDuTourRef.current}] ${new Date().toLocaleTimeString("fr-FR")} → ${mode}${conversation ? " (conversation)" : ""}`;
    lieu.biaEtats = [...(lieu.biaEtats || []).slice(-39), ligne];
    console.log(`BIA ${ligne}`);
  }, [mode, conversation]);

  /* ── LE FILET COURT : « ELLE RÉFLÉCHIT » SANS RIEN EN VOL ────────────────

     Trois minutes, c'était le filet d'un temps où un appui valait une phrase :
     le bouton restait là, et on rappuyait. En conversation continue, il n'y a
     plus de bouton à rappuyer — le micro se rouvre tout seul au retour au
     repos, ou jamais. Trois minutes de micro mort devant quelqu'un, c'est une
     panne, pas un filet.

     Alors on se donne un signe SÛR d'état coincé, au lieu d'attendre. Quand
     elle réfléchit pour de vrai, un jeton d'attente est posé (`attenteRef`) et
     il vit jusqu'à ce que la réponse arrive. « Elle réfléchit » SANS jeton, ce
     n'est pas une réflexion : c'est un tour qui s'est perdu.

     Deux secondes et demie de marge, parce qu'il y a un battement entre le
     `setMode("thinking")` et la pose du jeton, et qu'un faux positif ici
     rouvrirait le micro pendant qu'elle parle. C'est déclenché par le
     changement d'état, pas par une horloge qui tourne : ça ne coûte rien. */
  useEffect(() => {
    if (!conversation || mode !== "thinking") return;
    const filet = setTimeout(() => {
      if (!conversationRef.current || attenteRef.current) return;
      /* Et pas pendant qu'une voix de secours parle : entre l'appel et son
         `onstart`, l'état est encore « réfléchit », et rouvrir le micro là
         serait l'ouvrir sur sa propre phrase. */
      if (voixDuTelephoneRef.current) return;
      setMode("ready");
      setFace("yeux_ouverts");
    }, 2500);
    return () => clearTimeout(filet);
  }, [conversation, mode]);

  /* ── ET UNE PANNE NE DOIT PAS TUER LA CONVERSATION ──────────────────────

     « error » ne relance rien, volontairement : après un échec, le bouton
     reste à la personne. C'est juste quand elle a un bouton sous les yeux.
     En conversation, ce même choix rend le micro définitivement muet pour un
     seul paquet réseau perdu — et il y en aura, sur un téléphone à Dakar.

     On redonne donc le micro après trois secondes. Une phrase perdue est un
     incident ; un micro mort au milieu d'une démonstration, c'en est un
     autre. Le témoin a eu le temps de montrer la panne. */
  useEffect(() => {
    if (!conversation || mode !== "error") return;
    const reprise = setTimeout(() => {
      if (!conversationRef.current) return;
      setMode("ready");
      setFace("yeux_ouverts");
    }, 3000);
    return () => clearTimeout(reprise);
  }, [conversation, mode]);

  // Clignement des yeux au repos.
  useEffect(() => {
    /* Un clignement franc paraît mécanique. Trois images descendantes puis
       trois remontantes, et un regard qui glisse de temps en temps, suffisent
       à donner l'impression d'une présence plutôt que d'une photo. */
    const minuteries: Array<ReturnType<typeof setTimeout>> = [];
    const timer = setInterval(() => {
      if (mode !== "ready") return;
      const suite: Array<[Face, number]> = Math.random() < 0.22
        ? [["regard_cote", 1600], ["yeux_ouverts", 0]]
        : [["yeux_mi", 110], ["yeux_fermes", 150], ["yeux_mi", 110], ["yeux_ouverts", 0]];
      let t = 0;
      for (const [f, d] of suite) {
        minuteries.push(setTimeout(() => setFace(f), t));
        t += d;
      }
    }, 5600);
    return () => { clearInterval(timer); minuteries.forEach(clearTimeout); };
  }, [mode]);


  /* ── L'ADRESSE D'UN SON ENREGISTRÉ, AVEC SON EMPREINTE ──────────────────────

     Lamine, le 13 septembre 2026 : « tout doit provenir des messages déjà
     enregistrés, parce qu'on a déjà payé pour ça. »

     Quatre endroits de cette page bâtissaient cette adresse À LA MAIN — la
     salutation d'ouverture, « d'accord je vois ça », « je n'ai pas compris »,
     et le guidage sur la carte. Aucun ne passait par sonDe(), donc aucun ne
     portait l'empreinte du texte.

     Or les sons sont rangés dans le cache du téléphone sous une adresse
     déclarée IMMUABLE. Ses onze corrections d'hier soir touchent « salut » et
     « bonsoir » — précisément la salutation d'ouverture. Sans empreinte, il
     aurait repayé l'enregistrement et entendu l'ancienne version pour
     toujours, sans que rien ne le signale.

     Un seul endroit, maintenant. Et si le serveur n'a pas envoyé la table,
     on rend l'adresse nue : on ne se tait jamais faute d'empreinte. */
  const adresseDuSon = useCallback((cle: string, langue: "wo" | "fr") => {
    const rep = (moteursRef.current as {
      repertoire?: { base_sons?: Record<string, string>; empreintes?: Record<string, string> };
    } | null)?.repertoire;
    const base = rep?.base_sons?.[langue] || "";
    if (!base) return "";
    const v = rep?.empreintes?.[`${langue}/${cle}`];
    return `${base}${cle}.mp3${v ? `?v=${v}` : ""}`;
  }, []);
  adresseDuSonRef.current = adresseDuSon;

  const arreterEnregistrement = useCallback(() => {
    const e = enregistreurRef.current;
    if (e && e.state !== "inactive") e.stop();
  }, []);

  /* Le micro de BIA se comporte comme celui de BIBA : une fois ouvert, il
     attend une voix aussi longtemps qu'il faut ; dès que quelqu'un a parlé,
     il se ferme deux secondes après le dernier son. Un second appui conclut
     tout de suite. */
  /* ── LE MICRO DE LA CONVERSATION ────────────────────────────────────────

     Ouvert une fois, gardé jusqu'à ce qu'on referme la conversation vocale.
     `getUserMedia` coûte un à trois dixièmes de seconde et rallume la
     pastille rouge du téléphone : le refaire à chaque phrase, c'était payer
     ça dix fois dans une conversation.

     Et c'est ce qui rend possible de lui couper la parole : pour l'entendre
     pendant qu'elle parle, il faut que le micro soit ouvert à ce moment-là. */
  const micro = useCallback(async () => {
    /* La parole de BIA vit sur le contexte partagé ; on le réveille au
       passage, parce qu'on est ici dans un geste de la personne — c'est le
       seul moment où un téléphone accepte de débloquer le son. */
    const ctxParole = contexte();
    if (ctxParole.state === "suspended") { try { await ctxParole.resume(); } catch { } }

    /* ── ON ARME AUSSI LA VOIX DE SECOURS, ET C'EST ICI OU JAMAIS ──────────

       Lamine, le 15 septembre 2026 : « elle dit seulement les mots
       préenregistrés. » Le crédit Soynade était épuisé — ça, il l'avait
       trouvé — mais la voix du téléphone, qui devait prendre le relais, ne
       disait rien non plus. Les enregistrements du répertoire passaient,
       parce qu'eux sont des fichiers audio ; tout ce qui devait être
       PRONONCÉ était muet.

       LA CAUSE. Sur iPhone, `speechSynthesis` refuse en silence tant qu'on ne
       l'a pas réveillée pendant un geste de la personne — exactement comme le
       contexte audio juste au-dessus. Or dans tout ce fichier il y a cinq
       `cancel()` et un seul `speak()`, et ce `speak()` arrive toujours au
       fond d'une réponse, jamais sous son doigt. Le filet de secours n'avait
       donc jamais été armé, et personne ne s'en était aperçu : il ne sert que
       les jours où Soynade tombe, et ces jours-là on croyait que c'était
       Soynade.

       Une phrase vide et sans volume suffit à le réveiller. Elle ne s'entend
       pas, elle ne coûte rien, et elle ne se fait qu'une fois. */
    if (!essaiChatterboxActif() && !voixDuTelephoneArmee.current && typeof window !== "undefined" && "speechSynthesis" in window) {
      voixDuTelephoneArmee.current = true;
      try {
        const reveil = new SpeechSynthesisUtterance(" ");
        reveil.volume = 0;
        window.speechSynthesis.speak(reveil);
      } catch { /* pas de voix sur cet appareil : le répertoire suffira */ }
    }

    /* ── ET ON RÉVEILLE AUSSI NOTRE MOTEUR, PENDANT QU'ON NE LUI DOIT ENCORE
       RIEN ────────────────────────────────────────────────────────────────

       Demande du 25 septembre 2026 : que notre moteur (RunPod) réponde
       aussi vite que Soynade. Mesuré ce jour-là : une fois chaude, la
       machine tient déjà la comparaison -- tout l'écart, c'est le réveil
       (~90 s la première fois, ou après une pause). On le lance donc ici,
       à l'ouverture du micro, sans l'attendre : le temps que la personne
       parle, que la transcription arrive et que le modèle réponde est
       souvent suffisant pour absorber une partie du réveil. */
    if (!essaiChatterboxActif() && !voixLocaleBiaDisponible(personaRef.current) && Date.now() - dernierReveilMoteur.current > 480_000) {
      dernierReveilMoteur.current = Date.now();
      fetch("/api/voix/reveil", { method: "POST" }).catch(() => { /* tant pis, le premier appel de voix paiera le réveil */ });
    }

    /* ── L'ANALYSEUR A SON PROPRE CONTEXTE, POUR LA PASTILLE ORANGE ──────
       Le pourquoi est écrit en tête de lib/micro.ts, section 6. En deux
       mots : un contexte qui a reçu une source micro garde la pastille
       allumée sur iPhone tant qu'il n'est pas fermé, et celui de la parole
       ne se ferme jamais. */
    const ctxMicro = MICRO_SUR_SON_PROPRE_CONTEXTE
      ? (ctxMicroRef.current && ctxMicroRef.current.state !== "closed"
        ? ctxMicroRef.current
        : (ctxMicroRef.current = new (window.AudioContext
          || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)()))
      : ctxParole;
    if (ctxMicro.state === "suspended") { try { await ctxMicro.resume(); } catch { } }

    /* ── ON NE REPREND PAS UN FLUX QUI A L'AIR VIVANT ──────────────────

       Lamine, le 18 septembre 2026 : « quand j'ouvre appareil photo, ou
       message, si je reviens, le micro se désactive. »

       iOS reprend le micro quand on quitte l'application. Il a deux façons
       de le faire, et l'une des deux ne se voyait pas : la piste est COUPÉE
       au lieu d'être terminée. Le flux reste alors ACTIF, l'analyseur reste
       branché, tout a l'air normal — et il ne rend que du silence. BIA
       attendait une voix qui ne viendrait jamais.

       `active` ne suffit donc plus : on demande aux pistes. Voir
       fluxVivant() dans lib/micro.ts, section 7. */
    if (fluxVivant(fluxRef.current) && analyseRef.current && analysePeriodiqueRef.current) {
      return { flux: fluxRef.current!, analyse: analyseRef.current, analysePeriodique: analysePeriodiqueRef.current, ctxMicro };
    }
    /* Mort, mais encore branché : on débranche proprement avant d'en
       reprendre un neuf, sinon l'ancien analyseur survit dans le contexte. */
    if (fluxRef.current) { debrancherMicroRef.current?.(); debrancherMicroRef.current = null; }

    /* Les trois réglages demandés par Lamine — écho, bruit, volume. Le
       navigateur les honore quand il sait et les ignore sans se plaindre
       quand il ne sait pas ; dans ce cas on garde un micro qui marche, ce qui
       vaut mieux qu'une exception. */
    let flux: MediaStream;
    try { flux = await navigator.mediaDevices.getUserMedia(REGLAGES_DU_MICRO); }
    catch { flux = await navigator.mediaDevices.getUserMedia({ audio: true }); }

    const analyse = ctxMicro.createAnalyser();
    analyse.fftSize = 512;
    /* fftSize 2048 : tampon temporel de 1024 échantillons, largement
       suffisant pour l'autocorrélation de hauteurDeVoix() jusqu'à 70Hz. */
    const analysePeriodique = ctxMicro.createAnalyser();
    analysePeriodique.fftSize = 2048;
    const entree = ctxMicro.createMediaStreamSource(flux);
    entree.connect(analyse);
    entree.connect(analysePeriodique);

    /* ── ET ELLE PRÉVIENT QUAND ELLE MEURT ────────────────────────────

       Au lieu d'attendre le prochain tour pour s'apercevoir que le micro
       est mort, on écoute la piste elle-même. « ended » et « mute » sont
       les deux façons dont le téléphone reprend le micro — un appel, une
       alarme, l'appareil photo, Siri, ou simplement quelques minutes
       d'arrière-plan.

       On se contente d'INVALIDER : la boucle de réouverture, elle, sait
       déjà quand il est permis de reprendre un micro. Le rouvrir ici, ce
       serait le rouvrir peut-être pendant qu'elle parle — l'erreur du
       17 septembre, et je ne la refais pas. */
    for (const piste of flux.getAudioTracks()) {
      const perdue = () => {
        if (fluxRef.current !== flux) return;
        debrancherMicroRef.current?.();
        debrancherMicroRef.current = null;
        /* ── UNE PISTE QUI MEURT TOUTE SEULE NE CHANGE PAS DE MODE ─────────

           Lamine, le 26 septembre 2026 : « au bout de certains temps, le
           micro se désactive automatiquement... même quand je parle, le
           micro ne s'allume plus. » Cette piste peut mourir en PLEIN
           REPOS, pendant qu'on attend simplement qu'il parle — un écran
           verrouillé, un peu de temps en arrière-plan sonore, et iOS la
           reprend sans jamais nous rendre la main autrement que par cet
           événement. Or les deux boucles qui rouvrent le micro ailleurs
           dans ce fichier ne se déclenchent QUE sur un changement de
           mode ou un retour au premier plan (`auRetour`, plus bas) — ni
           l'un ni l'autre n'arrive ici : le mode reste « ready » du début
           à la fin, donc rien ne le relance. Résultat : le point semblait
           encore actif, mais plus rien n'écoutait, pour de bon, jusqu'à
           ce qu'il ferme et rouvre l'application.

           On imite donc `auRetour()` : un peu plus tard, si on est
           toujours censé être en conversation, pas déjà occupé, pas en
           train d'enregistrer, et surtout pas en train de PARLER ou de
           RÉFLÉCHIR (là, la boucle normale reprendra le micro toute
           seule au bon moment — le rouvrir ici serait le rouvrir pendant
           qu'elle parle), on relance l'écoute nous-mêmes. */
        setTimeout(() => {
          if (!conversationRef.current || busyRef.current) return;
          if (enregistreEncore()) return;
          if (modeRef.current !== "ready") return;
          void ecouterRef.current?.();
        }, 500);
      };
      piste.addEventListener("ended", perdue);
      piste.addEventListener("mute", perdue);
    }
    fluxRef.current = flux;
    analyseRef.current = analyse;
    analysePeriodiqueRef.current = analysePeriodique;
    debrancherMicroRef.current = () => {
      try { entree.disconnect(); } catch { }
      try { analyse.disconnect(); } catch { }
      try { analysePeriodique.disconnect(); } catch { }
      flux.getTracks().forEach((t) => t.stop());
      fluxRef.current = null;
      analyseRef.current = null;
      analysePeriodiqueRef.current = null;
      /* Et on ferme le contexte de l'analyseur : c'est lui qui tenait la
         pastille orange allumée après l'arrêt du flux. */
      if (MICRO_SUR_SON_PROPRE_CONTEXTE) {
        const c = ctxMicroRef.current;
        ctxMicroRef.current = null;
        if (c && c.state !== "closed") { try { void c.close(); } catch { } }
      }
    };
    return { flux, analyse, analysePeriodique, ctxMicro };
  }, [contexte]);

  /* Fermer complètement : le second appui, la fin d'une séance, le départ de
     la page. On coupe le fil AVANT le micro, pour qu'aucune veille ne
     redémarre un tour sur un flux qu'on vient d'éteindre. */
  const fermerConversation = useCallback(() => {
    conversationRef.current = false;
    /* ── FERMER LA CONVERSATION, C'EST TUER CE QUI EST EN VOL ──────────────

       La relecture du 12 septembre au soir : « il faut absolument que fermer
       la conversation signifie : tout ce qui était en vol est mort. » Elle a
       raison — la fonction arrêtait le micro et le flux, et laissait vivre la
       transcription, la capture du prénom et la réponse en fabrication. Ce
       qui revenait ensuite écrivait l'état d'une conversation fermée, et
       rouvrait un micro que la personne venait de couper. */
    ouvrirUnTour();
    nouvelEnregistrement();
    attenteRef.current = null;
    tourRef.current = null;
    attendLeNomRef.current = false;
    setConversation(false);
    setEntendParler(false);
    const e = enregistreurRef.current;
    if (e && e.state !== "inactive") { try { e.stop(); } catch { } }
    enregistreurRef.current = null;
    debrancherMicroRef.current?.();
    debrancherMicroRef.current = null;
    /* ── ON NE LAISSE PAS UN MODE DONT ON NE PEUT PLUS SORTIR ──────────────

       Le 18 septembre 2026, par la rangée des tuiles : « si tu reviens à BIA
       elle ne t'entend plus, il faut que tu fermes l'application ».

       On ne remettait au repos que « listening ». Fermée pendant qu'elle
       RÉFLÉCHIT ou qu'elle PARLE, la conversation laissait le mode figé sur
       « thinking » ou « speaking » — et plus rien ne pouvait l'en sortir,
       puisqu'on venait justement de périmer le tour en vol : sa réponse,
       quand elle arriverait, n'écrirait plus l'état. Or le bouton du micro
       refuse d'ouvrir quand le mode est « thinking » ou « speaking » hors
       conversation. Le bouton était donc mort jusqu'au redémarrage.

       C'est mot pour mot la leçon de `taire()` : un état qu'on ne quitte pas
       est une panne, même quand il a l'air normal. Les deux portes de sortie
       doivent la respecter, pas une seule. */
    setMode((m) => (m === "listening" || m === "thinking" || m === "speaking" ? "ready" : m));
  }, [ouvrirUnTour, nouvelEnregistrement]);

  /* ── UNE VIDÉO QUI JOUE, ET LE MICRO SE TAIT ──────────────────────────────

     Lamine, le 14 septembre 2026 : « quand une vidéo est en play, tu dois
     désactiver son micro. »

     C'était écrit noir sur blanc au-dessus du lecteur, et c'était mon erreur :
     « le micro reste ouvert, on lui parle sans la voir ». Sur le papier c'est
     séduisant ; dans une pièce, le micro entend la vidéo. Il prend le son du
     film pour une voix, coupe l'écoute au milieu, transcrit les paroles du
     film et les envoie au modèle comme si c'était une question. On finit par
     répondre à la télévision.

     LE PLEIN ÉCRAN SEULEMENT, et la distinction n'est pas un détail : le
     petit écran sous son menton existe justement pour qu'elle COMMENTE ce
     qu'on regarde, et il ne démarre jamais tout seul. Y couper le micro
     retirerait la seule chose pour laquelle il a été fait. Le plein écran,
     lui, veut dire « on regarde vraiment » — c'est écrit dans sa consigne
     depuis le premier jour : « ton visage se retire, on regarde, puis on
     reprend ».

     ET IL REVIENT SEUL à la fermeture, s'il était ouvert avant. Même règle
     que pour la carte : on ne rallume pas un micro qu'il venait de couper. */
  useEffect(() => {
    if (film) {
      if (!microAvantLeFilm.current) {
        microAvantLeFilm.current = conversationRef.current;
        if (conversationRef.current) { taireRef.current?.(); fermerConversation(); }
      }
      return;
    }
    if (!microAvantLeFilm.current) return;
    microAvantLeFilm.current = false;
    conversationRef.current = true;
    setConversation(true);
    void ecouterRef.current?.();
  }, [film, fermerConversation]);

  const ecouter = useCallback(async () => {
    /* CET ENREGISTREMENT-CI, ET PAS UN AUTRE. Le numéro est pris AVANT
       d'ouvrir le micro : demander la permission peut durer une seconde, et
       pendant cette seconde on a pu couper la parole ou fermer la
       conversation. Ce qui revient après ne doit plus rien écrire. */
    const idEnr = nouvelEnregistrement();
    try {
      const { flux, analyse, analysePeriodique, ctxMicro } = await micro();
      if (!estCetEnregistrement(idEnr)) return;
      const enregistreur = ouvrirEnregistreur(flux);
      const morceaux: Blob[] = [];
      /* ── CE QUI MONTE PENDANT QU'IL PARLE ────────────────────────────────

         Sa demande du 15 septembre 2026 : « il faut envoyer la voix partie
         par partie. » Ce qui suit tient le compte de ce qui est déjà parti.

         `tourDeParole` est l'identifiant que le serveur utilisera pour
         recoudre. `envois` garde les promesses en vol, pour les attendre à la
         fin plutôt que de transcrire un dépôt à moitié arrivé. Et `perdu`
         suffit à tout annuler : au moindre morceau refusé, on oublie le
         chemin rapide et on renvoie le fichier entier, comme avant. */
      const tourDeParole = `t${Date.now().toString(36)}${Math.random().toString(36).slice(2, 10)}`;
      const envois: Promise<void>[] = [];
      let deposes = 0;
      let perdu = false;
      /* De quoi juger, à la fin, si c'était une voix ou la rue. On garde la
         somme et le compte plutôt que la moyenne : une moyenne qu'on met à
         jour tour par tour dérive, et celle-ci doit rester exacte. */
      const spectre = new Uint8Array(256);
      const tamponPeriodique = new Uint8Array(analysePeriodique.fftSize);
      let partVocaleTotale = 0;
      let hauteurTotale = 0;
      let mesuresVocales = 0;
      const filtrerDeclenchement = creerFiltreDeclenchement();
      enregistreurRef.current = enregistreur;

      /* ── LE MICRO QUI NE SE FERMAIT PLUS APRÈS UNE CORRECTION ─────────────

         Signalé par Lamine le 11 septembre 2026 : « la fenêtre se ferme
         correctement, mais ensuite si tu parles le micro ne se coupe pas
         quand tu finis de parler — seulement après avoir effectué une
         correction. »

         CE CODE OUVRAIT UN SECOND CONTEXTE AUDIO (`new AudioContext()`), alors
         que la règle est écrite trente lignes plus bas dans ce même fichier :
         « le contexte de la page, jamais un deuxième — sur iPhone, en ouvrir
         un second pendant qu'elle parle interrompt le son en cours ».

         Et la conséquence est exactement ce qu'il décrit. Un contexte de plus,
         ouvert alors que la page vient de se servir du sien, arrive SUSPENDU
         sur iOS. Un analyseur suspendu ne rend que des 128 — du silence
         parfait. Le code croit donc que personne n'a encore parlé, et comme sa
         règle est d'attendre une voix aussi longtemps qu'il faut, il attend
         pour toujours. Le micro reste ouvert, la personne parle dans le vide.

         On prend donc le contexte de la page, et on ne le ferme jamais : on se
         contente de débrancher, comme le fait déjà lib/frappe.ts. */
      const tampon = new Uint8Array(analyse.frequencyBinCount);
      let aParle = false;
      let dernierSon = 0;
      let debutParole = 0;
      let dureeParlee = 0;
      const ouverture = Date.now();

      /* ── LE SUIVEUR DE BRUIT ─────────────────────────────────────────────

         Lamine, le 12 septembre 2026 : « tu peux rester à parler, elle
         n'entend rien. »

         MA PREMIÈRE VERSION MESURAIT SA VOIX ET L'APPELAIT « BRUIT DE FOND ».
         J'écoutais la pièce quatre dixièmes de seconde et je gardais LE PLUS
         FORT — or personne n'attend avant de parler : on appuie et on parle.
         Le seuil montait à 34, une voix ordinaire ne le dépasse pas, et BIA
         restait sourde pour toute la conversation.

         Le fond n'est pas le plus fort de ce qu'on entend, c'est le plus
         FAIBLE. Tout est maintenant dans lib/micro.ts, où ça se mesure sur
         des suites de nombres au lieu de se deviner devant un téléphone. */
      const bruit = suivreLeBruit();
      seuilRef.current = bruit.seuil();
      /* Un vrai micro n'est JAMAIS parfaitement plat : même une pièce vide a
         son souffle. Une suite de 128 exacts ne veut donc pas dire « silence »,
         elle veut dire « l'analyseur ne rend rien ». On compte ces tours. */
      let toursMuets = 0;
      let analyseurMort = false;

      const veille = setInterval(() => {
        // iOS suspend le contexte dès qu'on repose le téléphone : on le réveille.
        if (ctxMicro.state === "suspended") { void ctxMicro.resume(); }
        analyse.getByteTimeDomainData(tampon);
        let creux = 0;
        for (const v of tampon) creux = Math.max(creux, Math.abs(v - 128));

        if (creux === 0) toursMuets++; else toursMuets = 0;
        /* Deux secondes de platitude absolue : l'analyseur est mort. On ne
           peut plus se fier au son pour fermer le micro — alors on ferme au
           temps, généreusement, plutôt que de laisser la personne parler dans
           un micro qui ne se coupera jamais.

           TRENTE-DEUX TOURS, ET PLUS SEIZE : la veille tourne maintenant deux
           fois plus vite (60 ms), et ce nombre-là compte des TOURS, pas des
           secondes. Laissé à seize, il aurait déclaré l'analyseur mort au bout
           d'une seconde — et fermé le micro au nez de quelqu'un qui réfléchit
           avant de parler. */
        if (!analyseurMort && toursMuets > TOURS_MUETS_AVANT_DE_DOUTER) analyseurMort = true;

        /* ── COMBIEN DE SILENCE AVANT DE FERMER LE MICRO ────────────────────

           Lamine, le 12 septembre 2026 : « je lui ai dit Salam, elle est
           restée presque quatre secondes avant de réagir. C'est pas normal vu
           que c'est déjà enregistré. »

           Il a raison, et la plus grosse part de ces quatre secondes était
           ICI. On attendait DEUX SECONDES PLEINES de silence après le dernier
           son avant même d'arrêter d'enregistrer. « Salaam » dure une
           demi-seconde : on passait donc quatre fois plus de temps à vérifier
           qu'il avait fini qu'il n'en avait mis à parler. Tout le reste — la
           transcription, la réponse, le son — venait APRÈS.

           DEUX SECONDES N'ÉTAIENT PAS UNE ERREUR, C'ÉTAIT UNE PRÉCAUTION mal
           placée. Elle protège celui qui cherche ses mots au milieu d'une
           longue phrase ; elle punit celui qui dit un mot. Alors on regarde
           CE QU'IL VIENT DE DIRE :

             — un mot, une salutation : sept dixièmes de seconde suffisent.
               Personne ne dit « Salaam » puis reprend son souffle.
             — une phrase : une seconde.
             — un récit de plus de quatre secondes : une seconde et demie,
               parce que là, oui, on s'arrête pour réfléchir.

           Et on regarde deux fois plus souvent (60 ms au lieu de 120), parce
           qu'un tour de veille manqué, c'est un dixième de seconde de plus à
           attendre pour rien. */
        const depuis = Date.now() - ouverture;

        /* Une voix, ou pas. Le suiveur tient le fond à jour et garde deux
           seuils : plus haut pour commencer à entendre, plus bas pour
           continuer. Sans ce second seuil, « je t'entends » clignotait dix
           fois par seconde et le micro se fermait dans les creux d'une
           phrase — l'autre moitié de « ce n'est pas net ». */
        const audible = bruit.voir(creux);
        let proportionVocale: number | null = null;
        try {
          analyse.getByteFrequencyData(spectre);
          proportionVocale = partVocale(spectre, ctxMicro.sampleRate);
        } catch { /* L'écoute reste utilisable sans analyse fréquentielle. */ }
        const uneVoix = filtrerDeclenchement(audible, proportionVocale);
        seuilRef.current = bruit.seuil();

        if (uneVoix) {
          /* ── EST-CE UNE VOIX, OU LA RUE ? ────────────────────────────────

             Lamine, le 13 septembre 2026 : « il faut qu'elle puisse
             distinguer les bruits des ambiances. Même sur les bruits elle
             analyse, elle réfléchit. Ça crée des retards. »

             Tout ce qui précède ne regarde que LE VOLUME, et une voiture qui
             passe est aussi forte qu'une voix. On regarde donc aussi OÙ est
             l'énergie : une voix tient entre 200 et 3 500 Hz, un moteur
             gronde en dessous, un sifflement siffle au-dessus. Le détail est
             dans lib/micro.ts, avec les mesures.

             On ne décide RIEN ici : on accumule pendant qu'on entend, et on
             tranche une fois à la fin. Une syllabe peut être sourde sans que
             la phrase entière soit un bruit. */
          try {
            analyse.getByteFrequencyData(spectre);
            partVocaleTotale += partVocale(spectre, ctxMicro.sampleRate);
            analysePeriodique.getByteTimeDomainData(tamponPeriodique);
            hauteurTotale += hauteurDeVoix(tamponPeriodique, ctxMicro.sampleRate);
            mesuresVocales++;
          } catch { /* pas de spectre : on enverra, comme avant */ }

          if (!aParle) { debutParole = Date.now(); setEntendParler(true); }
          else dureeParlee += Date.now() - dernierSon;
          aParle = true;
          dernierSon = Date.now();
        } else if (aParle) {
          /* On ne montre plus « je t'entends » : le témoin redevient « je
             t'écoute » dès que la voix retombe, et c'est ce qui donne
             l'impression qu'elle suit. */
          setEntendParler(false);
          const assez = silenceQuiSuffit(dernierSon - debutParole, coupesTropTotRef.current);
          if (Date.now() - dernierSon > assez) {
            /* LA BORNE QUE PERSONNE NE COMPTAIT. `dernierSon` est l'instant
               où il a vraiment fini de parler ; le micro, lui, ne se ferme
               qu'une seconde et demie plus tard. Cette attente-là est à nous,
               pas à BIA — et elle est présente à chaque tour. */
            poserBorne(bornesRef.current, "parole", dernierSon);
            poserBorne(bornesRef.current, "micro");
            arreterEnregistrement();
            return;
          }
        }

        if (analyseurMort && depuis > 9000) { arreterEnregistrement(); return; }

        /* ── LES DEUX FILETS DE TEMPS ────────────────────────────────────

           Lamine : « durée maximale d'une intervention : 60 à 90 secondes ».
           Passé ce cap, on envoie CE QU'ON A plutôt que de tout perdre : une
           minute et quart de parole qu'on jette, c'est bien pire qu'une
           phrase coupée.

           Et le second : micro ouvert sans que personne ne dise rien. Au bout
           de deux minutes et demie, ce n'est plus une conversation, c'est une
           lampe rouge et de la batterie. On referme, et le bouton revient. */
        if (aParle && depuis > INTERVENTION_MAXIMALE) { arreterEnregistrement(); return; }
        /* ── UN DÉPÔT QUI ATTEND, ET PERSONNE NE PARLE ──────────────────────

           Le guetteur a tué un tour pendant qu'elle réfléchissait et a mis
           sa question de côté. Deux cas : il continue sa phrase — alors on
           l'entend d'ici une seconde, et la transcription recollera ; ou
           c'était un bruit, ou il avait fini — alors ce micro n'entendra
           rien, et sa question attendrait le silence de deux minutes et
           demie qui clôt la conversation. Il parlerait dans le vide : c'est
           exactement le défaut qu'on répare. Passé ce délai sans un son, on
           ferme, et `onstop` renvoie le dépôt tel quel. */
        if (!aParle && motsRattrapesRef.current && depuis > RELANCE_DU_DEPOT) { arreterEnregistrement(); return; }
        if (!aParle && depuis > SILENCE_QUI_CLÔT_LA_CONVERSATION) {
          conversationRef.current = false;
          setConversation(false);
          arreterEnregistrement();
        }
      }, TOUR_DE_VEILLE);

      /* ── CHAQUE MORCEAU PART DÈS QU'IL EXISTE ────────────────────────────

         L'enregistreur rend un morceau toutes les 400 ms. On le garde — le
         repli en a besoin, et « mémorise » aussi — ET on le monte tout de
         suite. Quand Lamine se tait, il ne reste que le dernier à monter.

         RIEN ICI NE PEUT CASSER L'ENREGISTREMENT. L'envoi est lancé sans
         qu'on l'attende, et son échec ne fait qu'allumer `perdu` : le son
         complet est toujours dans `morceaux`, et l'ancien chemin le prendra. */
      enregistreur.ondataavailable = (e) => {
        if (!e.data.size) return;
        const indice = morceaux.length;
        morceaux.push(e.data);
        if (perdu) return;
        const type = enregistreur.mimeType || e.data.type || "audio/webm";
        const f = new FormData();
        f.append("tour", tourDeParole);
        f.append("indice", String(indice));
        f.append("type", type);
        f.append("nom", `parole.${extensionDe(type)}`);
        f.append("morceau", e.data, `m${indice}`);
        envois.push(
          fetch("/api/ecouter/morceau", {
            method: "POST", headers: { "x-bia-code": codeRef.current }, body: f,
          })
            .then((r) => { if (r.ok) deposes++; else perdu = true; })
            .catch(() => { perdu = true; }),
        );
      };
      enregistreur.onstop = async () => {
        /* ── LA PLACE SE LIBÈRE D'ABORD, LE SORT DE L'ENREGISTREMENT ENSUITE ─

           Lamine, le 12 septembre 2026 : « le micro après deux ou trois
           questions le micro reste inactif, y a toujours un problème. »

           C'ÉTAIT MON DÉFAUT D'HIER SOIR, et il était entier. La garde
           d'appartenance était posée AVANT `enregistreurRef.current = null` :
           un enregistrement périmé — celui qu'on vient de couper en reprenant
           la parole — sortait par le `return` sec et laissait dans le ref un
           MediaRecorder mort.

           Or la boucle qui rouvre le micro au retour au repos commence par
           « si un enregistreur occupe la place, c'est qu'un tour est déjà en
           cours, je ne fais rien ». Elle trouvait donc éternellement ce
           cadavre, et ne rouvrait plus JAMAIS le micro. La conversation
           restait ouverte, le bouton restait allumé, et plus rien n'écoutait.

           Deux ou trois questions : le temps qu'un `taire()` passe — une
           parole coupée, un bouton de correction, un papier ouvert.

           La place se libère donc INCONDITIONNELLEMENT. Un enregistrement
           fini est fini, qu'il soit encore le nôtre ou non. */
        if (enregistreurRef.current === enregistreur) enregistreurRef.current = null;
        clearInterval(veille);
        /* « Je t'entends » s'éteint aussi dans tous les cas : un enregistrement
           fini n'entend plus personne, même périmé. Sans ça, le halo du bouton
           restait allumé sur un micro qui ne captait rien. */
        setEntendParler(false);

        /* Cet arrêt appartient-il encore à l'enregistrement en cours ? Si on a
           coupé la parole entre-temps, ce qui suit n'a plus rien à dire. */
        if (!estCetEnregistrement(idEnr)) return;

        /* ── LE MICRO NE SE FERME QUE SI LA CONVERSATION SE FERME ──────────

           Avant, chaque fin de tour éteignait le flux et débranchait
           l'analyseur : c'était juste, tant qu'un appui valait une phrase.
           En conversation continue, ce serait rouvrir le micro — et
           redemander la permission — à chaque respiration.

           ON NE FERME PLUS LE CONTEXTE DE LA PAGE non plus : c'est celui qui
           porte toute sa voix. Le fermer ici la rendait muette jusqu'à ce que
           `contexte()` en refabrique un.

           ── ET LE 12 SEPTEMBRE AU SOIR, IL RENVERSE ÇA ─────────────────────

           « Il faut tout faire pour cacher ce point orange qui écrit
           "enregistré", ça fait fuir les gens. »

           Ce raisonnement-là — garder le micro pour ne pas redemander la
           permission — était juste du point de vue de la vitesse et faux du
           point de vue de celui qui tient le téléphone : il voyait un point
           orange allumé pendant que BIA parlait, pendant qu'il lisait, et
           pendant qu'il ne se passait rien.

           On lâche donc le micro à la fin de CHAQUE parole. Il se reprend tout
           seul au tour suivant, par `micro()`, qui le rouvre quand le flux
           n'est plus là. Le pourquoi et le prix sont écrits en entier dans
           `lib/micro.ts`, à côté de la ligne qui le décide. */
        if (!conversationRef.current || MICRO_LACHE_ENTRE_LES_TOURS) {
          debrancherMicroRef.current?.();
          debrancherMicroRef.current = null;
        }

        /* ON JETTE AVANT DE TRANSCRIRE. C'est le tout l'intérêt du bouton :
           rien ne part au réseau, rien n'est payé, et BIA n'a jamais entendu
           la phrase ratée. Elle ne se retrouvera donc pas non plus dans le
           fil ni dans ses notes. */
        if (annuleRef.current) {
          annuleRef.current = false;
          setMode("ready");
          setFace("yeux_ouverts");
          setAnnule(true);
          setTimeout(() => setAnnule(false), 3200);
          return;
        }

        /* ── UNE PORTE QUI CLAQUE N'EST PAS UNE QUESTION ──────────────────

           Micro ouvert en permanence, le moindre choc ferme un tour et part
           chez le moteur de transcription — qui est PAYÉ — pour revenir avec
           du vide, pendant que BIA répond à une porte. On exige donc une
           vraie parole : assez longue pour être une syllabe humaine.

           On ne dit rien, on ne montre rien : on se remet simplement à
           écouter, et personne ne s'aperçoit de rien. C'est exactement ce que
           fait une personne qui entend un bruit et continue d'écouter. */
        /* ── ET C'EST ICI QU'ON TRANCHE ──────────────────────────────────

           « Même sur les bruits elle analyse, elle réfléchit. » Le filtre de
           durée ne coupait que ce qui est COURT — une porte. Un moteur qui
           dure trois secondes passait entier : transcription payée, et BIA se
           mettait à réfléchir à un bruit de rue.

           Dans le doute on ENVOIE : `mesuresVocales` à zéro veut dire qu'on
           n'a pas pu mesurer, et perdre une vraie question coûte bien plus
           cher qu'une transcription de trop. */
        const partVocaleMoyenne = mesuresVocales > 0 ? partVocaleTotale / mesuresVocales : null;
        const hauteurMoyenne = mesuresVocales > 0 ? hauteurTotale / mesuresVocales : null;
        if (!aParle || !morceaux.length || !vraimentUneVoix(dureeParlee, partVocaleMoyenne, hauteurMoyenne)) {
          if (aParle && partVocaleMoyenne !== null && vautLaPeine(dureeParlee)) {
            /* Silencieux à l'écran, mais pas invisible : sans cette ligne, le
               jour où le filtre jetterait une vraie voix, on n'aurait aucun
               moyen de le savoir. */
            console.warn(`BIA — bruit écarté sans le transcrire : ${Math.round(dureeParlee)} ms, ${Math.round(partVocaleMoyenne * 100)} % dans la bande de la voix`);
          }
          /* Rien entendu, mais une question attend dans le dépôt : elle
             repart d'ici, sans passer par le retour au repos — en
             conversation, le micro se rouvre 180 ms après le repos, et
             l'effet qui devait renvoyer le dépôt trouve toujours un micro
             ouvert et se tait. C'est le chemin qui manquait. */
          const reste = motsRattrapesRef.current;
          if (reste && Date.now() - reste.quand <= DUREE_DU_RATTRAPAGE && !busyRef.current) {
            motsRattrapesRef.current = null;
            void askBia(reste.texte, true);
            return;
          }
          setMode((m) => (m === "listening" ? "ready" : m));
          return;
        }

        /* Elle répond MAINTENANT, sans attendre la transcription : c'est tout
           l'intérêt: le silence après qu'on a parlé est le plus inquiétant. */
        /* ── ON NE MENT PLUS SUR LE FORMAT DE L'ENREGISTREMENT ──────────────

           Lamine, le 12 septembre 2026 : « quand j'ai écrit un message sur le
           clavier, elle répond correctement. Mais quand je parle, elle me dit
           répète s'il te plaît. »

           Voilà pourquoi, et c'était une seule ligne. MediaRecorder enregistre
           dans le format du navigateur : du webm sur Chrome, du MP4 sur
           Safari — Mac et iPhone. Et on rhabillait TOUJOURS le résultat en
           « audio/webm », sous le nom « parole.webm ».

           Donc sur Safari on envoyait du MP4 en prétendant que c'était du
           webm. ElevenLabs lit le type annoncé, trouve autre chose, et
           refuse. La route renvoyait alors un texte vide, que le téléphone
           lisait comme « je n'ai rien entendu » — et BIA demandait de répéter,
           indéfiniment, quoi qu'on lui dise.

           Sur Chrome ça marchait ; c'est pour ça que ça a marché des jours
           avant de casser le soir où l'essai s'est fait sur un Mac.

           On envoie donc le VRAI type, et une extension qui lui correspond.
           Rien à deviner : l'enregistreur le dit lui-même. */
        const typeReel = enregistreur.mimeType || morceaux[0]?.type || "audio/webm";
        const extension = extensionDe(typeReel);
        const forme = new FormData();
        const sonDit = new Blob(morceaux, { type: typeReel });
        /* Gardé pour « mémorise ». Il écrase le précédent : c'est toujours la
           DERNIÈRE façon de dire qui compte, celle qu'il vient de valider. */
        sonDeSaVoix.current = { blob: sonDit, nom: `parole.${extension}` };
        forme.append("audio", sonDit, `parole.${extension}`);
        /* Le repli porte AUSSI l'identifiant du tour : il ne sert plus à
           recoudre, mais il dit au serveur que le dépôt commencé peut mourir
           tout de suite, au lieu d'attendre sa minute avec une voix dedans. */
        forme.append("tour", tourDeParole);
        /* ── L'INDICE DE LANGUE, QUI N'ÉTAIT JAMAIS ENVOYÉ ──────────────────

           Lamine, le 12 septembre 2026, capture à l'appui : « parfois mes
           paroles sont écrites en arabe, parfois avec d'autres langues. » Sur
           sa capture, « Salaam » était écrit « سلام », et sa demande de vidéo
           était en bambara — « Tɛgɛnon miminuku Vivian YouTube ».

           Le serveur savait recevoir cet indice depuis le premier jour :
           /api/ecouter lit `indice_langue` et le passe à Scribe. Mais ce
           fichier-ci ne l'envoyait PAS — vérifié, le mot n'apparaissait
           nulle part. Le moteur devinait donc la langue à chaque phrase, et
           le wolof de Dakar ressemble assez au bambara et à l'arabe pour
           qu'il s'y trompe une fois sur deux.

           CE N'EST PAS UN ORDRE, C'EST UN INDICE : le serveur laisse d'abord
           Scribe deviner, et ne s'en sert que si la devinette dérape (voir
           lib/ecoute.ts). On envoie la langue de l'échange précédent — wolof
           au premier mot, parce que BIA est wolof d'abord. */
        forme.append("indice_langue", langueDuFil.current);

        /* ── LE PRÉNOM NE DOIT PAS TOUCHER À L'ÉTAT DU MICRO ──────────────

           Lamine, le 12 septembre 2026 au soir, juste avant de présenter
           BIA : « tu parles une, deux fois, la troisième fois elle se met à
           réfléchir, le micro se bloque. »

           C'ÉTAIT UNE COURSE, ET ELLE ÉTAIT ICI.

           Entre « comment tu t'appelles ? » et la réponse, le micro est
           rouvert PENDANT qu'elle parle, pour attraper le prénom. Deux tours
           vivent donc en même temps : celui de la vraie question, et cette
           capture-ci. Or l'état passait à « réfléchit » dès l'arrêt de
           l'enregistrement — celui-ci compris — et la capture du prénom
           rendait la main sans jamais le remettre.

           Tout dépendait alors de l'ordre d'arrivée. Si le prénom se
           terminait APRÈS qu'elle avait fini de parler, le dernier mot
           prononcé sur l'état était « réfléchit »… et c'est le RETOUR AU
           REPOS qui rouvre le micro. Il ne revenait jamais.

           Deux tours marchaient, le troisième bloquait, et ça paraissait
           aléatoire parce que ça dépendait de sa vitesse à lui contre la
           durée de la réponse. Le filet de secours existait — mais à trois
           minutes, ce qui, devant quelqu'un, est une panne.

           La capture du prénom ne touche donc plus à l'état, et elle passe
           AVANT qu'on annonce quoi que ce soit. */
        if (attendLeNomRef.current) {
          try {
            const r = await fetch("/api/ecouter", { method: "POST", headers: { "x-bia-code": codeRef.current }, body: forme });
            /* ── CE CHEMIN N'APPARTENAIT À AUCUN TOUR ──────────────────────

               Trouvé par la relecture du 12 septembre au soir : la capture du
               prénom passe AVANT l'ouverture du tour, donc le numéro de tour
               ne la couvrait pas. Une capture lente qui revenait pendant le
               tour suivant remettait `attendLeNomRef` à faux et pouvait
               toucher l'état — celui d'un tour qui n'était pas le sien.

               C'est le numéro d'ENREGISTREMENT qui la garde, et il existe
               depuis l'instant où le micro s'est ouvert. */
            if (!estCetEnregistrement(idEnr)) return;
            const d = await r.json() as { texte?: string };
            if (!estCetEnregistrement(idEnr)) return;
            const nom = extraireNom(d.texte || "");
            if (nom) {
              nomRef.current = nom;
              /* Le prénom appartient à la personne, pas au téléphone : c'est
                 exactement la confusion qu'on vient de corriger. */
              setProfils((liste) => {
                const suite = liste.map((x) => (x.id === profilRef.current ? { ...x, nom } : x));
                garderProfils(suite, profilRef.current);
                return suite;
              });
            }
          } catch {}
          attendLeNomRef.current = false;
          /* Et on ne prend la parole à personne : on ne rend le micro que si
             plus rien n'est en vol — ni réponse en fabrication (le jeton
             d'attente), ni enregistrement déjà repris. Dans tous les autres
             cas, c'est le tour en cours qui rendra la main. */
          if (!attenteRef.current && enregistreurRef.current?.state !== "recording") {
            setMode((m) => (m === "thinking" ? "ready" : m));
          }
          return;
        }

        /* LE TOUR S'OUVRE ICI, et il s'ouvre AVANT le premier changement
           d'état : tout ce qui suivra portera ce numéro et devra le montrer
           pour avoir le droit d'écrire l'état. */
        const monTour = ouvrirUnTour();
        setMode("thinking");
        setFace("pensive");

        const jeton = {};
        attenteRef.current = jeton;
        stopAttenteRef.current = false;
        transcritRef.current = false;
        dernierDitRef.current = "";
        nouveauNomRef.current = "";
        // Le chronomètre part ici : c'est l'instant que la personne ressent
        // comme le début de l'attente.
        departAttenteRef.current = Date.now();
        voieRef.current = "parole";
        tTranscritRef.current = 0;
        tModeleRef.current = 0;
        langueRef.current = "wo";
        /* ── « AUSSITÔT ELLE DOIT DIRE D'ACCORD, JE VOIS ÇA » ─────────────

           Sa demande du 12 septembre au soir, et l'endroit est ici : on vient
           de fermer le micro, la transcription n'est même pas partie. Rien
           n'est plus tôt que ça.

           Le son est déjà dans le téléphone (c'est un enregistrement du
           répertoire) donc il part en un dixième de seconde. L'attente
           parlée, elle, prend la suite quand l'accusé a fini — sinon les deux
           parleraient ensemble.

           Tant que les phrases de service ne sont pas enregistrées,
           choisirService rend null et rien ne change : une phrase promise
           sans son serait un silence. */
        const accuseSuite = !essaiChatterboxActif() && apresSalutationRef.current
          ? choisirService("suite", dernierService.current) : null;
        apresSalutationRef.current = false;
        if (accuseSuite) {
          dernierService.current = accuseSuite.cle;
          void (async () => {
            try {
              /* L'ADRESSE SE CONSTRUIT ICI, PAS AVEC sonDe(). Cette fonction
                 lit la configuration Supabase du SERVEUR : dans le
                 téléphone, elle rendrait une adresse vide. La page a déjà le
                 dossier des sons — /api/etat le lui donne au chargement — et
                 c'est ce même chemin qui sert pour la salutation d'accueil. */
              const ou = adresseDuSon(accuseSuite.cle, langueDuFil.current as "wo" | "fr");
              if (!ou) throw new Error("dossier des sons inconnu");
              const octets = await octetsDuRepertoire(ou);
              if (estLeTour(monTour) && attenteRef.current === jeton) await jouerEtAnimer(octets);
            } catch { /* pas de son déposé : on enchaîne sur l'attente */ }
            if (estLeTour(monTour) && attenteRef.current === jeton) {
              void attendreEnParlant(jeton, langueRef.current);
            }
          })();
        } else {
          void attendreEnParlant(jeton, langueRef.current);
        }
        /* ── ET LE SOUFFLE, À CHAQUE TOUR ─────────────────────────────────
           `attendreEnParlant` ne parle qu'au PREMIER échange — c'est sa
           décision du 12 septembre, et elle tient. Le souffle, lui, n'est pas
           une phrase : il revient à chaque fois, comme chez un être humain. */
        void soufflerEnAttendant(jeton);

        try {
          /* ── ON N'ENVOIE PLUS LE SON S'IL EST DÉJÀ LÀ ────────────────────

             Le gain de la soirée tient dans ces quelques lignes. Si tous les
             morceaux sont montés pendant qu'il parlait, cette requête ne
             transporte qu'un identifiant : le son est à Francfort depuis
             longtemps, et la seconde et demie d'attente disparaît.

             SI QUOI QUE CE SOIT MANQUE, ON REVIENT À L'ANCIEN CHEMIN — et
             c'est ce qui rend tout ceci sans danger. Trois portes de sortie,
             et chacune ramène au fichier entier :

               — un morceau refusé en route a allumé `perdu` ;
               — le compte des morceaux déposés ne tombe pas juste ;
               — le serveur répond 409 « dépôt incomplet ».

             Dans les trois cas Lamine ne voit rien : il attend une seconde et
             demie de plus, comme avant, au lieu de perdre sa phrase. */
          const legere = new FormData();
          legere.append("tour", tourDeParole);
          legere.append("total", String(morceaux.length));
          const indice = forme.get("indice_langue");
          if (indice !== null) legere.append("indice_langue", String(indice));
          /* ── LE DERNIER MORCEAU ET LA DEMANDE VOYAGENT ENSEMBLE ──────────

             Le 19 septembre 2026. On attendait que le dernier morceau soit
             monté, PUIS on envoyait la demande : deux allers-retours
             Dakar–Francfort à la file, là où un seul suffit. Maintenant la
             demande part tout de suite, et c'est le SERVEUR qui attend le
             morceau retardataire — à quelques millisecondes de lui, pas à
             trois cents.

             `complet` ne veut plus dire « tout est arrivé » mais « tout est
             PARTI, et rien n'a été refusé jusqu'ici ». Si un envoi échoue
             après coup, le serveur ne verra jamais le morceau, répondra 409
             au bout d'une seconde et demie, et on renverra le fichier entier
             comme avant. Le filet n'a pas bougé ; seul l'ordre a changé. */
          const complet = !perdu && morceaux.length > 0;

          const envoyer = (corps: FormData) => fetch("/api/ecouter", {
            method: "POST", headers: { "x-bia-code": codeRef.current }, body: corps,
          });
          let r = await envoyer(complet ? legere : forme);
          if (complet && r.status === 409) { await Promise.allSettled(envois); r = await envoyer(forme); }
          if (!estCetEnregistrement(idEnr)) return;
          const d = await r.json() as { texte?: string; panne?: boolean; motif?: string; suggestions_ecriture?: string[]; au_fil_de_leau?: boolean };
          if (!estCetEnregistrement(idEnr)) return;
          /* SON OREILLE EST CASSÉE, CE N'EST PAS LA VOIX DE LA PERSONNE.
             Sans ça, BIA répétait « je ne t'entends pas bien, répète » à
             chaque phrase — et on répétait plus fort devant un micro qui ne
             transmettait rien. Le motif exact se lit dans /api/etat. */
          /* Une transcription qui revient alors qu'on a déjà repris la parole
             ailleurs — clavier ouvert, micro refermé, nouvelle phrase — n'a
             plus rien à dire. Elle ne doit surtout pas lancer une réponse ni
             écrire l'état. */
          if (!estLeTour(monTour)) return;
          if (d.panne) {
            setPanne(`panne : l'écoute — ${d.motif || "moteur muet"}`);
            noteEcouteRef.current = d.motif || "moteur muet";
          } else {
            noteEcouteRef.current = "";
          }
          tTranscritRef.current = Date.now();
          poserBorne(bornesRef.current, "ecoute");
          transcritRef.current = true;
          /* ── SA PHRASE ENTIÈRE, MÊME S'IL L'A COUPÉE EN DEUX ────────────

             S'il s'est mis à parler pendant qu'elle parlait, le début de sa
             phrase a été rattrapé par le guetteur et déposé de côté. Il se
             recolle ICI, devant ce que le micro ordinaire vient d'entendre —
             en un seul tour, pas deux. Sans rattrapage en attente, `dit` est
             exactement `d.texte` et rien ne change.

             On le consomme dans tous les cas : un morceau qu'on garde après
             s'en être servi finirait par se coller devant une phrase sans
             rapport. */
          /* La clé de l'extrait sonore que le serveur vient de garder. Elle
             attend le bouton bleu — et si aucun bouton ne vient, l'extrait
             reste dans le corpus sans texte vérifié, ce qui est déjà mieux
             que rien. */
          extraitRef.current = String((d as { extrait?: string }).extrait || "");
          const rattrape = motsRattrapesRef.current;
          motsRattrapesRef.current = null;
          const dit = recoller(rattrape, d.texte || "");
          if(Array.isArray(d.suggestions_ecriture)&&d.suggestions_ecriture.length){
            setSaisie(dit);setConversation(true);setClavier(true);
            setPanne("Écriture à vérifier : "+d.suggestions_ecriture.join(" / ")+". Corrige ou confirme le texte avec le bouton Envoyer.");
            setMode("ready");return;
          }
          dernierDitRef.current = dit;
          if (dit) {
            langueRef.current = estWolof(dit) ? "wo" : "fr";
            langueDuFil.current = langueRef.current;
            /* ── QUAND ON RIT, ELLE RIT — SANS PASSER PAR PERSONNE ─────────

               Lamine, le 12 septembre 2026 : « quand la personne rit, elle
               doit rire carrément, automatiquement. »

               AUTOMATIQUEMENT, donc sans le modèle. Un rire qui arrive cinq
               secondes après celui de l'autre n'est pas un rire partagé :
               c'est un commentaire. On le reconnaît dans ce que le micro a
               transcrit et elle rit tout de suite, avec la vraie voix de Kha.

               ET ON NE RÉPOND PAS À UN RIRE PAR UNE PHRASE. Si la personne
               n'a fait que rire, elle rit avec, et c'est tout : rien envoyé
               au modèle, rien envoyé à la voix, rien payé. Répondre « c'est
               drôle en effet » à quelqu'un qui rit, c'est ce que fait une
               machine.

               Si le rire accompagne une phrase, le rire part d'abord et la
               réponse suit — comme dans une vraie conversation. */
            const rire = lireLeRire(dit);
            if (rire.rit) {
              await finirAttente(langueRef.current, false);
              await jouerSouffle(rire.emotion || "rire");
              /* Deux attentes viennent de passer (fermer l'attente, jouer le
                 rire) : ce tour peut ne plus être le tour en cours. */
              if (!estLeTour(monTour)) return;
              if (rire.seulement) { setMode("ready"); setFace("joie"); return; }
            }
            /* ── UN TOUR EST DÉJÀ EN VOL : ON DÉPOSE, ON NE DEMANDE PAS ──

               Depuis le 17 septembre le micro reste ouvert pendant qu'elle
               réfléchit. Ce qu'il dit là arrive donc PENDANT que sa question
               précédente est encore chez le modèle. Lancer un second tour
               ici, ce serait deux réponses pour une conversation — et la
               garde de `askBia` le jetterait de toute façon.

               On le dépose au même endroit que le guetteur, et il se recolle
               tout seul : soit devant sa phrase suivante, soit tout de suite
               après sa réponse si elle se tait — voir « LA PHRASE DÉPOSÉE NE
               RESTE PAS PAR TERRE » plus bas. Ses mots ne tombent plus. */
            if (busyRef.current) {
              motsRattrapesRef.current = { texte: recoller(motsRattrapesRef.current, dit), quand: Date.now() };
              setMode("thinking");
              return;
            }
            void askBia(dit, true, monTour);
          } else {
            /* ── ELLE N'A RIEN ENTENDU, ET ELLE RESTAIT FIGÉE ────────────

               Lamine, le 12 septembre 2026 à deux heures du matin : « elle
               dit je t'entends, après elle se met à réfléchir et c'est tout,
               elle ne dit plus rien, le micro reste bloqué sur elle comme si
               elle parlait. »

               C'était ici, et c'est le vrai défaut — pas le chapeau. Quand la
               transcription revenait VIDE, on remettait le mode à « ready »
               et rien d'autre. Or l'attente, lancée trente lignes plus haut,
               continuait de tourner : son jeton restait en place, sa voix
               continuait, et le micro — qui se ferme pendant qu'elle parle —
               ne se rouvrait jamais. BIA paraissait bloquée, à jamais.

               Prouvé par les compteurs du serveur, quatre minutes après le
               redémarrage : quatre appels à Soynade, TOUS étiquetés
               « attente », 207 signes — et pas UN SEUL étiqueté « réponse »,
               zéro appel au modèle. L'attente parlait ; rien d'autre ne
               partait jamais.

               DEUX CHOSES MAINTENANT. On coupe l'attente — sans chapeau, il
               n'y a pas de réponse à joindre. Et elle le DIT, avec la phrase
               que Lamine avait écrite exactement pour ce cas et que rien
               n'appelait : « Dégguma la bu baax. Waxaatal doucemen. » Elle
               est déjà enregistrée, donc c'est instantané et gratuit. Une
               machine qui n'a pas entendu doit le dire ; se taire, c'est
               paraître en panne. */
            await finirAttente(langueRef.current, false);
            /* DEUX SILENCES DIFFÉRENTS, DEUX PHRASES DIFFÉRENTES.

               « Je n'ai pas entendu » invite à répéter, et c'est juste quand
               le micro a capté du vent. Mais quand c'est l'OREILLE qui est en
               panne — clé refusée, quota épuisé — répéter ne sert à rien, et
               le lui demander en boucle est une faute : on fait crier
               quelqu'un devant un micro qui ne transmet rien. */
            if (noteEcouteRef.current) {
              const enFrancais: boolean = (langueRef.current as Langue) === "fr";
              /* ON ATTEND QU'ELLE AIT FINI DE LE DIRE. Sans ce `await`, le
                 retour au repos partait aussitôt, le micro se rouvrait
                 180 ms plus tard — et BIA enregistrait sa propre phrase de
                 panne, la transcrivait, et répondait à elle-même. */
              await parlerAvecLeTelephone(enFrancais
                ? "Mon oreille est en panne, ce n'est pas toi. Regarde l'état de BIA."
                : "Sama nopp bi degul dara, Xoolal ndakh am nga code bu bax.");
              /* `stopMouth` a déjà remis « ready » à la fin de la voix : on ne
                 le réécrit que si ce tour est encore le tour en cours. */
              if (estLeTour(monTour)) setFace("concernee");
            } else {
              const base = adresseDuSon("audio-utilisateur-incompris", langueRef.current as "wo" | "fr");
              if (base) {
                /* .mp3 : octetsDuRepertoire retombe seul sur le .wav si la
                   conversion n'est pas encore passée par cette phrase-là. */
                try { await direSonTeutFait(base, "concernee"); }
                catch { if (estLeTour(monTour)) { setMode("ready"); setFace("yeux_ouverts"); } }
              } else if (estLeTour(monTour)) {
                setMode("ready"); setFace("yeux_ouverts");
              }
            }
          }
        } catch {
          /* Le réseau a lâché pendant la transcription : même règle. Sans ce
             finirAttente, l'attente survivait à l'erreur et bloquait tout. */
          /* ── LE CATCH PASSAIT AUTOUR DE LA PROTECTION ──────────────────

             La relecture du 12 septembre au soir : « setMode("error") est
             gardé, mais finirAttente tourne avant la garde. » Elle a raison,
             et c'est pire que le mode : finirAttente lève le jeton d'ATTENTE.
             Une transcription du tour 12 qui échoue pendant le tour 13
             coupait donc la parole du tour 13 — en silence.

             On vérifie donc AVANT de toucher à quoi que ce soit. Une requête
             qui échoue trop tard ne fait plus rien du tout. */
          if (!estCetEnregistrement(idEnr) || !estLeTour(monTour)) return;
          await finirAttente(langueRef.current, false);
          if (estLeTour(monTour)) setMode("error");
        }
      };

      /* Le tour de mesure repart ICI, à l'ouverture du micro — pas à sa
         fermeture. Les deux premières bornes (sa dernière syllabe à lui, la
         coupure du micro) se posent entre les deux : remettre à zéro plus
         tard les effacerait. */
      bornesRef.current = tourVide("parole");
      /* ── QUATRE CENTS MILLISECONDES, ET POURQUOI CE CHIFFRE ──────────────

         `start()` sans argument ne rend qu'un seul morceau, à la fin — c'est
         ce qui nous coûtait la seconde et demie. Avec un découpage, on en
         reçoit un toutes les 400 ms.

         Plus court ferait plus de requêtes pour rien : sur une phrase de
         quatre secondes, 200 ms en feraient vingt au lieu de dix, sur une
         connexion mobile de Dakar. Plus long laisserait un plus gros reste à
         monter au moment précis où il se tait — et c'est ce reste, et lui
         seul, qu'il attend. */
      enregistreur.start(400);
      setMode("listening");
      setFace("ecoute");
    } catch {
      setMode("error");
    }
  }, [arreterEnregistrement, askBia, attendreEnParlant, finirAttente, direSonTeutFait, parlerAvecLeTelephone, jouerSouffle, ouvrirUnTour, estLeTour, nouvelEnregistrement, estCetEnregistrement]);

  /* L'attente a besoin de rouvrir le micro pour recevoir le prénom, mais elle
     est définie avant `ecouter`. Ce renvoi évite d'avoir à réordonner tout le
     fichier pour une seule flèche. */
  ecouterRef.current = ecouter;

  /* Repli quand aucun moteur d'écoute n'est branché : la reconnaissance du
     navigateur. Elle ne connaît pas le wolof — « wo-SN » n'existe nulle part
     — donc on lui donne le décodeur français, le plus proche à l'oreille. */
  useEffect(() => {
    if (moteurs && moteurs.ecoute !== "navigateur") return;
    const scope = window as typeof window & {
      SpeechRecognition?: new () => Recognition;
      webkitSpeechRecognition?: new () => Recognition;
    };
    const RecognitionClass = scope.SpeechRecognition || scope.webkitSpeechRecognition;
    if (!RecognitionClass) return;
    const recognition = new RecognitionClass();
    recognition.lang = "fr-FR";
    recognition.interimResults = true;
    recognition.continuous = false;
    recognition.onstart = () => { setMode("listening"); setFace("ecoute"); };
    recognition.onend = () => setMode((c) => (c === "listening" ? "ready" : c));
    recognition.onerror = () => setMode("error");
    recognition.onresult = (event: any) => {
      const transcript = Array.from(event.results as ArrayLike<any>)
        .map((r: any) => r[0].transcript).join("");
      if (event.results[event.results.length - 1].isFinal) void askBia(transcript);
    };
    recognitionRef.current = recognition;
    return () => { recognition.stop(); recognitionRef.current = null; };
  }, [askBia, moteurs]);

  useEffect(() => () => {
    /* On quitte la page : le micro doit se fermer avec elle. Un flux laissé
       ouvert garde la pastille rouge allumée sur le téléphone — on croit
       alors que BIA écoute encore. */
    conversationRef.current = false;
    debrancherMicroRef.current?.();
    debrancherMicroRef.current = null;
    if (mouthTimer.current) clearInterval(mouthTimer.current);
    if (resetTimer.current) clearTimeout(resetTimer.current);
    atterrissage.current.forEach(clearTimeout);
    atterrissage.current = [];
    window.speechSynthesis?.cancel();
    if (animationRef.current) cancelAnimationFrame(animationRef.current);
    try { sourceRef.current?.stop(); } catch {}
    contexteRef.current?.close().catch(() => {});
  }, []);

  useEffect(() => {
    if (clavier) filRef.current?.scrollTo({ top: filRef.current.scrollHeight, behavior: "smooth" });
  }, [history, clavier]);

  /* Le fil est gardé sur l'appareil après chaque échange. Quand il dépasse
     trente messages, les plus anciens sont condensés en notes et retirés du
     fil : la conversation ne peut donc pas gonfler sans fin, et ce qui compte
     — le prénom, le métier, ce qui a été décidé — survit à l'oubli. */
  useEffect(() => {
    if (!history.length) return;
    /* On garde les quarante derniers échanges — PLUS tous les renvois vers un
       papier, où qu'ils soient. Sans cette exception, le devis de mardi
       disparaîtrait du fil au bout d'une longue conversation, alors qu'il est
       toujours dans la boîte : on verrait une liste pleine et un fil vide. */
    try {
      const recents = history.slice(-40);
      /* Ce qui porte un papier OU une correction ne se rogne pas. Une
         correction est le travail de la personne : la perdre dans le résumé,
         c'est exactement ce dont Lamine se plaignait. */
      const anciens = history.slice(0, Math.max(0, history.length - 40))
        .filter((m) => m.papier || m.corrige);
      localStorage.setItem(cleFil(profilRef.current), JSON.stringify([...anciens, ...recents]));
    } catch {}

    if (history.length <= 30 || resumeEnCours.current || !code) return;
    resumeEnCours.current = true;
    const aCondenser = history.slice(0, Math.min(12, history.length - 16));
    fetch("/api/resumer", {
      method: "POST",
      headers: { "content-type": "application/json", "x-bia-code": code },
      body: JSON.stringify({ echanges: aCondenser, resume: resumeRef.current }),
    })
      .then((r) => r.json())
      .then((d: { resume?: string; condensed?: boolean; condensed_count?: number }) => {
        if (!d.resume || !d.condensed || d.condensed_count !== aCondenser.length) return;
        setResume(d.resume);
        /* Même règle qu'à la sauvegarde : ce qui porte un papier ne se rogne
           pas. Le reste est résumé, et c'est très bien. */
        setHistory((items) => {
          if (!aCondenser.every((m, i) => items[i]?.role === m.role && items[i]?.text === m.text)) return items;
          return [...items.slice(0, aCondenser.length).filter((m) => m.papier || m.corrige), ...items.slice(aCondenser.length)];
        });
        try { localStorage.setItem(cleResume(profilRef.current), d.resume); } catch {}
      })
      .catch(() => {})
      .finally(() => { resumeEnCours.current = false; });
  }, [history, code]);

  /* BIA ne parle JAMAIS la première.

     Le mot d'accueil partait autrefois au premier appui sur le micro : elle
     se présentait avant qu'on lui ait rien dit, et cet appui-là ne lançait
     même pas l'écoute. On garde le mot d'accueil à l'écran — écrit, il
     accueille sans couper la parole — et le premier appui écoute, comme
     tous les suivants.

     Le geste sert quand même à quelque chose : il débloque le son du
     navigateur, qui refuse toute lecture audio avant une action de
     l'utilisateur. */

  /* Faire taire TOUT ce qui parle ou s'apprête à parler.

     Le micro coupait bien la réponse en cours, mais pas la phrase d'attente :
     elle finissait sa phrase par-dessus l'échange suivant, et les deux voix
     se chevauchaient. Les deux jetons doivent tomber ensemble. */
  const taire = useCallback(() => {
    window.speechSynthesis?.cancel();
    couperSon();
    tourRef.current = null;
    attenteRef.current = null;
    /* ── ON LUI COUPE LA PAROLE : LE TOUR ET L'ENREGISTREMENT SONT CLOS ───

       C'est l'endroit le plus important de la règle. Quand quelqu'un reprend
       la main, tout ce qui est en vol appartient déjà au passé : la réponse
       du modèle qui arrive, la voix en fabrication, la transcription en
       cours. En tournant le numéro du tour, ils deviennent tous périmés
       d'un coup — aucun d'eux ne pourra plus écrire l'état, et c'est le
       nouveau tour qui décidera.

       ET L'ENREGISTREMENT AVEC, depuis la relecture du 12 septembre au soir :
       une transcription en vol, une capture de prénom en vol, appartiennent
       elles aussi au passé. Faire tourner un seul des deux numéros laissait un
       chemin ouvert — et c'était celui du prénom. */
    ouvrirUnTour();
    nouvelEnregistrement();
    /* ── ET LA PLACE SE LIBÈRE TOUT DE SUITE ──────────────────────────────

       `busyRef` restait levé jusqu'au `finally` de la réponse qu'on vient
       de périmer — trois secondes pendant lesquelles askBia() refusait toute
       nouvelle question SANS RIEN DIRE. Tant que le guetteur ne coupait que
       pendant qu'elle parlait, la réponse était déjà arrivée et ça ne se
       voyait pas. Depuis qu'il coupe aussi pendant qu'elle réfléchit, la
       suite de sa phrase arriverait pendant ces trois secondes et serait
       jetée. Le tour est mort : la place est libre. Le `finally` en retard
       la remettra à faux une seconde fois, sans effet. */
    busyRef.current = false;
    /* ── ET ON ARRÊTE L'ENREGISTREUR, PAS SEULEMENT SON NUMÉRO ────────────

       Tourner le numéro rendait l'enregistrement périmé sans l'arrêter : le
       MediaRecorder continuait de tourner pour rien, et il gardait la place
       que la boucle de réouverture regarde. Le déclarer mort et le laisser
       vivre, c'était le défaut de « le micro reste inactif ».

       On ne le met pas à `null` ici : c'est `onstop` qui libère la place, et
       il n'y a qu'un chemin. */
    const mourant = enregistreurRef.current;
    if (mourant && mourant.state !== "inactive") { try { mourant.stop(); } catch { } }
    /* Quelqu'un vient de reprendre la main — pour corriger, pour ouvrir un
       papier, pour écrire. Il ne répond donc plus à « comment tu t'appelles ».
       Sans cette ligne, sa phrase suivante repartait dans la case du prénom
       et disparaissait sans réponse. */
    attendLeNomRef.current = false;
    /* ON LUI COUPE LA PAROLE : L'INTERFACE DOIT REDEVENIR UTILISABLE TOUT DE
       SUITE. La boucle de lecture s'en apercevra à son tour, mais elle peut
       dormir encore deux secondes — et pendant ces deux secondes, le micro
       resterait éteint sans raison.

       ── ET « LISTENING » EN FAIT PARTIE, DEPUIS LE 12 SEPTEMBRE AU SOIR ────

       C'était la seconde moitié de son « le micro reste inactif », et le
       journal des états l'a montrée en trois lignes : après un `taire()` pris
       pendant qu'on écoutait, le mode restait sur `listening` pour toujours.

       Il n'y avait pourtant plus rien qui écoutait — `taire()` venait
       justement de périmer l'enregistrement. L'écran affichait donc une
       écoute morte, et la boucle qui rouvre le micro, elle, n'attend qu'un
       retour à `ready` : elle ne se déclenchait jamais.

       Un état qu'on ne quitte pas est une panne, même quand il a l'air
       normal. Si on a tué l'écoute, on dit qu'elle est finie. */
    setMode((m) => (m === "speaking" || m === "thinking" || m === "listening" ? "ready" : m));
    // Le visage revient au repos s'il était figé sur la réflexion. Les
    // images de bouche, elles, sont remises par l'animation qui s'arrête.
    setFace((f) => (f === "pensive" ? "yeux_ouverts" : f));
  }, [couperSon, ouvrirUnTour, nouvelEnregistrement]);
  taireRef.current = taire;
  /* Même procédé que taireRef : le guetteur est posé une fois par état et ne
     doit pas être démonté quand askBia change d'identité — démonter le
     guetteur ouvre la porte, et elle parlerait par-dessus lui. */
  askBiaRef.current = askBia;

  /* ── LA FENÊTRE DES SERVICES FERME LE MICRO ─────────────────────────────

     Lamine, le 12 septembre 2026 au soir, capture à l'appui : iOS lui
     demandait « arrêter l'enregistrement audio ? » pendant qu'il était dans
     la fenêtre des services, un devis à l'écran, et le point orange allumé en
     haut de son téléphone.

     Le clavier fermait déjà la conversation — « sinon on transcrit les
     touches ». Cette fenêtre-ci ne le faisait pas, et c'est le même
     raisonnement : ici on TOUCHE, on ne parle pas. Le micro ouvert
     enregistrait ses gestes, payait une transcription pour du silence, et
     allumait un point orange que personne ne s'explique — sur un téléphone
     prêté, ça ressemble à une application qui écoute en cachette.

     ET LA RÈGLE EST POSÉE SUR L'ÉTAT, PAS DANS LES BOUTONS. Ma première
     version la mettait dans `ouvrirPapier`, et l'épreuve au navigateur a
     trouvé tout de suite qu'un autre chemin l'ouvrait aussi — « ton papier
     est prêt, l'ouvrir ». Il y en a au moins quatre. Une règle écrite à
     quatre endroits en manque un cinquième ; écrite ici, elle vaut pour tous
     les chemins, ceux d'aujourd'hui et ceux de demain.

     ── ET IL FAUT LE ROUVRIR EN SORTANT ────────────────────────────────────

     Lamine, le 18 septembre 2026 :

       « Une fois que tu entres dans la fenêtre, tu veux voir un message ou
         ouvrir l'appareil photo ou quelque chose dans cette fenêtre, si tu
         reviens à BIA elle ne t'entend plus. Il faut que tu fermes
         l'application et la rouvres. »

     DEUX DÉFAUTS EN UN, et le second était le grave.

     Le petit : j'avais écrit « un appui sur le micro le rouvre, comme
     avant ». C'était vrai pour la carte et pour la vidéo, qui ont chacune
     leur témoin et se rouvrent TOUTES SEULES ; cette fenêtre-ci était la
     seule des trois à ne rien retenir. Elle en a un maintenant.

     Le grave : ON NE POUVAIT MÊME PLUS LE ROUVRIR À LA MAIN. Cet effet
     appelait `fermerConversation()` sans `taire()` — les deux autres portes
     appellent les deux. Or `fermerConversation` ne remettait au repos que le
     mode « listening ». Si la fenêtre s'ouvrait pendant qu'elle RÉFLÉCHIT ou
     qu'elle PARLE, le mode restait figé là — et il ne pouvait plus bouger,
     puisque la réponse en vol venait justement d'être périmée et n'écrirait
     plus rien. Le bouton du micro, lui, refuse d'ouvrir quand le mode est
     « thinking » ou « speaking » hors conversation. Résultat : un bouton mort
     jusqu'au redémarrage de l'application. Exactement ce qu'il décrit.

     C'est la leçon déjà écrite dans `taire()`, à trois cents lignes d'ici :
     UN ÉTAT QU'ON NE QUITTE PAS EST UNE PANNE, MÊME QUAND IL A L'AIR NORMAL.
     Je l'avais tirée une fois et laissée à un seul endroit. Elle est
     maintenant dans `fermerConversation` aussi, qui est l'autre porte de
     sortie — et cette porte-ci se ferme comme les autres, avec `taire()`. */
  useEffect(() => {
    if (papierOuvert) {
      if (!microAvantLesServices.current) {
        microAvantLesServices.current = conversationRef.current;
        if (conversationRef.current) { taireRef.current?.(); fermerConversation(); }
      }
      return;
    }
    /* On ne rallume PAS un micro qu'il venait de couper lui-même : même
       règle que pour la carte et pour la vidéo. */
    if (!microAvantLesServices.current) return;
    microAvantLesServices.current = false;
    conversationRef.current = true;
    setConversation(true);
    void ecouterRef.current?.();
  }, [papierOuvert, fermerConversation]);

  /* ── ELLE SE REMET À ÉCOUTER TOUTE SEULE ────────────────────────────────

     Lamine, le 12 septembre 2026 : « après sa réponse, BIA se remet
     automatiquement à écouter. »

     ON NE LE FAIT PAS DEPUIS onstop, et c'est le point délicat. `askBia` est
     lancée sans être attendue : onstop rend la main pendant que la réponse se
     fabrique. Relancer le micro là, ce serait l'ouvrir PENDANT qu'elle parle —
     elle s'entendrait, se transcrirait, se répondrait.

     On se raccroche donc à ce qui est vrai : le retour au repos. Quel que
     soit le chemin — une réponse dite, un rire seul, une phrase annulée, un
     bruit qu'on a jeté — BIA finit toujours par revenir à « ready », et c'est
     à cet instant que le micro se rouvre.

     PAS APRÈS UNE PANNE (« error ») : on ne relance pas une boucle sur
     quelque chose qui vient d'échouer. Le bouton reste là, c'est à la
     personne de décider.

     Le dixième de seconde d'attente laisse le son se taire pour de bon : sans
     lui, la traîne de sa dernière syllabe ouvre le tour suivant. */
  /* ── ET SEUL UN ENREGISTREUR VIVANT A LE DROIT DE BARRER LA ROUTE ────────

     Troisième verrou du 12 septembre, et c'est celui qui pardonne. Les deux
     premiers — `onstop` qui libère la place, `taire()` qui arrête vraiment —
     empêchent le cadavre d'exister. Celui-ci fait qu'un cadavre, s'il en
     restait un par un chemin que je n'ai pas vu, ne condamne plus le micro :
     on ne s'arrête que devant un enregistreur QUI ENREGISTRE.

     Un ref qu'on oublie de vider est une faute d'inattention ordinaire. Qu'un
     oubli pareil rende BIA sourde pour le reste de la séance, ça ne doit plus
     pouvoir arriver. */
  const enregistreEncore = useCallback(
    () => enregistreurRef.current !== null && enregistreurRef.current.state === "recording",
    [],
  );

  /* ── J'AI OUVERT LE MICRO PENDANT QU'ELLE RÉFLÉCHIT, ET JE L'AI REFERMÉ ──

     Le 17 septembre 2026 au matin, sur sa demande — « il faut que pendant
     qu'elle réfléchisse, que je puisse continuer à parler » — j'ai fait
     accepter « thinking » à cet effet, en plus de « ready ».

     LE SOIR MÊME : « elle ne m'entend pas, le micro se coupe très vite. »

     MON RAISONNEMENT ÉTAIT FAUX, ET VOICI OÙ. J'avais écrit : « thinking,
     elle est MUETTE, donc aucun écho possible ». Vrai à l'instant où le
     micro s'ouvre. Faux une seconde plus tard — parce que ce micro-là NE SE
     FERME PAS quand elle se met à parler. Il reste ouvert, il entend sa voix
     dans le haut-parleur, `aParle` passe à vrai, et au premier blanc entre
     deux de ses morceaux le silence suffit : le micro se coupe. Sur SA voix
     à elle, pas sur la sienne.

     Vu de Lamine : un micro qui s'ouvre et se referme tout seul pendant
     qu'elle parle, et qui n'est plus là quand lui prend la parole.

     L'état de la boucle ne dit pas ce qui SUIVRA. « Elle est muette
     maintenant » ne veut pas dire « elle se taira pendant tout
     l'enregistrement », et c'est exactement la différence que j'ai manquée.

     ON REVIENT DONC À « ready ». Pendant qu'elle parle, c'est le guetteur qui
     écoute — il a ses propres précautions contre l'écho, et il ne déclenche
     aucun tour. La fenêtre où il ne peut pas parler redevient les trois
     secondes du modèle, comme avant.

     CE QUI RESTE DE CE MATIN, et qui est bon : ce qu'il dit pendant qu'un
     tour est en vol est DÉPOSÉ au lieu d'être jeté, et reparti dès qu'elle se
     tait. Voir plus bas. Refaire l'ouverture pendant qu'elle réfléchit
     demande de fermer ce micro à l'instant où elle ouvre la bouche — ça se
     fait, mais pas dans un navigateur où je ne maîtrise pas la session audio.
     C'est précisément ce que l'enveloppe Capacitor doit permettre de tester. */
  /* ── ON QUITTE L'APPLICATION, ON REVIENT, ELLE ENTEND ENCORE ────────────

     Lamine, le 18 septembre 2026, sur l'application native :

       « Quand on discute, pendant un certain temps, j'ai l'impression que le
         micro se désactive. Au bout de quelques minutes. Ou quand j'ouvre par
         exemple appareil photo, ou message, si je reviens, le micro se
         désactive. »

     CE N'EST PAS LA MÊME CHOSE QUE LA RANGÉE DES TUILES, réparée quelques
     heures plus tôt. Celle-là est une fenêtre DANS BIA, et c'est nous qui
     fermions le micro. Ici il QUITTE BIA — l'appareil photo d'iOS, Messages,
     un appel — et c'est le téléphone qui reprend le micro, sans rien nous
     dire.

     AU RETOUR, TOUT CE QUI ÉTAIT EN VOL EST MORT : la piste du micro,
     l'enregistreur qui tournait dessus, le contexte audio, et la réponse qui
     se fabriquait. Mais rien de tout ça ne s'annonce. L'écran revient comme
     on l'avait laissé, et c'est ça le piège : il a l'air prêt.

     ON REFAIT DONC L'ÉTAT AU LIEU DE LE SUPPOSER. `taire()` remet au repos
     et périme ce qui traînait ; on débranche le micro pour que le prochain
     en reprenne un neuf ; et on relance l'écoute, parce que le mode était
     peut-être DÉJÀ « ready » — auquel cas la boucle de réouverture, qui
     n'attend qu'un changement, ne se déclencherait jamais.

     SEULEMENT SI LA CONVERSATION ÉTAIT OUVERTE. Revenir à BIA ne doit pas
     allumer un micro que personne n'a demandé : ce serait le point orange
     allumé sans raison, et c'est exactement ce qu'il ne veut plus.

     LE DEMI-SECOND D'ATTENTE n'est pas une superstition : au retour, iOS
     rend la session audio avec un temps de retard, et un getUserMedia
     demandé trop tôt rend une piste déjà coupée. On laisse le téléphone
     finir de revenir. */
  useEffect(() => {
    const auRetour = () => {
      if (document.visibilityState !== "visible") return;
      if (!conversationRef.current) return;
      taireRef.current?.();
      debrancherMicroRef.current?.();
      debrancherMicroRef.current = null;
      setTimeout(() => {
        if (!conversationRef.current || busyRef.current) return;
        if (enregistreEncore()) return;
        void ecouterRef.current?.();
      }, 500);
    };
    document.addEventListener("visibilitychange", auRetour);
    return () => document.removeEventListener("visibilitychange", auRetour);
  }, [enregistreEncore]);

  useEffect(() => {
    if (!conversation || mode !== "ready") return;
    if (enregistreEncore()) return;
    const t = setTimeout(() => {
      if (!conversationRef.current || enregistreEncore()) return;
      void ecouterRef.current?.();
    }, 180);
    return () => clearTimeout(t);
  }, [conversation, mode, enregistreEncore]);

  /* ── LA PHRASE DÉPOSÉE NE RESTE PAS PAR TERRE ───────────────────────────

     Le complément indispensable du dépôt ci-dessus. S'il parle pendant
     qu'elle réfléchit, puis se tait pour écouter sa réponse, ses mots
     resteraient déposés sans que personne y réponde jamais — et de son point
     de vue il aurait parlé dans le vide, ce qui est exactement le défaut
     qu'on répare.

     Dès qu'elle est revenue au repos, ce qui traîne part donc tout seul. Ce
     n'est pas un tour de plus inventé : c'est SA phrase à lui, qu'on avait
     mise de côté faute de pouvoir la traiter à l'instant.

     TROIS PRÉCAUTIONS. On ne part que du repos, jamais pendant qu'elle parle.
     On respecte le délai du rattrapage — une phrase d'il y a une minute
     n'est plus la conversation en cours, et lib/sa-propre-voix.ts le dit
     déjà. Et on laisse une seconde : s'il est en train de reprendre la
     parole, c'est le micro ordinaire qui doit l'entendre, et le recollage se
     fera devant sa phrase entière plutôt qu'en deux morceaux. */
  useEffect(() => {
    if (!conversation || mode !== "ready") return;
    const t = setTimeout(() => {
      const reste = motsRattrapesRef.current;
      if (!reste || !conversationRef.current || busyRef.current) return;
      if (enregistreEncore()) return;
      if (Date.now() - reste.quand > DUREE_DU_RATTRAPAGE) { motsRattrapesRef.current = null; return; }
      /* ── ET JAMAIS DEUX FOIS LA MÊME PHRASE ──────────────────────────────

         Le second verrou de la boucle du 17 septembre au soir. Le premier
         vide le dépôt quand un ordre prend effet ; celui-ci rattrape tous les
         autres cas — une phrase qu'elle a DÉJÀ reçue comme question n'a
         aucune raison de repartir. Sans lui, n'importe quel geste futur qui
         oublierait de vider le dépôt rouvrirait la même boucle.

         On regarde ses quatre dernières phrases à lui, sur la forme sonnée :
         l'oreille n'écrit jamais le wolof deux fois pareil, et une
         comparaison lettre à lettre laisserait passer le doublon. */
      const dejaDemande = historyRef.current
        .filter((m) => m.role === "user")
        .slice(-4)
        .some((m) => sonne(String(m.text || "")) === sonne(reste.texte));
      if (dejaDemande) { motsRattrapesRef.current = null; return; }
      motsRattrapesRef.current = null;
      void askBia(reste.texte, true);
    }, 1000);
    return () => clearTimeout(t);
  }, [conversation, mode, enregistreEncore, askBia]);

  /* ── LUI COUPER LA PAROLE ───────────────────────────────────────────────

     Lamine : « si l'utilisateur reprend la parole pendant la réponse de BIA,
     la lecture s'arrête immédiatement et BIA l'écoute. »

     ET C'EST LE PLUS DANGEREUX DE TOUT LE FICHIER. Micro ouvert pendant
     qu'elle parle dans le haut-parleur : elle s'entend. Elle se transcrit,
     elle se répond, et ça tourne en boucle en payant une transcription à
     chaque tour. L'annulation d'écho du navigateur aide, mais elle ne suffit
     pas toujours sur un haut-parleur de téléphone.

     Alors on demande deux choses à la fois, et il choisit ainsi le
     12 septembre : il faut la COUVRIR — être plus fort qu'elle, sa propre
     énergie servant de barre — et TENIR un quart de seconde. Un claquement de
     portière est fort mais court ; un écho est court et jamais plus fort que
     la source. Une vraie voix est les deux.

     Avec des écouteurs, il n'y a pas d'écho du tout : la barre retombe au
     seuil ordinaire et elle se tait au premier mot. */
  /* ── ET PENDANT QU'ELLE RÉFLÉCHIT AUSSI, DEPUIS LE 19 SEPTEMBRE ──────────

     Lamine, le 18 : « quand je parle, parfois elle me coupe sans que je
     termine. » Le silence qui ferme le micro a été réglé cinq fois en une
     semaine, et il le sera encore : aucun nombre ne sépare une respiration
     d'une fin de phrase. Le vrai défaut était ailleurs — entre la fermeture
     du micro et le premier mot de sa réponse, cinq à sept secondes, PERSONNE
     n'écoutait. Le guetteur ne s'armait que pendant qu'elle parlait.

     S'il reprenait sa phrase pendant qu'elle réfléchissait, la fin tombait
     dans le vide et elle répondait à la moitié. Ce n'est pas le seuil qui
     coupait : c'est le trou d'après.

     Donc le guetteur s'arme dès qu'elle réfléchit. S'il parle, on tue le
     tour — la réponse à la demi-phrase ne sera jamais dite — et on recolle
     ce qu'il avait déjà dit (questionEnVolRef) devant ce qu'il ajoute. Une
     phrase, un tour, une réponse. Et si c'était un bruit et pas lui, sa
     question repart telle quelle : au pire il attend une seconde de plus,
     jamais il ne parle dans le vide.

     La même barre sert : pendant qu'elle réfléchit, sa voix à elle est à
     zéro (ou c'est la phrase d'attente, qui compte comme sa voix), donc la
     barre retombe au seuil ordinaire — c'est le cas « avec des écouteurs »
     décrit ci-dessus. */
  useEffect(() => {
    if (!conversation || (mode !== "speaking" && mode !== "thinking")) return;
    const analyse = analyseRef.current;
    if (!analyse) return;
    const tampon = new Uint8Array(analyse.frequencyBinCount);
    /* ── DU BRUIT FORT N'EST PAS UNE VOIX ─────────────────────────────────

       Trouvé le 26 septembre 2026, en mesurant en conversation réelle
       (voir /api/etat, champ `guet`) : un guetteur qui coupait bel et bien
       sur un vrai dépassement soutenu du volume (pas le blanc technique
       réglé juste avant) -- creux jusqu'à 126 contre une barre à 8-23,
       tenu plusieurs dixièmes de seconde. Un bruit de fond continu (la
       rue, un climatiseur, une pièce animée) peut être aussi FORT et aussi
       SOUTENU qu'une vraie interruption ; seule la hauteur les distingue
       -- voir hauteurDeVoix() dans lib/micro.ts, déjà posé le 25 septembre
       pour l'autre micro (celui qui décide d'envoyer à la transcription).
       On le réutilise ici tel quel, sur le même second analyseur, déjà
       branché sans coût : un calcul de plus par tour de 60 ms, aucun
       aller-retour, aucun retard ajouté à la coupure. Si ce second
       analyseur manque pour une raison quelconque, on retombe sur l'ancien
       comportement (volume seul) plutôt que de ne jamais couper. */
    const analysePeriodique = analysePeriodiqueRef.current;
    const tamponPeriodique = analysePeriodique ? new Uint8Array(analysePeriodique.fftSize) : null;
    const detecter = creerDetectionInterruption();
    const spectreInterruption = new Uint8Array(analyse.frequencyBinCount);
    let vivant = true;
    let porteDuGuet: typeof porteRef.current = null;
    let finEnCours = false;
    let revisionParole = 0;
    /* Figé à l'armement : c'est CE guetteur-là qui sait dans quel état il a
       été posé, même si l'état a changé entre-temps. */
    const pendantLaReflexion = mode === "thinking";

    /* ── ET ON GARDE CE QU'IL DIT, AU LIEU DE LE LUI FAIRE REDIRE ──────────

       Lamine, le 15 septembre 2026 : « le micro doit avoir le comportement du
       micro de ChatGPT vocal. Même quand elle parle, si je parle, le micro
       doit automatiquement saisir ce que j'ai dit, elle doit se taire. »

       LA MOITIÉ EXISTAIT DÉJÀ : le guetteur ci-dessus la faisait taire. Ce
       qui manquait, c'est que l'enregistreur est arrêté pendant qu'elle
       parle, suivant sa règle du 9 septembre (« le micro doit rester inactif
       pour ne pas embrouiller »). Le micro l'entendait, mais ne gardait rien :
       ses mots étaient perdus et il devait les redire. C'était ça, « il faut
       que j'attends » — pas l'attente, la répétition.

       ON N'A PAS TOUCHÉ AU MOMENT OÙ ELLE SE TAIT, et c'est voulu. Couper sur
       le volume prend un quart de seconde ; attendre des mots transcrits en
       prendrait trois fois plus. On garde donc sa réactivité d'aujourd'hui,
       et on se sert des mots pour décider de la SUITE — pas de la coupure.

       UN SECOND ENREGISTREUR, sur le même flux, qui ne partage rien avec
       celui de la conversation. Toutes les courses qu'on a réparées depuis
       une semaine vivent dans l'autre ; celui-ci n'y touche pas. */
    const flux = fluxRef.current;
    const armer = GARDER_CE_QUIL_DIT_PENDANT_QUELLE_PARLE && flux?.active;
    let guetteur: MediaRecorder | null = null;
    const tourGuet = `g${Date.now().toString(36)}${Math.random().toString(36).slice(2, 10)}`;
    let morceauxGuet = 0;
    /* Les envois en cours. C'est le détail qui fait toute la différence : ses
       mots à lui sont dans le DERNIER morceau, celui qui n'est pas encore
       arrivé au serveur à la seconde où on la coupe. Demander la transcription
       sans attendre ces envois, c'est demander la transcription de sa voix à
       ELLE — tout ce qui précède — et jeter la sienne. */
    const envois: Promise<unknown>[] = [];
    if (armer) {
      try {
        guetteur = ouvrirEnregistreur(flux!);
        guetteur.ondataavailable = (e) => {
          if (!e.data.size) return;
          const i = morceauxGuet++;
          const type = guetteur!.mimeType || e.data.type || "audio/webm";
          const f = new FormData();
          f.append("tour", tourGuet);
          f.append("indice", String(i));
          f.append("type", type);
          f.append("nom", `parole.${extensionDe(type)}`);
          f.append("morceau", e.data, `m${i}`);
          envois.push(fetch("/api/ecouter/morceau", {
            method: "POST", headers: { "x-bia-code": codeRef.current }, body: f,
          }).catch(() => { /* un morceau perdu ne coûte qu'une reprise de plus */ }));
        };
        guetteur.start(400);
      } catch { guetteur = null; }
    }

    /* Ce qu'il a dit pendant qu'elle parlait, une fois qu'on l'a fait taire.
       Cette route coûte une transcription : elle ne part QUE si le volume a
       déjà vu quelque chose le couvrir. Le volume ne décide jamais du
       contenu ; il décide seulement s'il vaut la peine de demander des mots. */
    /* ── SES MOTS, TELS QUE LE GUETTEUR LES A ENTENDUS ──────────────────

       Cette route coûte une transcription : elle ne part QUE si le volume a
       déjà vu quelque chose franchir la barre. Le volume ne décide jamais du
       contenu ; il décide seulement s'il vaut la peine de demander des mots.
       Rend "" si rien n'a été capté, si c'est son propre écho, ou si le
       réseau a lâché — et le dit dans `sans_mots`. */
    let dejaRepris = false;
    const motsDuGuetteur = async (): Promise<string> => {
      if (dejaRepris || !guetteur) return "";
      dejaRepris = true;
      const dits = ditsRef.current;
      /* On réclame le morceau en cours — sinon il dort dans le navigateur
         jusqu'au prochain tour de 400 ms, et c'est justement celui-là qui
         porte ses mots. Puis on laisse les envois se poser. */
      try { if (guetteur.state === "recording") guetteur.requestData(); } catch { }
      await new Promise((r) => setTimeout(r, FLUX_DU_GUETTEUR));
      await Promise.allSettled(envois);
      if (morceauxGuet === 0) return "";
      const f = new FormData();
      f.append("tour", tourGuet);
      f.append("indice_langue", langueDuFil.current || "");
      try {
        const r = await fetch("/api/ecouter/apercu", {
          method: "POST", headers: { "x-bia-code": codeRef.current }, body: f,
        });
        const d = await r.json() as { texte?: string };
        const verdict = faut_il_se_taire(d.texte || "", dits);
        /* SON PROPRE ÉCHO NE RELANCE RIEN. Sans cette garde, elle se
           répondrait à elle-même en payant un tour à chaque fois — et c'est
           exactement le risque de garder le micro ouvert. */
        return verdict.couper ? verdict.dit : "";
      } catch { return ""; }
    };

    const mesurerLaCoupure = (recolle: boolean, mots: string, motif?: string, repriseMs?: number) => {
      /* RÈGLE 1 : ce qui touche le micro se lit sur /api/etat, champ
         `coupures`. Sans cette ligne on ferait dix tours sans savoir si le
         guetteur a coupé pour lui ou pour une porte. Le 21 septembre : et
         POURQUOI il n'a pas recollé — voir noterCoupure() dans
         lib/attentes-vues.ts. */
      void fetch("/api/mesure", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          type: "coupure",
          pendant: pendantLaReflexion ? "reflexion" : "parole",
          recolle,
          sans_mots: !mots.trim(),
          ...(motif ? { motif } : {}),
          ...(Number.isFinite(repriseMs) ? { reprise_ms: repriseMs } : {}),
        }),
      }).catch(() => {});
    };

    /* ── PENDANT QU'ELLE PARLE : ELLE SE TAIT, ET SES MOTS SONT GARDÉS ────

       Inchangé sur le fond depuis le 15 septembre : on l'a déjà fait taire
       par le volume ; il reste à ne pas lui faire redire sa phrase. On ne
       lance PAS de tour d'ici : le micro ordinaire vient de se rouvrir et
       tient la suite. On dépose le début, et c'est lui qui recollera. Voir
       recoller() dans lib/sa-propre-voix.ts. */
    const reprendreSesMots = async () => {
      const tourRepris = numeroDuTourRef.current;
      const mots = await motsDuGuetteur();
      if (!conversationRef.current || numeroDuTourRef.current !== tourRepris) return;
      if (mots) motsRattrapesRef.current = { texte: mots, quand: Date.now() };
      mesurerLaCoupure(false, mots);
    };

    /* Une reprise de parole reste prioritaire, même si la synthèse tarde. */
    const finDeSaParole = async (parleDepuis: number) => {
      if (finEnCours || (!questionEnVolRef.current && !transcritRef.current && !busyRef.current)) return;
      finEnCours = true;
      const monTour = numeroDuTourRef.current;
      const porte = porteDuGuet;
      const revision = revisionParole;
      const micro = bornesRef.current.micro;
      const reprise = micro ? parleDepuis - micro : undefined;
      try {
        dejaRepris = false;
        const mots = await motsDuGuetteur();
        if (!vivant || numeroDuTourRef.current !== monTour) return;
        if (revisionParole !== revision) return;
        const debut = questionEnVolRef.current.trim();
        // Il a repris pendant la transcription : garder la porte fermée et réécouter.
        if (tuDepuis < silenceQuiSuffit(Date.now() - parleDepuis - tuDepuis, coupesTropTotRef.current)) return;
        const continuation = Boolean(debut) && Boolean(mots.trim());
        mesurerLaCoupure(continuation, mots, continuation ? "recollee" : !mots.trim() ? "sans_mots" : "pas_de_debut", reprise);
        ilParle = false;
        if (mots.trim()) {
          // Même après une synthèse lente, la nouvelle parole passe avant la réponse en attente.
          ouvrirUnTour();
          busyRef.current = false;
          questionEnVolRef.current = "";
          if (continuation) {
            coupesTropTotRef.current += 1;
            const items = historyRef.current;
            let index = items.length - 1;
            while (index >= 0 && !(items[index].role === "user" && items[index].text === debut)) index--;
            if (index >= 0) {
              historyRef.current = items.slice(0, index);
              setHistory(historyRef.current);
            }
          }
          if (porteRef.current === porte) porteRef.current = null;
          porteDuGuet = null;
          porte?.ouvrir();
          setRepriseDuTour((n) => n + 1);
          void askBiaRef.current?.(continuation ? recoller({ texte: debut, quand: Date.now() }, mots) : mots, true);
          return;
        }
        if (porteRef.current === porte) porteRef.current = null;
        porteDuGuet = null;
        porte?.ouvrir();
      } finally { finEnCours = false; }
    };

    let echoMoyen = -1;
    const vu = { tours: 0, creux_max: 0, barre_max: 0, tours_au_dessus: 0, a_coupe: false };
    /* Pendant la réflexion : est-il en train de parler, depuis quand, et
       depuis combien de temps s'est-il tu. */
    let ilParle = false;
    let parleDepuis = 0;
    let tuDepuis = 0;

    const guet = setInterval(() => {
      // Les blancs entre deux segments restent interruptibles.
      analyse.getByteTimeDomainData(tampon);
      let creux = 0;
      for (const v of tampon) creux = Math.max(creux, Math.abs(v - 128));
      const elle = sonDelleRef.current;
      const seuil = seuilRef.current || 8;
      /* L'écho ne se mesure que pendant qu'elle parle, et seulement sous la
         barre : ce qui passe au-dessus, c'est lui, pas elle. */
      const barre = barreDeCoupure(seuil, elle, echoMoyen >= 0 ? echoMoyen : undefined);
      if (elle > 0 && creux <= barre) echoMoyen = suivreLEcho(echoMoyen, creux);
      vu.tours += 1;
      if (creux > vu.creux_max) vu.creux_max = creux;
      if (barre > vu.barre_max) vu.barre_max = barre;
      /* Un dépassement ne compte que s'il a la hauteur d'une voix. Sans le
         second analyseur (cas imprévu), on ne s'y fie pas : le volume seul
         tranche, comme avant. */
      let estUneVoix = true;
      if (creux > barre && analysePeriodique && tamponPeriodique) {
        analysePeriodique.getByteTimeDomainData(tamponPeriodique);
        analyse.getByteFrequencyData(spectreInterruption);
        estUneVoix = partVocale(spectreInterruption, analyse.context.sampleRate) >= 0.2 &&
          hauteurDeVoix(tamponPeriodique, analysePeriodique.context.sampleRate) >= HAUTEUR_MINIMALE;
      }
      const interruption = detecter(creux > barre, estUneVoix, TOUR_DE_VEILLE);
      if (creux > barre && (estUneVoix || ilParle)) {
        revisionParole += 1;
        vu.tours_au_dessus += 1;
        tuDepuis = 0;
        if (interruption && (pendantLaReflexion ? !ilParle : !vu.a_coupe)) {
          vu.a_coupe = true;
          if (pendantLaReflexion) {
            /* Il parle pendant qu'elle réfléchit : on ne tue rien, on FERME
               LA PORTE. La réponse continue de se fabriquer derrière ; elle
               attendra qu'il ait fini. Voir finDeSaParole() plus haut.

               Et s'il reprend une DEUXIÈME fois dans la même réflexion, la
               porte se referme : le guetteur a tout enregistré depuis le
               début, la transcription suivante portera les deux phrases, et
               recoller() ne répète pas ce qui est déjà là. */
            ilParle = true;
            parleDepuis = Date.now() - 300;
            if (!porteRef.current) {
              let ouvrir: () => void = () => {};
              const attendre = new Promise<void>((r) => { ouvrir = r; });
              porteDuGuet = { attendre, ouvrir, depuis: Date.now() };
              porteRef.current = porteDuGuet;
            }
          } else {
            /* Elle parlait : on la fait taire. `taire()` coupe le son, remet
               le repos — et c'est le retour au repos qui rouvre le micro,
               par l'effet ci-dessus. Un seul chemin, pas deux. Les mots
               arrivent APRÈS, sans faire attendre la coupure. */
            taireRef.current?.();
            void reprendreSesMots();
          }
        }
      } else {
        /* Il s'est tu ? Le même silence que le plus court du micro ordinaire :
           en dessous on couperait la parole, et c'est précisément ce qu'il
           ne veut plus. */
        if (ilParle) {
          tuDepuis += TOUR_DE_VEILLE;
          if (tuDepuis >= silenceQuiSuffit(Date.now() - parleDepuis - tuDepuis, coupesTropTotRef.current)) {
            void finDeSaParole(parleDepuis);
          }
        }
      }
    }, TOUR_DE_VEILLE);
    return () => {
      vivant = false;
      clearInterval(guet);
      if (guetteur && guetteur.state !== "inactive") { try { guetteur.stop(); } catch { } }
      /* Une porte qu'on démonte s'ouvre : elle ne doit jamais rester fermée
         sans personne derrière pour l'ouvrir. */
      if (porteRef.current === porteDuGuet) porteRef.current = null;
      porteDuGuet?.ouvrir();
      /* La phase est finie : on dit ce qu'on a entendu. Une phase sans un
         seul tour de veille (démontée aussitôt posée) ne dit rien. */
      if (vu.tours > 3) {
        void fetch("/api/mesure", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({
            type: "guet",
            pendant: pendantLaReflexion ? "reflexion" : "parole",
            arme: Boolean(guetteur),
            echo_moyen: echoMoyen >= 0 ? echoMoyen : 0,
            ...vu,
          }),
        }).catch(() => {});
      }
    };
  }, [conversation, mode, repriseDuTour]);

  /* LE MICRO SE FERME PENDANT QU'ELLE PARLE.

     Demande de Lamine, 9 septembre 2026 : « dès que le micro est coupé, et
     pendant qu'elle parle, le micro doit rester inactif, le temps qu'elle
     finisse, pour ne pas embrouiller ».

     Elle prend la parole à la seconde où le micro se coupe et ne la lâche
     plus jusqu'à la fin de sa réponse. Rouvrir le micro au milieu de tout ça
     coupait sa phrase, mélangeait les deux voix, et faisait repartir un tour
     par-dessus le précédent. Le bouton s'éteint donc, visiblement, et se
     rallume quand elle a fini. */
  /* ── LE BOUTON A CHANGÉ DE SENS, ET C'EST VOULU ────────────────────────

     Le 9 septembre, Lamine : « dès que le micro est coupé, et pendant qu'elle
     parle, le micro doit rester inactif, le temps qu'elle finisse, pour ne
     pas embrouiller. » Le bouton s'éteignait donc pendant qu'elle parlait.

     Le 12 septembre, il demande l'inverse : « si l'utilisateur reprend la
     parole pendant la réponse de BIA, la lecture s'arrête immédiatement. »
     Les deux demandes ne se contredisent pas vraiment — la première visait le
     mélange des deux voix, que le guetteur d'écho règle maintenant tout seul.

     EN CONVERSATION, LE BOUTON RESTE DONC VIVANT : un appui pendant qu'elle
     parle la fait taire et rend la parole. Hors conversation, rien ne change,
     et c'est le bouton manuel de secours qu'il demande de garder. */
  const microFerme = !conversation && (mode === "thinking" || mode === "speaking");

  function toggleMicrophone() {
    if (microFerme) return;
    contexte();   // débloque le son du navigateur, sans rien prononcer

    const parScribe = moteurs ? moteurs.ecoute !== "navigateur" : false;
    if (parScribe) {
      /* SECOND APPUI : on ferme tout. C'est la seule façon de sortir, et elle
         doit marcher à n'importe quel moment — pendant qu'elle écoute,
         réfléchit ou parle. */
      if (conversation) { taire(); fermerConversation(); return; }
      taire();
      /* Une conversation qui s'ouvre au bouton, c'est peut-être quelqu'un
         d'autre : le micro repart de ses paliers de base. Les reprises après
         un film, une carte ou les services gardent ce qu'il a appris — c'est
         la même personne, au milieu de la même conversation. */
      coupesTropTotRef.current = 0;
      conversationRef.current = true;
      setConversation(true);
      void ecouter();
      return;
    }
    taire();
    if (!recognitionRef.current) { setMode("error"); return; }
    if (mode === "listening") { recognitionRef.current.stop(); return; }
    try { recognitionRef.current.start(); } catch { setMode("error"); }
  }

  /* Annuler ce qu'on est en train de dire. On coupe l'enregistreur avec le
     drapeau levé : c'est onstop qui jettera, et le chemin reste unique —
     deux façons d'arrêter un micro finiraient par diverger. */
  function annulerCeQueJeDis() {
    if (mode !== "listening") return;
    annuleRef.current = true;
    /* ── ANNULER NE PASSE PLUS PAR `onstop`, ET C'EST POUR ÇA QUE ÇA MARCHE ─

         `taire()` périme l'enregistrement en cours — c'est son travail. Mais
         c'était `onstop` qui affichait « annulé » et rendait le repos, et son
         `onstop` arrivait donc PÉRIMÉ : il sortait par la garde
         d'appartenance sans rien afficher. Le bouton annulait vraiment, et
         l'écran n'en disait rien.

         Deux chemins pour un seul geste, dont l'un est mort : on garde celui
         qui est vivant. L'annulation fait tout elle-même, et `annuleRef`
         reste levé pour l'unique cas où l'enregistrement serait encore le
         nôtre — il jettera l'audio sans le transcrire. */
    taire();
    if (enregistreurRef.current) {
      arreterEnregistrement();
      annuleRef.current = false;
      setMode("ready");
      setFace("yeux_ouverts");
      setAnnule(true);
      setTimeout(() => setAnnule(false), 3200);
    } else if (recognitionRef.current) {
      /* Le navigateur transcrit au fil de la parole : il n'y a pas
         d'enregistrement à jeter, on l'arrête et on ignore ce qu'il rapporte. */
      try { recognitionRef.current.abort?.(); } catch {}
      try { recognitionRef.current.stop(); } catch {}
      annuleRef.current = false;
      setMode("ready");
      setFace("yeux_ouverts");
      setAnnule(true);
      setTimeout(() => setAnnule(false), 3200);
    }
  }

  function ouvrirClavier() {
    /* Écrire, c'est arrêter de parler. Laisser le micro ouvert pendant qu'on
       tape enverrait le bruit du clavier à la transcription — et ferait
       répondre BIA à des touches. */
    if (conversation) fermerConversation();
    taire();
    contexte();
    setClavier(true);
    setTimeout(() => champRef.current?.focus(), 90);
  }

  const labels = {
    ready: "Parler à BIA",
    listening: "BIA vous écoute. Appuyer pour arrêter",
    thinking: "BIA réfléchit — le micro se rouvrira quand elle aura fini",
    speaking: "BIA répond — le micro se rouvrira quand elle aura fini",
    error: "Micro indisponible. Appuyer pour réessayer",
  };

  /* ── LES QUATRE INDICATEURS ────────────────────────────────────────────

     Lamine : « indicateurs visibles : écoute, parole détectée, réflexion et
     réponse ».

     Le quatrième — « je t'entends » — est le seul nouveau, et c'est celui qui
     manquait le plus : sans lui, on ne sait pas si le micro est ouvert ou
     s'il est ouvert ET qu'il capte quelque chose. C'est toute la différence
     entre « elle attend » et « elle est sourde ».

     En français seulement : cette ligne est un témoin technique, pas une
     parole de BIA. Ce qu'elle DIT reste en wolof. */
  const temoin = !conversation ? "" :
    mode === "listening" ? (entendParler ? "Je t'entends" : "Je t'écoute") :
    mode === "thinking" ? "Je réfléchis" :
    mode === "speaking" ? "Je réponds" :
    mode === "error" ? "" : "Je t'écoute";

  /* LA CORRECTION, EN GRAND.

     Lamine, le 10 septembre 2026 : « les textes sont très difficiles à
     copier ; autant appuyer sur un bouton qui ouvre une fenêtre plus large où
     on peut copier — ou bien qu'elle nous propose une autre façon de le dire
     en wolof ».

     Les deux, donc. La fenêtre s'ouvre avec SA PHRASE DÉJÀ ÉCRITE dedans : on
     ne retape rien, on change le mot qui cloche. Et un bouton lui demande de
     la redire autrement — trois propositions, on en touche une, elle prend la
     place dans le champ. Rien n'est gardé tant qu'un humain n'a pas tranché. */
  /* ── JUGER SA DERNIÈRE PHRASE, EN UN APPUI ──────────────────────────────

     Le vert et le rouge ne demandent rien et n'interrompent rien : on juge à
     l'oreille, en pleine conversation, et on continue de parler. Le travail
     d'écriture — corriger ce qui est mal dit — se fait plus tard, sur la page
     de relecture, quand il en a le temps. C'est toute la différence avec le
     bouton « Mal dit » qui vit sous chaque bulle. */
  const dernierDitParElle = [...history].reverse().find((m) => m.role === "bia" && m.text?.trim()) || null;
  const derniereQuestion = (() => {
    const i = history.findLastIndex((m) => m.role === "bia" && m.text?.trim());
    for (let j = i - 1; j >= 0; j--) if (history[j].role === "user") return history[j].text || "";
    return "";
  })();

  function juger(avis: "bien" | "mal") {
    if (!dernierDitParElle?.text?.trim()) return;
    const { liste, quoi } = poserVerdict({
      avis,
      dit: dernierDitParElle.text,
      question: derniereQuestion,
      langue: langueDuFil.current || "wo",
      quand: Date.now(),
    });
    setCompteVerdicts(compterVerdicts(liste));
    /* « Mal dit » retire aussi les sons gardés de cette phrase (lib/voix-gardees.ts) :
       sinon le son mal prononcé serait resservi pour toujours. Sans attendre. */
    if (avis === "mal" && quoi !== "retiré") {
      void fetch("/api/voix-gardees", {
        method: "POST",
        headers: { "content-type": "application/json", "x-bia-code": codeRef.current },
        body: JSON.stringify({ texte: dernierDitParElle.text }),
      }).catch(() => {});
    }
    setMotVerdict(quoi === "retiré" ? "retiré"
      : avis === "bien" ? "gardé pour l'enregistrement" : "gardé à corriger");
    if (motVerdictMinuterie.current) clearTimeout(motVerdictMinuterie.current);
    motVerdictMinuterie.current = setTimeout(() => setMotVerdict(""), 2200);
  }

  function ouvrirCorrection(index: number) {
    taire();
    setCorrige(index);
    setCorrection(history[index]?.text || "");
    setPropositions([]);
    setAvis("");
    setCopieFaite(false);
  }

  function fermerCorrection() {
    setCorrige(null);
    setCorrection("");
    setPropositions([]);
  }

  async function copierSaPhrase() {
    if (corrige === null) return;
    try {
      await navigator.clipboard.writeText(history[corrige]?.text || "");
      setCopieFaite(true);
      setTimeout(() => setCopieFaite(false), 2200);
    } catch {
      setAvis("La copie n'a pas marché. Sélectionne le texte à la main.");
    }
  }

  async function direAutrement() {
    if (corrige === null) return;
    setReformule(true);
    setAvis("");
    try {
      const question = [...history].slice(0, corrige).reverse().find((m) => m.role === "user");
      const r = await fetch("/api/reformuler", {
        method: "POST",
        headers: { "content-type": "application/json", "x-bia-code": codeRef.current },
        body: JSON.stringify({ texte: history[corrige]?.text || "", question: question?.text || "" }),
      });
      const d = await r.json() as { propositions?: string[]; erreur?: string };
      if (!r.ok || !d.propositions?.length) {
        setAvis("Elle n'a rien trouvé d'autre pour l'instant. Réessaie.");
        return;
      }
      setPropositions(d.propositions);
    } catch {
      setAvis("Pas de réseau.");
    } finally {
      setReformule(false);
    }
  }

  async function envoyerCorrection(index: number) {
    const bonne = correction.trim();
    if (!bonne) return;
    // La question qui a produit cette réponse : le message juste avant.
    const question = [...history].slice(0, index).reverse().find((m) => m.role === "user");
    if (!question) { setCorrige(null); return; }
    setAvis("");
    try {
      const r = await fetch("/api/corriger", {
        method: "POST",
        headers: { "content-type": "application/json", "x-bia-code": codeRef.current },
        body: JSON.stringify({
          source: question.text, proposee: history[index].text, corrigee: bonne,
          langue: estWolof(bonne) ? "wo" : "fr",
        }),
      });
      const d = await r.json() as { ok?: boolean; erreur?: string };
      setAvis(d.ok ? "Jërëjëf. BIA le retiendra." : (d.erreur || "La correction n'a pas été gardée."));

      /* ── LA CORRECTION PREND LA PLACE DE LA PHRASE FAUSSE ─────────────────
         Signalé par Lamine le 10 septembre 2026 : « quand je corrige quelque
         chose, si je rouvre la discussion, je ne trouve pas mes corrections,
         je trouve juste l'ancienne discussion telle qu'elle était. Ce n'est
         pas normal, même si c'est enregistré sur le serveur : ça doit être
         dans la discussion, parce que ELLE s'en sert. »

         Il a mis le doigt sur ce qui comptait. La correction partait bien
         dans le lexique, mais le fil gardait la phrase fausse — et le fil est
         exactement ce qu'on renvoie au modèle à chaque question. Elle relisait
         donc sa propre erreur à chaque tour, et la personne rouvrait une
         conversation où son travail avait disparu.

         La bonne formulation remplace donc la mauvaise, sur place. Le fil
         étant gardé sur l'appareil, elle y est encore demain. */
      if (d.ok) {
        setHistory((items) =>
          items.map((m, i) => (i === index ? { ...m, text: bonne, corrige: true } : m)));
      }
    } catch {
      setAvis("La correction n'a pas été gardée.");
    }
    setCorrection("");
    setCorrige(null);
    setPropositions([]);
  }

  /* ── LE PAPIER, CÔTÉ TÉLÉPHONE ────────────────────────────────────────────

     Trois gestes, et c'est tout : elle le fabrique à partir de la
     conversation, il s'affiche, on corrige un chiffre s'il a été mal entendu,
     on en fait un PDF qu'on envoie sur WhatsApp.

     POURQUOI ON PEUT CORRIGER. La transcription confond « quinze mille » et
     « cinquante mille » plus souvent qu'on ne voudrait. Un devis faux part
     chez un client et coûte de l'argent à quelqu'un : il faut donc que
     l'homme du métier puisse poser l'œil dessus et rectifier lui-même, sans
     refaire toute la conversation. Les totaux, eux, sont recalculés ici à
     chaque frappe — jamais retapés à la main, jamais demandés au modèle. */
  /* ── CE QUI REVIENT TROP TARD NE DOIT PLUS PARLER ─────────────────────────

     Vu par Lamine le 10 septembre 2026 : une capture où l'écran PAPIER-PHOTO
     affichait « Il n'y a pas encore de quoi écrire. Dis-lui d'abord ce que le
     papier doit dire » — un message qui appartient au message et au devis, pas
     à la photo.

     Il avait demandé un message, la fabrication était partie, il a changé de
     service sans attendre. La réponse est revenue après, et a écrit son échec
     sur un écran qui ne l'avait pas demandée.

     Chaque demande porte donc un jeton. Au retour, si le jeton n'est plus le
     dernier, on se tait : le résultat concerne une page que la personne a
     quittée. */
  const demandePapier = useRef(0);

  /* ── QUI A DEMANDÉ CE PAPIER ? ────────────────────────────────────────────

     Lamine, le 12 septembre 2026, capture à l'appui : « ce bandeau rouge
     s'affiche sans aucune raison, j'étais en train de communiquer avec BIA,
     d'un coup la fenêtre commence à clignoter. »

     IL AVAIT RAISON SUR LES DEUX MOTS : « sans aucune raison ». Il n'avait
     rien demandé. Ce qui s'est passé, c'est que le modèle a estimé, au milieu
     de la conversation, qu'il y avait de quoi écrire une lettre — et la page
     s'est mise à la fabriquer AUSSITÔT, en tapant à l'écran et dans le
     haut-parleur. C'est voulu, et c'est même une bonne idée : elle écrit
     pendant qu'on écoute sa réponse au lieu de faire attendre dix secondes
     devant un écran vide.

     MAIS QUAND ÇA RATE, LES DEUX CAS NE SE VALENT PAS.

     S'il a touché « Lettre », il attend quelque chose : un échec doit se dire,
     en rouge, avec ce qu'on sait de la cause. Il peut réessayer.

     Si c'est ELLE qui a décidé, il n'attend rien. Un bandeau rouge lui annonce
     alors l'échec d'une chose qu'il n'a pas demandée, au milieu d'une
     conversation qui, elle, marchait. C'est du bruit, et c'est pire que du
     bruit : ça fait croire que l'application est cassée.

     Une tentative que personne n'a demandée échoue donc EN SILENCE. Le papier
     ne se fait pas, la frappe s'arrête, et la conversation continue. Il n'a
     rien perdu — il n'avait rien demandé.

     @param demandeParLui vrai s'il a touché un bouton ; faux si c'est le
                          modèle qui a décidé au milieu d'une conversation. */
  const fabriquerPapier = useCallback(async (sorte: Sorte, demandeParLui = true) => {
    const jeton = ++demandePapier.current;
    const perime = () => jeton !== demandePapier.current;
    /* Ne rien dire, mais garder une trace : sans ça, un échec silencieux est
       un échec invisible, et on ne saura jamais que ça rate. */
    const echouer = (quoi: string) => {
      if (demandeParLui) { setPapierErreur(quoi); return; }
      console.warn(`BIA — papier « ${sorte} » proposé par elle, non fabriqué : ${quoi}`);
      setPapierPret(null);
    };

    /* ── ON MONTRE ET ON FAIT ENTENDRE QU'ELLE ÉCRIT ──────────────────────
       Demandé par Lamine le 10 septembre 2026 : entre la demande et le
       papier, il ne se passait rien — ni son, ni mouvement. Dix secondes de
       silence, et on croit que l'application est morte.

       Trois signes partent donc ensemble : elle le DIT (une phrase
       enregistrée, si elle est là), on l'ENTEND taper, et on la VOIT taper
       sur le petit clavier à côté du bouton. */
    void direEnregistre("jecris");
    // Le contexte de la page, jamais un deuxième : sur iPhone, en ouvrir un
    // second pendant qu'elle parle interrompt le son en cours.
    frapper(contexte());
    papierOccupeRef.current = true;
    setPapierOccupe(true);
    setPapierErreur("");
    setPdf("");
    try {
      const r = await fetch("/api/document", {
        method: "POST",
        headers: { "content-type": "application/json", "x-bia-code": codeRef.current },
        body: JSON.stringify({
          sorte,
          history: historyRef.current.slice(-24),
          emetteur: emetteurRef.current,
          tva: emetteurRef.current.tva,
        }),
      });
      const d = await r.json() as { document?: Papier; totaux?: Totaux | null; erreur?: string };
      if (perime()) return;
      if (!r.ok || !d.document) {
        /* Dire LEQUEL des trois échecs, sinon on ne peut rien corriger.
           « Réessaie dans un instant » était vrai une fois sur trois et
           inutile les deux autres. */
        echouer(
          d.erreur === "rien à écrire" || d.erreur === "document vide"
            ? "Il n'y a pas encore de quoi écrire. Dis-lui d'abord ce que le papier doit dire, et pour qui — puis reviens ici."
            : d.erreur === "pas de document" || d.erreur === "document illisible"
              ? "Elle a répondu à côté. Appuie encore une fois : c'est presque toujours réglé au deuxième essai."
              : d.erreur === "code"
                ? "Ton code n'est plus valable. Referme et rentre-le à nouveau."
                /* ── ET LE DERNIER CAS DIT ENFIN CE QU'IL SAIT ──────────────
                   « Réessaie dans un instant » ne se corrige pas : on ne sait
                   ni quoi réessayer, ni pourquoi. Le numéro du serveur, lui,
                   sépare une panne passagère (502, 504 : Render dort ou le
                   moteur a mis trop longtemps) d'un vrai refus. */
                : r.status === 502 || r.status === 503 || r.status === 504
                  ? `Le serveur n'a pas répondu à temps (${r.status}). Il se réveille — appuie encore une fois.`
                  : `Le papier n'a pas pu être fabriqué (${r.status}${d.erreur ? ` : ${d.erreur}` : ""}).`);
        return;
      }
      /* ── ON LE RANGE AVANT DE L'AFFICHER ────────────────────────────────
         Il vivait jusqu'ici dans la seule mémoire de la page : un
         rechargement, un changement de service ou la question suivante le
         faisaient disparaître. Il va maintenant dans la boîte de la personne,
         et un renvoi se pose sur le fil, à l'endroit où il a été écrit. */
      const id = nouvelIdPapier();
      papierOuvertId.current = id;
      const garde: PapierGarde = {
        id, sorte, titre: titreDe(d.document), quand: new Date().toISOString(),
        doc: d.document, totaux: d.totaux ?? null,
      };
      setPapiers(garderPapier(profilRef.current, garde));
      setHistory((items) => [...items, { role: "bia", text: garde.titre, papier: id }]);
      setPapier({ doc: d.document, totaux: d.totaux ?? null });
      /* Fini. Si l'écran des papiers est déjà ouvert, on le voit arriver et
         il n'y a rien à annoncer. Sinon ça sonne, et le petit clavier
         clignote jusqu'à ce qu'on le touche. */
      if (!papierOuvertRef.current) { sonnerFini(contexte()); setPapierFini(true); }

      /* ── ELLE LE LIT AVANT QUE ÇA DEVIENNE UN PAPIER ────────────────────
         « Elle doit le lire clairement en français avant de l'écrire, voir si
         c'est exactement ça, jusqu'à ce que la personne soit d'accord. »
         — Lamine, le 10 septembre 2026.

         C'est la seule vérification qui marche pour quelqu'un qui ne lit pas.
         La transcription confond « quinze mille » et « cinquante mille » ;
         montrer le papier à l'écran ne sert à rien s'il ne peut pas le lire.
         Le lui dire, si. */
      setAValider(true);
      void speak(lecture(d.document, d.totaux ?? null), undefined, "document");
    } catch {
      if (perime()) return;
      echouer("Pas de réseau. Le papier n'a pas pu être fabriqué.");
    } finally {
      if (!perime()) { papierOccupeRef.current = false; setPapierOccupe(false); }
      // La frappe s'arrête même si c'est une demande périmée : deux frappes
      // en même temps feraient une mitraillette.
      arreterFrappe();
    }
  }, [contexte, direEnregistre, speak]);

  /* Ouvrir la fenêtre des services. Sans rien préciser, on voit la rangée et
     rien d'autre — sauf si BIA a déjà de quoi écrire : on va droit au but,
     c'est ce qu'elle vient d'annoncer. */
  function sorteDuPapier(doc: Papier): Sorte {
    return doc.type === "devis" && doc.nature === "facture" ? "facture" : doc.type;
  }

  function ouvrirPapier(sorte?: Sorte) {
    taire();
    setClavier(false);
    setFiche(false);
    setPapierOuvert(true);
    const quoi = sorte || (papier ? null : papierPret);
    if (quoi) {
      setService(quoi);
      /* ── OUVRIR LA FENÊTRE N'EST PAS DEMANDER UN PAPIER ──────────────────

         Lamine, le 13 septembre 2026 : « il faut dire à BIA de ne rien écrire
         tant qu'on ne lui demande pas VRAIMENT. »

         Ici, ouvrir la fenêtre des papiers lançait la fabrication — donc le
         plus cher des appels au modèle — alors qu'on l'ouvre aussi pour
         relire un devis d'avant-hier. Le geste et l'intention ne sont pas le
         même chose.

         La fenêtre s'ouvre donc SUR le service qu'elle a proposé, prête, et
         c'est le bouton « Écrire… » qui déclenche. Un doigt de plus, et pas
         un centime dépensé par surprise. */
    } else if (papier) {
      setService(sorteDuPapier(papier.doc));
    }
  }

  /* UN SEUL SERVICE À LA FOIS. On touche un bouton de la rangée, cette page
     s'ouvre, et elle seule. Le papier d'un autre service est mis de côté :
     mélanger un devis et une lettre à l'écran n'aiderait personne. */
  function ouvrirService(quoi: Service) {
    // Ce qui était en train de se fabriquer ne concerne plus cette page.
    demandePapier.current += 1;
    setPapierOccupe(false);
    setService(quoi);
    setPapierErreur("");
    setFiche(quoi === "fiche");

    if (quoi === "photo") { photoRef.current?.click(); return; }
    /* La vidéo du téléphone : on ouvre le sélecteur, et le fichier est lu sur
       place. Il ne monte nulle part. */
    if (quoi === "video") { fichierVideo.current?.click(); setService(""); return; }
    /* ── LES SERVICES QUI N'ÉCRIVENT RIEN SORTENT ICI ─────────────────────

       Et « relire » en fait partie, depuis sa capture du 12 septembre à
       21 h 26 : le bandeau rouge « il n'y a pas encore de quoi écrire »
       s'affichait au-dessus du titre « À relire ».

       CE N'ÉTAIT PAS UN DÉFAUT D'AFFICHAGE. J'ai ajouté « relire » à la
       rangée sans l'ajouter à cette ligne, alors il tombait dans la branche
       du dessous — celle de message, devis et lettre — et LANÇAIT LA
       FABRICATION D'UN PAPIER. Sur un écran vide, ça n'a rien coûté et le
       serveur a répondu « rien à écrire », d'où le bandeau. Mais au milieu
       d'une conversation, toucher « À relire » aurait fabriqué un devis, et
       ça se paie.

       Une liste comme celle-ci est le genre d'endroit où on ajoute un nom
       sans y penser. Elle dit donc maintenant ce qu'elle sépare. */
    if (quoi === "lire" || quoi === "fiche" || quoi === "relire" || quoi === "") return;

    // message, devis, lettre
    /* Changer de service ne détruit rien : le papier de l'autre service est
       rangé dans la boîte et se rouvre d'un geste. On se contente de sortir
       celui-ci de l'écran. */
    if (papier && sorteDuPapier(papier.doc) !== quoi) { setPapier(null); papierOuvertId.current = ""; }
    /* Un papier de ce service existe déjà ? On rouvre le plus récent au lieu
       d'en fabriquer un autre — et d'en payer un autre. */
    const dejaFait = papiers.find((x) => sorteDuPapier(x.doc) === quoi);
    if ((!papier || sorteDuPapier(papier.doc) !== quoi) && dejaFait) { rouvrirPapier(dejaFait); return; }
    if ((!papier || sorteDuPapier(papier.doc) !== quoi) && !papierOccupe && historyRef.current.length) {
      void fabriquerPapier(quoi as Sorte);
    }
  }

  /* Toute retouche repasse par ici : le document est recopié, modifié, et les
     totaux refaits dans la foulée. Le PDF déjà fabriqué ne vaut plus rien dès
     qu'un chiffre bouge — on l'efface, pour ne pas envoyer l'ancien. */
  useEffect(() => { papierOccupeRef.current = papierOccupe; }, [papierOccupe]);
  useEffect(() => {
    papierOuvertRef.current = papierOuvert;
    /* Ouvrir l'écran, c'est avoir vu le travail : tout ce qui appelle
       s'éteint.

       Signalé par Lamine le 11 septembre 2026 : « la bulle jaune qui clignote
       reste là-bas même si on ouvre le message, elle continue à clignoter.
       Dès qu'on ouvre le message elle doit arrêter. »

       Il avait raison, et c'était une vraie faute : le point d'or ne
       s'éteignait QUE en changeant de personne ou en recommençant une
       conversation. Il pouvait donc appeler pendant des heures pour un
       message déjà lu — et un signal qui ment est pire qu'un signal absent,
       parce qu'on cesse de le croire. */
    if (papierOuvert) { setPapierFini(false); setPapierPret(null); }
  }, [papierOuvert]);

  /* Rouvrir un papier déjà écrit : celui du fil, ou celui de la liste. On
     retrouve exactement ce qu'on avait laissé, retouches comprises. */
  function rouvrirPapier(g: PapierGarde) {
    taire();
    // Il a déjà été accepté une fois : on ne refait pas relire un document
    // qu'on rouvre pour l'envoyer.
    setAValider(false);
    papierOuvertId.current = g.id;
    setPapier({ doc: g.doc, totaux: g.totaux });
    setService(sorteDuPapier(g.doc));
    setPapierErreur("");
    setPdf("");
    setPapierOuvert(true);
    setClavier(false);
    setFiche(false);
  }

  /* Toute retouche doit repartir dans la boîte, sinon la correction ne
     survivrait pas au rechargement — et c'est précisément le chiffre corrigé
     qu'il ne faut pas perdre. */
  const rangerRetouche = useCallback((doc: Papier, totaux: Totaux | null) => {
    const id = papierOuvertId.current;
    if (!id) return;
    setPapiers(garderPapier(profilRef.current, {
      id, sorte: doc.type, titre: titreDe(doc), quand: new Date().toISOString(), doc, totaux,
    }));
  }, []);

  function retoucherDevis(change: (d: Devis) => void) {
    setPapier((p) => {
      if (!p || p.doc.type !== "devis") return p;
      const doc = JSON.parse(JSON.stringify(p.doc)) as Devis;
      change(doc);
      const totaux = totauxDe(doc);
      rangerRetouche(doc, totaux);
      return { doc, totaux };
    });
    setPdf("");
  }

  function retoucherLettre(change: (l: Lettre) => void) {
    setPapier((p) => {
      if (!p || p.doc.type !== "lettre") return p;
      const doc = JSON.parse(JSON.stringify(p.doc)) as Lettre;
      change(doc);
      const totaux = null;
      rangerRetouche(doc, totaux);
      return { doc, totaux };
    });
    setPdf("");
  }

  /* Le PDF est fabriqué par le serveur et revient fini. On ne l'ouvre pas
     nous-mêmes : sur iPhone, une fenêtre ouverte par du code après un aller
     au réseau est bloquée sans un mot. On pose donc un lien, et c'est la
     personne qui l'ouvre — un geste de plus, mais qui marche partout. */
  async function fabriquerPdf() {
    if (!papier) return;
    setPapierOccupe(true);
    setPapierErreur("");
    try {
      const r = await fetch("/api/document/pdf", {
        method: "POST",
        headers: { "content-type": "application/json", "x-bia-code": codeRef.current },
        body: JSON.stringify({ document: papier.doc }),
      });
      if (!r.ok) { setPapierErreur("Le PDF n'a pas pu être fabriqué."); return; }
      const blob = await r.blob();
      if (pdf) URL.revokeObjectURL(pdf);
      setPdf(URL.createObjectURL(blob));
    } catch {
      setPapierErreur("Pas de réseau. Le PDF n'a pas pu être fabriqué.");
    } finally {
      setPapierOccupe(false);
    }
  }

  /* LE MESSAGE — celui qu'on copie et qu'on envoie.

     Lamine, le 10 septembre 2026 : « parler en wolof et que ça t'écrive un
     message en français, très propre. Un message que tu pourras copier,
     coller et envoyer, par WhatsApp ou par SMS. Pour quelqu'un qui ne sait
     pas parler français. »

     C'est probablement le service dont on se servira le plus. Beaucoup de
     gens ici parlent très bien et écrivent peu le français : ils font écrire
     leurs messages par un voisin, un fils, un ami — et ils attendent. Là, ils
     parlent, et le message est prêt.

     « Envoyer » ouvre le partage du téléphone : WhatsApp, SMS, courriel, ce
     qu'il veut, sans rien retaper. Là où le partage n'existe pas — un
     ordinateur — « Copier » fait le même travail. */
  async function envoyerLeMot(texte: string) {
    try {
      if (navigator.share) { await navigator.share({ text: texte }); return; }
    } catch { /* partage refusé ou annulé : on retombe sur la copie */ }
    void copierLeMot(texte);
  }

  async function copierLeMot(texte: string) {
    try {
      await navigator.clipboard.writeText(texte);
      setCopie(true);
      setTimeout(() => setCopie(false), 2200);
    } catch {
      setPapierErreur("La copie n'a pas marché. Sélectionne le texte et copie-le à la main.");
    }
  }

  function vueMot(m: Mot) {
    return (
      <>
        <p className="papier-titre">Le message</p>
        <p className="papier-note">
          Écoute le message, puis choisis une application. Tu confirmeras l’envoi dans cette application.
        </p>
        {(
          <label className="papier-champ">Pour (adresse mail ou numéro avec indicatif)
            <input value={m.destinataire || ""} onChange={(e) => retoucherMot((x) => { x.destinataire = e.target.value; })} />
          </label>
        )}
        {m.objet ? (
          <label className="papier-champ">Objet
            <input value={m.objet} onChange={(e) => retoucherMot((x) => { x.objet = e.target.value; })} />
          </label>
        ) : null}
        <div className="papier-actions">
          {(["mail", "sms", "whatsapp"] as const).map((canal) => {
            const lien = lienMessage(canal, m.destinataire || "", m.texte, m.objet);
            return lien ? <a key={canal} href={lien} target={canal === "whatsapp" ? "_blank" : undefined} rel="noopener noreferrer">
              Ouvrir {canal === "whatsapp" ? "WhatsApp" : canal === "sms" ? "SMS" : "Mail"}
            </a> : null;
          })}
        </div>
        <textarea className="paragraphe grand" rows={10} value={m.texte} aria-label="Le message"
          onChange={(e) => retoucherMot((x) => { x.texte = e.target.value; })} />
      </>
    );
  }

  function retoucherMot(change: (m: Mot) => void) {
    setPapier((p) => {
      if (!p || p.doc.type !== "message") return p;
      const doc = JSON.parse(JSON.stringify(p.doc)) as Mot;
      change(doc);
      const totaux = null;
      rangerRetouche(doc, totaux);
      return { doc, totaux };
    });
  }

  function garderRenseignements() {
    try { localStorage.setItem(cleEmetteur(profilRef.current), JSON.stringify(emetteurRef.current)); } catch {}
    setFiche(false);
    /* Ses renseignements viennent de changer : le papier ouvert porte encore
       les anciens. On le refait — c'est la seule façon que le NINEA et le
       nom soient justes sur le PDF. */
    if (papier) void fabriquerPapier(sorteDuPapier(papier.doc));
  }

  /* Le devis à l'écran. Chaque champ est modifiable, parce que la
     transcription confond « quinze mille » et « cinquante mille », et parce
     que celui qui fait le travail est le seul à savoir lequel des deux est le
     bon. Les totaux, eux, ne sont pas modifiables : ils se recalculent. */
  function vueDevis(d: Devis, t: Totaux | null) {
    return (
      <>
        <p className="papier-titre">{d.nature === "facture" ? "Facture" : "Devis"}{d.numero ? ` n° ${d.numero}` : " — brouillon"}</p>
        {d.nature === "facture" ? <label className="papier-champ">Numéro de ta facture
          <input value={d.numero} placeholder="Ton numéro de facturation" maxLength={24}
            onChange={(e) => retoucherDevis((x) => { x.numero = e.target.value; })} />
        </label> : null}
        {!emetteur.nom ? (
          <p className="papier-manque">
            Tes renseignements manquent : complète ton nom et les coordonnées de ton activité.
            <button type="button" onClick={() => setFiche(true)}>Les donner</button>
          </p>
        ) : null}

        <label className="papier-champ">Objet
          <input value={d.objet} onChange={(e) => retoucherDevis((x) => { x.objet = e.target.value; })} />
        </label>
        <label className="papier-champ">Client
          <input value={d.client.nom} onChange={(e) => retoucherDevis((x) => { x.client.nom = e.target.value; })} />
        </label>

        <div className="lignes">
          {d.lignes.map((l, i) => (
            <div className="ligne-devis" key={i}>
              <input className="designation" value={l.designation} aria-label="Désignation"
                onChange={(e) => retoucherDevis((x) => { x.lignes[i].designation = e.target.value; })} />
              {/* Les deux chiffres portent leur nom : sans étiquette, on voit
                  « 10 » et « 25000 » sans savoir lequel est le prix. */}
              <label className="mini">Qté
                <input type="number" inputMode="numeric" value={l.quantite}
                  onChange={(e) => retoucherDevis((x) => { x.lignes[i].quantite = Number(e.target.value) || 0; })} />
              </label>
              <label className="mini">Prix unit.
                <input type="number" inputMode="numeric" value={l.prix_unitaire}
                  onChange={(e) => retoucherDevis((x) => { x.lignes[i].prix_unitaire = Number(e.target.value) || 0; })} />
              </label>
              <span className="total-ligne">{franc(l.quantite * l.prix_unitaire)}</span>
              <button className="oter" type="button" aria-label="Ôter cette ligne"
                onClick={() => retoucherDevis((x) => { x.lignes.splice(i, 1); })}>×</button>
            </div>
          ))}
          <button className="ajouter" type="button"
            onClick={() => retoucherDevis((x) => { x.lignes.push({ designation: "", quantite: 1, prix_unitaire: 0 }); })}>
            + une ligne
          </button>
        </div>

        <div className="deux">
          <label className="papier-champ">Remise (FCFA)
            <input type="number" inputMode="numeric" value={d.remise || 0}
              onChange={(e) => retoucherDevis((x) => { x.remise = Number(e.target.value) || 0; })} />
          </label>
          <label className="papier-champ">Avance (FCFA)
            <input type="number" inputMode="numeric" value={d.acompte || 0}
              onChange={(e) => retoucherDevis((x) => { x.acompte = Number(e.target.value) || 0; })} />
          </label>
        </div>

        {t ? (
          <dl className="totaux">
            <div><dt>Sous-total</dt><dd>{franc(t.sous_total)}</dd></div>
            {t.remise ? <div><dt>Remise</dt><dd>- {franc(t.remise)}</dd></div> : null}
            {t.tva ? <div><dt>Montant HT</dt><dd>{franc(t.ht)}</dd></div> : null}
            {t.tva ? <div><dt>TVA 18 %</dt><dd>{franc(t.tva)}</dd></div> : null}
            <div className="gros"><dt>{t.tva ? "Total TTC" : "Total"}</dt><dd>{franc(t.total)}</dd></div>
            {t.acompte ? <div><dt>Avance versée</dt><dd>- {franc(t.acompte)}</dd></div> : null}
            {t.acompte ? <div><dt>Reste à payer</dt><dd>{franc(t.reste)}</dd></div> : null}
          </dl>
        ) : null}
      </>
    );
  }

  function vueLettre(l: Lettre) {
    return (
      <>
        <p className="papier-titre">{l.titre}</p>
        {!emetteur.nom ? (
          <p className="papier-manque">
            Tes renseignements manquent : la lettre partira sans tes coordonnées.
            <button type="button" onClick={() => setFiche(true)}>Les donner</button>
          </p>
        ) : null}
        <label className="papier-champ">Destinataire
          <input value={l.destinataire.nom} onChange={(e) => retoucherLettre((x) => { x.destinataire.nom = e.target.value; })} />
        </label>
        <label className="papier-champ">Objet
          <input value={l.objet || ""} onChange={(e) => retoucherLettre((x) => { x.objet = e.target.value; })} />
        </label>
        {l.corps.map((para, i) => (
          <textarea className="paragraphe" key={i} rows={4} value={para} aria-label={`Paragraphe ${i + 1}`}
            onChange={(e) => retoucherLettre((x) => { x.corps[i] = e.target.value; })} />
        ))}
        <label className="papier-champ">Formule de politesse
          <input value={l.formule || ""} onChange={(e) => retoucherLettre((x) => { x.formule = e.target.value; })} />
        </label>
        <label className="papier-champ">Signature
          <input value={l.signature || ""} onChange={(e) => retoucherLettre((x) => { x.signature = e.target.value; })} />
        </label>
      </>
    );
  }

  /* LA RANGÉE DES SERVICES.

     Lamine, le 10 septembre 2026, en désignant cinq carrés dessinés en haut
     d'une capture : « tous les services vont être des boutons sur ces
     points ; dès que tu appuies, c'est seulement cette page qui s'ouvre ».

     Elle reste en haut, toujours visible : on passe d'un service à l'autre
     sans revenir en arrière. Le message est le premier, c'est celui dont on
     se servira le plus. */
  const SERVICES: Array<{ cle: Service; nom: string; dessin: string }> = [
    { cle: "message", nom: "Message",
      dessin: "M12 3c5 0 9 3.2 9 7.2s-4 7.2-9 7.2c-.9 0-1.8-.1-2.6-.3L4.6 20a.6.6 0 0 1-.9-.7l1-3.1C3 14.9 3 12.9 3 10.2 3 6.2 7 3 12 3Z" },
    { cle: "facture", nom: "Facture", dessin: "M6 2h12v20l-3-2-3 2-3-2-3 2V2Zm3 5v2h6V7H9Zm0 5v2h6v-2H9Z" },
    { cle: "devis", nom: "Devis",
      dessin: "M6 2h7.2L20 8.8V20a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2Zm7 1.8V9h5.2L13 3.8ZM8 12h8v1.8H8V12Zm0 3.4h8v1.8H8v-1.8Zm0-6.8h3v1.8H8V8.6Z" },
    /* ── LA LETTRE A CÉDÉ SA PLACE AU MAIL ─────────────────────────────────
       Lamine, le 15 septembre 2026 : « tu peux remplacer la lettre par un
       mail. Comme ça, tu pourras lui dicter en wolof, elle va écrire un mail.
       Ça, ça peut être utile. » Une lettre finit en PDF qu'il faut imprimer ;
       personne n'envoie ça à son fournisseur. La lettre garde sa capacité —
       « écris-moi une lettre » la donne toujours — elle perd seulement son
       bouton. Voir Sorte dans lib/documents.ts. */
    { cle: "mail", nom: "Mail",
      dessin: "M3 5h18a1 1 0 0 1 1 1v12a1 1 0 0 1-1 1H3a1 1 0 0 1-1-1V6a1 1 0 0 1 1-1Zm1.6 2L12 12.4 19.4 7H4.6Z" },
    /* ── « SUR APPAREIL PHOTO, TU AS ÉCRIT PAPIER » ──────────────────────

       Lamine, le 17 septembre 2026. Il a raison, et c'est une confusion que
       j'ai créée : le dessin est un appareil photo, l'étiquette disait
       « Papier », et le mot papier désigne déjà TOUT AUTRE CHOSE dans BIA —
       les devis, les mails, les lettres qu'elle fabrique. Deux sens pour un
       mot, sur un écran de huit tuiles.

       La CLÉ reste « photo » : elle est branchée partout ailleurs, et un
       renommage de clé casserait le bouton sans rien gagner. C'est
       l'étiquette qu'on corrige, parce que c'est elle qu'il lit.

       IL A DIT « APPAREIL PHOTO », ET J'ÉCRIS « PHOTO ». Une tuile fait 62
       pixels de large (voir .service dans globals.css) : « Appareil photo »
       s'y casse en trois lignes, cette tuile devient plus haute que les sept
       autres, et toute la rangée se décale. « Photo » dit la même chose et
       tient sur une ligne. Ce n'est pas moi qui tranche sur ses mots : s'il
       veut les deux mots, on élargit les tuiles, et il me le dira. */
    { cle: "photo", nom: "Photo",
      dessin: "M9.4 4h5.2l1.2 2H20a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4.2l1.2-2Zm2.6 4.8a4.6 4.6 0 1 0 0 9.2 4.6 4.6 0 0 0 0-9.2Zm0 1.9a2.7 2.7 0 1 1 0 5.4 2.7 2.7 0 0 1 0-5.4Z" },
    { cle: "video", nom: "Vidéo",
      dessin: "M4 5h16a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2Zm6 3.6v6.8L15.6 12 10 8.6Z" },
    { cle: "lire", nom: "Lire",
      dessin: "M4 9h3.4L12 4.6v14.8L7.4 15H4a1 1 0 0 1-1-1v-4a1 1 0 0 1 1-1Zm12.5-1.6a5.6 5.6 0 0 1 0 9.2l-1.1-1.6a3.6 3.6 0 0 0 0-6l1.1-1.6Zm2.3-3.2a9.6 9.6 0 0 1 0 15.6l-1.1-1.6a7.6 7.6 0 0 0 0-12.4l1.1-1.6Z" },
    { cle: "fiche", nom: "Moi",
      dessin: "M12 12.4a4.2 4.2 0 1 0 0-8.4 4.2 4.2 0 0 0 0 8.4ZM4 20.4c0-3.6 3.6-6 8-6s8 2.4 8 6v.6H4v-.6Z" },
    /* ── LA PORTE, ENFIN ─────────────────────────────────────────────────────

       Lamine, le 12 septembre 2026 : « où est-ce que je peux les relire, je ne
       vois pas. »

       C'EST LA QUATRIÈME FOIS. Il y a dans ce fichier, écrit de ma main, ce
       commentaire : « c'est la troisième fois qu'on construit quelque chose
       sans laisser de porte pour y entrer : une chose qu'on ne voit pas
       n'existe pas. » Je l'ai écrit, et j'ai recommencé.

       Les six pages de relecture existaient, mais pour y arriver il fallait :
       ouvrir la fenêtre des papiers, toucher « Moi », descendre jusqu'au
       réglage de la voix, et trouver six liens en petit texte au milieu d'un
       paragraphe. Personne ne devine ça, et surtout pas celui qui a autre
       chose à faire que de chercher dans sa propre application.

       Un bouton dans la rangée, comme les autres, avec le nombre de textes
       qui attendent écrit dessus. Il ne paraît qu'avec son code maître : un
       testeur n'a rien à relire. */
    ...(estMaitre ? [{ cle: "relire" as Service, nom: "À relire",
      dessin: "M5 3h9l5 5v13a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1Zm8 1.8V9h4.2L13 4.8ZM7.6 12.4l1.2-1.2 1.8 1.8 3.8-3.8 1.2 1.2-5 5-3-3Z" }] : []),
  ];

  function vueServices() {
    return (
      <div className="services" role="tablist" aria-label="Les services de BIA">
        {SERVICES.map((x) => (
          <button key={x.cle} type="button" role="tab" aria-selected={service === x.cle}
            className={service === x.cle ? "service actif" : "service"}
            onClick={() => ouvrirService(x.cle)}>
            <svg viewBox="0 0 24 24" aria-hidden="true"><path d={x.dessin} /></svg>
            <span>{x.nom}</span>
          </button>
        ))}
      </div>
    );
  }


  /* ── TOUT CE QUI ATTEND SON OREILLE, EN UNE PAGE ────────────────────────────

     Lamine, le 12 septembre 2026 : « où est-ce que je peux les relire, je ne
     vois pas. »

     Les six pages existaient. Ce qui manquait, c'était de pouvoir y arriver —
     et de savoir LAQUELLE attend quoi. Ce panneau-ci répond aux deux : chaque
     ligne dit combien de phrases, ce que ça coûtera à enregistrer une fois, et
     si le verrou est ouvert ou fermé.

     LE VERROU EST LE CŒUR DE CETTE PAGE, pas un détail technique. Fermé, BIA
     reste muette sur ces phrases — c'est pour ça qu'il n'entend pas « d'accord,
     j'exécute ». Ouvert, elles sont enregistrées une fois et deviennent
     gratuites pour toujours. Il faut donc qu'il voie, d'un coup d'œil, où il
     en est de sa relecture. */
  function vueRelire() {
    const listes: Array<{ ou: string; nom: string; combien: number; verrou: boolean; quoi: string }> = [
      { ou: "/voix", nom: "Les 42 phrases", combien: 42, verrou: RELU,
        quoi: "Ses réponses de tous les jours." },
      { ou: "/voix/base", nom: "Les 69 nouvelles", combien: 69, verrou: RELU_BASE,
        quoi: "Celles qu'on a ajoutées après les 42." },
      { ou: "/voix/nombres", nom: `Les ${NOMBRES.length} nombres`, combien: NOMBRES.length, verrou: RELU_NOMBRES,
        quoi: "Compter en wolof, et l'argent en dërëm." },
      { ou: "/voix/guidage", nom: "Les 49 du guidage", combien: 49, verrou: RELU_GUIDAGE,
        quoi: "Ce qu'elle dit pour te guider sur la carte." },
      { ou: "/voix/services", nom: "Les 34 des services", combien: 34, verrou: RELU_SERVICES,
        quoi: "« D'accord, j'exécute », « d'accord, je vois ça », et ce qu'elle dit quand ça casse." },
      { ou: "/voix/verdicts", nom: "Ce que tu as jugé", combien: compteVerdicts.bien + compteVerdicts.mal,
        verrou: true, quoi: "Les boutons vert et rouge de l'écran principal." },
    ];
    return (
      <>
        <p className="papier-titre">À relire</p>
        <p className="papier-note">
          Rien de tout ça n&apos;est enregistré tant que tu ne l&apos;as pas
          entendu et validé. C&apos;est voulu&nbsp;: on a déjà évité deux fois
          d&apos;enregistrer du wolof que je croyais juste. Chaque liste
          s&apos;enregistre une seule fois, et devient gratuite pour toujours.
        </p>
        <div className="relire-liste">
          {listes.map((l) => (
            <a key={l.ou} href={l.ou} className="relire-carte">
              <span className="relire-nom">{l.nom}</span>
              <span className="relire-quoi">{l.quoi}</span>
              <span className={l.verrou ? "relire-etat relire-ouvert" : "relire-etat relire-ferme"}>
                {l.verrou ? "relu — enregistrable" : "en attente de ta relecture"}
              </span>
            </a>
          ))}
        </div>
        {/* ── ET LA PAGE QUI DIT POURQUOI ELLE NE RÉPOND PAS ──────────────

            Lamine, le 12 septembre 2026 : « elle n'arrête pas de me dire que
            son moteur ne répond pas, il faut vérifier ce qui se passe. »

            Le serveur savait déjà — chaque refus du modèle est noté avec son
            numéro — mais ça vivait dans une page de texte brut illisible sur
            un téléphone. Cinquième fois de la soirée qu'une chose existe sans
            porte pour y entrer. Elle est ici, à côté des autres, et elle ne
            demande aucun code. */}
        {/* ── ET LE COMPTE DE CE QU'ELLE A RETENU ──────────────────────────

            Lamine, le 16 septembre 2026 : « je ne peux pas ouvrir le lien que
            tu m'as donné. » Je lui avais demandé de taper /api/etat à la main
            sur son téléphone pour y lire du texte brut de serveur — la
            troisième fois de la semaine, contre sa propre règle du 11. Cette
            carte-ci existait déjà ; c'est moi qui l'avais oubliée. Elle mène
            maintenant aussi aux comptes de ce qu'il lui a appris, et son
            texte le dit, sinon il ne saura pas qu'ils y sont. */}
        <h2 className="papier-titre" style={{ marginTop: 22 }}>Ce qu&apos;elle a retenu, et ce qui rate</h2>
        <div className="relire-liste">
          <a href="/etat" className="relire-carte">
            <span className="relire-nom">L&apos;état de BIA</span>
            <span className="relire-quoi">
              Combien de phrases tu lui as apprises, et si la dernière est bien
              rangée. Puis pourquoi son moteur ne répond pas, avec le numéro et
              le message exacts. Ne demande aucun code.
            </span>
          </a>
        </div>

        <p className="papier-note" style={{ marginTop: 16 }}>
          Pages provisoires, et pour toi seul&nbsp;: chaque écoute coûte environ
          deux centimes. On les retire une fois l&apos;enregistrement fait.
        </p>
      </>
    );
  }

  /* La page d'accueil de la fenêtre : rien n'est encore choisi. */
  function vueAccueil() {
    const vide = historyRef.current.length === 0;
    return (
      <>
        <p className="papier-titre">Loo bëgg ?</p>
        <p className="papier-note">
          {vide
            ? "Parle d'abord à BIA — dis-lui en wolof ce que tu veux, et pour qui. Sauf pour les deux derniers : photographier un papier et lire un texte français marchent tout de suite."
            : "Touche un bouton là-haut. Elle écrit à partir de ce que tu viens de lui dire, en français, prêt à envoyer."}
        </p>

        {/* TOUT CE QU'ELLE A DÉJÀ ÉCRIT. Un devis d'il y a trois jours se
            rouvre ici, même si la conversation, elle, a tourné la page. */}
        {papiers.length ? (
          <>
            <p className="papier-titre" style={{ marginTop: 22 }}>Tes papiers</p>
            <div className="papier-liste">
              {papiers.map((g) => (
                <button key={g.id} type="button" className="papier-carte"
                  onClick={() => rouvrirPapier(g)}>
                  <span className="papier-carte-sorte">
                    {g.doc.type === "devis" ? (g.doc.nature === "facture" ? "Facture" : "Devis")
                      : g.doc.type === "lettre" ? "Lettre" : "Message"}
                  </span>
                  <span className="papier-carte-titre">{g.titre}</span>
                  <span className="papier-carte-ouvrir">
                    {new Date(g.quand).toLocaleDateString("fr-FR", { day: "numeric", month: "short" })}
                  </span>
                </button>
              ))}
            </div>
          </>
        ) : null}
      </>
    );
  }

  /* Coller un texte français et l'entendre en wolof, depuis la fenêtre plutôt
     que depuis le clavier : c'est un service, il a sa place dans la rangée. */
  function vueLire() {
    return (
      <>
        <p className="papier-titre">Un texte français, dit en wolof</p>
        <p className="papier-note">
          Colle ici le SMS, le courriel ou le message que tu as reçu. Elle te le dit
          en wolof, à voix haute. Elle lit, elle ne conseille pas.
        </p>
        <textarea className="paragraphe grand" rows={8} value={aColler}
          aria-label="Le texte français à lire en wolof"
          placeholder="Collal texte bi fii…"
          onChange={(e) => setAColler(e.target.value)} />
      </>
    );
  }

  function vuePhoto() {
    return (
      <>
        <p className="papier-titre">Une image, un papier, un écran</p>
        <p className="papier-note">
          Photographie un papier, ou choisis une image de ton téléphone. Elle regarde,
          elle dit ce que c&apos;est, et elle te le raconte en wolof : si c&apos;est du
          texte elle le lit, si c&apos;est une photo elle la décrit.
        </p>
        <p className="papier-note">
          Pour un papier, pose-le à plat et cadre-le en entier. Elle n&apos;invente
          jamais un chiffre : ce qu&apos;elle ne voit pas, elle l&apos;écrit [illisible].
        </p>
        {photoOccupe ? <p className="papier-note">Elle lit le papier…</p> : null}
      </>
    );
  }

  /* ── ON DEMANDE DÈS QU'ON A LE CODE, ET PLUS SEULEMENT DANS « MOI » ──────

     Lamine, le 12 septembre 2026 : « les deux boutons que je t'ai demandés,
     je ne les vois pas. »

     ILS ÉTAIENT BIEN LÀ, et c'est cette ligne-ci qui les cachait. Avant,
     j'écrivais : « on ne demande QUE quand il ouvre "Moi", inutile de poser
     la question à chaque écran à quelqu'un qui ne verra jamais ce lien. »

     C'était juste à l'époque où `estMaitre` ne commandait qu'un lien à
     l'intérieur du panneau « Moi » : celui qui ouvre le panneau est déjà
     dedans, la réponse arrive à temps. Mais depuis hier soir, `estMaitre`
     commande AUSSI les deux boutons vert et rouge de l'écran principal — et
     sur l'écran principal, `service` ne vaut jamais « fiche ». La question
     n'était donc jamais posée, `estMaitre` restait faux, et les boutons
     n'existaient pour personne, pas même pour lui.

     Le raisonnement n'était pas faux, il a VIEILLI : la condition est restée
     accrochée à un écran alors que ce qu'elle commande a déménagé. C'est le
     genre de chose qu'aucune épreuve de logique ne voit, parce que le code
     fait exactement ce qu'il dit.

     Une question, une fois, dès qu'on a un code. Ça coûte un aller-retour par
     ouverture d'application, et ça rend les deux boutons à celui qui les a
     demandés. */
  useEffect(() => {
    let actif = true;
    setEstMaitre(false);
    estMaitreRef.current = false;
    if (!code) return;
    fetch("/api/codes", { headers: { "x-bia-code": code } })
      .then((r) => r.ok ? r.json() : { maitre: false })
      .then((d: { maitre?: boolean }) => {
        if (!actif) return;
        setEstMaitre(d.maitre === true);
        estMaitreRef.current = d.maitre === true;
      }).catch(() => {});
    return () => { actif = false; };
  }, [code]);

  useEffect(() => {
    const url = new URL(window.location.href);
    if (url.searchParams.get("reglages") !== "voix") return;
    setService("fiche"); setFiche(true); setPapierOuvert(true);
    url.searchParams.delete("reglages");
    window.history.replaceState(null, "", url.toString());
  }, []);

  function ouvrirReglagesVoix() {
    taire();
    ouvrirService("fiche");
    setPapierOuvert(true);
  }

  function appliquerChoixVoix(choix: ChoixVoixBia) {
    setErreurChoixVoix("");
    if (!choisirVoixBia(choix)) {
      setErreurChoixVoix("Le choix n’a pas pu être enregistré sur ce téléphone.");
      return;
    }
    // Restart the page to discard every old audio request and native playback.
    // The app keeps its code, conversation and original Piper speed settings.
    taire();
    const url = new URL(window.location.href);
    url.searchParams.delete("voix");
    url.searchParams.set("reglages", "voix");
    window.location.replace(url.toString());
  }

  function ecouterVoixChoisie() {
    setPanne(""); setMode("thinking");
    void reveillerLeSon().then(() => speak("Naka nga def? Maa ngi fi ngir dimbali la.", undefined, "essai"))
      .catch(() => { setPanne("Touche à nouveau pour activer le son."); setMode("ready"); });
  }

  function vueFiche() {
    const champ = (cle: keyof Emetteur, etiquette: string, mode?: string) => (
      <label className="papier-champ">{etiquette}
        <input value={String(emetteur[cle] ?? "")} inputMode={mode as "text" | "tel" | undefined}
          onChange={(e) => setEmetteur((v) => ({ ...v, [cle]: e.target.value }))} />
      </label>
    );
    /* Trois repères écrits en toutes lettres : un curseur nu ne dit rien à
       quelqu'un qui ne lit pas les chiffres. */
    const mot = debit <= 0.68 ? "Très posée" : debit <= 0.78 ? "Posée" : debit <= 0.9 ? "Normale" : "Vive";

    return (
      <>
        <p className="papier-titre">Moi</p>
        <div className="papier-actions">
          <button type="button" onClick={() => { setPapierOuvert(false); ouvrirClavier(); }}>Conversation écrite</button>
          <button type="button" onClick={() => choisirPersona(persona === "rara" ? "bia" : "rara")}>Personnage : {persona === "rara" ? "Rara" : "BIA"}</button>
          {conversation ? <button type="button" onClick={annulerCeQueJeDis}>Annuler ma phrase</button> : null}
          <button type="button" disabled={mode !== "ready" || conversation} onClick={ecouterVoixChoisie}>Écouter la voix choisie</button>
        </div>
        {panne ? <p role="alert">{panne}</p> : null}
        <p className="papier-titre">La voix de {persona === "rara" ? "Rara" : "BIA"}</p>
        <fieldset style={{ margin: "12px 0", padding: 12, border: "1px solid #8c7549", borderRadius: 12 }}>
          <legend>Choisir la voix</legend>
          {([
            ["male", "Homme — KHALAM Voice"],
            ["female", "Femme — KHALAM Voice"],
            ["piper", "Piper — moteur sur le téléphone"],
          ] as const).map(([valeur, label]) => (
            <label key={valeur} style={{ display: "flex", alignItems: "center", gap: 12, minHeight: 48, cursor: "pointer" }}>
              <input type="radio" name="bia-voix" value={valeur} checked={choixVoix === valeur}
                onChange={() => appliquerChoixVoix(valeur)} style={{ accentColor: "#d4af37", width: 20, height: 20 }} />
              <span>{label}</span>
            </label>
          ))}
        </fieldset>
        <p className="papier-note">Ton choix est mémorisé sur ce téléphone. KHALAM Voice utilise le serveur de test.</p>
        {erreurChoixVoix && <p className="panne" role="alert">{erreurChoixVoix}</p>}
        <button type="button" className="papier-lien" disabled={mode !== "ready" || conversation}
          onClick={ecouterVoixChoisie}>Écouter la voix choisie</button>
        {panne && <p className="panne" role="alert">{panne}</p>}
        <p className="papier-note" role="status" data-bia-voice-status>
          {essaiChatterbox ? `KHALAM Voice · voix ${choixVoix === "female" ? "de femme" : "d’homme"} · serveur de test` : voixLocalePresente
            ? `Voix locale ${epoqueVoixLocaleBia()} — moteur installé sur cet iPhone`
            : "Piper absent de cette fenêtre — ouvre BIA installée sur le téléphone"}
        </p>
        {!essaiChatterbox && !voixLocalePresente && (
          <p className="papier-note">Pour tester la nouvelle voix, ouvre BIA installée sur l&apos;iPhone. Safari et l&apos;ancienne icône web n&apos;ont pas ce moteur.</p>
        )}
        <p className="papier-note">
          {essaiChatterbox ? "Vitesse d’origine du moteur pour cet essai." : <>Si elle parle trop vite, ralentis-la. Sa voix ne change pas — elle
          prend seulement son temps. C&apos;est pour toi seul, sur ce téléphone.</>}
        </p>
        <div className="papier-debit" role="group" aria-label="Réglage de la vitesse">
          <span>Elle parle&nbsp;: <b>{essaiChatterbox ? "Vitesse d’origine" : mot}</b> — {debit.toFixed(2)} ×</span>
          <input type="range" min={voixLocalePresente ? 0.7 : 0.6} max={voixLocalePresente ? 1.2 : 1} step={0.05} value={debit}
            disabled={essaiChatterbox}
            aria-label="Vitesse de la voix"
            onChange={(e) => changerDebit(Number(e.target.value))} />
          <span className="papier-debit-bornes"><i>Plus lentement</i><i>Plus vite</i></span>
        </div>
        {voixLocalePresente && <button type="button" className="papier-lien" onClick={() => { void voixAvecDebitNatif()?.settings?.().catch(() => setErreurDebit("Impossible d’ouvrir l’écoute.")); }}>Écouter et régler la voix locale →</button>}

        {erreurDebit && <p className="papier-note" role="alert">{erreurDebit}</p>}

        {/* ── LA PAGE D'APPRENTISSAGE ──────────────────────────────────────

            Lamine, le 13 septembre 2026 : « je veux que moi uniquement je
            puisse lui donner ces instructions-là, avec mon compte maître. Les
            testeurs n'auront pas accès à cette partie. »

            ELLE N'EST PAS PROVISOIRE, contrairement aux pages d'écoute
            en dessous : c'est là qu'il apprendra le wolof à BIA pendant des
            mois. Elle a donc sa ligne à elle, au-dessus, et elle ne part pas
            avec les autres.

            ET ELLE A SON LIEN. C'est sa leçon, apprise deux fois à mes dépens
            — le réglage du débit puis l'appareil photo : « où se trouve le
            réglage dont tu parles ? Il n'y a aucun bouton paramètre sur BIA. »
            Une page qu'il faut taper à la main n'existe pas. */}
        {estMaitre ? (
          <p className="papier-note" style={{ marginTop: 14 }}>
            <a href="/lecon" className="papier-lien">Apprendre à BIA →</a>
            <br />
            Une leçon, c&apos;est une situation : ce qu&apos;on lui dit, et les quatre ou
            cinq réponses qu&apos;elle peut donner. Le wolof et son français côte à
            côte. Pour toi seul.
          </p>
        ) : null}

        {/* LA PAGE D'ÉCOUTE — provisoire, et pour Lamine seul.

            Il a dû demander où elle se trouvait. C'est la troisième fois qu'on
            construit quelque chose sans laisser de porte pour y entrer : une
            chose qu'on ne voit pas n'existe pas.

            Elle n'apparaît que pour le code maître. Chaque écoute coûte environ
            deux centimes, et un testeur n'a rien à faire devant un bouton qui
            dépense. Ce bloc part avec la page, le jour de l'enregistrement. */}
        {estMaitre ? (
          <p className="papier-note" style={{ marginTop: 14 }}>
            <a href="/voix" className="papier-lien">Écouter les 42 phrases →</a>
            {" "}
            <a href="/voix/nombres" className="papier-lien">Écouter les {NOMBRES.length} nombres →</a>
            {" "}
            <a href="/voix/base" className="papier-lien">Écouter les 69 nouvelles →</a>
            {" "}
            <a href="/voix/guidage" className="papier-lien">Écouter les 49 du guidage →</a>
            {" "}
            {/* ── LA CINQUIÈME PAGE, QUI MANQUAIT ICI ──────────────────────

                Le 12 septembre 2026, Lamine m'a envoyé la copie de cet écran :
                quatre boutons, et pas celui des services. J'avais ajouté le
                lien aux QUATRE pages de /voix/ — qui se lisent l'une depuis
                l'autre — en oubliant que c'est d'ICI qu'il les ouvre. Une page
                qu'on ne peut pas atteindre n'existe pas. */}
            <a href="/voix/services" className="papier-lien">Écouter les 34 des services →</a>
            {" "}
            {/* LA PAGE DOIT ÊTRE ATTEIGNABLE DEPUIS L'INTERFACE, et c'est une
                leçon de lui : « où se trouve le réglage dont tu parles ? Il
                n'y a aucun bouton paramètre sur BIA » — une page sans lien est
                une page qui n'existe pas. */}
            <a href="/voix/verdicts" className="papier-lien">
              Relire ce que tu as jugé{compteVerdicts.bien + compteVerdicts.mal
                ? ` (${compteVerdicts.bien + compteVerdicts.mal})` : ""} →
            </a>
            <br />
            Cinq pages provisoires, et pour toi seul : les phrases, les
            nombres, les 69 nouvelles réponses, les 49 phrases qui te guideront
            sur la carte, et les 34 qu&apos;elle dit en exécutant — ou quand ça
            casse. On les retire une fois l&apos;enregistrement fait.
          </p>
        ) : null}

        {/* LE BOUTON QUI ENREGISTRE — une fois, et il n'y a rien après.

            Lamine, le 11 septembre 2026 : « j'ai tout écouté, tout est bien.
            Est-ce que ça sera enregistré dans le lexique ? Comme ça on n'aura
            plus jamais besoin de payer ça. »

            IL DOIT LE LANCER LUI-MÊME. La route exige son code maître, et son
            code ne doit sortir de son téléphone pour personne — moi compris.

            LE PRIX EST ÉCRIT AVANT, PAS APRÈS, et il faut appuyer deux fois.
            Un bouton qui dépense un dollar sans prévenir est un piège, même
            quand c'est le sien.

            Ce n'est pas grave de le presser deux fois : ce qui est déjà
            enregistré n'est jamais refabriqué — la route regarde d'abord si
            le fichier existe. */}
        {estMaitre ? <PapierRepertoire code={code} /> : null}

        <p className="papier-titre" style={{ marginTop: 22 }}>Mes renseignements</p>
        <p className="papier-note">
          Donnés une fois, ils reviennent sur chacun de tes papiers. Le NINEA et le
          registre de commerce sont ce qui rend un devis recevable par une
          administration ou par une société.
        </p>
        {champ("nom", "Nom ou raison sociale")}
        {champ("metier", "Métier")}
        {champ("telephone", "Téléphone", "tel")}
        {champ("adresse", "Adresse")}
        {champ("ninea", "NINEA")}
        {champ("rc", "Registre de commerce")}
        <label className="papier-case">
          <input type="checkbox" checked={emetteur.tva}
            onChange={(e) => setEmetteur((v) => ({ ...v, tva: e.target.checked }))} />
          Je suis assujetti à la TVA (18 %)
        </label>
        <p className="papier-note">
          Si tu ne l'es pas, laisse décoché : faire apparaître une TVA quand on n'y
          est pas assujetti est une faute.
        </p>
        <div className="papier-boutons">
          <button type="button" onClick={garderRenseignements}>Garder</button>
          <button type="button" className="pale" onClick={() => setFiche(false)}>Annuler</button>
        </div>
      </>
    );
  }

  /* PASSER LA MAIN À QUELQU'UN D'AUTRE.

     On charge sa case : son prénom, ses notes, ses renseignements, sa
     conversation. Et la présentation repart à zéro — elle doit dire bonjour à
     celui qui arrive, pas continuer avec celui qui vient de partir. */
  function changerProfil(id: string) {
    if (id === profil) { setQuiParle(false); return; }
    taire();
    couperSon();
    setProfil(id);
    profilRef.current = id;
    garderProfils(profils, id);
    nomRef.current = profils.find((x) => x.id === id)?.nom || "";
    presentationFaiteRef.current = false;
    nouveauNomRef.current = "";

    try {
      const fil = localStorage.getItem(cleFil(id));
      setHistory(fil ? (JSON.parse(fil) as Message[]) : []);
      const notes = localStorage.getItem(cleResume(id)) || "";
      setResume(notes);
      resumeRef.current = notes;
      setPapiers(chargerPapiers(id));
      const sien = localStorage.getItem(cleEmetteur(id));
      setEmetteur(sien ? { ...EMETTEUR_VIDE, ...(JSON.parse(sien) as Partial<Emetteur>) } : EMETTEUR_VIDE);
    } catch {
      setHistory([]); setResume(""); setEmetteur(EMETTEUR_VIDE); setPapiers([]);
    }

    // Les papiers appartenaient à la personne d'avant.
    setPapierPret(null);
    setPapier(null);
    papierOuvertId.current = "";
    setPapierOuvert(false);
    if (pdf) { URL.revokeObjectURL(pdf); setPdf(""); }
    setQuiParle(false);
  }

  function ajouterQuelquun() {
    const { profils: suite, id } = ajouterProfil(profils, nouveauNom);
    setProfils(suite);
    garderProfils(suite, id);
    setNouveauNom("");
    changerProfilVers(suite, id);
  }

  /* Même chose que changerProfil, mais avec la liste toute fraîche : après un
     ajout, l'état React n'est pas encore à jour et la personne serait
     introuvable. */
  function changerProfilVers(liste: Profil[], id: string) {
    taire();
    couperSon();
    setProfil(id);
    profilRef.current = id;
    nomRef.current = liste.find((x) => x.id === id)?.nom || "";
    presentationFaiteRef.current = false;
    nouveauNomRef.current = "";
    setHistory([]);
    setResume("");
    resumeRef.current = "";
    setEmetteur(EMETTEUR_VIDE);
    setPapierPret(null);
    setPapier(null);
    setPapierOuvert(false);
    setQuiParle(false);
  }

  function retirerQuelquun(id: string) {
    // Ses papiers partent avec le reste : on promet d'effacer tout ce qui le
    // concerne, et un devis porte son nom, son client et ses prix.
    oublierPapiers(id);
    const suite = oublierProfil(profils, id);
    if (!suite.length) {
      // On ne laisse jamais l'appareil sans personne : on repart d'une case vide.
      const { profils: neuf, id: neufId } = ajouterProfil([], "");
      setProfils(neuf);
      garderProfils(neuf, neufId);
      changerProfilVers(neuf, neufId);
      return;
    }
    setProfils(suite);
    const bon = suite.some((x) => x.id === profil) ? profil : suite[0].id;
    garderProfils(suite, bon);
    if (bon !== profil) changerProfilVers(suite, bon);
  }

  function nouvelleConversation() {
    couperSon();
    window.speechSynthesis?.cancel();
    setHistory([]);
    // L'écran appartient à la conversation qu'on quitte : il se referme avec.
    setEcran(null);
    // Nouvelle conversation, donc nouvelle présentation : elle redira une
    // fois « je t'ai bien entendu », puis se taira comme avant.
    presentationFaiteRef.current = false;
    setAppel(null);
    /* On referme le papier ouvert, mais ON NE LE JETTE PAS : un devis n'est
       pas un bavardage, il se retrouve dans la liste même après avoir tourné
       la page. Recommencer une conversation ne doit pas coûter un document. */
    setPapierPret(null);
    setPapier(null);
    papierOuvertId.current = "";
    setPapierOuvert(false);
    setPapierErreur("");
    if (pdf) { URL.revokeObjectURL(pdf); setPdf(""); }
    try { localStorage.removeItem(cleFil(profilRef.current)); } catch {}
    // Les notes ne sont PAS effacées : c'est justement ce qui fait qu'elle se
    // souvient de la personne d'une conversation à l'autre.
  }

  function toutOublier() {
    nouvelleConversation();
    setResume("");
    resumeRef.current = "";
    try { localStorage.removeItem(cleResume(profilRef.current)); } catch {}
  }

  async function entrer() {
    const propre = codeSaisi.toUpperCase().replace(/[^A-Z0-9]/g, "");
    if (propre.length < 6) { setCodeErreur("Code trop court."); return; }
    try { localStorage.setItem("bia-code", propre); } catch {}
    setCode(propre);
    setCodeSaisi("");
    setCodeErreur("");
  }

  if (!code) {
    return (
      <main className="bia-presence" data-mode="ready">
        <div className="portrait" aria-hidden="true" data-tenue={tenue} data-persona={persona}><div className="avatar" data-face="yeux_ouverts" /></div>
        <section className="porte">
          <p className="porte-titre">BIA</p>
          <p className="porte-texte">Duggal sa kod ngir waxtaan ak BIA.</p>
          <div className="saisie">
            <input
              value={codeSaisi}
              onChange={(e) => setCodeSaisi(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter") void entrer(); }}
              placeholder="KOD"
              aria-label="Code d'accès"
              autoCapitalize="characters"
              autoComplete="off"
              enterKeyHint="go"
            />
            <button type="button" onClick={() => void entrer()} disabled={!codeSaisi.trim()} aria-label="Entrer">
              <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3.4 20.4 21 12 3.4 3.6 3.4 10l12 2-12 2Z" /></svg>
            </button>
          </div>
          {codeErreur ? <p className="porte-erreur">{codeErreur}</p> : null}
        </section>

        {/* ── ELLE S'INSTALLE AUSSI DEPUIS LA PORTE ──────────────────────────
            L'épreuve au navigateur a trouvé ça : l'invitation était posée dans
            l'écran d'après, et cet écran-ci s'arrête avant. Or c'est LE
            premier écran que voit quelqu'un qui vient d'acheter un code — et
            c'est le bon moment pour poser BIA sur son téléphone, avant même
            de taper le code, pour qu'il n'ait plus jamais à le retaper. */}
        <Installer />
      </main>
    );
  }


  /* ── ONBOARDING VOIX ────────────────────────────────────────────────────
     Affiché une seule fois, au premier lancement, si aucune belle voix
     française féminine n'est trouvée sur l'appareil. */
  if (!essaiChatterbox && onboarding.besoin && onboarding.verifie) {
    return <OnboardingVoix onTermine={() => onboarding.passer()} />;
  }

  return (
    <main className="bia-presence" data-mode={mode} data-clavier={clavier ? "ouvert" : "ferme"} data-ecran={ecran ? "ouvert" : "ferme"}>
      <div className={eclipse ? "portrait eclipse" : rallume ? "portrait rallume" : "portrait"}
        aria-hidden="true" data-tenue={tenue} data-persona={persona}>
        {/* ── DEUX COUCHES, POUR QUE LE VISAGE NE SAUTE PLUS ─────────────
            Lamine, le 19 septembre 2026 : « quand elle finit de rire, elle
            ferme automatiquement son visage, c'est brusque, ça colle pas ».
            Une seule image qui change de case, c'est une coupe franche.
            L'ancien visage reste donc dessus un cinquième de seconde et
            s'efface, pendant que le nouveau est déjà dessous. Les bouches
            n'y passent pas : une bouche qui fond dans la suivante ferait
            une bouillie sur la parole. Voir visageAvant. */}
        {portraitPret && visageAvant && (
          <div key={visageAvant.n} className="avatar avatar-avant" data-face={visageAvant.face} />
        )}
        <div className="avatar avatar-socle" data-face="yeux_ouverts" />
        <div className="avatar" data-face={portraitPret ? face : "yeux_ouverts"} />
        {introRara !== null && (
          <div className="intro-rara" aria-hidden="true">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img key={introRara} src={`/rara-intro-${introRara + 1}.webp`} alt="" />
          </div>
        )}
      </div>

      {/* ── LE CHOIX DU PERSONNAGE ─────────────────────────────────────────
          Demandé par Lamine le 25 septembre 2026 : « je veux qu'elle soit
          une option dans BIA, que l'utilisateur peut choisir ». Un simple
          bouton qui bascule : la conversation en cours continue, seule sa
          façon d'être change à partir de la prochaine réponse. */}
      {/* Elle réfléchit. Pas un mot à l'écran : trois points d'or qui
          respirent, et le silence. */}
      <div className="lueur" aria-hidden="true"><span /><span /><span /></div>

      {/* APPELER. Le numéro est déjà écrit ; il ne reste qu'à appuyer. Ce
          bouton n'apparaît que lorsqu'elle a préparé un appel, et disparaît
          à la question suivante.

          ET IL NE DISPARAÎT PLUS SOUS LES DOIGTS QUAND C'EST UN SECOURS.
          Le bouton est masqué pendant qu'on tape — juste, il recouvrirait ce
          qu'on écrit. Mais quelqu'un qui tape « ma mère ne respire plus » a
          le clavier ouvert AU MOMENT EXACT où le bouton paraît. Trouvé le 13
          septembre 2026 en cherchant à lui donner l'allure que Lamine
          demandait ; c'est la feuille de style qui le dit, pas ce fichier —
          voir .appeler-urgence dans globals.css. */}
      {appel ? (
        <a className={appel.urgence ? "appeler appeler-urgence" : "appeler"} href={`tel:${appel.numero}`}
          onClick={() => setTimeout(() => setAppel(null), 1500)}>
          <svg viewBox="0 0 24 24" aria-hidden="true">
            <path d="M6.6 10.8a15.6 15.6 0 0 0 6.6 6.6l2.2-2.2a1 1 0 0 1 1-.25 11.4 11.4 0 0 0 3.6.58 1 1 0 0 1 1 1V20a1 1 0 0 1-1 1A17 17 0 0 1 3 4a1 1 0 0 1 1-1h3.5a1 1 0 0 1 1 1c0 1.25.2 2.46.58 3.6a1 1 0 0 1-.25 1l-2.23 2.2Z" />
          </svg>
          <span>
            <b>Appeler {appel.nom || ""}</b>
            <i>{appel.numero}</i>
          </span>
        </a>
      ) : null}

      {/* Ce qu'on lit après avoir annulé. Il ne dure que le temps de le lire :
          c'est un accusé de réception, pas un avertissement. */}
      {annule ? <p className="repris">Rien n&apos;a été envoyé. Reprends quand tu veux.</p> : null}

      {/* ── LES DEUX BOUTONS DE JUGEMENT, AU CODE MAÎTRE SEUL ─────────────

          Lamine, le 12 septembre 2026 au soir : « je veux deux boutons sur
          l'écran, un vert à gauche, un rouge à droite… ces deux boutons ne
          doivent être actifs qu'avec mon code maître, les autres testeurs ne
          doivent pas les voir. »

          Ils sont sur leur propre rangée, aux deux bords de l'écran : la
          rangée du micro porte déjà le clavier, le micro et les papiers, et
          y ajouter deux boutons la rendrait illisible sur un téléphone.

          ILS NE PARAISSENT QUE QUAND IL Y A QUELQUE CHOSE À JUGER. Un bouton
          qui juge le vide n'a aucun sens, et sa présence ferait croire qu'on
          a manqué quelque chose. Le compte écrit dessus est l'accusé de
          réception : on voit le chiffre monter, sans rien lire. */}
      {estMaitre && dernierDitParElle ? (
        <div className="verdicts">
          <button className="verdict-bien" type="button"
            onClick={() => juger("bien")}
            aria-label="Elle l'a bien dit — à garder et à enregistrer">
            {/* ── LE CHIFFRE S'AFFICHE MÊME À ZÉRO ────────────────────────
                Lamine, le 18 septembre 2026, sur l'application neuve : « les
                chiffres ne s'affichent plus, je ne sais pas s'ils sont vides
                ou pas. »
                Je cachais le compte à zéro, par propreté. Résultat : « aucun
                verdict » et « le compteur est cassé » s'écrivaient pareil —
                c'est-à-dire pas du tout. Un zéro affiché est une information ;
                un vide n'en est pas une. */}
            <b>Bien dit</b><i>{compteVerdicts.bien}</i>
          </button>
          {motVerdict ? <span className="verdict-mot">{motVerdict}</span> : null}
          <button className="verdict-mal" type="button"
            onClick={() => juger("mal")}
            aria-label="Elle l'a mal dit — à corriger plus tard">
            <b>Mal dit</b><i>{compteVerdicts.mal}</i>
          </button>
        </div>
      ) : null}

      <div className="barre">
        <button className="clavier-ouvrir" type="button"
          onClick={ouvrirClavier} aria-label="Ouvrir le clavier et la conversation écrite"
          title="Clavier" aria-expanded={clavier} aria-controls="conversation-ecrite">
          <svg viewBox="0 0 24 24" aria-hidden="true">
            <path d="M3 5h18a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2Zm0 2v10h18V7H3Zm2 2h2v2H5V9Zm4 0h2v2H9V9Zm4 0h2v2h-2V9Zm4 0h2v2h-2V9ZM5 13h2v2H5v-2Zm4 0h10v2H9v-2Z" />
          </svg>
        </button>
        <button
          className={conversation ? `microphone en-conversation${entendParler && mode === "listening" ? " entend" : ""}` : "microphone"}
          type="button" onClick={toggleMicrophone}
          disabled={microFerme} aria-disabled={microFerme}
          aria-label={conversation ? "Fermer la conversation vocale" : labels[mode]}>
          <svg viewBox="0 0 24 24" aria-hidden="true">
            <path d="M12 14.5a3.5 3.5 0 0 0 3.5-3.5V5a3.5 3.5 0 0 0-7 0v6a3.5 3.5 0 0 0 3.5 3.5Zm-6-4a1 1 0 0 1 2 0V11a4 4 0 0 0 8 0v-.5a1 1 0 1 1 2 0V11a6 6 0 0 1-5 5.92V19h3a1 1 0 1 1 0 2H8a1 1 0 1 1 0-2h3v-2.08A6 6 0 0 1 6 11v-.5Z" />
          </svg>
        </button>

        <button className="papier-ouvrir" type="button" aria-label="Moi — réglages et services"
          onClick={() => { ouvrirPapier("devis"); ouvrirService("fiche"); }}>
          <span style={{ fontSize: 13 }}>Moi</span>
        </button>
      </div>

      {lectureContinue ? <LectureApprentissage obtenirAudio={contexte} edition={estMaitre} code={code} voice={choixVoixBia()==="piper"&&!piperLocaleDisponible()?"female":choixVoixBia()} demande={lectureContinue}
        onStart={() => { fermerConversation(); taire(); }} onClose={() => setLectureContinue(null)} /> : null}
      <section id="conversation-ecrite" className="clavier" aria-hidden={!clavier}>
        <button className="clavier-fermer" type="button" onClick={() => setClavier(false)} aria-label="Replier le clavier">
          <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M18.3 7.1 16.9 5.7 12 10.6 7.1 5.7 5.7 7.1l4.9 4.9-4.9 4.9 1.4 1.4 4.9-4.9 4.9 4.9 1.4-1.4-4.9-4.9Z" /></svg>
        </button>

        {panne ? <p className="panne">⚠ {panne}</p> : null}

        <div className="outils">
          {estMaitre ? <button type="button" onClick={() => { apprend.current=true;setEnApprentissage(true);fermerConversation(); taire(); setLectureContinue({texte:saisie,nonce:Date.now(),auto:false}); }}>Apprentissage / lecture continue</button> : null}
          {/* Qui parle. Sur un téléphone qui se prête, c'est le bouton le plus
              important de tous : sans lui, elle appelle le suivant par le
              prénom du précédent. */}
          <button type="button" className="qui" onClick={() => setQuiParle(true)}>
            {profils.find((x) => x.id === profil)?.nom || "Qui parle ?"}
          </button>
          <button type="button" onClick={nouvelleConversation}>Nouvelle conversation</button>
          {resume ? <button type="button" onClick={toutOublier}>Tout oublier</button> : null}
          {resume ? <span className="jauge" title="BIA garde des notes sur toi, sur cet appareil">se souvient de toi</span> : null}
        </div>

        <div className="fil scrollbar-thin" ref={filRef}>
          {history.length === 0 ? <p className="fil-vide">{persona === "rara" ? welcomeRara : welcomeBia}</p> : null}
          {history.map((m, i) => {
            /* UN PAPIER SUR LE FIL. Il reste à sa place dans la conversation,
               comme n'importe quel message — mais c'est une carte qu'on
               rouvre, pas une bulle qu'on lit. Si le papier a été effacé de
               la boîte, on n'affiche rien : mieux vaut un trou qu'un bouton
               qui n'ouvre rien. */
            if (m.papier) {
              const garde = papiers.find((x) => x.id === m.papier);
              if (!garde) return null;
              return (
                <div key={i} className="ligne ligne-bia">
                  <button type="button" className="papier-carte"
                    onClick={() => rouvrirPapier(garde)}>
                    <span className="papier-carte-sorte">
                      {garde.doc.type === "devis" ? (garde.doc.nature === "facture" ? "Facture" : "Devis")
                        : garde.doc.type === "lettre" ? "Lettre" : "Message"}
                    </span>
                    <span className="papier-carte-titre">{garde.titre}</span>
                    <span className="papier-carte-ouvrir">Ouvrir</span>
                  </button>
                </div>
              );
            }
            return (
              <div key={i} className={m.role === "bia" ? "ligne ligne-bia" : "ligne ligne-moi"}>
                <p className={
                  (m.role === "bia" ? "bulle bulle-bia" : "bulle bulle-moi")
                  + (m.corrige ? " corrigee" : "")
                }>
                  {m.text.split(/\n{2,}/).map((para, n) => (
                    <span className="para" key={n}>{para.trim()}</span>
                  ))}
                </p>
                {/* Ce qu'elle montre vient SOUS sa phrase, jamais à la place :
                    l'image complète la parole, elle ne la remplace pas. */}
                {/* Les images ne sont plus DANS le fil : ces cartes ne font
                    que rouvrir l'écran, à leur place dans la conversation. */}
                {m.voir ? <CarteVitrine cle={m.voir} ouvrir={montrerSurEcran} /> : null}
                {m.trouve ? <CarteTrouve trouve={m.trouve} ouvrir={montrerSurEcran} /> : null}
                {estMaitre && m.role === "bia" && i > 0 ? (
                  <button className="mal-dit" type="button" onClick={() => ouvrirCorrection(i)}>
                    {m.corrige ? "Corrigé par toi — retoucher" : "Mal dit"}
                  </button>
                ) : null}
              </div>
            );
          })}
          {avis ? <p className="avis">{avis}</p> : null}
        </div>

        <div className="saisie">
          <input
            ref={champRef}
            value={saisie}
            onPaste={(e) => {
              const colle=e.clipboardData.getData("text");
              if(!colle.trim())return;
              const demande=demandeLecture(colle);
              // Pasted texts go directly to the reader for every authenticated access.
              e.preventDefault();
              const a=e.currentTarget;
              const complet=a.value.slice(0,a.selectionStart??a.value.length)+colle+a.value.slice(a.selectionEnd??a.value.length);
              fermerConversation();taire();setSaisie("");setClavier(false);
              apprend.current=true;setEnApprentissage(true);
              setLectureContinue({texte:demande?.auto?demande.texte:complet,nonce:Date.now(),auto:true});
            }}
            onChange={(e) => setSaisie(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter") void askBia(saisie); }}
            placeholder="Bindal walla collal ci français…"
            aria-label="Écrire un message à BIA, ou coller un texte français"
            enterKeyHint="send"
          />
          {/* LIRE EN WOLOF UN TEXTE FRANÇAIS. On colle le SMS de la banque ou
              de l'école, on appuie sur le haut-parleur, et on l'entend dans sa
              langue. Elle ne répond pas, elle ne conseille pas : elle lit. */}
          {/* L'appareil photo vit ici sans se voir : c'est le bouton « Papier »
              de la fenêtre des services qui le déclenche. Un seul champ de
              fichier pour toute l'application.

              J'avais sorti un bouton visible ici le 11 septembre 2026, en
              croyant réparer un oubli. Lamine l'a repris le jour même :
              « laisse le bouton Photo là où il était, c'était bien là-bas. »
              Il a raison — la barre de saisie doit rester une barre de
              saisie, et les services ont déjà leur rangée. */}
          {/* PAS DE « capture » : avec cet attribut, le téléphone ouvre
              directement l'appareil photo et interdit de choisir une image
              déjà prise. Or Lamine voulait justement envoyer une capture
              d'écran. Sans lui, iOS et Android proposent les deux — la
              photothèque ou l'appareil photo. */}
          <input ref={photoRef} type="file" accept="image/*"
            className="sr-only" aria-label="Photographier un papier"
            onChange={(e) => {
              const f = e.target.files?.[0];
              e.target.value = "";
              if (f) { setPapierOuvert(false); void lirePapierPhoto(f); }
            }} />
          <button type="button" onClick={() => void askBia(saisie)} disabled={!saisie.trim()} aria-label="Envoyer">
            <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3.4 20.4 21 12 3.4 3.6 3.4 10l12 2-12 2Z" /></svg>
          </button>
        </div>

        {/* ── UN BOUTON FERMER EN BAS, QU'ON ATTEINT TOUJOURS ──────────────

            Lamine, le 12 septembre 2026 au soir : « parfois, si on ouvre cette
            fenêtre de discussion, on ne peut pas la fermer. Il faut fermer
            toute l'application pour pouvoir revenir. Ce n'est pas normal. Il
            faut mettre le bouton fermer en bas, comme ça tout le monde peut y
            avoir accès. »

            Et ça se voit sur sa capture : la croix, en haut à droite, est
            COUPÉE par le bord de l'écran. Elle existe, elle fonctionne, et
            elle est inatteignable — ce qui est pire qu'un bouton absent,
            parce qu'on cherche.

            Le haut d'une fenêtre peut toujours sortir de l'écran : la barre
            du navigateur, l'encoche, une fenêtre plus petite que la page. Le
            bas, lui, est à portée du pouce et ne se cache pas. La croix du
            haut reste — elle sert quand elle est visible — mais elle n'est
            plus le seul chemin. */}
        <button className="clavier-fermer-bas" type="button" onClick={() => setClavier(false)}>
          Fermer
        </button>
      </section>

      {/* Toucher à côté referme. C'est le geste que tout le monde essaie
          d'abord, et jusqu'ici il ne faisait rien. */}
      {clavier || papierOuvert || quiParle || corrige !== null ? (
        <div className="voile" aria-hidden="true"
          style={{ zIndex: corrige !== null ? 5 : quiParle ? 5 : papierOuvert ? 4 : 3 }}
          onClick={() => {
            if (corrige !== null) { fermerCorrection(); return; }
            if (quiParle) { setQuiParle(false); return; }
            if (papierOuvert) { setPapierOuvert(false); return; }
            setClavier(false);
          }} />
      ) : null}

      {/* LA FENÊTRE DES SERVICES.

          Demande de Lamine, le 10 septembre 2026 : une rangée de boutons en
          haut, un par service, et « dès que tu appuies, c'est seulement cette
          page qui s'ouvre ». La rangée ne bouge plus : elle reste visible
          au-dessus de la page ouverte, pour passer de l'une à l'autre sans
          revenir en arrière. */}
      <section className="papier-panneau" aria-hidden={!papierOuvert}>
        <button className="clavier-fermer" type="button" onClick={() => setPapierOuvert(false)}
          aria-label="Refermer">
          <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M18.3 7.1 16.9 5.7 12 10.6 7.1 5.7 5.7 7.1l4.9 4.9-4.9 4.9 1.4 1.4 4.9-4.9 4.9 4.9 1.4-1.4-4.9-4.9Z" /></svg>
        </button>

        {vueServices()}

        <div className="papier-corps scrollbar-thin">
          {papierErreur ? <p className="panne">⚠ {papierErreur}</p> : null}

          {service === "fiche" ? vueFiche() : null}
          {service === "relire" && estMaitre ? vueRelire() : null}
          {service === "lire" ? vueLire() : null}
          {service === "photo" ? vuePhoto() : null}
          {service === "" ? vueAccueil() : null}

          {service === "message" || service === "devis" || service === "facture" || service === "mail" ? (
            <>
              {papierOccupe && !papier ? <p className="papier-note">BIA écrit…</p> : null}
              {/* ── LE BOUTON QUI DEMANDE VRAIMENT ──────────────────────────

                  Depuis le 13 septembre, BIA n'écrit plus rien de sa propre
                  initiative : ni pendant qu'on lui parle, ni quand on ouvre
                  cette fenêtre. C'est ce bouton-ci, et lui seul, qui lance
                  l'écriture — donc l'appel au modèle, donc la dépense.

                  Il ne paraît que s'il y a de quoi écrire : sans conversation
                  derrière, il n'écrirait rien et le dirait en rouge. */}
              {!papier && !papierOccupe && history.length > 0 ? (
                <p className="papier-note">
                  <button type="button" className="papier-ecrire"
                    onClick={() => void fabriquerPapier(service as Sorte)}>
                    {service === "facture" ? "Préparer la facture" : service === "devis" ? "Écrire le devis"
                      : service === "mail" ? "Écrire le mail" : "Écrire le message"}
                  </button>
                </p>
              ) : null}
              {/* ── ELLE DIT COMMENT LUI PARLER ────────────────────────────
                  « Quand elle est prête, elle doit te dire comment parler pour
                  que le message puisse être bien écrit. Si tu es prête pour
                  commencer, commence et parle doucement, dis clairement tout
                  ce que tu veux que j'écrive. » — Lamine, le 10 septembre 2026.

                  Avant, l'écran disait seulement « il n'y a pas de quoi
                  écrire » : un reproche, et aucune indication. Quelqu'un qui
                  ne sait pas lire ne devinait pas ce qu'on attendait de lui.
                  Elle explique maintenant, et le micro est à un geste. */}
              {!papier && !papierOccupe && !historyRef.current.length ? (
                <div className="prete">
                  <p className="papier-titre">Maa ngi ci sa kanam.</p>
                  <p className="papier-note">
                    Je suis prête. Appuie sur le micro et <strong>parle doucement</strong> —
                    dis clairement tout ce que tu veux que j&apos;écrive : pour qui c&apos;est,
                    ce qu&apos;il faut dire, et les prix s&apos;il y en a.
                  </p>
                  <p className="papier-note">
                    Si tu te trompes en parlant, touche le <strong>bouton rouge</strong> :
                    rien ne m&apos;est envoyé et tu reprends depuis le début.
                  </p>
                  <button type="button" className="parler-maintenant"
                    onClick={() => { setPapierOuvert(false); toggleMicrophone(); }}>
                    Parler maintenant
                  </button>
                </div>
              ) : null}
              {papier && papier.doc.type === "devis" ? vueDevis(papier.doc, papier.totaux) : null}
              {papier && papier.doc.type === "lettre" ? vueLettre(papier.doc) : null}
              {papier && papier.doc.type === "message" ? vueMot(papier.doc) : null}
            </>
          ) : null}
        </div>

        {/* Le pied change avec le service ouvert : ce sont les gestes de CETTE
            page, et rien d'autre. */}
        {service === "lire" ? (
          <div className="papier-pied">
            <button type="button" disabled={!aColler.trim() || photoOccupe}
              onClick={() => { const t = aColler; setAColler(""); setPapierOuvert(false); void lireTexteColle(t); }}>
              Lis-le-moi en wolof
            </button>
            <button type="button" className="pale" onClick={() => setAColler("")}>Effacer</button>
          </div>
        ) : null}

        {service === "photo" ? (
          <div className="papier-pied">
            <button type="button" disabled={photoOccupe} onClick={() => photoRef.current?.click()}>
              {photoOccupe ? "Elle lit…" : "Prendre la photo"}
            </button>
          </div>
        ) : null}

        {/* ── L'ACCORD, AVANT TOUT LE RESTE ──────────────────────────────────
            Tant qu'elle n'a pas eu de « oui », le papier n'est pas un papier :
            c'est une proposition qu'elle vient de lire à voix haute. On ne
            montre donc NI le PDF NI la copie — les gestes qui envoient le
            document dehors — mais seulement les deux réponses possibles.

            « Corrige » rouvre le micro : on dit ce qui cloche en wolof, et
            elle refait. C'est ce que Lamine demande — jusqu'à ce que la
            personne soit d'accord. */}
        {(service === "message" || service === "devis" || service === "facture" || service === "mail")
          && papier && aValider ? (
          <div className="papier-pied valider">
            <button type="button" className="oui" onClick={() => { taire(); setAValider(false); }}>
              Waaw, baax na
            </button>
            <button type="button" className="pale"
              onClick={() => { taire(); setAValider(false); setPapierOuvert(false); toggleMicrophone(); }}>
              Non, corrige
            </button>
          </div>
        ) : null}

        {(service === "message" || service === "devis" || service === "facture" || service === "mail")
          && papier && !aValider ? (
          <div className="papier-pied">
            {papier.doc.type === "devis" && papier.totaux ? (
              <p className="pied-total">
                <span>{papier.totaux.tva ? "Total TTC" : "Total"}</span>
                <b>{franc(papier.totaux.total)}</b>
              </p>
            ) : null}
            {papier.doc.type === "message" ? (
              <>
                {partageable ? (
                  <button type="button" onClick={() => void envoyerLeMot((papier.doc as Mot).texte)}>
                    Envoyer
                  </button>
                ) : null}
                <button type="button" className={partageable ? "pale" : undefined}
                  onClick={() => void copierLeMot((papier.doc as Mot).texte)}>
                  {copie ? "Copié" : "Copier"}
                </button>
              </>
            ) : (
              <>
                <button type="button" onClick={() => void fabriquerPdf()} disabled={papierOccupe}>
                  {papierOccupe ? "Un instant…" : "Faire le PDF"}
                </button>
                {pdf ? <a className="pdf-lien" href={pdf} target="_blank" rel="noreferrer">Ouvrir le PDF</a> : null}
              </>
            )}
            <button type="button" className="pale" disabled={papierOccupe}
              onClick={() => void fabriquerPapier(sorteDuPapier(papier.doc))}>Refaire</button>
          </div>
        ) : null}
      </section>

      {/* QUI PARLE À BIA. Chacun sa case sur l'appareil : son prénom, ses
          notes, ses papiers, sa conversation. */}
      <section className="papier-panneau qui-panneau" aria-hidden={!quiParle}>
        <button className="clavier-fermer" type="button"
          onClick={() => { setQuiParle(false); setARetirer(null); }} aria-label="Refermer">
          <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M18.3 7.1 16.9 5.7 12 10.6 7.1 5.7 5.7 7.1l4.9 4.9-4.9 4.9 1.4 1.4 4.9-4.9 4.9 4.9 1.4-1.4-4.9-4.9Z" /></svg>
        </button>

        <div className="papier-corps scrollbar-thin">
          <p className="papier-titre">Kan mooy wax ?</p>
          {aRetirer ? (
            <p className="papier-manque">
              Retirer quelqu&apos;un efface ses notes, ses papiers et sa conversation. C&apos;est définitif.
              <button type="button" onClick={() => setARetirer(null)}>Annuler</button>
            </p>
          ) : null}
          <p className="papier-note">
            Qui parle à BIA en ce moment. Chacun a ses notes, ses papiers et sa
            conversation — elle ne les mélange plus. Tout reste sur ce téléphone.
          </p>

          <div className="gens">
            {profils.map((x) => (
              <div className={x.id === profil ? "gens-ligne actif" : "gens-ligne"} key={x.id}>
                <button type="button" className="gens-nom" onClick={() => changerProfil(x.id)}>
                  <b>{x.nom || "Sans prénom"}</b>
                  <span>{x.id === profil ? "c'est toi" : "c'est moi"}</span>
                </button>
                {profils.length > 1 ? (
                  aRetirer === x.id ? (
                    <button type="button" className="oter sur"
                      aria-label={`Confirmer le retrait de ${x.nom || "cette personne"}`}
                      onClick={() => { retirerQuelquun(x.id); setARetirer(null); }}>Sûr ?</button>
                  ) : (
                    <button type="button" className="oter" aria-label={`Retirer ${x.nom || "cette personne"}`}
                      onClick={() => setARetirer(x.id)}>×</button>
                  )
                ) : null}
              </div>
            ))}
          </div>

          <label className="papier-champ">Quelqu&apos;un d&apos;autre
            <input value={nouveauNom} placeholder="Son prénom"
              onChange={(e) => setNouveauNom(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter") ajouterQuelquun(); }} />
          </label>
        </div>

        <div className="papier-pied">
          <button type="button" onClick={ajouterQuelquun}>Ajouter</button>
          <button type="button" className="pale" onClick={() => setQuiParle(false)}>Fermer</button>
        </div>
      </section>

      {/* LA FENÊTRE DE CORRECTION. Sa phrase est déjà dans le champ : on
          corrige le mot qui cloche au lieu de tout retaper en wolof. */}
      <section className="correction-panneau" aria-hidden={corrige === null}>
        <button className="clavier-fermer" type="button" onClick={fermerCorrection}
          aria-label="Refermer la correction">
          <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M18.3 7.1 16.9 5.7 12 10.6 7.1 5.7 5.7 7.1l4.9 4.9-4.9 4.9 1.4 1.4 4.9-4.9 4.9 4.9 1.4-1.4-4.9-4.9Z" /></svg>
        </button>

        <div className="papier-corps scrollbar-thin">
          {corrige !== null ? (
            <>
              <p className="papier-titre">Naka la war a wax ?</p>
              <p className="papier-note">
                Ce qu&apos;elle a dit est déjà écrit en dessous : change seulement ce qui cloche.
                Ta correction fait autorité sur son wolof, pour toutes les fois suivantes.
              </p>

              <div className="sa-phrase">
                <p>{history[corrige]?.text}</p>
                <button type="button" onClick={() => void copierSaPhrase()}>
                  {copieFaite ? "Copié" : "Copier"}
                </button>
              </div>

              <textarea className="paragraphe grand" rows={7} value={correction}
                aria-label="La bonne formulation"
                onChange={(e) => setCorrection(e.target.value)} />

              {propositions.length ? (
                <div className="propositions">
                  <p className="papier-note">Touche celle qui sonne juste — tu pourras encore la retoucher.</p>
                  {propositions.map((p, n) => (
                    <button key={n} type="button" onClick={() => { setCorrection(p); setPropositions([]); }}>
                      {p}
                    </button>
                  ))}
                </div>
              ) : null}

              {avis ? <p className="avis">{avis}</p> : null}
            </>
          ) : null}
        </div>

        <div className="papier-pied">
          <button type="button" disabled={!correction.trim()}
            onClick={() => corrige !== null && void envoyerCorrection(corrige)}>Garder</button>
          <button type="button" className="pale" disabled={reformule} onClick={() => void direAutrement()}>
            {reformule ? "Elle cherche…" : "Dis-le autrement"}
          </button>
          <button type="button" className="pale" onClick={fermerCorrection}>Annuler</button>
        </div>
      </section>

      {/* L'invitation à la poser sur l'écran d'accueil. Elle décide seule
          quand se montrer, et ne se montre pas si BIA y est déjà. */}
      {/* ── L'ÉCRAN ────────────────────────────────────────────────────────
          Il part de son menton — 52 % de la hauteur, mesuré sur une capture
          et non deviné — et descend jusqu'en bas. La barre du micro reste
          au-dessus de lui : on doit toujours pouvoir lui reparler. */}
      {ecran ? <Ecran titre={ecran.titre} pieces={ecran.pieces} credit={ecran.credit} onFermer={fermerEcran} /> : null}

      <Installer />

      {/* ── OÙ ON T'EMMÈNE — LA CONFIRMATION AVANT LE DÉPART ───────────────
          Jamais de guidage sans que la personne ait vu où elle va. C'est la
          leçon de WARI, cette agence que les cartes placent encore à Ouakam
          dix ans après sa fermeture : le danger n'est pas de ne pas trouver,
          c'est de trouver à côté sans le dire. */}
      {aConfirmer ? (
        <div className="carte-confirme">
          {aConfirmer.length ? (
            <>
              <p className="carte-confirme-titre">Je t&apos;emmène où&nbsp;?</p>
              {aConfirmer.map((lieu) => (
                <button key={`${lieu.lat},${lieu.lon}`} type="button" className="carte-choix"
                  onClick={() => {
                    setAConfirmer(null);
                    /* ── DEUX VOIX EN MÊME TEMPS ──────────────────────────

                       Lamine, le 14 septembre 2026 : « les deux voix se
                       chevauchent quand la carte est affichée. »

                       Ouvrir la carte ne coupait pas ce que BIA était en
                       train de dire. Avant, ça ne s'entendait presque jamais :
                       sa réponse était finie depuis longtemps quand on
                       appuyait. Depuis qu'elle parle pendant que le modèle
                       écrit, sa phrase peut encore courir — et le guidage
                       commence par-dessus.

                       Le guidage prime : il dit où tourner. On se tait. */
                    taire();
                    /* ── LA FENETRE DE 720 MILLISECONDES ──────────────────

                       Lamine, le 14 septembre 2026 : « au debut, la voix de
                       la carte et la voix de BIA parlent en meme temps. »

                       Le temoin « carte ouverte » ne se levait qu'a l'arrivee
                       de la carte — et `eclipser` prend 720 ms pour fondre
                       l'ecran au noir avant de l'ouvrir. Pendant ces sept
                       dixiemes de seconde, la garde etait encore baissee :
                       une fin de reponse qui arrivait la passait, puis le
                       guidage commencait par-dessus.

                       Le temoin se leve donc MAINTENANT, au doigt qui
                       choisit le lieu. La decision est prise a cet
                       instant-la ; l'animation n'est qu'un habillage. */
                    carteOuverteRef.current = true;
                    /* LE MICRO SE TAIT LE TEMPS QUE LA CARTE ARRIVE. Voir
                       microAvantLaCarte : il revient quand elle previent. */
                    microAvantLaCarte.current = conversationRef.current;
                    taire();
                    fermerConversation();
                    void eclipser(() => setCarte(lieu));
                  }}>
                  {lieu.dit}
                  {lieu.sur === false ? <em> — je ne suis pas sûre de celui-là</em> : null}
                </button>
              ))}
              <p className="carte-confirme-note">
                Si aucun n&apos;est le bon, dis-moi ce qu&apos;il y a autour —
                un marché, une station, une mosquée. Ici on se repère comme ça.
              </p>
            </>
          ) : lieuEnPanne ? (
            <p className="carte-confirme-titre">
              Je n&apos;arrive pas à chercher en ce moment — le réseau ne répond
              pas. Réessaie dans un instant&nbsp;?
            </p>
          ) : (
            <p className="carte-confirme-titre">
              Je ne trouve pas cet endroit. Dis-moi ce qu&apos;il y a autour&nbsp;?
            </p>
          )}
          <button type="button" className="carte-choix pale" onClick={() => setAConfirmer(null)}>
            Laisse tomber
          </button>
        </div>
      ) : null}
      {chercheLieu ? <p className="carte-confirme"><span className="carte-confirme-titre">Maa ngi seet bérab bi…</span></p> : null}

      {/* ── UNE VIDÉO DU TÉLÉPHONE ─────────────────────────────────────────
          Une application web ne fouille pas la galerie de quelqu'un, et c'est
          heureux : elle ouvre le sélecteur, la personne choisit, et le fichier
          est lu SUR PLACE. Rien ne monte sur un serveur, rien ne se paie, la
          vidéo ne quitte pas l'appareil. */}
      <input ref={fichierVideo} type="file" accept="video/*" hidden
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (!f) return;
          if (adresseLocale.current) URL.revokeObjectURL(adresseLocale.current);
          adresseLocale.current = URL.createObjectURL(f);
          const nom = f.name;
          void eclipser(() => setFilm({ sorte: "fichier", url: adresseLocale.current, titre: nom }));
          e.target.value = "";
        }} />

      {/* ── ELLE SE RETIRE, LA CARTE PREND TOUT ────────────────────────────
          Posée PAR-DESSUS la conversation, jamais à la place : le micro,
          l'historique et sa voix continuent de tourner dessous. C'est ce qui
          fait qu'on peut lui parler sans la voir. */}
      {carte ? (
        <Carte
          destination={carte}
          code={code}
          langue={langueRef.current}
          parle={mode === "speaking"}
          onDitTexte={(texte) => void speak(texte, "neutre", "guidage")}
          /* LA CARTE EST LA — le micro peut revenir. Elle previent aussi
             quand elle renonce : sans ca, une carte qui ne vient jamais
             laisserait le micro ferme pour toujours. */
          onPrete={() => {
            if (!microAvantLaCarte.current) return;
            microAvantLaCarte.current = false;
            conversationRef.current = true;
            setConversation(true);
            void ecouter();
          }}
          onFermer={() => revenir(() => setCarte(null))}
        />
      ) : null}

      {/* ── LA VIDÉO PREND TOUT, ELLE SE RETIRE ────────────────────────────
          Posée par-dessus la conversation, comme la carte. LE MICRO SE FERME
          PENDANT CE TEMPS — voir l'effet sur `film` plus haut : un micro
          ouvert devant une vidéo entend la vidéo, et finit par lui répondre.
          Il revient tout seul à la fermeture. */}
      {film ? (
        <Video
          film={film}
          parle={mode === "speaking"}
          onAuMenton={film.sorte === "youtube" ? () => {
            /* La même vidéo, mais sous son menton : elle redevient visible et
               peut commenter. C'est l'autre moitié de ce qu'il a décrit. */
            montrerSurEcran({
              titre: film.titre,
              pieces: [{ id: film.video, sorte: "video", titre: film.titre,
                         apercu: `https://i.ytimg.com/vi/${film.video}/hqdefault.jpg`,
                         video: film.video, source: film.source }],
            });
            setFilm(null);
          } : undefined}
          onFermer={() => revenir(() => {
            if (adresseLocale.current) { URL.revokeObjectURL(adresseLocale.current); adresseLocale.current = ""; }
            setFilm(null);
          })}
        />
      ) : null}

      {/* ── ON APPREND ───────────────────────────────────────────────────
          Il doit VOIR qu'elle est en train d'apprendre, sinon il parlera
          pendant dix minutes en croyant qu'elle retient, ou l'inverse. Un
          bandeau discret, et les trois phrases qui en sortent — parce qu'on
          n'apprend pas une commande par cœur en conduisant. */}
      {estMaitre && enApprentissage ? (
        <div className="apprend-bandeau">
          <b>Mode apprentissage</b> — dis ta phrase, elle répète le texte entendu sans le reformuler.
          {/* ── LE BOUTON BLEU ──────────────────────────────────────────
              Sa demande du 14 septembre au soir, et elle règle un problème
              qu'aucune correction de code ne pouvait régler : l'oreille se
              trompe une fois sur trois, et une validation qui traverse
              l'oreille peut ranger une phrase abîmée sous son nom. Un appui
              ne se transcrit pas.

              LA PHRASE EST ÉCRITE SUR LE BOUTON. Il doit voir CE QU'IL
              GARDE — pas un « mémoriser » générique qui l'obligerait à se
              fier à sa mémoire de ce qu'elle vient de dire. */}
          {aGarder ? (
            <button
              type="button"
              className="apprend-garder"
              disabled={motGarde === "en cours"}
              onClick={() => {
                const quoi = aGarder;
                const son = sonDeSaVoix.current;
                setMotGarde("en cours");
                void (async () => {
                  try {
                    const r = await fetch("/api/retenir", {
                      method: "POST",
                      headers: { "content-type": "application/json", "x-bia-code": codeRef.current },
                      body: JSON.stringify({
                        texte: quoi,
                        extrait: extraitRef.current,
                        francais: sens?.francais || "",
                      }),
                    });
                    const d = await r.json() as { retenu?: string; erreur?: string };
                    if (!r.ok || !d.retenu) { setMotGarde(d.erreur || "Ça n'a pas été gardé."); return; }
                    setMotGarde("gardée");
                    setGardee(quoi);
                    /* ── LE MODE RESTE OUVERT ──────────────────────────
                       Sa règle du 14 septembre — « une fois enregistré, on
                       referme et on continue la conversation » — est levée
                       par lui-même le 15 : « apparemment, je ne peux pas
                       enchaîner les phrases ». Il enseigne par séries, pas
                       par phrases isolées, et refermer à chaque fois
                       l'obligeait à redire « corrige corrige » entre chaque
                       mot. On ne referme plus : c'est « on a fini » qui
                       ferme, et rien d'autre. */
                    aRepeter.current = "";
                    setAGarder("");
                    setSens(null);
                    /* SA VOIX SUIT LE TEXTE, sans le faire attendre : le
                       texte est déjà rangé à cet instant, le son n'est
                       qu'un plus. S'il rate, la mémoire reste juste. */
                    if (son) {
                      try {
                        const f = new FormData();
                        f.append("texte", quoi);
                        f.append("audio", son.blob, son.nom);
                        await fetch("/api/memoire", {
                          method: "POST", headers: { "x-bia-code": codeRef.current }, body: f,
                        });
                      } catch { /* le texte est gardé ; le son manquera */ }
                    }
                  } catch {
                    setMotGarde("Le rangement n'a pas répondu.");
                  }
                })();
              }}
            >
              {motGarde === "en cours" ? "…" : "Garder"}
              <span>« {aGarder} »</span>
            </button>
          ) : null}
          {/* ── CE QUE ÇA VEUT DIRE, ET D'OÙ ÇA VIENT ────────────────────

              Lamine, le 15 septembre 2026 : « si elle comprend le sens, elle
              le dit en français, ce n'est pas la peine que je lui répète ça.
              Je dois tout simplement confirmer. »

              LA DISTINCTION NE PASSE PAS PAR SA BOUCHE À ELLE, elle passe
              par ici. Elle dit le français, point — il a demandé de la
              simplicité et il a raison. Mais une traduction du modèle et une
              paire qu'il a écrite lui-même ne méritent pas la même
              confiance : validée par inattention, une devinette devient une
              vérité permanente. Un mot sur l'écran suffit à faire la
              différence, et ne lui coûte pas une seconde. */}
          {aGarder && sens ? (
            <em className={sens.sur ? "apprend-sens sur" : "apprend-sens devine"}>
              {sens.sur ? "tu lui as appris" : "elle traduit"} : « {sens.francais} »
            </em>
          ) : null}
          {aGarder && !sens && !sensCherche ? (
            <em className="apprend-sens demande">elle ne connaît pas le sens — dis-le-lui</em>
          ) : null}
          {/* Le motif d'un refus reste DANS le bandeau : la leçon n'est pas
              finie, il est encore en train d'essayer. */}
          {motGarde && motGarde !== "en cours" && motGarde !== "gardée" ? (
            <em className="apprend-dit rate">{motGarde}</em>
          ) : null}
          <i>« Mémorise » pour garder · « Répète » pour réécouter · « On a fini d'apprendre » pour revenir au mode normal</i>
        </div>
      ) : null}

      {/* ── LA LEÇON EST PASSÉE, ON CONTINUE NORMALEMENT ──────────────────

          Lamine, le 14 septembre 2026 au soir : « j'appuie sur le bouton, ça
          doit être enregistré, et que l'apprentissage passe. On continue
          normalement. »

          La correction est PONCTUELLE, et c'est la bonne façon de voir les
          choses : il entend une faute, il dit « corrige corrige », il
          enseigne, il appuie, et la conversation reprend. Pas de mode dans
          lequel on reste par inadvertance.

          MAIS L'ANNULATION DOIT SURVIVRE À LA FERMETURE. Si elle vivait dans
          le bandeau, elle disparaîtrait à la seconde même où elle devient
          utile — juste après l'enregistrement, quand il lit la phrase et voit
          que l'oreille l'avait abîmée. Elle vit donc ici, dehors, et elle
          reste tant qu'il ne l'a pas écartée. */}
      {motGarde === "gardée" ? (
        <p className="apprend-garde-fait">
          C'est dans sa mémoire : <b>« {gardee} »</b>
          <button
            type="button"
            className="apprend-defaire"
            onClick={() => {
              const quoi = gardee;
              setMotGarde("en cours");
              void fetch(`/api/retenir?texte=${encodeURIComponent(quoi)}`, {
                method: "DELETE", headers: { "x-bia-code": codeRef.current },
              })
                .then(() => setMotGarde(""))
                .catch(() => setMotGarde("Je n'ai pas pu l'enlever."));
            }}
          >
            annuler
          </button>
          <button type="button" className="apprend-defaire"
            onClick={() => setMotGarde("")}>fermer</button>
        </p>
      ) : null}

      
      <p className="sr-only" aria-live="polite">{temoin || labels[mode]}</p>
    </main>
  );
}

/* ── ENREGISTRER LE RÉPERTOIRE, UNE SEULE FOIS ──────────────────────────────

   Ce petit bloc vit à part du reste : il ne sert qu'à Lamine, il ne s'affiche
   que pour son code maître, et le jour où les 42 phrases sont dans le seau il
   n'a plus rien à faire — il dira « tout y est déjà », et on pourra l'enlever
   avec la page d'écoute.

   TROIS CHOSES QU'IL FAIT ET QU'UN BOUTON ORDINAIRE NE FAIT PAS :

   1. il annonce le prix AVANT, et demande une deuxième fois ;
   2. il dit ce qui s'est passé, phrase par phrase, y compris les ratés — un
      dépôt refusé par Supabase ne doit pas se cacher derrière un « c'est
      fait » ;
   3. il se verrouille pendant le travail : quarante fabrications de voix
      prennent du temps, et deux appuis lanceraient deux fois la dépense. */
/* ── LE BOUTON QUI ENREGISTRE LE RÉPERTOIRE ─────────────────────────────────

   Lamine, le 11 septembre 2026 au soir : « j'ai appuyé plusieurs fois, j'ai
   attendu chaque fois quand ça se décroche, j'ai appuyé à nouveau, il faut
   vérifier si c'est parti. »

   Il a eu raison de le demander, et il n'aurait pas dû avoir à le demander.
   Ce bouton avait deux défauts, et tous les deux le forçaient à dépenser pour
   savoir où il en était :

   1. IL NE SAVAIT PAS REGARDER. La route sait répondre gratuitement — c'est
      ce que fait son GET : il compte ce qui manque et ce que ça coûterait,
      sans fabriquer un seul son. La page ne l'appelait jamais. Le seul moyen
      de connaître l'état du seau était donc de relancer l'enregistrement.

   2. IL ANNONÇAIT UN PRIX ÉCRIT EN DUR — « environ 1,63 $ ». Ce nombre ne
      bougeait pas. Qu'il reste cent trente-huit fichiers ou un seul ou aucun,
      le bouton réclamait 1,63 $. Un prix qui ne correspond à rien est pire
      qu'aucun prix : il apprend à ne pas lire ce qui est écrit.

   Maintenant : le premier appui REGARDE, et ne coûte rien. Il dit combien de
   sons doivent exister, combien sont en place, combien manquent, et le vrai
   prix des manquants. Le second appui — qui n'apparaît que s'il reste quelque
   chose à faire — dépense, et annonce ce qu'il va dépenser. */
type EtatRepertoire = {
  erreur?: string;
  attendus?: number;
  en_place?: number;
  manquants?: number;
  /* ── LES SONS QUI EXISTENT MAIS NE DISENT PLUS LE BON TEXTE ────────────

     Lamine, le 13 septembre 2026 : « j'ai appuyé sur le bouton, mais il me
     dit rien ne manque. »

     LE SERVEUR LES COMPTAIT, L'ÉCRAN NE LES REGARDAIT PAS. J'ai ajouté
     `a_refaire` à la réponse hier soir — les onze phrases qu'il a corrigées
     et les quatorze qui citent le site — et j'ai oublié de l'ajouter ICI.
     Le panneau ne lisait que `manquants` ; il n'en manquait aucun, donc il
     annonçait « rien ne manque » sur vingt-cinq sons périmés.

     C'est la même faute que trois fois cette nuit : brancher le serveur et
     laisser l'écran derrière. Un chiffre que personne n'affiche n'existe
     pas. */
  a_refaire?: number;
  detail_a_refaire?: Array<{ cle: string; langue: string; signes: number }>;
  incertains?: number;
  signes?: number;
  cout_dollars?: number;
  pret?: string;
  /* Combien de sons sont encore lourds. Aucun rapport avec l'argent : ils
     sont déjà payés, il s'agit de les recompresser. */
  a_alleger?: number;
  deja_legers?: number;
};

/* Quand Supabase refuse de dire si un son existe, on ne le fabrique pas et on
   ne le cache pas non plus. Un appui de plus tranchera, et il sera gratuit. */
const direIncertains = (n?: number) =>
  n ? ` ${n} n'ont pas pu être vérifiés — ils ne seront pas refaits dans le doute. Regarde encore, c'est gratuit.` : "";

function PapierRepertoire({ code }: { code: string | null }) {
  const [regarde, setRegarde] = useState<EtatRepertoire | null>(null);
  const [occupe, setOccupe] = useState<"" | "regarde" | "enregistre">("");
  const [bilan, setBilan] = useState<string>("");
  /* ── CE QUI MANQUE VRAIMENT, D'APRÈS SES PROPRES CONVERSATIONS ─────────

     Lamine, le 17 septembre 2026, après avoir vu Abena AI tourner hors
     ligne : « qu'est-ce qu'on peut copier chez eux ? »

     Leur vitesse — et il l'a déjà payée. Une phrase du répertoire sort du
     téléphone en un dixième de seconde, sans modèle et sans réseau. Il en a
     42, et UN SEUL tour sur soixante en vient.

     Le bouton d'à côté dit ce qui manque dans le SEAU : les phrases écrites
     mais pas encore enregistrées. Celui-ci dit tout autre chose, et c'est la
     vraie question : quelles phrases n'existent nulle part alors qu'on les
     lui demande tous les jours. Le serveur les note depuis le 17 — voir
     lib/rates-du-repertoire.ts.

     C'EST ICI ET PAS SUR UNE PAGE À PART. Sa règle du 11 septembre : tout ce
     qui sert à la personne va dans l'interface. Et c'est ici que son code est
     déjà en main — sans lui, le serveur ne rend que des nombres, jamais son
     wolof. */
  const [aEcrire, setAEcrire] = useState<Array<{ dit: string; vus: number }> | null>(null);
  const [motRates, setMotRates] = useState("");
  /* ── ET CE QU'ELLE A FAIT DE SES ORDRES ────────────────────────────────
     Lamine, le 17 septembre 2026 : « quand je lui demande de faire quelque
     chose, elle doit le faire. » Ses phrases d'un côté, ses gestes de
     l'autre : c'est la seule façon de voir laquelle des quatre marches est
     tombée. Voir lib/ordres-vus.ts. */
  const [registre, setRegistre] = useState<Array<{ dit: string; gestes: string[] }> | null>(null);

  /* GRATUIT. Une lecture du seau, aucun son fabriqué, aucun centime. */
  async function regarder() {
    if (!code) { setBilan("Il faut ton code."); return; }
    setOccupe("regarde");
    setBilan("Elle compte ce qui manque. C'est gratuit — rien n'est fabriqué.");
    try {
      const r = await fetch("/api/repertoire", { headers: { "x-bia-code": code } });
      const d = await r.json() as EtatRepertoire;
      if (d.erreur) { setBilan(d.erreur); setRegarde(null); return; }
      setRegarde(d);
      /* ── DEUX CHIFFRES, ET ILS NE VEULENT PAS DIRE LA MÊME CHOSE ──────
         Un MANQUANT comble un silence : la phrase n'existe pas du tout.
         Un À REFAIRE corrige une phrase qui se dit encore avec les anciens
         mots. Les confondre, c'est afficher « rien ne manque » sur
         vingt-cinq sons périmés — ce qu'il a vu. */
      const aRefaire = d.a_refaire || 0;
      const aPayer = (d.manquants || 0) + aRefaire;
      setBilan(
        (aPayer === 0
          ? `Rien ne manque : les ${d.en_place} sons sont en place, et ils ne se paieront plus jamais.`
          : [
            d.manquants ? `Il manque ${d.manquants} son(s)` : "",
            aRefaire ? `${d.manquants ? " et " : "Il y a "}${aRefaire} à REFAIRE — leur texte a changé depuis l'enregistrement` : "",
            ` — ${d.signes} signes, ${d.cout_dollars} $.`,
            ` ${d.en_place} sont déjà justes et ne seront pas repayés.`,
          ].join(""))
        + direIncertains(d.incertains)
        /* ── ET CE QUI RESTE LOURD ────────────────────────────────────────
           On le dit à part, et on dit tout de suite que c'est gratuit : sans
           ça, un chiffre de plus à côté d'un prix ressemble à une dépense. */
        + (d.a_alleger
          ? ` ${d.a_alleger} sont encore en WAV — six fois trop lourds à télécharger.`
            + " Les alléger ne coûte RIEN : aucune voix n'est repayée."
          : d.deja_legers ? ` Les ${d.deja_legers} sont déjà allégés.` : "")
      );
    } catch (e) {
      setBilan(`Le comptage n'a pas abouti : ${(e as Error).message}`);
      setRegarde(null);
    } finally {
      setOccupe("");
    }
  }

  /* CELUI-LÀ COÛTE. Il ne refait jamais ce qui existe. */
  async function enregistrer() {
    if (!code) { setBilan("Il faut ton code."); return; }
    setOccupe("enregistre");
    setBilan(seulementAlleger
      ? "Elle recompresse les sons déjà payés. Une minute ou deux — ne ferme pas. Aucune voix n'est rachetée."
      : "Elle enregistre les phrases une à une. Ça prend une minute ou deux — ne ferme pas.");
    try {
      const r = await fetch("/api/repertoire", { method: "POST", headers: { "x-bia-code": code } });
      const d = await r.json() as {
        erreur?: string; enregistres?: number; deja_la?: number;
        incertains?: number; cout_dollars?: number; desormais_gratuit?: number;
        rates?: Array<{ cle: string; langue: string; motif: string }>;
        allegement?: {
          convertis?: number; restent?: number; deja_legers?: number;
          avant_ko?: number; apres_ko?: number; fois_plus_petit?: number | null;
          rates?: Array<{ ou: string; motif: string }>; erreur?: string;
        };
      };
      if (d.erreur) { setBilan(d.erreur); return; }
      const rates = d.rates || [];
      /* ── CE QUI VIENT DE MAIGRIR ──────────────────────────────────────────
         On dit les kilo-octets, pas des pourcentages : « 3 200 ko devenus
         540 » se comprend d'un coup d'œil, « −83 % » demande un calcul. Et on
         répète que c'est gratuit, parce que c'est la seule chose qu'on ne
         croit pas la première fois. */
      const a = d.allegement;
      const motAllegement = !a ? ""
        : a.erreur ? ` ⚠ ${a.erreur}`
        : a.convertis
          ? ` ${a.convertis} son(s) allégés — ${a.avant_ko} ko devenus ${a.apres_ko} ko,`
            + ` ${a.fois_plus_petit}× plus légers, et zéro dollar.`
            + (a.restent ? ` Il en reste ${a.restent} : appuie encore.` : " Il n'en reste aucun.")
            + (a.rates?.length ? ` ⚠ ${a.rates.length} n'ont pas pu être allégés.` : "")
          : a.deja_legers ? ` Les ${a.deja_legers} sons étaient déjà légers.` : "";
      setBilan(
        (d.enregistres
          ? `${d.enregistres} phrase(s) enregistrée(s) pour ${d.cout_dollars} $.`
          : "Aucune phrase à enregistrer.")
        + (d.deja_la ? ` ${d.deja_la} y étaient déjà — non repayées.` : "")
        + ` ${d.desormais_gratuit} phrases ne coûteront plus jamais rien.`
        + motAllegement
        + direIncertains(d.incertains)
        /* Ce qui a raté reste à refaire : on repart de l'état réel du seau, pas
           d'un souvenir. Un seul appui de plus suffira. */
        + (rates.length
          ? ` ⚠ ${rates.length} ratée(s) : ${rates.slice(0, 3).map((x) => `${x.cle} (${x.motif})`).join(", ")}.`
            + " Appuie encore : il ne refera que celles-là."
          : "")
      );
      setRegarde(null);
    } catch (e) {
      setBilan(`Ça n'a pas abouti : ${(e as Error).message}`);
    } finally {
      setOccupe("");
    }
  }

  /* ── LE BOUTON QUI NE POUVAIT PLUS RIEN LANCER ──────────────────────────

     Le 12 septembre 2026, la copie d'écran de Lamine : « Rien ne manque : les
     326 sons sont en place. » Et aucun second bouton.

     C'EST MON DÉFAUT, ET IL ÉTAIT COMPLET. J'avais mis la conversion en MP3
     dans le POST — celui qui enregistre — alors que le POST n'apparaît que
     s'il MANQUE quelque chose. Tout étant enregistré, le geste qui allège
     n'était plus atteignable. J'avais écrit une réparation que personne ne
     pouvait déclencher.

     On regarde donc les deux : ce qui manque, ET ce qui est encore lourd.

     ── ET DEPUIS LE 13 SEPTEMBRE, UN TROISIÈME CAS ────────────────────────

     Les sons À REFAIRE. Même piège, exactement : ils existent tous, donc
     « manquants » vaut zéro, donc le bouton ne paraissait pas — et ses vingt-
     cinq corrections seraient restées inaudibles derrière un écran qui dit
     que tout va bien. Deuxième fois que ce bouton se cache tout seul. */
  const resteAFaire = regarde !== null
    && ((regarde.manquants || 0) > 0 || (regarde.a_refaire || 0) > 0
      || (regarde.a_alleger || 0) > 0);

  /* Et le bouton doit dire la vérité sur le prix. Alléger ne coûte rien :
     annoncer « 0 $ » ferait douter, alors on l'écrit en mots. */
  const seulementAlleger = regarde !== null
    && (regarde.manquants || 0) === 0 && (regarde.a_refaire || 0) === 0
    && (regarde.a_alleger || 0) > 0;

  /* GRATUIT aussi : une lecture de compteurs, aucun son, aucun modèle. */
  async function cequiManque() {
    if (!code) { setMotRates("Il faut ton code."); return; }
    setMotRates("Elle regarde…");
    try {
      const r = await fetch(`/api/etat?t=${Date.now()}`, {
        cache: "no-store", headers: { "x-bia-code": code },
      });
      const d = await r.json() as {
        ordres?: { tours?: number; avec_un_geste?: number;
          registre?: Array<{ dit: string; gestes: string[] }> } | null;
        repertoire_rate?: {
          questions_examinees?: number; formes_distinctes?: number; formes_repetees?: number;
          a_enregistrer?: Array<{ dit: string; vus: number }>;
        } | null;
      };
      /* Le registre voyage dans la même lecture : une requête, deux
         réponses à ses deux questions du jour. */
      setRegistre((d as { ordres?: { registre?: Array<{ dit: string; gestes: string[] }> } | null })
        .ordres?.registre || null);
      const v = d.repertoire_rate;
      if (!v || !v.questions_examinees) {
        setAEcrire(null);
        setMotRates("Rien encore. Parle-lui une demi-heure et reviens : c'est ta conversation qui remplit cette liste, pas moi.");
        return;
      }
      setAEcrire(v.a_enregistrer || []);
      /* Le chiffre qui dit par où commencer : une formule redemandée se
         rentabilise au deuxième usage. Une vue une seule fois, non. */
      setMotRates(
        `${v.questions_examinees} question(s) sont passées à côté du répertoire,`
        + ` pour ${v.formes_distinctes} formulation(s) différentes.`
        + (v.formes_repetees
          ? ` ${v.formes_repetees} reviennent plusieurs fois — ce sont celles-là qu'il faut écrire d'abord.`
          : " Aucune ne revient encore : attends d'en avoir plus avant d'enregistrer quoi que ce soit.")
        + " Ce compteur repart à zéro à chaque réveil du serveur.",
      );
    } catch (e) {
      setMotRates(`La lecture n'a pas abouti : ${(e as Error).message}`);
    }
  }

  return (
    <p className="papier-note" style={{ marginTop: 14 }}>
      <button type="button" className="papier-lien" onClick={() => void cequiManque()}>
        Ce qu&apos;on te demande et qu&apos;elle n&apos;a pas →
      </button>
      {motRates ? <><br /><span>{motRates}</span></> : null}
      {registre?.length ? (
        <>
          <br />
          <span style={{ display: "block", marginTop: 10 }}><b>Ce que tu lui as dit, et ce qu&apos;elle a fait</b></span>
          <span style={{ display: "block" }}>
            {registre.slice(-12).reverse().map((t, i) => (
              <span key={`${t.dit}-${i}`} style={{ display: "block", marginTop: 6 }}>
                « {t.dit} »<br />
                {t.gestes.length
                  ? <span>→ {t.gestes.join(" · ")}</span>
                  /* Le cas qui l'intéresse : il a parlé, rien n'a bougé. */
                  : <span>→ <b>elle n&apos;a rien fait</b></span>}
              </span>
            ))}
          </span>
        </>
      ) : null}
      {aEcrire?.length ? (
        <>
          <br />
          <span style={{ display: "block", marginTop: 8 }}>
            {aEcrire.map((x, i) => (
              <span key={`${x.dit}-${i}`} style={{ display: "block" }}>
                {x.vus > 1 ? <b>{x.vus}×</b> : <span>1×</span>}{" "}
                {x.dit}
              </span>
            ))}
          </span>
          <span style={{ display: "block", marginTop: 8 }}>
            Écris la réponse wolof de celles qui reviennent, donne-les-moi, et
            elles ne coûteront plus jamais rien.
          </span>
        </>
      ) : null}
      <br />
      {!resteAFaire ? (
        <button type="button" className="papier-lien" disabled={occupe !== ""}
          onClick={() => void regarder()}>
          {occupe === "regarde" ? "Elle compte…" : "Regarder ce qui manque →"}
        </button>
      ) : (
        <>
          <button type="button" className="papier-lien" disabled={occupe !== ""}
            onClick={() => void enregistrer()}>
            {occupe === "enregistre"
              ? (seulementAlleger ? "Elle allège…" : "Elle enregistre…")
              : seulementAlleger
                ? `Alléger ${regarde?.a_alleger} sons — gratuit`
                : `Oui, enregistre — ${regarde?.cout_dollars} $`}
          </button>
          {occupe === "" ? (
            <button type="button" className="papier-lien" style={{ marginLeft: 8 }}
              onClick={() => { setRegarde(null); setBilan(""); }}>
              Pas maintenant
            </button>
          ) : null}
        </>
      )}
      <br />
      {bilan || "Regarder est gratuit : elle lit le seau et dit ce qui manque, sans rien fabriquer. Tu ne dépenses qu'au second appui, et seulement ce qui manque — une phrase déjà enregistrée n'est jamais repayée."}
    </p>
  );
}


