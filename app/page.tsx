"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  A_FABRIQUER, CHAPEAU, PARTIE_1, PARTIE_1_CONNU,
  dire, extraireNom, fichierDe as fichierDeParole,
} from "@/lib/attente";
import type { Langue, Parole } from "@/lib/attente";
import {
  ajouterProfil, chargerProfils, cleEmetteur, cleFil, cleResume, garderProfils, oublierProfil,
} from "@/lib/profils";
import type { Profil } from "@/lib/profils";
import {
  chargerPapiers, garderPapier, oublierPapiers, nouvelIdPapier, titreDe,
} from "@/lib/papiers";
import type { PapierGarde } from "@/lib/papiers";
import { franc, lecture, sorteEvoquee, totauxDe } from "@/lib/documents";
import type { Devis, Document as Papier, Lettre, Mot, Partie, Sorte, Totaux } from "@/lib/documents";
import { lireMesures, noterMesure } from "@/lib/chrono";
import type { Mesure, Voie } from "@/lib/chrono";
import { fichierDe, souffleDe } from "@/lib/sons";
import { frapper, arreterFrappe, sonnerFini } from "@/lib/frappe";

/* Un message peut porter le RENVOI vers un papier — son identifiant, pas son
   contenu. Le papier lui-même vit dans sa propre boîte, qui ne se rogne
   jamais ; le fil ne garde que la trace de l'endroit où il a été écrit. */
type Message = {
  role: "bia" | "user";
  text: string;
  papier?: string;
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
type Service = "" | "message" | "devis" | "lettre" | "photo" | "lire" | "fiche";

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
  /* LES SERVICES, EN RANGÉE. Demande de Lamine, le 10 septembre 2026 : « tous
     les services vont être des boutons sur ces points ; dès que tu appuies,
     c'est seulement cette page qui s'ouvre ». Un seul service ouvert à la
     fois, et la rangée reste en haut pour passer de l'un à l'autre. */
  const [service, setService] = useState<Service>("");
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
  /* ── ANNULER PENDANT QU'ON PARLE ────────────────────────────────────────
     Demandé par Lamine le 10 septembre 2026 : « pendant qu'il parle, il peut
     se tromper. Pour que ça ne soit pas transmis à BIA et qu'on ne perde pas
     de temps, qu'il appuie sur annuler. »

     Le drapeau est un ref et pas un état : il est lu dans onstop, qui a été
     posé il y a longtemps et ne verrait jamais un état changé depuis. */
  const annuleRef = useRef(false);
  const [annule, setAnnule] = useState(false);
  const moteursRef = useRef<{ voix: string; ecoute: string } | null>(null);
  const tourRef = useRef<object | null>(null);
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
      document.documentElement.style.setProperty("--bas-clavier", `${Math.round(bas)}px`);
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

  const contexte = useCallback(() => {
    if (!contexteRef.current) {
      const C = window.AudioContext || (window as any).webkitAudioContext;
      contexteRef.current = new C();
    }
    if (contexteRef.current.state === "suspended") void contexteRef.current.resume();
    return contexteRef.current;
  }, []);

  const couperSon = useCallback(() => {
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
      const mémoire = sansSilence(ctx, brut);
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
  const parlerAvecLeTelephone = useCallback((answer: string) => {
    // Pas de voix du tout sur cet appareil : on rend la main tout de suite,
    // sinon BIA resterait « en train de répondre » pour toujours — et le
    // micro, qui se ferme pendant qu'elle parle, ne se rouvrirait jamais.
    if (!("speechSynthesis" in window)) { stopMouth(answer); return; }
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
    utterance.onstart = () => bouche(true);
    utterance.onend = () => bouche(false, answer);
    utterance.onerror = () => bouche(false, answer);
    window.speechSynthesis.speak(utterance);
  }, [bouche, stopMouth]);

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
      const rendre = () => {
        if (rendu) return;
        rendu = true;
        if (secours) clearTimeout(secours);
        for (const m of minuteriesVisages) clearTimeout(m);
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
        source.onended = () => {
          if (sourceRef.current === source) sourceRef.current = null;
          rendre();
        };
        setMode("speaking");
        source.start();
        secours = setTimeout(rendre, mémoire.duration * 1000 + 1000);
      }).catch(() => rendre());
    }), [contexte]);

  /* Le rire part AVANT la parole, pendant que la voix se synthétise : on
     couvre ainsi l'attente du premier morceau, et l'émotion arrive d'un
     coup au lieu d'être annoncée puis jouée. Si le fichier n'est pas encore
     déposé, on ne fait rien — le visage rit en silence, comme avant. */
  const jouerSouffle = useCallback(async (emotion: string) => {
    const souffle = souffleDe(emotion);
    if (!souffle) return;
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

    // Le fichier tout prêt, s'il existe : gratuit, instantané, d'un seul bloc.
    if (!p.wo.includes("{nom}")) {
      try {
        const f = await fetch(fichierDeParole(p, langue), { cache: "force-cache" });
        if (f.ok) {
          const octets = await f.arrayBuffer();
          if (octets.byteLength > 512) {
            const morceaux = [octets];
            attenteCache.current.set(texte, morceaux);
            return morceaux;
          }
        }
      } catch {}
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
        body: JSON.stringify({ texte, partie }),
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
        const mémoire = sansSilence(ctx, brut);
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
      const limite = Date.now() + 9000;
      while (attendLeNomRef.current && Date.now() < limite) {
        if (attenteRef.current !== jeton || stopAttenteRef.current) return;
        await pause(200);
      }
      attendLeNomRef.current = false;
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
  const finirAttente = useCallback(async (langue: Langue = "wo") => {
    const parlait = Boolean(attenteSonRef.current);
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
        const morceaux = await audioParole(CHAPEAU, langue);
        const jeton = {};
        attenteRef.current = jeton;
        stopAttenteRef.current = false;
        await direParole(morceaux, jeton);
        attenteRef.current = null;
      } catch {}
    }
    stopAttenteRef.current = false;
  }, [audioParole, couperAttente, direParole]);

  /* La vraie voix : Oolel Voices, la même que BIBA. Le serveur découpe la
     réponse — Soynade n'accepte que 500 caractères — et on va chercher le
     morceau suivant PENDANT que le précédent est lu, sinon un silence
     s'installe entre chaque phrase. */
  const speak = useCallback(async (answer: string, emotion?: string) => {
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
      parlerAvecLeTelephone(answer);
      return;
    }

    const demander = async (partie: number) => {
      const r = await fetch("/api/voix", {
        method: "POST",
        headers: { "content-type": "application/json", "x-bia-code": codeRef.current },
        body: JSON.stringify({ texte: answer, partie }),
      });
      if (!r.ok) throw new Error("voix indisponible");
      return await r.json() as { parties: number; audio: string | null; type_mime?: string };
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
      if (!bloc.audio) { parlerAvecLeTelephone(answer); return; }
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
        const mémoire = sansSilence(ctx, brut);
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
        if (seg) {
          const i = Math.floor((t - seg.debut) / seg.pas);
          const part = i >= 0 && i < seg.valeurs.length ? seg.valeurs[i] / seg.pic : 0;
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
    } catch {
      await prendreLaParole();
      parlerAvecLeTelephone(answer);
    }
  }, [contexte, couperSon, finirAttente, jouerSouffle, noterAttente, parlerAvecLeTelephone, stopMouth]);




  const askBia = useCallback(async (question: string, parole = false) => {
    const clean = question.trim();
    if (!clean || busyRef.current) return;
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
          resume: [resumeRef.current, nouveauNomRef.current
            ? `La personne vient de te dire son prénom : ${nouveauNomRef.current}. Emploie-le une fois dans ta réponse, naturellement, sans en faire trop.`
            : ""].filter(Boolean).join("\n"),
        }),
      });
      const data = (await response.json()) as { reply: string; motif?: string; emotion?: string; papier?: string; appel?: { numero: string; nom: string } | null; source?: string };
      tModeleRef.current = Date.now();   // le modèle a fini d'écrire
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
        await finirAttente(langueRef.current);   // personne ne parlera : on rend le silence
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
      setPanne(data.source && data.source.startsWith("panne") ? data.source : "");
      setHistory((items) => [...items, { role: "bia", text: data.reply }]);
      // Le visage prend l'émotion tout de suite, avant même la voix : c'est
      // ce qui donne l'impression qu'elle réagit à ce qu'on lui a dit.
      const suite = SUITES[emotionRef.current];
      if (!suite) setFace(EMOTION_VERS_FACE[emotionRef.current] || "yeux_ouverts");
      speak(data.reply, emotionRef.current);
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
  }, [speak, attendreEnParlant, finirAttente]);

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
      speak(d.wolof);
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
      speak(d.wolof);
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

  /* iPhone n'autorise le son qu'après un geste. Le premier doigt posé sur
     l'écran, quel qu'il soit, réveille donc le contexte audio — sans rien
     prononcer. Sans ça, un contexte fabriqué trop tôt reste endormi et BIA
     n'a plus de voix du tout. */
  useEffect(() => {
    const reveiller = () => { contexte(); };
    window.addEventListener("pointerdown", reveiller);
    window.addEventListener("touchstart", reveiller, { passive: true });
    return () => {
      window.removeEventListener("pointerdown", reveiller);
      window.removeEventListener("touchstart", reveiller);
    };
  }, [contexte]);

  /* Le verrou du micro ne doit jamais rester coincé. Si BIA reste « en train
     de réfléchir ou de parler » au-delà de trois minutes, c'est que quelque
     chose s'est perdu en route : on rouvre le micro plutôt que de laisser la
     personne devant un bouton mort. */
  useEffect(() => {
    if (mode !== "thinking" && mode !== "speaking") return;
    const secours = setTimeout(() => setMode("ready"), 180000);
    return () => clearTimeout(secours);
  }, [mode]);

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
  const ecouter = useCallback(async () => {
    try {
      const flux = await navigator.mediaDevices.getUserMedia({ audio: true });
      const enregistreur = new MediaRecorder(flux);
      const morceaux: Blob[] = [];
      enregistreurRef.current = enregistreur;

      const contexte = new AudioContext();
      const analyse = contexte.createAnalyser();
      analyse.fftSize = 512;
      contexte.createMediaStreamSource(flux).connect(analyse);
      const tampon = new Uint8Array(analyse.frequencyBinCount);
      let aParle = false;
      let dernierSon = 0;

      const veille = setInterval(() => {
        analyse.getByteTimeDomainData(tampon);
        let creux = 0;
        for (const v of tampon) creux = Math.max(creux, Math.abs(v - 128));
        if (creux > 8) { aParle = true; dernierSon = Date.now(); }
        else if (aParle && Date.now() - dernierSon > 2000) arreterEnregistrement();
      }, 120);

      enregistreur.ondataavailable = (e) => { if (e.data.size) morceaux.push(e.data); };
      enregistreur.onstop = async () => {
        clearInterval(veille);
        flux.getTracks().forEach((t) => t.stop());
        contexte.close().catch(() => {});
        enregistreurRef.current = null;

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

        if (!aParle || !morceaux.length) { setMode("ready"); return; }

        setMode("thinking");
        setFace("pensive");

        /* Elle répond MAINTENANT, sans attendre la transcription : c'est tout
           l'intérêt: le silence après qu'on a parlé est le plus inquiétant. */
        const forme = new FormData();
        forme.append("audio", new Blob(morceaux, { type: "audio/webm" }), "parole.webm");

        /* CE QU'ELLE VIENT D'ENTENDRE EST-IL UN PRÉNOM ?
           Entre « comment tu t'appelles ? » et la réponse, oui — et alors ce
           n'est PAS une nouvelle question : on ne relance rien, on retient le
           prénom et l'attente reprend là où elle en était. */
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
          return;
        }

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
          const d = await r.json() as { texte?: string };
          tTranscritRef.current = Date.now();
          transcritRef.current = true;
          dernierDitRef.current = d.texte || "";
          if (d.texte) {
            langueRef.current = estWolof(d.texte) ? "wo" : "fr";
            void askBia(d.texte, true);
          } else { setMode("ready"); setFace("yeux_ouverts"); }
        } catch { setMode("error"); }
      };

      enregistreur.start();
      setMode("listening");
      setFace("ecoute");
    } catch {
      setMode("error");
    }
  }, [arreterEnregistrement, askBia, attendreEnParlant]);

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
    /* ON LUI COUPE LA PAROLE : L'INTERFACE DOIT REDEVENIR UTILISABLE TOUT DE
       SUITE. La boucle de lecture s'en apercevra à son tour, mais elle peut
       dormir encore deux secondes — et pendant ces deux secondes, le micro
       resterait éteint sans raison. On ne touche à rien si elle n'était ni en
       train de parler ni en train de réfléchir. */
    setMode((m) => (m === "speaking" || m === "thinking" ? "ready" : m));
    // Le visage revient au repos s'il était figé sur la réflexion. Les
    // images de bouche, elles, sont remises par l'animation qui s'arrête.
    setFace((f) => (f === "pensive" ? "yeux_ouverts" : f));
  }, [couperSon]);

  /* LE MICRO SE FERME PENDANT QU'ELLE PARLE.

     Demande de Lamine, 9 septembre 2026 : « dès que le micro est coupé, et
     pendant qu'elle parle, le micro doit rester inactif, le temps qu'elle
     finisse, pour ne pas embrouiller ».

     Elle prend la parole à la seconde où le micro se coupe et ne la lâche
     plus jusqu'à la fin de sa réponse. Rouvrir le micro au milieu de tout ça
     coupait sa phrase, mélangeait les deux voix, et faisait repartir un tour
     par-dessus le précédent. Le bouton s'éteint donc, visiblement, et se
     rallume quand elle a fini. */
  const microFerme = mode === "thinking" || mode === "speaking";

  function toggleMicrophone() {
    if (microFerme) return;
    taire();
    contexte();   // débloque le son du navigateur, sans rien prononcer

    const parScribe = moteurs ? moteurs.ecoute !== "navigateur" : false;
    if (parScribe) {
      if (mode === "listening") { arreterEnregistrement(); return; }
      void ecouter();
      return;
    }
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

  /* LA CORRECTION, EN GRAND.

     Lamine, le 10 septembre 2026 : « les textes sont très difficiles à
     copier ; autant appuyer sur un bouton qui ouvre une fenêtre plus large où
     on peut copier — ou bien qu'elle nous propose une autre façon de le dire
     en wolof ».

     Les deux, donc. La fenêtre s'ouvre avec SA PHRASE DÉJÀ ÉCRITE dedans : on
     ne retape rien, on change le mot qui cloche. Et un bouton lui demande de
     la redire autrement — trois propositions, on en touche une, elle prend la
     place dans le champ. Rien n'est gardé tant qu'un humain n'a pas tranché. */
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
    frapper();
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
      if (!papierOuvertRef.current) { sonnerFini(); setPapierFini(true); }

      /* ── ELLE LE LIT AVANT QUE ÇA DEVIENNE UN PAPIER ────────────────────
         « Elle doit le lire clairement en français avant de l'écrire, voir si
         c'est exactement ça, jusqu'à ce que la personne soit d'accord. »
         — Lamine, le 10 septembre 2026.

         C'est la seule vérification qui marche pour quelqu'un qui ne lit pas.
         La transcription confond « quinze mille » et « cinquante mille » ;
         montrer le papier à l'écran ne sert à rien s'il ne peut pas le lire.
         Le lui dire, si. */
      setAValider(true);
      void speak(lecture(d.document, d.totaux ?? null));
    } catch {
      if (perime()) return;
      setPapierErreur("Pas de réseau. Le papier n'a pas pu être fabriqué.");
    } finally {
      if (!perime()) { papierOccupeRef.current = false; setPapierOccupe(false); }
      // La frappe s'arrête même si c'est une demande périmée : deux frappes
      // en même temps feraient une mitraillette.
      arreterFrappe();
    }
  }, [direEnregistre, speak]);

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
    // Ouvrir l'écran, c'est avoir vu le travail : le clignotement s'arrête.
    if (papierOuvert) setPapierFini(false);
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

  function vueFiche() {
    const champ = (cle: keyof Emetteur, etiquette: string, mode?: string) => (
      <label className="papier-champ">{etiquette}
        <input value={String(emetteur[cle] ?? "")} inputMode={mode as "text" | "tel" | undefined}
          onChange={(e) => setEmetteur((v) => ({ ...v, [cle]: e.target.value }))} />
      </label>
    );
    return (
      <>
        <p className="papier-titre">Mes renseignements</p>
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
      </main>
    );
  }

  return (
    <main className="bia-presence" data-mode={mode} data-clavier={clavier ? "ouvert" : "ferme"}>
      <div className="portrait" aria-hidden="true">
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

        <button className="microphone" type="button" onClick={toggleMicrophone}
          disabled={microFerme} aria-disabled={microFerme} aria-label={labels[mode]}>
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
              fichier pour toute l'application. */}
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

      <p className="sr-only" aria-live="polite">{labels[mode]}</p>
    </main>
  );
}
