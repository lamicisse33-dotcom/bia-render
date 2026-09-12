"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import dynamic from "next/dynamic";
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
import { NOMBRES } from "@/lib/nombres-textes";
import { compterVerdicts, lireVerdicts, poserVerdict } from "@/lib/verdicts";
import { franc, lecture, sorteEvoquee, totauxDe } from "@/lib/documents";
import type { Devis, Document as Papier, Lettre, Mot, Partie, Sorte, Totaux } from "@/lib/documents";
import { lireMesures, noterMesure } from "@/lib/chrono";
import type { Mesure, Voie } from "@/lib/chrono";
import { fichierDe, souffleDe } from "@/lib/sons";
import { lireLeRire } from "@/lib/rires";
import { frapper, arreterFrappe, sonnerFini } from "@/lib/frappe";
import {
  INTERVENTION_MAXIMALE, REGLAGES_DU_MICRO,
  SILENCE_QUI_CLÔT_LA_CONVERSATION, TENIR_POUR_COUPER, TOUR_DE_VEILLE,
  TOURS_MUETS_AVANT_DE_DOUTER, couvreSaVoix, silenceQuiSuffit, suivreLeBruit, vautLaPeine,
} from "@/lib/micro";
import { CLE_VITESSE, VITESSE_POSEE, ralentir, vitesseChoisie } from "@/lib/ralentir";
import Installer from "./installer";
import Ecran from "./ecran";
import type { PieceEcran } from "./ecran";
import CarteVitrine, { chargerSujet } from "./vitrine";
import CarteTrouve, { versEcran } from "./trouve";
import type { Resultat } from "./trouve";

/* Un message peut porter le RENVOI vers un papier — son identifiant, pas son
   contenu. Le papier lui-même vit dans sa propre boîte, qui ne se rogne
   jamais ; le fil ne garde que la trace de l'endroit où il a été écrit. */
type Message = {
  role: "bia" | "user";
  text: string;
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
type Service = "" | "message" | "devis" | "lettre" | "photo" | "video" | "lire" | "fiche";

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
type Face = keyof typeof CASES;

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

const welcome = "Salaam! Man maa di BIA. Waxal ak man ci wolof walla ci français.";

const pause = (ms: number) => new Promise((fini) => setTimeout(fini, ms));

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

function octetsDeBase64(b64: string) {
  const brut = atob(b64);
  const tableau = new Uint8Array(brut.length);
  for (let i = 0; i < brut.length; i++) tableau[i] = brut.charCodeAt(i);
  return tableau.buffer;
}

/* ── Quelle langue ? ───────────────────────────────────────────────────────
   Le navigateur n'a pas de voix wolof. Sans ce test, la retouche phonétique
   ci-dessous s'appliquait AUSSI au français : « communication » devenait
   « tchommounitchation ». On ne la déclenche donc que sur du wolof.        */
const motsFrancais = /\b(le|la|les|un|une|des|du|de|et|est|sont|pour|dans|avec|vous|nous|je|tu|il|elle|que|qui|ne|pas|sur|ce|cette|mais|plus|tout|faire|peut|comme|son|sa|ses|au|aux|par|en|si|bien|très|donc|alors|quand)\b/g;
const motsWolof = /\b(naa|nga|ngeen|ci|ak|bi|bu|la|lu|mooy|moo|dafa|dafay|ngir|waaw|déedéet|sama|yow|man|ñu|ñi|yi|te|walla|léegi|mën|bëgg|am|amul|lan|ban|def|dem|wax|jàng|jëf|nekk|jamm|noo|kañ|fu|nu)\b/g;

function estWolof(texte: string) {
  const t = texte.toLowerCase();
  if (/[ñŋë]/.test(t)) return true;
  const fr = (t.match(motsFrancais) || []).length;
  const wo = (t.match(motsWolof) || []).length;
  return wo >= fr;
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
  const [code, setCode] = useState<string | null>(null);
  const [codeSaisi, setCodeSaisi] = useState("");
  const [codeErreur, setCodeErreur] = useState("");
  const [moteurs, setMoteurs] = useState<{ voix: string; ecoute: string } | null>(null);
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
  useEffect(() => { setDebit(vitesseChoisie()); }, []);
  useEffect(() => {
    // Écrit à chaque mouvement : elle le lira au mot suivant, sans rien relancer.
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
  const [appel, setAppel] = useState<{ numero: string; nom: string } | null>(null);

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
  const [aConfirmer, setAConfirmer] = useState<Lieu[] | null>(null);
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
    try {
      const r = await fetch(`/api/lieu?quoi=${encodeURIComponent(quoi)}`,
        { headers: { "x-bia-code": codeRef.current } });
      const d = await r.json() as { candidats?: Lieu[]; panne?: boolean };
      const trouves = (d.candidats || []).slice(0, 3);
      /* Rien trouvé n'est pas la même chose que le réseau qui n'a pas
         répondu : les deux phrases n'appellent pas la même réaction. */
      if (!trouves.length) setAConfirmer([]);
      else setAConfirmer(trouves);
    } catch {
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
  /* Les verdicts du code maître : le compte s'affiche sur les boutons, et le
     mot d'accusé de réception s'efface tout seul. */
  const [compteVerdicts, setCompteVerdicts] = useState({ bien: 0, mal: 0, corriges: 0 });
  const [motVerdict, setMotVerdict] = useState("");
  const motVerdictMinuterie = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [aColler, setAColler] = useState("");
  /** Le téléphone sait-il partager ? Sur mobile, oui — et c'est ce qui ouvre WhatsApp. */
  const [partageable, setPartageable] = useState(false);
  const [copie, setCopie] = useState(false);

  const recognitionRef = useRef<Recognition | null>(null);
  const mouthTimer = useRef<ReturnType<typeof setInterval> | null>(null);
  const resetTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const busyRef = useRef(false);
  const historyRef = useRef<Message[]>([]);
  const filRef = useRef<HTMLDivElement | null>(null);
  const champRef = useRef<HTMLInputElement | null>(null);
  const photoRef = useRef<HTMLInputElement | null>(null);
  const codeRef = useRef<string>("");
  const contexteRef = useRef<AudioContext | null>(null);
  const sourceRef = useRef<AudioBufferSourceNode | null>(null);
  /** Les morceaux d'une même réponse, programmés bout à bout. */
  const sourcesRef = useRef<Set<AudioBufferSourceNode>>(new Set());
  const animationRef = useRef<number | null>(null);
  const enregistreurRef = useRef<MediaRecorder | null>(null);
  /* De quoi débrancher l'analyseur du micro sans toucher au contexte de la
     page — qui porte toute sa voix et ne doit jamais être fermé ici. */
  const debrancherMicroRef = useRef<(() => void) | null>(null);

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
  /* Vrai tant que la conversation vocale est ouverte. C'est un ref ET un état :
     l'état pour l'affichage, le ref pour onstop et les veilles, qui ont été
     posés avant et ne verraient jamais un état changé depuis. */
  const conversationRef = useRef(false);
  /* L'énergie de SA voix à cet instant, entre 0 et 1 — celle qui fait bouger
     sa bouche. On s'en sert pour savoir s'il faut la couper : il faut la
     COUVRIR, pas seulement faire du bruit pendant qu'elle parle. */
  const sonDelleRef = useRef(0);
  /* Le seuil de parole calculé pour la pièce où l'on se trouve. Partagé avec
     le guetteur qui écoute pendant qu'elle parle : les deux doivent juger la
     même pièce, sinon l'un entend ce que l'autre ignore. */
  const seuilRef = useRef(0);
  /* `taire` est défini plus bas ; les veilles, elles, sont posées avant. Ce
     renvoi évite de réordonner tout le fichier pour une seule flèche — même
     procédé que `ecouterRef`. */
  const taireRef = useRef<(() => void) | null>(null);
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
  const ouvrirUnTour = useCallback(() => ++numeroDuTourRef.current, []);
  const estLeTour = useCallback((n: number) => numeroDuTourRef.current === n, []);
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
  const departAttenteRef = useRef(0);
  const tTranscritRef = useRef(0);
  const tModeleRef = useRef(0);
  const voieRef = useRef<Voie>("ecrit");
  const attenteCache = useRef<Map<string, ArrayBuffer[]>>(new Map());
  const toursRef = useRef(0);
  const cacheSons = useRef<Map<string, ArrayBuffer>>(new Map());
  const dernierSon = useRef<string | null>(null);
  const transcritRef = useRef(false);
  /* Le motif de la dernière panne d'écoute, s'il y en a eu une. Il change ce
     que BIA DIT : « je n'ai pas entendu » n'est pas « mon oreille est en
     panne », et confondre les deux fait crier devant un micro muet. */
  const noteEcouteRef = useRef("");
  const dernierDitRef = useRef("");

  const emetteurRef = useRef<Emetteur>(EMETTEUR_VIDE);
  const profilRef = useRef("");

  historyRef.current = history;
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
      .then((e) => { setMoteurs(e); moteursRef.current = e; })
      .catch(() => {});
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
    if (suite) {
      let t = 0;
      for (const [f, d] of suite) { setTimeout(() => setFace(f), t); t += d; }
      resetTimer.current = setTimeout(() => setFace("yeux_ouverts"), t + 1800);
    } else {
      setFace(EMOTION_VERS_FACE[emo] || "yeux_ouverts");
      resetTimer.current = setTimeout(() => setFace("yeux_ouverts"), 4200);
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

  const couperSon = useCallback(() => {
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
  const jouerEtAnimer = useCallback((octets: ArrayBuffer) => new Promise<number>((fini) => {
    const ctx = contexte();
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
      const mémoire = ralentir(ctx, sansSilence(ctx, brut), vitesseChoisie());
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
      // Le filet : la durée du morceau, plus une seconde de marge.
      secours = setTimeout(() => rendre(duree), duree + 1000);
      animationRef.current = requestAnimationFrame(suivre);
    }).catch(() => rendre(0));
  }), [contexte]);

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
  const voixDuTelephoneRef = useRef(false);
  const parlerAvecLeTelephone = useCallback((answer: string) => new Promise<void>((fini) => {
    // Pas de voix du tout sur cet appareil : on rend la main tout de suite,
    // sinon BIA resterait « en train de répondre » pour toujours — et le
    // micro, qui se ferme pendant qu'elle parle, ne se rouvrirait jamais.
    if (!("speechSynthesis" in window)) { stopMouth(answer); fini(); return; }
    window.speechSynthesis.cancel();
    const voices = window.speechSynthesis.getVoices();
    const wolof = voices.find((v) => v.lang.toLowerCase().startsWith("wo"));
    const french =
      voices.find((v) => /^fr[-_](sn|fr)/i.test(v.lang)) ||
      voices.find((v) => v.lang.toLowerCase().startsWith("fr"));

    const enWolof = estWolof(answer);
    const utterance = new SpeechSynthesisUtterance(wolof || !enWolof ? answer : phoneticWolof(answer));
    if (wolof && enWolof) { utterance.voice = wolof; utterance.lang = wolof.lang; }
    else if (french) { utterance.voice = french; utterance.lang = french.lang; }
    else utterance.lang = "fr-FR";
    utterance.rate = enWolof ? 1.02 : 1.06;

    /* Le drapeau dit « une voix de secours est en train de parler ». Le filet
       court des deux secondes et demie le lit : entre l'appel et `onstart`,
       l'état est encore « réfléchit », et sans ce drapeau le filet rouvrirait
       le micro juste avant que la voix ne commence. */
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
    /* Quatorze signes par seconde, le double, et trois secondes de marge :
       un garde-fou doit être large, il ne sert qu'à ne jamais rester coincé. */
    const gardeFou = setTimeout(rendre, Math.min(45000, 3000 + (answer.length / 14) * 2000));

    utterance.onstart = () => bouche(true);
    utterance.onend = rendre;
    utterance.onerror = rendre;
    window.speechSynthesis.speak(utterance);
  }), [bouche, stopMouth]);

  /* ── Les sons qui ne s'écrivent pas ───────────────────────────────────

     Un rire synthétisé n'est pas un rire. Ceux-ci sont de vrais
     enregistrements : on les joue tels quels, et le visage suit la suite
     d'images prévue pour ce son plutôt que l'ouverture de la bouche. */
  /* Comme jouerEtAnimer : il rend TOUJOURS la main. Le rire s'attendait
     lui-même par `onended` ; si le son ne sort pas — un iPhone qui vient
     d'enregistrer et n'a pas rendu le haut-parleur, une interruption —
     `onended` ne vient jamais et tout ce qui suit reste bloqué. La réponse
     entière restait alors coincée derrière un rire qu'on n'entendait pas. */
  const jouerSonAvecVisages = useCallback((octets: ArrayBuffer, visages: Array<[string, number]>) =>
    new Promise<void>((fini) => {
      const ctx = contexte();
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
    }), [contexte]);

  /* Le rire part AVANT la parole, pendant que la voix se synthétise : on
     couvre ainsi l'attente du premier morceau, et l'émotion arrive d'un
     coup au lieu d'être annoncée puis jouée. Si le fichier n'est pas encore
     déposé, on ne fait rien — le visage rit en silence, comme avant. */
  const jouerSouffle = useCallback(async (emotion: string, sansPrelude = false) => {
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
    const garde = attenteCache.current.get(texte);
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
    if (!p.wo.includes("{nom}")) {
      const base = (moteursRef.current as { repertoire?: { base_sons?: Record<string, string> } } | null)
        ?.repertoire?.base_sons?.[langue] || "";
      for (const adresse of fichiersPossibles(p, langue, base)) {
        try {
          const f = await fetch(adresse, { cache: "force-cache" });
          if (!f.ok) continue;
          const octets = await f.arrayBuffer();
          if (octets.byteLength > 512) {
            const morceaux = [octets];
            attenteCache.current.set(texte, morceaux);
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
    const demander = async (partie: number) => {
      const r = await fetch("/api/voix", {
        method: "POST",
        headers: { "content-type": "application/json", "x-bia-code": codeRef.current },
        body: JSON.stringify({ texte, partie, ou: "attente" }),
      });
      if (!r.ok) throw new Error("voix indisponible");
      return await r.json() as { parties: number; audio: string | null };
    };

    const premier = await demander(0);
    if (!premier.audio) throw new Error("voix muette");
    const morceaux = [octetsDeBase64(premier.audio)];
    for (let i = 1; i < (premier.parties || 1); i++) {
      const suite = await demander(i);
      if (!suite.audio) break;
      morceaux.push(octetsDeBase64(suite.audio));
    }
    attenteCache.current.set(texte, morceaux);
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
        const mémoire = ralentir(ctx, sansSilence(ctx, brut), vitesseChoisie());
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
    const connu = nomRef.current.trim();
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
    if (parlait) {
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
    /* SANS CHAPEAU : la réponse est déjà là, il n'y a pas d'attente à fermer.
       C'est ce qui bloquait BIA — voir finirAttente. */
    await finirAttente(langueRef.current, false);
    window.speechSynthesis?.cancel();
    couperSon();
    if (emotion) await jouerSouffle(emotion);
    setMode("speaking");
    await jouerEtAnimer(await octetsDuRepertoire(adresse));
    setMode("ready");
    setFace("yeux_ouverts");
  }, [finirAttente, couperSon, jouerSouffle, jouerEtAnimer, octetsDuRepertoire]);

  const speak = useCallback(async (answer: string, emotion?: string, ou = "réponse") => {
    /* PRENDRE LA PAROLE N'EST PAS COUPER LA PAROLE.

       Ce bloc était en tête de la fonction : le son mourait à l'instant où le
       texte de la réponse revenait, puis on attendait la synthèse en silence.
       Il est descendu là où il a un sens — juste avant de dire le premier
       mot, une fois le son fabriqué. */
    const prendreLaParole = async () => {
      await finirAttente(langueRef.current);
      window.speechSynthesis?.cancel();
      couperSon();
    };

    if (!answer.trim()) { await prendreLaParole(); return; }

    if (moteursRef.current && moteursRef.current.voix === "navigateur") {
      await prendreLaParole();
      if (emotion) await jouerSouffle(emotion);
      await parlerAvecLeTelephone(answer);
      return;
    }

    /* ── UNE SEULE LANGUE POUR TOUTE LA RÉPONSE ───────────────────────────

       Le téléphone n'envoyait PAS la langue, alors le serveur la devinait —
       et il la devinait MORCEAU PAR MORCEAU. Une réponse coupée en trois
       pouvait donc être lue par le modèle wolof, puis par le modèle
       français, puis par le wolof : la voix changeait de langue au milieu
       d'une phrase, sur un texte pourtant juste à l'écran.

       On décide ici, une fois, sur la réponse ENTIÈRE — un fragment de
       quatre mots ne se juge pas, une réponse complète oui. */
    const langueDite = estWolof(answer) ? "wo" : "fr";

    const demander = async (partie: number) => {
      /* ── ET ON REDEMANDE UNE FOIS AVANT D'ABANDONNER ──────────────────

         Un paquet perdu suffisait à faire basculer toute la réponse sur la
         voix du téléphone. À Dakar, sur un réseau mobile, ça arrive. Une
         seconde tentative coûte un quart de seconde ; le repli, lui, coûte
         la voix de Kha. Sauf sur un code refusé : insister n'y changerait
         rien. */
      let dernier = "";
      for (let essai = 0; essai < 2; essai++) {
        try {
          const r = await fetch("/api/voix", {
            method: "POST",
            headers: { "content-type": "application/json", "x-bia-code": codeRef.current },
            body: JSON.stringify({ texte: answer, partie, ou, langue: langueDite }),
          });
          if (r.ok) return await r.json() as { parties: number; audio: string | null; type_mime?: string };
          dernier = String(r.status);
          if (r.status === 401 || r.status === 403) break;
        } catch (e) { dernier = String(e).slice(0, 60); }
        if (essai === 0) await new Promise((f) => setTimeout(f, 250));
      }
      throw new Error(`voix indisponible (${dernier})`);
    };

    const enOctets = (b64: string) => {
      const brut = atob(b64);
      const tableau = new Uint8Array(brut.length);
      for (let i = 0; i < brut.length; i++) tableau[i] = brut.charCodeAt(i);
      return tableau.buffer;
    };

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
      const second = demander(1);
      let bloc = await premier;
      noterAttente();          // le son est là : l'attente est finie, on la note
      await prendreLaParole();
      if (!bloc.audio) { await parlerAvecLeTelephone(answer); return; }
      // Le rire vient maintenant : entre la dernière phrase d'attente et le
      // premier mot de la réponse, il fait la liaison.
      if (emotion) await jouerSouffle(emotion);

      const jeton = {};
      tourRef.current = jeton;

      /* ── POURQUOI ELLE SE PLANTAIT ────────────────────────────────────────
         Signalé par Lamine le 10 septembre 2026, capture à l'appui : après
         une correction, en refermant l'écran, l'application se figeait — le
         micro restait doré et ne répondait plus.

         Elle n'était pas plantée, elle était VERROUILLÉE. Chaque fois qu'on
         lui coupe la parole (« Mal dit », ouvrir le clavier, ouvrir les
         papiers, valider), taire() met tourRef à null. Cette boucle sortait
         alors par un `return` silencieux — et stopMouth(), qui est la SEULE
         chose qui rend la main en repassant le mode à « ready », n'était
         jamais appelée. Le mode restait « speaking » ou « thinking », et dans
         ces deux états le micro est désactivé. Pour toujours.

         On distingue donc les deux raisons de sortir : quelqu'un a pris la
         main — c'est lui qui gérera l'état — ou on l'a fait taire, et alors
         il faut rendre la main ici. */
      const perdu = () => {
        if (tourRef.current === jeton) return false;
        if (tourRef.current === null) { setMode("ready"); setFace("yeux_ouverts"); }
        return true;
      };

      /* DEUX MORCEAUX D'AVANCE, pas un.
         Avec un seul, le moindre à-coup du réseau se transformait en silence.
         Ils se fabriquent tous en parallèle côté serveur ; garder deux longueurs
         d'avance coûte une requête de plus et supprime les blancs. */
      const total = bloc.parties;
      const enVol = new Map<number, ReturnType<typeof demander>>();
      enVol.set(0, premier);
      if (total > 1) enVol.set(1, second);
      const lancer = (i: number) => {
        if (i > 1 && i < total && !enVol.has(i)) enVol.set(i, demander(i));
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
      const ctx = contexte();
      const segments: Array<{ debut: number; fin: number; valeurs: number[]; pic: number; pas: number }> = [];
      let quand = 0;
      /* Le trou réel entre deux morceaux, en millisecondes. Il devrait être
         nul ; on le mesure quand même, parce qu'on croyait déjà qu'il l'était.
         Il part au serveur avec le reste — c'est le seul moyen de le voir
         depuis ailleurs que le téléphone. */
      const coutures: number[] = [];
      const debutTotal = Date.now();

      const programmer = async (octets: ArrayBuffer) => {
        const brut = await ctx.decodeAudioData(octets.slice(0));
        const mémoire = ralentir(ctx, sansSilence(ctx, brut), vitesseChoisie());
        const { valeurs, pic, pas } = enveloppeDe(mémoire);
        const source = ctx.createBufferSource();
        source.buffer = mémoire;
        source.connect(ctx.destination);
        // Un souffle de sécurité au premier morceau : programmer dans le passé
        // le ferait démarrer en retard et tout décaler.
        const debut = Math.max(ctx.currentTime + 0.06, quand);
        if (quand > 0) coutures.push(Math.round((debut - quand) * 1000));
        source.start(debut);
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
        const morceau = i === 0 ? bloc : await enVol.get(i)!;
        if (perdu()) return;         // une nouvelle réponse a pris la main, ou on l'a fait taire
        if (!morceau.audio) break;
        try { await programmer(enOctets(morceau.audio)); } catch { break; }
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
      setPanne(`panne : sa voix — ${String(e).replace(/^Error:\s*/, "").slice(0, 60)}`);
      await prendreLaParole();
      await parlerAvecLeTelephone(answer);
    }
  }, [contexte, couperSon, finirAttente, jouerSouffle, noterAttente, parlerAvecLeTelephone, stopMouth]);




  const askBia = useCallback(async (question: string, parole = false, tourDonne?: number) => {
    const clean = question.trim();
    if (!clean || busyRef.current) return;
    /* Le micro a déjà ouvert son tour avant d'envoyer la parole à la
       transcription : on le REPREND, on n'en ouvre pas un second. Une
       question tapée, elle, ouvre le sien. */
    const monTour = tourDonne ?? ouvrirUnTour();
    busyRef.current = true;
    setSaisie("");
    setHistory((items) => [...items, { role: "user", text: clean }]);
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
          history: historyRef.current.slice(-12),
          /* Le prénom qu'elle vient d'apprendre part avec la question : elle
             le dit dans sa réponse, et c'est ce qui attache quelqu'un à une
             application. Une seule fois — après, il est dans ses notes. */
          blaguesDites: blaguesDites.current,
          dernierService: dernierService.current,
          resume: [resumeRef.current, nouveauNomRef.current
            ? `La personne vient de te dire son prénom : ${nouveauNomRef.current}. Emploie-le une fois dans ta réponse, naturellement, sans en faire trop.`
            : ""].filter(Boolean).join("\n"),
        }),
      });
      const data = (await response.json()) as { reply: string; motif?: string; emotion?: string; papier?: string; appel?: { numero: string; nom: string } | null; voir?: string; carte?: string; rireApres?: string; blague?: string; film?: { video: string; titre: string; source?: string } | null; trouve?: Resultat | null; son?: string; corrige?: boolean; toutesDites?: boolean; service?: string; source?: string };
      tModeleRef.current = Date.now();   // le modèle a fini d'écrire
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
      /* ICI SE JOUAIT LE SILENCE.
         On coupait l'attente à l'arrivée du TEXTE. Mais la voix, elle, n'est
         pas encore fabriquée : quatre à huit secondes plus tard. BIA se
         taisait donc pile au moment où il fallait tenir la conversation.
         L'attente garde la parole ; c'est speak() qui la reprendra, une fois
         le son en main. */
      if (response.status === 401) {
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
      if (!response.ok) throw new Error("BIA unavailable");
      emotionRef.current = data.emotion || "neutre";
      /* Elle estime avoir de quoi écrire : c'est elle qui allume le bouton,
         et son avis vaut mieux qu'un mot-clé — elle a suivi toute la
         conversation. Le papier déjà ouvert est jeté : il date d'avant. */
      if (data.papier === "devis" || data.papier === "lettre" || data.papier === "message") {
        setPapierPret(data.papier as Sorte);
        /* ELLE COMMENCE TOUT DE SUITE, sans attendre qu'on ouvre l'écran.
           Avant, elle allumait un point et ne faisait rien : il fallait
           toucher le bouton, puis attendre encore dix secondes devant un
           écran vide. Maintenant elle écrit pendant qu'on écoute sa réponse,
           le clavier tape à côté du bouton, et ça sonne quand c'est prêt. */
        if (!papierOccupeRef.current) void fabriquerPapier(data.papier as Sorte);
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
      /* Elle a quelque chose à montrer. On ne garde que la clé du sujet : le
         fil est rangé dans la mémoire du téléphone, et des images y tiendraient
         trois échanges avant de la remplir. */
      setHistory((items) => [...items, {
        role: "bia", text: data.reply,
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
      // Le visage prend l'émotion tout de suite, avant même la voix : c'est
      // ce qui donne l'impression qu'elle réagit à ce qu'on lui a dit.
      const suite = SUITES[emotionRef.current];
      if (!suite) setFace(EMOTION_VERS_FACE[emotionRef.current] || "yeux_ouverts");
      /* Une réponse du répertoire arrive avec son son déjà fabriqué : on le
         joue tel quel. Si le fichier manque — seau vidé, réseau coupé — on
         retombe sur la synthèse ordinaire plutôt que de rester muette. */
      if (data.son) {
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
        catch { speak(data.reply, emotionRef.current); }
      } else {
        speak(data.reply, emotionRef.current);
      }
    } catch {
      emotionRef.current = "concernee";
      const fallback = "Jokkoo bi am na jafe-jafe. Jéemal beneen yoon.";
      setHistory((items) => [...items, { role: "bia", text: fallback }]);
      setFace("concernee");
      setMode("error");
      speak(fallback);
    } finally {
      // On ne touche plus à attenteRef ici : speak() est encore en train de
      // fabriquer la voix, et c'est lui qui prendra le relais quand elle
      // sera prête.
      busyRef.current = false;
    }
  }, [speak, attendreEnParlant, finirAttente, ouvrirUnTour, estLeTour]);

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

    function geste() {
      const tirage = Math.random();
      if (tirage < 0.42) {
        // Un regard qui glisse, et qui revient sans se presser.
        poser("regard_cote", entre(1400, 2400), repos);
      } else if (tirage < 0.72) {
        poser("yeux_mi", 130, () => poser("yeux_fermes", 170, () => poser("yeux_mi", 120, repos)));
      } else {
        poser("ecoute", entre(1800, 3000), repos);
      }
    }

    repos();
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
        for (const parole of A_FABRIQUER) {
          if (!vivant) return;
          try { await audioParole(parole, langue); } catch { return; }
        }
      }
    })();
    return () => { vivant = false; };
  }, [code, audioParole]);

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
      if (salueRef.current || !code) return;
      salueRef.current = true;
      /* Elle ne coupe jamais la parole à personne : si elle est déjà en
         train de parler ou d'écouter, on laisse tomber la salutation. */
      if (mode !== "ready") return;
      const h = new Date().getHours();
      const cle = h >= 5 && h < 17 ? "salut" : "bonsoir";
      const base = (moteursRef.current as { repertoire?: { base_sons?: Record<string, string> } } | null)
        ?.repertoire?.base_sons?.wo || "";
      if (!base) return;
      /* .mp3, et octetsDuRepertoire retombe seul sur le .wav. Si rien ne
         vient, on ne dit rien et on ne se plaint pas : un accueil raté ne
         doit pas être la première chose qu'on voit de BIA. */
      void direSonTeutFait(`${base}${cle}.mp3`).catch(() => { });
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
    const ctxMicro = contexte();
    if (ctxMicro.state === "suspended") { try { await ctxMicro.resume(); } catch { } }

    if (fluxRef.current?.active && analyseRef.current) {
      return { flux: fluxRef.current, analyse: analyseRef.current, ctxMicro };
    }

    /* Les trois réglages demandés par Lamine — écho, bruit, volume. Le
       navigateur les honore quand il sait et les ignore sans se plaindre
       quand il ne sait pas ; dans ce cas on garde un micro qui marche, ce qui
       vaut mieux qu'une exception. */
    let flux: MediaStream;
    try { flux = await navigator.mediaDevices.getUserMedia(REGLAGES_DU_MICRO); }
    catch { flux = await navigator.mediaDevices.getUserMedia({ audio: true }); }

    const analyse = ctxMicro.createAnalyser();
    analyse.fftSize = 512;
    const entree = ctxMicro.createMediaStreamSource(flux);
    entree.connect(analyse);

    fluxRef.current = flux;
    analyseRef.current = analyse;
    debrancherMicroRef.current = () => {
      try { entree.disconnect(); } catch { }
      try { analyse.disconnect(); } catch { }
      flux.getTracks().forEach((t) => t.stop());
      fluxRef.current = null;
      analyseRef.current = null;
    };
    return { flux, analyse, ctxMicro };
  }, [contexte]);

  /* Fermer complètement : le second appui, la fin d'une séance, le départ de
     la page. On coupe le fil AVANT le micro, pour qu'aucune veille ne
     redémarre un tour sur un flux qu'on vient d'éteindre. */
  const fermerConversation = useCallback(() => {
    conversationRef.current = false;
    setConversation(false);
    setEntendParler(false);
    const e = enregistreurRef.current;
    if (e && e.state !== "inactive") { try { e.stop(); } catch { } }
    enregistreurRef.current = null;
    debrancherMicroRef.current?.();
    debrancherMicroRef.current = null;
    setMode((m) => (m === "listening" ? "ready" : m));
  }, []);

  const ecouter = useCallback(async () => {
    try {
      const { flux, analyse, ctxMicro } = await micro();
      const enregistreur = new MediaRecorder(flux);
      const morceaux: Blob[] = [];
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
        const uneVoix = bruit.voir(creux);
        seuilRef.current = bruit.seuil();

        if (uneVoix) {
          if (!aParle) { debutParole = Date.now(); setEntendParler(true); }
          else dureeParlee += Date.now() - dernierSon;
          aParle = true;
          dernierSon = Date.now();
        } else if (aParle) {
          /* On ne montre plus « je t'entends » : le témoin redevient « je
             t'écoute » dès que la voix retombe, et c'est ce qui donne
             l'impression qu'elle suit. */
          setEntendParler(false);
          const assez = silenceQuiSuffit(dernierSon - debutParole);
          if (Date.now() - dernierSon > assez) { arreterEnregistrement(); return; }
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
        if (!aParle && depuis > SILENCE_QUI_CLÔT_LA_CONVERSATION) {
          conversationRef.current = false;
          setConversation(false);
          arreterEnregistrement();
        }
      }, TOUR_DE_VEILLE);

      enregistreur.ondataavailable = (e) => { if (e.data.size) morceaux.push(e.data); };
      enregistreur.onstop = async () => {
        clearInterval(veille);
        setEntendParler(false);
        enregistreurRef.current = null;

        /* ── LE MICRO NE SE FERME QUE SI LA CONVERSATION SE FERME ──────────

           Avant, chaque fin de tour éteignait le flux et débranchait
           l'analyseur : c'était juste, tant qu'un appui valait une phrase.
           En conversation continue, ce serait rouvrir le micro — et
           redemander la permission — à chaque respiration.

           ON NE FERME PLUS LE CONTEXTE DE LA PAGE non plus : c'est celui qui
           porte toute sa voix. Le fermer ici la rendait muette jusqu'à ce que
           `contexte()` en refabrique un. */
        if (!conversationRef.current) {
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
        if (!aParle || !morceaux.length || !vautLaPeine(dureeParlee)) {
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
        const extension =
          typeReel.includes("mp4") || typeReel.includes("mpeg") || typeReel.includes("aac") ? "m4a"
          : typeReel.includes("ogg") ? "ogg"
          : typeReel.includes("wav") ? "wav"
          : "webm";
        const forme = new FormData();
        forme.append("audio", new Blob(morceaux, { type: typeReel }), `parole.${extension}`);
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
            const d = await r.json() as { texte?: string };
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
          if (!attenteRef.current && !enregistreurRef.current) {
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
        void attendreEnParlant(jeton, langueRef.current);

        try {
          const r = await fetch("/api/ecouter", { method: "POST", headers: { "x-bia-code": codeRef.current }, body: forme });
          const d = await r.json() as { texte?: string; panne?: boolean; motif?: string };
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
          transcritRef.current = true;
          dernierDitRef.current = d.texte || "";
          if (d.texte) {
            langueRef.current = estWolof(d.texte) ? "wo" : "fr";
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
            const rire = lireLeRire(d.texte);
            if (rire.rit) {
              await finirAttente(langueRef.current, false);
              await jouerSouffle(rire.emotion || "rire");
              /* Deux attentes viennent de passer (fermer l'attente, jouer le
                 rire) : ce tour peut ne plus être le tour en cours. */
              if (!estLeTour(monTour)) return;
              if (rire.seulement) { setMode("ready"); setFace("joie"); return; }
            }
            void askBia(d.texte, true, monTour);
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
                : "Sama nopp bi dafa yàqu, du yaw. Xoolal état bi.");
              /* `stopMouth` a déjà remis « ready » à la fin de la voix : on ne
                 le réécrit que si ce tour est encore le tour en cours. */
              if (estLeTour(monTour)) setFace("concernee");
            } else {
              const base = (moteursRef.current as { repertoire?: { base_sons?: Record<string, string> } } | null)
                ?.repertoire?.base_sons?.[langueRef.current] || "";
              if (base) {
                /* .mp3 : octetsDuRepertoire retombe seul sur le .wav si la
                   conversion n'est pas encore passée par cette phrase-là. */
                try { await direSonTeutFait(`${base}audio-utilisateur-incompris.mp3`, "concernee"); }
                catch { if (estLeTour(monTour)) { setMode("ready"); setFace("yeux_ouverts"); } }
              } else if (estLeTour(monTour)) {
                setMode("ready"); setFace("yeux_ouverts");
              }
            }
          }
        } catch {
          /* Le réseau a lâché pendant la transcription : même règle. Sans ce
             finirAttente, l'attente survivait à l'erreur et bloquait tout. */
          await finirAttente(langueRef.current, false);
          if (estLeTour(monTour)) setMode("error");
        }
      };

      enregistreur.start();
      setMode("listening");
      setFace("ecoute");
    } catch {
      setMode("error");
    }
  }, [arreterEnregistrement, askBia, attendreEnParlant, finirAttente, direSonTeutFait, parlerAvecLeTelephone, jouerSouffle, ouvrirUnTour, estLeTour]);

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
    const aCondenser = history.slice(0, history.length - 16);
    fetch("/api/resumer", {
      method: "POST",
      headers: { "content-type": "application/json", "x-bia-code": code },
      body: JSON.stringify({ echanges: aCondenser, resume: resumeRef.current }),
    })
      .then((r) => r.json())
      .then((d: { resume?: string }) => {
        if (!d.resume) return;
        setResume(d.resume);
        /* Même règle qu'à la sauvegarde : ce qui porte un papier ne se rogne
           pas. Le reste est résumé, et c'est très bien. */
        setHistory((items) => [
          ...items.slice(0, Math.max(0, items.length - 16)).filter((m) => m.papier || m.corrige),
          ...items.slice(-16),
        ]);
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
    /* ── ON LUI COUPE LA PAROLE : LE TOUR EST CLOS ─────────────────────────

       C'est l'endroit le plus important de la règle. Quand quelqu'un reprend
       la main, tout ce qui est en vol appartient déjà au passé : la réponse
       du modèle qui arrive, la voix en fabrication, la transcription en
       cours. En tournant le numéro du tour, ils deviennent tous périmés
       d'un coup — aucun d'eux ne pourra plus écrire l'état, et c'est le
       nouveau tour qui décidera. */
    ouvrirUnTour();
    /* Quelqu'un vient de reprendre la main — pour corriger, pour ouvrir un
       papier, pour écrire. Il ne répond donc plus à « comment tu t'appelles ».
       Sans cette ligne, sa phrase suivante repartait dans la case du prénom
       et disparaissait sans réponse. */
    attendLeNomRef.current = false;
    /* ON LUI COUPE LA PAROLE : L'INTERFACE DOIT REDEVENIR UTILISABLE TOUT DE
       SUITE. La boucle de lecture s'en apercevra à son tour, mais elle peut
       dormir encore deux secondes — et pendant ces deux secondes, le micro
       resterait éteint sans raison. On ne touche à rien si elle n'était ni en
       train de parler ni en train de réfléchir. */
    setMode((m) => (m === "speaking" || m === "thinking" ? "ready" : m));
    // Le visage revient au repos s'il était figé sur la réflexion. Les
    // images de bouche, elles, sont remises par l'animation qui s'arrête.
    setFace((f) => (f === "pensive" ? "yeux_ouverts" : f));
  }, [couperSon, ouvrirUnTour]);
  taireRef.current = taire;

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
  useEffect(() => {
    if (!conversation || mode !== "ready") return;
    if (enregistreurRef.current) return;
    const t = setTimeout(() => {
      if (!conversationRef.current || enregistreurRef.current) return;
      void ecouterRef.current?.();
    }, 180);
    return () => clearTimeout(t);
  }, [conversation, mode]);

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
  useEffect(() => {
    if (!conversation || mode !== "speaking") return;
    const analyse = analyseRef.current;
    if (!analyse) return;
    const tampon = new Uint8Array(analyse.frequencyBinCount);
    let tenu = 0;
    const guet = setInterval(() => {
      analyse.getByteTimeDomainData(tampon);
      let creux = 0;
      for (const v of tampon) creux = Math.max(creux, Math.abs(v - 128));
      if (couvreSaVoix(creux, sonDelleRef.current, seuilRef.current || 8)) {
        tenu += TOUR_DE_VEILLE;
        /* On la fait taire : `taire()` coupe le son, remet le repos — et
           c'est le retour au repos qui rouvre le micro, par l'effet
           ci-dessus. Un seul chemin, pas deux. */
        if (tenu >= TENIR_POUR_COUPER) { tenu = 0; taireRef.current?.(); }
      } else tenu = 0;
    }, TOUR_DE_VEILLE);
    return () => clearInterval(guet);
  }, [conversation, mode]);

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
    taire();
    if (enregistreurRef.current) arreterEnregistrement();
    else if (recognitionRef.current) {
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

  const fabriquerPapier = useCallback(async (sorte: Sorte) => {
    const jeton = ++demandePapier.current;
    const perime = () => jeton !== demandePapier.current;

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
        setPapierErreur(
          d.erreur === "rien à écrire" || d.erreur === "document vide"
            ? "Il n'y a pas encore de quoi écrire. Dis-lui d'abord ce que le papier doit dire, et pour qui — puis reviens ici."
            : d.erreur === "pas de document" || d.erreur === "document illisible"
              ? "Elle a répondu à côté. Appuie encore une fois : c'est presque toujours réglé au deuxième essai."
              : d.erreur === "code"
                ? "Ton code n'est plus valable. Referme et rentre-le à nouveau."
                : "Le papier n'a pas pu être fabriqué. Réessaie dans un instant.");
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
      setPapierErreur("Pas de réseau. Le papier n'a pas pu être fabriqué.");
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
  function ouvrirPapier(sorte?: Sorte) {
    taire();
    setClavier(false);
    setFiche(false);
    setPapierOuvert(true);
    const quoi = sorte || (papier ? null : papierPret);
    if (quoi) {
      setService(quoi);
      if (!papier && !papierOccupe) void fabriquerPapier(quoi);
    } else if (papier) {
      setService(papier.doc.type);
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
    if (quoi === "lire" || quoi === "fiche" || quoi === "") return;

    // message, devis, lettre
    /* Changer de service ne détruit rien : le papier de l'autre service est
       rangé dans la boîte et se rouvre d'un geste. On se contente de sortir
       celui-ci de l'écran. */
    if (papier && papier.doc.type !== quoi) { setPapier(null); papierOuvertId.current = ""; }
    /* Un papier de ce service existe déjà ? On rouvre le plus récent au lieu
       d'en fabriquer un autre — et d'en payer un autre. */
    const dejaFait = papiers.find((x) => x.doc.type === quoi);
    if ((!papier || papier.doc.type !== quoi) && dejaFait) { rouvrirPapier(dejaFait); return; }
    if ((!papier || papier.doc.type !== quoi) && !papierOccupe && historyRef.current.length) {
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
    setService(g.doc.type as Service);
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
          En français, prêt à envoyer. Relis-le, corrige un mot si tu veux, puis envoie-le.
        </p>
        {m.destinataire ? (
          <label className="papier-champ">Pour
            <input value={m.destinataire} onChange={(e) => retoucherMot((x) => { x.destinataire = e.target.value; })} />
          </label>
        ) : null}
        {m.objet ? (
          <label className="papier-champ">Objet
            <input value={m.objet} onChange={(e) => retoucherMot((x) => { x.objet = e.target.value; })} />
          </label>
        ) : null}
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
    if (papier) void fabriquerPapier(papier.doc.type);
  }

  /* Le devis à l'écran. Chaque champ est modifiable, parce que la
     transcription confond « quinze mille » et « cinquante mille », et parce
     que celui qui fait le travail est le seul à savoir lequel des deux est le
     bon. Les totaux, eux, ne sont pas modifiables : ils se recalculent. */
  function vueDevis(d: Devis, t: Totaux | null) {
    return (
      <>
        <p className="papier-titre">Devis n° {d.numero}</p>
        {!emetteur.nom ? (
          <p className="papier-manque">
            Tes renseignements manquent : le devis partira sans ton nom, ni ton NINEA.
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
    { cle: "devis", nom: "Devis",
      dessin: "M6 2h7.2L20 8.8V20a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2Zm7 1.8V9h5.2L13 3.8ZM8 12h8v1.8H8V12Zm0 3.4h8v1.8H8v-1.8Zm0-6.8h3v1.8H8V8.6Z" },
    { cle: "lettre", nom: "Lettre",
      dessin: "M3 5h18a1 1 0 0 1 1 1v12a1 1 0 0 1-1 1H3a1 1 0 0 1-1-1V6a1 1 0 0 1 1-1Zm1.6 2L12 12.4 19.4 7H4.6Z" },
    { cle: "photo", nom: "Papier",
      dessin: "M9.4 4h5.2l1.2 2H20a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4.2l1.2-2Zm2.6 4.8a4.6 4.6 0 1 0 0 9.2 4.6 4.6 0 0 0 0-9.2Zm0 1.9a2.7 2.7 0 1 1 0 5.4 2.7 2.7 0 0 1 0-5.4Z" },
    { cle: "video", nom: "Vidéo",
      dessin: "M4 5h16a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2Zm6 3.6v6.8L15.6 12 10 8.6Z" },
    { cle: "lire", nom: "Lire",
      dessin: "M4 9h3.4L12 4.6v14.8L7.4 15H4a1 1 0 0 1-1-1v-4a1 1 0 0 1 1-1Zm12.5-1.6a5.6 5.6 0 0 1 0 9.2l-1.1-1.6a3.6 3.6 0 0 0 0-6l1.1-1.6Zm2.3-3.2a9.6 9.6 0 0 1 0 15.6l-1.1-1.6a7.6 7.6 0 0 0 0-12.4l1.1-1.6Z" },
    { cle: "fiche", nom: "Moi",
      dessin: "M12 12.4a4.2 4.2 0 1 0 0-8.4 4.2 4.2 0 0 0 0 8.4ZM4 20.4c0-3.6 3.6-6 8-6s8 2.4 8 6v.6H4v-.6Z" },
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
                    {g.doc.type === "devis" ? "Devis"
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

  /* On ne demande QUE quand il ouvre « Moi », et une seule fois : inutile de
     poser la question à chaque écran à quelqu'un qui ne verra jamais ce lien. */
  useEffect(() => {
    if (service !== "fiche" || !code || estMaitre) return;
    fetch("/api/codes", { headers: { "x-bia-code": code } })
      .then((r) => (r.ok ? r.json() : { maitre: false }))
      .then((d: { maitre?: boolean }) => setEstMaitre(Boolean(d.maitre)))
      .catch(() => {});
  }, [service, code, estMaitre]);

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
        <p className="papier-titre">La voix de BIA</p>
        <p className="papier-note">
          Si elle parle trop vite, ralentis-la. Sa voix ne change pas — elle
          prend seulement son temps. C&apos;est pour toi seul, sur ce téléphone.
        </p>
        <label className="papier-debit">
          <span>Elle parle&nbsp;: <b>{mot}</b></span>
          <input type="range" min={0.6} max={1} step={0.05} value={debit}
            aria-label="Vitesse de la voix de BIA"
            onChange={(e) => setDebit(Number(e.target.value))} />
          <span className="papier-debit-bornes"><i>Plus lentement</i><i>Plus vite</i></span>
        </label>

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
            <a href="/voix/services" className="papier-lien">Écouter les 30 des services →</a>
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
            sur la carte, et les 30 qu&apos;elle dit en exécutant — ou quand ça
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
        <div className="portrait" aria-hidden="true"><div className="avatar" data-face="yeux_ouverts" /></div>
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

  return (
    <main className="bia-presence" data-mode={mode} data-clavier={clavier ? "ouvert" : "ferme"} data-ecran={ecran ? "ouvert" : "ferme"}>
      <div className={eclipse ? "portrait eclipse" : rallume ? "portrait rallume" : "portrait"}
        aria-hidden="true">
        <div className="avatar" data-face={face} />
      </div>


      {/* Elle réfléchit. Pas un mot à l'écran : trois points d'or qui
          respirent, et le silence. */}
      <div className="lueur" aria-hidden="true"><span /><span /><span /></div>

      {/* APPELER. Le numéro est déjà écrit ; il ne reste qu'à appuyer. Ce
          bouton n'apparaît que lorsqu'elle a préparé un appel, et disparaît
          à la question suivante. */}
      {appel ? (
        <a className="appeler" href={`tel:${appel.numero}`}
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
            <b>Bien dit</b>{compteVerdicts.bien ? <i>{compteVerdicts.bien}</i> : null}
          </button>
          {motVerdict ? <span className="verdict-mot">{motVerdict}</span> : null}
          <button className="verdict-mal" type="button"
            onClick={() => juger("mal")}
            aria-label="Elle l'a mal dit — à corriger plus tard">
            <b>Mal dit</b>{compteVerdicts.mal ? <i>{compteVerdicts.mal}</i> : null}
          </button>
        </div>
      ) : null}

      <div className="barre">
        {/* ── LE BOUTON ROUGE ──────────────────────────────────────────────
            « Pendant qu'il parle, il peut se tromper. Pour que ça ne soit pas
            transmis à BIA et qu'on ne perde pas de temps, qu'il appuie sur
            annuler. » — Lamine, le 10 septembre 2026.

            Il ne paraît QUE pendant qu'elle écoute, et il prend la place du
            clavier : à ce moment-là, écrire n'a aucun sens, et un bouton
            rouge doit être seul pour qu'on ne se trompe pas de geste. */}
        {mode === "listening" ? (
          <button className="annuler-parole" type="button"
            onClick={annulerCeQueJeDis}
            aria-label="Annuler ce que je viens de dire">
            <svg viewBox="0 0 24 24" aria-hidden="true">
              <path d="M18.3 7.1 16.9 5.7 12 10.6 7.1 5.7 5.7 7.1l4.9 4.9-4.9 4.9 1.4 1.4 4.9-4.9 4.9 4.9 1.4-1.4-4.9-4.9Z" />
            </svg>
          </button>
        ) : (
        <button className="clavier-ouvrir" type="button" onClick={ouvrirClavier} aria-label="Écrire à BIA">
          <svg viewBox="0 0 24 24" aria-hidden="true">
            <path d="M3 6h18a1 1 0 0 1 1 1v10a1 1 0 0 1-1 1H3a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1Zm2 3v2h2V9H5Zm4 0v2h2V9H9Zm4 0v2h2V9h-2Zm4 0v2h2V9h-2ZM5 13v2h2v-2H5Zm4 0v2h6v-2H9Zm8 0v2h2v-2h-2Z" />
          </svg>
        </button>
        )}

        <button
          className={conversation ? `microphone en-conversation${entendParler && mode === "listening" ? " entend" : ""}` : "microphone"}
          type="button" onClick={toggleMicrophone}
          disabled={microFerme} aria-disabled={microFerme}
          aria-label={conversation ? "Fermer la conversation vocale" : labels[mode]}>
          <svg viewBox="0 0 24 24" aria-hidden="true">
            <path d="M12 14.5a3.5 3.5 0 0 0 3.5-3.5V5a3.5 3.5 0 0 0-7 0v6a3.5 3.5 0 0 0 3.5 3.5Zm-6-4a1 1 0 0 1 2 0V11a4 4 0 0 0 8 0v-.5a1 1 0 1 1 2 0V11a6 6 0 0 1-5 5.92V19h3a1 1 0 1 1 0 2H8a1 1 0 1 1 0-2h3v-2.08A6 6 0 0 1 6 11v-.5Z" />
          </svg>
        </button>

        {/* LE BOUTON DES PAPIERS — demandé par Lamine le 10 septembre 2026 :
            « un bouton à côté du micro à droite pour ouvrir l'écran où il y a
            les messages, où on peut écrire un devis ou un message ».

            Il est là en permanence, et pas seulement quand BIA a quelque
            chose de prêt : on doit pouvoir décider soi-même d'écrire un
            message, sans attendre qu'elle le propose. Quand elle, de son
            côté, a de quoi écrire, un point d'or s'allume dessus. */}
        {/* ── LE COIN DES PAPIERS ──────────────────────────────────────────
            Le bouton et le petit clavier tiennent dans UNE SEULE case de la
            rangée, côte à côte.

            Signalé par Lamine le 11 septembre 2026, capture à l'appui : « le
            petit clavier qui clignote doit se positionner sur le tracé rouge,
            même ligne que tous les autres. » Il était bien écrit juste après
            le bouton, mais la rangée est une grille à trois cases — clavier,
            micro, papiers — et un quatrième enfant se met à la ligne tout
            seul. Il tombait donc en bas à gauche, là où il n'a rien à faire.
            Les deux boutons partagent maintenant la même case : le clavier ne
            peut plus descendre. */}
        <div className="coin-papier">
        <button className={papierPret ? "papier-ouvrir pret" : "papier-ouvrir"} type="button"
          onClick={() => ouvrirPapier()} aria-label="Écrire un message, un devis ou une lettre">
          <svg viewBox="0 0 24 24" aria-hidden="true">
            <path d="M6 2h7.2L20 8.8V20a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2Zm7 1.8V9h5.2L13 3.8ZM8 12h8v1.8H8V12Zm0 3.4h8v1.8H8v-1.8Zm0-6.8h3v1.8H8V8.6Z" />
          </svg>
          {papierPret ? <i className="point" aria-hidden="true" /> : null}
        </button>

        {/* ── LE PETIT CLAVIER QUI TAPE ────────────────────────────────────
            Demandé par Lamine le 10 septembre 2026, capture à l'appui : « sur
            le service, il doit y avoir un petit son qui montre que ta demande
            est en train d'être exécutée. Le clavier doit sortir sur le côté,
            allumé, avec les touches qui s'enfoncent. »

            Il apparaît à droite du bouton des papiers, exactement là où il
            l'a tracé, et seulement pendant qu'elle écrit. Les touches
            s'allument l'une après l'autre — ce n'est pas une roue qui tourne,
            c'est quelqu'un qui tape, et ça se comprend sans savoir lire. */}
        <button type="button"
          className={
            papierFini ? "elle-tape ouvert fini"
              : papierOccupe ? "elle-tape ouvert" : "elle-tape"
          }
          tabIndex={papierFini ? 0 : -1}
          aria-hidden={!papierFini}
          aria-label="Ton papier est prêt — l'ouvrir"
          onClick={() => { if (papierFini) ouvrirPapier(); }}>
          <svg viewBox="0 0 44 26">
            <rect className="boitier" x="1" y="4" width="42" height="21" rx="3.5" />
            <g className="touches">
              <rect x="5"  y="8"  width="6" height="4.6" rx="1.2" style={{ ["--r" as string]: "0" }} />
              <rect x="13" y="8"  width="6" height="4.6" rx="1.2" style={{ ["--r" as string]: "1" }} />
              <rect x="21" y="8"  width="6" height="4.6" rx="1.2" style={{ ["--r" as string]: "2" }} />
              <rect x="29" y="8"  width="6" height="4.6" rx="1.2" style={{ ["--r" as string]: "3" }} />
              <rect x="5"  y="15" width="6" height="4.6" rx="1.2" style={{ ["--r" as string]: "4" }} />
              <rect x="13" y="15" width="14" height="4.6" rx="1.2" style={{ ["--r" as string]: "5" }} />
              <rect x="29" y="15" width="6" height="4.6" rx="1.2" style={{ ["--r" as string]: "6" }} />
            </g>
          </svg>
        </button>
        </div>
      </div>

      <section className="clavier" aria-hidden={!clavier}>
        <button className="clavier-fermer" type="button" onClick={() => setClavier(false)} aria-label="Replier le clavier">
          <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M18.3 7.1 16.9 5.7 12 10.6 7.1 5.7 5.7 7.1l4.9 4.9-4.9 4.9 1.4 1.4 4.9-4.9 4.9 4.9 1.4-1.4-4.9-4.9Z" /></svg>
        </button>

        {panne ? <p className="panne">⚠ {panne}</p> : null}

        <div className="outils">
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
          {history.length === 0 ? <p className="fil-vide">{welcome}</p> : null}
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
                      {garde.doc.type === "devis" ? "Devis"
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
                {m.role === "bia" && i > 0 ? (
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
          {service === "lire" ? vueLire() : null}
          {service === "photo" ? vuePhoto() : null}
          {service === "" ? vueAccueil() : null}

          {service === "message" || service === "devis" || service === "lettre" ? (
            <>
              {papierOccupe && !papier ? <p className="papier-note">BIA écrit…</p> : null}
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
        {(service === "message" || service === "devis" || service === "lettre")
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

        {(service === "message" || service === "devis" || service === "lettre")
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
              onClick={() => void fabriquerPapier(papier.doc.type)}>Refaire</button>
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
                  onClick={() => { setAConfirmer(null); void eclipser(() => setCarte(lieu)); }}>
                  {lieu.dit}
                  {lieu.sur === false ? <em> — je ne suis pas sûre de celui-là</em> : null}
                </button>
              ))}
              <p className="carte-confirme-note">
                Si aucun n&apos;est le bon, dis-moi ce qu&apos;il y a autour —
                un marché, une station, une mosquée. Ici on se repère comme ça.
              </p>
            </>
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
          onFermer={() => revenir(() => setCarte(null))}
        />
      ) : null}

      {/* ── LA VIDÉO PREND TOUT, ELLE SE RETIRE ────────────────────────────
          Posée par-dessus la conversation, comme la carte : le micro reste
          ouvert, on lui parle sans la voir. */}
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

      {temoin ? <p className="temoin-vocal" aria-hidden="true">{temoin}</p> : null}
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
      setBilan(
        (d.manquants === 0
          ? `Rien ne manque : les ${d.en_place} sons sont en place, et ils ne se paieront plus jamais.`
          : `Il manque ${d.manquants} son(s) sur ${d.attendus} — ${d.signes} signes, ${d.cout_dollars} $.`
            + ` ${d.en_place} sont déjà là et ne seront pas repayés.`)
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

     On regarde donc les deux : ce qui manque, ET ce qui est encore lourd. */
  const resteAFaire = regarde !== null
    && ((regarde.manquants || 0) > 0 || (regarde.a_alleger || 0) > 0);

  /* Et le bouton doit dire la vérité sur le prix. Alléger ne coûte rien :
     annoncer « 0 $ » ferait douter, alors on l'écrit en mots. */
  const seulementAlleger = regarde !== null
    && (regarde.manquants || 0) === 0 && (regarde.a_alleger || 0) > 0;

  return (
    <p className="papier-note" style={{ marginTop: 14 }}>
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
